import type { ReactNode } from 'react'
import { Focusable } from '../lib/spatialNav'
import { CoverImage } from './CoverImage'

/**
 * Piezas del mosaico de inicio.
 *
 * Todas comparten radio, relleno y tratamiento del foco para que la rejilla se
 * lea como UN objeto y no como diez tarjetas sueltas. Lo que cambia entre ellas
 * es sólo el peso visual: foto a sangre para los destinos grandes, superficie
 * sólida para las utilidades.
 */

const RADIUS = '1.5rem'

interface BaseProps {
  id: string
  area: string
  autoFocus?: boolean
  onSelect?: () => void
  onFocus?: () => void
}

function Shell({
  id, area, autoFocus, onSelect, children, style,
}: BaseProps & { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ gridArea: area, minWidth: 0, minHeight: 0 }}>
      <Focusable id={id} autoFocus={autoFocus} onSelect={onSelect} className="h-full rounded-[1.5rem]">
        <div
          className="relative h-full w-full overflow-hidden"
          style={{ borderRadius: RADIUS, border: '1px solid var(--tv-line)', ...style }}
        >
          {children}
        </div>
      </Focusable>
    </div>
  )
}

/** Tesela grande con foto a sangre. Es el "destino" del mosaico. */
export function PhotoTile({
  id, area, autoFocus, onSelect, label, overline, image, count,
}: BaseProps & {
  label: string
  overline?: string
  image?: string
  /** Nº de fichas de la sección: da la sensación de catálogo, no de lista corta. */
  count?: number
}) {
  return (
    <Shell id={id} area={area} autoFocus={autoFocus} onSelect={onSelect}
      style={{ background: 'var(--tv-surface)' }}>
      <CoverImage
        src={image}
        fallback={
          <div
            className="absolute inset-0"
            // A plena saturación: rebajado quedaba gris y parecía una imagen que
            // no había cargado, en vez de una tesela sin foto a propósito.
            style={{ background: 'linear-gradient(140deg, var(--tv-accent) 0%, var(--tv-secondary) 100%)' }}
          />
        }
      />

      {/* Velo inferior: sin él el texto blanco desaparece sobre fotos claras.
          El degradado va desde abajo para no apagar la imagen entera.

          Las paradas van en PÍXELES, no en porcentajes. Con porcentajes el velo
          se estira con la tesela, y las de una sola fila (Tienda mide 140 px de
          alto) se quedaban con el antetítulo justo en la zona al 5 % — sobre la
          botella de aceite a contraluz, "PIDE A TU ANFITRIÓN" desaparecía. Lo
          que hay que proteger es el TEXTO, que siempre ocupa lo mismo, así que
          el velo se ata a su altura: cubre la tesela corta entera y en la
          grande sigue dejando ver la foto de la mitad para arriba. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(0deg,
            rgba(4,16,22,0.94) 0px,
            rgba(4,16,22,0.80) 90px,
            rgba(4,16,22,0.42) 170px,
            rgba(4,16,22,0.06) 250px)`,
        }}
      />

      <div className="absolute inset-x-0 bottom-0 p-7">
        {overline && (
          <div className="t-label mb-2" style={{ color: 'var(--tv-accent)' }}>{overline}</div>
        )}
        <div className="t-display tv-title font-bold" style={{ color: '#fff' }}>{label}</div>
        {typeof count === 'number' && count > 0 && (
          <div className="mt-2 tv-meta font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {count} {count === 1 ? 'recomendación' : 'recomendaciones'}
          </div>
        )}
      </div>
    </Shell>
  )
}

/** Tesela de utilidad: icono, etiqueta y, opcionalmente, un valor destacado. */
export function PlainTile({
  id, area, autoFocus, onSelect, icon, label, value, accent, compact, image,
}: BaseProps & {
  /**
   * Foto de fondo OPCIONAL. Existe para "Normas de la casa", que es una tesela
   * de utilidad —caja pequeña, tipografía de utilidad— pero también una de las
   * cuatro secciones con imagen propia. Con `PhotoTile` habría que subirla a
   * rótulo de 48 px en una caja de 213 px de alto y el texto se partía en tres
   * líneas; así se queda la maqueta que ya estaba ajustada y sólo cambia lo que
   * hay detrás.
   */
  image?: string
  /**
   * OPCIONAL, y hoy sólo lo usa la bandera del idioma. Los emoji decorativos
   * que llevaban estas teselas (📋, 📶, 🕚) se quitaron: cada uno estaba pegado
   * a una etiqueta que ya decía lo mismo. Si vuelve a hacer falta un icono
   * aquí, que sea un nodo real (SVG o imagen), nunca un carácter emoji — ver
   * lib/languages.ts sobre por qué no son fiables en esta plataforma.
   */
  icon?: ReactNode
  label: string
  value?: string
  /** Pinta la tesela con el color de marca: se reserva a UNA por rejilla. */
  accent?: boolean
  /** Contenido centrado en una sola fila — para valores de una palabra
   *  (idioma, hora) donde el patrón etiqueta-abajo dejaba la tesela con mucho
   *  hueco muerto alrededor de casi nada. */
  compact?: boolean
}) {
  // Sobre foto, la jerarquía por tono (`--tv-text-dim` para el pie) desaparece:
  // cualquier gris sobre una imagen se lee como texto apagado, no como segundo
  // nivel. Con imagen se pasa a blanco pleno y el peso lo marca el tamaño.
  const onPhoto = Boolean(image) && !accent
  const ink = accent ? 'var(--tv-accent-ink)' : onPhoto ? '#fff' : 'var(--tv-text)'
  const inkDim = accent
    ? 'var(--tv-accent-ink)'
    : onPhoto ? 'rgba(255,255,255,0.78)' : 'var(--tv-text-dim)'
  const inkFaint = accent
    ? 'var(--tv-accent-ink)'
    : onPhoto ? 'rgba(255,255,255,0.72)' : 'var(--tv-text-faint)'

  return (
    <Shell id={id} area={area} autoFocus={autoFocus} onSelect={onSelect}
      style={{
        background: accent ? 'var(--tv-accent)' : 'var(--tv-surface)',
        border: accent ? '1px solid transparent' : '1px solid var(--tv-line)',
      }}>
      {onPhoto && (
        <>
          <CoverImage src={image} fallback={null} />
          {/* Más cerrado que el velo de PhotoTile: aquí el texto no vive sólo
              abajo, así que la foto tiene que ceder en toda la caja. */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(0deg, rgba(4,16,22,0.90) 0%, rgba(4,16,22,0.62) 55%, rgba(4,16,22,0.34) 100%)' }}
          />
        </>
      )}

      {compact ? (
        <div className="relative flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          {/* La etiqueta pasa a ser un antetítulo visible. En compacto sólo se
              pintaba `value`, y el icono era lo único que insinuaba de qué iba:
              sin el reloj, "15:00 · 11:00" era un número desnudo. Ahora lo dice
              el texto, que además es lo que sí se lee a 3 m. */}
          {value && (
            <div className="t-label" style={{ color: inkFaint }}>
              {label}
            </div>
          )}
          <div className="flex min-w-0 items-center justify-center gap-3">
            {icon && <span className="shrink-0 leading-none">{icon}</span>}
            <span
              className="t-display truncate tv-card font-bold"
              style={{ color: ink }}
            >
              {value || label}
            </span>
          </div>
        </div>
      ) : (
        // Sin icono el contenido se ancla ABAJO, como el rótulo de PhotoTile:
        // con `justify-between` y un solo hijo se quedaba pegado arriba.
        <div className={`relative flex h-full flex-col p-6 ${icon ? 'justify-between' : 'justify-end'}`}>
          {icon && (
            <div className="text-5xl leading-none" style={{ color: accent ? 'var(--tv-accent-ink)' : 'var(--tv-accent)' }}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {value && (
              <div
                className="t-display truncate tv-lead font-bold"
                style={{ color: ink }}
              >
                {value}
              </div>
            )}
            <div
              className={`clamp-2 font-semibold leading-tight ${value ? 'tv-meta' : 'tv-card'}`}
              style={{
                // Sin valor encima, la etiqueta ES el titulo de la tesela y va a plena
                // tinta; con valor pasa a ser su pie y baja de jerarquia.
                color: value ? inkDim : ink,
                opacity: accent ? 0.82 : 1,
              }}
            >
              {label}
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

/** Código de entrada: el dato que más veces se mira y se teclea mal. */
export function CodeTile({
  id, area, autoFocus, onSelect, title, code,
}: BaseProps & { title: string; code: string }) {
  return (
    <Shell id={id} area={area} autoFocus={autoFocus} onSelect={onSelect}
      style={{ background: 'linear-gradient(150deg, var(--color-terracotta), var(--color-ink))' }}>
      <div className="flex h-full flex-col justify-between p-6">
        <div className="t-label" style={{ color: 'rgba(255,255,255,0.85)' }}>{title}</div>
        {/* tabular-nums + tracking ancho: un código se lee dígito a dígito
            desde el sofá, no como una palabra. */}
        <div
          className="t-display truncate text-5xl font-bold tabular-nums"
          style={{ color: '#fff', letterSpacing: '0.12em' }}
        >
          {code}
        </div>
      </div>
    </Shell>
  )
}

/**
 * WiFi: la razón número uno por la que un huésped mira esta pantalla, así que
 * vive en el inicio con el QR ya escaneable — no detrás de un menú.
 */
export function WifiTile({
  id, area, autoFocus, onSelect, ssid, password, qr,
}: BaseProps & { ssid: string; password: string; qr: ReactNode }) {
  return (
    <Shell id={id} area={area} autoFocus={autoFocus} onSelect={onSelect}
      style={{ background: 'var(--tv-surface-raised)' }}>
      <div className="flex h-full flex-col items-center justify-between p-6 text-center">
        <div className="w-full">
          <div className="t-label" style={{ color: 'var(--tv-accent)' }}>Conéctate</div>
          <div className="t-display mt-1.5 tv-card font-bold" style={{ color: 'var(--tv-text)' }}>
            WiFi de la casa
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-lg">{qr}</div>

        <div className="w-full">
          <p className="tv-meta leading-snug" style={{ color: 'var(--tv-text-dim)' }}>
            Apunta la cámara del móvil: se conecta solo.
          </p>
          <div
            className="mt-3 grid gap-2 rounded-xl px-4 py-3 text-left"
            style={{ background: 'rgba(0,0,0,0.28)' }}
          >
            <Credential label="Red" value={ssid} />
            <Credential label="Clave" value={password} />
          </div>
        </div>
      </div>
    </Shell>
  )
}

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="t-label shrink-0" style={{ color: 'var(--tv-text-faint)' }}>
        {label}
      </span>
      {/* La contraseña puede ser larga y no se puede recortar: quien no pueda
          escanear tiene que poder teclearla, así que se parte en varias líneas. */}
      <span className="min-w-0 break-all tv-meta font-semibold" style={{ color: 'var(--tv-text)' }}>
        {value}
      </span>
    </div>
  )
}
