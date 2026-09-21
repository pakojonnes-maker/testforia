import { useEffect, useMemo, useState } from 'react'
import { wifiQrPayload } from '../../lib/mockData'
import { getTvString } from '../../lib/i18n'
import { DEFAULT_TILE_IMAGES, tileImage, type TileSlot } from '../../lib/tileImages'
import type { GuidebookData } from '../../lib/api'
import type { Collection, Entry } from '../../lib/collections'
import { formatNow, useNow } from '../clock'
import { Brand, QrBox, useUsableImage } from '../parts'

/**
 * Reposo: tras un rato sin tocar el mando la tele deja de ser un menú y pasa a ser
 * un cuadro. Rota cada 12 s entre la hora, el WiFi y una recomendación destacada
 * con su QR: lo que alguien mira de reojo desde el sofá mientras intenta
 * conectarse o decidir dónde cenar. Cualquier tecla lo quita (y esa pulsación no
 * activa nada: ver useIdle).
 *
 * Efecto secundario que interesa: una pantalla que se mueve poco a poco y cambia de
 * contenido no se quema, que en una tele que pasa semanas encendida importa.
 */

const ROTATE_MS = 12_000

type Card = 'hora' | 'wifi' | 'reco'

/** La recomendación con mejor pinta: un restaurante destacado con QR, o una experiencia destacada. */
function pickReco(collections: Collection[]): Entry | undefined {
  const withQr = (kind: Entry['kind']) =>
    collections.find(c => c.kind === kind)?.entries.find(e => e.featured && e.qr)
  return withQr('eat') ?? withQr('do')
}

export function Reposo({
  data, collections, lang,
}: {
  data: GuidebookData
  collections: Collection[]
  lang: string
}) {
  const now = useNow()
  const { time, date } = formatNow(lang, now)
  const tiles = data.tv?.tiles
  const wifi = data.apartment.wifi
  const reco = useMemo(() => pickReco(collections), [collections])

  const cards = useMemo<Card[]>(
    () => ['hora', ...(wifi.ssid ? (['wifi'] as Card[]) : []), ...(reco ? (['reco'] as Card[]) : [])],
    [wifi.ssid, reco]
  )
  const [i, setI] = useState(0)
  useEffect(() => {
    if (cards.length < 2) return undefined
    const timer = window.setInterval(() => setI(n => n + 1), ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [cards.length])
  const card = cards[i % cards.length]

  // Con la foto subida rota (R2 dando 404) vale la de serie: sin ella el reposo enseñaba de fondo, sin querer, el inicio.
  const slot: TileSlot = card === 'reco' ? 'eat' : 'do'
  const photo = useUsableImage(
    card === 'reco' && reco?.image ? reco.image : tileImage(slot, tiles),
    DEFAULT_TILE_IMAGES[slot]
  )

  return (
    <div className="rp">
      <img className="ph" src={photo} alt="" decoding="async" />
      <div className="v1" />

      <div className="rb">
        <Brand name={data.agency?.name || 'VisualTaste'} logoUrl={data.agency?.logo_url || undefined} />
      </div>

      {card === 'hora' && (
        <div key="hora" className="rt slide" style={{ top: 300 }}>
          <div className="rhi">{getTvString('welcome', lang)}</div>
          <div className="clkbig">{time}</div>
          <div className="dt">{date}</div>
        </div>
      )}

      {card === 'wifi' && (
        <div key="wifi" className="plaque slide">
          <div className="in">
            <QrBox
              size={380}
              data={wifiQrPayload({ ssid: wifi.ssid || '', password: wifi.password || '', security: wifi.security })}
            />
            <div className="pq-x">
              <div className="pq-t">{getTvString('wifi_title', lang)}</div>
              <div className="cred">
                <div><div className="l">{getTvString('wifi_network', lang)}</div><div className="v">{wifi.ssid}</div></div>
                <div><div className="l">{getTvString('wifi_key', lang)}</div><div className="v">{wifi.password || '—'}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {card === 'reco' && reco && reco.qr && (
        <>
          <div key="reco" className="rt slide" style={{ top: 220, width: 900 }}>
            <span className="pill a">{getTvString('featured_badge', lang)}</span>
            <div className="rname">{reco.name}</div>
            <div className="rsub">{reco.subtitle}</div>
          </div>
          <div className="qrp slide">
            <div className="in">
              <QrBox data={reco.qr.data} size={320} />
              <div className="cp">{reco.qr.caption}</div>
              {reco.sponsored && <div className="ad">{getTvString('sponsored', lang)}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
