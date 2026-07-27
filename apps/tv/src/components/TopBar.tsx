import { useEffect, useState } from 'react'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 20)
    return () => clearInterval(t)
  }, [])
  return now
}

export function TopBar({ brand, demoMode }: { brand: string; demoMode?: boolean }) {
  const now = useClock()
  const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="absolute inset-x-0 top-0 flex items-start justify-between">
      {/* Marca del anfitrión */}
      <div className="flex items-center gap-3">
        <div
          className="grid h-12 w-12 place-items-center rounded-2xl text-whitewash shadow-lg"
          style={{ background: 'linear-gradient(135deg, #34c2c9, #128099)' }}
        >
          {/* marca sol + ola */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3.4" fill="#fff4dd" />
            <path d="M2 16c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2"
              stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M2 20c2.2 0 2.2 2 4.5 2s2.3-2 4.5-2 2.2 2 4.5 2 2.3-2 4.5-2"
              stroke="#eafffb" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          </svg>
        </div>
        <div className="leading-tight text-whitewash drop-shadow">
          <div className="flex items-center gap-2">
            <div className="font-display text-2xl font-semibold">{brand}</div>
            {demoMode && (
              <div className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-whitewash"
                style={{ background: 'rgba(224,122,95,0.85)' }}>
                Modo demo
              </div>
            )}
          </div>
          <div className="text-xs uppercase tracking-[0.25em] opacity-80">Powered by VisualTaste</div>
        </div>
      </div>

      {/* Reloj */}
      <div
        className="rounded-2xl px-5 py-2 text-right text-whitewash backdrop-blur-md"
        style={{ background: 'rgba(6,42,58,0.32)', border: '1px solid rgba(255,255,255,0.18)' }}
      >
        <div className="text-3xl font-semibold tabular-nums">{time}</div>
        <div className="text-xs capitalize opacity-85">{date}</div>
      </div>
    </div>
  )
}
