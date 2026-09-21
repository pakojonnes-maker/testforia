import { useEffect, useRef, useState } from 'react'

/** Segundos sin tocar el mando antes de pasar al reposo. `?reposo=<s>` lo cambia; 0 lo apaga. */
export const IDLE_DEFAULT_S = 90

export function idleMsFromUrl(search: string): number {
  const raw = new URLSearchParams(search).get('reposo')
  const seconds = raw === null || raw.trim() === '' || Number.isNaN(Number(raw)) ? IDLE_DEFAULT_S : Number(raw)
  return Math.max(0, seconds) * 1000
}

/**
 * ¿Lleva `ms` sin actividad? Con 0 nunca se pone en reposo.
 *
 * La pulsación que DESPIERTA la pantalla se traga en fase de captura: si no,
 * además de despertarla activaría lo que hubiera enfocado debajo (un OK sobre
 * «Tienda» abriría la tienda a alguien que sólo quería ver la tele encenderse).
 */
export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false)
  const idleRef = useRef(false)

  useEffect(() => {
    if (ms <= 0) return undefined
    let timer = 0
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => { idleRef.current = true; setIdle(true) }, ms)
    }
    const wake = () => {
      if (idleRef.current) { idleRef.current = false; setIdle(false) }
      arm()
    }
    const onKey = (e: KeyboardEvent) => {
      if (idleRef.current) { e.preventDefault(); e.stopPropagation() }
      wake()
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', wake, true)
    window.addEventListener('mousemove', wake, true)
    arm()
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', wake, true)
      window.removeEventListener('mousemove', wake, true)
    }
  }, [ms])

  return idle
}
