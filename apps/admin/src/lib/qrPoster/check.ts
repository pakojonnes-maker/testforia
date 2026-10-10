// Comprobación de lectura de la lámina YA compuesta.
//
// No es un lector de QR: como el código lo generamos nosotros, basta leer el lienzo final módulo
// a módulo y compararlo con la matriz que debería ser. Detecta lo que de verdad puede salir mal
// al imprimir (logo demasiado grande, tinta clara, algo que invade el margen blanco, ojos
// deformados). Lo que no da es una lectura independiente: eso es escanear el papel con un móvil.

import { contrast, hexToRgb, luminance } from './color';
import type { ErrorCorrection } from './types';

export interface QrGeometry {
  /** Esquina superior izquierda del QR en el lienzo, en píxeles. */
  x: number;
  y: number;
  /** Píxeles por módulo. */
  k: number;
  count: number;
  matrix: boolean[][];
  /** Lado de la ventana del logo, en módulos; 0 si no hay logo. */
  logoModules: number;
}

export interface PosterCheck {
  ok: boolean;
  /** Frases para el usuario; vacío si todo está bien. */
  issues: string[];
  /** Módulos por lado. */
  modules: number;
  moduleMm: number;
  qrCm: number;
  contrast: number;
  coveredPct: number;
  strayModules: number;
  eyesOk: boolean;
  quietDirty: number;
}

/**
 * Cuánto QR puede tapar el logo, en % de módulos: un tercio de lo que la corrección de errores
 * aguanta sobre el papel. El margen es a propósito: un móvil a pulso, con reflejo en el cristal
 * del marco, no lee en condiciones de laboratorio.
 */
const COVER_BUDGET: Record<ErrorCorrection, number> = { L: 2, M: 5, Q: 8, H: 10 };
const MIN_CONTRAST = 4;
const MIN_MODULE_MM = 0.8;
const QUIET_MODULES = 4;

const decimal = (value: number, digits = 1) => value.toFixed(digits).replace('.', ',');

export function checkPoster(
  ctx: CanvasRenderingContext2D,
  qr: QrGeometry,
  ink: string,
  paper: string,
  ecl: ErrorCorrection,
  dpi: number,
): PosterCheck {
  const { k, count, matrix } = qr;
  const size = count * k;
  const pad = QUIET_MODULES * k;
  // Una sola lectura del lienzo: el QR con su margen blanco.
  const side = size + pad * 2;
  const pixels = ctx.getImageData(qr.x - pad, qr.y - pad, side, side).data;
  const mid = (luminance(hexToRgb(ink)) + luminance(hexToRgb(paper))) / 2;

  const darkPixel = (px: number, py: number) => {
    const i = (py * side + px) * 4;
    return luminance([pixels[i], pixels[i + 1], pixels[i + 2]]) < mid;
  };
  /** Centro de un módulo (fila y columna pueden caer en el margen: valores negativos). */
  const darkModule = (row: number, col: number) => {
    const cx = Math.floor(pad + (col + 0.5) * k);
    const cy = Math.floor(pad + (row + 0.5) * k);
    let votes = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (darkPixel(cx + dx, cy + dy)) votes += 1;
    return votes >= 5;
  };

  const logoFrom = (count - qr.logoModules) / 2;
  const inLogo = (row: number, col: number) =>
    qr.logoModules > 0 && row >= logoFrom && row < logoFrom + qr.logoModules && col >= logoFrom && col < logoFrom + qr.logoModules;
  // Los tres ojos no son datos: un ojo redondeado «falla» en las esquinas y se lee igual.
  // Se comprueban aparte, como hace un lector: tramos 1:1:3:1:1 por el centro.
  const inEye = (row: number, col: number) =>
    (row < 7 && col < 7) || (row < 7 && col >= count - 7) || (row >= count - 7 && col < 7);

  let covered = 0;
  let stray = 0;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (inEye(row, col)) continue;
      if (darkModule(row, col) !== matrix[row][col]) {
        if (inLogo(row, col)) covered += 1;
        else stray += 1;
      }
    }
  }

  const runs = (x: number, y: number, dx: number, dy: number) => {
    const out: Array<[boolean, number]> = [];
    for (let i = 0; i < 7 * k; i += 1) {
      const value = darkPixel(pad + x + dx * i, pad + y + dy * i);
      const last = out[out.length - 1];
      if (last && last[0] === value) last[1] += 1;
      else out.push([value, 1]);
    }
    return out;
  };
  const eyeRuns = (found: Array<[boolean, number]>) =>
    found.length === 5 && found[0][0] && [1, 1, 3, 1, 1].every((n, i) => Math.abs(found[i][1] - n * k) <= k * 0.5);
  const eyesOk = ([[0, 0], [0, count - 7], [count - 7, 0]] as const).every(([row, col]) =>
    eyeRuns(runs(col * k, Math.floor((row + 3.5) * k), 1, 0)) && eyeRuns(runs(Math.floor((col + 3.5) * k), row * k, 0, 1)));

  // Margen blanco: tres anillos de módulos alrededor del QR, todos claros.
  let quietDirty = 0;
  for (let ring = 1; ring <= 3; ring += 1) {
    for (let i = -ring; i < count + ring; i += 1) {
      if (darkModule(-ring, i)) quietDirty += 1;
      if (darkModule(count - 1 + ring, i)) quietDirty += 1;
      if (darkModule(i, -ring)) quietDirty += 1;
      if (darkModule(i, count - 1 + ring)) quietDirty += 1;
    }
  }

  const modules = count * count;
  const coveredPct = (covered / modules) * 100;
  const ratio = contrast(hexToRgb(ink), hexToRgb(paper));
  const moduleMm = (k / dpi) * 25.4;
  const qrCm = (size / dpi) * 2.54;

  const issues: string[] = [];
  if (ratio < MIN_CONTRAST) issues.push(`Poco contraste entre la tinta y el papel (${decimal(ratio)}:1). Usa una tinta más oscura.`);
  if (!eyesOk) issues.push('Los tres ojos de las esquinas no se distinguen bien.');
  if (stray > 0) issues.push(`Hay ${stray} puntos del QR tapados o deformados fuera del logo.`);
  if (quietDirty > 0) issues.push('Algo invade el margen blanco que necesita el QR alrededor.');
  if (coveredPct > COVER_BUDGET[ecl]) issues.push(`El logo tapa demasiado QR (${decimal(coveredPct)} %).`);
  if (moduleMm < MIN_MODULE_MM) issues.push(`Los puntos del QR quedan muy pequeños (${decimal(moduleMm, 2)} mm). Agranda el QR o elige un papel mayor.`);

  return { ok: issues.length === 0, issues, modules: count, moduleMm, qrCm, contrast: ratio, coveredPct, strayModules: stray, eyesOk, quietDirty };
}
