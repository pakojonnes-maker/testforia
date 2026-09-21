import { useEffect, useRef } from 'react'
import { Focusable, useFocus } from '../../lib/spatialNav'
import { wifiQrPayload } from '../../lib/mockData'
import { languageOption } from '../../lib/languages'
import { getTvString } from '../../lib/i18n'
import { DEFAULT_TILE_IMAGES, tileImage, type TileSlot } from '../../lib/tileImages'
import { track } from '../../lib/tracking'
import type { GuidebookData } from '../../lib/api'
import type { Collection, CollectionKind } from '../../lib/collections'
import { Backdrop, Brand, Clock, QrBox } from '../parts'
import { credSize, doorItem, stayTime, valueSize } from '../stay'
import type { MirRoute } from '../route'

/**
 * Inicio «Mirador»: un muro encalado con un gran arco abierto a la costa.
 *
 * A la izquierda, el saludo, un índice tipográfico numerado y el WiFi como placa
 * con QR SIEMPRE visible; sobre el arco, una repisa con el código de la puerta y
 * la hora de salida. La foto del arco cambia con el foco del mando (dos capas,
 * fundido de 900 ms): el índice es de texto, pero el huésped ve adónde va.
 *
 * El foco recorre UNA columna vertical (idioma ↕ filas ↕ placa): no hay que
 * cruzar la pantalla con las flechas. El arco no se enfoca.
 */

interface Chapter {
  id: string
  n: string
  slot: TileSlot
  /** Encuadre de la foto de SERIE en el arco (retrato sobre una foto apaisada). */
  pos: string
  route: MirRoute
  kind?: CollectionKind
}

const CHAPTERS: Chapter[] = [
  { id: 'row-info', n: '01', slot: 'info', pos: '16% 50%', route: { name: 'info' } },
  { id: 'row-eat', n: '02', slot: 'eat', pos: '30% 50%', route: { name: 'collection', kind: 'eat' }, kind: 'eat' },
  { id: 'row-do', n: '03', slot: 'do', pos: '64% 50%', route: { name: 'collection', kind: 'do' }, kind: 'do' },
  { id: 'row-store', n: '04', slot: 'store', pos: '58% 50%', route: { name: 'collection', kind: 'store' }, kind: 'store' },
]

/** Foco inicial: «Qué hacer», la cala, que es la foto que más luce. */
export const HOME_DEFAULT_FOCUS = 'row-do'

interface InicioProps {
  data: GuidebookData
  collections: Collection[]
  lang: string
  rtl: boolean
  demoMode: boolean
  /** Fila con la que arranca el foco: la de la que se volvió, o la de siempre. */
  initialFocus: string
  onNavigate: (route: MirRoute, fromFocusId?: string) => void
}

