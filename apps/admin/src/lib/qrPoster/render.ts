// Composición de la lámina con QR para enmarcar: lámina de fondo + marco + QR, en un lienzo.
// La misma función pinta la vista previa y la exportación: lo que se ve es lo que se imprime.

import QRCodeStyling from 'qr-code-styling';
import { checkPoster, type PosterCheck, type QrGeometry } from './check';
import { rgbToHex } from './color';
import type { ErrorCorrection, FrameShape, PrintSize, QrFrameDesign } from './types';

export const EXPORT_DPI = 300;
/** Papel del marco cuando no hay lámina de la que tomar el color. */
const FALLBACK_PAPER = '#f6f0d6';
const QUIET_MODULES = 4;
const LABEL_FONT = 'Montserrat, "Inter", sans-serif';
const SERIF_FONT = '"Playfair Display", "Newsreader", serif';

export interface PosterInput {
  /** null = papel liso (zona sin lámina). */
  poster: ImageBitmap | null;
  /** Centro del marco, en fracción de la lámina. */
  placement: { x: number; y: number };
  url: string;
  design: QrFrameDesign;
  logo: ImageBitmap | null;
  apartmentName: string;
  size: PrintSize;
  dpi: number;
}

export interface PosterOutput {
  canvas: HTMLCanvasElement;
  /** Caja del marco en píxeles del lienzo: lo que el PDF incrusta sin pérdida. */
  plaque: { x: number; y: number; w: number; h: number };
  check: PosterCheck;
  paper: string;
}

export interface PosterQuality {
  /** Píxeles de la lámina por pulgada impresa. */
  ppi: number;
  level: 'buena' | 'aceptable' | 'baja';
  /** Parte de la lámina que se queda fuera del papel, en %. */
  cropPct: number;
  message: string;
  /** Tamaño mínimo de lámina para que quede nítida en este papel. */
  sharpAt: { w: number; h: number };
}

const GOOD_PPI = 220;
const OK_PPI = 130;

/** ¿Cómo se verá esta lámina impresa a este tamaño? */
export function posterQuality(posterW: number, posterH: number, size: PrintSize): PosterQuality {
  const cmPerPx = Math.max(size.w / posterW, size.h / posterH);
  const ppi = Math.round(2.54 / cmPerPx);
  const cropPct = Math.round((1 - (size.w * size.h) / (posterW * posterH * cmPerPx * cmPerPx)) * 100);
  const sharpAt = { w: Math.ceil((size.w / 2.54) * GOOD_PPI), h: Math.ceil((size.h / 2.54) * GOOD_PPI) };
  if (ppi >= GOOD_PPI) return { ppi, level: 'buena', cropPct, sharpAt, message: `Se imprimirá nítida (${ppi} ppp).` };
  if (ppi >= OK_PPI) {
    return { ppi, level: 'aceptable', cropPct, sharpAt, message: `Se verá bien a la distancia de un marco, algo blanda de cerca (${ppi} ppp).` };
  }
  return { ppi, level: 'baja', cropPct, sharpAt, message: `Se verá pixelada (${ppi} ppp). Sube una lámina mayor o elige un papel más pequeño.` };
}

/**
 * fetch + createImageBitmap, no img.decode(): decode() no resuelve nunca con la pestaña en segundo
 * plano, y un lote de 50 láminas se quedaría colgado en cuanto se cambiase de pestaña.
 */
export async function loadBitmap(src: string): Promise<ImageBitmap> {
  const res = await fetch(src, { mode: 'cors' });
  if (!res.ok) throw new Error(`No se pudo cargar la imagen (${res.status})`);
  const blob = await res.blob();
  try {
    return await createImageBitmap(blob);
  } catch {
    // Un logo en SVG: createImageBitmap no acepta el blob, pero sí una <img> ya cargada
    // (con onload, que a diferencia de decode() sí se dispara con la pestaña oculta).
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo leer la imagen'));
        img.src = objectUrl;
      });
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

/** Las fuentes del marco. Sin esperarlas, el lienzo pinta con la de reserva y no avisa. */
export async function loadFrameFonts(): Promise<void> {
  await Promise.all([
    document.fonts.load('600 34px Montserrat'),
    document.fonts.load('italic 500 44px "Playfair Display"'),
  ]).catch(() => undefined);
}

/** Rellena el papel recortando lo mínimo (como object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap, W: number, H: number) {
  const scale = Math.max(W / img.width, H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

const paperCache = new WeakMap<ImageBitmap, string>();

/**
 * El color del borde de la lámina: el marco lo usa de papel para parecer parte del dibujo.
 * Se lee de la lámina ORIGINAL, no del lienzo: en un papel que recorta los lados (A4, 13×18) el
 * mismo punto del lienzo cae ya dentro del dibujo, y en Mijas daba el azul de la cenefa.
 */
