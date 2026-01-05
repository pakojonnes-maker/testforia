// apps/client/src/App.tsx - OPTIMIZADO: Lazy Loading & Subdomains
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, Box, CircularProgress, Typography } from '@mui/material';
import { apiClient } from './lib/apiClient';
import { TrackingAndPushProvider } from './providers/TrackingAndPushProvider';
import { SplashScreen } from './components/ui/SplashScreen';
import { CookieConsentBanner } from './components/ui/CookieConsentBanner';
import '@fontsource-variable/fraunces/index.css'

// ✅ Lazy Loading para Code Splitting (Mejora masiva de performance)
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ReelsView = React.lazy(() => import('./pages/ReelsView'));
const RestaurantLanding = React.lazy(() => import('./pages/RestaurantLanding'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage'));
const ReservePage = React.lazy(() => import('./pages/ReservePage'));
const LoyaltyPage = React.lazy(() => import('./pages/LoyaltyPage').then(module => ({ default: module.LoyaltyPage })));
const RedemptionPage = React.lazy(() => import('./pages/RedemptionPage'));
const EventLandingPage = React.lazy(() => import('./pages/EventLandingPage'));

// ✅ Tema personalizado adaptable
const createCustomTheme = (primaryColor?: string, secondaryColor?: string) => createTheme({
  palette: {
    mode: 'dark',
    primary: { main: primaryColor || '#9c27b0' },
    secondary: { main: secondaryColor || '#2196f3' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 500 },
  },
});

import { RestaurantProvider } from './contexts/RestaurantContext';
import type { RestaurantData } from './contexts/RestaurantContext';

// Loader Global para Suspense
const GlobalLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="#000">
    <CircularProgress sx={{ color: '#9c27b0' }} />
  </Box>
);

// ✅ COMPONENTE PRINCIPAL
function App() {
  const location = useLocation();
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ 1. Detectar Subdominio y Slug
  const { isMenuDomain, slug, isLegacyReels } = useMemo(() => {
    const hostname = window.location.hostname;
    // Detectar si estamos en menu.visualtaste.com (o equivalentes locales/staging)
    const isMenuDomain = hostname.startsWith('menu.');

    const path = location.pathname;
    let slug: string | null = null;
    let isLegacyReels = false;

    // Lógica para extraer slug
    // Check for magic link redemption first (16-char alphanumeric token)
    const redemptionMatch = path.match(/^\/r\/([a-zA-Z0-9]{16})$/);
    if (redemptionMatch) {
      // This is a magic link, not a restaurant slug
      slug = null;
    } else if (path === '/') {
      slug = null;
    } else if (path.startsWith('/legal/')) {
      slug = null;
    } else if (path.startsWith('/reserve/')) {
      slug = path.split('/')[2];
    } else if (path.startsWith('/r/')) {
      // Legacy Format: /r/slug (restaurant reels)
      isLegacyReels = true;
      slug = path.split('/')[2];
    } else {
      // Standard Format: /slug
      const matches = path.match(/^\/([^\/]+)/);
      if (matches) slug = matches[1];
    }

    return { isMenuDomain, slug, isLegacyReels };
  }, [location.pathname]);

  // ✅ 2. Determinar qué página mostrar
  const currentPage = useMemo(() => {
    const path = location.pathname;

    if (path === '/' && !isMenuDomain) return 'home'; // Home solo en dominio principal
    if (path.startsWith('/legal/privacy')) return 'privacy';
    if (path.startsWith('/reserve/')) return 'reserve';
    if (path.startsWith('/loyalty/') || path.startsWith('/l/') || path.match(/^\/[^/]+\/loyalty/)) return 'loyalty';

    // Magic link redemption - two formats:
    // 1. Legacy: /r/{16-char-token}
    // 2. New: /{slug}/oferta/{16-char-token}
    if (path.match(/^\/r\/[a-zA-Z0-9]{16}$/)) return 'redemption';
    if (path.match(/^\/[^/]+\/oferta\/[a-zA-Z0-9]{16}$/)) return 'redemption';

    // Event landing page: /{slug}/evento/{campaignId}
    if (path.match(/^\/[^/]+\/evento\/[^/]+$/)) return 'event';

    if (!slug) return 'notfound';


    // REGLAS DE ENRUTAMIENTO:

    // Caso A: Dominio "menu." -> SIEMPRE muestra Reels (Menu)
    if (isMenuDomain) {
      return 'reels';
    }

    // Caso B: Ruta Legacy "/r/" -> SIEMPRE muestra Reels
    if (isLegacyReels || path.includes('/section/') || path.includes('/dish/')) {
      return 'reels';
    }


    // Caso C: Default en dominio principal -> LANDING (Marketing)
    return 'landing';
  }, [location.pathname, slug, isMenuDomain, isLegacyReels]);

  // ⭐ Cargar datos del restaurante SOLO para REELS
  useEffect(() => {
    // Si no es página de reels ni de reservas, no cargamos datos pesados
    if ((currentPage !== 'reels' && currentPage !== 'reserve') || !slug) {
      setRestaurantData(null);
      setLoading(false);
      return;
    }

    // Cargar datos para el menú
    let isMounted = true;

    async function loadRestaurant() {
      try {
        setLoading(true);
        setError(null);

        console.log('🚀 [App] Cargando menú para:', slug);

        const result = await apiClient.getRestaurantReelsData(slug!);

        if (!isMounted) return;

        if (result?.restaurant) {
          console.log('✅ [App] Datos cargados:', result.restaurant.name);

          setRestaurantData({
            ...result,
            reelsConfig: (result as any).reelsConfig || null
          });
        } else {
          throw new Error('No se encontraron datos del restaurante');
        }

      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Error desconocido';
        console.error('❌ [App] Error:', message);
        setError(message);
        setRestaurantData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRestaurant();

    return () => { isMounted = false; };
  }, [slug, currentPage]);

  // ✅ Tema dinámico
  const theme = useMemo(() => {
    const primaryColor = restaurantData?.reelsConfig?.colors?.primary;
    const secondaryColor = restaurantData?.reelsConfig?.colors?.secondary;
    return createCustomTheme(primaryColor, secondaryColor);
  }, [restaurantData?.reelsConfig]);

  // ✅ RENDERIZADO OPTIMIZADO CON SUSPENSE
  const renderContent = () => {
    return (
      <Suspense fallback={<GlobalLoader />}>
        {_renderPageContent()}
      </Suspense>
    );
  };

  const _renderPageContent = () => {
    if (currentPage === 'home') return <HomePage />;
    if (currentPage === 'privacy') return <PrivacyPolicyPage />;
    if (currentPage === 'notfound') return <NotFoundPage />;

    if (currentPage === 'landing') {
      console.log('🏠 [App] Renderizando LANDING para:', slug);
      return <RestaurantLanding slugProp={slug || undefined} />;
    }

    if (currentPage === 'reserve') {
      if (loading) return <GlobalLoader />;
      if (error || !restaurantData?.restaurant) return <NotFoundPage />;

      return (
        <RestaurantProvider value={restaurantData}>
          <TrackingAndPushProvider restaurantId={restaurantData.restaurant.id}>
            <ReservePage />
            <CookieConsentBanner />
          </TrackingAndPushProvider>
        </RestaurantProvider>
      );
    }

    if (currentPage === 'loyalty') {
      return <LoyaltyPage />;
    }

    if (currentPage === 'redemption') {
      return <RedemptionPage />;
    }

    if (currentPage === 'event') {
      return <EventLandingPage />;
    }


    // --- LOGICA REELS VIEW ---
    // Note: We don't return GlobalLoader here if loading is true, 
    // because we want the content to be ready behind the splash screen.
    // However, if we return null, the splash screen covers it.
    if (loading) return <GlobalLoader />;

    if (error || !restaurantData?.restaurant) {
      return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="100vh" bgcolor="#000" color="#fff" p={3}>
          <Typography variant="h4" color="error" gutterBottom>⚠️ Error</Typography>
          <Typography variant="body1" color="textSecondary" align="center">{error || `Restaurante "${slug}" no encontrado`}</Typography>
        </Box>
      );
    }

    console.log('🎬 [App] Renderizando MENÚ DIGITAL para:', slug);
    return (
      <RestaurantProvider value={restaurantData}>
        <TrackingAndPushProvider restaurantId={restaurantData.restaurant.id}>
          <ReelsView />
          {!showSplash && <CookieConsentBanner />}
        </TrackingAndPushProvider>
      </RestaurantProvider>
    );
  };

  // State for Splash Screen
  const [showSplash, setShowSplash] = useState(true);

  // If loading is true, app is NOT ready.
  // Exception: Landing page handles its own loading, so for 'landing' currentPage, loading is false in App.
  // But we might want to show splash for landing too? 
  // For now, respect App's loading state.

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {showSplash && (
        <SplashScreen
          isAppReady={!loading}
          onComplete={() => setShowSplash(false)}
        />
      )}
      {renderContent()}
    </ThemeProvider>
  );
}

export default App;
