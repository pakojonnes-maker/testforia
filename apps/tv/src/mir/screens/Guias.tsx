import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Focusable, useFocus } from '../../lib/spatialNav'
import { getTvString } from '../../lib/i18n'
import { textBlocks } from '../../lib/text'
import { tileImage } from '../../lib/tileImages'
import type { GuidebookData } from '../../lib/api'
import { BackBar, Backdrop } from '../parts'
import { markPhotoBroken, preloadPhotos, usePhotoReady, usePhotosReady } from '../photos'
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
/** Lo que se repite de una página a la siguiente al pasarla con OK: dos líneas. */
const PAGE_OVERLAP = 102
/** Aire que se deja sobre una foto cuando una página empieza en ella. */
const FIGURE_GAP = 12

type HouseItem = GuidebookData['apartment']['info'][number]
const EMPTY_INLINE: NonNullable<HouseItem['inline_media']> = []

function photoOf(item: HouseItem): string | null {
  return item.media?.[0]?.url || item.category_image_url || null
}

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
  const blocks = useMemo(() => textBlocks(item?.content), [item?.content])

  // Foto propia del apartado o, si no hay, la de stock de su categoría. Que
  // exista la URL no significa que exista la foto (las de una demo dan 404), y
  // sin foto la hoja usa el ancho entero. El arco sólo se pinta cuando la foto ya
  // está descargada: reservarlo antes de saberlo lo hacía aparecer y desaparecer
  // en cada apartado sin foto al recorrer la lista. Por eso se piden todas al entrar.
  const photos = useMemo(
    () => list.flatMap(i => [photoOf(i), ...(i.inline_media ?? []).map(m => m.url)]),
    [list],
  )
  useEffect(() => { preloadPhotos(photos) }, [photos])
  const photo = item ? photoOf(item) : null
  const photoShown = usePhotoReady(photo)

  // Fotos intercaladas en el texto, con la misma regla que el arco: sólo las ya
  // descargadas. Las que apuntan más allá del último apartado (un idioma con menos
  // párrafos que el español) salen al final en vez de perderse.
  const inline = item?.inline_media ?? EMPTY_INLINE
  const inlineReady = usePhotosReady(inline.map(m => m.url))
  const figuresAfter = (n: number) => inline
    .filter((m, k) => inlineReady[k] === '1' && (m.after === n || (n >= blocks.length && m.after > n)))
    .map(m => (
      <figure key={m.id} className="gs-fig">
        <img src={m.url} alt="" decoding="sync" onLoad={measure} onError={() => markPhotoBroken(m.url)} />
      </figure>
    ))

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
  // Barra de avance: qué parte del texto se ve (`size`) y por dónde va (`at`), de 0 a 1.
  const [bar, setBar] = useState({ size: 1, at: 0 })
  const measure = useCallback(() => {
    const el = txt.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setOverflows(max > 4)
    setMore(el.scrollTop < max - 4)
    setBar({ size: el.clientHeight / el.scrollHeight, at: max > 0 ? Math.min(el.scrollTop / max, 1) : 0 })
  }, [])
  // Otro apartado u otro idioma: se lee desde arriba. Va aparte de medir: una foto
  // que termina de llegar a media lectura cambia el alto, pero no debe devolver al
  // huésped al principio.
  useEffect(() => {
    const el = txt.current
    if (el) el.scrollTop = 0
  }, [item?.id, lang])
  // `overflows` también: al aparecer el aviso de abajo el texto pierde alto y la
  // barra hay que volver a medirla.
  useEffect(() => { measure() }, [item?.id, lang, photoShown, overflows, inlineReady, measure])

  // OK pasa página: es lo que promete el aviso de la hoja. Deja dos líneas de la
  // anterior a la vista para no perder el hilo, y al acabar devuelve el foco a la
  // lista (ya no queda nada que leer aquí).
  const advance = useCallback(() => {
    const el = txt.current
    if (!el) return
    setFocused('guia-sheet')
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 4) {
      // Una foto que aún no se ha visto entera y que quedaría partida por el borde
      // de arriba de la página nueva pasa entera: la página empieza en ella. Caben
      // siempre (su alto máximo es menor que el de la hoja), así que cada pulsación
      // sigue avanzando. Una que ya se vio entera no frena la página.
      const seen = el.scrollTop + el.clientHeight
      let top = seen - PAGE_OVERLAP
      for (const fig of el.querySelectorAll<HTMLElement>('.gs-fig')) {
        const start = fig.offsetTop - FIGURE_GAP
        const end = fig.offsetTop + fig.offsetHeight
        if (end > seen && start < top && start > el.scrollTop) { top = start; break }
      }
      el.scrollTo({ top, behavior: 'smooth' })
    } else if (shownId) {
      el.scrollTo({ top: 0 })
      setFocused(`guia-${shownId}`)
    }
  }, [setFocused, shownId])

  // Con la hoja enfocada, arriba/abajo la desplazan. En los extremos se sueltan
  // (fase de captura, antes que el mando) para que el foco pueda salir de ella.
  // La flecha hacia la lista vuelve al apartado que se está leyendo: el vecino
  // geométrico de la hoja es el de mitad de lista, y cambiaba el texto a otro.
  useEffect(() => {
    if (focusedId !== 'guia-sheet') return undefined
    const onKey = (e: KeyboardEvent) => {
      const el = txt.current
      if (!el) return
      if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') && shownId) {
        e.preventDefault()
        e.stopPropagation()
        setFocused(`guia-${shownId}`)
        return
      }
      const down = e.key === 'ArrowDown' && el.scrollTop + el.clientHeight < el.scrollHeight - 4
      const up = e.key === 'ArrowUp' && el.scrollTop > 4
      if (!down && !up) return
      e.preventDefault()
      e.stopPropagation()
      el.scrollBy({ top: down ? SCROLL_STEP : -SCROLL_STEP, behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [focusedId, rtl, shownId, setFocused])

  const sheetBody = (
    <>
      <div className="gs-main">
        <div className="lbl">{eyebrow}</div>
        <h2 className="h2" style={{ marginTop: 16 }}>{item?.title}</h2>
        <div className="txt-w">
          <div ref={txt} className={`txt${more ? ' more' : ''}${bar.at > 0.01 ? ' above' : ''}`} onScroll={measure}>
            {blocks.map((lines, b) => (
              <Fragment key={b}>
                {lines.map((line, i) => <p key={i}>{line}</p>)}
                {figuresAfter(b + 1)}
              </Fragment>
            ))}
            {blocks.length === 0 && (inlineReady.includes('1')
              ? figuresAfter(0)
              : <p>{getTvString('info_no_content', lang)}</p>)}
          </div>
          {overflows && (
            <div className="gs-bar">
              <span style={{ height: `${bar.size * 100}%`, top: `${bar.at * (1 - bar.size) * 100}%` }} />
            </div>
          )}
        </div>
        {/* El hueco del aviso se queda aunque ya no haya más texto: si desapareciera,
            el texto ganaría alto justo al llegar al final y daría un salto. */}
        {overflows && (
          <p className="gs-more" style={more ? undefined : { visibility: 'hidden' }}>
            {getTvString('read_more_ok', lang)}
          </p>
        )}
      </div>
      {photo && photoShown && (
        <div className="parch">
          {/* Ya está descargada: se decodifica en el mismo fotograma para que el arco
              no salga un instante sin nada dentro. */}
          <img src={photo} alt="" className="ph" decoding="sync" onError={() => markPhotoBroken(photo)} />
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
              onSelect={() => { if (overflows) advance() }}
            >
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <span className="t">{it.title}</span>
            </Focusable>
          ))}
        </div>
      </div>

      {overflows ? (
        <Focusable id="guia-sheet" className="sheet gs" onSelect={advance}>{sheetBody}</Focusable>
      ) : (
        <article className="sheet gs">{sheetBody}</article>
      )}
    </>
  )
}