function samplePaper(poster: ImageBitmap): string {
  const cached = paperCache.get(poster);
  if (cached) return cached;
  const probe = document.createElement('canvas');
  probe.width = 6;
  probe.height = 6;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) return FALLBACK_PAPER;
  const sum = [0, 0, 0];
  let n = 0;
  for (const [fx, fy] of [[0.012, 0.3], [0.012, 0.7], [0.988, 0.3], [0.988, 0.7]]) {
    const sx = Math.min(poster.width - 6, Math.max(0, Math.round(poster.width * fx) - 3));
    const sy = Math.min(poster.height - 6, Math.max(0, Math.round(poster.height * fy) - 3));
    ctx.drawImage(poster, sx, sy, 6, 6, 0, 0, 6, 6);
    const data = ctx.getImageData(0, 0, 6, 6).data;
    for (let i = 0; i < data.length; i += 4) {
      sum[0] += data[i]; sum[1] += data[i + 1]; sum[2] += data[i + 2];
      n += 1;
    }
  }
  const paper = rgbToHex([sum[0] / n, sum[1] / n, sum[2] / n]);
  paperCache.set(poster, paper);
  return paper;
}

interface BuiltQr {
  bitmap: ImageBitmap;
  count: number;
  k: number;
  size: number;
  matrix: boolean[][];
}

async function buildQr(url: string, design: QrFrameDesign, ecl: ErrorCorrection, target: number, paper: string): Promise<BuiltQr> {
  const { dots, eye, pupil, ink } = design.qr;
  const qr = new QRCodeStyling({
    type: 'canvas', width: 300, height: 300, margin: 0, data: url,
    qrOptions: { errorCorrectionLevel: ecl },
    dotsOptions: { type: dots, color: ink },
    cornersSquareOptions: { type: eye, color: ink },
    cornersDotOptions: { type: pupil, color: ink },
    backgroundOptions: { color: paper },
  });
  const core = qr._qr;
  if (!core) throw new Error('No se pudo generar el QR');
  const count = core.getModuleCount();
  // Píxeles enteros por módulo: sin costuras entre puntos ni bordes blandos.
  const k = Math.max(1, Math.floor(target / count));
  const size = count * k;
  qr.update({ width: size, height: size });
  const blob = await qr.getRawData('png');
  if (!(blob instanceof Blob)) throw new Error('No se pudo dibujar el QR');
  const matrix = Array.from({ length: count }, (_, row) =>
    Array.from({ length: count }, (_, col) => core.isDark(row, col)));
  return { bitmap: await createImageBitmap(blob), count, k, size, matrix };
}

/** Ventana del logo en módulos enteros y con la paridad del QR: queda centrada sobre la rejilla. */
function logoWindow(count: number): number {
  let modules = Math.round(count * 0.25);
  if (modules % 2 !== count % 2) modules += 1;
  return modules;
}

interface FrameBox {
  shape: FrameShape;
  cx: number;
  x0: number;
  y0: number;
  pw: number;
  ph: number;
  springY: number;
  qrX: number;
  qrY: number;
  labelY: number;
  textY: number;
}

type ShapePath = (ctx: CanvasRenderingContext2D, b: FrameBox, inset: number, u: number) => void;

const SHAPES: Record<FrameShape, ShapePath> = {
  placa(ctx, b, d) {
    ctx.beginPath();
    ctx.rect(b.x0 + d, b.y0 + d, b.pw - 2 * d, b.ph - 2 * d);
  },
  etiqueta(ctx, b, d, u) {
    const rc = 44 * u;
    const x0 = b.x0 + d, y0 = b.y0 + d, x1 = b.x0 + b.pw - d, y1 = b.y0 + b.ph - d;
    ctx.beginPath();
    ctx.moveTo(x0 + rc, y0);
    ctx.lineTo(x1 - rc, y0); ctx.arc(x1, y0, rc, Math.PI, Math.PI / 2, true);
    ctx.lineTo(x1, y1 - rc); ctx.arc(x1, y1, rc, 1.5 * Math.PI, Math.PI, true);
    ctx.lineTo(x0 + rc, y1); ctx.arc(x0, y1, rc, 0, 1.5 * Math.PI, true);
    ctx.lineTo(x0, y0 + rc); ctx.arc(x0, y0, rc, Math.PI / 2, 0, true);
    ctx.closePath();
  },
  arco(ctx, b, d) {
    const x0 = b.x0 + d, x1 = b.x0 + b.pw - d, y1 = b.y0 + b.ph - d;
    ctx.beginPath();
    ctx.moveTo(x0, y1);
    ctx.lineTo(x0, b.springY);
    ctx.arc(b.cx, b.springY, b.pw / 2 - d, Math.PI, 0, false);
    ctx.lineTo(x1, y1);
    ctx.closePath();
  },
};

