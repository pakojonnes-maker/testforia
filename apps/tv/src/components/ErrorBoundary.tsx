import { Component, type ErrorInfo, type ReactNode } from 'react'
import { forgetAll } from '../lib/guideCache'
import { getTvString } from '../lib/i18n'
import { DEFAULT_LANG } from '../lib/languages'

/**
 * Red de seguridad de última instancia. Una caja Google TV por HDMI no tiene a
 * nadie delante para desenchufarla: si el render lanza un error (p. ej. una
 * copia local con una forma que el código ya no espera) la tele se quedaría en
 * blanco, y como la copia se lee en cada encendido, en blanco para siempre.
 *
 * Primer error: borra las copias y recarga UNA vez. Si vuelve a fallar dentro de
 * los RELOAD_GAP_MS siguientes (el dato malo viene de la red, no de la copia),
 * no vuelve a recargar en bucle: enseña «Cargando…» y lo reintenta pasado ese
 * tiempo, que es lo bastante largo para que no sea un parpadeo continuo y lo
 * bastante corto para que una caja sin nadie delante se recupere sola cuando el
 * anfitrión corrija el dato. No se registra nada: la copia lleva la clave WiFi.
 */
const RELOAD_KEY = 'vt:tv:reloaded-at'
const RELOAD_GAP_MS = 10 * 60 * 1000

interface State { failed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }
  private timer: number | undefined

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    forgetAll()
    let last = 0
    try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0 } catch { /* sin sessionStorage */ }
    const now = Date.now()
    if (now - last > RELOAD_GAP_MS) {
      try { sessionStorage.setItem(RELOAD_KEY, String(now)) } catch { /* se recarga igual, una vez */ }
      window.location.reload()
      return
    }
    // Ya se recargó hace poco: sin bucle. Otro intento cuando pase el hueco.
    this.timer = window.setTimeout(() => window.location.reload(), RELOAD_GAP_MS)
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div
        style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#1c1a17', color: '#f4efe6', fontFamily: 'sans-serif', fontSize: 40,
        }}
      >
        {getTvString('loading', DEFAULT_LANG)}
      </div>
    )
  }
}
