// src/theme/color.ts — el tema de la guía sale de TRES colores de la agencia (primario, secundario,
// acento), que llegan de la BD y pueden ser cualquier cosa: en producción hay primarios azules, un
// secundario casi blanco (#F4F1EC) y otro arena claro (#F7D08A). Aquí se convierten en los tonos que
// usa el diseño, con el contraste calculado, no supuesto: un botón siempre se lee, sea cual sea el color.
//
// Funciones puras, sin DOM: se prueban con scripts/check-theme.mjs.

export type Rgb = [number, number, number];

/** Tinta y papel del diseño. Son fijos: no los cambia la agencia. */
export const INK = '#0C2A37';
export const PAPER = '#F8F3E9';
export const WHITE = '#FFFFFF';

/** Valores cuando la agencia no ha configurado nada (o el color guardado no es válido). */
export const DEFAULT_PRIMARY = '#C8613F';
export const DEFAULT_SECONDARY = '#06415C';
export const DEFAULT_ACCENT = '#F0B04B';

/** Contraste WCAG mínimo del texto normal, con un margen para no quedarse justo en el 4,5. */
const MIN_TEXT = 4.6;
/** Mínimo para elementos que no son texto (subrayados, puntos, anillos). */
const MIN_MARK = 3;

export function parseHex(input: string | null | undefined): Rgb | null {
  if (!input) return null;
  const s = input.trim().replace(/^#/, '');
  const full = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

export const toHex = (rgb: Rgb): string =>
  '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

/** Un hex válido normalizado a #RRGGBB, o el valor por defecto. */
export function normalize(input: string | null | undefined, fallback: string): string {
  const rgb = parseHex(input);
  return rgb ? toHex(rgb) : fallback;
}

/** Igual que color-mix(in srgb, a p%, b): p·a + (1−p)·b por canal. */
export function mix(a: string, b: string, p: number): string {
  const A = parseHex(a) as Rgb;
  const B = parseHex(b) as Rgb;
  return toHex(A.map((v, i) => v * p + B[i] * (1 - p)) as Rgb);
}

const channel = (v: number): number => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex) as Rgb;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Acerca `color` a `toward` (tinta para oscurecer, blanco para aclarar) lo MÍNIMO necesario para que
 * alcance `min` de contraste contra `against`. Devuelve null si ni siquiera el extremo llega.
 */
function nudge(color: string, against: string, min: number, toward: string): string | null {
  if (contrast(color, against) >= min) return color;
  if (contrast(toward, against) < min) return null;
  let lo = 0; // 0 = color original, 1 = extremo
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(mix(toward, color, mid), against) >= min) hi = mid;
    else lo = mid;
  }
  return mix(toward, color, hi);
}

/** Distancia de luminancia entre dos colores: cuánto ha habido que tocar uno para llegar al otro. */
const drift = (a: string, b: string): number => Math.abs(luminance(a) - luminance(b));

export interface Surface {
  /** Fondo. Es el color de la agencia tal cual si ya se lee con texto blanco o tinta; si no, el retoque mínimo. */
  bg: string;
  /** Color del texto sobre `bg`: blanco o tinta, el que mejor contraste da. */
  on: string;
}

/**
 * Una superficie con texto encima (botón, tesela, distintivo). Se queda con el color de la agencia
 * siempre que se pueda leer con blanco o con tinta; si el color cae en la franja en que ninguno de
 * los dos llega a 4,5 (terracota, naranjas), lo oscurece o lo aclara lo justo — lo que menos lo cambie.
 */
export function surface(color: string, min: number = MIN_TEXT): Surface {
  if (contrast(WHITE, color) >= min) return { bg: color, on: WHITE };
  if (contrast(INK, color) >= min) return { bg: color, on: INK };
  const darker = nudge(color, WHITE, min, INK);
  const lighter = nudge(color, INK, min, WHITE);
  if (darker && lighter) return drift(color, darker) <= drift(color, lighter) ? { bg: darker, on: WHITE } : { bg: lighter, on: INK };
  if (darker) return { bg: darker, on: WHITE };
  if (lighter) return { bg: lighter, on: INK };
  return { bg: INK, on: WHITE };
}

