import { trackTvEvent, type TvEventType } from './api'

// Singleton simple: evita pasar el pairingCode por props a través de cada
// pantalla. Sin código (demo/mock) los eventos se ignoran silenciosamente.
let currentPairingCode: string | null = null

export function setTrackingContext(pairingCode: string | null) {
  currentPairingCode = pairingCode
}

export function track(eventType: TvEventType, extra?: { screen?: string; lang?: string }) {
  if (!currentPairingCode) return
  trackTvEvent(currentPairingCode, eventType, extra)
}
