import { must } from './lib/dom'

/** Menú de móvil: un botón de texto («Menú», sin icono) que despliega los enlaces. */

/** Ancho de .page a partir del cual el CSS oculta el botón y muestra los enlaces del nav. */
const DESKTOP_MIN_WIDTH = 981

export function initMenu(): void {
  const toggle = must<HTMLButtonElement>(document, '[data-menu-toggle]')
  const panel = must<HTMLElement>(document, '#menu-panel')
  const page = must<HTMLElement>(document, '.page')

  function setOpen(open: boolean): void {
    panel.hidden = !open
    toggle.setAttribute('aria-expanded', String(open))
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden))

  // Tocar un enlace del panel lo cierra.
  panel.addEventListener('click', event => {
    if (event.target instanceof HTMLAnchorElement) setOpen(false)
  })

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) {
      setOpen(false)
      toggle.focus()
    }
  })

  // Si se ensancha la ventana con el panel abierto, no lo dejamos "abierto" y oculto.
  new ResizeObserver(() => {
    if (page.clientWidth >= DESKTOP_MIN_WIDTH) setOpen(false)
  }).observe(page)
}
