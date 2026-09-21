import { useEffect, useState } from 'react'

/**
 * Hora actual, refrescada en el cambio de minuto.
 *
 * Alineada al minuto a propósito: un intervalo de 60 s arrancado en un momento
 * cualquiera hace que el reloj salte con hasta 59 s de retraso justo cuando
 * alguien lo está mirando (es lo primero que mira un huésped al encender).
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer = 0
    const tick = () => {
      setNow(new Date())
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    }
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    return () => window.clearTimeout(timer)
  }, [])
  return now
}

/**
 * Hora y fecha en el idioma de la pantalla.
 *
 * Cifras latinas SIEMPRE (`-u-nu-latn`): en árabe `Intl` pinta por defecto
 * cifras arábigo-índicas, y entonces el reloj, el QR y el código de la puerta
 * llevarían dos juegos de números distintos en la misma pantalla. Y 24 horas:
 * es un reloj de pared, no un formulario.
 */
export function formatNow(lang: string, now: Date): { time: string; date: string } {
  const base = lang === 'es' ? 'es-ES' : lang
  const fmt = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(`${base}-u-nu-latn`, options).format(now)
    } catch {
      // Un idioma que el runtime de la TV no conoce no puede tumbar la pantalla.
      return new Intl.DateTimeFormat('es-ES', options).format(now)
    }
  }
  return {
    time: fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
    date: fmt({ day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

export type Mood = 'manana' | 'tarde' | 'atardecer' | 'noche'

/**
 * La luz del día, por franjas de reloj (propuesta del diseño):
 * mañana 07:00–12:00, tarde 12:00–19:30, atardecer 19:30–21:30, noche el resto.
 * Lo ideal sería la puesta de sol real por coordenadas del alojamiento, pero
 * `/guide/tv/config` no las manda; las franjas son un buen aproximado en la
 * costa española y no piden ningún dato nuevo.
 */
export function moodAt(now: Date): Mood {
  const m = now.getHours() * 60 + now.getMinutes()
  if (m >= 7 * 60 && m < 12 * 60) return 'manana'
  if (m >= 12 * 60 && m < 19 * 60 + 30) return 'tarde'
  if (m >= 19 * 60 + 30 && m < 21 * 60 + 30) return 'atardecer'
  return 'noche'
}
