import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { FocusProvider } from '../lib/spatialNav'
import { useGuidebook } from '../lib/useGuidebook'
import { buildCollections, findCollection } from '../lib/collections'
import { DEFAULT_LANG, isRtl } from '../lib/languages'
import { getTvString } from '../lib/i18n'
import { setTrackingContext, track } from '../lib/tracking'
import { tileImage } from '../lib/tileImages'
import { buildMirTheme } from './theme'
import { moodAt, useNow } from './clock'
import { idleMsFromUrl, useIdle } from './useIdle'
import { screenName, type MirRoute } from './route'
import { Aviso, Backdrop, Loading } from './parts'
import { HOME_DEFAULT_FOCUS, Inicio } from './screens/Inicio'
import { Wifi } from './screens/Wifi'
import { Guias } from './screens/Guias'
import { Coleccion } from './screens/Coleccion'
import { Ficha } from './screens/Ficha'
import { Idioma } from './screens/Idioma'
import { Reposo } from './screens/Reposo'
import './mir.css'

/**
 * Carcasa de «Mirador»: el rediseño de sep-2026 (artefacto «TV Mediterránea»).
 *
 * La app clásica (App.tsx) sigue intacta y se abre con `?diseno=clasico`: es la
 * copia del diseño anterior por si el anfitrión se arrepiente. Comparten los
 * datos, el mando (spatialNav), las cadenas (i18n) y el tracking; no comparten
 * ni una línea de maquetación.
 *
 * Diferencias de fondo con la clásica:
 *  · Escenario de tamaño FIJO 1920×1080. La clásica lo redimensionaba según las
 *    pulgadas de la tele (`display.ts`); este diseño va a coordenadas exactas y
 *    no se deja comprimir sin desbordar. Hoy el backend ni manda `screen_size`.
 *  · Luz del día: la pantalla se gradúa con la hora (mañana, tarde, atardecer,
 *    noche). No hay animación: se recalcula con el reloj.
 *  · Reposo tras 90 s sin mando (`?reposo=<s>` lo cambia; 0 lo apaga).
 */

const STAGE_W = 1920
const STAGE_H = 1080

/** Escala el lienzo de 1920×1080 a la pantalla real, centrado y sin deformar. */
function Stage({ children }: { children: ReactNode }) {
  const [box, setBox] = useState({ scale: 1, x: 0, y: 0 })

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const scale = Math.min(vw / STAGE_W, vh / STAGE_H)
      setBox({ scale, x: (vw - STAGE_W * scale) / 2, y: (vh - STAGE_H * scale) / 2 })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // El centrado va en la propia transformación: un elemento de 1920 px dentro de
  // un contenedor más estrecho DESBORDA y ni grid ni flex lo centran (ver App.tsx).
  return (
    <div className="mir-canvas" style={{ transform: `translate(${box.x}px, ${box.y}px) scale(${box.scale})` }}>
      {children}
    </div>
  )
}

/** Superficie que la app expone al envoltorio nativo del APK (botón atrás). */
type TvBridgeWindow = Window & { vtTvBack?: () => boolean }

