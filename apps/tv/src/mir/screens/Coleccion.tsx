import { useEffect, useMemo, useRef } from 'react'
import { Focusable, useFocus } from '../../lib/spatialNav'
import { CoverImage } from '../../components/CoverImage'
import { categoryLabel } from '../../lib/categoryVisual'
import { getTvString } from '../../lib/i18n'
import { tileImage } from '../../lib/tileImages'
import type { GuidebookData } from '../../lib/api'
import type { Collection, Entry } from '../../lib/collections'
import { BackBar, Backdrop, NoPhoto } from '../parts'

/**
 * Sección (comer / hacer / tienda): título y filas de tarjetas en arco.
 *
 * Es el mismo componente para las tres. El rótulo va DEBAJO del arco, sobre la
 * pared, en tinta: una fila de tarjetas con el título encima de la foto obligaba
 * a un velo oscuro que se comía la mitad de cada plato. Lo que se ve de la fila
 * siguiente asoma por abajo, que es la señal de que hay más.
 */

interface Section {
  label: string
  entries: Entry[]
  /** La fila de «Destacados»: sus tarjetas no repiten el distintivo. */
  featured?: boolean
}

/**
 * «Destacados» primero y, debajo, una fila por categoría. Sin destacados y con
 * una sola categoría (comer: todo es 'restaurant') colapsa a una fila con el
 * rótulo de la sección, que es como se veía antes de que hubiera filas.
 */
function buildSections(entries: Entry[], railLabel: string, lang: string): Section[] {
  const featured = entries.filter(e => e.featured)
  const rest = entries.filter(e => !e.featured)

  const grouped = new Map<string, Entry[]>()
  for (const entry of rest) {
    const key = entry.category || '_'
    const group = grouped.get(key)
    if (group) group.push(entry)
    else grouped.set(key, [entry])
  }

  if (featured.length === 0 && grouped.size <= 1) return [{ label: railLabel, entries: rest }]

  const sections: Section[] = []
  if (featured.length > 0) sections.push({ label: getTvString('featured_row', lang), entries: featured, featured: true })
  for (const [key, group] of grouped) {
    // Todos los restaurantes son de la categoría 'restaurant', que no es una
    // categoría de guía (categoryLabel la sacaba tal cual, en inglés): el resto
    // de la fila se rotula con el de la sección, «Recomendado por tu anfitrión».
    const generic = key === '_' || key === 'restaurant'
    sections.push({ label: generic ? railLabel : categoryLabel(key, lang), entries: group })
  }
  return sections
}

interface ColeccionProps {
  data: GuidebookData
  collection: Collection
  lang: string
  rtl: boolean
  /** Id de foco (`entry-…`) de la tarjeta de la que se salió a una ficha; vacío al entrar por primera vez. */
  initialFocus?: string
  onBack: () => void
  onOpen: (entry: Entry) => void
}

export function Coleccion({ data, collection, lang, rtl, initialFocus, onBack, onOpen }: ColeccionProps) {
  const sections = useMemo(
    () => buildSections(collection.entries, collection.railLabel, lang),
    [collection.entries, collection.railLabel, lang]
  )
  // Un id que ya no existe (la guía cambió mientras se miraba la ficha) no debe dejar
  // el foco sin dueño: en ese caso vale la primera tarjeta, como al entrar.
  const restoreId = collection.entries.some(e => `entry-${e.id}` === initialFocus) ? initialFocus : undefined

  // La fila con el foco sube hasta quedar bajo el título. Con el desplazamiento
  // «lo justo» del navegador la fila de arriba se quedaba asomando cortada (sólo el
  // pie de sus tarjetas) y la de abajo pegada al borde de la pantalla.
  const { focusedId } = useFocus()
  const body = useRef<HTMLDivElement>(null)
  const sectionEls = useRef<Array<HTMLDivElement | null>>([])
  useEffect(() => {
    const scroller = body.current
    if (!scroller || !focusedId) return
    const si = sections.findIndex(s => s.entries.some(e => `entry-${e.id}` === focusedId))
    const target = si >= 0 ? sectionEls.current[si] : null
    if (target) scroller.scrollTo({ top: target.offsetTop, behavior: 'smooth' })
  }, [focusedId, sections])

  return (
    <>
      <Backdrop image={tileImage('background', data.tv?.tiles)} sun={[880, -120, 260]} rtl={rtl} />
      <BackBar lang={lang} onBack={onBack} />
      <h1 className="h1 abs" style={{ insetInlineStart: 72, top: 140 }}>{collection.title}</h1>

      {collection.entries.length === 0 ? (
        <div className="sheet empty">
          <p>{getTvString('collection_empty', lang)}</p>
        </div>
      ) : (
        <div ref={body} className="cbody">
          {sections.map((section, si) => (
            <div key={`${si}-${section.label}`} ref={el => { sectionEls.current[si] = el }} className="sect">
              <div className="lbl">{section.label}</div>
              {/* El carrusel recorta por los CUATRO lados (overflow-x fuerza overflow-y),
                  y el foco sobresale ~56 px de la tarjeta: de ahí el relleno con margen
                  negativo, que deja las tarjetas alineadas con su rótulo. */}
              <div className="rw">
                <div className="rail">
                  {section.entries.map((entry, i) => {
                    const badge = section.featured && entry.badge?.kind === 'featured' ? undefined : entry.badge
                    return (
                      <Focusable
                        key={entry.id}
                        id={`entry-${entry.id}`}
                        className={`card${badge?.kind === 'sold_out' ? ' off' : ''}`}
                        autoFocus={restoreId ? `entry-${entry.id}` === restoreId : si === 0 && i === 0}
                        onSelect={() => onOpen(entry)}
                      >
                        <div className="a">
                          <CoverImage src={entry.image} className="ph" fallback={<NoPhoto />} />
                          {badge && <span className="tag">{badge.label}</span>}
                        </div>
                        <div className="nm">{entry.name}</div>
                        {entry.subtitle && <div className="sb">{entry.subtitle}</div>}
                      </Focusable>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
