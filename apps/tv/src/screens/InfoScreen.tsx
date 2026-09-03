import { Focusable } from '../lib/spatialNav'
import { infoIcon, isDoorCode } from '../lib/infoIcon'
import type { GuidebookData } from '../lib/api'

type InfoItem = GuidebookData['apartment']['info'][number]

/**
 * Información de la casa: rejilla, no carrusel.
 *
 * Un alojamiento tiene diez o quince apartados (basura, aire, parking, normas…)
 * y en una fila horizontal el huésped no sabe cuántos hay ni encuentra el que
 * busca. En rejilla los ve todos y va directo con el mando.
 */

/**
 * El contenido llega con saltos de línea reales (una norma por línea). Un <p>
 * los colapsa en espacios y todo se lee como una frase corrida — que es como se
 * veía antes en la tele: un ladrillo de texto ilegible.
 */
function ContentLines({ content, max = 5 }: { content: string; max?: number }) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const shown = lines.slice(0, max)
  const hidden = lines.length - shown.length

  return (
    <div className="flex flex-col gap-1.5">
      {shown.map((line, i) => (
        <p key={i} className="clamp-3 text-base leading-snug" style={{ color: 'var(--tv-text-dim)' }}>
          {line}
        </p>
      ))}
      {hidden > 0 && (
        <p className="text-sm font-semibold" style={{ color: 'var(--tv-accent)' }}>
          +{hidden} {hidden === 1 ? 'punto más' : 'puntos más'}
        </p>
      )}
    </div>
  )
}

function InfoCard({ item, autoFocus }: { item: InfoItem; autoFocus?: boolean }) {
  // El catálogo de categorías (migración 0083) da color a cada apartado; las
  // filas antiguas sin category_key caen al acento de la marca.
  const iconBackground = item.color
    ? `linear-gradient(140deg, ${item.color}, ${item.color}bb)`
    : 'var(--tv-accent)'

  return (
    <Focusable id={`info-${item.id}`} autoFocus={autoFocus}>
      <div
        className="flex h-full flex-col gap-4 p-6"
        style={{ borderRadius: '1.25rem', background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl"
            style={{ background: iconBackground }}
          >
            {infoIcon(item.icon, item.key)}
          </div>
          <h3 className="t-display clamp-2 text-2xl font-bold leading-tight" style={{ color: 'var(--tv-text)' }}>
            {item.title}
          </h3>
        </div>
        <ContentLines content={item.content} />
      </div>
    </Focusable>
  )
}

export function InfoScreen({ data }: { data: GuidebookData }) {
  const items = data.apartment.info.filter(i => i.key.toLowerCase() !== 'wifi')
  const door = items.find(i => isDoorCode(i.key))
  const rest = items.filter(i => i !== door)

  return (
    <div className="screen-in flex h-full flex-col">
      <div className="shrink-0 pb-6">
        <div className="t-label" style={{ color: 'var(--tv-accent)' }}>{data.apartment.name}</div>
        <h2 className="t-display mt-3 text-6xl font-bold" style={{ color: 'var(--tv-text)' }}>
          Información de la casa
        </h2>
        <p className="mt-3 max-w-[68ch] text-lg leading-relaxed" style={{ color: 'var(--tv-text-dim)' }}>
          Todo lo práctico de tu estancia, en un sitio. Muévete con las flechas del mando.
        </p>
      </div>

      <div className="col-scroll min-h-0 flex-1 pr-1">
        <div className="grid grid-cols-4 gap-4 pb-2 pt-1">
          {door && (
            <Focusable id={`info-${door.id}`} autoFocus>
              <div
                className="flex h-full flex-col justify-between p-6"
                style={{
                  borderRadius: '1.25rem',
                  background: 'linear-gradient(150deg, var(--color-terracotta), var(--color-ink))',
                }}
              >
                <div className="t-label" style={{ color: 'rgba(255,255,255,0.85)' }}>{door.title}</div>
                <div
                  className="t-display text-5xl font-bold tabular-nums"
                  style={{ color: '#fff', letterSpacing: '0.12em' }}
                >
                  {door.content}
                </div>
              </div>
            </Focusable>
          )}

          {rest.map((item, i) => (
            <InfoCard key={item.id} item={item} autoFocus={!door && i === 0} />
          ))}
        </div>
      </div>
    </div>
  )
}