export function MirApp() {
  const [lang, setLang] = useState(DEFAULT_LANG)
  const { data: guide, pairingCode, usingMock, identifierAttempted } = useGuidebook(lang)

  // Pila de navegación: «atrás» devuelve al sitio del que se vino, no al inicio.
  const [stack, setStack] = useState<MirRoute[]>([{ name: 'home' }])
  const route = stack[stack.length - 1]
  // Al volver al inicio el foco cae en la fila de la que se salió.
  const homeFocus = useRef(HOME_DEFAULT_FOCUS)
  // Ídem al volver de una ficha a su colección: cae en la tarjeta de la que se salió,
  // no en la primera (con seis filas de tarjetas, volver al principio cansa).
  const collectionFocus = useRef<string | undefined>(undefined)

  const navigate = useCallback((next: MirRoute, fromFocusId?: string) => {
    if (fromFocusId) homeFocus.current = fromFocusId
    if (next.name === 'collection') collectionFocus.current = undefined
    setStack(prev => (next.name === 'home' ? [{ name: 'home' }] : [...prev, next]))
  }, [])

  const back = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  useEffect(() => { setTrackingContext(pairingCode) }, [pairingCode])
  useEffect(() => { track('screen_view', { screen: screenName(route), lang }) }, [route, lang])

  // «Atrás»: teclado (Backspace/Escape/BrowserBack) y el puente del APK. El
  // KEYCODE_BACK de Android no llega al WebView como keydown: el envoltorio llama
  // a `window.vtTvBack()`, que devuelve false en el inicio para que el sistema
  // haga lo suyo en vez de tragarse la pulsación.
  const depth = useRef(1)
  depth.current = stack.length
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'BrowserBack') {
        e.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    const bridged = window as TvBridgeWindow
    bridged.vtTvBack = () => {
      if (depth.current <= 1) return false
      back()
      return true
    }
    return () => {
      window.removeEventListener('keydown', onKey)
      delete bridged.vtTvBack
    }
  }, [back])

  const now = useNow()
  const mood = moodAt(now)
  const theme = useMemo(() => buildMirTheme(guide?.agency), [guide?.agency])
  const collections = useMemo(() => (guide ? buildCollections(guide, lang) : []), [guide, lang])
  const rtl = isRtl(lang)

  const idleMs = useMemo(() => idleMsFromUrl(window.location.search), [])
  const idle = useIdle(idleMs)
  useEffect(() => { if (idle) track('screen_view', { screen: 'idle', lang }) }, [idle, lang])

  const handleLanguage = useCallback((code: string) => {
    setLang(code)
    setStack([{ name: 'home' }])
  }, [])

  const wall = tileImage('background', guide?.tv?.tiles)

  let screen: ReactNode
  if (!guide) {
    screen = (
      <>
        <Backdrop image={wall} sun={[1590, -40, 330]} rtl={rtl} />
        <Loading label={getTvString('loading', lang)} />
      </>
    )
  } else if (route.name === 'home') {
    screen = (
      <Inicio
        data={guide}
        collections={collections}
        lang={lang}
        rtl={rtl}
        demoMode={usingMock && !!identifierAttempted}
        initialFocus={homeFocus.current}
        onNavigate={navigate}
      />
    )
  } else if (route.name === 'wifi') {
    screen = <Wifi data={guide} lang={lang} rtl={rtl} onBack={back} />
  } else if (route.name === 'info') {
    screen = <Guias data={guide} lang={lang} rtl={rtl} onBack={back} />
  } else if (route.name === 'language') {
    screen = <Idioma data={guide} lang={lang} rtl={rtl} onBack={back} onSelect={handleLanguage} />
  } else if (route.name === 'collection') {
    const collection = findCollection(collections, route.kind)
    screen = collection ? (
      <Coleccion
        data={guide}
        collection={collection}
        lang={lang}
        rtl={rtl}
        initialFocus={collectionFocus.current}
        onBack={back}
        onOpen={entry => {
          collectionFocus.current = `entry-${entry.id}`
          navigate({ name: 'detail', kind: entry.kind, id: entry.id })
        }}
      />
    ) : (
      <Aviso image={wall} rtl={rtl} lang={lang} label={getTvString('section_unavailable', lang)} onBack={back} />
    )
  } else {
    const entry = findCollection(collections, route.kind)?.entries.find(e => e.id === route.id)
    screen = entry ? (
      <Ficha data={guide} entry={entry} lang={lang} rtl={rtl} onBack={back} />
    ) : (
      <Aviso image={wall} rtl={rtl} lang={lang} label={getTvString('entry_unavailable', lang)} onBack={back} />
    )
  }

  return (
    <FocusProvider>
      <div className={`mir m-${mood}`} style={theme.vars} dir={rtl ? 'rtl' : 'ltr'} lang={lang}>
        <Stage>
          {screen}
          {idle && guide && <Reposo data={guide} collections={collections} lang={lang} />}
        </Stage>
      </div>
    </FocusProvider>
  )
}
