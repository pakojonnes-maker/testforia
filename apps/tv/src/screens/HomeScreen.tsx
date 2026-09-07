import { useEffect, useRef } from 'react'
import { useFocus } from '../lib/spatialNav'
import { PhotoTile, PlainTile, CodeTile, WifiTile } from '../components/Tile'
import { BrandedQr } from '../components/BrandedQr'
import { LanguageFlag } from '../components/LanguageFlag'
import { wifiQrPayload } from '../lib/mockData'
import { isDoorCode } from '../lib/infoKeys'
import { languageOption } from '../lib/languages'
import { getTvString } from '../lib/i18n'
import { track } from '../lib/tracking'
import type { GuidebookData } from '../lib/api'
import type { Collection, CollectionKind } from '../lib/collections'
import type { Route } from '../App'

/**
 * Inicio como MOSAICO, no como pantalla de bienvenida.
 *
 * El cambio de fondo respecto al diseño anterior: antes había una tarjeta
 * central con un saludo y dos botones, y todo lo demás vivía escondido tras una
 * barra de navegación. Ahora cada destino es una tesela visible desde el primer
 * segundo — el huésped ve TODO lo que la pantalla puede hacer sin pulsar nada,
 * y el WiFi se puede escanear sin navegar a ninguna parte.
 */

/** El contenido de checkin/checkout es texto libre y largo; el chip sólo cabe la hora. */
function extractTime(content?: string): string | null {
  const match = content?.match(/\d{1,2}[:.]\d{2}/)
  return match ? match[0].replace('.', ':') : null
}

interface HomeScreenProps {
  data: GuidebookData
  collections: Collection[]
  lang: string
  onNavigate: (route: Route) => void
}

export function HomeScreen({ data, collections, lang, onNavigate }: HomeScreenProps) {
  const { focusedId } = useFocus()
  const wifiRevealed = useRef(false)

  const byKind = (kind: CollectionKind) => collections.find(c => c.kind === kind)
  const eat = byKind('eat')
  const doing = byKind('do')
  const store = byKind('store')

  const infoItems = data.apartment.info.filter(i => i.key.toLowerCase() !== 'wifi')
  const door = infoItems.find(i => isDoorCode(i.key))
  const checkin = extractTime(data.apartment.info.find(i => i.key === 'checkin')?.content)
  const checkout = extractTime(data.apartment.info.find(i => i.key === 'checkout')?.content)

  const wifi = data.apartment.wifi
  const hasWifi = Boolean(wifi.ssid)

  /**
   * `wifi_reveal` sigue significando "el huésped fue a por el WiFi", pero ahora
   * el QR está a la vista en el inicio: si sólo se contara al abrir la pantalla
   * de WiFi, el KPI se desplomaría a cero en cuanto la gente escaneara desde
   * aquí. Se cuenta al posarse el foco en la tesela, que sí es un acto
   * deliberado, y una sola vez por visita al inicio.
   */
  useEffect(() => {
    if (focusedId === 'tile-wifi' && !wifiRevealed.current) {
      wifiRevealed.current = true
      track('wifi_reveal', { screen: 'home' })
    }
  }, [focusedId])

  const language = languageOption(lang)

  // Sin código de entrada la última fila se reparte entre Tienda y Estancia
  // en vez de dejar un hueco en la rejilla.
  const areas = door
    ? [
        '"info   eat  eat   do"',
        '"wifi   eat  eat   do"',
        '"wifi   lang stay  do"',
        '"wifi   store store code"',
      ]
    : [
        '"info   eat  eat   do"',
        '"wifi   eat  eat   do"',
        '"wifi   lang stay  do"',
        '"wifi   store store store"',
      ]

  return (
    <div className="screen-in h-full">
      <div
        className="grid h-full gap-4"
        style={{
          gridTemplateColumns: '0.92fr 1.06fr 1.06fr 1.04fr',
          gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
          gridTemplateAreas: areas.join(' '),
        }}
      >
        <PlainTile
          id="tile-info"
          area="info"
          value={getTvString('rules', lang)}
          label={getTvString('quick_guides', lang)}
          onSelect={() => onNavigate({ name: 'info' })}
        />

        {hasWifi ? (
          <WifiTile
            id="tile-wifi"
            area="wifi"
            ssid={wifi.ssid || '—'}
            password={wifi.password || '—'}
            onSelect={() => onNavigate({ name: 'wifi' })}
            qr={
              <BrandedQr
                size={188}
                data={wifiQrPayload({
                  ssid: wifi.ssid || '',
                  password: wifi.password || '',
                  security: wifi.security,
                })}
              />
            }
          />
        ) : (
          <PlainTile
            id="tile-wifi"
            area="wifi"
            label="Consulta los datos del WiFi con tu anfitrión"
            onSelect={() => onNavigate({ name: 'wifi' })}
          />
        )}

        <PhotoTile
          id="tile-eat"
          area="eat"
          autoFocus
          overline={eat?.eyebrow}
          label={eat?.tile || 'Dónde comer'}
          count={eat?.entries.length}
          image={data.restaurants.find(r => r.cover_image)?.cover_image || data.zone?.cover_image_url}
          onSelect={() => onNavigate({ name: 'collection', kind: 'eat' })}
        />

        <PhotoTile
          id="tile-do"
          area="do"
          overline={doing?.eyebrow}
          label={doing?.tile || 'Qué hacer'}
          count={doing?.entries.length}
          image={data.experiences.find(e => e.cover_image_url)?.cover_image_url || data.zone?.cover_image_url}
          onSelect={() => onNavigate({ name: 'collection', kind: 'do' })}
        />

        <PlainTile
          id="tile-lang"
          area="lang"
          compact
          icon={<LanguageFlag language={language} height={30} />}
          value={language.native}
          label="Idioma"
          onSelect={() => onNavigate({ name: 'language' })}
        />

        <PlainTile
          id="tile-stay"
          area="stay"
          compact
          value={checkin && checkout ? `${checkin} · ${checkout}` : checkout || checkin || '—'}
          label={checkin && checkout ? 'Entrada y salida' : 'Tu estancia'}
          onSelect={() => onNavigate({ name: 'info' })}
        />

        <PhotoTile
          id="tile-store"
          area="store"
          overline={store?.eyebrow}
          label={store?.tile || getTvString('store_title', lang)}
          count={store?.entries.length}
          image={data.store_items.find(i => i.cover_image_url)?.cover_image_url || data.apartment.cover_image_url}
          onSelect={() => onNavigate({ name: 'collection', kind: 'store' })}
        />

        {door && (
          <CodeTile
            id="tile-code"
            area="code"
            title={door.title}
            code={door.content}
            onSelect={() => onNavigate({ name: 'info' })}
          />
        )}
      </div>
    </div>
  )
}
