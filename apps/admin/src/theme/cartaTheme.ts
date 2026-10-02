// Copia de apps/client/src/carta/theme.ts (la carta). Las apps no se importan entre sí: si cambia
// una, cambia la otra. Sirve para que la vista previa del admin enseñe los colores ya corregidos.

// Paleta de la carta: sale entera de los 5 colores de «Colores Reels» del admin
// (branding del worker: reel_* > tema > valores por defecto). Aquí no hay ningún
// color de marca escrito a mano: solo se corrige el contraste.
//
//   Primario   → marca: botones, precios y números sobre el papel, corazón marcado
//   Secundario → hondo: fondo del plato sin vídeo y de las miniaturas vacías
//   Acento     → marcas sobre el vídeo: pestaña activa, «Destacado», aviso de alérgeno
//   Fondo      → tinta (el más oscuro de fondo/texto): velos del vídeo y texto de las hojas
//   Texto      → papel (el más claro de fondo/texto): hojas, fichas, carta en lista
//
// Los restaurantes del diseño anterior tienen fondo oscuro y texto blanco, así que
// «el más oscuro de los dos» es la tinta en todos ellos; si alguno los tiene al
// revés, se intercambian solos.

export interface Branding {
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  background_color?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  textColor?: string | null;
  backgroundColor?: string | null;
}

export interface CartaTheme {
  ink: string;
  paper: string;
  brand: string;
  fill: string;
  onFill: string;
  brandText: string;
  heart: string;
  sea: string;
  onSea: string;
  /** Numeral o inicial grande sobre el hondo: la marca si se distingue, si no el papel. */
  seaMark: string;
  mark: string;
  onMark: string;
}

type Rgb = [number, number, number];

const BLACK = '#000000';
const WHITE = '#FFFFFF';

function parseHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const h = input.trim().replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(h)) return '#' + h.split('').map((c) => c + c).join('').toUpperCase();
  // #RRGGBBAA del admin: el alfa no aplica a un color de superficie
  if (/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) return '#' + h.slice(0, 6).toUpperCase();
  return null;
}

function rgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function toHex(c: Rgb): string {
  return '#' + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as Rgb);
}

/** Acerca `color` a `toward` en pasos del 4 % hasta que dé `min` contra `ground`. */
function pushUntil(color: string, toward: string, ground: string, min: number): string {
  for (let t = 0; t <= 1.0001; t += 0.04) {
    const c = mix(color, toward, t);
    if (contrast(c, ground) >= min) return c;
  }
  return toward;
}

const pick = (...values: Array<string | null | undefined>): string | null => {
  for (const v of values) {
    const hex = parseHex(v);
    if (hex) return hex;
  }
  return null;
};

export function buildCartaTheme(branding: Branding | null | undefined): CartaTheme {
  const b = branding || {};
  // Los valores por defecto son los mismos que pone el worker cuando falta un color.
  const primary = pick(b.primary_color, b.primaryColor) || '#FF6B6B';
  const secondary = pick(b.secondary_color, b.secondaryColor) || '#4ECDC4';
  const accent = pick(b.accent_color, b.accentColor) || '#FF8C42';
  const text = pick(b.text_color, b.textColor) || WHITE;
  const background = pick(b.background_color, b.backgroundColor) || BLACK;

  // Tinta y papel: el más oscuro y el más claro de los dos; separados al menos 7:1.
  let ink = luminance(background) <= luminance(text) ? background : text;
  let paper = ink === background ? text : background;
  if (ink === paper) paper = WHITE;
  if (contrast(ink, paper) < 7) {
    ink = pushUntil(ink, BLACK, paper, 7);
    if (contrast(ink, paper) < 7) paper = pushUntil(paper, WHITE, ink, 7);
  }

  // Relleno de botón: la marca tal cual si su texto (papel o tinta) llega a 4,5:1;
  // si no, se oscurece hacia la tinta hasta que el papel llegue.
  let fill = primary;
  let onFill = contrast(primary, paper) >= contrast(primary, ink) ? paper : ink;
  if (contrast(fill, onFill) < 4.5) {
    fill = pushUntil(primary, ink, paper, 4.5);
    onFill = paper;
  }

  const sea = pushUntil(secondary, ink, paper, 4.5);
  const mark = pushUntil(accent, paper, ink, 4.5);

  // El botón vive sobre el velo de tinta del vídeo: si la marca se confunde con él (una carta
  // azul sobre fondo azul), el botón pasa al acento, que ya está ajustado contra la tinta.
  if (contrast(fill, ink) < 2) {
    fill = mark;
    onFill = ink;
  }

  return {
    ink,
    paper,
    brand: primary,
    fill,
    onFill,
    // Cifras y etiquetas de marca sobre el papel
    brandText: pushUntil(primary, ink, paper, 4.5),
    // Corazón marcado sobre el vídeo (con velo de tinta): objeto gráfico, 3:1
    heart: pushUntil(primary, paper, ink, 3),
    // Hondo con texto de papel encima
    sea,
    onSea: paper,
    seaMark: contrast(mark, sea) >= 3 ? mark : paper,
    // Marca sobre el vídeo, con texto de tinta encima (insignia, aviso)
    mark,
    onMark: ink,
  };
}

/** Variables CSS para la raíz `.cm`. */
export function themeVars(t: CartaTheme): Record<string, string> {
  return {
    '--ink': t.ink,
    '--paper': t.paper,
    '--brand': t.brand,
    '--fill': t.fill,
    '--on-fill': t.onFill,
    '--btext': t.brandText,
    '--heart': t.heart,
    '--sea': t.sea,
    '--on-sea': t.onSea,
    '--sea-mark': t.seaMark,
    '--mark': t.mark,
    '--on-mark': t.onMark,
  };
}
