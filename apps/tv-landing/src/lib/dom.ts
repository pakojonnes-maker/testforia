/**
 * Busca un elemento que TIENE que existir. Si alguien edita el HTML y lo
 * quita, esto falla en voz alta al arrancar en vez de dejar un botón muerto.
 */
export function must<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector)
  if (!el) throw new Error(`tv-landing: falta ${selector} en el HTML`)
  return el
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Llama a `start` mientras el elemento está en pantalla y la pestaña visible, y
 * a `stop` en cuanto deja de estarlo. Las dos deben poder repetirse sin efecto:
 * es lo que evita animaciones corriendo donde nadie mira.
 */
export function whileVisible(el: Element, start: () => void, stop: () => void): void {
  let inView = false
  let tabVisible = document.visibilityState === 'visible'
  const sync = () => (inView && tabVisible ? start() : stop())

  new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting)
    sync()
  }).observe(el)

  document.addEventListener('visibilitychange', () => {
    tabVisible = document.visibilityState === 'visible'
    sync()
  })
}
