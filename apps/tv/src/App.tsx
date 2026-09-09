import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { FocusProvider, Focusable } from './lib/spatialNav'
import { MediterraneanBackground } from './components/MediterraneanBackground'
import { Header } from './components/Header'
import { HomeScreen } from './screens/HomeScreen'
import { CollectionScreen } from './screens/CollectionScreen'
import { DetailScreen } from './screens/DetailScreen'
import { InfoScreen } from './screens/InfoScreen'
import { InfoDetailScreen } from './screens/InfoDetailScreen'
import { WifiScreen } from './screens/WifiScreen'
import { LanguageScreen } from './screens/LanguageScreen'
import { useGuidebook } from './lib/useGuidebook'
import { buildCollections, findCollection, type CollectionKind, type Entry } from './lib/collections'
import { buildTheme } from './lib/theme'
import { DEFAULT_LANG, isRtl } from './lib/languages'
import { densityFor, resolveScreenSize } from './lib/display'
import { setTrackingContext, track } from './lib/tracking'
import { tileImage } from './lib/tileImages'

export type Route =
  | { name: 'home' }
  | { name: 'collection'; kind: CollectionKind }
  | { name: 'detail'; kind: CollectionKind; id: string }
  | { name: 'info' }
  | { name: 'info-detail'; id: string }
  | { name: 'wifi' }
  | { name: 'language' }

/**
 * Superficie que la app expone al envoltorio nativo del APK. Hoy sólo el botón
 * atrás; si crece (apagar pantalla, salir de la app), este es el sitio.
 */
type TvBridgeWindow = Window & { vtTvBack?: () => boolean }

/** Nombre del evento `screen_view`: estable y legible en el panel de KPIs. */
function screenName(route: Route): string {
  return route.name === 'collection' || route.name === 'detail'
    ? `${route.name}:${route.kind}`
    : route.name
}

function Loading({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="t-display tv-title font-bold" style={{ color: 'var(--tv-text-dim)' }}>
        {label}
      </div>
    </div>
  )
}

/**
 * Papel: la superficie de las pantallas de CONTENIDO.
 *
 * El inicio se lee sobre la foto a cara descubierta porque allí todo es tesela.
 * En cuanto se entra en una ficha, el texto queda a pelo sobre una pared
 * encalada y desaparece. Descartados por el camino: sombrear cada cadena (sobre
 * un párrafo se ve sucio y barato), velar la foto entera (se apaga lo único que
 * daba sitio a la pantalla) y una tarjeta OSCURA (su borde duro la convierte en
 * una pegatina encima de la imagen).
 *
 * Lo que funciona es invertir la polaridad. Sobre una pared clara, papel: un
 * blanco cálido con sombra difusa y sin borde, que se lee como una hoja apoyada
 * en la habitación, no como un panel superpuesto. La foto se queda a plena luz
 * alrededor.
 *
 * El truco está en la última línea del estilo: aquí se REESCRIBEN los tokens de
 * tinta y superficie. Como las custom properties cascadean, las cinco pantallas
 * de dentro cambian de polaridad sin editar ni una línea de su código — siguen
 * pidiendo var(--tv-text) y ahora eso es azul noche en vez de blanco roto. El
 * acento de marca NO se toca: es el mismo terracota arriba y aquí.
 */
/** Rutas cuyo contenido es TEXTO y por tanto necesita hoja debajo. */
const PAPER_ROUTES = new Set<Route['name']>(['wifi', 'detail', 'info-detail', 'language'])

