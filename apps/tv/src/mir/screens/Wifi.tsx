import { useEffect } from 'react'
import { wifiQrPayload } from '../../lib/mockData'
import { getTvString } from '../../lib/i18n'
import { tileImage } from '../../lib/tileImages'
import { track } from '../../lib/tracking'
import type { GuidebookData } from '../../lib/api'
import { BackBar, Backdrop, QrBox } from '../parts'
import { wifiCredSize } from '../stay'

/**
 * WiFi a pantalla completa. El QR de la placa del inicio resuelve el caso normal;
 * esta pantalla es para quien no puede escanear y tiene que TECLEAR la clave desde
 * el sofá: por eso las credenciales van enormes y en monoespaciada (que I/l/1 y
 * O/0 no se confundan), y la explicación es lo secundario.
 */
export function Wifi({ data, lang, rtl, onBack }: { data: GuidebookData; lang: string; rtl: boolean; onBack: () => void }) {
  const wifi = data.apartment.wifi
  const hasWifi = Boolean(wifi.ssid)
  const size = wifiCredSize([wifi.ssid || '', wifi.password || '—'])
  useEffect(() => { track('wifi_reveal', { screen: 'wifi' }) }, [])

  return (
    <>
      <Backdrop image={tileImage('background', data.tv?.tiles)} sun={[1640, 150, 240]} rtl={rtl} />
      <BackBar lang={lang} onBack={onBack} autoFocus />

      <section className="wf">
        <h1 className="h1">{getTvString('wifi_title', lang)}</h1>
        {hasWifi ? (
          <>
            <div className="wf-c">
              <div>
                <div className="lbl g">{getTvString('wifi_network', lang)}</div>
                {/* break-all: una clave larga no se puede recortar con puntos suspensivos. */}
                <div className="crv" style={{ fontSize: size }}>{wifi.ssid}</div>
              </div>
              <div>
                <div className="lbl g">{getTvString('wifi_password', lang)}</div>
                <div className="crv" style={{ fontSize: size }}>{wifi.password || '—'}</div>
              </div>
            </div>
            <p className="body wf-h">{getTvString('wifi_screen_hint', lang)}</p>
          </>
        ) : (
          <div className="sheet wf-none">
            <p>{getTvString('wifi_ask_host', lang)}</p>
          </div>
        )}
      </section>

      {hasWifi && (
        <div className="wq">
          <div className="in">
            <QrBox
              size={480}
              data={wifiQrPayload({ ssid: wifi.ssid || '', password: wifi.password || '', security: wifi.security })}
            />
            <div className="cta">{getTvString('wifi_scan_cta', lang)}</div>
          </div>
        </div>
      )}
    </>
  )
}
