/**
 * Tema de la tele derivado del color de marca del anfitrión.
 *
 * Es la misma fórmula que `buildTheme` en apps/tv/src/lib/theme.ts (allí sale
 * de agency.primary/accent_color): el lienzo se oscurece hacia un azul noche en
 * vez de usar el color tal cual, y las superficies suben desde ahí. Se copia y
 * no se importa porque apps/tv es una app aparte (y con cambios en curso); si
 * la fórmula cambia allí, la demo de esta landing debe seguirla.
 */

export interface Brand {
  name: string
  /** Color de marca (#rrggbb): de él sale el fondo. */
  brand: string
  /** Color de acento (#rrggbb): anillo de foco, reloj, logotipo. */
  accent: string
}

const HEX = /^#[0-9a-f]{6}$/i
const FALLBACK_CANVAS = '#0a2431'
const NIGHT = '#050f16'

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

/** Luminancia relativa (WCAG 2.1): decide si el texto sobre el acento va claro u oscuro. */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Custom properties que pinta la maqueta de la tele (`.screen`). */
export function themeVars(brand: Brand): Record<string, string> {
  const canvas = mix(mix(mix(brand.brand, FALLBACK_CANVAS, 0.72), NIGHT, 0.58), '#ffffff', 0.04)
  return {
    '--tv-accent': brand.accent.toLowerCase(),
    '--tv-accent-ink': luminance(brand.accent) > 0.42 ? '#08222e' : '#ffffff',
    '--tv-halo': rgba(brand.accent, 0.3),
    '--tv-glow': rgba(brand.accent, 0.45),
    '--tv-surface': mix(canvas, '#ffffff', 0.14),
    '--tv-surface-raised': mix(canvas, '#ffffff', 0.22),
    '--tv-line': 'rgba(255,255,255,0.14)',
  }
}
