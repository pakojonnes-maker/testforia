import { useEffect, useState, type ReactNode } from 'react'
import { Focusable } from '../lib/spatialNav'
import { BrandedQr } from '../components/BrandedQr'
import { categoryVisual } from '../lib/categoryVisual'
import { track } from '../lib/tracking'
import { submitStoreOrder } from '../lib/api'
import type { Entry } from '../lib/collections'

/**
 * Detalle a PÁGINA COMPLETA en lugar del diálogo centrado anterior.
 *
 * El diálogo obligaba a resumir: cabían un párrafo y poco más, y el QR competía
 * por el mismo espacio. A página completa entran la foto grande, el texto
 * entero y el QR con su explicación, que es justo la información por la que el
 * huésped ha entrado.
 */

/** Caja de datos (contacto / distancia): mismo tratamiento que el resto de
 *  superficies, sólo aparece cuando hay al menos un dato real que mostrar. */
function DetailInfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl p-6" style={{ background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}>
      <div className="t-label" style={{ color: 'var(--tv-text-faint)' }}>{title}</div>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  )
}

function DetailInfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 tv-body" style={{ color: 'var(--tv-text-dim)' }}>
      <span aria-hidden="true" className="shrink-0">{icon}</span>
      <span className="min-w-0 whitespace-pre-wrap break-words">{text}</span>
    </div>
  )
}

/**
 * Producto de tienda: a diferencia de un restaurante o una experiencia, su QR
 * no llega resuelto en `entry.qr` — el número de WhatsApp lo decide el propio
 * worker (`POST /guide/store/orders`, ver collections.ts/buildStore) y de
 * paso deja el pedido registrado en D1. Por eso hace falta un paso explícito
 * ("Pedir por WhatsApp") en vez de pintar el QR nada más abrir la ficha: así
 * el registro sólo se crea cuando el huésped de verdad quiere pedir, no cada
 * vez que alguien mira un producto de pasada.
 */
