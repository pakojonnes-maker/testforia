/**
 * Enlaces heredados de la app de la TV.
 *
 * Hasta sep-2026 este dominio servía la propia app de la TV, y hay enlaces vivos que
 * apuntan a ella: los QR de emparejamiento que genera el admin
 * (apps/admin/src/pages/guide/GuideTvPage.tsx → `https://tv.visualtastes.com/#<código>`)
 * y el modo demo por slug (`/<slug>`). Desde que el dominio sirve la landing, esos
 * enlaces llegan aquí y se reenvían a la app, que sigue en su proyecto de Pages
 * (`visualtaste-tv`), con la ruta y el hash intactos: `useGuidebook` (apps/tv) lee el
 * código del hash y el slug del path.
 *
 * Se hace en el cliente, y a propósito:
 *  - el hash no llega al servidor, así que un `_redirects` no puede ver `/#<código>`;
 *  - una regla `/:slug` de `_redirects` también se comería /robots.txt, /og.jpg…
 * Cuesta un parpadeo de la landing antes del salto; son enlaces funcionales (un QR),
 * no tráfico de marketing.
 *
 * Requiere que el proyecto de Pages de la landing NO tenga 404.html: sin él, Pages sirve
 * index.html para cualquier ruta que no sea un fichero (comportamiento de SPA), que es
 * como `/<slug>` llega hasta este script.
 */

/** Dónde vive ahora la app de la TV. Ya está en ALLOWED_ORIGINS (workerCors.js). */
export const TV_APP_ORIGIN = 'https://visualtaste-tv.pages.dev'

type Where = Pick<Location, 'pathname' | 'search' | 'hash'>

/**
 * URL de la app de la TV a la que hay que reenviar, o null si esta URL es de la landing.
 * `isLandingAnchor` dice si un id existe en la página (#pantalla, #demo…).
 */
export function legacyTvTarget(where: Where, isLandingAnchor: (id: string) => boolean): string | null {
  const onHome = where.pathname === '/' || where.pathname === '/index.html'

  // Cualquier otra ruta que no sea un fichero es un slug del modo demo (/paloma-park-…).
  if (!onHome) return TV_APP_ORIGIN + where.pathname + where.search + where.hash

  // En la raíz, un hash que no es un ancla de la landing es un código de emparejamiento.
  const id = where.hash.slice(1)
  if (id !== '' && !isLandingAnchor(id)) return TV_APP_ORIGIN + '/' + where.search + where.hash

  return null
}

/** Reenvía si la URL actual es un enlace heredado. Devuelve true si ha empezado a redirigir. */
export function redirectLegacyTvLinks(): boolean {
  const target = legacyTvTarget(window.location, id => document.getElementById(safeDecode(id)) !== null)
  if (target === null) return false
  window.location.replace(target)
  return true
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
