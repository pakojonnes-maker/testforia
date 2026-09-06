import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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

export type Route =
  | { name: 'home' }
  | { name: 'collection'; kind: CollectionKind }
  | { name: 'detail'; kind: CollectionKind; id: string }
  | { name: 'info' }
  | { name: 'info-detail'; id: string }
  | { name: 'wifi' }
  | { name: 'language' }

/** Nombre del evento `screen_view`: estable y legible en el panel de KPIs. */
function screenName(route: Route): string {
  return route.name === 'collection' || route.name === 'detail'
    ? `${route.name}:${route.kind}`
    : route.name
}

function Loading({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="t-display text-4xl font-bold" style={{ color: 'var(--tv-text-dim)' }}>
        {label}
      </div>
    </div>
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

  // Backspace/Escape = botón "atrás" del mando. Se registra una sola vez a
  // nivel de app para que ninguna pantalla tenga que reimplementarlo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'GoBack') {
        e.preventDefault()
        back()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back])

  const theme = useMemo(() => buildTheme(guide?.agency), [guide?.agency])
  // Tamaño físico de la tele: lo fija la instalación, no se puede detectar.
  const screenSize = useMemo(() => resolveScreenSize(guide?.device?.screen_size), [guide?.device?.screen_size])
  const collections = useMemo(() => (guide ? buildCollections(guide) : []), [guide])

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
        <MediterraneanBackground />

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
                    zoneName={guide.zone?.name || guide.apartment.name}
                    onOpen={entry => navigate({ name: 'detail', kind: entry.kind, id: entry.id })}
                  />
                )
              })()
            ) : route.name === 'detail' ? (
              activeEntry
                ? <DetailScreen entry={activeEntry} onBack={back} />
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
          </main>

          {/* "Atrás" alcanzable con el mando. Los detalles (recomendación o
              apartado de la casa) traen el suyo propio dentro del contenido,
              así que aquí sólo se pinta para el resto. */}
          {route.name !== 'home' && route.name !== 'detail' && route.name !== 'info-detail' && (
            <div className="shrink-0 pt-5">
              <Focusable id="app-back" onSelect={back} className="rounded-full">
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
