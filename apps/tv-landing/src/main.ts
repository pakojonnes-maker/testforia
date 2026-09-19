/**
 * Fuentes AUTOALOJADAS (Montserrat + Playfair Display), las mismas que apps/tv,
 * no servidas desde el CDN de Google: una hoja remota bloquea el primer pintado
 * y avisa a Google de cada visita (RGPD). La landing es privacy-first como el
 * resto del producto: todas sus peticiones son del propio origen.
 *
 * Playfair va también en cursiva (wght-italic): los titulares enfatizan con ella.
 */
import '@fontsource-variable/montserrat/index.css'
import '@fontsource-variable/playfair-display/index.css'
import '@fontsource-variable/playfair-display/wght-italic.css'
import './styles/landing.css'

import { initLanguages } from './languages'
import { redirectLegacyTvLinks } from './legacy'
import { initMenu } from './menu'
import { initTvDemo } from './tv-demo'

// Primero: un enlace heredado de la app de la TV (/#código, /<slug>) no pinta nada aquí.
if (!redirectLegacyTvLinks()) {
  initMenu()
  initTvDemo()
  initLanguages()
}
