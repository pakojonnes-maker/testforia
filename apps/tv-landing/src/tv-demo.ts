import { must, prefersReducedMotion, whileVisible } from './lib/dom'
import { themeVars, type Brand } from './lib/theme'

/**
 * La tele de la portada: una réplica en HTML del inicio real de apps/tv.
 *
 * El contenido (títulos y descripciones de cada tesela, los colores de marca)
 * vive en el HTML como data-*; aquí solo hay comportamiento.
 */

/** Orden en que la tele se recorre sola, como lo haría alguien con el mando. */
const TOUR = ['eat', 'do', 'store', 'wifi', 'info', 'lang', 'stay', 'code']
const TOUR_MS = 3200
const CLOCK_MS = 20_000

export function initTvDemo(): void {
  const screen = must<HTMLElement>(document, '[data-tv-screen]')
  initTour(screen)
  initBrandPicker(screen)
  initClock()
}

function initTour(screen: HTMLElement): void {
  const tiles = Array.from(screen.querySelectorAll<HTMLButtonElement>('[data-tile]'))
  const capTitle = must<HTMLElement>(document, '[data-cap-title]')
  const capDesc = must<HTMLElement>(document, '[data-cap-desc]')

  let current = TOUR[0]
  // En cuanto el visitante toca o enfoca algo, la tele deja de moverse sola.
  let touched = false

  function focusTile(id: string): void {
    const tile = tiles.find(t => t.dataset.tile === id)
    if (!tile) return
    current = id
    for (const t of tiles) t.classList.toggle('is-focus', t === tile)
    capTitle.textContent = tile.dataset.title ?? ''
    capDesc.textContent = tile.dataset.desc ?? ''
  }

  for (const tile of tiles) {
    const pick = () => {
      touched = true
      focusTile(tile.dataset.tile ?? '')
    }
    tile.addEventListener('click', pick)
    tile.addEventListener('focus', pick)
  }

  if (prefersReducedMotion()) return

  let timer: number | undefined
  const advance = () => {
    if (touched) return
    focusTile(TOUR[(TOUR.indexOf(current) + 1) % TOUR.length])
  }
  whileVisible(
    screen,
    () => {
      if (timer === undefined) timer = window.setInterval(advance, TOUR_MS)
    },
    () => {
      if (timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    },
  )
}

function initBrandPicker(screen: HTMLElement): void {
  const swatches = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-brand]'))
  const brandName = must<HTMLElement>(document, '[data-brand-name]')

  function apply(swatch: HTMLButtonElement): void {
    const brand: Brand = {
      name: swatch.dataset.name ?? '',
      brand: swatch.dataset.brandColor ?? '',
      accent: swatch.dataset.accent ?? '',
    }
    for (const [prop, value] of Object.entries(themeVars(brand))) screen.style.setProperty(prop, value)
    for (const s of swatches) {
      s.classList.toggle('on', s === swatch)
      s.setAttribute('aria-pressed', String(s === swatch))
    }
    brandName.textContent = brand.name
  }

  for (const swatch of swatches) swatch.addEventListener('click', () => apply(swatch))
}

/** Fecha y hora de la cabecera de la tele: como en la real, con el reloj de quien mira. */
function initClock(): void {
  const dateEl = must<HTMLElement>(document, '[data-clock-date]')
  const timeEl = must<HTMLElement>(document, '[data-clock-time]')
  const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeFmt = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' })

  const tick = () => {
    const now = new Date()
    dateEl.textContent = dateFmt.format(now)
    timeEl.textContent = timeFmt.format(now)
  }
  tick()
  window.setInterval(tick, CLOCK_MS)
}
