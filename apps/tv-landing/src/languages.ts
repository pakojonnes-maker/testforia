import { must, prefersReducedMotion, whileVisible } from './lib/dom'

/**
 * Sección de idiomas: un saludo gigante que rota por los 13 y, al elegir uno,
 * se queda. El árabe cambia a dir="rtl", como hace la pantalla real.
 * Los saludos y las direcciones viven en el HTML (data-greeting, data-dir).
 */

const ROTATE_MS = 2600

export function initLanguages(): void {
  const chips = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-lang]'))
  if (chips.length === 0) throw new Error('tv-landing: faltan los chips de idioma')
  const greet = must<HTMLElement>(document, '#greet')
  const greetName = must<HTMLElement>(document, '#greet-name')
  const section = must<HTMLElement>(document, '#idiomas')

  let index = 0
  // Si el visitante elige un idioma, deja de rotar.
  let touched = false

  function show(i: number): void {
    const chip = chips[i]
    index = i
    greet.textContent = chip.dataset.greeting ?? ''
    greet.dir = chip.dataset.dir === 'rtl' ? 'rtl' : 'ltr'
    greet.lang = chip.dataset.lang ?? ''
    greetName.textContent = chip.textContent ?? ''
    chips.forEach((c, n) => {
      c.classList.toggle('on', n === i)
      c.setAttribute('aria-pressed', String(n === i))
    })
  }

  chips.forEach((chip, i) =>
    chip.addEventListener('click', () => {
      touched = true
      show(i)
    }),
  )

  if (prefersReducedMotion()) return

  let timer: number | undefined
  whileVisible(
    section,
    () => {
      if (timer === undefined) {
        timer = window.setInterval(() => {
          if (!touched) show((index + 1) % chips.length)
        }, ROTATE_MS)
      }
    },
    () => {
      if (timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    },
  )
}
