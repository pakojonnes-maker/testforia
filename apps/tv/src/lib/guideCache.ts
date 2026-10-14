import type { GuidebookData } from './api'

/**
 * Copia local de la última guía buena de cada pantalla emparejada.
 *
 * Por qué existe: la mayoría de las teles irán con una caja Google TV por HDMI
 * y en una caja arrancar SIN red es lo normal (la bienvenida sale a los pocos
 * segundos del encendido y el WiFi tarda más). Sin copia, la pantalla no tenía
 * qué enseñar y caía a datos de ejemplo de otro alojamiento.
 *
 * Reglas que no se negocian:
 *  · Todo va en try/catch: sin almacenamiento la app se comporta como si no
 *    hubiera copia, nunca falla.
 *  · Una copia ilegible, de otra versión o vieja se BORRA al leerla. Se lee antes
 *    de pintar y se repetiría en cada encendido: una copia mal formada que
 *    reventara el render dejaría la tele en blanco para siempre.
 *  · La copia lleva la clave del WiFi y el código de la puerta en claro. Nunca se
 *    registra en consola ni se manda a ningún sitio.
 *
 * Si cambias la FORMA de `GuidebookData` de modo incompatible (un campo
 * obligatorio nuevo), sube CACHE_VERSION: las copias de la versión anterior se
 * descartan en vez de reventar el render.
 */
export const CACHE_VERSION = 1

/** Pasado este tiempo la copia se trata como inexistente (el código de la puerta puede haber cambiado). */
export const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

const PREFIX = 'vt:guide:'

interface StoredCopy {
  v: number
  savedAt: number
  data: GuidebookData
}

/**
 * La copia solo se guarda dentro del APK (el User-Agent lleva `VisualTasteTV/`,
 * ver DeviceInfo.kt), o con `?copia=1` para probar en el navegador. Así la clave
 * WiFi de un piso no se queda en el navegador de quien abra
 * tv.visualtastes.com/#CODIGO para una vista previa.
 */
export function cacheEnabled(): boolean {
  try {
    return (
      /VisualTasteTV\//.test(navigator.userAgent) ||
      new URLSearchParams(window.location.search).get('copia') === '1'
    )
  } catch {
    return false
  }
}

const norm = (code: string) => code.trim().toUpperCase()
const codePrefix = (code: string) => `${PREFIX}v${CACHE_VERSION}:${norm(code)}:`
const keyFor = (code: string, lang: string) => `${codePrefix(code)}${lang}`

function allKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX)) keys.push(k)
  }
  return keys
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)

/** Forma mínima de lo que el render toca sin comprobar. Se aplica al leer y antes de escribir. */
export function looksLikeGuide(d: unknown): d is GuidebookData {
  if (!isObj(d)) return false
  const apt = d.apartment
  if (!isObj(apt) || typeof apt.id !== 'string' || !Array.isArray(apt.info) || !isObj(apt.wifi)) return false
  return (
    Array.isArray(d.pois) &&
    Array.isArray(d.restaurants) &&
    Array.isArray(d.experiences) &&
    Array.isArray(d.store_items)
  )
}

/** La copia de (código, idioma), o null si no hay, está corrupta, es de otra versión o caducó (y entonces se borra). */
export function readCopy(code: string, lang: string): GuidebookData | null {
  try {
    const key = keyFor(code, lang)
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    let parsed: StoredCopy | null = null
    try {
      parsed = JSON.parse(raw) as StoredCopy
    } catch {
      parsed = null
    }
    const age = parsed && typeof parsed.savedAt === 'number' ? Date.now() - parsed.savedAt : Infinity
    // age < 0: reloj de la caja descolocado hacia atrás; se acepta, no se borra una copia buena por eso.
    if (!parsed || parsed.v !== CACHE_VERSION || age > MAX_AGE_MS || !looksLikeGuide(parsed.data)) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

/** Guarda la guía recién descargada. Con la cuota llena, suelta las copias de otros idiomas del mismo código y reintenta una vez. */
export function writeCopy(code: string, lang: string, data: GuidebookData): void {
  try {
    if (!looksLikeGuide(data)) return
    const key = keyFor(code, lang)
    const value = JSON.stringify({ v: CACHE_VERSION, savedAt: Date.now(), data } satisfies StoredCopy)
    try {
      localStorage.setItem(key, value)
    } catch {
      for (const k of allKeys()) if (k !== key && k.startsWith(codePrefix(code))) localStorage.removeItem(k)
      localStorage.setItem(key, value)
    }
  } catch {
    /* sin almacenamiento o sin cuota: la pantalla sigue como si no hubiera copia */
  }
}

/** Borra toda copia que no sea del código actual (o de otra versión). Se llama al arrancar: un reemparejado no conserva el WiFi del piso anterior. */
export function purgeOthers(code: string): void {
  try {
    const keep = codePrefix(code)
    for (const k of allKeys()) if (!k.startsWith(keep)) localStorage.removeItem(k)
  } catch { /* nada que purgar */ }
}

/** Borra todas las copias de este código (el servidor dijo que la pantalla ya no existe). */
export function forget(code: string): void {
  try {
    const mine = codePrefix(code)
    for (const k of allKeys()) if (k.startsWith(mine)) localStorage.removeItem(k)
  } catch { /* nada que borrar */ }
}

/** Borra todas las copias de cualquier código: la usa el ErrorBoundary cuando no sabe cuál de ellas rompió el render. */
export function forgetAll(): void {
  try {
    for (const k of allKeys()) localStorage.removeItem(k)
  } catch { /* nada que borrar */ }
}
