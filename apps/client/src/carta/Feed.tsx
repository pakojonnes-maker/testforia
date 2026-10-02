import { useCallback, useEffect, useRef, useState } from 'react';
import { useCarta } from './context';
import type { FeedItem } from './model';
import { allergenName, dishName, hasHalf, priceOf, yes } from './model';
import { AllergenChip, DishMedia, HeartIcon } from './parts';

interface FeedProps {
  index: number;
  onIndex: (i: number) => void;
  playing: boolean;
  withPill: boolean;
  covered: boolean;
  /** La bienvenida tapa el tercio de abajo: el texto del plato espera a que se cierre. */
  hideInfo: boolean;
  onDoubleTap: (item: FeedItem) => void;
  onMediaError: (item: FeedItem, type: string, url?: string) => void;
}

const isControl = (el: EventTarget | null) =>
  el instanceof Element && !!el.closest('button, a, input, select, textarea, [data-nodrag]');

/**
 * Un solo feed vertical con todos los platos de la carta (al acabar una sección empieza la
 * siguiente). Arrastrar, rueda, flechas del teclado o deslizar en horizontal para cambiar de
 * sección. Solo se montan el plato en pantalla y sus dos vecinos.
 */
export const Feed = ({ index, onIndex, playing, withPill, covered, hideInfo, onDoubleTap, onMediaError }: FeedProps) => {
  const { items, lang } = useCarta();
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; t: number; axis: 'x' | 'y' | null; id: number; onControl: boolean } | null>(null);
  const swallowClick = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const wheel = useRef({ acc: 0, lockUntil: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const last = items.length - 1;
  const rtl = lang === 'ar';

  const go = useCallback((i: number) => onIndex(Math.max(0, Math.min(last, i))), [onIndex, last]);

  const stepSection = useCallback((dir: number) => {
    const cur = items[index];
    if (!cur) return;
    const target = items.find((it) => it.si === cur.si + dir && it.di === 0);
    if (target) go(target.index);
    else if (dir < 0 && cur.di > 0) go(cur.index - cur.di);
  }, [items, index, go]);

  const onPointerDown = (e: React.PointerEvent) => {
    // Se puede deslizar empezando en cualquier sitio, también sobre el nombre o un botón:
    // si el dedo se mueve, el clic de ese botón se descarta (onClickCapture).
    if (covered || (e.pointerType === 'mouse' && e.button !== 0)) return;
    swallowClick.current = false;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), axis: null, id: e.pointerId, onControl: isControl(e.target) };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      d.axis = Math.abs(my) >= Math.abs(mx) ? 'y' : 'x';
      swallowClick.current = true;
      try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* ignorar */ }
      if (d.axis === 'y') setDragging(true);
    }
    if (d.axis === 'y') {
      const edge = (index === 0 && my > 0) || (index === last && my < 0);
      setDy(edge ? my * 0.3 : my);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    const ms = Math.max(1, performance.now() - d.t);
    const h = rootRef.current?.clientHeight || 700;
    if (d.axis === 'y') {
      const fast = Math.abs(my) / ms > 0.5 && Math.abs(my) > 24;
      if (my < -h * 0.16 || (fast && my < 0)) go(index + 1);
      else if (my > h * 0.16 || (fast && my > 0)) go(index - 1);
      setDragging(false);
      setDy(0);
      return;
    }
    if (d.axis === 'x') {
      if (Math.abs(mx) > 60) stepSection((mx < 0 ? 1 : -1) * (rtl ? -1 : 1));
      return;
    }
    // Toque: dos seguidos en el mismo sitio = me gusta (no si el toque era en un botón)
    if (d.onControl) return;
    const now = performance.now();
    const prev = lastTap.current;
    if (prev && now - prev.t < 320 && Math.hypot(prev.x - e.clientX, prev.y - e.clientY) < 40) {
      lastTap.current = null;
      const it = items[index];
      if (it) onDoubleTap(it);
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
  };

  const onPointerCancel = () => {
    drag.current = null;
    setDragging(false);
    setDy(0);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (covered) return;
    const now = performance.now();
    const w = wheel.current;
    if (now < w.lockUntil) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
      w.acc += e.deltaX;
      if (Math.abs(w.acc) > 60) { stepSection((w.acc > 0 ? 1 : -1) * (rtl ? -1 : 1)); w.acc = 0; w.lockUntil = now + 600; }
      return;
    }
    w.acc += e.deltaY;
    if (Math.abs(w.acc) > 40) {
      go(index + (w.acc > 0 ? 1 : -1));
      w.acc = 0;
      w.lockUntil = now + 550;
    }
  };

  useEffect(() => {
    if (covered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(index + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(index - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [covered, go, index]);

  const windowed = items.filter((it) => Math.abs(it.index - index) <= 1);

  return (
    <div
      ref={rootRef}
      className="feed"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
      onDragStart={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        if (swallowClick.current) { e.stopPropagation(); e.preventDefault(); swallowClick.current = false; }
      }}
    >
      <div className={dragging ? 'track' : 'track anim'} style={{ transform: `translate3d(0, calc(${-index * 100}% + ${dy}px), 0)` }}>
        {windowed.map((it) => (
          <Slide
            key={`${it.dish.id}-${it.index}`}
            item={it}
            active={it.index === index}
            playing={playing && it.index === index && !dragging}
            withPill={withPill}
            hideInfo={hideInfo}
            onMediaError={onMediaError}
          />
        ))}
      </div>
    </div>
  );
};

interface SlideProps {
  item: FeedItem;
  active: boolean;
  playing: boolean;
  withPill: boolean;
  hideInfo: boolean;
  onMediaError: (item: FeedItem, type: string, url?: string) => void;
}

const Slide = ({ item, active, playing, withPill, hideInfo, onMediaError }: SlideProps) => {
  const c = useCarta();
  const { t, money } = c;
  const [pick, setPick] = useState(false);
  const d = item.dish;
  const name = dishName(d, t('dish_untitled'));
  const price = priceOf(d);
  const half = hasHalf(d);
  const liked = c.isLiked(d.id);
  const count = c.likeCount(d);
  const avoided = c.avoidedIn(d);
  const secNo = String(item.si + 1).padStart(2, '0');

  useEffect(() => { if (!active) setPick(false); }, [active]);

  const badges: Array<{ label: string; cls: string }> = [];
  if (yes(d.is_featured)) badges.push({ label: t('carta_badge_featured'), cls: 'badge' });
  if (yes(d.is_new)) badges.push({ label: t('carta_badge_new'), cls: 'badge alt' });
  if (yes(d.is_vegan)) badges.push({ label: t('carta_badge_vegan'), cls: 'badge alt' });
  else if (yes(d.is_vegetarian)) badges.push({ label: t('carta_badge_vegetarian'), cls: 'badge alt' });

  const add = () => {
    if (half) setPick(true);
    else c.addDish(d, 'full', 1);
  };

  return (
    <section className="slide" style={{ top: `${item.index * 100}%` }} aria-hidden={!active} aria-label={name}>
      <DishMedia
        list={(d.media || []).filter((m) => m?.url)}
        playing={playing}
        near={!active}
        secNo={secNo}
        noVideoLabel={t('carta_no_video')}
        onError={(type, url) => onMediaError(item, type, url)}
      />
      <div className="scrim-top" />
      <div className="scrim-bot" />
      {!hideInfo && <div className={withPill ? 'info withsel' : 'info'}>
        <div className="side">
          <button
            className={liked ? 'heart on' : 'heart'}
            aria-pressed={liked}
            aria-label={t('likes_label')}
            onClick={() => c.toggleLike(d)}
            tabIndex={active ? 0 : -1}
          >
            <HeartIcon />
          </button>
          {count > 0 && <span className="lc">{count}</span>}
        </div>
        {avoided.length > 0 && (
          <button className="warn" onClick={() => c.open('alergenos')} tabIndex={active ? 0 : -1}>
            <AllergenWarnIcon item={item} />
            <span>{t('carta_contains')} {avoided.map((a) => allergenName(a)).join(', ')} · {t('carta_avoid_warn')}</span>
          </button>
        )}
        {badges.length > 0 && (
          <div className="badges">{badges.map((b) => <span key={b.label} className={b.cls}>{b.label}</span>)}</div>
        )}
        <button className={name.length > 24 ? 'dname serif long' : 'dname serif'} onClick={() => c.open('ficha')} tabIndex={active ? 0 : -1}>
          {name}
        </button>
        {d.description && (
          <div className="ddesc">
            <span className="txt">{d.description}</span>
            <button className="more" onClick={() => c.open('ficha')} tabIndex={active ? 0 : -1}>{t('see_more')}</button>
          </div>
        )}
        <button className="algn" onClick={() => c.open('alergenos')} aria-label={t('carta_see_allergens')} tabIndex={active ? 0 : -1}>
          {(d.allergens || []).length === 0
            ? <span className="none">{t('carta_no_allergens')}</span>
            : (d.allergens || []).map((a) => <AllergenChip key={a.id} a={a} warn={avoided.some((x) => x.id === a.id)} />)}
        </button>
        {!pick && (
          <div className="act">
            <div className="price">
              {price.before != null && <s>{money(price.before)}</s>}
              <bdi className="p serif">{money(price.now)}</bdi>
              {half && <bdi className="h">{t('half_portion_label')} {money(d.half_price as number)}</bdi>}
            </div>
            <button className="add" onClick={add} tabIndex={active ? 0 : -1}>{t('button_add')}</button>
          </div>
        )}
        {pick && (
          <div className="pick">
            <button className="opt" onClick={() => { c.addDish(d, 'half', 1); setPick(false); }}>
              <span className="l">{t('half_portion_label')}</span><bdi className="v serif">{money(d.half_price as number)}</bdi>
            </button>
            <button className="opt" onClick={() => { c.addDish(d, 'full', 1); setPick(false); }}>
              <span className="l">{t('carta_full_portion')}</span><bdi className="v serif">{money(price.now)}</bdi>
            </button>
            <button className="cancel" onClick={() => setPick(false)}>{t('button_cancel')}</button>
          </div>
        )}
      </div>}
    </section>
  );
};

const AllergenWarnIcon = ({ item }: { item: FeedItem }) => {
  const c = useCarta();
  const a = c.avoidedIn(item.dish)[0];
  if (!a) return null;
  return <AllergenChip a={a} iconOnly />;
};
