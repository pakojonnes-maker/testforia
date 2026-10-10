import { must, prefersReducedMotion, whileVisible } from './lib/dom'
import { themeVars } from './lib/theme'
import { TV_STRINGS, isTvLang, isTvStringKey, type TvLang } from './lib/tv-strings'

/**
 * La tele de la portada: una réplica en HTML del inicio real de apps/tv
 * («Mirador», src/mir/screens/Inicio.tsx), y viva como él: el foco recorre el
 * índice y cambia la foto del arco, el reloj y la luz del día siguen la hora de
 * quien mira, y cambia de idioma y de color de marca.
 *
 * El contenido (títulos y descripciones de cada parada, los colores de marca, los
 * nombres de los idiomas) vive en el HTML como data-*; aquí solo hay
 * comportamiento. Lo que la pantalla dice en cada idioma, en lib/tv-strings.ts.
 */

/** Orden en que el foco se recorre solo. Empieza en «Qué hacer», como la tele. */
const TOUR = ['do', 'store', 'lang', 'wifi', 'info', 'eat']
const TOUR_MS = 3200
/** Con el foco en el idioma o en el WiFi, el arco se queda con la foto de portada. */
const COVER = 'do'

/** Al parar en «Idioma», la tele cambia sola de idioma (el árabe la pone en espejo) y vuelve. */
const HOME_LANG: TvLang = 'es'
const LANG_SHOW: TvLang[] = ['en', 'ar', HOME_LANG]
const LANG_SHOW_MS = 1700
/** A partir de aquí el saludo no cabe en una línea a su cuerpo normal (`.hi.l` en landing.css). */
const LONG_GREETING = 13
/** Fundido de la pantalla al cambiar de idioma (`.is-swap` en landing.css). */
const SWAP_MS = 180

const MOODS = ['manana', 'tarde', 'atardecer', 'noche'] as const
type Mood = (typeof MOODS)[number]

export interface TvDemo {
  /** El visitante elige idioma en otra parte de la página (los chips de «Idiomas»). */
  setLanguage(code: string): void
}

export function initTvDemo(): TvDemo {
  const screen = must<HTMLElement>(document, '[data-tv-screen]')
  const mood = initMood(screen)
  const clock = initClock(screen, now => mood.follow(now))
  const language = initLanguage(screen, lang => clock.render(lang))
  initTour(screen, language)
  initBrandPicker(screen)
  return { setLanguage: code => language.pick(code) }
}

/* ---------- idioma ---------- */

interface Language {
  /** El visitante ha elegido: la tele se queda en ese idioma. */
  pick(code: string): void
  /** El siguiente de los 13, que es lo que hace la fila «Idioma» al tocarla. */
  pickNext(): void
  /** La demo enseña un idioma por su cuenta; no hace nada si el visitante ya eligió. */
  show(lang: TvLang): void
  readonly pinned: boolean
}

