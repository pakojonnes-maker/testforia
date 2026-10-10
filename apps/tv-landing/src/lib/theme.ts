/**
 * Tema de la tele derivado del color de marca del anfitrión.
 *
 * Es la misma fórmula que `buildMirTheme` en apps/tv/src/mir/theme.ts (allí sale
 * de agency.primary_color): muro, tinta y arena son fijos y la marca se ajusta
 * por CONTRASTE medido, no por un umbral. Se copia y no se importa porque apps/tv
 * es una app aparte (y con cambios en curso); si la fórmula cambia allí, la demo
 * de esta landing debe seguirla. Solo salen las variables que usa el inicio.
 */

const HEX = /^#[0-9a-f]{6}$/i
const CAL = '#F8F3E9'
const TINTA = '#0C2A37'
/** Fondo oscuro de noche, contra el que se mide la marca «clara» usada como texto. */
const NOCHE = '#0F2C3B'
/** Muro de la luz de noche (`--wall-tint` de `.m-noche`): contra él se mide el relleno nocturno. */
const MURO_NOCHE = '#1A3B4E'
const BLANCO = '#FFFFFF'

/** Contraste mínimo de un RELLENO de marca (fila con foco, marco del WiFi) con su muro. */
const MIN_RELLENO_DIA = 1.8
const MIN_RELLENO_NOCHE = 2.4

type Rgb = [number, number, number]

function toRgb(hex: string): Rgb {
  if (!HEX.test(hex)) throw new Error(`tv-landing: color no válido «${hex}»`)
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function toHex(rgb: Rgb): string {
  return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function mix(a: string, b: string, amount: number): string {
  const x = toRgb(a)
  const y = toRgb(b)
  return toHex([x[0] + (y[0] - x[0]) * amount, x[1] + (y[1] - x[1]) * amount, x[2] + (y[2] - x[2]) * amount])
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razón de contraste WCAG 2.1 entre dos colores (1–21). */
function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Tinta sobre `bg`: la que dé MÁS contraste. */
function inkOn(bg: string): string {
  return contrast(bg, BLANCO) >= contrast(bg, TINTA) ? BLANCO : TINTA
}

/** Un relleno de marca tiene que distinguirse del muro: se desplaza hacia `toward` lo justo. */
function fillOn(color: string, wall: string, toward: string, min: number): string {
  let out = color
  for (let i = 0; i < 14 && contrast(out, wall) < min; i++) out = mix(out, toward, 0.08)
  return out
}

/** Custom properties que pinta la maqueta de la tele (`.screen`) para un color de marca (#rrggbb). */
export function themeVars(brand: string): Record<string, string> {
  const base = brand.toLowerCase()

  // La marca como TEXTO sobre el muro: se oscurece hacia la tinta hasta 4,5:1.
  let text = base
  for (let i = 0; i < 20 && contrast(text, CAL) < 4.5; i++) text = mix(text, TINTA, 0.07)

  // La marca como texto sobre fondo OSCURO (noche): se aclara hacia el papel.
  let lite = base
  for (let i = 0; i < 20 && contrast(lite, NOCHE) < 4.5; i++) lite = mix(lite, CAL, 0.08)

  const day = fillOn(base, CAL, TINTA, MIN_RELLENO_DIA)
  const night = fillOn(base, MURO_NOCHE, CAL, MIN_RELLENO_NOCHE)

  return {
    '--acc-day': day,
    '--acc-day-ink': inkOn(day),
    '--acc-day-halo': rgba(day, 0.3),
    '--acc-day-glow': rgba(day, 0.45),
    '--acc-n': night,
    '--acc-n-ink': inkOn(night),
    '--acc-n-halo': rgba(night, 0.3),
    '--acc-n-glow': rgba(night, 0.45),
    '--acc-text': text,
    '--acc-lite': lite,
    // Al atardecer el muro se vuelve melocotón y el texto de marca pierde contraste.
    '--acc-text-eve': mix(text, TINTA, 0.3),
  }
}
