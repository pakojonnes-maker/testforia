/**
 * Densidad de la interfaz según el TAMAÑO FÍSICO de la tele.
 *
 * El escenario fijo de `App.tsx` resuelve la RESOLUCIÓN: 720p, 1080p y 4K se
 * ven idénticos. No resuelve las pulgadas, y son dos problemas distintos.
 *
 * Lo que decide si un texto se lee no son los píxeles, es su tamaño ANGULAR:
 * altura física dividida por distancia de visión. Un rótulo que ocupa el 3 % de
 * la altura de un televisor de 55" a 3 m se lee de sobra; el mismo 3 % en una
 * tele de 24" de un estudio, donde el huésped está a 2 m, es casi la mitad de
 * grande a ojo. Escalar proporcionalmente —que es lo único que hace el
 * escenario— no lo arregla: lo conserva.
 *
 * Y el navegador NO puede saber las pulgadas. `screen.width` da resolución, no
 * tamaño; no hay API de pulgadas en un WebView. Así que esto es un dato de
 * INSTALACIÓN: lo fija quien monta la tele, junto al código de emparejamiento.
 *
 * `density` multiplica el tamaño aparente de todo: por encima de 1 el lienzo de
 * diseño se declara más pequeño, así que el mismo contenido ocupa más pantalla.
 */

export type ScreenSize = 'small' | 'normal' | 'large'

export const DEFAULT_SCREEN_SIZE: ScreenSize = 'normal'

/**
 * Los valores son deliberadamente suaves (±15 %). Un salto mayor descoloca la
 * rejilla del inicio: con densidad alta caben menos filas y las teselas se
 * quedan sin sitio para su contenido. Si algún día hace falta más, la respuesta
 * es enseñar MENOS cosas en pantalla, no encoger más el lienzo.
 */
export const DENSITY: Record<ScreenSize, number> = {
  small: 1.15,   // hasta ~32": estudios, apartamentos pequeños
  normal: 1,     // ~32–50": el caso habitual
  large: 0.92,   // 55" o más: cabe algo más de contenido sin perder legibilidad
}

/** Etiquetas para el admin y para la pantalla de ajustes, no para el huésped. */
export const SCREEN_SIZE_LABELS: Record<ScreenSize, string> = {
  small: 'Pequeña (hasta 32")',
  normal: 'Normal (32–50")',
  large: 'Grande (55" o más)',
}

const ALIASES: Record<string, ScreenSize> = {
  small: 'small', pequena: 'small', pequeña: 'small', s: 'small',
  normal: 'normal', media: 'normal', medium: 'normal', m: 'normal',
  large: 'large', grande: 'large', big: 'large', l: 'large',
}

export function parseScreenSize(value?: string | null): ScreenSize | null {
  if (!value) return null
  return ALIASES[value.trim().toLowerCase()] ?? null
}

/**
 * Resuelve la densidad con la que se dibuja la pantalla.
 *
 * Prioridad: parámetro de la URL primero, y luego lo que diga el dispositivo
 * emparejado. Al revés parece lo lógico, pero el parámetro existe justo para
 * poder AJUSTARLO DELANTE DE LA TELE durante el montaje —probar tamaños con el
 * móvil y ver el resultado al momento— sin tener que entrar en el admin ni
 * esperar a que se refresque la configuración.
 */
export function resolveScreenSize(configured?: string | null, search?: string): ScreenSize {
  const query = new URLSearchParams(search ?? (typeof window !== 'undefined' ? window.location.search : ''))
  const fromUrl = parseScreenSize(query.get('pantalla') || query.get('screen'))
  return fromUrl ?? parseScreenSize(configured) ?? DEFAULT_SCREEN_SIZE
}

export function densityFor(size: ScreenSize): number {
  return DENSITY[size] ?? 1
}
