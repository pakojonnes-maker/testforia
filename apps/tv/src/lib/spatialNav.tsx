import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect,
  useRef, useState, type ReactNode,
} from 'react'

/**
 * Navegación espacial por mando (D-pad) para TV.
 *
 * Prototipo ligero y autónomo: registra cada elemento enfocable y, ante una
 * flecha del mando/teclado, salta al vecino geométricamente más cercano en esa
 * dirección. Enter/OK activa el elemento enfocado.
 *
 * En producción se sustituirá por `@noriginmedia/norigin-spatial-navigation`
 * (mismo contrato de <Focusable/>), pero para el prototipo esto es suficiente
 * y sin dependencias extra.
 */

type Dir = 'up' | 'down' | 'left' | 'right'
interface Item { id: string; el: HTMLElement; onSelect?: () => void }

interface FocusCtx {
  register: (id: string, el: HTMLElement, onSelect?: () => void) => void
  unregister: (id: string) => void
  focusedId: string | null
  setFocused: (id: string) => void
}

const Ctx = createContext<FocusCtx | null>(null)

export function useFocus() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useFocus must be used within <FocusProvider>')
  return ctx
}

function centre(r: DOMRect) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }

function nextInDirection(current: HTMLElement, items: Item[], dir: Dir): string | null {
  const c = centre(current.getBoundingClientRect())
  let best: string | null = null
  let bestScore = Infinity
  for (const it of items) {
    if (it.el === current) continue
    const r = centre(it.el.getBoundingClientRect())
    const dx = r.x - c.x
    const dy = r.y - c.y
    let primary: number, cross: number
    if (dir === 'left')  { if (dx > -8) continue; primary = -dx; cross = Math.abs(dy) }
    else if (dir === 'right') { if (dx < 8) continue; primary = dx; cross = Math.abs(dy) }
    else if (dir === 'up')    { if (dy > -8) continue; primary = -dy; cross = Math.abs(dx) }
    else { if (dy < 8) continue; primary = dy; cross = Math.abs(dx) }
    const score = primary + cross * 2
    if (score < bestScore) { bestScore = score; best = it.id }
  }
  return best
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const items = useRef<Map<string, Item>>(new Map())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const focusedRef = useRef<string | null>(null)
  focusedRef.current = focusedId

  const register = useCallback((id: string, el: HTMLElement, onSelect?: () => void) => {
    items.current.set(id, { id, el, onSelect })
    // Si aún no hay nada enfocado, enfoca el primero registrado.
    if (focusedRef.current == null) { focusedRef.current = id; setFocusedId(id) }
  }, [])

  const unregister = useCallback((id: string) => { items.current.delete(id) }, [])
  const setFocused = useCallback((id: string) => { setFocusedId(id) }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = focusedRef.current
      const all = [...items.current.values()]
      if (e.key === 'Enter' || e.key === ' ') {
        const item = cur ? items.current.get(cur) : null
        if (item?.onSelect) { e.preventDefault(); item.onSelect() }
        return
      }
      const dir: Dir | null =
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowLeft' ? 'left' :
        e.key === 'ArrowRight' ? 'right' : null
      if (!dir) return
      e.preventDefault()
      const curEl = cur ? items.current.get(cur)?.el : all[0]?.el
      if (!curEl) return
      const next = nextInDirection(curEl, all, dir)
      if (next) setFocusedId(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Ctx.Provider value={{ register, unregister, focusedId, setFocused }}>
      {children}
    </Ctx.Provider>
  )
}

interface FocusableProps {
  id: string
  onSelect?: () => void
  className?: string
  children: ReactNode
  autoFocus?: boolean
}

export function Focusable({ id, onSelect, className = '', children, autoFocus }: FocusableProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { register, unregister, focusedId, setFocused } = useFocus()
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  useLayoutEffect(() => {
    if (ref.current) register(id, ref.current, () => selectRef.current?.())
    return () => unregister(id)
  }, [id, register, unregister])

  useEffect(() => {
    if (autoFocus) setFocused(id)
  }, [autoFocus, id, setFocused])

  const focused = focusedId === id

  // Al enfocar, centra el elemento en su contenedor scrollable (carruseles).
  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [focused])
  return (
    <div
      ref={ref}
      className={`focusable ${className}`}
      data-focused={focused}
      onMouseEnter={() => setFocused(id)}
      onClick={() => selectRef.current?.()}
      role="button"
      tabIndex={-1}
    >
      {children}
    </div>
  )
}
