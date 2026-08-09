import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// Generic, dumb bottom sheet: snap points + drag. Knows nothing about POIs —
// ExploreSection decides what goes in `header`/`children`. Built without a
// gesture library (apps/guide has none, see package.json) using the same
// touch-event + transform approach as the tab swipe in GuidebookPage.tsx.
//
// IMPORTANT: this only listens to touch events, not mouse — same choice the
// existing tab-swipe code already made. Desktop gets a completely different
// layout (a static side panel, see ExploreSection's md: branch), so there's
// no product need for a mouse-draggable sheet.
export type SheetSnap = 'peek' | 'half' | 'full';

const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full'];

// A flick faster than this (px/ms) always advances one snap step in that
// direction, regardless of how far the sheet actually travelled — matches
// how native bottom sheets (and the existing tab swipe) feel more responsive
// than a pure distance threshold.
const VELOCITY_THRESHOLD = 0.5;

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Height of the collapsed ("peek") state in px — varies with content (e.g. taller once a POI is selected). */
  peekHeight: number;
  /** Fixed content inside the drag handle zone, visible at every snap level (e.g. a result count or a mini POI card). */
  header?: React.ReactNode;
  children: React.ReactNode;
}

export default function BottomSheet({ snap, onSnapChange, peekHeight, header, children }: BottomSheetProps) {
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

  const applyTransform = (ty: number, withTransition: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = withTransition ? 'transform 260ms cubic-bezier(0.16,1,0.3,1)' : 'none';
    el.style.transform = `translateY(${ty}px)`;
  };

  // Drag state lives in a ref, not React state: the transform is written
  // straight to the DOM node on every touchmove (needs to track the finger
  // at 60fps) and React only learns about it once, on release, via
  // onSnapChange. Re-rendering on every move would fight the browser's own
  // compositing of the transform.
  const dragRef = useRef({
    active: false,
    startY: 0,
    startTranslate: 0,
    currentTy: 0,
    lastY: 0,
    lastT: 0,
    velocity: 0,
  });

  // Keep the DOM in sync with `snap`/measured height when they change from
  // OUTSIDE a gesture (tab switch, selecting a POI changes peekHeight, window
  // resize). Skipped mid-drag so it doesn't fight the live touch.
  // The very first time we have a real containerHeight, snap the sheet to its
  // starting position INSTANTLY (no transition) instead of animating into
  // place from translateY(0). Two reasons: (1) translateY(0) is "fully
  // expanded", so relying on a 260ms transition to get from there to peek
  // means the sheet visibly covers the whole map for a beat on every mount;
  // (2) a transition that starts before the tab is fully visible/composited
  // can end up stuck showing its `from` frame indefinitely in some browsers,
  // leaving the sheet expanded until something else forces a style recalc.
  const hasPositionedRef = useRef(false);
  useEffect(() => {
    if (dragRef.current.active || !containerHeight) return;
    applyTransform(translateFor(snap), hasPositionedRef.current);
    hasPositionedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, containerHeight, peekHeight]);

  const clampTranslate = (ty: number) => {
    const min = 0; // fully expanded (full)
    const max = containerHeight - snapPx.peek; // fully collapsed (peek)
    return Math.min(max, Math.max(min, ty));
  };

  const nearestSnap = (ty: number): SheetSnap =>
    SNAP_ORDER.reduce((best, s) => (Math.abs(ty - translateFor(s)) < Math.abs(ty - translateFor(best)) ? s : best), 'peek' as SheetSnap);

  const stepSnap = (dir: 'up' | 'down'): SheetSnap => {
    const idx = SNAP_ORDER.indexOf(snap);
    const nextIdx = dir === 'up' ? Math.min(idx + 1, SNAP_ORDER.length - 1) : Math.max(idx - 1, 0);
    return SNAP_ORDER[nextIdx];
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
    d.lastY = clientY;
    d.lastT = performance.now();
    d.velocity = 0;
  };

  const moveDrag = (clientY: number) => {
    const d = dragRef.current;
    if (!d.active) return;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.velocity = (clientY - d.lastY) / dt;
    d.lastY = clientY;
    d.lastT = now;
    const dy = clientY - d.startY;
    const ty = clampTranslate(d.startTranslate + dy);
    d.currentTy = ty;
    applyTransform(ty, false);
  };

  const endDrag = () => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    let next: SheetSnap;
    if (Math.abs(d.velocity) > VELOCITY_THRESHOLD) {
      // Negative dy/velocity = finger moved up = expand; positive = collapse.
      next = stepSnap(d.velocity < 0 ? 'up' : 'down');
    } else {
      next = nearestSnap(d.currentTy);
    }
    onSnapChange(next);
    applyTransform(translateFor(next), true);
  };

  // Handle zone: always captures the gesture immediately.
  const onHandleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    beginDrag(e.touches[0].clientY);
  };
  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !dragRef.current.active) return;
    moveDrag(e.touches[0].clientY);
  };

  // List zone: scrolls normally UNLESS the sheet is fully expanded, the list
  // is already at its top, and the guest pulls down — then the drag takes
  // over ("pull to collapse") instead of the list trying to overscroll.
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
    const atTop = !listRef.current || listRef.current.scrollTop <= 0;
    if (snap === 'full' && atTop && dy > 4) {
      listGestureRef.current.deciding = false;
      beginDrag(listGestureRef.current.startY);
      moveDrag(clientY);
    } else if (Math.abs(dy) > 4) {
      // Gesture resolved as a normal scroll — stop watching until the next touchstart.
      listGestureRef.current.deciding = false;
    }
  };
  const onListTouchEnd = () => {
    listGestureRef.current.deciding = false;
    endDrag();
  };

  return (
    <div
      ref={sheetRef}
      data-no-tab-swipe
      className="absolute inset-x-0 bottom-0 h-full flex flex-col bg-background border-t border-on-background/10"
      style={{ willChange: 'transform' }}
    >
      <div
        data-no-tab-swipe
        style={{ touchAction: 'none' }}
        onTouchStart={onHandleTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={endDrag}
        onTouchCancel={endDrag}
        className="shrink-0 flex flex-col items-center pt-2 pb-1"
      >
        <span className="w-10 h-1 bg-on-background/20" aria-hidden="true" />
        {header}
      </div>
      <div
        ref={listRef}
        data-no-tab-swipe
        style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
        onTouchStart={onListTouchStart}
        onTouchMove={onListTouchMove}
        onTouchEnd={onListTouchEnd}
        onTouchCancel={onListTouchEnd}
        className="hide-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
        {children}
      </div>
    </div>
  );
}
