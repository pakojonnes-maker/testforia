import { useEffect, useRef, useState } from 'react'
import { fetchTvConfig, fetchGuideBySlug, GuideFetchError, type GuidebookData } from './api'
import { cacheEnabled, forget, purgeOthers, readCopy, writeCopy } from './guideCache'
import { MOCK_GUIDE } from './mockGuide'

/**
 * Refresco periódico. Una TV de apartamento se enciende una vez y se queda
 * semanas: sin esto enseñaba PARA SIEMPRE lo que descargó el día del montaje, y
 * el anfitrión podía cambiar la hora de check-out en el admin sin que la
 * pantalla se enterara nunca.
 *
 * 30 min va sobrado y no añade carga real al worker: detrás hay caché KV
 * (CLAUDE.md §3), así que la mayoría de estas peticiones se sirven de KV sin
 * tocar D1.
 */
const REFRESH_MS = 30 * 60 * 1000

/**
 * Reintentos tras un fallo. Al principio, rápidos: con una caja Google TV por
 * HDMI arrancar sin red es lo normal y el WiFi suele volver a los pocos
 * segundos; esperar 15 s para el primer reintento era pagar un minuto de
 * pantalla vacía sin motivo. Después, backoff exponencial desde 15 s con techo
 * de 5 min (el WiFi de un apartamento se cae y vuelve).
 */
const RETRY_FAST_MS = [2_000, 4_000, 8_000, 15_000]
const RETRY_BASE_MS = 15_000
const RETRY_MAX_MS = 5 * 60 * 1000

const retryDelay = (failures: number) =>
  failures <= RETRY_FAST_MS.length
    ? RETRY_FAST_MS[failures - 1]
    : Math.min(RETRY_BASE_MS * 2 ** (failures - RETRY_FAST_MS.length), RETRY_MAX_MS)

/**
 * 'loading' = aún sin nada que enseñar. 'offline' = con código, sin copia y sin
 * red. 'inactive' = el servidor dijo que esta pantalla ya no existe. 'ready' =
 * hay `data` (de la copia, de la red o, solo sin código/en modo slug, el mock).
 */
export type GuidebookStatus = 'loading' | 'ready' | 'offline' | 'inactive'

/** Superficie que la app expone al envoltorio nativo (APK): la red acaba de quedar validada. */
type TvOnlineWindow = Window & { vtTvOnline?: () => void }

/**
 * Qué hay que enseñar ANTES de pintar: la copia local, si la hay. Se calcula
 * una vez al montar para que la primera pantalla ya sea la guía (sin un
 * parpadeo de «Cargando…» que además se repetiría en cada encendido).
 */
