import { useEffect, useState } from 'react'
import { CoverImage } from './CoverImage'

/**
 * Cabecera persistente: 3 secciones — marca del alojamiento, fecha y hora —
 * repartidas en una rejilla de 3 columnas para que la fecha quede centrada de
 * verdad (no "lo que sobre" entre marca y hora, que es lo que da un flex
 * justify-between con anchos desiguales a cada lado).
 *
 * Sin tarjeta ni fondo propio a propósito: el texto vive directamente sobre
 * MediterraneanBackground, como una sobreimpresión, no como un panel flotante
 * encima de la escena. De ahí la clase `tv-overprint` (index.css) y de ahí que
 * el alojamiento y la fecha vayan a tinta PLENA en vez de a los tonos apagados
 * --tv-text-dim/faint: esas transparencias están calibradas contra un lienzo
 * oscuro, y desde que el fondo es una foto de la casa —que suele ser clara— un
 * blanco al 45 % no lo rescata ninguna sombra. La jerarquía la marcan aquí el
 * tamaño y la caja alta, que a 3 m se leen antes que un cambio de tono.
 *
 * El reloj grande no es decoración: es lo que convierte la pantalla en un
 * "aparato" del alojamiento y no en una web abierta en la tele. Es también lo
 * primero que mira un huésped al encender. Ya no lleva el día de la semana
 * debajo — con fecha y hora como secciones propias, repetir el día ahí sólo
 * añadía peso visual sin decir nada que la fecha no dijera ya.
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
  const date = fmt({ day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <header className="grid items-center gap-8" style={{ gridTemplateColumns: 'minmax(0,1.3fr) auto minmax(0,0.85fr)' }}>
      {/* Logo / marca */}
      <div className="flex min-w-0 items-center gap-5">
        <CoverImage
          src={logoUrl}
          className="h-20 w-20 shrink-0 rounded-2xl object-cover"
          fallback={
            <div
              className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl"
              style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
            >
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.4" fill="currentColor" />
                <path d="M2 16c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2"
                  stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                <path d="M2 20c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.6" />
              </svg>
            </div>
          }
        />

        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-3">
            <h1 className="t-display tv-overprint truncate tv-title font-bold" style={{ color: 'var(--tv-ink)' }}>
              {brand}
            </h1>
            {/* Este aviso es lo único que distingue "la TV funciona" de "la TV
                enseña un apartamento inventado, con su WiFi falso". Iba a 11 px
                —5,5 sp— o sea el texto MÁS PEQUEÑO de toda la pantalla, para el
                mensaje más importante que puede dar. Quien lo tiene que leer es
                el instalador, de pie delante de la tele, y a esa distancia
                sencillamente no existía. */}
            {demoMode && (
              <span
                className="shrink-0 rounded-full px-5 py-2 tv-meta font-bold uppercase tracking-[0.12em]"
                style={{ background: 'var(--color-terracotta)', color: '#fff' }}
              >
                Datos de ejemplo
              </span>
            )}
          </div>
          <p className="tv-meta tv-overprint mt-1 truncate font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--tv-ink-faint)' }}>
            {property}
          </p>
        </div>
      </div>

      {/* Fecha */}
      <div className="shrink-0 self-center text-center leading-none">
        <div className="t-display tv-overprint tv-lead font-bold whitespace-nowrap" style={{ color: 'var(--tv-ink-dim)' }}>
          {date}
        </div>
      </div>

      {/* Hora */}
      <div className="shrink-0 justify-self-end text-right leading-none">
        <div
          className="t-display tv-overprint tv-hero font-bold tabular-nums"
          style={{ color: 'var(--tv-accent)' }}
        >
          {time}
        </div>
      </div>
    </header>
  )
}
