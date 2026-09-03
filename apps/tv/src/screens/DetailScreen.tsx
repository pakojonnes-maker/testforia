import { useEffect } from 'react'
import { Focusable } from '../lib/spatialNav'
import { BrandedQr } from '../components/BrandedQr'
import { categoryVisual } from '../lib/categoryVisual'
import { track } from '../lib/tracking'
import type { Entry } from '../lib/collections'

/**
 * Detalle a PÁGINA COMPLETA en lugar del diálogo centrado anterior.
 *
 * El diálogo obligaba a resumir: cabían un párrafo y poco más, y el QR competía
 * por el mismo espacio. A página completa entran la foto grande, el texto
 * entero y el QR con su explicación, que es justo la información por la que el
 * huésped ha entrado.
 */

interface DetailScreenProps {
  entry: Entry
  onBack: () => void
}

export function DetailScreen({ entry, onBack }: DetailScreenProps) {
  const visual = categoryVisual(entry.category, entry.subcategory)

  // Enseñar el QR es el evento que vale dinero: es la intención de ir al
  // restaurante o de reservar. Se emite una vez, al abrir la ficha.
  useEffect(() => {
    if (entry.qr) track(entry.qr.event, { screen: 'detail', targetId: entry.id })
  }, [entry.id, entry.qr])

  return (
    <div className="screen-in h-full">
      <div className="grid h-full gap-8" style={{ gridTemplateColumns: '0.85fr 1fr' }}>
        {/* Columna de imagen */}
        <div
          className="relative overflow-hidden"
          style={{ borderRadius: '1.5rem', background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}
        >
          {entry.image ? (
            <img src={entry.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div
              className="absolute inset-0 grid place-items-center"
              style={{ background: `linear-gradient(150deg, ${visual.from}, ${visual.to})` }}
            >
              <span className="text-[9rem]">{visual.emoji}</span>
            </div>
          )}

          {entry.badge && (
            <span
              className="absolute left-6 top-6 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.14em]"
              style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
            >
              {entry.badge}
            </span>
          )}
        </div>

        {/* Columna de contenido */}
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              <div className="t-label" style={{ color: 'var(--tv-accent)' }}>{entry.subtitle}</div>
              <h2 className="t-display mt-3 text-5xl font-bold" style={{ color: 'var(--tv-text)' }}>
                {entry.name}
              </h2>

              {entry.facts.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {entry.facts.map(fact => (
                    <span
                      key={fact.label}
                      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold capitalize"
                      style={{ background: 'var(--tv-surface-raised)', color: 'var(--tv-text-dim)' }}
                    >
                      <span aria-hidden="true">{fact.icon}</span>
                      {fact.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* QR arriba a la derecha: mismo sitio en todas las fichas, para
                que el huésped sepa dónde mirar sin leer. */}
            {entry.qr && (
              <div className="flex shrink-0 flex-col items-center">
                <div className="rounded-2xl bg-white p-3 shadow-xl">
                  <BrandedQr data={entry.qr.data} size={176} />
                </div>
                <p
                  className="mt-3 max-w-[190px] text-center text-sm font-semibold leading-snug"
                  style={{ color: 'var(--tv-text-dim)' }}
                >
                  {entry.qr.caption}
                </p>
              </div>
            )}
          </div>

          <div className="col-scroll mt-7 min-h-0 flex-1">
            {entry.description ? (
              <p className="max-w-[62ch] text-xl leading-relaxed" style={{ color: 'var(--tv-text-dim)' }}>
                {entry.description}
              </p>
            ) : (
              <p className="text-xl leading-relaxed" style={{ color: 'var(--tv-text-faint)' }}>
                Una recomendación de tu anfitrión para esta estancia.
              </p>
            )}

            {!entry.qr && (
              <div
                className="mt-6 rounded-2xl px-6 py-5 text-lg"
                style={{ background: 'var(--tv-surface)', color: 'var(--tv-text-dim)' }}
              >
                Pregunta a tu anfitrión para reservar o pedir indicaciones.
              </div>
            )}
          </div>

          <div className="shrink-0 pt-6">
            <Focusable id="detail-back" autoFocus onSelect={onBack}>
              <div
                className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-lg font-bold"
                style={{ background: 'var(--tv-surface-raised)', color: 'var(--tv-text)' }}
              >
                <span aria-hidden="true">←</span> Volver
              </div>
            </Focusable>
          </div>
        </div>
      </div>
    </div>
  )
}