interface FrameTexts { top: string; bottom: string; small: string }

/** Geometría del marco a partir del QR: la zona de silencio (4 módulos) nunca se toca. */
function layout(shape: FrameShape, cx: number, cy: number, qr: BuiltQr, texts: FrameTexts, u: number, W: number, H: number): FrameBox {
  const quiet = QUIET_MODULES * qr.k;
  const pad = 34 * u;
  const pw = qr.size + 2 * (quiet + pad);
  // El pie crece con las líneas de texto que haya; sin texto queda el aire del filete.
  const capBot = 46 * u + (texts.bottom ? 46 * u : 0) + (texts.small ? 44 * u : 0);
  let ph: number;
  let qrOffset: number;
  let labelOffset: number;
  let springOffset = 0;
  if (shape === 'arco') {
    const r = pw / 2;
    // Cuánto sube el QR dentro del arco. Se mide contra el filete INTERIOR: con el radio exterior
    // el filete cruzaba la esquina de la zona de silencio.
    const inner = r - 24 * u;
    const half = qr.size / 2 + quiet + 8 * u;
    const rise = Math.floor(Math.sqrt(Math.max(0, inner * inner - half * half)));
    ph = r - rise + quiet + qr.size + quiet + capBot;
    springOffset = r;
    qrOffset = r - rise + quiet;
    labelOffset = (r - rise) * 0.66 + 20 * u;
  } else {
    const capTop = texts.top ? 112 * u : 46 * u;
    ph = capTop + quiet + qr.size + quiet + capBot;
    qrOffset = capTop + quiet;
    labelOffset = 84 * u;
  }
  // El marco entero dentro del papel, con un respiro: lo que tapa el galce del marco de fotos.
  const margin = 0.03 * W;
  const x0 = Math.min(Math.max(cx - pw / 2, margin), W - margin - pw);
  const y0 = Math.min(Math.max(cy - ph / 2, margin), H - margin - ph);
  const centerX = x0 + pw / 2;
  const qrX = Math.round(centerX - qr.size / 2);
  const qrY = Math.round(y0 + qrOffset);
  return {
    shape, cx: centerX, x0, y0, pw, ph,
    springY: y0 + springOffset,
    qrX, qrY,
    labelY: y0 + labelOffset,
    textY: qrY + qr.size + quiet,
  };
}

/** Texto centrado con tracking, encogido si no cabe. El tracking va a mano: ctx.letterSpacing no está en todos los navegadores. */
function fitText(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number,
  font: (px: number) => string, px: number, tracking: number, maxWidth: number, color: string,
) {
  if (!text) return;
  const chars = [...text];
  let size = px;
  let widths: number[] = [];
  let total = 0;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    ctx.font = font(size);
    const gap = tracking * (size / px);
    widths = chars.map((ch) => ctx.measureText(ch).width);
    total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    if (total <= maxWidth || size <= px * 0.55) break;
    size *= 0.93;
  }
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  if (tracking === 0) {
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y, maxWidth);
    return;
  }
  ctx.textAlign = 'left';
  const gap = tracking * (size / px);
  let cursor = x - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cursor, y);
    cursor += widths[i] + gap;
  });
}

function drawFrame(ctx: CanvasRenderingContext2D, b: FrameBox, design: QrFrameDesign, texts: FrameTexts, paper: string, u: number) {
  const shape = SHAPES[b.shape];
  const { line } = design.frame;
  shape(ctx, b, 0, u);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.lineJoin = 'miter';
  shape(ctx, b, 3.5 * u, u);
  ctx.lineWidth = 7 * u;
  ctx.strokeStyle = line;
  ctx.stroke();
  if (design.frame.double) {
    shape(ctx, b, 20 * u, u);
    ctx.lineWidth = 2.5 * u;
    ctx.stroke();
  }
  const inner = b.pw - 2 * (20 * u + 22 * u);
  // En el arco el rótulo va dentro de la curva: su ancho útil es la cuerda a esa altura.
  let topWidth = inner;
  if (b.shape === 'arco') {
    const r = b.pw / 2 - 30 * u;
    const up = b.springY - (b.labelY - 34 * u);
    topWidth = Math.min(inner, 2 * Math.sqrt(Math.max(0, r * r - up * up)) - 20 * u);
  }
  fitText(ctx, texts.top, b.cx, b.labelY, (px) => `600 ${px}px ${LABEL_FONT}`, 34 * u, 7 * u, topWidth, line);
  let y = b.textY + 46 * u;
  if (texts.bottom) {
    fitText(ctx, texts.bottom, b.cx, y, (px) => `italic 500 ${px}px ${SERIF_FONT}`, 44 * u, 0, inner, design.qr.ink);
    y += 44 * u;
  }
  fitText(ctx, texts.small, b.cx, y, (px) => `600 ${px}px ${LABEL_FONT}`, 26 * u, 5 * u, inner, line);
}