function StoreOrderPanel({ entry, apartmentId }: { entry: Entry; apartmentId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'no_contact' | 'error'>('idle')
  const [qr, setQr] = useState<{ data: string } | null>(null)

  // Sin esto, volver atrás y abrir OTRO producto seguía enseñando el QR (o el
  // error) del anterior hasta que se pulsara "Pedir" de nuevo.
  useEffect(() => { setState('idle'); setQr(null) }, [entry.id])

  const handleOrder = async () => {
    setState('loading')
    const result = await submitStoreOrder({ apartmentId, itemId: entry.id })
    const url = result.success ? result.orders?.[0]?.whatsappUrl : null
    if (!result.success) { setState('error'); return }
    if (!url) { setState('no_contact'); return }
    setQr({ data: url })
    setState('ready')
    track('booking_qr_shown', { targetId: entry.id })
  }

  if (entry.inStock === false) {
    return (
      <div
        className="mt-6 rounded-2xl px-7 py-6 tv-body"
        style={{ background: 'var(--tv-surface)', color: 'var(--tv-text-dim)' }}
      >
        Producto agotado por ahora.
      </div>
    )
  }

  if (state === 'ready' && qr) {
    return (
      <div className="flex shrink-0 flex-col items-center">
        <div className="rounded-2xl bg-white p-3 shadow-xl">
          <BrandedQr data={qr.data} size={176} />
        </div>
        <p className="mt-3 max-w-[230px] text-center tv-meta font-semibold leading-snug" style={{ color: 'var(--tv-text-dim)' }}>
          Escanea para confirmar tu pedido por WhatsApp
        </p>
      </div>
    )
  }

  if (state === 'no_contact' || state === 'error') {
    return (
      <div className="flex shrink-0 flex-col items-center gap-3 text-center">
        <p className="max-w-[230px] tv-meta font-semibold leading-snug" style={{ color: 'var(--tv-text-dim)' }}>
          {state === 'no_contact' ? 'Pregunta a tu anfitrión para pedir este producto.' : 'No se ha podido generar el pedido.'}
        </p>
        <Focusable id="store-order-retry" onSelect={handleOrder} className="w-fit rounded-full">
          <div className="rounded-full px-6 py-3 tv-meta font-bold" style={{ background: 'var(--tv-surface-raised)', color: 'var(--tv-text)' }}>
            Reintentar
          </div>
        </Focusable>
      </div>
    )
  }

  return (
    <Focusable id="store-order" onSelect={handleOrder} className="w-fit rounded-full">
      <div
        className="inline-flex items-center gap-3 rounded-full px-8 py-4 tv-body font-bold"
        style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
      >
        {state === 'loading' ? 'Generando pedido…' : 'Pedir por WhatsApp'}
      </div>
    </Focusable>
  )
}

interface DetailScreenProps {
  entry: Entry
  /** Solo hace falta para la tienda (ver StoreOrderPanel) — el resto de
   *  fichas no llaman al worker. */
  apartmentId: string
  onBack: () => void
}

export function DetailScreen({ entry, apartmentId, onBack }: DetailScreenProps) {
  const visual = categoryVisual(entry.category, entry.subcategory)
  // Un restaurante enseña su carta entera vía QR (Gravy) y no tiene distancia
  // precalculada; un POI/experiencia sí — estas cajas aparecen o no según lo
  // que de verdad haya para ese tipo de ficha, sin distinguir "es restaurante"
  // a propósito: la diferencia ya la marcan los datos (ver collections.ts).
  const hasContact = Boolean(entry.address || entry.phone || entry.website || entry.openingHours)
  const hasDistance = Boolean(entry.distanceText || entry.travelTimeText)

  // Enseñar el QR es el evento que vale dinero: es la intención de ir al
  // restaurante o de reservar. Se emite una vez, al abrir la ficha.
  useEffect(() => {
    if (entry.qr) track(entry.qr.event, { screen: 'detail', targetId: entry.id })
  }, [entry.id, entry.qr])

  return (
    <div className="screen-in h-full">
      <div className="grid h-full gap-8" style={{ gridTemplateColumns: '0.85fr 1fr' }}>
        {/* Columna de imagen: foto grande y, si hay más fotos reales, una
            galería debajo — como una ficha con fotografía propia en vez de una
            única portada recortada. */}
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div
            className="relative min-h-0 flex-1 overflow-hidden"
            style={{ borderRadius: '1.5rem', background: 'var(--tv-surface)', border: '1px solid var(--tv-line)' }}
          >
            {entry.image ? (
              <img src={entry.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div
                className="absolute inset-0 grid place-items-center"
                style={{ background: `linear-gradient(150deg, ${visual.from}, ${visual.to})` }}
              >
                <span className="text-[9rem]">{visual.emoji}</span>
              </div>
            )}

            {entry.badge && (
              <span
                className="absolute left-6 top-6 rounded-full px-4 py-2 text-[19px] font-bold uppercase tracking-[0.12em]"
                style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
              >
                {entry.badge}
              </span>
            )}
          </div>

          {entry.gallery.length > 0 && (
            <div
              className="grid shrink-0 gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(entry.gallery.length, 4)}, 1fr)`, height: '124px' }}
            >
              {entry.gallery.slice(0, 4).map(url => (
                <div key={url} className="overflow-hidden" style={{ borderRadius: '1rem', border: '1px solid var(--tv-line)' }}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna de contenido */}
        <div className="flex min-w-0 flex-col">
          <div className="flex min-w-0 items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              <div className="t-label" style={{ color: 'var(--tv-accent)' }}>{entry.subtitle}</div>
              <h2 className="t-display mt-3 tv-title font-bold" style={{ color: 'var(--tv-text)' }}>
                {entry.name}
              </h2>

              {entry.facts.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {entry.facts.map(fact => (
                    <span
                      key={fact.label}
                      className="flex items-center gap-2 rounded-full px-5 py-2.5 tv-meta font-semibold capitalize"
                      style={{ background: 'var(--tv-surface-raised)', color: 'var(--tv-text-dim)' }}
                    >
                      <span aria-hidden="true">{fact.icon}</span>
                      {fact.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* QR arriba a la derecha: mismo sitio en todas las fichas, para
                que el huésped sepa dónde mirar sin leer. Tienda no trae `qr`
                resuelto — ver StoreOrderPanel arriba. */}
            {entry.kind === 'store' && <StoreOrderPanel entry={entry} apartmentId={apartmentId} />}
            {entry.qr && (
              <div className="flex shrink-0 flex-col items-center">
                <div className="rounded-2xl bg-white p-3 shadow-xl">
                  <BrandedQr data={entry.qr.data} size={176} />
                </div>
                <p
                  className="mt-3 max-w-[230px] text-center tv-meta font-semibold leading-snug"
                  style={{ color: 'var(--tv-text-dim)' }}
                >
                  {entry.qr.caption}
                </p>
                {/* Identificar la recomendación retribuida es obligatorio
                    (Directiva 2005/29/CE, anexo I.11). La guía ya lo hacía; la
                    TV no avisaba en ningún sitio. Va junto al QR, que es lo que
                    el huésped mira, no escondido al final de la ficha. */}
                {entry.sponsored && (
                  <p
                    className="mt-2 max-w-[230px] text-center tv-meta leading-snug opacity-70"
                    style={{ color: 'var(--tv-text-dim)' }}
                  >
                    Publicidad · tu anfitrión puede recibir una comisión
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="col-scroll mt-7 min-h-0 flex-1">
            {entry.description ? (
              <p className="max-w-[52ch] tv-body" style={{ color: 'var(--tv-text-dim)' }}>
                {entry.description}
              </p>
            ) : (
              <p className="tv-body" style={{ color: 'var(--tv-text-faint)' }}>
                Una recomendación de tu anfitrión para esta estancia.
              </p>
            )}

            {hasContact && (
              <DetailInfoCard title="Datos de contacto">
                {entry.address && <DetailInfoRow icon="📍" text={entry.address} />}
                {entry.phone && <DetailInfoRow icon="📞" text={entry.phone} />}
                {entry.website && <DetailInfoRow icon="🌐" text={entry.website} />}
                {entry.openingHours && <DetailInfoRow icon="🕒" text={entry.openingHours} />}
              </DetailInfoCard>
            )}

            {hasDistance && (
              <DetailInfoCard title="Distancia y cómo llegar">
                {entry.distanceText && (
                  <DetailInfoRow
                    icon={entry.travelMode === 'walk' ? '🚶' : entry.travelMode === 'bike' ? '🚲' : '🚗'}
                    text={entry.travelTimeText ? `${entry.distanceText} · ${entry.travelTimeText}` : entry.distanceText}
                  />
                )}
                {!entry.distanceText && entry.travelTimeText && (
                  <DetailInfoRow
                    icon={entry.travelMode === 'walk' ? '🚶' : entry.travelMode === 'bike' ? '🚲' : '🚗'}
                    text={entry.travelTimeText}
                  />
                )}
              </DetailInfoCard>
            )}

            {entry.kind !== 'store' && !entry.qr && !hasContact && (
              <div
                className="mt-6 rounded-2xl px-7 py-6 tv-body"
                style={{ background: 'var(--tv-surface)', color: 'var(--tv-text-dim)' }}
              >
                Pregunta a tu anfitrión para reservar o pedir indicaciones.
              </div>
            )}
          </div>

          <div className="shrink-0 pt-6">
            <Focusable id="detail-back" autoFocus onSelect={onBack} className="w-fit rounded-full">
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