function Paper({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? <PaperSurface>{children}</PaperSurface> : <>{children}</>
}

function PaperSurface({ children }: { children: ReactNode }) {
  return (
    <>
      {/* El papel se pinta DETRÁS y crece hacia fuera con inset negativo, no
          envolviendo al contenido con relleno propio: estas pantallas están
          maquetadas para llenar el alto exacto de <main>, y un padding les
          robaba 80 px y sacaba la rejilla de Guías Rápidas de su caja. */}
      <div
        className="absolute -inset-5"
        style={{
          background: 'var(--tv-paper)',
          borderRadius: '2rem',
          // Sombra larga y muy abierta: a 3 m una sombra corta no se ve y la
          // hoja se queda pegada al fondo en vez de flotar sobre él.
          boxShadow: '0 32px 80px rgba(12, 32, 52, 0.28), 0 4px 12px rgba(12, 32, 52, 0.10)',
        }}
      />
      <div
        className="relative h-full"
        style={{
          '--tv-text': 'var(--tv-ink)',
          '--tv-text-dim': 'var(--tv-ink-dim)',
          '--tv-text-faint': 'var(--tv-ink-faint)',
          '--tv-surface': 'var(--tv-paper-raised)',
          '--tv-surface-raised': 'var(--tv-paper-raised)',
          '--tv-line': 'var(--tv-paper-line)',
        } as CSSProperties}
      >
        {children}
      </div>
    </>
  )
}

const STAGE_W = 1920
const STAGE_H = 1080

/**
 * Escenario de tamaño FIJO (1920×1080) escalado para caber en la pantalla real.
 *
 * Una TV puede ser 720p, 1080p o 4K, y maquetar con unidades relativas para las
 * tres deja la rejilla desbordada en la pequeña y con huecos en la grande —que
 * es exactamente lo que pasaba: el mosaico se salía por abajo en 720p. Diseñando
 * a una resolución y escalando, la pantalla se ve IDÉNTICA en todas.
 *
 * El escalado no rompe la navegación por mando: `getBoundingClientRect` devuelve
 * las coordenadas ya transformadas, así que las distancias que mide spatialNav
 * siguen siendo las que ve el huésped.
 */
function Stage({ density, children }: { density: number; children: ReactNode }) {
  // Declarar el lienzo más PEQUEÑO hace que el mismo contenido ocupe más
  // pantalla. Es el mando de "tamaño físico de la tele" de lib/display.ts:
  // el escenario ya resolvía la resolución, esto resuelve las pulgadas.
  const stageW = Math.round(STAGE_W / density)
  const stageH = Math.round(STAGE_H / density)
  const [box, setBox] = useState({ scale: 1, x: 0, y: 0 })

  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const scale = Math.min(vw / stageW, vh / stageH)
      setBox({ scale, x: (vw - stageW * scale) / 2, y: (vh - stageH * scale) / 2 })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [stageW, stageH])

  /**
   * El centrado va en la propia transformación, no delegado al layout: un
   * elemento de 1920 px dentro de un contenedor más estrecho DESBORDA, y ni
   * grid ni flex lo centran de forma fiable en ese caso (se alinean al inicio
   * para no cortar el contenido por arriba). Con `translate` explícito desde la
   * esquina superior izquierda la posición es exacta a cualquier resolución.
   */
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 top-0"
        style={{
          width: stageW,
          height: stageH,
          transform: `translate(${box.x}px, ${box.y}px) scale(${box.scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function App() {
  const [lang, setLang] = useState(DEFAULT_LANG)
  const { data: guide, pairingCode, usingMock, identifierAttempted } = useGuidebook(lang)

  // Pila de navegación en vez de una pantalla suelta: el botón "atrás" del
  // mando tiene que devolver al sitio del que se vino (detalle → sección →
  // inicio), no saltar siempre al inicio.
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }])
  const route = stack[stack.length - 1]

  const navigate = useCallback((next: Route) => {
    setStack(prev => (next.name === 'home' ? [{ name: 'home' }] : [...prev, next]))
  }, [])

  const back = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  useEffect(() => { setTrackingContext(pairingCode) }, [pairingCode])
  useEffect(() => { track('screen_view', { screen: screenName(route), lang }) }, [route, lang])

  // Profundidad de la pila en un ref: el puente nativo de abajo necesita saber
  // si hay algo a lo que volver SIN volver a registrarse en cada navegación.
  const stackDepth = useRef(1)
  stackDepth.current = stack.length

  /**
   * Botón "atrás", por las dos vías que existen.
   *
   * Teclado: Backspace/Escape (portátil en desarrollo, y los mandos que los
   * emiten) y 'BrowserBack', que es el valor real de la tecla de retroceso.
   * Antes había aquí un `'GoBack'` que NO es un valor válido de
   * `KeyboardEvent.key`: esa rama no se disparó nunca.
   *
   * Android: el botón atrás del mando es `KEYCODE_BACK`, un evento de Activity
   * que **no llega al WebView como keydown**. El envoltorio del APK tiene que
   * interceptar `onBackPressed()` y llamar a `window.vtTvBack()`. Devuelve
   * `true` si se consumió (había pantalla anterior) y `false` si ya estábamos
   * en el inicio — así el lado nativo sabe si dejar que el sistema haga lo suyo
   * en vez de tragarse la pulsación y dejar la app sin salida.
   */
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
      if (stackDepth.current <= 1) return false
      back()
      return true
    }

    return () => {
      window.removeEventListener('keydown', onKey)
      delete bridged.vtTvBack
    }
  }, [back])

  const theme = useMemo(() => buildTheme(guide?.agency), [guide?.agency])
  // Tamaño físico de la tele: lo fija la instalación, no se puede detectar.
  const screenSize = useMemo(() => resolveScreenSize(guide?.device?.screen_size), [guide?.device?.screen_size])
  const collections = useMemo(() => (guide ? buildCollections(guide, lang) : []), [guide, lang])

  const activeEntry: Entry | undefined = useMemo(() => {
    if (route.name !== 'detail') return undefined
    return findCollection(collections, route.kind)?.entries.find(e => e.id === route.id)
  }, [route, collections])

  const activeInfoItem = useMemo(() => {
    if (route.name !== 'info-detail') return undefined
    return guide?.apartment.info.find(i => i.id === route.id)
  }, [route, guide])

  const handleLanguage = useCallback((code: string) => {
    setLang(code)
    setStack([{ name: 'home' }])
  }, [])

  return (
    <FocusProvider>
      <div
        className="relative h-full w-full"
        style={theme.vars}
        dir={isRtl(lang) ? 'rtl' : 'ltr'}
        lang={lang}
      >
        <MediterraneanBackground image={tileImage('background', guide?.tv?.tiles)} />

        <Stage density={densityFor(screenSize)}>
        <div className="tv-safe flex flex-col">
          <div className="shrink-0 pb-8">
            <Header
              brand={guide?.agency?.name || 'VisualTaste'}
              property={guide?.apartment?.name || 'Pantalla de bienvenida'}
              logoUrl={guide?.agency?.logo_url || undefined}
              lang={lang}
              demoMode={usingMock && !!identifierAttempted}
            />
          </div>

          <main className="relative min-h-0 flex-1">
            {/* El papel va SÓLO donde hay texto corrido que antes iba en blanco:
                WiFi, la ficha de una recomendación, el detalle de un apartado de
                la casa y el selector de idioma. Las pantallas que son un
                catálogo de fichas con foto (inicio, Dónde comer / Qué hacer /
                Tienda, Guías Rápidas) NO lo llevan: sus tarjetas ya son
                superficie y traen su propio degradado, así que una hoja debajo
                sólo taparía la habitación sin resolver nada. */}
            <Paper on={PAPER_ROUTES.has(route.name) || !guide}>
            {!guide ? (
              <Loading label="Cargando…" />
            ) : route.name === 'home' ? (
              <HomeScreen data={guide} collections={collections} lang={lang} onNavigate={navigate} />
            ) : route.name === 'collection' ? (
              (() => {
                const collection = findCollection(collections, route.kind)
                if (!collection) return <Loading label="Sección no disponible" />
                return (
                  <CollectionScreen
                    collection={collection}
                    onOpen={entry => navigate({ name: 'detail', kind: entry.kind, id: entry.id })}
                  />
                )
              })()
            ) : route.name === 'detail' ? (
              activeEntry
                ? <DetailScreen entry={activeEntry} apartmentId={guide.apartment.id} onBack={back} />
                : <Loading label="Ficha no disponible" />
            ) : route.name === 'info' ? (
              <InfoScreen data={guide} lang={lang} onOpen={item => navigate({ name: 'info-detail', id: item.id })} />
            ) : route.name === 'info-detail' ? (
              activeInfoItem
                ? <InfoDetailScreen item={activeInfoItem} onBack={back} />
                : <Loading label="Apartado no disponible" />
            ) : route.name === 'wifi' ? (
              <WifiScreen data={guide} />
            ) : (
              <LanguageScreen
                available={guide.meta?.available_langs}
                current={lang}
                onSelect={handleLanguage}
              />
            )}
            </Paper>
          </main>

          {/* "Atrás" alcanzable con el mando. Los detalles (recomendación o
              apartado de la casa) traen el suyo propio dentro del contenido,
              así que aquí sólo se pinta para el resto. */}
          {route.name !== 'home' && route.name !== 'detail' && route.name !== 'info-detail' && (
            <div className="shrink-0 pt-5">
              <Focusable id="app-back" onSelect={back} className="w-fit rounded-full">
                <div
                  className="inline-flex items-center gap-3 rounded-full px-8 py-4 tv-body font-bold"
                  style={{ background: 'var(--tv-surface-raised)', color: 'var(--tv-text)' }}
                >
                  <span aria-hidden="true">←</span> Volver al inicio
                </div>
              </Focusable>
            </div>
          )}
        </div>
        </Stage>
      </div>
    </FocusProvider>
  )
}