function initLanguage(screen: HTMLElement, onChange: (lang: TvLang) => void): Language {
  // Nombre y dirección de cada idioma: los de los chips de la sección «Idiomas».
  const options = new Map<TvLang, { native: string; rtl: boolean }>()
  for (const chip of document.querySelectorAll<HTMLElement>('[data-lang]')) {
    const code = chip.dataset.lang ?? ''
    if (isTvLang(code)) options.set(code, { native: chip.textContent?.trim() ?? code, rtl: chip.dataset.dir === 'rtl' })
  }
  if (!options.has(HOME_LANG)) throw new Error('tv-landing: falta el chip de idioma «es»')
  const order = [...options.keys()]

  const texts = Array.from(screen.querySelectorAll<HTMLElement>('[data-t]')).map(el => {
    const key = el.dataset.t ?? ''
    if (!isTvStringKey(key)) throw new Error(`tv-landing: data-t="${key}" no está en lib/tv-strings.ts`)
    return { el, key }
  })
  const nativeEl = must<HTMLElement>(screen, '[data-lang-native]')
  const greeting = must<HTMLElement>(screen, '[data-t="welcome"]')

  let lang: TvLang = HOME_LANG
  let pinned = false
  let swap: number | undefined

  function apply(next: TvLang): void {
    const option = options.get(next)
    if (!option) return
    lang = next
    screen.lang = next
    screen.dir = option.rtl ? 'rtl' : 'ltr'
    for (const { el, key } of texts) el.textContent = TV_STRINGS[key][next]
    greeting.classList.toggle('l', TV_STRINGS.welcome[next].length > LONG_GREETING)
    nativeEl.textContent = option.native
    onChange(next)
  }

  function set(next: TvLang): void {
    window.clearTimeout(swap)
    swap = undefined
    if (next === lang || prefersReducedMotion()) {
      screen.classList.remove('is-swap')
      if (next !== lang) apply(next)
      return
    }
    // El árabe pone la pantalla entera en espejo: se funde, se cambia y vuelve.
    screen.classList.add('is-swap')
    swap = window.setTimeout(() => {
      swap = undefined
      apply(next)
      screen.classList.remove('is-swap')
    }, SWAP_MS)
  }

  return {
    pick(code) {
      if (!isTvLang(code) || !options.has(code)) return
      pinned = true
      set(code)
    },
    pickNext() {
      pinned = true
      set(order[(order.indexOf(lang) + 1) % order.length])
    },
    show(next) {
      if (!pinned) set(next)
    },
    get pinned() {
      return pinned
    },
  }
}

/* ---------- recorrido del foco ---------- */

function initTour(screen: HTMLElement, language: Language): void {
  const stops = Array.from(screen.querySelectorAll<HTMLButtonElement>('[data-stop]'))
  const layers = Array.from(screen.querySelectorAll<HTMLElement>('[data-arch]'))
  const capTitle = must<HTMLElement>(document, '[data-cap-title]')
  const capDesc = must<HTMLElement>(document, '[data-cap-desc]')

  let current = TOUR[0]
  // En cuanto el visitante toca o enfoca una fila, la tele deja de moverse sola.
  let touched = false
  // Con el ratón encima, espera: el foco sigue al puntero, como en la tele.
  let hovering = false
  let visible = false
  let timer: number | undefined
  /** Idiomas ya enseñados en esta parada de «Idioma». */
  let shown = 0

  function focusStop(id: string): void {
    const stop = stops.find(s => s.dataset.stop === id)
    if (!stop) return
    current = id
    if (id !== 'lang') {
      shown = 0
      language.show(HOME_LANG)
    }
    for (const s of stops) s.classList.toggle('is-focus', s === stop)
    const photo = layers.some(l => l.dataset.arch === id) ? id : COVER
    for (const l of layers) l.classList.toggle('on', l.dataset.arch === photo)
    capTitle.textContent = stop.dataset.title ?? ''
    capDesc.textContent = stop.dataset.desc ?? ''
  }

  const halt = () => {
    window.clearTimeout(timer)
    timer = undefined
  }
  const plan = (ms: number) => {
    halt()
    if (visible && !touched && !hovering) timer = window.setTimeout(advance, ms)
  }
  function advance(): void {
    timer = undefined
    if (current === 'lang' && shown < LANG_SHOW.length && !language.pinned) {
      language.show(LANG_SHOW[shown++])
      plan(LANG_SHOW_MS)
      return
    }
    focusStop(TOUR[(TOUR.indexOf(current) + 1) % TOUR.length])
    plan(current === 'lang' ? LANG_SHOW_MS : TOUR_MS)
  }

  for (const stop of stops) {
    const id = stop.dataset.stop ?? ''
    const take = () => {
      touched = true
      halt()
      focusStop(id)
    }
    stop.addEventListener('focus', take)
    stop.addEventListener('click', () => {
      take()
      if (id === 'lang') language.pickNext()
    })
    stop.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return
      hovering = true
      halt()
      focusStop(id)
    })
  }
  screen.addEventListener('pointerleave', () => {
    hovering = false
    plan(TOUR_MS)
  })

  // Con una fila enfocada, las flechas mueven el foco como el mando: sin dar la vuelta.
  screen.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const next = stops[stops.findIndex(s => s.dataset.stop === current) + (event.key === 'ArrowDown' ? 1 : -1)]
    next?.focus()
  })

  if (prefersReducedMotion()) return

  whileVisible(
    screen,
    () => {
      visible = true
      if (timer === undefined) plan(TOUR_MS)
    },
    () => {
      visible = false
      halt()
    },
  )
}

