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
import { initMenu } from './menu'
import { mountTvAppIfNeeded } from './tv-app'
import { initTvDemo } from './tv-demo'

void (async () => {
  // Primero: si la URL es de una pantalla (/<slug>, /#<código>), la app de la TV toma la página y la
  // landing no arranca (ver src/tv-app.ts).
  if (await mountTvAppIfNeeded()) return

  document.documentElement.classList.remove('tv-link') // la landing estaba oculta a la espera de decidir
  initMenu()
  initTvDemo()
  initLanguages()
})()
