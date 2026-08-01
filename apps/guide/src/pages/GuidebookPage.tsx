// src/pages/GuidebookPage.tsx — Guest-facing guidebook
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fetchGuidebook, trackSessionStart, trackSessionEnd, trackIntent, trackSectionView, buildMenuUrl, setReferralCookie } from '../lib/api';

const MENU_URL = import.meta.env.VITE_MENU_URL || 'https://menu.visualtastes.com';

import WelcomeHero from '../components/WelcomeHero';
import Header from '../components/Header';
import BottomNavBar from '../components/BottomNavBar';
import InfoSection from '../components/InfoSection';
import DiscoverSection from '../components/DiscoverSection';
import RestaurantsSection from '../components/RestaurantsSection';
import ServicesSection from '../components/ServicesSection';
import ChatIASection from '../components/ChatIASection';
import WelcomeModal, { WelcomeModalData } from '../components/WelcomeModal';
import { getTranslation, ACTIVE_LANGUAGES, isRtl } from '../lib/i18n';

// Types
interface GuidebookData {
  apartment: {
    id: string; name: string; slug: string; address: string;
    cover_image_url: string;
    info: Array<{ id: string; key: string; icon: string; title: string; content: string; media: any[] }>;
  };
  zone: { id: string; name: string; slug: string; region: string; description: string; cover_image_url: string };
  agency: {
    id: string; name: string; logo_url: string;
    primary_color: string | null; secondary_color: string | null; accent_color: string | null;
    font_family: string | null;
  };
  pois: Array<{
    id: string; name: string; description: string; category: string;
    google_maps_url: string; media: any[];
  }>;
  restaurants: Array<{
    id: string; name: string; slug: string; cuisine_type: string;
    tier: string; cover_image: string;
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

export default function GuidebookPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<GuidebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState(() => {
    const browserLang = navigator.language?.split('-')[0] || 'es';
    return ACTIVE_LANGUAGES.includes(browserLang) ? browserLang : 'es';
  });
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [showWelcome, setShowWelcome] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  // Espejo de `lang` para que el efecto de sesión pueda leer el idioma actual sin
  // declararlo como dependencia (cambiar de idioma no debe reiniciar la sesión).
  const langRef = useRef(lang);
  langRef.current = lang;
  const welcomeShownRef = useRef(false);

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
  const FONT_TOKENS = ['--font-body-md', '--font-body-lg', '--font-label-lg', '--font-label-sm', '--font-label-caps'];
  const HEADLINE_FONT_TOKENS = ['--font-headline-md', '--font-headline-lg', '--font-headline-lg-mobile', '--font-display-lg', '--font-display-xl'];
  useEffect(() => {
    const root = document.documentElement.style;
    if (data?.agency?.primary_color) {
      root.setProperty('--brand-primary', data.agency.primary_color);
      root.setProperty('--brand-secondary', data.agency.secondary_color || data.agency.primary_color);
      root.setProperty('--color-terracotta', data.agency.primary_color);
      root.setProperty('--color-deep-sea', data.agency.secondary_color || data.agency.primary_color);
    } else {
      root.setProperty('--brand-primary', 'var(--mar-azul)');
      root.setProperty('--brand-secondary', 'var(--mar-profundo)');
      root.setProperty('--color-terracotta', '#0038AE');
      root.setProperty('--color-deep-sea', '#001550');
    }
    root.setProperty('--color-accent-gold', data?.agency?.accent_color || '#F7BE29');

    // Una sola fuente para todo el guidebook, tal como la vista previa del
    // admin (Diseño > Tipografía) da a entender: título y cuerpo con el mismo
    // ejemplo. Los títulos conservan su propio conjunto de tokens porque llevan
    // Newsreader (serif editorial) por defecto — un cambio de fuente de agencia
    // debe sustituir también eso, no solo el cuerpo del texto.
    //
    // Sin fuente de agencia NO se fuerza nada a mano: se quita la sobrescritura
    // para que vuelvan los valores del @theme. Fijar 'Inter' aquí aplastaba
    // --font-label-caps, que por defecto es Archivo Narrow — los "eyebrows"
    // condensados del sistema editorial salían en Inter en TODAS las guías sin
    // fuente propia, que son casi todas.
    const agencyFont = data?.agency?.font_family ? `'${data.agency.font_family}', sans-serif` : null;
    for (const token of [...FONT_TOKENS, ...HEADLINE_FONT_TOKENS]) {
      if (agencyFont) root.setProperty(token, agencyFont);
      else root.removeProperty(token);
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
  useEffect(() => {
    const apartmentId = data?.apartment?.id;
    if (!apartmentId) return;

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

  // min-h-screen deja crecer la página más allá del viewport, que es lo que
  // queremos en las pestañas normales (contenido largo, footer al final). En
  // el chat necesitamos justo lo contrario: un h-screen fijo para que
  // "flex-1 min-h-0" en <main> tenga una altura real que repartir — si no, el
  // input de texto termina más abajo del viewport, fuera de la vista.
  return (
    <div className={`guide-app font-body-md text-on-surface bg-background relative flex flex-col ${isChatTab ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <div className="film-grain" />
      {showWelcome && data.welcome_modal && (
        <WelcomeModal welcome={data.welcome_modal} onClose={() => setShowWelcome(false)} lang={lang} />
      )}

      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        apartmentName={apartment.name}
      />

      {/* El chat es una app de pantalla completa (input fijo cerca del nav
          inferior, sin scroll de página) — el resto de pestañas son contenido
          desplazable normal con su propio footer. pb-16 en móvil reserva el
          alto del BottomNavBar fijo (h-16) para que no tape el input. */}
      <main className={isChatTab
        ? "flex-1 min-h-0 flex flex-col w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-6 pb-16 md:pb-6"
        : "max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-8 flex flex-col gap-12"}>
        {activeTab === 'info' && (
          <div style={{ animation: 'fadeIn 0.4s ease forwards' }} className="flex flex-col gap-12">
            <WelcomeHero
              apartmentName={apartment.name}
              address={apartment.address}
              coverImageUrl={apartment.cover_image_url}
              agencyLogoUrl={agency.logo_url}
              agencyName={agency.name}
              currentLang={lang}
            />
            {/* QuickInfoBar will be merged into InfoSection or updated later */}
            <InfoSection infoItems={apartment.info} lang={lang} />
          </div>
        )}

        {activeTab === 'discover' && (
          <DiscoverSection
            pois={pois}
            zoneName={zone.name}
            zoneDescription={zone.description}
            lang={lang}
          />
        )}

        {activeTab === 'restaurants' && (
          <RestaurantsSection
            restaurants={restaurants}
            zoneName={zone.name}
            lang={lang}
            onIntent={(type, id, action) => logIntent(type, id, action)}
            buildRestaurantUrl={(restaurantSlug) =>
              buildMenuUrl(MENU_URL, restaurantSlug, apartment.id, sessionIdRef.current)}
          />
        )}

        {activeTab === 'services' && (
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
        )}
        {activeTab === 'chat' && (
          <div className="flex-1 min-h-0 flex flex-col" style={{ animation: 'fadeIn 0.4s ease forwards' }}>
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

      {!isChatTab && (
        <footer style={{
          textAlign: 'center',
          padding: '32px 16px',
          marginTop: 'var(--sp-2xl)',
          marginBottom: '80px', /* space for bottom nav */
          fontSize: '0.75rem',
          color: 'var(--gris-medio)'
        }}>
          <p>Powered by <a href="https://visualtastes.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>VisualTastes Guidebook</a></p>
        </footer>
      )}
    </div>
  );
}