/** El logo, entero y centrado en su ventana (como object-fit: contain). */
function drawLogo(ctx: CanvasRenderingContext2D, b: FrameBox, qr: BuiltQr, logo: ImageBitmap, paper: string): number {
  const modules = logoWindow(qr.count);
  const side = modules * qr.k;
  const x = b.qrX + ((qr.count - modules) / 2) * qr.k;
  const y = b.qrY + ((qr.count - modules) / 2) * qr.k;
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, side, side);
  const room = side - qr.k * 1.2;
  const scale = Math.min(room / logo.width, room / logo.height);
  const w = logo.width * scale;
  const h = logo.height * scale;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(logo, x + (side - w) / 2, y + (side - h) / 2, w, h);
  return modules;
}

const fill = (template: string, apartmentName: string) => template.replace(/\{piso\}/gi, apartmentName).trim();

export async function renderPoster(input: PosterInput): Promise<PosterOutput> {
  const { poster, design, size, dpi } = input;
  const W = Math.round((size.w / 2.54) * dpi);
  const H = Math.round((size.h / 2.54) * dpi);
  // Unidad de diseño: 1 px en un papel de 15 cm de ancho a 300 ppp. Todo el marco escala con el papel.
  const u = W / ((15 / 2.54) * EXPORT_DPI);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('El navegador no permite componer la lámina');

  const customPaper = design.frame.paper !== 'auto' ? design.frame.paper : null;
  if (poster) {
    drawCover(ctx, poster, W, H);
  } else {
    ctx.fillStyle = customPaper ?? FALLBACK_PAPER;
    ctx.fillRect(0, 0, W, H);
  }
  const paper = customPaper ?? (poster ? samplePaper(poster) : FALLBACK_PAPER);

  const withLogo = design.qr.logo && !!input.logo;
  // Con logo encima, la corrección máxima: es lo que deja tapar el centro.
  const ecl: ErrorCorrection = withLogo ? 'H' : 'Q';
  const qr = await buildQr(input.url, design, ecl, W * design.qr.size, paper);

  const texts: FrameTexts = {
    top: fill(design.texts.top, input.apartmentName),
    bottom: fill(design.texts.bottom, input.apartmentName),
    small: fill(design.texts.small, input.apartmentName),
  };
  const box = layout(design.frame.shape, W * input.placement.x, H * input.placement.y, qr, texts, u, W, H);
  drawFrame(ctx, box, design, texts, paper, u);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr.bitmap, box.qrX, box.qrY);
  const logoModules = withLogo && input.logo ? drawLogo(ctx, box, qr, input.logo, paper) : 0;

  const geometry: QrGeometry = { x: box.qrX, y: box.qrY, k: qr.k, count: qr.count, matrix: qr.matrix, logoModules };
  const check = checkPoster(ctx, geometry, design.qr.ink, paper, ecl, dpi);

  const x = Math.max(0, Math.floor(box.x0) - 2);
  const y = Math.max(0, Math.floor(box.y0) - 2);
  return {
    canvas,
    plaque: { x, y, w: Math.min(W - x, Math.ceil(box.pw) + 4), h: Math.min(H - y, Math.ceil(box.ph) + 4) },
    check,
    paper,
  };
}

/** Solo la lámina, sin marco: el fondo que comparten en el PDF todos los pisos de una zona. */
export function renderBackground(poster: ImageBitmap | null, size: PrintSize, dpi: number, paper: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((size.w / 2.54) * dpi);
  canvas.height = Math.round((size.h / 2.54) * dpi);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite componer la lámina');
  if (poster) drawCover(ctx, poster, canvas.width, canvas.height);
  else { ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  return canvas;
}

/** Resolución de la vista previa: 300 ppp mientras el lienzo no pase de ~1.800 px de ancho. */
export const previewDpi = (size: PrintSize): number =>
  Math.min(EXPORT_DPI, Math.round((1800 / size.w) * 2.54));
