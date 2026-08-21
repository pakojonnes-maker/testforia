// src/pages/GuidebookPage.tsx — Guest-facing guidebook
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchGuidebook, trackSessionStart, trackSessionEnd, trackIntent, trackSectionView, buildMenuUrl, setReferralCookie } from '../lib/api';

const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com';

import WelcomeHero from '../components/WelcomeHero';
import FeaturedCarousel from '../components/FeaturedCarousel';
import ProductBillboard from '../components/ProductBillboard';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import InfoSection from '../components/InfoSection';
import ExploreSection from '../components/explore/ExploreSection';
import RestaurantsSection from '../components/RestaurantsSection';
import ServicesSection from '../components/ServicesSection';
import ChatIASection from '../components/ChatIASection';
import WelcomeModal, { WelcomeModalData } from '../components/WelcomeModal';
import ConsentBanner from '../components/ConsentBanner';
import { getConsent, subscribeToConsent, type ConsentState } from '../lib/consent';
import { getTranslation, ACTIVE_LANGUAGES, isRtl } from '../lib/i18n';
import type { GuidePoi, CitySummary, ZoneSummary } from '../lib/types';

// Types
interface GuidebookData {
  apartment: {
    id: string; name: string; slug: string; address: string;
    cover_image_url: string;
    // Straight-line distance origin for POIs outside the home zone — see
    // GuidePoi.travel_time_text and lib/poiCategories.ts haversineKm. null for
    // apartments the host never geocoded.
    latitude: number | null; longitude: number | null;
    info: Array<{
      id: string; key: string; category?: string | null; icon: string; color?: string | null;
      title: string; category_name?: string | null; content: string; media: any[];
      category_image_url?: string | null;
      pickup_instructions?: string | null; latitude?: number | null; longitude?: number | null;
    }>;
    phones: Array<{
      id: string; category: string; icon: string; name: string; phone_number: string;
    }>;
  };
  zone: ZoneSummary;
  // Sibling cities in zone.region, for the Explore tab's city picker. Falls
  // back to [] for guidebooks cached before this field existed — see the KV
  // cache note in workerGuide.js (24h TTL, shape changes don't invalidate on
  // their own).
  cities: CitySummary[];
  agency: {
    id: string; name: string; logo_url: string;
    primary_color: string | null; secondary_color: string | null; accent_color: string | null;
    headline_font: string | null; body_font: string | null; label_font: string | null;
  };
  pois: GuidePoi[];
  restaurants: Array<{
    id: string; name: string; slug: string; cuisine_type: string;
    tier: string; cover_image: string;
    address: string | null; city: string | null; country: string | null;
  }>;
  experiences: Array<{
    id: string; name: string; description: string; category: string;
    service_subcategory: string | null;
    action_type: string; action_data: string; prefilled_message: string;
    price_display: string; is_featured: boolean; cta_label: string;
    cover_image_url?: string;
  }>;
  store_items: Array<{
    id: string; owner_type: 'host' | 'platform'; category: string;
    name: string; description: string; price_amount: number | null;
    price_currency: string; price_display: string; cover_image_url?: string | null;
    is_featured: boolean; in_stock: boolean;
  }>;
  meta: { lang: string; available_langs: string[]; active_devices_24h?: number };
  welcome_modal: WelcomeModalData | null;
}

type TabKey = 'info' | 'discover' | 'restaurants' | 'services' | 'chat';
const TAB_ORDER: TabKey[] = ['info', 'discover', 'restaurants', 'services', 'chat'];

// Swipe horizontal entre pestañas: umbral mínimo antes de considerarlo un gesto
// intencional (no un scroll vertical ligeramente torcido), y selectores cuyo
// propio scroll horizontal no debe robarse el gesto (rail de categorías/chips
// con overflow-x-auto, y el mapa Leaflet, que ya vive dentro de un modal).
const SWIPE_THRESHOLD_PX = 60;
// [data-no-tab-swipe] is set on the Explore tab's bottom sheet, top bar and
// search panel: that whole tab is map-or-sheet, so tab-swiping is disabled
// there entirely (matches Airbnb — you don't change sections by dragging on
// a map) rather than trying to carve out exceptions per sub-element.
const SWIPE_IGNORE_SELECTOR = '.hide-scrollbar, .leaflet-container, [data-no-tab-swipe], input, textarea, select';

