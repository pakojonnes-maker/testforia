/**
 * La app de la TV, en este mismo dominio.
 *
 * tv.visualtastes.com sirve DOS cosas desde UN mismo despliegue de Pages:
 *  - la landing (esta app), en la raíz;
 *  - la app de la TV (apps/tv) para las pantallas: un slug (`/<slug>`, modo demo) o un código
 *    de emparejamiento en el hash (`/#<código>`, los QR que genera el admin en GuideTvPage.tsx).
 *
 * La app de la TV no se ha tocado y lee su identificador de la URL (`useGuidebook`: el código del
 * hash, el slug del path), así que tiene que ejecutarse EN la URL original. Por eso no se redirige:
 * se sustituye el documento por su index.html (que el build combinado deja en /tv-shell/) sin
 * cambiar la URL. scripts/build-tv-site.mjs arma ese despliegue; un despliegue suelto de cualquiera
 * de las dos apps a este proyecto borraría a la otra (lo impide el hook de deploy).
 *
 * Se decide en el cliente porque el hash no llega al servidor, y un slug llega hasta aquí porque
 * Pages, sin 404.html, contesta a cualquier ruta que no sea un fichero con este mismo index.html.
 */

/** Dónde deja el build combinado el index.html de la app de la TV (scripts/build-tv-site.mjs). */
const SHELL_URL = '/tv-shell/'

/** Despliegue de la landing SIN la app de la TV al lado (visualtaste-tv-landing.pages.dev): se reenvía a donde sí está. */
const LANDING_ONLY_HOST = /(^|\.)visualtaste-tv-landing\.pages\.dev$/
export const TV_APP_ORIGIN = 'https://visualtaste-tv.pages.dev'

type Where = Pick<Location, 'pathname' | 'search' | 'hash'>

/** ¿Esta URL es de una pantalla y no de la landing? `isLandingAnchor` dice si un id existe en la página. */
export function isTvLink(where: Where, isLandingAnchor: (id: string) => boolean): boolean {
  const onHome = where.pathname === '/' || where.pathname === '/index.html'

  // Cualquier otra ruta que no sea un fichero es un slug del modo demo (/paloma-park-…).
  if (!onHome) return true

  // En la raíz, un hash que no es un ancla de la landing (#pantalla, #demo…) es un código de emparejamiento.
  const id = where.hash.slice(1)
  return id !== '' && !isLandingAnchor(id)
}

/**
 * Si la URL es de una pantalla, la app de la TV toma la página. Devuelve true si la landing no debe
 * arrancar (ya la ha sustituido la app de la TV, o se está yendo a donde está).
 */
export async function mountTvAppIfNeeded(): Promise<boolean> {
  const isAnchor = (id: string) => document.getElementById(safeDecode(id)) !== null
  if (!isTvLink(window.location, isAnchor)) return false
  return takeOver()
}

async function takeOver(): Promise<boolean> {
  const html = await fetchShell()
  if (html !== null) {
    document.open()
    document.write(html)
    document.close()
    return true
  }

  const { hostname, pathname, search, hash } = window.location
  if (LANDING_ONLY_HOST.test(hostname)) {
    window.location.replace(TV_APP_ORIGIN + pathname + search + hash)
    return true
  }

  // Sin la app de la TV en este despliegue (algo salió mal): mejor la landing que una página en blanco.
  return false
}

async function fetchShell(): Promise<string | null> {
  try {
    const res = await fetch(SHELL_URL, { credentials: 'same-origin' })
    if (!res.ok) return null
    const html = await res.text()
    // Sin la app de la TV en el despliegue, Pages contesta a CUALQUIER ruta con la landing (fallback
    // de SPA) y con 200: la marca de la app de la TV es su #root, que la landing no tiene.
    return html.includes('id="root"') ? html : null
  } catch {
    return null
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
