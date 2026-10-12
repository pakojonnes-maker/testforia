import { useSyncExternalStore } from 'react'

/**
 * Qué fotos se sabe que cargan.
 *
 * Que un apartado traiga URL de foto no significa que la foto exista (las de una
 * demo dan 404) ni que haya llegado ya. Donde el hueco de la foto sobra si no hay
 * foto (la hoja de Guías rápidas), reservarlo «por si acaso» pinta un arco vacío
 * que desaparece al fallar la descarga: al recorrer la lista deprisa parpadea en
 * cada apartado. Aquí la respuesta se averigua UNA vez por foto, por adelantado, y
 * el hueco sólo existe cuando la foto ya está descargada.
 */

const status = new Map<string, 'ok' | 'bad'>()
const pending = new Set<string>()
const listeners = new Set<() => void>()

function settle(url: string, result: 'ok' | 'bad') {
  pending.delete(url)
  if (status.get(url) === result) return
  status.set(url, result)
  listeners.forEach(notify => notify())
}

function probe(url: string) {
  if (pending.has(url)) return
  pending.add(url)
  const img = new Image()
  img.onload = () => settle(url, 'ok')
  img.onerror = () => settle(url, 'bad')
  img.src = url
}

/**
 * Descarga por adelantado las fotos que aún no se sabe que cargan. Las que
 * fallaron se vuelven a intentar (la tele pasa días encendida y un corte de WiFi
 * no puede dejar un apartado sin foto para siempre), pero siguen contando como
 * fallidas hasta que lleguen: reintentar no vuelve a enseñar el hueco.
 */
export function preloadPhotos(urls: Array<string | null | undefined>) {
  for (const url of urls) if (url && status.get(url) !== 'ok') probe(url)
}

/** La foto dejó de poder pintarse después de haberse dado por buena. */
export function markPhotoBroken(url: string) {
  settle(url, 'bad')
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => { listeners.delete(notify) }
}

/**
 * Lo mismo para varias fotos a la vez: una letra por foto ('1' lista, '0' no). Es un
 * texto y no una lista para que no cambie entre renders mientras nada cambie.
 */
export function usePhotosReady(urls: string[]): string {
  return useSyncExternalStore(subscribe, () => urls.map(url => (status.get(url) === 'ok' ? '1' : '0')).join(''))
}

/** ¿Está la foto descargada y lista para pintarse ya, sin hueco intermedio? */
export function usePhotoReady(url: string | null | undefined): boolean {
  return useSyncExternalStore(subscribe, () => (url ? status.get(url) === 'ok' : false))
}
