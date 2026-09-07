import { useMemo } from 'react'
import { Focusable } from '../lib/spatialNav'
import { categoryVisual, categoryLabel } from '../lib/categoryVisual'
import type { Collection, Entry } from '../lib/collections'

/**
 * Pantalla de sección: portada editorial arriba, fila de tarjetas abajo.
 *
 * Es el mismo componente para comer, hacer y tienda. Antes cada uno tenía
 * su propia pantalla con su propio layout (carrusel en una, maestro-detalle en
 * otra), y esa inconsistencia es la que hacía que la app se sintiera improvisada:
 * el huésped tenía que reaprender la navegación en cada sección.
 */

function EntryCard({ entry, autoFocus, onSelect }: { entry: Entry; autoFocus?: boolean; onSelect: () => void }) {
  const visual = categoryVisual(entry.category, entry.subcategory)

  return (
    <Focusable id={`entry-${entry.id}`} autoFocus={autoFocus} onSelect={onSelect} className="arch-mask">
      {/* Tarjeta VERTICAL en arco: mismo recorte y proporción que las teselas
          de Guías Rápidas (InfoScreen) — arco de verdad sólo sale en un
          contenedor retrato, y "mucho más grande" que el rectángulo de 268px
          de antes. Sigue en fila horizontal (una por sección) porque aquí sí
          hay varias secciones que apilar, a diferencia de la rejilla única de
          Guías Rápidas. */}
      <div
        className="arch-mask relative h-[520px] w-[416px] shrink-0 overflow-hidden"
        style={{ background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}
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

        {/* El badge vive junto al título, no flotando arriba: en un arco (radio
            = mitad del ancho, ver .arch-mask) la esquina superior está
            recortada mucho más adentro que en un rectángulo normal, y un
            badge en top-left quedaba medio cortado por la propia curva. Aquí
            abajo el recorte no existe (las esquinas inferiores son rectas). */}
        <div className="absolute inset-x-0 bottom-0 p-5">
          {entry.badge && (
            <span
              className="mb-2 inline-block rounded-full px-3 py-1.5 text-[17px] font-bold uppercase tracking-[0.1em]"
              style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
            >
              {entry.badge}
            </span>
          )}
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
  onOpen: (entry: Entry) => void
}

export function CollectionScreen({ collection, onOpen }: CollectionScreenProps) {
  const { entries } = collection
  const sections = useMemo(
    () => buildSections(entries, collection.railLabel),
    [entries, collection.railLabel]
  )

  return (
    <div className="screen-in flex h-full flex-col">
      {/* Portada: sólo el título — el resto (antetítulo, zona/nº de fichas/año,
          descripción) era texto superfluo que no aportaba nada que las
          propias tarjetas no dijeran ya, igual que se simplificó Guías
          Rápidas. */}
      <div className="shrink-0 pb-6">
        <h2 className="t-display tv-hero font-bold" style={{ color: 'var(--tv-text)' }}>
          {collection.title}
        </h2>
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
