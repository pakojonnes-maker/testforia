import { motion } from 'framer-motion'
import { Focusable } from '../lib/spatialNav'
import { infoIcon, isDoorCode } from '../lib/infoIcon'
import type { GuidebookData } from '../lib/api'

type InfoItem = GuidebookData['apartment']['info'][number]

function InfoCard({ item, autoFocus }: { item: InfoItem; autoFocus?: boolean }) {
  return (
    <Focusable id={`info-${item.id}`} autoFocus={autoFocus}>
      <div className="flex h-full w-[300px] shrink-0 flex-col gap-3 rounded-3xl p-6 text-left shadow-xl"
        style={{ background: 'rgba(251,248,242,0.96)' }}>
        <div className="grid h-16 w-16 place-items-center rounded-2xl text-4xl"
          style={{ background: 'linear-gradient(140deg,#7ad7d1,#128099)' }}>
          {infoIcon(item.icon, item.key)}
        </div>
        <div className="font-display text-2xl font-bold text-ink">{item.title}</div>
        <p className="text-base leading-relaxed text-ink-soft">{item.content}</p>
      </div>
    </Focusable>
  )
}

export function InfoScreen({ data }: { data: GuidebookData }) {
  const items = data.apartment.info.filter(i => i.key.toLowerCase() !== 'wifi')
  const door = items.find(i => isDoorCode(i.key))
  const rest = items.filter(i => i !== door)

  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="mb-6 px-2"
      >
        <div className="text-sm uppercase tracking-[0.3em] text-whitewash/75">{data.apartment.name}</div>
        <h1 className="font-display text-5xl font-bold text-whitewash drop-shadow">Información de la casa</h1>
      </motion.div>

      <div className="flex items-stretch gap-6 px-2">
        {/* Código de entrada destacado */}
        {door && (
          <Focusable id={`info-${door.id}`} autoFocus>
            <div className="flex w-[320px] shrink-0 flex-col justify-between rounded-3xl p-7 shadow-xl"
              style={{ background: 'linear-gradient(150deg,#e07a5f,#c9613f)' }}>
              <div className="flex items-center gap-3 text-whitewash">
                <span className="text-4xl">🔑</span>
                <span className="text-sm font-semibold uppercase tracking-[0.2em]">{door.title}</span>
              </div>
              <div className="font-display text-7xl font-bold tracking-[0.15em] text-whitewash">{door.content}</div>
            </div>
          </Focusable>
        )}

        {/* Resto de items en carrusel */}
        <div className="flex gap-6 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
          {rest.map((item, i) => (
            <InfoCard key={item.id} item={item} autoFocus={!door && i === 0} />
          ))}
        </div>
      </div>
    </div>
  )
}
