// apps/client/src/App.tsx
//
// Un solo build sirve visualtastes.com (portada y landing de cada restaurante) y
// menu.visualtastes.com (la carta). La carta no usa MUI: el arranque no lo carga, y solo
// las páginas que sí lo usan (portada, landing, reservas, legal…) lo traen en su chunk
// dentro de <MuiShell>. Antes MUI + framer-motion + axios iban en el arranque de todas:
// ~235 KB comprimidos antes de pedir la carta.
import React, { useEffect, useMemo, useState, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadReelsConfig } from './hooks/useReelsConfig';
import { TrackingAndPushProvider } from './providers/TrackingAndPushProvider';
import { RestaurantProvider } from './contexts/RestaurantContext';
import type { RestaurantData } from './contexts/RestaurantContext';
import { pickInitialLanguage } from './carta/usePrefs';

const MuiShell = React.lazy(() => import('./components/MuiShell'));
const SplashScreen = React.lazy(() => import('./components/ui/SplashScreen'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ReelsView = React.lazy(() => import('./pages/ReelsView'));
const RestaurantLanding = React.lazy(() => import('./pages/RestaurantLanding'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const ReservePage = React.lazy(() => import('./pages/ReservePage'));
const RedemptionPage = React.lazy(() => import('./pages/RedemptionPage'));

type Page = 'home' | 'privacy' | 'legal-notice' | 'reserve' | 'redemption' | 'notfound' | 'reels' | 'landing';

const GlobalLoader = () => (
  <div className="vt-loader" role="progressbar" aria-busy="true"><span /></div>
);

/** Ruta → página. La carta del dominio menu. sale siempre como carta; en el principal, como landing. */
function resolvePage(path: string, isMenuDomain: boolean): { page: Page; slug: string | null } {
  if (path === '/' && !isMenuDomain) return { page: 'home', slug: null };
  if (path.startsWith('/legal/privacy')) return { page: 'privacy', slug: null };
  // Aviso legal (art. 10 LSSI). Se acepta /legal/aviso y /legal/legal-notice porque el
  // enlace se pinta en apps con idiomas distintos.
  if (path.startsWith('/legal/aviso') || path.startsWith('/legal/legal-notice')) return { page: 'legal-notice', slug: null };
  if (path.startsWith('/reserve/')) return { page: 'reserve', slug: path.split('/')[2] || null };
  // Canje de ofertas (magic link): /r/{token} (antiguo) y /{slug}/oferta/{token}
  if (/^\/r\/[a-zA-Z0-9]{16}$/.test(path) || /^\/[^/]+\/oferta\/[a-zA-Z0-9]{16}$/.test(path)) return { page: 'redemption', slug: null };
  // /r/{slug}: formato antiguo de la carta
  if (path.startsWith('/r/')) return { page: 'reels', slug: path.split('/')[2] || null };
  const slug = path.match(/^\/([^/]+)/)?.[1] || null;
  if (!slug) return { page: 'notfound', slug: null };
  return { page: isMenuDomain ? 'reels' : 'landing', slug };
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMenuDomain = window.location.hostname.startsWith('menu.');
  const { page, slug } = useMemo(() => resolvePage(location.pathname, isMenuDomain), [location.pathname, isMenuDomain]);

  // Una ruta más honda que /{slug} (p. ej. /xpecado/dish/123, enlaces de la carta antigua)
  // se reduce a la carta del restaurante: no hay pantallas por plato.
  useEffect(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if ((page === 'reels' || page === 'landing') && slug && parts.length > 1 && parts[0] !== 'r') {
      navigate(`/${slug}${location.search}`, { replace: true });
    }
  }, [page, slug, location.pathname, location.search, navigate]);

  // La app instalada en un iPhone arranca en la raíz (start_url del manifest). Si el cliente
  // la instaló para activar avisos desde una carta, se le devuelve a esa carta.
  useEffect(() => {
    if (!isMenuDomain || location.pathname !== '/') return;
    try {
      const pending = localStorage.getItem('vt_push_pending');
      if (pending && pending !== 'true') navigate(`/${pending}`, { replace: true });
    } catch { /* ignorar */ }
  }, [isMenuDomain, location.pathname, navigate]);

  // Datos del restaurante: solo la carta y las reservas. La carta se pide ya en el idioma del
  // cliente (el que eligió antes o el de su móvil): antes se pedía siempre en español y, para
  // un extranjero, después llegaba una segunda descarga entera en su idioma.
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const needsData = (page === 'reels' || page === 'reserve') && !!slug;

  useEffect(() => {
    if (!needsData || !slug) return;
    let live = true;
    const lang = page === 'reels' ? pickInitialLanguage(slug) : 'es';
    setError(null);
    const first = loadReelsConfig(slug, lang);
    // El español también hace falta ("Para el camarero", y es la caída si el idioma del móvil
    // no está en esta carta): se pide en paralelo, después del idioma del cliente.
    if (page === 'reels' && lang !== 'es') loadReelsConfig(slug, 'es').catch(() => { });
    first
      .then((cfg) => {
        if (!live) return;
        if (!cfg?.restaurant) throw new Error('No se encontraron datos del restaurante');
        setRestaurantData({ restaurant: cfg.restaurant, sections: cfg.sections, languages: cfg.languages, dishesBySection: {} });
        setLoadedFor(slug);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setRestaurantData(null);
        setLoadedFor(slug);
      });
    return () => { live = false; };
  }, [needsData, slug, page]);

  const loading = needsData && loadedFor !== slug;

  // --- La carta: sin MUI ---
  if (page === 'reels') {
    if (loading) return <GlobalLoader />;
    if (error || !restaurantData?.restaurant) {
      return (
        <div className="vt-error">
          <p>{error || `Restaurante "${slug}" no encontrado`}</p>
        </div>
      );
    }
    return (
      <RestaurantProvider value={restaurantData}>
        <TrackingAndPushProvider restaurantId={restaurantData.restaurant.id}>
          <Suspense fallback={<GlobalLoader />}>
            <ReelsView />
          </Suspense>
        </TrackingAndPushProvider>
      </RestaurantProvider>
    );
  }

  // --- El resto de páginas: MUI con el tema oscuro de siempre ---
  const content = (() => {
    switch (page) {
      case 'home': return <HomePage />;
      case 'privacy': return <PrivacyPolicyPage doc="privacy" />;
      case 'legal-notice': return <PrivacyPolicyPage doc="legal-notice" />;
      case 'redemption': return <RedemptionPage />;
      case 'landing': return <RestaurantLanding slugProp={slug || undefined} />;
      case 'reserve':
        if (loading) return <GlobalLoader />;
        if (error || !restaurantData?.restaurant) return <NotFoundPage />;
        return (
          <RestaurantProvider value={restaurantData}>
            <TrackingAndPushProvider restaurantId={restaurantData.restaurant.id}>
              <ReservePage />
            </TrackingAndPushProvider>
          </RestaurantProvider>
        );
      default: return <NotFoundPage />;
    }
  })();

  return (
    <Suspense fallback={<GlobalLoader />}>
      <MuiShell>
        {(page === 'home' || page === 'landing') && <SplashOnce />}
        <Suspense fallback={<GlobalLoader />}>{content}</Suspense>
      </MuiShell>
    </Suspense>
  );
}

/** El logo girando de la portada y las landings (la carta ya no lo lleva). */
const SplashOnce = () => {
  const [show, setShow] = useState(true);
  if (!show) return null;
  return <SplashScreen isAppReady onComplete={() => setShow(false)} />;
};

export default App;
