import { motion } from 'framer-motion'
import { Focusable } from '../lib/spatialNav'
import { ArrowRightIcon, WifiIcon } from '../components/icons'
import type { GuidebookData } from '../lib/api'
import type { Screen } from '../App'

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.2, 0.8, 0.2, 1] as const },
})

function StayChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-xs uppercase tracking-[0.22em] text-whitewash/70">{label}</div>
      <div className="font-display text-2xl font-semibold text-whitewash">{value}</div>
    </div>
  )
}

// El contenido de checkin/checkout es texto libre y largo (p.ej. "Llegada a
// partir de las 15:00 h.\n\nLa caja de llaves está..."), pero el chip solo
// tiene sitio para la hora.
function extractTime(content?: string): string {
  const match = content?.match(/\d{1,2}[:.]\d{2}/)
  return match ? match[0].replace('.', ':') : '—'
}

export function WelcomeScreen({ data, onNavigate }: { data: GuidebookData; onNavigate: (s: Screen) => void }) {
  const checkin = data.apartment.info.find(i => i.key === 'checkin')
  const checkout = data.apartment.info.find(i => i.key === 'checkout')

  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        {...fade(0.05)}
        className="w-[62%] max-w-[900px] rounded-[2rem] p-12 text-center backdrop-blur-xl"
        style={{ background: 'rgba(251,248,242,0.14)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 30px 80px rgba(4,30,45,0.45)' }}
      >
        <motion.div {...fade(0.15)} className="mb-2 text-sm uppercase tracking-[0.35em] text-whitewash/80">
          {data.apartment.name}
        </motion.div>

        <motion.h1 {...fade(0.25)} className="font-display text-6xl font-bold text-whitewash drop-shadow-sm">
          Te damos la bienvenida
        </motion.h1>

        <motion.p {...fade(0.35)} className="mx-auto mt-4 max-w-[640px] text-lg leading-relaxed text-whitewash/85">
          Estamos encantados de recibirte. Ponte cómoda, disfruta de las vistas y del
          Mediterráneo. Todo lo que necesitas para tu estancia está aquí, en la pantalla.
        </motion.p>

        <motion.div
          {...fade(0.45)}
          className="mx-auto mt-8 flex w-fit items-stretch gap-8 rounded-2xl px-8 py-4"
          style={{ background: 'rgba(6,42,58,0.28)', border: '1px solid rgba(255,255,255,0.16)' }}
        >
          <StayChip label="Check-in" value={extractTime(checkin?.content)} />
          <div className="w-px self-stretch bg-white/25" />
          <StayChip label="Check-out" value={extractTime(checkout?.content)} />
        </motion.div>

        <motion.div {...fade(0.55)} className="mt-9 flex items-center justify-center gap-4">
          <Focusable id="cta-wifi" autoFocus onSelect={() => onNavigate('wifi')}>
            <div className="flex items-center gap-3 rounded-full px-8 py-4 text-lg font-semibold text-whitewash"
              style={{ background: 'linear-gradient(135deg,#34c2c9,#128099)' }}>
              <WifiIcon size={24} /> Conectar al WiFi
            </div>
          </Focusable>

          <Focusable id="cta-guide" onSelect={() => onNavigate('guide')}>
            <div className="flex items-center gap-3 rounded-full px-8 py-4 text-lg font-semibold text-ink"
              style={{ background: 'rgba(251,248,242,0.92)' }}>
              Explorar la guía <ArrowRightIcon size={22} />
            </div>
          </Focusable>
        </motion.div>
      </motion.div>
    </div>
  )
}
