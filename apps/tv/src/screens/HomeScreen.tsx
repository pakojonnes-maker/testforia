import { useEffect, useRef } from 'react'
import { useFocus } from '../lib/spatialNav'
import { PhotoTile, PlainTile, CodeTile, WifiTile } from '../components/Tile'
import { BrandedQr } from '../components/BrandedQr'
import { LanguageFlag } from '../components/LanguageFlag'
import { wifiQrPayload } from '../lib/mockData'
import { isDoorCode } from '../lib/infoKeys'
import { languageOption } from '../lib/languages'
import { getTvString } from '../lib/i18n'
import { tileImage } from '../lib/tileImages'
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

/**
 * La hora de entrada/salida, por orden de fiabilidad.
 *
 * Primero la columna del apartamento (guide_apartments.checkin_time), que es un
 * dato de verdad y que el importador de fichas ya rellena. Sólo si no la hay se
 * rasca del texto libre del bloque, que es lo único que había antes: una hora
 * escrita dentro de un párrafo del anfitrión. Ese regex falla en cuanto alguien
 * escribe "a partir de las cuatro" o no pone hora, y entonces la tesela enseñaba
 * un guion — que es como está hoy en producción en Costa del Sol Apartments.
 */
function stayTime(structured?: string | null, content?: string): string | null {
  const fromColumn = structured?.trim()
  if (fromColumn) {
    // La columna es TEXT sin formato fijo: puede venir "16:00" o "16:00:00".
    const m = fromColumn.match(/\d{1,2}[:.]\d{2}/)
    return m ? m[0].replace('.', ':') : fromColumn
  }
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

  // Imágenes de las teselas: las de serie van dentro del APK y el anfitrión
  // puede sustituirlas por alojamiento desde el admin (ver lib/tileImages.ts).
  const tiles = data.tv?.tiles

  const infoItems = data.apartment.info.filter(i => i.key.toLowerCase() !== 'wifi')
  const door = infoItems.find(i => isDoorCode(i.key))
  const checkin = stayTime(data.apartment.checkin_time, data.apartment.info.find(i => i.key === 'checkin')?.content)
  const checkout = stayTime(data.apartment.checkout_time, data.apartment.info.find(i => i.key === 'checkout')?.content)

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
          // La fila 3 (Idioma y Tu estancia) va al 40 % de la altura de las
          // demás. Son teselas de UTILIDAD: dentro sólo hay una etiqueta y un
          // dato de una palabra, así que a un cuarto de la pantalla eran casi
          // todo hueco muerto y competían en peso con los destinos, que son lo
          // que el huésped ha venido a mirar. 3/3/1/3 sobre 10 deja esa fila en
          // el 10 % del alto y reparte el 90 % restante entre las otras tres.
          gridTemplateRows: 'minmax(0, 3fr) minmax(0, 3fr) minmax(0, 1fr) minmax(0, 3fr)',
          gridTemplateAreas: areas.join(' '),
        }}
      >
        <PlainTile
          id="tile-info"
          area="info"
          image={tileImage('info', tiles)}
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
            image={tileImage('wifi', tiles)}
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
            image={tileImage('wifi', tiles)}
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
          image={tileImage('eat', tiles)}
          onSelect={() => onNavigate({ name: 'collection', kind: 'eat' })}
        />

        <PhotoTile
          id="tile-do"
          area="do"
          overline={doing?.eyebrow}
          label={doing?.tile || 'Qué hacer'}
          count={doing?.entries.length}
          image={tileImage('do', tiles)}
          onSelect={() => onNavigate({ name: 'collection', kind: 'do' })}
        />

        <PlainTile
          id="tile-lang"
          area="lang"
          compact
          image={tileImage('lang', tiles)}
          icon={<LanguageFlag language={language} height={30} />}
          value={language.native}
          label="Idioma"
          onSelect={() => onNavigate({ name: 'language' })}
        />

        <PlainTile
          id="tile-stay"
          area="stay"
          compact
          image={tileImage('stay', tiles)}
          // Sin ninguna hora NO se pinta un guion: un guion no es un dato, es un
          // hueco con tipografía. La tesela sigue siendo la puerta a Guías
          // Rápidas, que es para lo que el huésped la usa.
          value={checkin && checkout ? `${checkin} · ${checkout}` : checkout || checkin || undefined}
          label={checkin && checkout ? 'Entrada y salida' : 'Tu estancia'}
          onSelect={() => onNavigate({ name: 'info' })}
        />

        <PhotoTile
          id="tile-store"
          area="store"
          overline={store?.eyebrow}
          label={store?.tile || getTvString('store_title', lang)}
          count={store?.entries.length}
          image={tileImage('store', tiles)}
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
