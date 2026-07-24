import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FocusProvider } from './lib/spatialNav'
import { MediterraneanBackground } from './components/MediterraneanBackground'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { WifiScreen } from './screens/WifiScreen'
import { GuideScreen } from './screens/GuideScreen'
import { NearbyScreen } from './screens/NearbyScreen'
import { InfoScreen } from './screens/InfoScreen'
import { MOCK_STAY } from './lib/mockData'
import { useGuidebook } from './lib/useGuidebook'
import { setTrackingContext, track } from './lib/tracking'

export type Screen = 'home' | 'wifi' | 'guide' | 'nearby' | 'info'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-[2rem] px-16 py-12 text-center backdrop-blur-xl"
        style={{ background: 'rgba(251,248,242,0.14)', border: '1px solid rgba(255,255,255,0.25)' }}>
        <div className="font-display text-4xl font-bold text-whitewash">{title}</div>
        <div className="mt-2 text-whitewash/75">Próximamente en el prototipo</div>
      </div>
    </div>
  )
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const stay = MOCK_STAY
  const { data: guide, pairingCode } = useGuidebook()

  useEffect(() => { setTrackingContext(pairingCode) }, [pairingCode])
  useEffect(() => { track('screen_view', { screen }) }, [screen])

  return (
    <FocusProvider>
      <div className="relative h-full w-full">
        <MediterraneanBackground />

        <div className="tv-safe">
          <TopBar brand={guide?.agency?.name || stay.hostBrand} />

          {/* Contenido (deja hueco arriba para el TopBar y abajo para el nav) */}
          <div className="absolute inset-x-0" style={{ top: '5.5rem', bottom: '7rem' }}>
            <motion.div
              key={screen}
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              {screen === 'home' && <WelcomeScreen stay={stay} onNavigate={setScreen} />}
              {screen === 'wifi' && <WifiScreen stay={stay} />}
              {screen === 'guide' && (guide ? <GuideScreen data={guide} /> : <Placeholder title="Cargando guía…" />)}
              {screen === 'nearby' && (guide ? <NearbyScreen data={guide} /> : <Placeholder title="Cargando…" />)}
              {screen === 'info' && (guide ? <InfoScreen data={guide} /> : <Placeholder title="Cargando…" />)}
            </motion.div>
          </div>

          <BottomNav active={screen} onNavigate={setScreen} />
        </div>
      </div>
    </FocusProvider>
  )
}