/* ---------- color de marca ---------- */

function initBrandPicker(screen: HTMLElement): void {
  const swatches = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-brand]'))
  const brandName = must<HTMLElement>(document, '[data-brand-name]')

  function apply(swatch: HTMLButtonElement): void {
    for (const [prop, value] of Object.entries(themeVars(swatch.dataset.brandColor ?? ''))) {
      screen.style.setProperty(prop, value)
    }
    for (const s of swatches) {
      s.classList.toggle('on', s === swatch)
      s.setAttribute('aria-pressed', String(s === swatch))
    }
    brandName.textContent = swatch.dataset.name ?? ''
  }

  for (const swatch of swatches) swatch.addEventListener('click', () => apply(swatch))
  // El de partida también pasa por la fórmula: la CSS solo trae un respaldo para antes del script.
  apply(must<HTMLButtonElement>(document, '[data-brand].on'))
}

/* ---------- luz del día ---------- */

function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value)
}

/** Las franjas de la tele (apps/tv/src/mir/clock.ts): mañana 07–12, tarde 12–19:30, atardecer hasta 21:30. */
function moodAt(now: Date): Mood {
  const m = now.getHours() * 60 + now.getMinutes()
  if (m >= 7 * 60 && m < 12 * 60) return 'manana'
  if (m >= 12 * 60 && m < 19 * 60 + 30) return 'tarde'
  if (m >= 19 * 60 + 30 && m < 21 * 60 + 30) return 'atardecer'
  return 'noche'
}

function initMood(screen: HTMLElement): { follow(now: Date): void } {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-mood]'))
  const moodName = must<HTMLElement>(document, '[data-mood-name]')
  // Hasta que el visitante elige una luz, manda su reloj.
  let manual = false

  function apply(mood: Mood): void {
    const button = buttons.find(b => b.dataset.mood === mood)
    if (!button) throw new Error(`tv-landing: falta el botón de la luz «${mood}»`)
    for (const m of MOODS) screen.classList.toggle(`m-${m}`, m === mood)
    for (const b of buttons) {
      b.classList.toggle('on', b === button)
      b.setAttribute('aria-pressed', String(b === button))
    }
    moodName.textContent = button.textContent ?? ''
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const mood = button.dataset.mood ?? ''
      if (!isMood(mood)) return
      manual = true
      apply(mood)
    })
  }

  return {
    follow(now) {
      if (!manual) apply(moodAt(now))
    },
  }
}

/* ---------- reloj ---------- */

/**
 * Hora y fecha en el idioma de la pantalla, como en la tele: cifras latinas
 * siempre (en árabe `Intl` pinta por defecto las arábigo-índicas) y 24 horas.
 */
function formatNow(lang: TvLang, now: Date): { time: string; date: string } {
  const base = lang === 'es' ? 'es-ES' : lang
  const fmt = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(`${base}-u-nu-latn`, options).format(now)
    } catch {
      return new Intl.DateTimeFormat('es-ES', options).format(now)
    }
  }
  return {
    time: fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    date: fmt({ day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

/** Reloj de la cabecera, con la hora de quien mira; `onMinute` avisa en cada cambio de minuto. */
function initClock(screen: HTMLElement, onMinute: (now: Date) => void): { render(lang: TvLang): void } {
  const timeEl = must<HTMLElement>(screen, '[data-clock-time]')
  const dateEl = must<HTMLElement>(screen, '[data-clock-date]')
  let lang: TvLang = HOME_LANG

  const render = (next: TvLang): void => {
    lang = next
    const { time, date } = formatNow(lang, new Date())
    timeEl.textContent = time
    dateEl.textContent = date
  }
  // Alineado al minuto: un intervalo arrancado en un momento cualquiera salta con retraso.
  const tick = (): void => {
    render(lang)
    onMinute(new Date())
    window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
  }
  tick()

  return { render }
}
