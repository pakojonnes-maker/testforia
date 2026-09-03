import { useEffect } from 'react'
import { BrandedQr } from '../components/BrandedQr'
import { wifiQrPayload } from '../lib/mockData'
import { track } from '../lib/tracking'
import type { GuidebookData } from '../lib/api'

/**
 * WiFi a pantalla completa. El QR del inicio resuelve el caso normal; esta
 * pantalla es para quien no puede escanear y tiene que teclear la contraseña
 * desde el sofá — por eso aquí las credenciales van ENORMES y la explicación
 * es la secundaria, al revés que en la tesela.
 */

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-label" style={{ color: 'var(--tv-text-faint)' }}>{label}</div>
      {/* break-all: una contraseña larga no se puede recortar con puntos
          suspensivos; si no se lee entera, la pantalla no sirve para nada. */}
      <div
        className="t-display mt-2 break-all text-5xl font-bold"
        style={{ color: 'var(--tv-text)' }}
      >
        {value}
      </div>
    </div>
  )
}

export function WifiScreen({ data }: { data: GuidebookData }) {
  const wifi = data.apartment.wifi
  useEffect(() => { track('wifi_reveal', { screen: 'wifi' }) }, [])

  return (
    <div className="screen-in flex h-full items-center">
      <div className="grid w-full items-center gap-16" style={{ gridTemplateColumns: '1fr auto' }}>
        <div className="min-w-0">
          <div className="t-label" style={{ color: 'var(--tv-accent)' }}>Conéctate</div>
          <h2 className="t-display mt-3 text-6xl font-bold" style={{ color: 'var(--tv-text)' }}>
            WiFi de la casa
          </h2>

          <div className="mt-10 flex flex-col gap-8">
            <Credential label="Red" value={wifi.ssid || '—'} />
            <Credential label="Contraseña" value={wifi.password || '—'} />
          </div>

          <p className="mt-10 max-w-[48ch] text-xl leading-relaxed" style={{ color: 'var(--tv-text-dim)' }}>
            Apunta la cámara de tu móvil al código de la derecha y te conectarás
            automáticamente, sin escribir nada.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center">
          <div className="rounded-3xl bg-white p-6 shadow-2xl">
            <BrandedQr
              size={320}
              data={wifiQrPayload({
                ssid: wifi.ssid || '',
                password: wifi.password || '',
                security: wifi.security,
              })}
            />
          </div>
          <div
            className="mt-5 rounded-full px-6 py-3 text-base font-bold"
            style={{ background: 'var(--tv-accent)', color: 'var(--tv-accent-ink)' }}
          >
            Escanea para conectarte
          </div>
        </div>
      </div>
    </div>
  )
}