function boot(lang: string) {
  const code = window.location.hash.replace(/^#/, '').trim()
  const slug = window.location.pathname.replace(/^\/+|\/+$/g, '').trim()
  let copy: GuidebookData | null = null
  if (code && cacheEnabled()) {
    purgeOthers(code)
    copy = readCopy(code, lang)
  }
  return { code, slug, copy, lang }
}

/**
 * Carga los datos del guidebook para la TV. Dos formas de identificarse,
 * comprobadas en este orden:
 *  1. Hash de la URL (p.ej. tv.visualtastes.com/#TEST42) — TV realmente
 *     emparejada. Va contra /guide/tv/config/:code, con tracking, y guarda la
 *     última guía buena en localStorage (lib/guideCache.ts). NUNCA cae a datos
 *     mock: si no hay red ni copia, `status` es 'offline'.
 *  2. Slug en el path (p.ej. tv.visualtastes.com/paloma-park-benalmadena) —
 *     modo preview/demo del guidebook, sin dispositivo emparejado. Va contra
 *     el mismo /guide/:slug que usa apps/guide. Sin pairingCode, así que
 *     lib/tracking.ts no emite eventos (no hay sesión de TV real que medir). Sin
 *     copia, y si falla cae al mock (es solo QA).
 * Si no hay ninguno de los dos se usan datos mock directamente (demos,
 * desarrollo sin backend).
 */
export function useGuidebook(lang = 'es') {
  const first = useRef<ReturnType<typeof boot> | null>(null)
  if (!first.current) first.current = boot(lang)
  const start = first.current

  const [data, setData] = useState<GuidebookData | null>(start.copy)
  const [usingMock, setUsingMock] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(start.copy !== null)
  const [status, setStatus] = useState<GuidebookStatus>(start.copy ? 'ready' : 'loading')
  // Identificador (código o slug) que se intentó resolver, aunque el fetch
  // fallara. Sirve para distinguir "demo intencional sin nada en la URL" de
  // "alguien puso un código/slug y el backend no respondió", que antes eran
  // visualmente indistinguibles.
  const [identifierAttempted, setIdentifierAttempted] = useState<string | null>(null)

  /**
   * ¿Hay datos reales en pantalla (de la red o de la copia)? Decide si un fallo
   * conserva lo que se enseña. Vive en un ref, no dentro del efecto: el efecto
   * se reejecuta al cambiar de idioma, y con la variable local un fallo de red
   * justo después sustituía la guía real por el mock.
   */
  const hasRealData = useRef(start.copy !== null)
  // Lo que hay en pantalla y en qué idioma, para no vaciarla al cambiar de idioma sin red.
  const shown = useRef<{ data: GuidebookData | null; lang: string }>({ data: start.copy, lang: start.lang })

  useEffect(() => {
    const { code, slug } = start
    const identifier = code || slug

    if (code) setPairingCode(code)
    setIdentifierAttempted(identifier || null)

    // Sin identificador no hay nada que pedir: demo intencional.
    if (!identifier) {
      setData(MOCK_GUIDE)
      setUsingMock(true)
      setStatus('ready')
      return undefined
    }

    const useCopy = !!code && cacheEnabled()
    // Cambio de idioma: si hay copia en el idioma nuevo se enseña ya; si no, se
    // deja lo que hay (en el idioma anterior) y se reintenta, no se vacía.
    if (useCopy && shown.current.lang !== lang) {
      const copy = readCopy(code, lang)
      if (copy) {
        hasRealData.current = true
        shown.current = { data: copy, lang }
        setData(copy)
        setUsingMock(false)
        setFromCache(true)
        setStatus('ready')
      }
    }

    let cancelled = false
    let timer: number | undefined
    let failures = 0
    let seq = 0
    let inflight: AbortController | null = null

    function schedule(ms: number) {
      window.clearTimeout(timer)
      timer = window.setTimeout(load, ms)
    }

    function onSuccess(res: GuidebookData) {
      failures = 0
      hasRealData.current = true
      shown.current = { data: res, lang }
      if (useCopy) writeCopy(code, lang, res)
      setData(res)
      setUsingMock(false)
      setFromCache(false)
      setStatus('ready')
      schedule(REFRESH_MS)
    }

    function onFailure(err: unknown) {
      failures += 1
      if (code) {
        if (err instanceof GuideFetchError && err.definitive) {
          // El servidor dice que esta pantalla ya no existe: fuera la copia (lleva WiFi y código de puerta).
          forget(code)
          hasRealData.current = false
          shown.current = { data: null, lang }
          setData(null)
          setFromCache(false)
          setStatus('inactive')
        } else if (!hasRealData.current) {
          setStatus('offline')
        }
        // Con datos en pantalla (copia o red) no se toca nada: se siguen enseñando.
      } else if (!hasRealData.current) {
        // Modo slug (solo QA): el mock con su pastilla «Datos de ejemplo».
        setData(MOCK_GUIDE)
        setUsingMock(true)
        setStatus('ready')
      }
      schedule(retryDelay(failures))
    }

    function load() {
      // Una petición anterior que sigue colgada (red recién caída o recién
      // vuelta) se cancela: su resultado ya no cuenta.
      inflight?.abort()
      const ctl = new AbortController()
      inflight = ctl
      const mine = ++seq
      const request = code ? fetchTvConfig(code, lang, ctl.signal) : fetchGuideBySlug(slug, lang, ctl.signal)
      request
        .then(res => { if (!cancelled && mine === seq) onSuccess(res) })
        .catch(err => { if (!cancelled && mine === seq) onFailure(err) })
    }

    // Al recuperar red, reintentar YA en vez de esperar a que venza el backoff:
    // si el router del apartamento se reinicia, la espera pendiente puede ser
    // de hasta 5 min y no hay motivo para pagarla.
    const onOnline = () => schedule(0)
    window.addEventListener('online', onOnline)

    // Lo mismo desde el APK: el WebView de una caja no siempre dispara
    // `online`, así que el envoltorio nativo llama a esto cuando Android da la
    // red por validada. Reinicia el conteo de fallos: el primer reintento
    // tras un fallo vuelve a ser el rápido.
    const bridged = window as TvOnlineWindow
    bridged.vtTvOnline = () => {
      failures = 0
      schedule(0)
    }

    load()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      inflight?.abort()
      window.removeEventListener('online', onOnline)
      delete bridged.vtTvOnline
    }
    // `lang` es dependencia a propósito: el guidebook viene ya traducido del
    // backend, así que cambiar de idioma exige recargar los datos. Lo que ya NO
    // ocurre es que ese refetch cuente como una impresión nueva (el backend dejó
    // de registrarla en /config; la emite la app una vez por sesión de TV).
  }, [lang, start])

  return { data, usingMock, pairingCode, identifierAttempted, status, fromCache }
}
