import { trackTvEvent, type TvEventType } from './api'

// Singleton simple: evita pasar el pairingCode por props a través de cada
// pantalla. Sin código (demo/mock) los eventos se ignoran silenciosamente.
let currentPairingCode: string | null = null

// Una "sesión de TV" es un uso de la pantalla por parte del huésped, no un
// arranque de la app: en un alojamiento la TV puede quedarse encendida horas.
// Se abre una nueva tras 30 min sin interacción, que es lo que convierte los
// KPIs de "eventos sueltos" en "veces que alguien ha usado la pantalla".
const SESSION_IDLE_MS = 30 * 60 * 1000

let sessionId: string | null = null
let lastActivityAt = 0

function newId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `tvs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Devuelve la sesión activa, abriendo una nueva si es la primera interacción o
 * si han pasado más de 30 min desde la última. Emite `impression` exactamente
 * una vez por sesión: antes se registraba una por cada fetch de config, así que
 * "impresiones" medía arranques de app y cambios de idioma.
 */
function ensureSession(lang?: string): string {
  const now = Date.now()
  if (!sessionId || now - lastActivityAt > SESSION_IDLE_MS) {
    sessionId = newId()
    if (currentPairingCode) {
      trackTvEvent(currentPairingCode, 'impression', { lang, tvSessionId: sessionId })
    }
  }
  lastActivityAt = now
  return sessionId
}

export function setTrackingContext(pairingCode: string | null) {
  currentPairingCode = pairingCode
  sessionId = null
  lastActivityAt = 0
}

export function track(
  eventType: TvEventType,
  extra?: { screen?: string; lang?: string; targetId?: string }
) {
  if (!currentPairingCode) return
  const tvSessionId = ensureSession(extra?.lang)
  // `impression` ya la emite ensureSession al abrir la sesión.
  if (eventType === 'impression') return
  trackTvEvent(currentPairingCode, eventType, { ...extra, tvSessionId })
}
