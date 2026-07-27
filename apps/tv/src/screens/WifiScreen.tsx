import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { BrandedQr } from '../components/BrandedQr'
import { WifiIcon } from '../components/icons'
import { wifiQrPayload } from '../lib/mockData'
import type { GuidebookData } from '../lib/api'
import { track } from '../lib/tracking'

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] as const },
})

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.22em] text-whitewash/70">{label}</div>
      <div className="mt-1 font-display text-4xl font-semibold text-whitewash">{value}</div>
    </div>
  )
}

export function WifiScreen({ data }: { data: GuidebookData }) {
  const wifi = data.apartment.wifi
  useEffect(() => { track('wifi_reveal', { screen: 'wifi' }) }, [])

  return (
    <div className="flex h-full items-center justify-center">
      <motion.div
        {...fade(0.05)}
        className="flex w-[70%] max-w-[1040px] items-center gap-12 rounded-[2rem] p-12 backdrop-blur-xl"
        style={{ background: 'rgba(251,248,242,0.14)', border: '1px solid rgba(255,255,255,0.25)', boxShadow: '0 30px 80px rgba(4,30,45,0.45)' }}
      >
        {/* Izquierda: credenciales */}
        <div className="flex-1">
          <div className="mb-6 flex items-center gap-3 text-whitewash">
            <div className="grid h-14 w-14 place-items-center rounded-2xl"
              style={{ background: 'linear-gradient(135deg,#34c2c9,#128099)' }}>
              <WifiIcon size={30} />
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-whitewash/75">Conéctate</div>
              <div className="font-display text-3xl font-bold text-whitewash">WiFi de la casa</div>
            </div>
          </div>

          <div className="space-y-6">
            <Field label="Red" value={wifi.ssid || '—'} />
            <Field label="Contraseña" value={wifi.password || '—'} />
          </div>

          <p className="mt-8 max-w-[380px] text-base leading-relaxed text-whitewash/80">
            Escanea el código con la cámara de tu móvil y te conectarás
            automáticamente, sin escribir nada.
          </p>
        </div>

        {/* Derecha: QR branded */}
        <motion.div {...fade(0.2)} className="grid place-items-center">
          <div className="rounded-3xl bg-whitewash p-6 shadow-2xl">
            <BrandedQr data={wifiQrPayload({ ssid: wifi.ssid || '', password: wifi.password || '', security: wifi.security })} size={300} />
          </div>
          <div className="mt-4 rounded-full px-5 py-2 text-sm font-semibold text-ink"
            style={{ background: 'rgba(251,248,242,0.92)' }}>
            Escanea para conectarte
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
