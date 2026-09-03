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

/** Holgura para que el escalado del elemento enfocado no lo saque de su banda. */
const EDGE_TOLERANCE = 10

/**
 * Vecino en una dirección, puntuando por BORDES Y SOLAPAMIENTO, no por centros.
 *
 * Con centros, en un mosaico de teselas desiguales la flecha derecha saltaba a
 * una tesela DIAGONAL (más pequeña y con el centro más cerca) en lugar de a la
 * que está literalmente al lado: para el huésped el mando parecía roto.
 *
 * Aquí un candidato que se solapa con la banda del elemento actual en el eje
 * perpendicular no paga penalización ninguna, así que siempre gana al diagonal
 * aunque su centro esté más lejos. Es como se comporta cualquier interfaz de TV.
 */
function nextInDirection(current: HTMLElement, items: Item[], dir: Dir): string | null {
  const cr = current.getBoundingClientRect()
  let best: string | null = null
  let bestScore = Infinity

  for (const it of items) {
    if (it.el === current) continue
    const r = it.el.getBoundingClientRect()

    // `primary` = hueco entre los bordes enfrentados; `band`/`self` = extensión
    // de cada uno en el eje perpendicular al movimiento.
    let primary: number
    let selfStart: number, selfEnd: number, bandStart: number, bandEnd: number

    if (dir === 'right') {
      if (r.left < cr.right - EDGE_TOLERANCE) continue
      primary = r.left - cr.right
      selfStart = cr.top; selfEnd = cr.bottom; bandStart = r.top; bandEnd = r.bottom
    } else if (dir === 'left') {
      if (r.right > cr.left + EDGE_TOLERANCE) continue
      primary = cr.left - r.right
      selfStart = cr.top; selfEnd = cr.bottom; bandStart = r.top; bandEnd = r.bottom
    } else if (dir === 'down') {
      if (r.top < cr.bottom - EDGE_TOLERANCE) continue
      primary = r.top - cr.bottom
      selfStart = cr.left; selfEnd = cr.right; bandStart = r.left; bandEnd = r.right
    } else {
      if (r.bottom > cr.top + EDGE_TOLERANCE) continue
      primary = cr.top - r.bottom
      selfStart = cr.left; selfEnd = cr.right; bandStart = r.left; bandEnd = r.right
    }

    const overlap = Math.min(selfEnd, bandEnd) - Math.max(selfStart, bandStart)
    // Sin solapamiento se penaliza fuerte: es lo que descarta los diagonales.
    const misalignment = overlap > 0 ? 0 : Math.max(selfStart - bandEnd, bandStart - selfEnd)
    // Desempate suave entre varios candidatos alineados: gana el más centrado.
    const centreGap = Math.abs((bandStart + bandEnd) / 2 - (selfStart + selfEnd) / 2)

    const score = Math.max(primary, 0) + misalignment * 4 + centreGap * 0.15
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
      if (!all.length) return

      const current = cur ? items.current.get(cur) : null

      /**
       * Al cambiar de pantalla, los elementos de la anterior se dan de baja
       * pero `focusedId` sigue apuntando a uno de ellos. Sin este reenganche
       * el mando se queda MUERTO: no hay elemento actual desde el que medir
       * distancias, así que ninguna flecha encuentra vecino. Se recupera el
       * foco en la primera pulsación, que además es cuando el huésped lo nota.
       */
      if (!current) {
        const first = all[0]
        focusedRef.current = first.id
        setFocusedId(first.id)
        e.preventDefault()
        return
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (current.onSelect) { e.preventDefault(); current.onSelect() }
        return
      }

      const dir: Dir | null =
        e.key === 'ArrowUp' ? 'up' :
        e.key === 'ArrowDown' ? 'down' :
        e.key === 'ArrowLeft' ? 'left' :
        e.key === 'ArrowRight' ? 'right' : null
      if (!dir) return
      e.preventDefault()
      const next = nextInDirection(current.el, all, dir)
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
