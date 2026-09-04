import { useEffect, useMemo } from 'react'
import { Focusable, useFocus } from '../lib/spatialNav'
import { categoryVisual, categoryLabel } from '../lib/categoryVisual'
import { track } from '../lib/tracking'
import type { Collection, Entry } from '../lib/collections'

/**
 * Pantalla de sección: portada editorial arriba, fila de tarjetas abajo.
 *
 * Es el mismo componente para comer, hacer y alrededores. Antes cada uno tenía
 * su propia pantalla con su propio layout (carrusel en una, maestro-detalle en
 * otra), y esa inconsistencia es la que hacía que la app se sintiera improvisada:
 * el huésped tenía que reaprender la navegación en cada sección.
 */

/** Línea de metadatos con separadores: da sensación de catálogo curado. */
function MetaLine({ parts }: { parts: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 tv-meta" style={{ color: 'var(--tv-text-dim)' }}>
      {parts.map((part, i) => (
        <span key={part} className="flex items-center gap-3">
          {i > 0 && <span style={{ color: 'var(--tv-text-faint)' }}>|</span>}
          <span>{part}</span>
        </span>
      ))}
    </div>
  )
}

function EntryCard({ entry, autoFocus, onSelect }: { entry: Entry; autoFocus?: boolean; onSelect: () => void }) {
  const visual = categoryVisual(entry.category, entry.subcategory)

  return (
    <Focusable id={`entry-${entry.id}`} autoFocus={autoFocus} onSelect={onSelect}>
      {/* Tarjeta VERTICAL: en una fila horizontal caben más y la foto manda,
          que es lo que hace que se escanee de un vistazo desde el sofá. */}
      <div
        className="relative h-[360px] w-[268px] shrink-0 overflow-hidden"
        style={{ borderRadius: '1.25rem', background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}
      >
        {entry.image ? (
          <img src={entry.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ background: `linear-gradient(150deg, ${visual.from}, ${visual.to})` }}
          >
            <span className="text-7xl">{visual.emoji}</span>
          </div>
        )}

        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(0deg, rgba(4,16,22,0.94) 4%, rgba(4,16,22,0.45) 42%, rgba(4,16,22,0) 72%)' }}
        />

        {entry.badge && (
          <span
            className="absolute left-4 top-4 rounded-full px-3 py-1.5 text-[17px] font-bold uppercase tracking-[0.1em]"
            style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
          >
            {entry.badge}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="t-display clamp-2 tv-card font-bold leading-tight" style={{ color: '#fff' }}>
            {entry.name}
          </div>
          {entry.subtitle && (
            <div className="mt-2 truncate tv-meta font-semibold" style={{ color: 'rgba(255,255,255,0.74)' }}>
              {entry.subtitle}
            </div>
          )}
        </div>
      </div>
    </Focusable>
  )
}

interface Section {
  label: string
  entries: Entry[]
}

/**
 * "Destacados" (is_featured) primero, luego una fila por categoría — como
 * VISTO agrupa "Host Suggestions" y debajo el resto por temática (ver foto de
 * referencia). Sin destacados y con una sola categoría (p.ej. "eat", donde
 * todo es 'restaurant') colapsa a una fila con `railLabel`: el mismo aspecto
 * que tenía la pantalla antes de que existieran las secciones.
 */
function buildSections(entries: Entry[], railLabel: string): Section[] {
  const featured = entries.filter(e => e.featured)
  const rest = entries.filter(e => !e.featured)

  const grouped = new Map<string, Entry[]>()
  for (const entry of rest) {
    const key = entry.category || '_'
    const group = grouped.get(key)
    if (group) group.push(entry)
    else grouped.set(key, [entry])
  }

  if (featured.length === 0 && grouped.size <= 1) {
    return [{ label: railLabel, entries: rest }]
  }

  const sections: Section[] = []
  if (featured.length > 0) sections.push({ label: 'Destacados', entries: featured })
  for (const [key, group] of grouped) {
    sections.push({ label: key === '_' ? railLabel : categoryLabel(key), entries: group })
  }
  return sections
}

interface CollectionScreenProps {
  collection: Collection
  zoneName: string
  onOpen: (entry: Entry) => void
}

export function CollectionScreen({ collection, zoneName, onOpen }: CollectionScreenProps) {
  const { focusedId } = useFocus()
  const { entries } = collection
  const sections = useMemo(
    () => buildSections(entries, collection.railLabel),
    [entries, collection.railLabel]
  )

  /**
   * `poi_select` sigue midiendo qué lugar mira el huésped: en alrededores el
   * foco ES la selección, porque no hace falta abrir el detalle para leer la
   * tarjeta. `targetId` dice cuál, que es lo que hace útil el KPI.
   */
  useEffect(() => {
    if (collection.kind !== 'nearby') return
    if (focusedId?.startsWith('entry-')) {
      track('poi_select', { screen: 'nearby', targetId: focusedId.slice('entry-'.length) })
    }
  }, [focusedId, collection.kind])

  return (
    <div className="screen-in flex h-full flex-col">
      {/* Portada editorial */}
      <div className="shrink-0 pb-2">
        <div className="t-label" style={{ color: 'var(--tv-accent)' }}>{collection.eyebrow}</div>
        <h2 className="t-display mt-3 tv-hero font-bold" style={{ color: 'var(--tv-text)' }}>
          {collection.title}
        </h2>
        <MetaLine
          parts={[
            zoneName,
            `${entries.length} ${entries.length === 1 ? 'ficha' : 'fichas'}`,
            String(new Date().getFullYear()),
          ]}
        />
        <p className="clamp-2 mt-4 max-w-[54ch] tv-body" style={{ color: 'var(--tv-text-dim)' }}>
          {collection.intro}
        </p>
      </div>

      {/* Secciones: Destacados arriba y, debajo, una fila por categoría — todas
          apiladas con scroll vertical en vez de una fila horizontal única, para
          que quepan todas las recomendaciones y no sólo las primeras. */}
      {entries.length === 0 ? (
        <div
          className="mt-6 grid flex-1 place-items-center rounded-3xl tv-body"
          style={{ background: 'var(--tv-surface)', color: 'var(--tv-text-dim)' }}
        >
          Tu anfitrión aún no ha añadido recomendaciones en esta sección.
        </div>
      ) : (
        <div className="col-scroll mt-6 min-h-0 flex-1 pr-1">
          {sections.map((section, si) => (
            <div key={section.label} className="pb-6">
              <div className="t-label shrink-0 pb-4" style={{ color: 'var(--tv-text-faint)' }}>
                {section.label}
              </div>
              {/* pt/pb dan aire al anillo de foco: sin ellos se recorta contra
                  los bordes del carrusel al escalar la tarjeta. */}
              <div className="rail flex items-center gap-5 px-1 pb-4 pt-2">
                {section.entries.map((entry, i) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    autoFocus={si === 0 && i === 0}
                    onSelect={() => onOpen(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