/** Un color de marca usado COMO texto sobre el papel (o sobre un fondo suave): se oscurece lo justo. */
export function asText(color: string, background: string = PAPER, min: number = MIN_TEXT): string {
  return nudge(color, background, min, INK) ?? INK;
}

/** Un color usado como marca visual (subrayado, punto) sobre el papel: 3:1, no 4,5. */
export function asMark(color: string, background: string = PAPER): string {
  return nudge(color, background, MIN_MARK, INK) ?? color;
}

/** Un color usado como texto sobre una superficie oscura (el total del carrito): se aclara lo justo. */
export function onDark(color: string, background: string = INK, min: number = MIN_TEXT): string {
  return nudge(color, background, min, WHITE) ?? WHITE;
}

/**
 * Borde de una superficie clara sobre el papel: un secundario casi blanco (#F4F1EC) o un acento pálido se
 * confunden con el fondo. Si el color ya se distingue, no hace falta borde.
 */
export function edge(color: string, background: string = PAPER): string {
  return contrast(color, background) >= 1.6 ? 'transparent' : 'rgba(12, 42, 55, 0.28)';
}

export interface AgencyColors {
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
}

export interface GuideTheme {
  /** El primario de la agencia tal cual (lo que se ve en una muestra de color). */
  brand: string;
  /** Relleno de botones, pines y burbuja del huésped, y el texto que lleva encima. */
  fill: string;
  onFill: string;
  /** El primario usado como texto sobre papel: etiquetas, precios, numerales, enlaces. */
  text: string;
  /** Fondo suave: fila de idioma activa, caja del código, aviso de consentimiento. */
  soft: string;
  /** El secundario como fondo (tesela WiFi, tesela «mar», distintivo «Reservable») y su texto. */
  second: string;
  onSecond: string;
  /** Borde de cada superficie (transparente si ya se distingue del papel). */
  fillEdge: string;
  secondEdge: string;
  accentEdge: string;
  /** El acento como fondo de un distintivo (precio) y su texto. */
  accent: string;
  onAccent: string;
  /** El acento como subrayado o punto sobre papel. */
  accentMark: string;
  /** El acento como texto sobre una superficie oscura. */
  accentOnInk: string;
}

/**
 * Los tres colores de la agencia → el tema. Sin secundario, se deriva del primario (una versión muy
 * oscura) para que la tesela WiFi no desentone; sin primario o sin acento, el valor del diseño.
 */
export function deriveTheme(colors: AgencyColors | null | undefined): GuideTheme {
  const brand = normalize(colors?.primary_color, DEFAULT_PRIMARY);
  const hasSecond = !!parseHex(colors?.secondary_color);
  const secondRaw = hasSecond
    ? normalize(colors?.secondary_color, DEFAULT_SECONDARY)
    : colors?.primary_color && parseHex(colors.primary_color)
      ? mix(brand, INK, 0.4)
      : DEFAULT_SECONDARY;
  const accentRaw = normalize(colors?.accent_color, DEFAULT_ACCENT);

  const fill = surface(brand);
  const soft = mix(brand, PAPER, 0.13);
  const second = surface(secondRaw);
  const accent = surface(accentRaw);

  return {
    brand,
    fill: fill.bg,
    onFill: fill.on,
    fillEdge: edge(fill.bg),
    secondEdge: edge(second.bg),
    accentEdge: edge(accent.bg),
    text: asText(brand, soft),
    soft,
    second: second.bg,
    onSecond: second.on,
    accent: accent.bg,
    onAccent: accent.on,
    accentMark: asMark(accentRaw),
    accentOnInk: onDark(accentRaw),
  };
}
