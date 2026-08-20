import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// Generic, dumb bottom sheet: snap points + drag. Knows nothing about POIs —
// ExploreSection decides what goes in `header`/`children`. Built without a
// gesture library (apps/guide has none, see package.json) using the same
// transform-driven approach as the tab swipe in GuidebookPage.tsx.
//
// Reparto de eventos a propósito: el tirador usa Pointer Events (cubre ratón y
// stylus además del dedo, y con touch-action:none no hay scroll nativo que
// compita), mientras que la lista se queda en Touch Events porque el navegador
// cancela los pointer events en cuanto decide que un gesto es scroll — y es
// justo ahí donde hay que seguir el dedo para el traspaso lista→hoja.
export type SheetSnap = 'peek' | 'half' | 'full';

const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full'];

// Un flick por encima de esto (px/ms) manda sobre la distancia recorrida.
const VELOCITY_THRESHOLD = 0.35;
// Ventana sobre la que se promedia la velocidad. Medirla con el último par de
// eventos hacía que un flick se perdiera si el dedo se frenaba un frame antes
// de levantarse, que es exactamente lo que hace todo el mundo al soltar.
const VELOCITY_WINDOW_MS = 100;
// Por debajo de esto el gesto es un tap, no un arrastre.
const DRAG_SLOP_PX = 6;
// Cuánto cuesta pasarse de los topes. Sin esto la hoja se clavaba en seco
// contra el límite mientras el dedo seguía moviéndose: se sentía rota, no
// "hasta aquí".
const OVERDRAG_RESISTANCE = 0.35;

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Height of the collapsed ("peek") state in px — varies with content (e.g. taller once a POI is selected). */
  peekHeight: number;
  /** Fixed content inside the drag handle zone, visible at every snap level (e.g. a result count or a mini POI card). */
  header?: React.ReactNode;
  /** Etiqueta accesible del tirador (el componente es genérico y no conoce el idioma). */
  toggleLabel?: string;
  children: React.ReactNode;
}

