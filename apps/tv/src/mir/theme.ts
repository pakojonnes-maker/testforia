import type { CSSProperties } from 'react'
import type { GuidebookData } from '../lib/api'

/**
 * Tema «Mirador»: el color de marca del anfitrión sobre el muro encalado.
 *
 * Lo único que cambia de una agencia a otra son sus colores. Muro, tinta y arena
 * son fijos: una pared blanca con tipografía azul noche funciona con cualquier
 * marca, y dejar que el anfitrión pinte también el fondo es como se acababa en
 * una pantalla ilegible (ver el límite conocido de MediterraneanBackground).
 *
 * Los tres colores de la agencia tienen el mismo papel que en la guía
 * (apps/guide/src/theme/color.ts): el PRIMARIO es la marca (foco, botones, marco
 * del WiFi, nombre, rótulos) y el ACENTO queda para las etiquetas (Destacado,
 * Agotado). Una agencia que sólo ha elegido uno lo usa para todo. Antes la TV
 * pintaba TODO con el acento y una agencia de marca azul y acento naranja veía
 * la pantalla entera en naranja mientras su guía era azul (Costa del Sol, sep-2026).
 * El secundario no se usa: la TV no tiene una superficie que lo pida.
 *
 * Todo lo que depende de la marca se decide por CONTRASTE medido (WCAG 2.1), no
 * por un umbral fijo. El umbral que usaba readableInk (luminancia > 0,42) pone
 * blanco sobre los colores de tono medio y ahí falla: con el salmón #E07A5F de
 * la agencia demo el blanco da 2,95:1 y la tinta oscura da 5,1:1.
 */

const CAL = '#F8F3E9'
const TINTA = '#0C2A37'
/** Fondo oscuro de las pantallas de noche, contra el que se mide la marca «clara» usada como texto. */
const NOCHE = '#0F2C3B'
/** Muro de la luz de noche (`--wall-tint` de `.m-noche` en mir.css): contra él se mide el relleno nocturno. */
const MURO_NOCHE = '#1A3B4E'
const BLANCO = '#FFFFFF'

/** Contraste mínimo de un RELLENO de marca (fila con foco, botón, marco) con el muro sobre el que va. */
const MIN_RELLENO_DIA = 1.8
const MIN_RELLENO_NOCHE = 2.4

/** Terracota: el color de marca cuando la agencia no ha elegido ninguno. */
export const DEFAULT_ACCENT = '#B04E2B'

function normalizeHex(value?: string | null): string | null {
  if (!value) return null
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const hex = match[1]
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
  return `#${full.toLowerCase()}`
}

function toRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function toHex(rgb: [number, number, number]): string {
  return '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razón de contraste WCAG 2.1 entre dos colores (1–21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function mix(a: string, b: string, amount: number): string {
  const x = toRgb(a)
  const y = toRgb(b)
  return toHex([x[0] + (y[0] - x[0]) * amount, x[1] + (y[1] - x[1]) * amount, x[2] + (y[2] - x[2]) * amount])
}

/** Tinta sobre `bg`: la que dé MÁS contraste. */
export function inkOn(bg: string): string {
  return contrast(bg, BLANCO) >= contrast(bg, TINTA) ? BLANCO : TINTA
}

export interface MirTheme {
  accent: string
  vars: CSSProperties
}

/**
 * Un color de marca usado como RELLENO tiene que distinguirse del muro. Un azul de
 * marca sobre el muro azul marino de la noche apenas se ve (1,8:1) y uno muy pálido
 * sobre el muro encalado tampoco: se desplaza hacia `toward` lo justo y sólo si hace
 * falta. Un naranja, un terracota o un salmón no llegan a tocarse.
 */
function fillOn(color: string, wall: string, toward: string, min: number): string {
  let out = color
  for (let i = 0; i < 14 && contrast(out, wall) < min; i++) out = mix(out, toward, 0.08)
  return out
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function buildMirTheme(agency?: GuidebookData['agency']): MirTheme {
  const primary = normalizeHex(agency?.primary_color)
  const accent = normalizeHex(agency?.accent_color)
  // Marca = primario; etiquetas = acento. Con uno solo elegido, ese sirve para todo.
  const brand = primary || accent || DEFAULT_ACCENT
  const badge = accent || brand

  // La marca como TEXTO sobre el muro: se oscurece hacia la tinta hasta 4,5:1.
  let text = brand
  for (let i = 0; i < 20 && contrast(text, CAL) < 4.5; i++) text = mix(text, TINTA, 0.07)

  // La marca como texto sobre fondo OSCURO (noche): se aclara hacia el papel.
  let lite = brand
  for (let i = 0; i < 20 && contrast(lite, NOCHE) < 4.5; i++) lite = mix(lite, CAL, 0.08)

  // La marca como RELLENO: una versión para los muros claros y otra para el de noche
  // (mir.css elige la suya con `.m-noche`; las variables no pueden llamarse `--acc`
  // porque el estilo en línea ganaría a esa regla).
  const day = fillOn(brand, CAL, TINTA, MIN_RELLENO_DIA)
  const night = fillOn(brand, MURO_NOCHE, CAL, MIN_RELLENO_NOCHE)

  const vars = {
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
    // Al atardecer el muro se vuelve melocotón y el texto de marca pierde
    // contraste: se oscurece un 30 % más hacia la tinta.
    '--acc-text-eve': mix(text, TINTA, 0.3),
    // Extremo oscuro del degradado de una tarjeta sin foto.
    '--acc-deep': mix(day, TINTA, 0.45),
    // El acento de la agencia, para las etiquetas.
    '--acc2': badge,
    '--acc2-ink': inkOn(badge),
  } as CSSProperties

  return { accent: brand, vars }
}
