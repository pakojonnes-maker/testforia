import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/playfair-display/wght-italic.css';
import '@fontsource-variable/montserrat';
import './carta.css';
import { useReelsConfig } from '../hooks/useReelsConfig';
import { useCart } from '../hooks/useCart';
import type { CartItem } from '../hooks/useCart';
import { useWelcomeModal } from '../hooks/useWelcomeModal';
import { useLoyaltyCard } from '../hooks/useLoyaltyCard';
import { useDishTracking } from '../providers/TrackingAndPushProvider';
import { getRememberChoice, hasRememberConsent } from '../lib/visitor';
import { API_URL } from '../lib/api';
import { Ctx } from './context';
import type { CartaCtx, CasaAction, View } from './context';
import type { CartaAllergen, CartaDish, CartaLanguage, CartaSection, FeedItem } from './model';
import { dishName, flattenSections, menuAllergens as listAllergens, money as fmtMoney, priceOf } from './model';
import { ES, makeT } from './strings';
import { buildCartaTheme, themeVars } from './theme';
import { pickInitialLanguage, saveLanguage, useStoredList } from './usePrefs';
import { Feed } from './Feed';
import { Alergenos, Avisos, Camarero, CartaList, Casa, Ficha, Idioma, Seleccion } from './views';
import { HeartIcon } from './parts';

// Los diálogos heredados (pedido a domicilio, sellos, oferta, valoración, instalar en iPhone)
// son MUI: se descargan la primera vez que hace falta uno, no al abrir la carta.
const LegacyLayer = lazy(() => import('./LegacyLayer'));

interface Props {
  slug: string;
}

/** Playfair y Montserrat van empaquetadas; la escritura árabe solo se descarga si alguien elige árabe. */
function useArabicFont(lang: string) {
  useEffect(() => {
    if (lang === 'ar') import('@fontsource-variable/noto-naskh-arabic').catch(() => { /* se queda la de sistema */ });
  }, [lang]);
}

/** Título de la pestaña e idioma/dirección del documento: los del restaurante y el cliente. */
function useDocumentMeta(name: string, lang: string) {
  useEffect(() => {
    if (!name) return;
    const prev = document.title;
    document.title = name;
    return () => { document.title = prev; };
  }, [name]);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
    return () => { html.lang = 'es'; html.dir = 'ltr'; };
  }, [lang]);
}

/** «@usuario» a partir de la URL de Instagram que guarde el restaurante; nada si no lo trae. */
function instagramHandle(url: string): string | undefined {
  try {
    const u = new URL(/^https?:/i.test(url) ? url : `https://${url}`);
    const first = u.pathname.split('/').filter(Boolean)[0];
    return first && !['p', 'reel', 'explore'].includes(first) ? `@${first}` : undefined;
  } catch {
    return undefined;
  }
}