export default function BottomSheet({ snap, onSnapChange, peekHeight, header, toggleLabel, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // The sheet is `absolute inset-x-0 bottom-0 h-full` inside its (relative,
  // fixed-height) parent, so the sheet's OWN offsetHeight already equals the
  // parent's content height — no separate parent measurement needed.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const measure = () => setContainerHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const snapPx = useMemo(() => {
    const half = Math.round(containerHeight * 0.5);
    return {
      peek: Math.min(peekHeight, containerHeight || peekHeight),
      half: Math.max(half, peekHeight),
      full: containerHeight,
    };
  }, [containerHeight, peekHeight]);

  const translateFor = (s: SheetSnap) => containerHeight - (snapPx[s] || 0);

  const applyTransform = (ty: number, durationMs = 0) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = durationMs > 0 ? `transform ${durationMs}ms cubic-bezier(0.16,1,0.3,1)` : 'none';
    el.style.transform = `translateY(${ty}px)`;
  };

  // Una animación de duración fija hacía que un flick violento y un ajuste de
  // 3px tardasen lo mismo: el primero se sentía lento y el segundo perezoso.
  const durationFor = (distance: number, velocity: number) => {
    const v = Math.max(Math.abs(velocity), 0.3);
    return Math.min(420, Math.max(180, Math.round(distance / v)));
  };

  // Drag state lives in a ref, not React state: the transform is written
  // straight to the DOM node on every move (needs to track the finger at
  // 60fps) and React only learns about it once, on release, via onSnapChange.
  const dragRef = useRef({
    active: false,
    startY: 0,
    startTranslate: 0,
    currentTy: 0,
    moved: 0,
    samples: [] as Array<{ y: number; t: number }>,
  });
  // El header lleva dentro la PoiCard, que es un <button> a pantalla completa:
  // sin esto, un micro-arrastre sobre la tarjeta abría la ficha del POI en vez
  // de mover la hoja.
  const suppressClickRef = useRef(false);

  // Keep the DOM in sync with `snap`/measured height when they change from
  // OUTSIDE a gesture (tab switch, selecting a POI changes peekHeight, window
  // resize). Skipped mid-drag so it doesn't fight the live touch, and skipped
  // when it would just repeat the settle animation endDrag already started
  // (which would override its velocity-matched duration with a generic one).
  const hasPositionedRef = useRef(false);
  const appliedRef = useRef<{ snap: SheetSnap; peek: number; height: number } | null>(null);
  useEffect(() => {
    if (dragRef.current.active || !containerHeight) return;
    const a = appliedRef.current;
    if (a && a.snap === snap && a.peek === peekHeight && a.height === containerHeight) return;
    // The very first time we have a real containerHeight, snap the sheet to its
    // starting position INSTANTLY (no transition) instead of animating into
    // place from translateY(0): that's "fully expanded", so the sheet would
    // visibly cover the whole map for a beat on every mount.
    applyTransform(translateFor(snap), hasPositionedRef.current ? 260 : 0);
    appliedRef.current = { snap, peek: peekHeight, height: containerHeight };
    hasPositionedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, containerHeight, peekHeight]);

  const clampTranslate = (ty: number) => {
    const min = 0; // fully expanded (full)
    const max = Math.max(0, containerHeight - snapPx.peek); // fully collapsed (peek)
    if (ty < min) return min + (ty - min) * OVERDRAG_RESISTANCE;
    if (ty > max) return max + (ty - max) * OVERDRAG_RESISTANCE;
    return ty;
  };

  const nearestSnap = (ty: number): SheetSnap =>
    SNAP_ORDER.reduce((best, s) => (Math.abs(ty - translateFor(s)) < Math.abs(ty - translateFor(best)) ? s : best), 'peek' as SheetSnap);

  // El escalón se cuenta desde DONDE ESTÁ la hoja, no desde el snap confirmado
  // la última vez: partiendo de `snap` (que no se actualiza durante el gesto),
  // arrastrar desde peek hasta arriba del todo y soltar con impulso devolvía la
  // hoja a half, deshaciendo el gesto que se acababa de hacer.
  const stepSnap = (dir: 'up' | 'down', fromTy: number): SheetSnap => {
    const idx = SNAP_ORDER.indexOf(nearestSnap(fromTy));
    const nextIdx = dir === 'up' ? Math.min(idx + 1, SNAP_ORDER.length - 1) : Math.max(idx - 1, 0);
    return SNAP_ORDER[nextIdx];
  };

  const computeVelocity = () => {
    const samples = dragRef.current.samples;
    if (samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    let first = last;
    for (let i = samples.length - 1; i >= 0; i--) {
      if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break;
      first = samples[i];
    }
    const dt = last.t - first.t;
    return dt > 0 ? (last.y - first.y) / dt : 0;
  };

  const beginDrag = (clientY: number) => {
    const d = dragRef.current;
    const el = sheetRef.current;
    // Read the ACTUAL rendered transform (not the assumed snapped position),
    // so grabbing the sheet mid-animation doesn't cause a jump.
    let startTy = translateFor(snap);
    if (el) {
      const computed = getComputedStyle(el).transform;
      if (computed && computed !== 'none') {
        startTy = new DOMMatrixReadOnly(computed).m42;
      }
    }
    d.active = true;
    d.startY = clientY;
    d.startTranslate = startTy;
    d.currentTy = startTy;
    d.moved = 0;
    d.samples = [{ y: clientY, t: performance.now() }];
  };

  const moveDrag = (clientY: number) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.samples.push({ y: clientY, t: performance.now() });
    if (d.samples.length > 12) d.samples.shift();
    const dy = clientY - d.startY;
    d.moved = Math.max(d.moved, Math.abs(dy));
    const ty = clampTranslate(d.startTranslate + dy);
    d.currentTy = ty;
    applyTransform(ty);
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (d.moved > DRAG_SLOP_PX) suppressClickRef.current = true;

    const velocity = computeVelocity();
    // Negative velocity = finger moved up = expand; positive = collapse.
    const next = Math.abs(velocity) > VELOCITY_THRESHOLD
      ? stepSnap(velocity < 0 ? 'up' : 'down', d.currentTy)
      : nearestSnap(d.currentTy);

    const target = translateFor(next);
    appliedRef.current = { snap: next, peek: peekHeight, height: containerHeight };
    onSnapChange(next);
    applyTransform(target, durationFor(Math.abs(target - d.currentTy), velocity));
  };

  // --- Tirador: captura el gesto de inmediato (touch-action: none).
  const onHandlePointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    // Algunos navegadores lanzan si el puntero ya no está activo (o si el
    // evento es sintético); la captura es una mejora, no un requisito.
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* noop */ }
    beginDrag(e.clientY);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    moveDrag(e.clientY);
  };

  // Tocar el tirador recorre los tamaños: mucha gente toca antes de arrastrar,
  // y hasta ahora un tap no hacía absolutamente nada.
  const cycleSnap = () => {
    if (suppressClickRef.current) return;
    const idx = SNAP_ORDER.indexOf(snap);
    onSnapChange(SNAP_ORDER[(idx + 1) % SNAP_ORDER.length]);
  };

  // --- Lista: en `full` scrollea (y solo cede el gesto al tirar hacia abajo
  // desde arriba del todo); en peek/half el gesto es de la hoja. Antes la lista
  // scrolleaba SIEMPRE, así que arrastrar hacia arriba sobre ella movía el
  // contenido dentro de una ventana diminuta en vez de agrandar la hoja: justo
  // al revés que en Google Maps o Apple Maps.
  const listGestureRef = useRef({ startY: 0, deciding: false });
  const onListTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    listGestureRef.current.startY = e.touches[0].clientY;
    listGestureRef.current.deciding = true;
  };
  const onListTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const d = dragRef.current;
    const clientY = e.touches[0].clientY;
    if (d.active) {
      moveDrag(clientY);
      return;
    }
    if (!listGestureRef.current.deciding) return;
    const dy = clientY - listGestureRef.current.startY;
    if (Math.abs(dy) < DRAG_SLOP_PX) return;
    listGestureRef.current.deciding = false;
    const atTop = !listRef.current || listRef.current.scrollTop <= 0;
    if (snap !== 'full' || (atTop && dy > 0)) {
      beginDrag(listGestureRef.current.startY);
      moveDrag(clientY);
    }
  };
  const onListTouchEnd = () => {
    listGestureRef.current.deciding = false;
    endDrag();
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={sheetRef}
      data-no-tab-swipe
      className="absolute inset-x-0 bottom-0 h-full flex flex-col bg-background border-t border-on-background/10 shadow-[0_-8px_24px_rgba(0,0,0,0.10)]"
      style={{ willChange: 'transform' }}
    >
      <div
        data-no-tab-swipe
        style={{ touchAction: 'none' }}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className="shrink-0 flex flex-col"
      >
        {/* min-h-11 = los 44px de área táctil mínima alrededor de un tirador
            que se ve: la barra de 40x4px anterior era un pelo decorativo
            (aria-hidden, no pulsable) al que había que apuntar. Si cambia esta
            altura hay que actualizar SHEET_HANDLE_CHROME_PX en
            ExploreSection.tsx, que mide el peek contra ella. */}
        <button
          type="button"
          onClick={cycleSnap}
          aria-label={toggleLabel}
          aria-expanded={snap !== 'peek'}
          className="w-full flex items-center justify-center min-h-11 cursor-grab active:cursor-grabbing"
        >
          <span className="w-12 h-1.5 rounded-full bg-on-background/25" />
        </button>
        {header}
      </div>
      <div
        ref={listRef}
        data-no-tab-swipe
        style={{
          // En peek/half el navegador no debe scrollear la lista: el gesto es
          // para agrandar la hoja, y dejar el scroll nativo activo hacía que se
          // movieran las dos cosas a la vez.
          touchAction: snap === 'full' ? 'pan-y' : 'none',
          overscrollBehavior: 'contain',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onTouchStart={onListTouchStart}
        onTouchMove={onListTouchMove}
        onTouchEnd={onListTouchEnd}
        onTouchCancel={onListTouchEnd}
        onClickCapture={onClickCapture}
        className="hide-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
        {children}
      </div>
    </div>
  );
}
