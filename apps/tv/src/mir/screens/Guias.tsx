import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Focusable, useFocus } from '../../lib/spatialNav'
import { CoverImage } from '../../components/CoverImage'
import { getTvString } from '../../lib/i18n'
import { tileImage } from '../../lib/tileImages'
import type { GuidebookData } from '../../lib/api'
import { BackBar, Backdrop } from '../parts'
import { doorItem, houseItems, valueSize } from '../stay'

/**
 * Guías rápidas: lista a la izquierda, hoja a la derecha, en UNA pantalla.
 *
 * La clásica era una rejilla de fotos y, al elegir una, otra pantalla con el
 * texto: dos pasos para leer «cómo se enciende el aire». Aquí la hoja enseña el
 * apartado que tiene el foco, así que recorrer la lista con el mando ES leer.
 * Muchos apartados no llevan foto (la de categoría es opcional), y una lista de
 * títulos aguanta eso mejor que una rejilla de arcos vacíos.
 *
 * El código de entrada, que tenía tesela propia, es una caja fija sobre la lista.
 */

/** Cuánto baja el texto de la hoja con cada pulsación de flecha. */
const SCROLL_STEP = 240

export function Guias({ data, lang, rtl, onBack }: { data: GuidebookData; lang: string; rtl: boolean; onBack: () => void }) {
  const door = doorItem(data)
  const list = useMemo(() => houseItems(data).filter(i => i !== door), [data, door])
  const { focusedId, setFocused } = useFocus()

  // Apartado que se lee: el enfocado; con el foco fuera de la lista (en «Volver»
  // o en la propia hoja) se queda el último, en vez de vaciar la hoja.
  const [shownId, setShownId] = useState<string | undefined>(list[0]?.id)
  useEffect(() => {
    const id = focusedId?.startsWith('guia-') && focusedId !== 'guia-sheet' ? focusedId.slice(5) : undefined
    if (id && list.some(i => i.id === id)) setShownId(id)
  }, [focusedId, list])
  const item = list.find(i => i.id === shownId) ?? list[0]

  const eyebrow = item && item.category_name && item.category_name !== item.title
    ? item.category_name
    : getTvString('house_info', lang)
  const lines = (item?.content || '').split('\n').map(l => l.trim()).filter(Boolean)

  // Foto propia del apartado o, si no hay, la de stock de su categoría. Que
  // exista la URL no significa que exista la foto (las de una demo dan 404):
  // quien lo sabe es CoverImage, y si no hay foto la hoja usa el ancho entero.
  const photo = item?.media?.[0]?.url || item?.category_image_url || null
  const [photoShown, setPhotoShown] = useState(true)
  useEffect(() => { setPhotoShown(true) }, [item?.id])
  const onPhoto = useCallback((unavailable: boolean) => setPhotoShown(!unavailable), [])

  // ¿Se sale el texto de la hoja? Sólo entonces la hoja se puede enfocar para
  // desplazarlo con las flechas; si cabe entero, enfocarla no serviría de nada.
  //
  // Son DOS cosas y no se pueden mezclar: `overflows` (el texto no cabe) decide si
  // la hoja es enfocable y NO depende del scroll; `more` (queda texto por debajo)
  // sí depende y sólo pinta el degradado. Con una sola bandera, al llegar al final
  // del texto la hoja dejaba de ser enfocable, React la remontaba, el scroll volvía
  // a 0 y el foco se perdía justo cuando el huésped acababa de leer.
  const txt = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [more, setMore] = useState(false)
  const measure = useCallback(() => {
    const el = txt.current
    if (!el) return
    setOverflows(el.scrollHeight > el.clientHeight + 4)
    setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }, [])
  useEffect(() => {
    const el = txt.current
    if (el) el.scrollTop = 0
    measure()
  }, [item?.id, lang, photoShown, measure])

  // Con la hoja enfocada, arriba/abajo la desplazan. En los extremos se sueltan
  // (fase de captura, antes que el mando) para que el foco pueda salir de ella.
  useEffect(() => {
    if (focusedId !== 'guia-sheet') return undefined
    const onKey = (e: KeyboardEvent) => {
      const el = txt.current
      if (!el) return
      const down = e.key === 'ArrowDown' && el.scrollTop + el.clientHeight < el.scrollHeight - 4
      const up = e.key === 'ArrowUp' && el.scrollTop > 4
      if (!down && !up) return
      e.preventDefault()
      e.stopPropagation()
      el.scrollBy({ top: down ? SCROLL_STEP : -SCROLL_STEP, behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [focusedId])

  const sheetBody = (
    <>
      <div className="gs-main">
        <div className="lbl">{eyebrow}</div>
        <h2 className="h2" style={{ marginTop: 16 }}>{item?.title}</h2>
        <div ref={txt} className={`txt${more ? ' more' : ''}`} onScroll={measure}>
          {lines.length > 0
            ? lines.map((line, i) => <p key={i}>{line}</p>)
            : <p>{getTvString('info_no_content', lang)}</p>}
        </div>
      </div>
      {photo && photoShown && (
        <div className="parch">
          <CoverImage src={photo} className="ph" onUnavailable={onPhoto} fallback={null} />
        </div>
      )}
    </>
  )

  return (
    <>
      <Backdrop image={tileImage('background', data.tv?.tiles)} sun={[880, -120, 260]} rtl={rtl} />
      <BackBar lang={lang} onBack={onBack} />
      <h1 className="h1 abs" style={{ insetInlineStart: 72, top: 140 }}>{getTvString('quick_guides', lang)}</h1>

      {door && (
        <div className="codebox abs" style={{ insetInlineStart: 72, top: 292, width: 660 }}>
          <span className="l">{door.title}</span>
          <span className={`v ${valueSize(door.content)}`}>{door.content}</span>
        </div>
      )}

      <div className="gl" style={{ top: door ? 440 : 292 }}>
        <div className="list">
          {list.map((it, i) => (
            <Focusable
              key={it.id}
              id={`guia-${it.id}`}
              className="li"
              autoFocus={i === 0}
              onSelect={() => { if (overflows) setFocused('guia-sheet') }}
            >
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="t">{it.title}</span>
            </Focusable>
          ))}
        </div>
      </div>

      {overflows ? (
        <Focusable id="guia-sheet" className="sheet gs">{sheetBody}</Focusable>
      ) : (
        <article className="sheet gs">{sheetBody}</article>
      )}
    </>
  )
}
