import { isDoorCode } from '../lib/infoKeys'
import type { GuidebookData } from '../lib/api'

type InfoItem = GuidebookData['apartment']['info'][number]

/**
 * La hora de entrada/salida, por orden de fiabilidad (copia de la lógica del
 * inicio clásico, que no la exporta).
 *
 * Primero la columna del apartamento (guide_apartments.checkin_time /
 * checkout_time), que es un dato de verdad. Sólo si no la hay se rasca del texto
 * libre del bloque, que es lo único que había antes. Sin ninguna hora NO se
 * inventa un guion: un guion no es un dato, es un hueco con tipografía.
 */
export function stayTime(structured?: string | null, content?: string): string | null {
  const fromColumn = structured?.trim()
  if (fromColumn) {
    // La columna es TEXT sin formato fijo: puede venir "16:00" o "16:00:00".
    const m = fromColumn.match(/\d{1,2}[:.]\d{2}/)
    return m ? m[0].replace('.', ':') : fromColumn
  }
  const match = content?.match(/\d{1,2}[:.]\d{2}/)
  return match ? match[0].replace('.', ':') : null
}

/** Apartados de la casa que se listan en Guías rápidas (el WiFi tiene pantalla propia). */
export function houseItems(data: GuidebookData): InfoItem[] {
  return data.apartment.info.filter(i => i.key.toLowerCase() !== 'wifi')
}

/** El código de entrada, si el anfitrión lo ha cargado. */
export function doorItem(data: GuidebookData): InfoItem | undefined {
  return houseItems(data).find(i => isDoorCode(i.key))
}

/**
 * Tamaño del valor de una ficha según su LONGITUD. Un código son 4–6 cifras y va
 * grande; pero el campo es texto libre y hay anfitriones que escriben una frase
 * («1234 en el teclado de la puerta»): a 60 px salía cortada.
 */
export function valueSize(value: string): '' | 'm' | 's' {
  if (value.length <= 7) return ''
  if (value.length <= 12) return 'm'
  return 's'
}

/**
 * Tamaño (px) de las credenciales de la pantalla de WiFi: el mayor con el que las
 * dos caben ENTERAS (aquí no se recorta nada: hay quien las teclea desde el sofá) en
 * el alto que deja la pantalla bajo el título y sobre la ayuda. Sin esto, un SSID de
 * 32 caracteres con una clave WPA de 63 (los máximos reales) empujaba la ayuda fuera
 * del lienzo. En monoespaciada cada carácter mide 0,6 em, así que las líneas salen
 * de dividir el ancho de la columna entre eso.
 */
export function wifiCredSize(values: string[]): number {
  const WIDTH = 980 // columna `.wf`
  // Alto libre para las líneas de las dos credenciales: 1040 (margen inferior) menos lo
  // fijo de la columna (título, rótulos, huecos y una ayuda de hasta 4 líneas, que es
  // lo que ocupa en alemán o en ruso).
  const FREE = 360
  for (const size of [76, 64, 54, 46, 38, 32]) {
    const perLine = Math.floor(WIDTH / (size * 0.6))
    const lines = values.reduce((n, v) => n + Math.max(1, Math.ceil(v.length / perLine)), 0)
    if (lines * size * 1.12 <= FREE) return size
  }
  return 28
}

/**
 * Tamaño de una credencial de WiFi en la placa del inicio, que tiene alto FIJO y
 * enseña cada valor en UNA línea. Un SSID llega a 32 caracteres y una clave WPA a
 * 63: en una línea de 516 px a 40 px caben ~21, a 32 px ~26 y a 24 px ~35. Lo que
 * pase de ahí se corta con puntos suspensivos; el QR lleva el valor entero y la
 * pantalla de WiFi (Enter sobre la placa) lo enseña completo.
 */
export function credSize(value: string): '' | 'm' | 's' {
  if (value.length <= 20) return ''
  if (value.length <= 26) return 'm'
  return 's'
}
