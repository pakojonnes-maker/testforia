// src/pages/GuidebookPage.tsx — Guest-facing guidebook
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { fetchGuidebook, trackSessionStart, trackSessionEnd, trackIntent, trackSectionView, buildMenuUrl, setReferralCookie } from '../lib/api';

const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com';

import WelcomeHero from '../components/WelcomeHero';
import FeaturedCarousel from '../components/FeaturedCarousel';
import ProductBillboard from '../components/ProductBillboard';
import { LanguageSwitcher } from '../components/Header';
import GuideFooter from '../components/GuideFooter';
import { GuideLoading, GuideNotFound } from '../components/GuideStates';
import BottomNavBar from '../components/BottomNavBar';
import InfoSection from '../components/InfoSection';
import ExploreSection from '../components/explore/ExploreSection';
import RestaurantsSection from '../components/RestaurantsSection';
import ServicesSection from '../components/ServicesSection';
import ChatIASection from '../components/ChatIASection';
import WelcomeModal, { WelcomeModalData } from '../components/WelcomeModal';
import { getTranslation, ACTIVE_LANGUAGES, isRtl } from '../lib/i18n';
import type { GuidePoi, CitySummary, ZoneSummary, CtaActionType, GuideRestaurant } from '../lib/types';
import '../styles/guide.css';
import '../styles/casa.css';
import '../styles/lugares.css';
import '../styles/comer.css';
import '@fontsource-variable/montserrat/index.css';
import '@fontsource-variable/playfair-display/index.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import { useAgencyTheme } from '../theme/useAgencyTheme';

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
  restaurants: GuideRestaurant[];
  experiences: Array<{
    id: string; name: string; description: string; category: string;
    service_subcategory: string | null;
    // Resueltos en el worker: si la experiencia tiene CTA secundario, esto ES el
    // secundario. El cliente ya no elige canal, sólo lo pinta.
    action_type: CtaActionType; action_data: string; prefilled_message: string;
    /** 'affiliate' = enlace retribuido; obliga a avisarlo en la tarjeta. */
    cta_source?: 'affiliate' | 'direct';
    price_display: string; is_featured: boolean; is_promoted?: boolean; cta_label: string;
    cover_image_url?: string;
  }>;
  store_items: Array<{
    id: string; owner_type: 'host' | 'agency' | 'platform'; category: string;
    name: string; description: string; price_amount: number | null;
    price_currency: string; price_display: string; cover_image_url?: string | null;
    is_featured: boolean; is_promoted?: boolean; in_stock: boolean;
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

  // Ya no se sigue aquí el estado del consentimiento: la analítica es anónima y
  // no depende de él, y la única pieza que sí lo necesita (la cookie de
  // atribución de 30 días) lo comprueba por su cuenta en setReferralCookie().
  // Se gestiona en /legal, accesible desde la cabecera.

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

  // Tema de la agencia: los tres colores y las tres tipografías salen de la BD (agency.*), con los valores
  // del diseño cuando faltan. Toda la lógica vive en src/theme/; aquí solo se engancha.
  useAgencyTheme(data?.agency, lang);

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
  //  3. Ya NO depende del consentimiento. Entre agosto y septiembre de 2026 sí
  //     dependía, y el resultado fue 1 sesión en 30 días para toda la agencia:
  //     sin un "sí" explícito no se abría sesión y de ahí colgaba todo lo demás.
  //     Ahora la identidad la deriva el servidor con un hash que rota a diario y
  //     no se escribe nada en el móvil, así que no hay permiso que pedir.
  useEffect(() => {
    const apartmentId = data?.apartment?.id;
    if (!apartmentId) return;

    let cancelled = false;
    const startedAt = Date.now();
    const elapsedSeconds = () => Math.round((Date.now() - startedAt) / 1000);

    trackSessionStart(apartmentId, langRef.current).then(res => {
      if (!cancelled && res?.sessionId) {
        sessionIdRef.current = res.sessionId;
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
  }, [data?.apartment?.id]);

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

    // La cookie de atribución se escribe AQUÍ, no al entrar en la guía.
    //
    // Antes se dejaba en cuanto se abría el guidebook, así que todo el que
    // asomaba la nariz se llevaba una cookie de 30 días en .visualtastes.com
    // sin haber hecho nada. Ahora solo la recibe quien de verdad va a una carta,
    // y solo si ha activado el recuerdo entre visitas (setReferralCookie
    // comprueba el consentimiento por su cuenta).
    //
    // Ojo: no cubrir este caso NO deja la atribución a ciegas. El clic desde la
    // guía viaja en la URL (?ref=guide&apt=&gsid=) y el QR físico de la mesa del
    // mismo día lo resuelve el join de servidor en workerTracking.js. La cookie
    // solo añade el caso de días después.
    if (targetType === 'restaurant' && action === 'click_menu') {
      setReferralCookie(data.apartment.id, sessionIdRef.current);
    }

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

  if (loading) return <GuideLoading lang={lang} />;

  if (error || !data) return <GuideNotFound lang={lang} />;

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
  // Ninguna pestaña conserva ya la cabecera completa (2026-09-06) — sin el <nav>
  // de escritorio de Header (hidden md:flex), ya no hay forma de cambiar de
  // pestaña en escritorio (BottomNavBar es md:hidden), pero nadie lo ha pedido,
  // así que no se construye una alternativa sin que haga falta.
  //
  // El selector de idioma flotando EN LA ESQUINA (position: absolute sobre el
  // shell, ver más abajo) se queda solo para info y chat: son las dos pestañas
  // donde arriba del todo hay una foto/portada (el arco del piso, la portada
  // del concierge) sobre la que tiene sentido "flotar" un círculo. Restaurantes
  // y Servicios empiezan con un título de texto plano — reservarles ahí el
  // mismo hueco dejaba una banda vacía enorme antes del título en vez de
  // "arriba del todo" — así que en esas dos el selector va integrado en la
  // misma fila que su título (ver RestaurantsSection/ServicesSection).
  const showFloatingLangCorner = isChatTab;

  // min-h-screen deja crecer la página más allá del viewport, que es lo que
  // queremos en las pestañas normales (contenido largo, footer al final). En
  // el chat y en explorar necesitamos justo lo contrario: una altura fija
  // para que "flex-1 min-h-0" en <main> tenga una altura real que repartir —
  // si no, el input de texto (chat) o el mapa (explorar) terminan más abajo
  // del viewport o con 0px de alto.
  const rootHeightClass = isChatTab ? 'h-screen overflow-hidden' : isExploreTab ? 'h-dvh overflow-hidden' : 'min-h-screen';

  return (
    <div className={`guide-app g-app relative flex flex-col ${rootHeightClass}`} dir={isRtl(lang) ? 'rtl' : 'ltr'} lang={lang}>
      {showWelcome && data.welcome_modal && (
        <WelcomeModal welcome={data.welcome_modal} onClose={() => setShowWelcome(false)} lang={lang} />
      )}

      {/* absolute (no fixed) sobre el shell de la app (el <div className="guide-app
          ... relative ..."> raíz): en info, donde <main> no tiene altura propia
          y es la página entera la que hace scroll, esto se desplaza con el
          contenido en vez de quedarse flotando sobre lo que sea que haya
          debajo. En chat, el shell raíz es h-screen overflow-hidden y no hace
          scroll él mismo, así que el efecto ahí sigue siendo "flotando en la
          esquina" todo el rato, igual que en Explorar. */}
      {showFloatingLangCorner && (
        <div className="absolute top-4 end-4 z-50">
          <LanguageSwitcher lang={lang} onLanguageChange={handleLanguageChange} variant="floating" />
        </div>
      )}

      {/* El chat y explorar son apps de pantalla completa sin scroll de página
          (el chat con su input fijo cerca del nav inferior, explorar con el
          mapa + bottom sheet) — el resto de pestañas son contenido desplazable
          normal con su propio footer. pb-16 en móvil reserva el alto del
          BottomNavBar fijo (h-16) para que no tape el input/sheet. pt-20 en
          Info reserva el hueco del selector de idioma flotante sobre el arco;
          Restaurantes/Servicios no lo necesitan — llevan el selector integrado
          en su propio título, así que su <main> vuelve al py-8 normal. */}
      <main
        className={isChatTab
          ? "flex-1 min-h-0 flex flex-col w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-16 pb-16 md:pb-6"
          : isExploreTab
          ? "g-explore-main relative flex-1 min-h-0 overflow-hidden"
          : activeTab === 'info' || activeTab === 'restaurants'
          ? "w-full"
          : "w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-col gap-12"}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {activeTab === 'info' && (
          <div className={tabAnimClass}>
            <WelcomeHero
              apartmentName={apartment.name}
              address={apartment.address}
              coverImageUrl={apartment.cover_image_url}
              agencyLogoUrl={agency.logo_url}
              agencyName={agency.name}
              currentLang={lang}
              onLanguageChange={handleLanguageChange}
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
              lang={lang}
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
              onLanguageChange={handleLanguageChange}
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
              onLanguageChange={handleLanguageChange}
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
              infoItems={apartment.info}
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

      {!isFullBleed && <GuideFooter lang={lang} />}

    </div>
  );
}
