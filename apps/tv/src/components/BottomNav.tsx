import { Focusable } from '../lib/spatialNav'
import { HomeIcon, WifiIcon, GuideIcon, MapIcon, InfoIcon } from './icons'
import type { Screen } from '../App'

const ITEMS: { key: Screen; label: string; Icon: (p: { size?: number }) => any }[] = [
  { key: 'home', label: 'Inicio', Icon: HomeIcon },
  { key: 'wifi', label: 'WiFi', Icon: WifiIcon },
  { key: 'guide', label: 'Guía', Icon: GuideIcon },
  { key: 'nearby', label: 'Alrededores', Icon: MapIcon },
  { key: 'info', label: 'Info', Icon: InfoIcon },
]

export function BottomNav({ active, onNavigate }: { active: Screen; onNavigate: (s: Screen) => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center">
      <div
        className="flex items-center gap-2 rounded-full p-2 backdrop-blur-md"
        style={{ background: 'rgba(6,42,58,0.34)', border: '1px solid rgba(255,255,255,0.16)' }}
      >
        {ITEMS.map(({ key, label, Icon }) => {
          const isActive = active === key
          return (
            <Focusable key={key} id={`nav-${key}`} onSelect={() => onNavigate(key)}>
              <div
                className="flex w-28 flex-col items-center gap-1 rounded-full px-3 py-3 transition-colors"
                style={{
                  background: isActive ? 'linear-gradient(135deg,#34c2c9,#128099)' : 'transparent',
                  color: isActive ? '#fbf8f2' : 'rgba(251,248,242,0.72)',
                }}
              >
                <Icon size={28} />
                <span className="text-sm font-semibold">{label}</span>
              </div>
            </Focusable>
          )
        })}
      </div>
    </div>
  )
}