export function Inicio({ data, collections, lang, rtl, demoMode, initialFocus, onNavigate }: InicioProps) {
  const { focusedId } = useFocus()
  const wifiRevealed = useRef(false)
  const tiles = data.tv?.tiles

  const door = doorItem(data)
  const checkout = stayTime(data.apartment.checkout_time, data.apartment.info.find(i => i.key === 'checkout')?.content)
  const wifi = data.apartment.wifi
  const hasWifi = Boolean(wifi.ssid)

  /**
   * `wifi_reveal` sigue significando «el huésped fue a por el WiFi», pero el QR
   * está a la vista en el inicio: contarlo sólo al abrir la pantalla de WiFi
   * hundiría el KPI a cero. Se cuenta al posarse el foco en la placa, un acto
   * deliberado, y una vez por visita al inicio.
   */
  useEffect(() => {
    if (focusedId === 'plaque' && !wifiRevealed.current) {
      wifiRevealed.current = true
      track('wifi_reveal', { screen: 'home' })
    }
  }, [focusedId])

  const label = (c: Chapter): string => {
    if (!c.kind) return getTvString('quick_guides', lang)
    const found = collections.find(x => x.kind === c.kind)
    const fallback = c.kind === 'eat' ? 'where_to_eat' : c.kind === 'do' ? 'things_to_do' : 'store_title'
    return found?.tile || getTvString(fallback, lang)
  }

  // Foto del arco: la del capítulo enfocado; con el foco en el idioma o en la
  // placa se queda la de «Qué hacer» (la portada).
  const active = CHAPTERS.some(c => c.id === focusedId) ? focusedId : HOME_DEFAULT_FOCUS

  const language = languageOption(lang)
  const hi = getTvString('welcome', lang)
  const zone = [data.zone?.name, data.zone?.region].filter(Boolean).join(' · ')

  return (
    <>
      <Backdrop image={tileImage('background', tiles)} sun={[1590, -40, 330]} rtl={rtl} />
      <div className="arch-ring" />
      <div className="arch">
        {CHAPTERS.map(c => {
          const src = tileImage(c.slot, tiles)
          // El encuadre está compuesto para las fotos de serie; una foto subida
          // por el anfitrión se centra, que es lo único que se puede asumir.
          const pos = src === DEFAULT_TILE_IMAGES[c.slot] ? c.pos : '50% 50%'
          return (
            <div key={c.id} className={`l${active === c.id ? ' on' : ''}`}>
              <img className="ph" src={src} alt="" decoding="async" style={{ objectPosition: pos }} />
            </div>
          )
        })}
        <div className="grade" />
        <div className="shade" />
      </div>

      {demoMode && <div className="demo">{getTvString('demo_data', lang)}</div>}

      {(door || checkout) && (
        <div className="sill">
          {door && (
            <div className="chip">
              <span className="l">{door.title}</span>
              <span className={`v ${valueSize(door.content)}`}>{door.content}</span>
            </div>
          )}
          {checkout && (
            <div className="chip">
              <span className="l">{getTvString('checkout', lang)}</span>
              <span className="v">{checkout}</span>
            </div>
          )}
        </div>
      )}

      <div className="col">
        <div className="top">
          <Brand name={data.agency?.name || 'VisualTaste'} logoUrl={data.agency?.logo_url || undefined} />
          <Clock lang={lang} />
        </div>

        <div className="hero">
          <div className="hi">{hi}</div>
          <div className={`nm${data.apartment.name.length > 22 ? ' l' : ''}`}>{data.apartment.name}</div>
          {zone && <div className="zn">{zone}</div>}
        </div>

        <nav className="idx">
          {CHAPTERS.map(c => (
            <Focusable
              key={c.id}
              id={c.id}
              className="row"
              autoFocus={initialFocus === c.id}
              onSelect={() => onNavigate(c.route, c.id)}
            >
              <span className="n">{c.n}</span>
              <span className="t">{label(c)}</span>
            </Focusable>
          ))}
          <Focusable
            id="row-lang"
            className="row"
            autoFocus={initialFocus === 'row-lang'}
            onSelect={() => onNavigate({ name: 'language' }, 'row-lang')}
          >
            <span className="n">05</span>
            <span className="t">{getTvString('language', lang)}</span>
            <span className="v">{language.native}</span>
          </Focusable>
        </nav>

        <Focusable
          id="plaque"
          className="plaque"
          autoFocus={initialFocus === 'plaque'}
          onSelect={() => onNavigate({ name: 'wifi' }, 'plaque')}
        >
          <div className="in">
            {hasWifi ? (
              <>
                <QrBox
                  size={208}
                  data={wifiQrPayload({ ssid: wifi.ssid || '', password: wifi.password || '', security: wifi.security })}
                />
                <div className="pq-x">
                  <div className="pq-t">{getTvString('wifi_title', lang)}</div>
                  <div className="cred">
                    <div>
                      <div className="l">{getTvString('wifi_network', lang)}</div>
                      <div className={`v ${credSize(wifi.ssid || '')}`}>{wifi.ssid}</div>
                    </div>
                    <div>
                      <div className="l">{getTvString('wifi_key', lang)}</div>
                      <div className={`v ${credSize(wifi.password || '')}`}>{wifi.password || '—'}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="pq-x">
                <div className="pq-t">{getTvString('wifi_title', lang)}</div>
                <p className="pq-h">{getTvString('wifi_ask_host', lang)}</p>
              </div>
            )}
          </div>
        </Focusable>
      </div>
    </>
  )
}