export default function GuidebookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<GuidebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState(() => {
    const browserLang = navigator.language?.split('-')[0] || 'es';
    return ACTIVE_LANGUAGES.includes(browserLang) ? browserLang : 'es';
  });
  // La pestaña vive en la URL (?t=), no en useState, por dos motivos: el botón
  // atrás del móvil retrocede entre pestañas en vez de sacar al huésped de la
  // guía de golpe, y recargar o compartir el enlace ya no devuelve siempre a
  // Info. Info es el estado por defecto, así que no ensucia la URL.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('t') as TabKey | null;
  const activeTab: TabKey = tabParam && TAB_ORDER.includes(tabParam) ? tabParam : 'info';
  const setActiveTab = useCallback((tab: TabKey) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'info') next.delete('t');
      else next.set('t', tab);
      return next;
    });
  }, [setSearchParams]);
  const [showWelcome, setShowWelcome] = useState(false);

  // Dirección de la transición al cambiar de pestaña — se deriva de la posición
  // en TAB_ORDER, así que tanto un tap en el nav como un swipe animan igual.
  const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
  const prevTabIndexRef = useRef(TAB_ORDER.indexOf('info'));
  useEffect(() => {
    const newIndex = TAB_ORDER.indexOf(activeTab);
    setSlideDirection(newIndex >= prevTabIndexRef.current ? 'forward' : 'backward');
    prevTabIndexRef.current = newIndex;
  }, [activeTab]);
  const tabAnimClass = slideDirection === 'forward' ? 'tab-slide-in-right' : 'tab-slide-in-left';

  // Swipe lateral para moverse entre pestañas. Se ignora si el gesto empieza
  // dentro de un scroller horizontal propio (rail de categorías/chips, mapa) o
  // con un modal abierto (los 5 modales de esta app marcan document.body con
  // overflow:hidden mientras están montados — señal ya existente, no hay que
  // inventar un nuevo flag de "hay un modal abierto").
  const swipeStateRef = useRef<{ x: number; y: number; active: boolean; locked: 'h' | 'v' | null }>({ x: 0, y: 0, active: false, locked: null });

  const handleTouchStart = (e: React.TouchEvent) => {
    const state = swipeStateRef.current;
    if (e.touches.length !== 1 || document.body.style.overflow === 'hidden' || (e.target as HTMLElement).closest(SWIPE_IGNORE_SELECTOR)) {
      state.active = false;
      return;
    }
    state.x = e.touches[0].clientX;
    state.y = e.touches[0].clientY;
    state.active = true;
    state.locked = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const state = swipeStateRef.current;
    if (!state.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - state.x;
    const dy = e.touches[0].clientY - state.y;
    if (!state.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      state.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    // Con el gesto ya identificado como horizontal, evita que la página haga
    // scroll vertical a la vez que se arrastra entre pestañas.
    if (state.locked === 'h') e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const state = swipeStateRef.current;
    if (!state.active || state.locked !== 'h') {
      state.active = false;
      return;
    }
    state.active = false;
    const dx = e.changedTouches[0].clientX - state.x;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex = currentIndex + (dx < 0 ? 1 : -1);
    if (nextIndex >= 0 && nextIndex < TAB_ORDER.length) setActiveTab(TAB_ORDER[nextIndex]);
  };

  const sessionIdRef = useRef<string | null>(null);
  // Espejo de `lang` para que el efecto de sesión pueda leer el idioma actual sin
  // declararlo como dependencia (cambiar de idioma no debe reiniciar la sesión).
  const langRef = useRef(lang);
  langRef.current = lang;
  const welcomeShownRef = useRef(false);

  // Estado del consentimiento. Se lee al montar y se mantiene al día porque el
  // banner y la página legal emiten un evento al cambiarlo: así aceptar abre la
  // sesión en caliente y revocar la corta, sin recargar la página.
  const [consent, setConsentState] = useState<ConsentState>(() => getConsent());
  useEffect(() => subscribeToConsent(setConsentState), []);

  // Fetch guidebook data
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);

    fetchGuidebook(slug, lang)
      .then(result => {
        if (!cancelled && result.success) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug, lang]);

  // Show the welcome modal once per page load (not on every language toggle mid-visit)
  useEffect(() => {
    if (data?.welcome_modal?.title && !welcomeShownRef.current) {
      welcomeShownRef.current = true;
      setShowWelcome(true);
    }
  }, [data]);

  // Apply text direction for RTL languages (Arabic today). Without this the html/body
  // stay LTR forever: translations flip the words but not the layout, so nav order,
  // chevrons and alignment all read backwards for RTL guests.
  useEffect(() => {
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.dir = 'ltr';
    };
  }, [lang]);

  // Handle agency theming
  //
  // Antes esto solo fijaba --brand-primary/--brand-secondary, que casi ningún
  // componente lee (solo CTAButton, WelcomeModal y el pie de página). El resto
  // de la interfaz — cabeceras, pestañas, tarjetas, botones — usa las clases
  // de Tailwind text-terracotta/bg-deep-sea/etc, que resuelven a los tokens
  // --color-terracotta/--color-deep-sea definidos en el @theme de index.css.
  // Sobrescribir esos mismos tokens en runtime es lo que hace que "cambiar el
  // color en Diseño" se note de verdad en la guía, no solo en 2-3 sitios.
  //
  // Desde el rediseño "Modern Mediterranean Editorial" (ago 2026), terracotta/
  // deep-sea son alias de primary (Azul Cobalto) / "Mar Profundo" — se siguen
  // sobrescribiendo con esos mismos nombres para no tocar cada componente.
  // Tres roles independientes, uno por familia tipográfica del sistema
  // (index.css @theme): titular/display, cuerpo, y label en mayúsculas.
  // Antes había un solo grupo "headline" y otro "body+label" juntos, y
  // faltaban --font-headline-sm y --font-label-md en sus listas — un olvido
  // que no se notaba porque font_family pisaba los 3 roles con la misma
  // fuente de todas formas.
  const HEADLINE_FONT_TOKENS = ['--font-display-xl', '--font-display-lg', '--font-headline-lg', '--font-headline-lg-mobile', '--font-headline-md', '--font-headline-sm'];
  const BODY_FONT_TOKENS = ['--font-body-md', '--font-body-lg'];
  const LABEL_FONT_TOKENS = ['--font-label-lg', '--font-label-md', '--font-label-sm', '--font-label-caps'];

  // Fuentes curadas seleccionables desde Diseño > Tipografía (admin). El
  // valor por defecto de cada rol (Newsreader/Inter/Archivo Narrow) ya viene
  // precargado en index.html y no necesita este mapa — solo las alternativas
  // se cargan bajo demanda, para no meter 7 familias de más en cada guía que
  // no las usa.
  const GOOGLE_FONT_QUERY: Record<string, string> = {
    'Playfair Display': 'Playfair+Display:ital,wght@0,400..900;1,400..900',
    'Lora': 'Lora:ital,wght@0,400..700;1,400..700',
    'Fraunces': 'Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900',
    'Work Sans': 'Work+Sans:wght@300..900',
    'Nunito Sans': 'Nunito+Sans:wght@300..900',
    'Poppins': 'Poppins:wght@300;400;500;600;700',
    'Oswald': 'Oswald:wght@300..700',
    'Barlow Condensed': 'Barlow+Condensed:wght@300;400;500;600;700',
  };

  useEffect(() => {
    const root = document.documentElement.style;
    if (data?.agency?.primary_color) {
      root.setProperty('--brand-primary', data.agency.primary_color);
      root.setProperty('--brand-secondary', data.agency.secondary_color || data.agency.primary_color);
      root.setProperty('--color-terracotta', data.agency.primary_color);
      root.setProperty('--color-deep-sea', data.agency.secondary_color || data.agency.primary_color);
      // --color-primary es el token que de verdad leen border-primary/bg-primary/
      // text-primary (77 usos en apps/guide/src, contra solo 5 de -terracotta) —
      // sin esta línea la mayoría de la interfaz (líneas divisorias incluidas)
      // se queda en el azul cobalto por defecto pase lo que pase en Diseño.
      root.setProperty('--color-primary', data.agency.primary_color);
    } else {
      root.setProperty('--brand-primary', 'var(--mar-azul)');
      root.setProperty('--brand-secondary', 'var(--mar-profundo)');
      root.setProperty('--color-terracotta', '#0038AE');
      root.setProperty('--color-deep-sea', '#001550');
      root.setProperty('--color-primary', '#0038AE');
    }
    root.setProperty('--color-accent-gold', data?.agency?.accent_color || '#F7BE29');

    // Tinta la barra de estado del navegador/PWA en móvil con el mismo color.
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', data?.agency?.primary_color || '#0038AE');

    // Cada rol (headline/body/label) se sobrescribe por separado: elegir una
    // fuente de titulares para la agencia ya NO pisa el cuerpo ni los labels,
    // y viceversa. Antes un único font_family se aplicaba a los 3 grupos de
    // tokens a la vez, así que un valor "de fábrica" en el selector del admin
    // (ver GuideDesignPage.tsx) bastaba para aplastar Newsreader/Archivo
    // Narrow en todas las guías sin que nadie lo hubiera elegido.
    //
    // Sin fuente de agencia en un rol NO se fuerza nada a mano: se quita la
    // sobrescritura de ese grupo para que vuelvan los valores del @theme.
    const roles: Array<{ font: string | null | undefined; tokens: string[]; generic: string }> = [
      { font: data?.agency?.headline_font, tokens: HEADLINE_FONT_TOKENS, generic: 'serif' },
      { font: data?.agency?.body_font, tokens: BODY_FONT_TOKENS, generic: 'sans-serif' },
      { font: data?.agency?.label_font, tokens: LABEL_FONT_TOKENS, generic: 'sans-serif' },
    ];
    for (const { font, tokens, generic } of roles) {
      for (const token of tokens) {
        if (font) root.setProperty(token, `'${font}', ${generic}`);
        else root.removeProperty(token);
      }
    }

    // Carga bajo demanda del webfont real para roles con una fuente distinta
    // del default (que ya viene precargada en index.html) — sin esto, elegir
    // "Playfair Display" en el admin fija la variable CSS pero el navegador
    // no tiene el archivo de fuente y cae al fallback del sistema, el mismo
    // bug que arrastraba Montserrat.
    const customFamilies = Array.from(new Set(
      roles.map(r => r.font).filter((f): f is string => !!f && !!GOOGLE_FONT_QUERY[f])
    ));
    const linkId = 'agency-custom-fonts';
    const existingLink = document.getElementById(linkId) as HTMLLinkElement | null;
    if (customFamilies.length > 0) {
      const href = `https://fonts.googleapis.com/css2?${customFamilies.map(f => `family=${GOOGLE_FONT_QUERY[f]}`).join('&')}&display=swap`;
      if (existingLink) {
        if (existingLink.href !== href) existingLink.href = href;
      } else {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    } else if (existingLink) {
      existingLink.remove();
    }
  }, [data?.agency]);

  // Track session
  //
  // Dos bugs corregidos aquí:
  //  1. El efecto dependía de `lang`, así que cada cambio de idioma abría una
  //     sesión NUEVA. En un guidebook multi-idioma el huésped cambia de idioma
  //     casi siempre: en producción un mismo dispositivo acumulaba 17 sesiones
  //     en 2 días con 3 idiomas. Ahora depende solo del apartamento.
  //  2. El listener de `visibilitychange` era una función anónima que el cleanup
  //     nunca eliminaba, así que se acumulaba uno por cada re-ejecución del
  //     efecto y disparaba N llamadas a session/end por cada ocultación.
  //  3. Ahora depende también del consentimiento: las funciones de tracking están
  //     capadas en lib/api.ts, así que sin permiso este efecto no manda nada. Al
  //     aceptar en el banner, `consent` cambia y el efecto se vuelve a ejecutar
  //     para abrir la sesión sin obligar al huésped a recargar.
  useEffect(() => {
    const apartmentId = data?.apartment?.id;
    if (!apartmentId) return;
    if (consent !== 'granted') return;

    let cancelled = false;
    const startedAt = Date.now();
    const elapsedSeconds = () => Math.round((Date.now() - startedAt) / 1000);

    trackSessionStart(apartmentId, langRef.current).then(res => {
      if (!cancelled && res?.sessionId) {
        sessionIdRef.current = res.sessionId;
        // Deja una referencia de 30 días para que, si el huésped acaba cenando
        // en un restaurante de la zona días después, esa sesión de menú pueda
        // atribuirse a esta guía aunque llegue sin ningún ?ref= en la URL.
        setReferralCookie(apartmentId, res.sessionId);
      }
    });

    const endSession = () => {
      if (sessionIdRef.current) trackSessionEnd(sessionIdRef.current, elapsedSeconds());
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') endSession();
    };

    window.addEventListener('beforeunload', endSession);
    window.addEventListener('pagehide', endSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeunload', endSession);
      window.removeEventListener('pagehide', endSession);
      document.removeEventListener('visibilitychange', handleVisibility);
      endSession();
    };
  }, [data?.apartment?.id, consent]);

  // Track section view when tab changes
  useEffect(() => {
    if (data?.apartment?.id) {
      trackSectionView(data.apartment.id, sessionIdRef.current, activeTab);
      // Scroll to top of tab content smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, data?.apartment?.id]);

  // Track intent
  const logIntent = (targetType: 'restaurant' | 'experience' | 'product', targetId: string, action: string) => {
    if (!data?.apartment?.id) return;
    trackIntent({
      sessionId: sessionIdRef.current || undefined,
      apartmentId: data.apartment.id,
      targetType,
      targetId,
      actionTaken: action,
    });
  };

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 600 }}>{getTranslation('loading', lang)}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="loading-container" style={{ background: 'var(--blanco-puro)' }}>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--mar-claro)', lineHeight: 1 }}>404</div>
        <p style={{ fontSize: '1rem', color: 'var(--gris-texto)', marginTop: 'var(--sp-md)' }}>
          {error || getTranslation('guidebook_not_found', lang)}
        </p>
      </div>
    );
  }

  const { apartment, zone, agency, pois, restaurants, experiences, store_items } = data;

  const isChatTab = activeTab === 'chat';
  // Explore (mapa fullscreen + bottom sheet) needs the same "app shell" as
  // chat: a fixed-height container instead of a page that scrolls, because
  // Leaflet needs a real pixel height to size its tiles against and the sheet
  // is absolutely positioned within <main>. Kept as its own flag (not folded
  // into isChatTab) because the two still differ below — chat uses h-screen,
  // explore uses h-dvh (no bottom input bar fighting mobile browser chrome).
  const isExploreTab = activeTab === 'discover';
  const isFullBleed = isChatTab || isExploreTab;

  // min-h-screen deja crecer la página más allá del viewport, que es lo que
  // queremos en las pestañas normales (contenido largo, footer al final). En
  // el chat y en explorar necesitamos justo lo contrario: una altura fija
  // para que "flex-1 min-h-0" en <main> tenga una altura real que repartir —
  // si no, el input de texto (chat) o el mapa (explorar) terminan más abajo
  // del viewport o con 0px de alto.
  const rootHeightClass = isChatTab ? 'h-screen overflow-hidden' : isExploreTab ? 'h-dvh overflow-hidden' : 'min-h-screen';

  return (
    <div className={`guide-app font-body-md text-on-surface bg-background relative flex flex-col ${rootHeightClass}`}>
      <div className="film-grain" />
      {showWelcome && data.welcome_modal && (
        <WelcomeModal welcome={data.welcome_modal} onClose={() => setShowWelcome(false)} lang={lang} />
      )}

      {/* Explore is a fullscreen map — the app masthead would just eat into
          it for no reason. Its own ExploreTopBar carries the language
          switcher instead, in the same row as the search pill. */}
      {!isExploreTab && (
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          lang={lang}
          onLanguageChange={handleLanguageChange}
          apartmentName={apartment.name}
        />
      )}

      {/* El chat y explorar son apps de pantalla completa sin scroll de página
          (el chat con su input fijo cerca del nav inferior, explorar con el
          mapa + bottom sheet) — el resto de pestañas son contenido desplazable
          normal con su propio footer. pb-16 en móvil reserva el alto del
          BottomNavBar fijo (h-16) para que no tape el input/sheet. */}
      <main
        className={isChatTab
          ? "flex-1 min-h-0 flex flex-col w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-6 pb-16 md:pb-6"
          : isExploreTab
          ? "relative flex-1 min-h-0 overflow-hidden pb-16 md:pb-0"
          : "w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-col gap-12"}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'info' && (
          <div className={`flex flex-col gap-12 ${tabAnimClass}`}>
            <WelcomeHero
              apartmentName={apartment.name}
              address={apartment.address}
              coverImageUrl={apartment.cover_image_url}
              agencyLogoUrl={agency.logo_url}
              agencyName={agency.name}
              currentLang={lang}
            />
            <InfoSection infoItems={apartment.info} phones={apartment.phones} lang={lang} />
            <FeaturedCarousel
              restaurants={restaurants}
              experiences={experiences}
              storeItems={store_items || []}
              lang={lang}
              onNavigateTab={setActiveTab}
              onIntent={(type, id, action) => logIntent(type, id, action)}
            />
            <ProductBillboard
              storeItems={store_items || []}
              onNavigateTab={setActiveTab}
              onIntent={(type, id, action) => logIntent(type, id, action)}
            />
          </div>
        )}

        {activeTab === 'discover' && (
          <div className={`relative h-full ${tabAnimClass}`}>
            <ExploreSection
              apartmentSlug={apartment.slug}
              lang={lang}
              onLanguageChange={handleLanguageChange}
              zone={zone}
              cities={data.cities ?? []}
              pois={pois}
              apartmentLatLng={apartment.latitude != null && apartment.longitude != null ? [apartment.latitude, apartment.longitude] : null}
            />
          </div>
        )}

        {activeTab === 'restaurants' && (
          <div className={tabAnimClass}>
            <RestaurantsSection
              restaurants={restaurants}
              zoneName={zone.name}
              lang={lang}
              onIntent={(type, id, action) => logIntent(type, id, action)}
              buildRestaurantUrl={(restaurantSlug) =>
                buildMenuUrl(MENU_URL, restaurantSlug, apartment.id, sessionIdRef.current)}
            />
          </div>
        )}

        {activeTab === 'services' && (
          <div className={tabAnimClass}>
            <ServicesSection
              experiences={experiences}
              storeItems={store_items || []}
              zoneName={zone.name}
              apartmentId={apartment.id}
              apartmentName={apartment.name}
              sessionId={sessionIdRef.current}
              lang={lang}
              onIntent={(type, id, action) => logIntent(type, id, action)}
            />
          </div>
        )}
        {activeTab === 'chat' && (
          <div className={`flex-1 min-h-0 flex flex-col ${tabAnimClass}`}>
            <ChatIASection
              lang={lang}
              apartmentId={data?.apartment?.id}
              apartmentName={data?.apartment?.name}
              restaurants={restaurants}
              pois={pois}
              experiences={experiences}
              storeItems={store_items}
              buildRestaurantUrl={(restaurantSlug) =>
                buildMenuUrl(MENU_URL, restaurantSlug, apartment.id, sessionIdRef.current)}
              onNavigateTab={setActiveTab}
            />
          </div>
        )}
      </main>

      <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} lang={lang} />

      {!isFullBleed && (
        <footer style={{
          textAlign: 'center',
          padding: '32px 16px',
          /* Sin marginTop propio: <main> ya cierra con py-8 (32px) y este
             padding añade otros 32px — un var(--sp-2xl) (48px) extra aquí
             apilaba tres espacios seguidos (112px en total) antes de que
             apareciera cualquier texto. Con una pestaña que termina en un
             elemento a sangre como ProductBillboard el hueco se notaba
             todavía más, por el borde duro de la cinta justo encima. */
          marginBottom: '80px', /* space for bottom nav */
          fontSize: '0.75rem',
          color: 'var(--gris-medio)'
        }}>
          <p>Powered by <a href="https://visualtastes.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>VisualTastes Guidebook</a></p>
          {/* El acceso a la información legal tiene que estar disponible de forma
              permanente y directa (art. 10 LSSI), no solo dentro del banner. */}
          <p style={{ marginTop: '8px' }}>
            <a href={`/legal?lang=${lang}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
              {getTranslation('legal_link', lang)}
            </a>
          </p>
        </footer>
      )}

      <ConsentBanner lang={lang} legalHref={`/legal?lang=${lang}`} />
    </div>
  );
}
