import { useEffect, useRef, useState, type CSSProperties } from 'react'
import QRCodeStyling from 'qr-code-styling'
import { Focusable } from '../lib/spatialNav'
import { CoverImage } from '../components/CoverImage'
import { getTvString } from '../lib/i18n'
import { DEFAULT_TILE_IMAGES } from '../lib/tileImages'
import { formatNow, useNow } from './clock'

/**
 * Piezas compartidas de «Mirador». Nada de iconos ni emoji (decisión de diseño):
 * la marca por defecto es el sol con dos olas de siempre, que ya era el respaldo
 * del logo en la cabecera clásica.
 */

export function Glyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" fill="currentColor" />
      <path d="M2 16c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M2 20c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

/** Sol en el lienzo: `[x, y, tamaño]` en px de 1920×1080, medidos desde el inicio de la línea. */
export type SunAt = readonly [x: number, y: number, size: number]

/**
 * Muro encalado con el sol. El resplandor del muro sigue al sol: en RTL el sol se
 * espeja (usa `inset-inline-start`), así que el centro del resplandor también.
 */
export function Backdrop({ image, sun, rtl }: { image: string; sun: SunAt; rtl: boolean }) {
  const [x, y, size] = sun
  const cx = rtl ? 1920 - (x + size / 2) : x + size / 2
  // Una foto que no es la de serie la ha subido el anfitrión: lleva velo (ver `.wall.custom`).
  const custom = image !== DEFAULT_TILE_IMAGES.background
  return (
    <>
      <div
        className={`wall${custom ? ' custom' : ''}`}
        style={{ backgroundImage: `url(${image})`, '--gx': `${cx}px`, '--gy': `${y + size / 2}px` } as CSSProperties}
      />
      <div className="sun" style={{ width: size, height: size, insetInlineStart: x, top: y }} />
    </>
  )
}

export function Brand({ name, logoUrl }: { name: string; logoUrl?: string }) {
  // Sin logo (o con la descarga rota) va el sol y las olas sobre el acento; con
  // logo, sobre papel, para que un PNG transparente no quede teñido de marca.
  const [broken, setBroken] = useState(false)
  const photo = Boolean(logoUrl) && !broken
  return (
    <div className="brand">
      <div className={`logo${photo ? ' photo' : ''}`}>
        <CoverImage src={logoUrl} className="" onUnavailable={setBroken} fallback={<Glyph />} />
      </div>
      <div className="bname">{name}</div>
    </div>
  )
}

/** Hora y fecha. La disposición (columna en el inicio, fila en las demás) la da el contenedor. */
export function Clock({ lang }: { lang: string }) {
  const now = useNow()
  const { time, date } = formatNow(lang, now)
  return (
    <div className="clk">
      <span className="t">{time}</span>
      <span className="d">{date}</span>
    </div>
  )
}

/** Cabecera de las pantallas de contenido: «Volver» + reloj. */
export function BackBar({ lang, onBack, autoFocus = false }: { lang: string; onBack: () => void; autoFocus?: boolean }) {
  return (
    <header className="hd">
      <Focusable id="back" autoFocus={autoFocus} onSelect={onBack} className="btn">
        {getTvString('back', lang)}
      </Focusable>
      <Clock lang={lang} />
    </header>
  )
}

/**
 * QR de módulos CUADRADOS y tinta oscura sobre blanco. El de la app clásica
 * (BrandedQr) va redondeado y con degradado: se ve bien, pero un QR que se
 * escanea desde el sofá, con el móvil a pulso, gana con bordes vivos y el máximo
 * contraste. `crispEdges` evita las costuras entre módulos cuando el tamaño no
 * es múltiplo del número de módulos.
 */
export function QrBox({ data, size }: { data: string; size: number }) {
  const box = useRef<HTMLDivElement>(null)
  const inner = size - 24 // 12 px de blanco alrededor: la «zona de silencio» del QR

  useEffect(() => {
    const el = box.current
    if (!el) return undefined
    const qr = new QRCodeStyling({
      width: inner, height: inner, type: 'svg', data, margin: 0,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { type: 'square', color: '#0C2A37' },
      cornersSquareOptions: { type: 'square', color: '#0C2A37' },
      cornersDotOptions: { type: 'square', color: '#0C2A37' },
      backgroundOptions: { color: '#ffffff' },
    })
    el.innerHTML = ''
    qr.append(el)
    el.querySelector('svg')?.setAttribute('shape-rendering', 'crispEdges')
    return () => { el.innerHTML = '' }
  }, [data, inner])

  return <div ref={box} className="qrbox" style={{ width: size, height: size }} />
}

/** Azulejo: cuatro pétalos y esquinas en cuarto de círculo. Decoración pura. */
export function AzulejoDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="mir-az" viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 5C57 24 76 43 95 50 76 57 57 76 50 95 43 76 24 57 5 50 24 43 43 24 50 5Z" />
          <circle cx="50" cy="50" r="9" fill="#fff" fillOpacity=".55" />
          <path fill="currentColor" d="M0 0h27A27 27 0 0 1 0 27ZM100 0v27A27 27 0 0 1 73 0ZM100 100H73a27 27 0 0 1 27-27ZM0 100V73a27 27 0 0 1 27 27Z" />
        </symbol>
      </defs>
    </svg>
  )
}

export function Az() {
  return (
    <svg className="az" aria-hidden="true">
      <use href="#mir-az" />
    </svg>
  )
}

/** Pantalla de carga y estados sin datos: el logo grande y una línea. */
export function Loading({ label }: { label: string }) {
  return (
    <div className="load">
      <div className="logo"><Glyph /></div>
      <div className="h1">{label}</div>
    </div>
  )
}

/**
 * Fondo de una tarjeta o de una foto SIN fotografía: el degradado del acento de
 * la marca, a plena saturación (rebajado parece una imagen que no ha cargado en
 * vez de una tarjeta sin foto a propósito). El filete interior existe para que
 * la silueta se lea siempre sobre el muro.
 */
export function NoPhoto() {
  return <div className="nophoto" />
}

/** «Sección no disponible» y parecidos: un aviso con «Volver» a mano. */
export function Aviso({ image, rtl, lang, label, onBack }: { image: string; rtl: boolean; lang: string; label: string; onBack: () => void }) {
  return (
    <>
      <Backdrop image={image} sun={[880, -120, 260]} rtl={rtl} />
      <BackBar lang={lang} onBack={onBack} autoFocus />
      <div className="load"><div className="h1">{label}</div></div>
    </>
  )
}
