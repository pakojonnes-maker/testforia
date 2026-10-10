// PDF escrito a mano, sin librería: páginas del tamaño exacto del papel que solo llevan imágenes.
//
// Cada página son dos capas:
//   - el fondo (la lámina, JPEG), que se incrusta UNA vez por lámina aunque lo usen veinte pisos;
//   - el marco con el QR, recortado del lienzo final y guardado sin pérdida (Flate), para que los
//     bordes del QR no lleven artefactos de JPEG.
// Un PDF que solo contiene imágenes es un formato muy pequeño: cabecera, objetos numerados, una
// tabla con la posición en bytes de cada objeto y un pie que apunta a ella.

const CM_TO_PT = 72 / 2.54;

export interface PdfPage {
  widthCm: number;
  heightCm: number;
  /** Tamaño en píxeles del lienzo del que salen las dos capas. */
  canvasWidth: number;
  canvasHeight: number;
  background: { key: string; jpeg: Uint8Array; width: number; height: number };
  overlay: { data: Uint8Array; width: number; height: number; x: number; y: number };
}

const toBytes = async (blob: Blob): Promise<Uint8Array> => new Uint8Array(await blob.arrayBuffer());

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? toBytes(blob).then(resolve, reject) : reject(new Error('No se pudo codificar la lámina'))), 'image/jpeg', quality);
  });
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar la lámina'))), 'image/png');
  });
}

/** Un recorte del lienzo como RGB comprimido con zlib, que es lo que espera /FlateDecode. */
export async function canvasRegionToFlate(
  canvas: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number },
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite leer la lámina');
  const rgba = ctx.getImageData(box.x, box.y, box.w, box.h).data;
  const rgb = new Uint8Array(box.w * box.h * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }
  // 'deflate' en CompressionStream es el formato zlib (RFC 1950), no deflate crudo.
  const stream = new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'));
  return { data: new Uint8Array(await new Response(stream).arrayBuffer()), width: box.w, height: box.h };
}

const num = (value: number) => (Math.round(value * 1000) / 1000).toString();

export function buildPdf(pages: PdfPage[]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = []; // offsets[n - 1] = posición en bytes del objeto n
  let length = 0;
  const write = (data: string | Uint8Array) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    parts.push(bytes);
    length += bytes.length;
  };
  let nextId = 3; // 1 = catálogo, 2 = árbol de páginas
  const open = (id: number) => {
    offsets[id - 1] = length;
    write(`${id} 0 obj\n`);
  };
  const streamObject = (dict: string, bytes: Uint8Array): number => {
    const id = nextId;
    nextId += 1;
    open(id);
    write(`<< ${dict} /Length ${bytes.length} >>\nstream\n`);
    write(bytes);
    write('\nendstream\nendobj\n');
    return id;
  };
  const image = (width: number, height: number, filter: string, bytes: Uint8Array) =>
    streamObject(`/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /${filter}`, bytes);

  write('%PDF-1.4\n');
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // comentario binario: «este archivo no es texto»

  const backgrounds = new Map<string, number>();
  const pageIds: number[] = [];
  for (const page of pages) {
    let bg = backgrounds.get(page.background.key);
    if (bg === undefined) {
      bg = image(page.background.width, page.background.height, 'DCTDecode', page.background.jpeg);
      backgrounds.set(page.background.key, bg);
    }
    const ov = image(page.overlay.width, page.overlay.height, 'FlateDecode', page.overlay.data);

    const w = page.widthCm * CM_TO_PT;
    const h = page.heightCm * CM_TO_PT;
    const sx = w / page.canvasWidth;
    const sy = h / page.canvasHeight;
    // El origen de un PDF está abajo a la izquierda: la y del recorte se da la vuelta.
    const ow = page.overlay.width * sx;
    const oh = page.overlay.height * sy;
    const ox = page.overlay.x * sx;
    const oy = h - (page.overlay.y + page.overlay.height) * sy;
    const content = streamObject('', encoder.encode(
      `q ${num(w)} 0 0 ${num(h)} 0 0 cm /Bg Do Q\nq ${num(ow)} 0 0 ${num(oh)} ${num(ox)} ${num(oy)} cm /Ov Do Q\n`,
    ));

    const id = nextId;
    nextId += 1;
    open(id);
    write(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(w)} ${num(h)}] /Resources << /XObject << /Bg ${bg} 0 R /Ov ${ov} 0 R >> >> /Contents ${content} 0 R >>\nendobj\n`);
    pageIds.push(id);
  }

  open(1);
  write('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  open(2);
  write(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>\nendobj\n`);

  const xref = length;
  write(`xref\n0 ${nextId}\n0000000000 65535 f \n`);
  for (let id = 1; id < nextId; id += 1) write(`${String(offsets[id - 1]).padStart(10, '0')} 00000 n \n`);
  write(`trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
