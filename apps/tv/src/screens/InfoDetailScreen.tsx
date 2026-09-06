import { Focusable } from '../lib/spatialNav'
import { infoIcon } from '../lib/infoIcon'
import type { GuidebookData } from '../lib/api'

type InfoItem = GuidebookData['apartment']['info'][number]

/**
 * Ficha completa de un apartado de "Información de la casa".
 *
 * Misma idea que DetailScreen (foto grande + texto entero en vez del resumen
 * que cabía en la tesela), pero para contenido de la casa en vez de una
 * recomendación externa: sin QR ni distancia — aquí no hay a dónde ir, sólo
 * algo que leer entero.
 */

/** A diferencia de la tesela (recortado a unas pocas líneas), aquí se ve todo. */
function ContentLines({ content }: { content: string }) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  return (
    <div className="flex flex-col gap-3">
      {lines.map((line, i) => (
        <p key={i} className="tv-body leading-relaxed" style={{ color: 'var(--tv-text-dim)' }}>
          {line}
        </p>
      ))}
    </div>
  )
}

interface InfoDetailScreenProps {
  item: InfoItem
  onBack: () => void
}

export function InfoDetailScreen({ item, onBack }: InfoDetailScreenProps) {
  // Fotos propias del apartado primero, y sólo si no hay ninguna cae a la de
  // stock de su categoría — la de stock es compartida, no tiene sentido
  // enseñarla como "galería" de este apartamento en concreto.
  const ownPhotos = (item.media || []).map(m => m.url).filter(Boolean)
  const hero = ownPhotos[0] || item.category_image_url || null
  const gallery = ownPhotos.slice(1)
  const iconBackground = item.color
    ? `linear-gradient(150deg, ${item.color}, ${item.color}bb)`
    : 'linear-gradient(150deg, var(--tv-accent), var(--tv-secondary))'
  const eyebrow = item.category_name && item.category_name !== item.title
    ? item.category_name
    : 'Información de la casa'

  return (
    <div className="screen-in h-full">
      <div className="grid h-full gap-8" style={{ gridTemplateColumns: '0.85fr 1fr' }}>
        {/* Columna de imagen: foto grande y, si hay más, una galería debajo —
            igual que la ficha de una recomendación. */}
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div
            className="relative min-h-0 flex-1 overflow-hidden"
            style={{ borderRadius: '1.5rem', background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}
          >
            {hero ? (
              <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center" style={{ background: iconBackground }}>
                <span className="text-[9rem]">{infoIcon(item.icon, item.key)}</span>
              </div>
            )}
          </div>

          {gallery.length > 0 && (
            <div
              className="grid shrink-0 gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(gallery.length, 4)}, 1fr)`, height: '124px' }}
            >
              {gallery.slice(0, 4).map(url => (
                <div key={url} className="overflow-hidden" style={{ borderRadius: '1rem', border: '1px solid var(--tv-line)' }}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna de contenido */}
        <div className="flex min-w-0 flex-col">
          <div className="t-label" style={{ color: 'var(--tv-accent)' }}>{eyebrow}</div>
          <h2 className="t-display mt-3 tv-title font-bold" style={{ color: 'var(--tv-text)' }}>
            {item.title}
          </h2>

          <div className="col-scroll mt-7 min-h-0 flex-1">
            {item.content ? (
              <ContentLines content={item.content} />
            ) : (
              <p className="tv-body" style={{ color: 'var(--tv-text-faint)' }}>
                Tu anfitrión aún no ha añadido detalles para este apartado.
              </p>
            )}
          </div>

          <div className="shrink-0 pt-6">
            <Focusable id="info-detail-back" autoFocus onSelect={onBack} className="rounded-full">
              <div
                className="inline-flex items-center gap-3 rounded-full px-9 py-4 tv-body font-bold"
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
