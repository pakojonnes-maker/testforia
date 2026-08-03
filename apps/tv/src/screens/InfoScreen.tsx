import { motion } from 'framer-motion'
import { Focusable } from '../lib/spatialNav'
import { infoIcon, isDoorCode } from '../lib/infoIcon'
import type { GuidebookData } from '../lib/api'

type InfoItem = GuidebookData['apartment']['info'][number]

// El contenido llega como texto con saltos de línea reales (p.ej. una lista de
// normas separadas por \n, cada una con su propio emoji/✓ delante). Un <p> normal
// colapsa esos \n en espacios y todo se lee como una sola frase corrida — por eso
// en la tele se veía como un bloque de texto ilegible. Aquí cada línea es su
// propia fila, que es como se pensó el contenido al escribirlo.
function ContentLines({ content }: { content: string }) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, i) => (
        <p key={i} className="text-lg leading-snug text-ink-soft">{line}</p>
      ))}
    </div>
  )
}

// The category catalog (migration 0083) gives every info item a color; older
// rows without a category_key fall back to the same teal this tile always used.
function InfoCard({ item, autoFocus }: { item: InfoItem; autoFocus?: boolean }) {
  const tileBackground = item.color
    ? `linear-gradient(140deg, ${item.color}, ${item.color}cc)`
    : 'linear-gradient(140deg,#7ad7d1,#128099)'
  return (
    <Focusable id={`info-${item.id}`} autoFocus={autoFocus}>
      <div className="flex h-full w-[340px] shrink-0 flex-col gap-4 rounded-3xl p-7 text-left shadow-xl"
        style={{ background: 'rgba(251,248,242,0.96)' }}>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl"
          style={{ background: tileBackground }}>
          {infoIcon(item.icon, item.key)}
        </div>
        <div className="font-display text-2xl font-bold text-ink">{item.title}</div>
        <ContentLines content={item.content} />
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