export default function CartaApp({ slug }: Props) {
  const navigate = useNavigate();
  const [lang, setLangState] = useState(() => pickInitialLanguage(slug));
  const { config } = useReelsConfig(slug, lang);
  // El español siempre a mano: es lo que lee el camarero (App.tsx ya lo deja en caché).
  const { config: esConfig } = useReelsConfig(slug, 'es');
  const cfg = config as any;

  const languages: CartaLanguage[] = useMemo(() => cfg?.languages || [], [cfg?.languages]);
  // Si el idioma guardado o el del navegador no está en esta carta, se cae al español.
  useEffect(() => {
    if (languages.length && !languages.some((l) => l.code === lang)) setLangState(languages.some((l) => l.code === 'es') ? 'es' : languages[0].code);
  }, [languages, lang]);
  useArabicFont(lang);

  const t = useMemo(() => makeT(cfg?.translations), [cfg?.translations]);
  const esT = useMemo(() => makeT((esConfig as any)?.translations), [esConfig]);
  const sections: CartaSection[] = useMemo(() => cfg?.sections || [], [cfg?.sections]);
  const items = useMemo(() => flattenSections(sections), [sections]);
  const restaurant = useMemo(() => cfg?.restaurant || { id: '', name: '', slug }, [cfg?.restaurant, slug]);
  useDocumentMeta(restaurant.name || '', lang);
  const theme = useMemo(() => buildCartaTheme(restaurant?.branding), [restaurant?.branding]);
  const money = useCallback((n: number) => fmtMoney(n, lang), [lang]);
  const esNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of ((esConfig as any)?.sections || []) as CartaSection[]) for (const d of s.dishes || []) if (d.name) m.set(d.id, d.name);
    return m;
  }, [esConfig]);

  // ------------------------------------------------------------ posición en el feed
  const [index, setIndex] = useState(0);
  const currentId = useRef<string | null>(null);
  const placed = useRef(false);
  // Cambio de idioma: llega otra carta y se vuelve al mismo plato, no al primero.
  useEffect(() => {
    if (!items.length) return;
    if (!placed.current) {
      placed.current = true;
      return;
    }
    const keep = currentId.current ? items.findIndex((it) => it.dish.id === currentId.current) : -1;
    if (keep >= 0 && keep !== index) setIndex(keep);
    else if (index > items.length - 1) setIndex(items.length - 1);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const current: FeedItem | undefined = items[Math.min(index, Math.max(0, items.length - 1))];
  useEffect(() => { if (current) currentId.current = current.dish.id; }, [current]);

  // ------------------------------------------------------------ pantallas (con el «atrás» del móvil)
  const [stack, setStack] = useState<View[]>([]);
  const stackRef = useRef<View[]>([]);
  stackRef.current = stack;
  const view: View = stack[stack.length - 1] || 'reel';
  const [alergenosFromDish, setAlergenosFromDish] = useState(true);
  const open = useCallback((v: View) => {
    if (v === 'alergenos') {
      const top = stackRef.current[stackRef.current.length - 1] || 'reel';
      setAlergenosFromDish(top === 'reel' || top === 'ficha');
    }
    const next = [...stackRef.current, v];
    setStack(next);
    window.history.pushState({ cartaDepth: next.length }, '');
  }, []);
  const back = useCallback(() => { if (stackRef.current.length) window.history.back(); }, []);
  const closeAll = useCallback(() => { const n = stackRef.current.length; if (n) window.history.go(-n); }, []);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const depth = typeof e.state?.cartaDepth === 'number' ? e.state.cartaDepth : 0;
      setStack((s) => s.slice(0, depth));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ------------------------------------------------------------ avisos breves
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);
  const toast = useCallback((msg: string) => {
    window.clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 1900);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // ------------------------------------------------------------ seguimiento (el mismo de la carta anterior)
  const tracking = useDishTracking();
  const { viewDish, trackDishViewDuration, setCurrentSection, trackScrollDepth, trackSectionTime, trackMediaError, favoriteDish, track } = tracking;
  const viewStart = useRef<{ id: string; section: string; at: number } | null>(null);
  const sectionStart = useRef<{ id: string; at: number; seen: Set<string> } | null>(null);
  useEffect(() => {
    if (!current) return;
    const now = Date.now();
    const prev = viewStart.current;
    if (prev && prev.id !== current.dish.id) {
      const secs = Math.floor((now - prev.at) / 1000);
      if (secs >= 1) trackDishViewDuration(prev.id, secs, prev.section);
    }
    if (!prev || prev.id !== current.dish.id) {
      viewDish(current.dish.id, current.section.id);
      viewStart.current = { id: current.dish.id, section: current.section.id, at: now };
    }
    const sec = sectionStart.current;
    if (!sec || sec.id !== current.section.id) {
      if (sec) {
        const secs = Math.floor((now - sec.at) / 1000);
        if (secs > 0) trackSectionTime(sec.id, secs, sec.seen.size);
      }
      sectionStart.current = { id: current.section.id, at: now, seen: new Set() };
      setCurrentSection(current.section.id);
    }
    sectionStart.current?.seen.add(current.dish.id);
    trackScrollDepth(current.section.id, current.di, current.section.dishes?.length || 0);
  }, [current?.dish.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------ me gusta (guardados en el móvil)
  const likes = useStoredList(`vt_likes_${slug}`);
  const likedAtLoad = useRef<Set<string> | null>(null);
  if (likedAtLoad.current === null) likedAtLoad.current = new Set(likes.list);
  const isLiked = useCallback((id: string) => likes.list.includes(id), [likes.list]);
  const likeCount = useCallback((d: CartaDish) => {
    const base = Math.max(0, d.favorite_count || 0);
    const was = likedAtLoad.current?.has(d.id) ?? false;
    const now = likes.list.includes(d.id);
    return Math.max(now ? 1 : 0, base + (now && !was ? 1 : 0) - (!now && was && base > 0 ? 1 : 0));
  }, [likes.list]);
  const [burst, setBurst] = useState(0);
  const burstTimer = useRef<number | undefined>(undefined);
  const showBurst = useCallback(() => {
    window.clearTimeout(burstTimer.current);
    setBurst((b) => b + 1);
    burstTimer.current = window.setTimeout(() => setBurst(0), 900);
  }, []);
  const toggleLike = useCallback((d: CartaDish) => {
    const on = likes.toggle(d.id);
    favoriteDish(d.id, on);
    if (on) showBurst();
    toast(t(on ? 'carta_liked' : 'carta_unliked'));
  }, [likes, favoriteDish, showBurst, toast, t]);
  const onDoubleTap = useCallback((it: FeedItem) => {
    if (!likes.list.includes(it.dish.id)) {
      likes.add(it.dish.id);
      favoriteDish(it.dish.id, true);
      toast(t('carta_liked'));
    }
    showBurst();
  }, [likes, favoriteDish, toast, t, showBurst]);
  const likedDishes = useMemo(
    () => likes.list.map((id) => items.find((it) => it.dish.id === id)).filter((x): x is FeedItem => !!x),
    [likes.list, items],
  );

  // ------------------------------------------------------------ alérgenos que evita (comunes a todas las cartas)
  const avoid = useStoredList('vt_avoid_allergens');
  const avoidedIn = useCallback((d: CartaDish): CartaAllergen[] => (d.allergens || []).filter((a) => avoid.list.includes(a.id)), [avoid.list]);
  const allergensOfMenu = useMemo(() => listAllergens(items), [items]);

  // ------------------------------------------------------------ pedido (mismo carrito y mismos eventos de antes)
  const translations = cfg?.translations as Record<string, string> | undefined;
  const cartT = useCallback((key: string, def: string) => translations?.[key] || def, [translations]);
  const { cart, addToCart, updateCartItemQuantity, getTotalPrice, getTotalItems } = useCart({
    track,
    currentLanguage: lang,
    t: cartT,
    defaultDishName: t('dish_untitled'),
  });
  const addDish = useCallback((d: CartaDish, portion: 'full' | 'half', qty: number) => {
    const price = portion === 'half' && typeof d.half_price === 'number' ? d.half_price : priceOf(d).now;
    addToCart(d, qty, portion, price);
    toast(`${t('carta_added')} · ${dishName(d, t('dish_untitled'))}`);
  }, [addToCart, toast, t]);
  const setQty = useCallback((it: CartItem, qty: number) => { updateCartItemQuantity(it.dishId, qty, it.portion); }, [updateCartItemQuantity]);
  const [selTab, setSelTab] = useState<'pedir' | 'gusta'>('pedir');

  // ------------------------------------------------------------ casa: lo que ya existía, en un índice
  const { marketingCampaign, welcomeModalOpen, setWelcomeModalOpen } = useWelcomeModal(config);
  const { loyaltyProgram, loyaltyCard, setLoyaltyCard, visitorId } = useLoyaltyCard(config);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [rated, setRated] = useState<number | null>(null);
  const storedRating = useMemo(() => {
    if (!restaurant.id) return null;
    try { const v = localStorage.getItem(`rated_${restaurant.id}`); return v ? parseInt(v, 10) : null; } catch { return null; }
  }, [restaurant.id]);
  const effectiveRating: number | null = rated || storedRating || cfg?.userStatus?.previousRating || null;
  const deliveryConfig = cfg?.deliverySettings || null;
  const deliveryEnabled = !!deliveryConfig?.is_enabled;

  // La valoración va con la sesión de la carta (toda visita tiene una, anónima) y, si el
  // cliente activó "recordar este dispositivo", también con su id de 12 meses.
  const sessionId = tracking.sessionId;
  const submitRating = useCallback(async (rating: number, comment: string) => {
    try {
      let visitor: string | null = null;
      if (hasRememberConsent()) {
        try {
          const raw = localStorage.getItem('vt_visitor_id');
          const parsed = raw ? JSON.parse(raw) : null;
          if (parsed?.value && (!parsed.expiry || Date.now() <= parsed.expiry)) visitor = parsed.value;
        } catch { /* sin storage */ }
      }
      const res = await fetch(`${API_URL}/restaurants/${restaurant.slug}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, visitor_id: visitor, session_id: sessionId }),
      });
      if (res.ok) {
        setRated(rating);
        try { localStorage.setItem(`rated_${restaurant.id}`, String(rating)); } catch { /* ignorar */ }
      }
    } catch (err) {
      console.error('[Carta] rating', err);
    }
  }, [restaurant.slug, restaurant.id, sessionId]);

  const push = useMemo(() => ({
    supported: tracking.isPushSupported || tracking.isIOS,
    enabled: tracking.isPushEnabled,
    ios: tracking.isIOS,
    enable: async () => {
      const r = await tracking.subscribeToPush();
      if (r === 'success') toast(t('carta_notif_active'));
      else if (r === 'denied') toast(t('carta_notif_denied'));
      else if (r === 'error') toast(t('carta_notif_error'));
    },
    disable: async () => { await tracking.unsubscribeFromPush(); },
  }), [tracking, toast, t]);

  // iPhone: el cliente pidió avisos desde Safari, instaló la carta en la pantalla de inicio y
  // la acaba de abrir desde allí. Se le lleva a la pantalla de avisos para que los active
  // (iOS solo deja pedir el permiso tras un toque suyo).
  const { pushPending, clearPushPending } = tracking;
  useEffect(() => {
    if (!pushPending || !config) return;
    clearPushPending();
    setWelcome(false);
    open('avisos');
  }, [pushPending, config]); // eslint-disable-line react-hooks/exhaustive-deps

  const casaActions: CasaAction[] = useMemo(() => {
    const out: CasaAction[] = [];
    if (cfg?.reservationsEnabled) out.push({ key: 'reserve', title: t('carta_reserve'), sub: t('carta_reserve_sub'), onClick: () => navigate(`/reserve/${restaurant.slug}`) });
    if (deliveryEnabled) out.push({ key: 'takeaway', title: t('carta_takeaway'), sub: t('carta_takeaway_sub'), onClick: () => setDeliveryOpen(true) });
    if (loyaltyProgram) out.push({ key: 'stamps', title: t('carta_stamps'), sub: t('carta_stamps_sub'), onClick: () => setLoyaltyOpen(true) });
    if (marketingCampaign) out.push({ key: 'offer', title: t('carta_offer'), sub: t('carta_offer_sub'), onClick: () => setWelcomeModalOpen(true) });
    if (push.supported) out.push({ key: 'notif', title: t('carta_notif_title'), sub: push.enabled ? t('carta_notif_sub_on') : t('carta_notif_sub_off'), onClick: () => open('avisos') });
    if (!effectiveRating || effectiveRating >= 4) out.push({ key: 'rate', title: t('carta_rate'), sub: t('carta_rate_sub'), onClick: () => setRatingOpen(true) });
    const web = restaurant.website || restaurant.website_url;
    if (web) out.push({ key: 'web', title: t('carta_web'), sub: t('carta_web_sub'), href: /^https?:/i.test(web) ? web : `https://${web}` });
    const wa = restaurant.whatsapp_number || restaurant.contact?.whatsapp_number;
    if (wa) out.push({ key: 'whatsapp', title: t('carta_whatsapp'), sub: t('carta_whatsapp_sub'), href: `https://wa.me/${String(wa).replace(/\D/g, '')}` });
    const ig = restaurant.instagram_url;
    if (ig) {
      out.push({ key: 'instagram', title: t('carta_instagram'), sub: instagramHandle(String(ig)), href: ig });
    }
    return out;
  }, [cfg?.reservationsEnabled, deliveryEnabled, loyaltyProgram, marketingCampaign, push.supported, push.enabled, effectiveRating, restaurant, t, navigate, open, setWelcomeModalOpen]);

  // ------------------------------------------------------------ bienvenida (una vez por sesión)
  const welcomeKey = `vt_carta_welcome_${slug}`;
  const [welcome, setWelcome] = useState(() => {
    try { return !sessionStorage.getItem(welcomeKey); } catch { return true; }
  });
  const closeWelcome = () => {
    setWelcome(false);
    try { sessionStorage.setItem(welcomeKey, '1'); } catch { /* ignorar */ }
  };

  // "¿Te reconocemos la próxima vez que vengas?": la recurrencia (días distintos) y la
  // atribución a la guía en visitas posteriores necesitan un id en el móvil, y eso solo con
  // permiso. Se pregunta aquí, en su idioma, sin tapar la carta; si cierra sin contestar, no
  // hay id y se le vuelve a preguntar en la visita siguiente. Se cambia en Privacidad.
  const [rememberAsk, setRememberAsk] = useState(() => getRememberChoice() === null);
  const answerRemember = (on: boolean) => {
    setRememberAsk(false);
    tracking.rememberDevice(on);
    toast(t(on ? 'carta_remember_done_yes' : 'carta_remember_done_no'));
  };

  // La oferta de bienvenida (campaña del admin) no salta encima de la bienvenida ni nada más
  // cerrarla: espera a que el cliente haya pasado de plato o lleve 8 s mirando.
  const [offerReady, setOfferReady] = useState(false);
  const movedFrom = useRef<number | null>(null);
  useEffect(() => {
    if (welcome || offerReady) return;
    const id = window.setTimeout(() => setOfferReady(true), 8000);
    return () => window.clearTimeout(id);
  }, [welcome, offerReady]);
  useEffect(() => {
    if (welcome || offerReady) return;
    if (movedFrom.current === null) movedFrom.current = index;
    else if (index !== movedFrom.current) setOfferReady(true);
  }, [index, welcome, offerReady]);

  // Ni encima de otro diálogo (pedido, sellos, valoración, iPhone): espera a que se cierre.
  const otherDialog = deliveryOpen || loyaltyOpen || ratingOpen || tracking.showIOSPrompt;
  const welcomeOpen = welcomeModalOpen && !welcome && !otherDialog && (offerReady || stack.includes('casa'));

  // Diálogos heredados (MUI): se descargan la primera vez que hace falta uno y se quedan
  // montados para que cierren con su animación.
  const needLegacy = deliveryOpen || loyaltyOpen || ratingOpen || welcomeOpen || tracking.showIOSPrompt;
  const legacyRef = useRef(false);
  if (needLegacy) legacyRef.current = true;
  const legacyLoaded = legacyRef.current;
  // Con una oferta de bienvenida programada se baja en segundo plano, para que no espere al abrirse.
  useEffect(() => {
    if (!marketingCampaign) return;
    const id = window.setTimeout(() => { import('./LegacyLayer').catch(() => { /* ya se intentará al abrir */ }); }, 4000);
    return () => window.clearTimeout(id);
  }, [marketingCampaign]);
  // Sus textos: los de D1 en el idioma del cliente, con el español de respaldo.
  const legacyStrings = useMemo<Record<string, string>>(() => ({ ...ES, ...(translations || {}) }), [translations]);

  const setLang = useCallback((code: string) => { saveLanguage(slug, code); setLangState(code); }, [slug]);

  const plural = useCallback((n: number) => (n === 1 ? t('carta_dish_one') : t('carta_dish_other', { n })), [t]);

  if (!config || !current) {
    return (
      <div className="cm-shell" style={themeVars(theme) as React.CSSProperties}>
        <div className="cm" lang={lang}>
          {config && !items.length
            ? <div className="load"><p>{t('carta_empty_menu')}</p></div>
            : <div className="load" aria-busy="true"><div className="arcs shim" /><div className="ln shim" style={{ width: 200 }} /><p>{t('loading')}</p></div>}
        </div>
      </div>
    );
  }

  const cartCount = getTotalItems();
  const cartTotal = getTotalPrice();
  const ctx: CartaCtx = {
    t, lang, setLang, languages, restaurant, sections, items, current,
    jumpTo: setIndex, money, view, open, back, closeAll,
    isLiked, toggleLike, likeCount, likedDishes,
    avoid: avoid.list, toggleAvoid: (id) => { avoid.toggle(id); }, avoidedIn, menuAllergens: allergensOfMenu,
    cart, addDish, setQty, cartCount, cartTotal,
    esName: (id, fallback) => esNames.get(id) || fallback, esT,
    selTab, setSelTab,
    casaActions, push, privacyHref: '/legal/privacy', toast, plural,
  };

  const covered = view !== 'reel' || welcome;
  const showPill = view === 'reel' && !welcome && (cart.length > 0 || likedDishes.length > 0);
  const sec = current.section;
  const secDishes = sec.dishes || [];
  const railStart = Math.max(0, Math.min(current.di - 4, secDishes.length - 9));
  const railDishes = secDishes.slice(railStart, railStart + 9);
  const firstOfSection = (si: number) => items.find((it) => it.si === si)?.index ?? 0;
  const visibleLangs = languages.slice(0, 4);
  const pillSub = [cart.length ? plural(cartCount) : '', likedDishes.length ? `${likedDishes.length} ${t('likes_label').toLowerCase()}` : '']
    .filter(Boolean).join(' · ');

  return (
    <Ctx.Provider value={ctx}>
      <div className="cm-shell" style={themeVars(theme) as React.CSSProperties}>
        <div className="cm" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <Feed
            index={current.index}
            onIndex={setIndex}
            playing={view === 'reel' || view === 'sel'}
            withPill={showPill}
            covered={covered}
            hideInfo={welcome && view === 'reel'}
            onDoubleTap={onDoubleTap}
            onMediaError={(it, type, url) => trackMediaError(it.dish.id, type, url)}
          />

          <header className="top">
            <button className="house" onClick={() => open('casa')}>
              <span className="n serif">{restaurant.name}</span>
              <span className="k">{t('carta_house_hint')}</span>
            </button>
            <div className="pills">
              <button className="pill" onClick={() => open('carta')}>{t('carta_menu')}</button>
              {languages.length > 1 && (
                <button className="pill" onClick={() => open('idioma')} aria-label={t('carta_language')}>{lang.toUpperCase()}</button>
              )}
            </div>
          </header>

          <SectionTabs sections={sections} active={current.si} onPick={(si) => setIndex(firstOfSection(si))} label={t('carta_menu')} />

          {secDishes.length > 1 && (
            <div className="rail">
              {railDishes.map((d, i) => {
                const di = railStart + i;
                return (
                  <button
                    key={d.id}
                    className={di === current.di ? 'on' : ''}
                    aria-label={t('carta_dish_n', { n: di + 1 })}
                    aria-current={di === current.di}
                    onClick={() => setIndex(current.index - current.di + di)}
                  >
                    <span />
                  </button>
                );
              })}
            </div>
          )}

          {burst > 0 && view === 'reel' && <div className="burst" key={burst}><HeartIcon fill /></div>}

          {showPill && (
            <button className="selpill" onClick={() => { setSelTab(cart.length ? 'pedir' : 'gusta'); open('sel'); }}>
              <span className="a"><b>{t('carta_selection')}</b><span>{pillSub}</span></span>
              {cart.length > 0
                ? <bdi className="c">{money(cartTotal)}</bdi>
                : <span className="c lk"><HeartIcon fill />{likedDishes.length}</span>}
            </button>
          )}

          {welcome && view === 'reel' && (
            <div className="welcome" role="dialog" aria-label={restaurant.name}>
              <span className="kick">{t('carta_welcome_kicker')}</span>
              <h1 className="serif">{restaurant.name}</h1>
              {languages.length > 1 && (
                <div className="chips">
                  {visibleLangs.map((l) => (
                    <button key={l.code} className={l.code === lang ? 'chip on' : 'chip'} aria-pressed={l.code === lang} onClick={() => setLang(l.code)}>
                      <span lang={l.code}>{l.native_name || l.name || l.code}</span>
                    </button>
                  ))}
                  {languages.length > visibleLangs.length && (
                    <button className="chip more" onClick={() => open('idioma')}>{t('carta_more_languages')}</button>
                  )}
                </div>
              )}
              {rememberAsk && (
                <div className="remember" role="group" aria-label={t('carta_remember_q')}>
                  <p className="rq">{t('carta_remember_q')}</p>
                  <p className="rs">
                    {t('carta_remember_sub')} <a href="/legal/privacy">{t('carta_remember_more')}</a>
                  </p>
                  <div className="rb">
                    <button className="chip" onClick={() => answerRemember(false)}>{t('carta_remember_no')}</button>
                    <button className="chip" onClick={() => answerRemember(true)}>{t('carta_remember_yes')}</button>
                  </div>
                </div>
              )}
              <button className="cta" onClick={closeWelcome}>{t('carta_start')}</button>
            </div>
          )}

          {view === 'sel' && <Seleccion />}
          {view === 'ficha' && <Ficha />}
          {view === 'carta' && <CartaList />}
          {view === 'camarero' && <Camarero />}
          {view === 'casa' && <Casa />}
          {view === 'idioma' && <Idioma />}
          {view === 'alergenos' && <Alergenos fromDish={alergenosFromDish} />}
          {view === 'avisos' && <Avisos />}

          {toastMsg && <div className="toast" role="status"><span>{toastMsg}</span></div>}
        </div>
      </div>

      {legacyLoaded && (
        <Suspense fallback={null}>
          <LegacyLayer
            translations={legacyStrings}
            lang={lang}
            delivery={{
              open: deliveryOpen,
              onClose: () => setDeliveryOpen(false),
              // El mensaje de WhatsApp lo lee el restaurante: los platos van en español.
              cartItems: cart.map((i) => ({ id: i.dishId, name: i.name, staffName: esNames.get(i.dishId) || i.name, quantity: i.quantity, price: i.price })),
              cartTotal,
              deliveryConfig,
              restaurantName: restaurant.name || '',
              restaurantId: restaurant.id,
              isAvailable: deliveryEnabled,
            }}
            loyalty={{
              open: loyaltyOpen,
              onClose: () => setLoyaltyOpen(false),
              program: loyaltyProgram,
              card: loyaltyCard,
              onCardChange: setLoyaltyCard,
              restaurantId: restaurant.id,
              restaurantSlug: restaurant.slug,
              accentColor: theme.fill,
              visitorId,
            }}
            welcome={{
              open: welcomeOpen,
              onClose: () => setWelcomeModalOpen(false),
              restaurant,
              campaign: marketingCampaign,
            }}
            rating={{
              open: ratingOpen,
              onClose: () => setRatingOpen(false),
              onSubmit: submitRating,
              googleReviewUrl: restaurant.google_review_url,
              previousRating: effectiveRating,
            }}
            ios={{ open: tracking.showIOSPrompt, onClose: () => tracking.setShowIOSPrompt(false) }}
          />
        </Suspense>
      )}
    </Ctx.Provider>
  );
}

const SectionTabs = ({ sections, active, onPick, label }: { sections: CartaSection[]; active: number; onPick: (si: number) => void; label: string }) => {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('.tab.on');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);
  return (
    <nav className="tabs" ref={navRef} aria-label={label}>
      {sections.map((s, si) => (
        <button key={s.id} className={si === active ? 'tab on' : 'tab'} aria-current={si === active} onClick={() => onPick(si)}>
          <span className="no">{String(si + 1).padStart(2, '0')}</span>{s.name || ''}
        </button>
      ))}
    </nav>
  );
};
