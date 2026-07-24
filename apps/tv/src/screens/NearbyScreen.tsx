import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Focusable, useFocus } from '../lib/spatialNav'
import { BrandedQr } from '../components/BrandedQr'
import { categoryVisual } from '../lib/categoryVisual'
import { track } from '../lib/tracking'
import type { GuidebookData } from '../lib/api'

export function NearbyScreen({ data }: { data: GuidebookData }) {
  const pois = data.pois
  const { focusedId } = useFocus()
  const [activeId, setActiveId] = useState(pois[0]?.id)

  // El panel de detalle sigue al POI enfocado con el mando.
  useEffect(() => {
    if (focusedId?.startsWith('poi-')) {
      const id = focusedId.slice(4)
      setActiveId(id)
      track('poi_select', { screen: 'nearby' })
    }
  }, [focusedId])

  const active = pois.find(p => p.id === activeId) || pois[0]
  const av = categoryVisual(active?.category)

  return (
    <div className="flex h-full gap-8">
      {/* Izquierda: lista de POIs */}
      <div className="flex w-[42%] flex-col">
        <div className="mb-4 px-2">
          <div className="text-sm uppercase tracking-[0.3em] text-whitewash/75">Qué ver cerca</div>
          <h1 className="font-display text-4xl font-bold text-whitewash drop-shadow">Alrededores</h1>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto pr-2" style={{ scrollbarWidth: 'none' }}>
          {pois.map((p, i) => {
            const v = categoryVisual(p.category)
            return (
              <Focusable key={p.id} id={`poi-${p.id}`} autoFocus={i === 0}>
                <div className="flex items-center gap-4 rounded-2xl p-3 pr-5"
                  style={{ background: 'rgba(251,248,242,0.92)' }}>
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-3xl"
                    style={{ background: `linear-gradient(140deg, ${v.from}, ${v.to})` }}>
                    {v.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-display text-2xl font-bold text-ink">{p.name}</div>
                    <div className="truncate text-sm font-medium capitalize text-ink-soft">{p.category}</div>
                  </div>
                </div>
              </Focusable>
            )
          })}
        </div>
      </div>

      {/* Derecha: detalle del POI enfocado + QR de direcciones */}
      <div className="flex-1">
          <motion.div
            key={active?.id}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex h-full flex-col overflow-hidden rounded-[2rem] shadow-2xl"
            style={{ background: 'rgba(251,248,242,0.96)' }}
          >
            <div className="relative flex h-[46%] items-center justify-center"
              style={{ background: active?.media?.[0]?.url ? `center/cover url(${active.media[0].url})` : `linear-gradient(140deg, ${av.from}, ${av.to})` }}>
              {!active?.media?.[0]?.url && <span className="text-[7rem] drop-shadow-lg">{av.emoji}</span>}
            </div>
            <div className="flex flex-1 items-center gap-6 p-8">
              <div className="flex-1">
                <div className="font-display text-4xl font-bold text-ink">{active?.name}</div>
                <p className="mt-3 text-lg leading-relaxed text-ink-soft">{active?.description}</p>
              </div>
              {active?.google_maps_url && (
                <div className="grid shrink-0 place-items-center">
                  <div className="rounded-2xl bg-whitewash p-3 shadow-lg ring-1 ring-black/5">
                    <BrandedQr data={active.google_maps_url} size={150} />
                  </div>
                  <div className="mt-2 text-xs font-semibold text-ink-soft">Escanea para llegar</div>
                </div>
              )}
            </div>
          </motion.div>
      </div>
    </div>
  )
}
