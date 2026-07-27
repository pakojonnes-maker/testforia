import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Focusable } from '../lib/spatialNav'
import { BrandedQr } from '../components/BrandedQr'
import { categoryVisual } from '../lib/categoryVisual'
import { track } from '../lib/tracking'
import type { GuidebookData } from '../lib/api'

// Carta digital "Gravy" (apps/client, mobile-first) — destino del QR para ver
// el menú completo en el móvil del huésped. No tiene sentido navegar ahí desde
// la propia TV (es una experiencia táctil tipo Reels).
const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com'

interface Rec {
  id: string
  name: string
  subtitle: string
  badge?: string
  category: string
  subcategory?: string | null
  image?: string
  kind: 'restaurant' | 'experience'
  description?: string
  slug?: string
  priceDisplay?: string
  whatsappPhone?: string
  prefilledMessage?: string
}

function RecCard({ rec, autoFocus, onSelect }: { rec: Rec; autoFocus?: boolean; onSelect: () => void }) {
  const v = categoryVisual(rec.category, rec.subcategory)
  return (
    <Focusable id={`rec-${rec.id}`} autoFocus={autoFocus} onSelect={onSelect}>
      <div className="w-[300px] shrink-0 overflow-hidden rounded-3xl text-left shadow-xl"
        style={{ background: 'rgba(251,248,242,0.96)' }}>
        <div className="relative flex h-[190px] items-center justify-center"
          style={{ background: rec.image ? `center/cover url(${rec.image})` : `linear-gradient(140deg, ${v.from}, ${v.to})` }}>
          {!rec.image && <span className="text-7xl drop-shadow-md">{v.emoji}</span>}
          {rec.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-whitewash">
              {rec.badge}
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="font-display text-2xl font-bold text-ink">{rec.name}</div>
          <div className="mt-1 text-sm font-medium text-ink-soft">{rec.subtitle}</div>
        </div>
      </div>
    </Focusable>
  )
}

function DetailOverlay({ rec, apartmentId, onClose }: { rec: Rec; apartmentId: string; onClose: () => void }) {
  const v = categoryVisual(rec.category, rec.subcategory)

  // Backspace/Escape cierran el detalle (botón "atrás" habitual de un mando de TV).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // El QR del menú lleva incrustada la atribución al alojamiento: cuando el
  // huésped lo escanea con el móvil, la sesión del menú sabe que viene de esta
  // TV y de este apartamento. Sin esto, el ROI de la pantalla era inmedible.
  const qrData = rec.kind === 'restaurant' && rec.slug
    ? `${MENU_URL}/${rec.slug}?ref=tv&apt=${encodeURIComponent(apartmentId)}`
    : rec.kind === 'experience' && rec.whatsappPhone
      ? `https://wa.me/${rec.whatsappPhone.replace(/[^+\d]/g, '')}${rec.prefilledMessage ? `?text=${encodeURIComponent(rec.prefilledMessage)}` : ''}`
      : null

  const qrLabel = rec.kind === 'restaurant' ? 'Escanea para ver la carta completa' : 'Escanea para reservar por WhatsApp'

  useEffect(() => {
    if (qrData) track(rec.kind === 'restaurant' ? 'menu_qr_shown' : 'booking_qr_shown', { screen: 'guide', targetId: rec.id })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.id])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
      className="absolute inset-0 z-20 grid place-items-center"
      style={{ background: 'rgba(6,42,58,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex w-[70%] max-w-[980px] items-center gap-10 overflow-hidden rounded-[2rem] p-10 shadow-2xl"
        style={{ background: 'rgba(251,248,242,0.98)' }}
      >
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl text-3xl"
              style={{ background: `linear-gradient(140deg, ${v.from}, ${v.to})` }}>
              {v.emoji}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-soft">{rec.subtitle}</div>
              <div className="font-display text-3xl font-bold text-ink">{rec.name}</div>
            </div>
          </div>
          <p className="mt-4 max-w-[480px] text-lg leading-relaxed text-ink-soft">
            {rec.description || 'Recomendado especialmente para tu estancia.'}
          </p>
          {rec.priceDisplay && (
            <div className="mt-5 inline-block rounded-full px-5 py-2 font-display text-xl font-bold text-whitewash"
              style={{ background: 'linear-gradient(135deg,#34c2c9,#128099)' }}>
              {rec.priceDisplay}
            </div>
          )}
        </div>

        {qrData ? (
          <div className="grid shrink-0 place-items-center">
            <div className="rounded-2xl bg-whitewash p-3 shadow-lg ring-1 ring-black/5">
              <BrandedQr data={qrData} size={190} />
            </div>
            <div className="mt-3 max-w-[180px] text-center text-xs font-semibold text-ink-soft">{qrLabel}</div>
          </div>
        ) : (
          <div className="shrink-0 max-w-[180px] text-center text-sm text-ink-soft">
            Pregunta en recepción para reservar.
          </div>
        )}
      </motion.div>

      <Focusable id="rec-detail-close" autoFocus onSelect={onClose}>
        <div className="mt-6 rounded-full px-6 py-3 text-sm font-semibold text-whitewash"
          style={{ background: 'rgba(6,42,58,0.55)', border: '1px solid rgba(255,255,255,0.3)' }}>
          ← Volver
        </div>
      </Focusable>
    </motion.div>
  )
}

export function GuideScreen({ data }: { data: GuidebookData }) {
  const [selected, setSelected] = useState<Rec | null>(null)

  const recs: Rec[] = [
    ...data.restaurants.map((r): Rec => ({
      id: r.id, name: r.name, subtitle: r.cuisine_type, category: 'restaurant', kind: 'restaurant',
      badge: r.tier === 'premium' ? 'Premium' : undefined, image: r.cover_image || undefined, slug: r.slug,
    })),
    ...data.experiences.map((e): Rec => ({
      id: e.id, name: e.name, subtitle: e.price_display, category: e.category,
      subcategory: e.service_subcategory, kind: 'experience',
      badge: e.is_featured ? 'Destacado' : undefined, image: e.cover_image_url || undefined,
      description: e.description, priceDisplay: e.price_display,
      whatsappPhone: e.action_type === 'whatsapp' ? e.action_data : undefined,
      prefilledMessage: e.prefilled_message,
    })),
  ]

  return (
    <div className="relative flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="mb-8 px-2"
      >
        <div className="text-sm uppercase tracking-[0.3em] text-whitewash/75">{data.zone.region}</div>
        <h1 className="font-display text-5xl font-bold text-whitewash drop-shadow">Descubre {data.zone.name}</h1>
        <p className="mt-3 max-w-[820px] text-lg leading-relaxed text-whitewash/85">{data.zone.description}</p>
      </motion.div>

      {/* Carrusel horizontal: el foco por mando arrastra el scroll (centra la tarjeta) */}
      <div className="flex gap-6 overflow-x-auto px-2 pb-6 pt-2" style={{ scrollbarWidth: 'none' }}>
        {recs.map((rec, i) => (
          <RecCard key={rec.id} rec={rec} autoFocus={i === 0} onSelect={() => setSelected(rec)} />
        ))}
      </div>

      {selected && <DetailOverlay rec={selected} apartmentId={data.apartment.id} onClose={() => setSelected(null)} />}
    </div>
  )
}
