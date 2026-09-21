import type { CSSProperties } from 'react'
import type { GuidebookData } from '../lib/api'

/**
 * Tema «Mirador»: el color de marca del anfitrión sobre el muro encalado.
 *
 * Lo único que cambia de una agencia a otra es el ACENTO. Muro, tinta y arena
 * son fijos: una pared blanca con tipografía azul noche funciona con cualquier
 * marca, y dejar que el anfitrión pinte también el fondo es como se acababa en
 * una pantalla ilegible (ver el límite conocido de MediterraneanBackground).
 *
 * Todo lo que depende del acento se decide por CONTRASTE medido (WCAG 2.1), no
 * por un umbral fijo. El umbral que usaba readableInk (luminancia > 0,42) pone
 * blanco sobre los acentos de tono medio y ahí falla: con el salmón #E07A5F de
 * la agencia demo el blanco da 2,95:1 y la tinta oscura da 5,1:1.
 */

const CAL = '#F8F3E9'
const TINTA = '#0C2A37'
/** Fondo oscuro de las pantallas de noche, contra el que se mide el acento «claro». */
const NOCHE = '#0F2C3B'
const BLANCO = '#FFFFFF'

/** Terracota: el acento cuando la agencia no ha elegido ninguno. */
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

export function buildMirTheme(agency?: GuidebookData['agency']): MirTheme {
  const accent = normalizeHex(agency?.accent_color) || normalizeHex(agency?.primary_color) || DEFAULT_ACCENT

  // Acento como TEXTO sobre el muro: se oscurece hacia la tinta hasta 4,5:1.
  let text = accent
  for (let i = 0; i < 20 && contrast(text, CAL) < 4.5; i++) text = mix(text, TINTA, 0.07)

  // Acento como texto sobre fondo OSCURO (noche): se aclara hacia el papel.
  let lite = accent
  for (let i = 0; i < 20 && contrast(lite, NOCHE) < 4.5; i++) lite = mix(lite, CAL, 0.08)

  const [r, g, b] = toRgb(accent)
  const vars = {
    '--acc': accent,
    '--acc-ink': inkOn(accent),
    '--acc-text': text,
    '--acc-lite': lite,
    // Al atardecer el muro se vuelve melocotón y el texto de acento pierde
    // contraste: se oscurece un 30 % más hacia la tinta.
    '--acc-text-eve': mix(text, TINTA, 0.3),
    // Extremo oscuro del degradado de una tarjeta sin foto.
    '--acc-deep': mix(accent, TINTA, 0.45),
    '--acc-halo': `rgba(${r}, ${g}, ${b}, .30)`,
    '--acc-glow': `rgba(${r}, ${g}, ${b}, .45)`,
  } as CSSProperties

  return { accent, vars }
}
