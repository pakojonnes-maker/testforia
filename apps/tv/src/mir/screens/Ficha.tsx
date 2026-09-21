import { useCallback, useEffect, useMemo, useState } from 'react'
import { Focusable, useFocus } from '../../lib/spatialNav'
import { CoverImage } from '../../components/CoverImage'
import { submitStoreOrder, type GuidebookData } from '../../lib/api'
import { getTvString } from '../../lib/i18n'
import { track } from '../../lib/tracking'
import { tileImage } from '../../lib/tileImages'
import type { Entry } from '../../lib/collections'
import { BackBar, Backdrop, NoPhoto, QrBox } from '../parts'

/**
 * Ficha de una recomendación (restaurante, experiencia o producto): foto en arco
 * a la izquierda; a la derecha el nombre, los datos y el QR que lleva la acción
 * al móvil. Un restaurante lleva a su carta; una experiencia, a WhatsApp o a una
 * web; un producto de la tienda, a un pedido por WhatsApp.
 *
 * La foto es un arco a página completa, no una portada recortada con una tira de
 * miniaturas debajo: si la ficha tiene más fotos REALES (portada + galería) se
 * suceden dentro del mismo arco. Ninguna foto que tengamos se descarta.
 */

/** Segundos entre foto y foto del arco. */
const SLIDE_MS = 6000

/**
 * El modo de transporte es lo único de la ficha que llevaba información en un
 * emoji («🚶 15 min» y «🚗 15 min» dicen cosas distintas). Con palabras se
 * entiende sin depender de que el aparato pinte el emoji.
 */
function travelModeLabel(mode: Entry['travelMode'], lang: string): string {
  return getTvString(mode === 'walk' ? 'travel_walk' : mode === 'bike' ? 'travel_bike' : 'travel_drive', lang)
}

type OrderState = 'idle' | 'loading' | 'ready' | 'no_contact' | 'error'

interface FichaProps {
  data: GuidebookData
  entry: Entry
  lang: string
  rtl: boolean
  onBack: () => void
}

