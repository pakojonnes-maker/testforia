import type { CSSProperties } from 'react'
import type { GuidebookData } from './api'

/**
 * Tema de la pantalla derivado de la MARCA DEL ANFITRIÓN.
 *
 * `agency.primary_color` / `secondary_color` / `accent_color` ya venían en la
 * respuesta de `/guide/tv/config/:code` y no se usaban: la TV pintaba siempre
 * el mismo turquesa. Cada alojamiento tiene su identidad, y una pantalla de
 * bienvenida que no la respeta parece de otro producto.
 *
 * Todo se expone como custom properties CSS para que las pantallas usen
 * `var(--tv-accent)` y cambien de marca sin volver a renderizar estilos.
 */

const FALLBACK_ACCENT = '#34c2c9'   // turquesa mediterráneo
const FALLBACK_CANVAS = '#0a2431'   // mar hondo

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

/** Luminancia relativa (WCAG 2.1) — decide si el texto encima va claro u oscuro. */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Color de texto legible sobre `hex`. En una TV se mira desde 3 m y a menudo
 * con reflejos, así que el umbral es más exigente que el 0.5 habitual.
 */
export function readableInk(hex: string): string {
  return luminance(hex) > 0.42 ? '#08222e' : '#ffffff'
}

function mix(hex: string, target: string, amount: number): string {
  const a = toRgb(hex)
  const b = toRgb(target)
  return toHex([
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ])
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface TvTheme {
  accent: string
  accentInk: string
  canvas: string
  canvasDeep: string
  surface: string
  surfaceRaised: string
  vars: CSSProperties
}

/**
 * El lienzo se construye oscureciendo el color de marca hacia el negro azulado
 * en vez de usar el color tal cual: un primario claro (una marca en beige, por
 * ejemplo) como fondo a pantalla completa deslumbra en una habitación a oscuras.
 */
export function buildTheme(agency?: GuidebookData['agency']): TvTheme {
  const accent = normalizeHex(agency?.accent_color) || normalizeHex(agency?.primary_color) || FALLBACK_ACCENT
  const brand = normalizeHex(agency?.primary_color) || accent
  const secondary = normalizeHex(agency?.secondary_color) || mix(brand, '#000000', 0.35)

  // El fondo se lleva casi al negro antes de teñirlo: si el lienzo y las
  // teselas comparten claridad, la rejilla se ve como una mancha plana. Lo que
  // separa una tarjeta del fondo en una TV es el SALTO de luminancia, no el borde.
  const tinted = mix(brand, FALLBACK_CANVAS, 0.72)
  const canvasDeep = mix(tinted, '#050f16', 0.58)
  const canvas = mix(canvasDeep, '#ffffff', 0.04)
  const surface = mix(canvas, '#ffffff', 0.14)
  const surfaceRaised = mix(canvas, '#ffffff', 0.22)
  const accentInk = readableInk(accent)

  const vars = {
    '--tv-accent': accent,
    '--tv-accent-ink': accentInk,
    '--tv-accent-soft': rgba(accent, 0.16),
    '--tv-brand': brand,
    '--tv-secondary': secondary,
    '--tv-canvas': canvas,
    '--tv-canvas-deep': canvasDeep,
    '--tv-surface': surface,
    '--tv-surface-raised': surfaceRaised,
    // Velo sobre la foto de fondo (ver MediterraneanBackground). Se calcula
    // aquí y no en CSS porque `color-mix()` es Chrome 111+ y estas pantallas
    // corren en WebViews de Android TV que a menudo van MUY por detrás: allí la
    // regla se descarta entera y el lienzo se queda sin velo, con la cabecera
    // ilegible sobre la pared encalada. `rgba()` lo entiende todo.
    '--tv-scrim-top': rgba(canvasDeep, 0.86),
    '--tv-scrim-bottom': rgba(canvas, 0.74),
    '--tv-line': 'rgba(255,255,255,0.14)',
    '--tv-line-strong': 'rgba(255,255,255,0.26)',
    '--tv-text': '#f8f5ef',
    '--tv-text-dim': 'rgba(248,245,239,0.68)',
    '--tv-text-faint': 'rgba(248,245,239,0.45)',
  } as CSSProperties

  return { accent, accentInk, canvas, canvasDeep, surface, surfaceRaised, vars }
}
