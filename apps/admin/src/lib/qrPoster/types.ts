// Lámina con QR para enmarcar: lo que se guarda (el diseño) y lo que se elige al imprimir.

export type DotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
export type EyeStyle = 'square' | 'dot' | 'extra-rounded';
export type PupilStyle = 'square' | 'dot';
export type FrameShape = 'etiqueta' | 'placa' | 'arco';
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

/** Lo que guarda guide_agencies.qr_design. Si cambia la forma, sube `version` y migra en normalizeDesign. */
export interface QrFrameDesign {
  version: 1;
  qr: {
    dots: DotStyle;
    eye: EyeStyle;
    pupil: PupilStyle;
    ink: string;
    /** Logo de la agencia en el centro (solo si la agencia tiene logo). */
    logo: boolean;
    /** Ancho del QR como fracción del ancho del papel. */
    size: number;
  };
  frame: {
    shape: FrameShape;
    /** 'auto' toma el color del borde de la lámina: el marco parece parte del dibujo. */
    paper: string;
    line: string;
    double: boolean;
  };
  /** Admiten {piso}, que se sustituye por el nombre del apartamento. */
  texts: { top: string; bottom: string; small: string };
  print: { size: PrintSizeKey };
}

export type PrintSizeKey = '10x15' | '13x18' | '15x20' | 'a5' | 'a4' | '30x40';

export interface PrintSize {
  key: PrintSizeKey;
  label: string;
  /** Centímetros, en vertical. */
  w: number;
  h: number;
}

// 15×20 y 30×40 son 3:4, la proporción de las láminas: no recortan nada.
export const PRINT_SIZES: PrintSize[] = [
  { key: '10x15', label: '10 × 15 cm', w: 10, h: 15 },
  { key: '13x18', label: '13 × 18 cm', w: 13, h: 18 },
  { key: '15x20', label: '15 × 20 cm', w: 15, h: 20 },
  { key: 'a5', label: 'A5 (14,8 × 21 cm)', w: 14.8, h: 21 },
  { key: 'a4', label: 'A4 (21 × 29,7 cm)', w: 21, h: 29.7 },
  { key: '30x40', label: '30 × 40 cm', w: 30, h: 40 },
];

export const printSize = (key: PrintSizeKey): PrintSize =>
  PRINT_SIZES.find((s) => s.key === key) ?? PRINT_SIZES[2];

export const QR_SIZE_MIN = 0.26;
export const QR_SIZE_MAX = 0.44;
const DEFAULT_INK = '#16324a';

/**
 * Diseño de partida: QR compacto en un marco de etiqueta. Con logo, QR redondeado y el logo
 * en el centro; sin logo, el clásico de módulos cuadrados.
 */
export function defaultDesign(hasLogo: boolean, ink: string = DEFAULT_INK): QrFrameDesign {
  return {
    version: 1,
    qr: hasLogo
      ? { dots: 'rounded', eye: 'extra-rounded', pupil: 'dot', ink, logo: true, size: 0.32 }
      : { dots: 'square', eye: 'square', pupil: 'square', ink, logo: false, size: 0.32 },
    frame: { shape: 'etiqueta', paper: 'auto', line: ink, double: true },
    texts: { top: 'ESCANEA · SCAN ME', bottom: 'La guía de tu casa', small: 'YOUR HOUSE GUIDE' },
    print: { size: '15x20' },
  };
}

const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;
const text = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value.slice(0, 80) : fallback;

/** Lo guardado puede venir incompleto o de otra versión: cada campo que no valga cae al de partida. */
export function normalizeDesign(raw: unknown, fallback: QrFrameDesign): QrFrameDesign {
  if (!raw || typeof raw !== 'object') return fallback;
  const d = raw as { qr?: Record<string, unknown>; frame?: Record<string, unknown>; texts?: Record<string, unknown>; print?: Record<string, unknown> };
  const size = Number(d.qr?.size);
  return {
    version: 1,
    qr: {
      dots: oneOf(d.qr?.dots, ['square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'], fallback.qr.dots),
      eye: oneOf(d.qr?.eye, ['square', 'dot', 'extra-rounded'], fallback.qr.eye),
      pupil: oneOf(d.qr?.pupil, ['square', 'dot'], fallback.qr.pupil),
      ink: isHex(d.qr?.ink) ? d.qr.ink : fallback.qr.ink,
      logo: typeof d.qr?.logo === 'boolean' ? d.qr.logo : fallback.qr.logo,
      size: Number.isFinite(size) ? Math.min(QR_SIZE_MAX, Math.max(QR_SIZE_MIN, size)) : fallback.qr.size,
    },
    frame: {
      shape: oneOf(d.frame?.shape, ['etiqueta', 'placa', 'arco'], fallback.frame.shape),
      paper: d.frame?.paper === 'auto' || isHex(d.frame?.paper) ? (d.frame.paper as string) : fallback.frame.paper,
      line: isHex(d.frame?.line) ? d.frame.line : fallback.frame.line,
      double: typeof d.frame?.double === 'boolean' ? d.frame.double : fallback.frame.double,
    },
    texts: {
      top: text(d.texts?.top, fallback.texts.top),
      bottom: text(d.texts?.bottom, fallback.texts.bottom),
      small: text(d.texts?.small, fallback.texts.small),
    },
    print: { size: oneOf(d.print?.size, PRINT_SIZES.map((s) => s.key), fallback.print.size) },
  };
}

/** Lo que apunta el QR. `?o=marco` es lo que permite contar las entradas por el marco. */
export const guideUrlForFrame = (guideBase: string, slug: string): string =>
  `${guideBase.replace(/\/$/, '')}/${slug}?o=marco`;
