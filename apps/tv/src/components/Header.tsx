import { useEffect, useState } from 'react'

/**
 * Cabecera persistente: marca del alojamiento a la izquierda, día y hora en
 * grande a la derecha.
 *
 * El reloj grande no es decoración: es lo que convierte la pantalla en un
 * "aparato" del alojamiento y no en una web abierta en la tele. Es también lo
 * primero que mira un huésped al encender.
 */

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    // Alineado al minuto: sin esto el reloj salta con hasta 20 s de retraso
    // justo cuando alguien lo está mirando.
    let timer: number
    const tick = () => {
      setNow(new Date())
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    }
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
    return () => window.clearTimeout(timer)
  }, [])
  return now
}

interface HeaderProps {
  brand: string
  property: string
  logoUrl?: string
  lang: string
  demoMode?: boolean
}

export function Header({ brand, property, logoUrl, lang, demoMode }: HeaderProps) {
  const now = useClock()
  const locale = lang === 'es' ? 'es-ES' : lang

  // `Intl` acepta cualquier código BCP-47; si el idioma del guidebook no lo es
  // (o el runtime de la TV no lo trae), se cae a es-ES en vez de reventar.
  const fmt = (options: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat(locale, options).format(now)
    } catch {
      return new Intl.DateTimeFormat('es-ES', options).format(now)
    }
  }

  const time = fmt({ hour: '2-digit', minute: '2-digit' })
  const weekday = fmt({ weekday: 'long' })
  const date = fmt({ day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <header className="flex items-start justify-between gap-8">
      <div className="flex min-w-0 items-center gap-4">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover"
            style={{ background: 'var(--tv-surface)' }}
          />
        ) : (
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
            style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.4" fill="currentColor" />
              <path d="M2 16c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2"
                stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              <path d="M2 20c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2"
                stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
        )}

        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-3">
            <h1 className="t-display truncate text-3xl font-bold" style={{ color: 'var(--tv-text)' }}>
              {brand}
            </h1>
            {demoMode && (
              <span
                className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ background: 'var(--color-terracotta)', color: '#fff' }}
              >
                Modo demo
              </span>
            )}
          </div>
          <p className="t-label mt-1 truncate" style={{ color: 'var(--tv-text-faint)' }}>
            {property}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right leading-none">
        <div className="tv-meta font-medium" style={{ color: 'var(--tv-text-dim)' }}>
          {date}
        </div>
        <div
          className="t-display mt-2 text-4xl font-bold capitalize"
          style={{ color: 'var(--tv-text)' }}
        >
          {weekday}
        </div>
        <div
          className="t-display mt-1 text-6xl font-bold tabular-nums"
          style={{ color: 'var(--tv-accent)' }}
        >
          {time}
        </div>
      </div>
    </header>
  )
}