export function Ficha({ data, entry, lang, rtl, onBack }: FichaProps) {
  const { setFocused } = useFocus()
  const apartmentId = data.apartment.id
  const isStore = entry.kind === 'store'
  const canOrder = isStore && entry.inStock !== false

  // ---- fotos ----
  const photos = useMemo(
    () => [entry.image, ...entry.gallery].filter((u): u is string => Boolean(u)),
    [entry.image, entry.gallery]
  )
  const [slide, setSlide] = useState(0)
  useEffect(() => { setSlide(0) }, [entry.id])
  useEffect(() => {
    if (photos.length < 2) return undefined
    const timer = window.setInterval(() => setSlide(s => (s + 1) % photos.length), SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [photos.length, entry.id])

  // Enseñar el QR es el evento que vale dinero (la intención de ir o de reservar).
  useEffect(() => {
    if (entry.qr) track(entry.qr.event, { screen: 'detail', targetId: entry.id })
  }, [entry.id, entry.qr])

  // ---- pedido de la tienda ----
  // El número de WhatsApp de un producto NO viene en la guía: lo resuelve el
  // worker al crear el pedido (que además queda registrado en D1). Por eso hace
  // falta un paso explícito y no se pinta un QR al abrir la ficha: así el pedido
  // sólo existe cuando el huésped de verdad quiere pedir, no por cada producto
  // que alguien mira de pasada.
  const [order, setOrder] = useState<OrderState>('idle')
  const [orderQr, setOrderQr] = useState<string | null>(null)
  useEffect(() => { setOrder('idle'); setOrderQr(null) }, [entry.id])

  const handleOrder = useCallback(async () => {
    setOrder('loading')
    const result = await submitStoreOrder({ apartmentId, itemId: entry.id })
    const url = result.success ? result.orders?.[0]?.whatsappUrl : null
    if (!result.success) { setOrder('error'); return }
    if (!url) { setOrder('no_contact'); return }
    setOrderQr(url)
    setOrder('ready')
    track('booking_qr_shown', { targetId: entry.id })
  }, [apartmentId, entry.id])

  // El botón de pedir desaparece al llegar el QR: el foco se queda en «Volver».
  useEffect(() => { if (order === 'ready') setFocused('back') }, [order, setFocused])

  // ---- datos ----
  const contact: Array<[string, string]> = []
  if (entry.address) contact.push([getTvString('address', lang), entry.address])
  if (entry.phone) contact.push([getTvString('phone', lang), entry.phone])
  if (entry.website) contact.push([getTvString('website', lang), entry.website])
  if (entry.openingHours) contact.push([getTvString('opening_hours', lang), entry.openingHours])

  const distance = [entry.distanceText, entry.travelTimeText].filter(Boolean).join(' · ')
  const qr = entry.qr ?? (order === 'ready' && orderQr
    ? { data: orderQr, caption: getTvString('order_qr', lang) }
    : undefined)

  return (
    <>
      <Backdrop image={tileImage('background', data.tv?.tiles)} sun={[440, 60, 240]} rtl={rtl} />
      <BackBar lang={lang} onBack={onBack} autoFocus={!canOrder} />

      <div className="farch">
        {photos.length === 0 ? (
          <NoPhoto />
        ) : (
          photos.map((src, i) => (
            <div key={src} className={`l${i === slide ? ' on' : ''}`}>
              <CoverImage src={src} className="ph" fallback={i === 0 ? <NoPhoto /> : null} />
            </div>
          ))
        )}
        {entry.badge && <span className="tag">{entry.badge.label}</span>}
      </div>

      <section className="fx">
        <div className="fx-head">
          <div className="fx-main">
            <div className="lbl">{entry.subtitle}</div>
            <h1 className="h2" style={{ marginTop: 14 }}>{entry.name}</h1>

            {entry.facts.length > 0 && (
              <div className="facts">
                {entry.facts.map(fact => (
                  <span key={fact.label} className="pill"><span className="fl">{fact.label}</span></span>
                ))}
              </div>
            )}

            <p className="body fx-body" style={{ marginTop: 36 }}>
              {entry.description || getTvString('detail_no_description', lang)}
            </p>

            {canOrder && order !== 'ready' && (
              <div style={{ marginTop: 56 }}>
                {(order === 'no_contact' || order === 'error') && (
                  <p className="body" style={{ marginBottom: 20, maxWidth: '34ch' }}>
                    {getTvString(order === 'no_contact' ? 'order_no_contact' : 'order_error', lang)}
                  </p>
                )}
                <Focusable id="order" autoFocus className="btn p big" onSelect={handleOrder}>
                  {getTvString(
                    order === 'loading' ? 'order_loading' : order === 'idle' ? 'order_whatsapp' : 'order_retry',
                    lang
                  )}
                </Focusable>
              </div>
            )}
          </div>

          {qr && (
            <div className="qrp">
              <div className="in">
                <QrBox data={qr.data} size={292} />
                <div className="cp">{qr.caption}</div>
                {/* Identificar la recomendación retribuida es obligatorio
                    (Directiva 2005/29/CE, anexo I.11): va junto al QR, que es lo
                    que el huésped mira, no escondido al final de la ficha. */}
                {entry.sponsored && <div className="ad">{getTvString('sponsored', lang)}</div>}
              </div>
            </div>
          )}
        </div>

        <div className="blocks">
          {isStore && entry.inStock === false && (
            <div className="sheet note"><p>{getTvString('sold_out_detail', lang)}</p></div>
          )}

          {contact.length > 0 && (
            <div>
              <div className="lbl g">{getTvString('contact_details', lang)}</div>
              <dl className="dl">
                {contact.map(([k, v]) => (
                  <div key={k} className="dlr"><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </div>
          )}

          {distance && (
            <div>
              <div className="lbl g">{getTvString('getting_there', lang)}</div>
              <dl className="dl">
                <div className="dlr"><dt>{travelModeLabel(entry.travelMode, lang)}</dt><dd>{distance}</dd></div>
              </dl>
            </div>
          )}

          {!isStore && !entry.qr && contact.length === 0 && (
            <div className="sheet note"><p>{getTvString('ask_host_booking', lang)}</p></div>
          )}
        </div>
      </section>
    </>
  )
}
