import type { ReactNode } from 'react'
import { Focusable } from '../lib/spatialNav'

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
      <Focusable id={id} autoFocus={autoFocus} onSelect={onSelect} className="h-full">
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
      {image ? (
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          // A plena saturación: rebajado quedaba gris y parecía una imagen que
          // no había cargado, en vez de una tesela sin foto a propósito.
          style={{ background: 'linear-gradient(140deg, var(--tv-accent) 0%, var(--tv-secondary) 100%)' }}
        />
      )}

      {/* Velo inferior: sin él el texto blanco desaparece sobre fotos claras.
          El degradado va desde abajo para no apagar la imagen entera. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(0deg, rgba(4,16,22,0.92) 0%, rgba(4,16,22,0.55) 34%, rgba(4,16,22,0.05) 68%)' }}
      />

      <div className="absolute inset-x-0 bottom-0 p-7">
        {overline && (
          <div className="t-label mb-2" style={{ color: 'var(--tv-accent)' }}>{overline}</div>
        )}
        <div className="t-display text-4xl font-bold" style={{ color: '#fff' }}>{label}</div>
        {typeof count === 'number' && count > 0 && (
          <div className="mt-1.5 text-base font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>
            {count} {count === 1 ? 'recomendación' : 'recomendaciones'}
          </div>
        )}
      </div>
    </Shell>
  )
}

/** Tesela de utilidad: icono, etiqueta y, opcionalmente, un valor destacado. */
export function PlainTile({
  id, area, autoFocus, onSelect, icon, label, value, accent,
}: BaseProps & {
  icon: ReactNode
  label: string
  value?: string
  /** Pinta la tesela con el color de marca: se reserva a UNA por rejilla. */
  accent?: boolean
}) {
  return (
    <Shell id={id} area={area} autoFocus={autoFocus} onSelect={onSelect}
      style={{
        background: accent ? 'var(--tv-accent)' : 'var(--tv-surface)',
        border: accent ? '1px solid transparent' : '1px solid var(--tv-line)',
      }}>
      <div className="flex h-full flex-col justify-between p-6">
        <div className="text-3xl leading-none" style={{ color: accent ? 'var(--tv-accent-ink)' : 'var(--tv-accent)' }}>
          {icon}
        </div>
        <div className="min-w-0">
          {value && (
            <div
              className="t-display truncate text-3xl font-bold"
              style={{ color: accent ? 'var(--tv-accent-ink)' : 'var(--tv-text)' }}
            >
              {value}
            </div>
          )}
          <div
            className="clamp-2 text-base font-semibold leading-tight"
            style={{
              // Sin valor encima, la etiqueta ES el titulo de la tesela y va a plena
              // tinta; con valor pasa a ser su pie y baja de jerarquia.
              color: accent ? 'var(--tv-accent-ink)' : value ? 'var(--tv-text-dim)' : 'var(--tv-text)',
              opacity: accent ? 0.82 : 1,
            }}
          >
            {label}
          </div>
        </div>
      </div>
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
          <div className="t-display mt-1.5 text-2xl font-bold" style={{ color: 'var(--tv-text)' }}>
            WiFi de la casa
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-lg">{qr}</div>

        <div className="w-full">
          <p className="text-sm leading-snug" style={{ color: 'var(--tv-text-dim)' }}>
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
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--tv-text-faint)' }}>
        {label}
      </span>
      {/* La contraseña puede ser larga y no se puede recortar: quien no pueda
          escanear tiene que poder teclearla, así que se parte en varias líneas. */}
      <span className="min-w-0 break-all text-sm font-semibold" style={{ color: 'var(--tv-text)' }}>
        {value}
      </span>
    </div>
  )
}
