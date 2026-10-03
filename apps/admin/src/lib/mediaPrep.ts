// Prepara fotos y vídeos de los platos antes de subirlos (MediaUploadDialog).
//
// Por qué: la carta se ve en el móvil del cliente, muchas veces con datos móviles, y se subía
// tal cual lo que llegaba. Medido en producción (oct-2026): fotos PNG de 1536×2752 y 7 MB en
// Bon Bon Jazz, y PNG de ~700 px que pesaban 500–850 KB en Pecados. Y 9 de 12 vídeos con el
// índice (moov) al final del archivo, así que el navegador tenía que bajarlos enteros antes
// del primer fotograma.
//
//   - Fotos → WebP de 1600 px de lado como mucho (la carta ocupa la pantalla de un móvil).
//   - MP4/MOV → "faststart": el índice se mueve delante de los datos, sin recodificar nada.
//
// Si algo falla, se sube el original: optimizar nunca debe impedir subir.

export interface PreparedMedia {
  file: File;
  width?: number;
  height?: number;
  /** milisegundos (vídeo) */
  duration?: number;
  /** Qué se hizo, para enseñarlo: p. ej. "7,0 MB → 310 KB". */
  note?: string;
}

const MAX_SIDE = 1600;
const WEBP_QUALITY = 0.82;

const fmt = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
const rename = (name: string, ext: string) => `${name.replace(/\.[^.]+$/, '') || 'imagen'}.${ext}`;

export async function prepareImage(file: File): Promise<PreparedMedia> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return { file };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { file };
  }
  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, width, height };
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
    // Safari antiguo no sabe hacer WebP y devuelve PNG: entonces JPEG.
    let out = blob && blob.type === 'image/webp' ? blob : null;
    if (!out) out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!out || out.size >= file.size) return { file, width, height }; // ya venía bien
    const ext = out.type === 'image/webp' ? 'webp' : 'jpg';
    return {
      file: new File([out], rename(file.name, ext), { type: out.type, lastModified: Date.now() }),
      width: w,
      height: h,
      note: `${fmt(file.size)} → ${fmt(out.size)}`,
    };
  } finally {
    bitmap.close();
  }
}

export async function prepareVideo(file: File): Promise<PreparedMedia> {
  const meta = await readVideoMeta(file);
  if (!/^video\/(mp4|quicktime)$/.test(file.type)) return { file, ...meta };
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const fixed = faststart(buf);
    if (!fixed) return { file, ...meta };
    return {
      file: new File([fixed], file.name, { type: file.type, lastModified: Date.now() }),
      ...meta,
      note: 'arranque rápido',
    };
  } catch {
    return { file, ...meta };
  }
}

export function prepareMedia(file: File): Promise<PreparedMedia> {
  return file.type.startsWith('video/') ? prepareVideo(file) : prepareImage(file);
}

function readVideoMeta(file: File): Promise<Pick<PreparedMedia, 'width' | 'height' | 'duration'>> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    const done = (r: Pick<PreparedMedia, 'width' | 'height' | 'duration'>) => { URL.revokeObjectURL(url); resolve(r); };
    const timer = window.setTimeout(() => done({}), 8000);
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => {
      window.clearTimeout(timer);
      done({
        width: v.videoWidth || undefined,
        height: v.videoHeight || undefined,
        duration: Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : undefined,
      });
    };
    v.onerror = () => { window.clearTimeout(timer); done({}); };
    v.src = url;
  });
}

// ---------------------------------------------------------------------------------------------
// faststart: mueve el átomo moov delante de mdat (como qt-faststart / ffmpeg -movflags faststart).
// Los desplazamientos de los trozos (stco/co64) apuntan dentro de mdat: al meter moov delante,
// todos se desplazan exactamente lo que mide moov. Devuelve null si no hace falta o no se puede.
// ---------------------------------------------------------------------------------------------

interface Atom { type: string; start: number; size: number; header: number }

function readAtoms(buf: Uint8Array, from: number, to: number): Atom[] | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const atoms: Atom[] = [];
  let pos = from;
  while (pos + 8 <= to) {
    let size = dv.getUint32(pos);
    const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
    let header = 8;
    if (size === 1) {
      if (pos + 16 > to) return null;
      const big = dv.getBigUint64(pos + 8);
      if (big > BigInt(Number.MAX_SAFE_INTEGER)) return null;
      size = Number(big);
      header = 16;
    } else if (size === 0) {
      size = to - pos;
    }
    if (size < header || pos + size > to) return null;
    atoms.push({ type, start: pos, size, header });
    pos += size;
  }
  return pos === to ? atoms : null;
}

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf']);

/** Ajusta en sitio los stco/co64 que cuelgan de `atom` sumando `delta`. Devuelve false si no cabe. */
function shiftChunkOffsets(buf: Uint8Array, atom: Atom, delta: number): boolean {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const children = readAtoms(buf, atom.start + atom.header, atom.start + atom.size);
  if (!children) return false;
  for (const c of children) {
    if (CONTAINERS.has(c.type)) {
      if (!shiftChunkOffsets(buf, c, delta)) return false;
    } else if (c.type === 'stco') {
      const n = dv.getUint32(c.start + c.header + 4);
      for (let i = 0; i < n; i++) {
        const p = c.start + c.header + 8 + i * 4;
        const v = dv.getUint32(p) + delta;
        if (v > 0xffffffff) return false;
        dv.setUint32(p, v);
      }
    } else if (c.type === 'co64') {
      const n = dv.getUint32(c.start + c.header + 4);
      for (let i = 0; i < n; i++) {
        const p = c.start + c.header + 8 + i * 8;
        dv.setBigUint64(p, dv.getBigUint64(p) + BigInt(delta));
      }
    }
  }
  return true;
}

export function faststart(input: Uint8Array): Uint8Array | null {
  const top = readAtoms(input, 0, input.length);
  if (!top) return null;
  const moovIdx = top.findIndex((a) => a.type === 'moov');
  const mdatIdx = top.findIndex((a) => a.type === 'mdat');
  if (moovIdx < 0 || mdatIdx < 0 || moovIdx < mdatIdx) return null; // ya está bien, o no es un MP4 normal
  if (top.filter((a) => a.type === 'moov').length !== 1) return null;

  const moovAtom = top[moovIdx];
  const moov = input.slice(moovAtom.start, moovAtom.start + moovAtom.size);
  const moovLocal: Atom = { ...moovAtom, start: 0 };
  if (!shiftChunkOffsets(moov, moovLocal, moovAtom.size)) return null;

  // Orden nuevo: lo que iba antes de mdat, moov, y el resto (sin el moov original).
  const before = top.slice(0, mdatIdx);
  const after = top.slice(mdatIdx).filter((a) => a !== moovAtom);
  const out = new Uint8Array(input.length);
  let pos = 0;
  for (const a of before) { out.set(input.subarray(a.start, a.start + a.size), pos); pos += a.size; }
  out.set(moov, pos); pos += moov.length;
  for (const a of after) { out.set(input.subarray(a.start, a.start + a.size), pos); pos += a.size; }
  return pos === input.length ? out : null;
}
