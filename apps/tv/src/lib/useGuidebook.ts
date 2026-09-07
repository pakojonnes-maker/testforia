import { useEffect, useState } from 'react'
import { fetchTvConfig, fetchGuideBySlug, setReferralCookie, type GuidebookData } from './api'
import { MOCK_GUIDE } from './mockGuide'

/**
 * Refresco periódico. Una TV de apartamento se enciende una vez y se queda
 * semanas: sin esto enseñaba PARA SIEMPRE lo que descargó el día del montaje, y
 * el anfitrión podía cambiar la hora de check-out en el admin sin que la
 * pantalla se enterara nunca.
 *
 * 30 min va sobrado y no añade carga real al worker: detrás hay caché KV con
 * TTL de ~15 min (CLAUDE.md §3), así que la mayoría de estas peticiones se
 * sirven de KV sin tocar D1.
 */
const REFRESH_MS = 30 * 60 * 1000

/**
 * Reintento con backoff exponencial tras un fallo, con techo. El WiFi de un
 * apartamento turístico se cae y vuelve; antes, un fallo justo al arrancar era
 * DEFINITIVO — la pantalla se quedaba en datos mock hasta que alguien la
 * desenchufaba.
 */
const RETRY_BASE_MS = 15_000
const RETRY_MAX_MS = 5 * 60 * 1000

/**
 * Carga los datos del guidebook para la TV. Dos formas de identificarse,
 * comprobadas en este orden:
 *  1. Hash de la URL (p.ej. tv.visualtastes.com/#TEST42) — TV realmente
 *     emparejada. Va contra /guide/tv/config/:code, con tracking.
 *  2. Slug en el path (p.ej. tv.visualtastes.com/paloma-park-benalmadena) —
 *     modo preview/demo del guidebook, sin dispositivo emparejado. Va contra
 *     el mismo /guide/:slug que usa apps/guide. Sin pairingCode, así que
 *     lib/tracking.ts no emite eventos (no hay sesión de TV real que medir).
 * Si no hay ninguno de los dos se usan datos mock directamente (demos,
 * desarrollo sin backend).
 */
export function useGuidebook(lang = 'es') {
  const [data, setData] = useState<GuidebookData | null>(null)
  const [usingMock, setUsingMock] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  // Identificador (código o slug) que se intentó resolver, aunque el fetch
  // fallara. Sirve para distinguir "demo intencional sin nada en la URL" de
  // "alguien puso un código/slug y el backend no respondió", que antes eran
  // visualmente indistinguibles.
  const [identifierAttempted, setIdentifierAttempted] = useState<string | null>(null)

  useEffect(() => {
    const code = window.location.hash.replace(/^#/, '').trim()
    const slug = window.location.pathname.replace(/^\/+|\/+$/g, '').trim()
    const identifier = code || slug

    if (code) setPairingCode(code)
    setIdentifierAttempted(identifier || null)

    // Sin identificador no hay nada que pedir: demo intencional.
    if (!identifier) {
      setData(MOCK_GUIDE)
      setUsingMock(true)
      return undefined
    }

    let cancelled = false
    let timer: number | undefined
    let failures = 0
    /**
     * ¿Ha llegado a haber datos reales en pantalla? Es lo que decide si un
     * fallo cae a mock o simplemente conserva lo que ya se está enseñando.
     *
     * Antes CUALQUIER fallo caía a mock, y con refresco periódico eso sería
     * mucho peor que antes: un parpadeo de WiFi a las 3 de la mañana
     * convertiría una TV en producción en el apartamento de demo, con su WiFi
     * falso, hasta el siguiente reintento con suerte.
     */
    let hasRealData = false

    function schedule(ms: number) {
      window.clearTimeout(timer)
      timer = window.setTimeout(load, ms)
    }

    function load() {
      const request = code ? fetchTvConfig(code, lang) : fetchGuideBySlug(slug, lang)
      request
        .then(res => {
          if (cancelled) return
          failures = 0
          hasRealData = true
          setData(res)
          setUsingMock(false)
          if (res?.apartment?.id) setReferralCookie(res.apartment.id)
          schedule(REFRESH_MS)
        })
        .catch(() => {
          if (cancelled) return
          failures += 1
          // Sólo se degrada a mock si nunca hubo datos buenos. Si ya los hay,
          // la pantalla sigue enseñándolos mientras se reintenta por detrás.
          if (!hasRealData) {
            setData(MOCK_GUIDE)
            setUsingMock(true)
          }
          schedule(Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS))
        })
    }

    // Al recuperar red, reintentar YA en vez de esperar a que venza el backoff:
    // si el router del apartamento se reinicia, la espera pendiente puede ser
    // de hasta 5 min y no hay motivo para pagarla.
    const onOnline = () => schedule(0)
    window.addEventListener('online', onOnline)

    load()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener('online', onOnline)
    }
    // `lang` es dependencia a propósito: el guidebook viene ya traducido del
    // backend, así que cambiar de idioma exige recargar los datos. Lo que ya NO
    // ocurre es que ese refetch cuente como una impresión nueva (el backend dejó
    // de registrarla en /config; la emite la app una vez por sesión de TV).
  }, [lang])

  return { data, usingMock, pairingCode, identifierAttempted }
}
