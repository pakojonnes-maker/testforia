import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/**
 * Fuentes AUTOALOJADAS (Montserrat + Playfair Display), no servidas desde el
 * CDN de Google. Mismo patrón que apps/client con Fraunces. Las variables
 * cubren los pesos 400–800 que usa la app en un archivo por subconjunto.
 *
 * Dos razones, y la segunda es la grave:
 *  1. El shell va empaquetado en el APK y no puede depender de la red al
 *     arrancar (CLAUDE.md §2).
 *  2. Una hoja de estilos remota BLOQUEA el render. Con el WiFi de un
 *     apartamento —portal cautivo, DNS lento— la tele se quedaba en blanco
 *     hasta que la petición vencía, justo en los primeros segundos tras
 *     encender, que es cuando alguien la está mirando.
 *
 * Si se vuelve a añadir un enlace remoto aquí o en index.html, se pierden las
 * dos cosas y no lo avisa nada: el fallo sólo se ve con la red mal.
 */
import '@fontsource-variable/montserrat/index.css'
import '@fontsource-variable/playfair-display/index.css'
import './index.css'
import { App } from './App'

/**
 * StrictMode SOLO en desarrollo.
 *
 * Duplica montajes y efectos, que en el SoC de un stick de TV es gasto real y
 * no teórico; y con React 19 rompe `AnimatePresence` en esta app (CLAUDE.md
 * §4). En el APK no aporta nada: los avisos que emite no los lee nadie.
 */
const root = createRoot(document.getElementById('root')!)
root.render(
  import.meta.env.DEV
    ? <StrictMode><App /></StrictMode>
    : <App />
)
