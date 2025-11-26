// apps/client/src/App.tsx - OPTIMIZADO PARA TEMPLATES
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme, Box, CircularProgress, Typography } from '@mui/material';
import { apiClient } from './lib/apiClient';
import { TrackingAndPushProvider } from './providers/TrackingAndPushProvider';
import HomePage from './pages/HomePage';
import ReelsView from './pages/ReelsView';
import RestaurantLanding from './pages/RestaurantLanding';
import NotFoundPage from './pages/NotFoundPage';
import '@fontsource-variable/fraunces/index.css'
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

// ✅ Context para datos del restaurante
interface RestaurantData {
  restaurant: any;
  sections: any[];
  dishesBySection: any;
  languages: any[];
  reelsConfig?: any;
}

const RestaurantContext = React.createContext<RestaurantData | null>(null);

// Hook para usar datos del restaurante
export const useRestaurant = () => {
  const context = React.useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant debe usarse dentro de RestaurantContext.Provider');
  }
  return context;
};

// ✅ COMPONENTE PRINCIPAL
function App() {
  const location = useLocation();
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extraer slug de cualquier ruta
  const slug = useMemo(() => {
    const path = location.pathname;
    
    if (path === '/') return null;
    
    // Formato nuevo: /yucas, /yucas/r
    const newFormatMatch = path.match(/^\/([^\/]+)/);
    if (newFormatMatch && !path.startsWith('/r/')) {
      return newFormatMatch[1];
    }
    
    // Formato viejo: /r/yucas
    const oldFormatMatch = path.match(/^\/r\/([^\/]+)/);
    if (oldFormatMatch) {
      return oldFormatMatch[1];
    }
    
    return null;
  }, [location.pathname]);

  // Determinar qué página mostrar
  const currentPage = useMemo(() => {
    const path = location.pathname;
    
    if (path === '/') return 'home';
    if (!slug) return 'notfound';
    
    // Si tiene /r al final o formato viejo con /r/
    if (path.endsWith('/r') || path.includes('/r/') || path.includes('/section/') || path.includes('/dish/')) {
      return 'reels';
    }
    
    // Si solo es el slug, mostrar landing
    return 'landing';
  }, [location.pathname, slug]);

  // ⭐ Cargar datos del restaurante SOLO para REELS
  useEffect(() => {
    // ✅ Si no hay slug O si es landing, NO cargar datos aquí
    if (!slug || currentPage === 'landing') {
      setRestaurantData(null);
      setLoading(false);
      return;
    }

    // ✅ Solo cargar para REELS
    let isMounted = true;

    async function loadRestaurant() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🚀 [App] Cargando restaurante para REELS:', slug);
        
        const result = await apiClient.getRestaurantReelsData(slug);
        
        if (!isMounted) return;

        if (result?.restaurant) {
          console.log('✅ [App] Restaurante cargado:', result.restaurant.name);
          
          setRestaurantData({
            ...result,
            reelsConfig: result.reelsConfig || null
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
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRestaurant();

    return () => {
      isMounted = false;
    };
  }, [slug, currentPage]); // ← Añadido currentPage como dependencia

  // ✅ Tema dinámico basado en config de reels
  const theme = useMemo(() => {
    const primaryColor = restaurantData?.reelsConfig?.colors?.primary;
    const secondaryColor = restaurantData?.reelsConfig?.colors?.secondary;
    return createCustomTheme(primaryColor, secondaryColor);
  }, [restaurantData?.reelsConfig]);

  // ✅ RENDERIZADO OPTIMIZADO
  const renderContent = () => {
    // Página de inicio
    if (currentPage === 'home') {
      return <HomePage />;
    }

    // Not found
    if (currentPage === 'notfound') {
      return <NotFoundPage />;
    }


if (currentPage === 'landing') {
  console.log('🏠 [App] Renderizando LANDING para:', slug);
  return <RestaurantLanding slugProp={slug} />; // ← AÑADIR slugProp
}
    // ✅ REELS - Necesita loading y context
    if (loading) {
      return (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="100vh"
          bgcolor="#000"
          color="#fff"
        >
          <CircularProgress size={60} sx={{ color: '#9c27b0', mb: 2 }} />
          <Typography variant="h6">Cargando {slug}...</Typography>
        </Box>
      );
    }

    if (error || !restaurantData?.restaurant) {
      return (
        <Box 
          display="flex" 
          flexDirection="column" 
          alignItems="center" 
          justifyContent="center" 
          minHeight="100vh"
          bgcolor="#000"
          color="#fff"
          p={3}
        >
          <Typography variant="h4" color="error" gutterBottom>
            ⚠️ Error
          </Typography>
          <Typography variant="body1" color="textSecondary" gutterBottom align="center">
            {error || `Restaurante "${slug}" no encontrado`}
          </Typography>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              backgroundColor: '#9c27b0',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            🔄 Reintentar
          </button>
        </Box>
      );
    }

    // ✅ REELS con tracking y context
    console.log('🎬 [App] Renderizando REELS con tracking para:', slug);
    console.log('🔍 [App] Datos para tracking:', {
      restaurantId: restaurantData.restaurant.id,
      restaurantName: restaurantData.restaurant.name,
      restaurantSlug: restaurantData.restaurant.slug,
      hasReelsConfig: !!restaurantData.reelsConfig
    });

    return (
      <RestaurantContext.Provider value={restaurantData}>
        <TrackingAndPushProvider 
          restaurantId={restaurantData.restaurant.id}
          restaurantName={restaurantData.restaurant.name}
          restaurantSlug={restaurantData.restaurant.slug}
        >
          <ReelsView />
        </TrackingAndPushProvider>
      </RestaurantContext.Provider>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {renderContent()}
    </ThemeProvider>
  );
}

export default App;
