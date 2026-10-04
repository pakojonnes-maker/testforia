import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, type ReactNode } from 'react';
import { LinearProgress, ThemeProvider, CssBaseline } from '@mui/material';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import { useAuth } from './contexts/AuthContext';
import theme from './theme';

// Todas las pantallas del panel se cargan bajo demanda; el <Suspense> que las
// envuelve está en DashboardLayout, alrededor del <Outlet />.
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const DishesPage = lazy(() => import('./pages/DishesPage'));
const DishFormPage = lazy(() => import('./pages/DishFormPage'));
const WebPage = lazy(() => import('./pages/WebPage'));
const ConfigurationPage = lazy(() => import('./pages/ConfigurationPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const LoyaltyPage = lazy(() => import('./pages/LoyaltyPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const QRGeneratorPage = lazy(() => import('./pages/QRGeneratorPage'));
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'));
// Guidebook
const GuideAgencyDashboard = lazy(() => import('./pages/guide/GuideAgencyDashboard'));
const GuideApartmentsPage = lazy(() => import('./pages/guide/GuideApartmentsPage'));
const GuideApartmentDetail = lazy(() => import('./pages/guide/GuideApartmentDetail'));
const GuideDesignPage = lazy(() => import('./pages/guide/GuideDesignPage'));
// GuidePoisPage y GuideExperiencesPage se fusionaron: en guide_pois las dos
// pantallas editaban la misma tabla (is_bookable las distinguía), así que ahora
// es una sola pantalla con pestañas Lugares/Experiencias en vez de dos rutas.
const GuideCatalogPage = lazy(() => import('./pages/guide/GuideCatalogPage'));
const GuideStorePage = lazy(() => import('./pages/guide/GuideStorePage'));
const GuideCategoriesPage = lazy(() => import('./pages/guide/GuideCategoriesPage'));
const GuideZoneRestaurantsPage = lazy(() => import('./pages/guide/GuideZoneRestaurantsPage'));
const GuideConversionsPage = lazy(() => import('./pages/guide/GuideConversionsPage'));
const GuideTvPage = lazy(() => import('./pages/guide/GuideTvPage'));

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LinearProgress />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AnalyticsPage />} />
          <Route path="dishes" element={<DishesPage />} />
          <Route path="dishes/new" element={<DishFormPage />} />
          <Route path="dishes/:id" element={<DishFormPage />} />
          <Route path="admin/landing" element={<WebPage />} />
          <Route path="settings" element={<ConfigurationPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="qr-generator" element={<QRGeneratorPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="delivery" element={<DeliveryPage />} />

          <Route path="guide" element={<GuideAgencyDashboard />} />
          <Route path="guide/apartments" element={<GuideApartmentsPage />} />
          <Route path="guide/apartments/:id" element={<GuideApartmentDetail />} />
          <Route path="guide/tv" element={<GuideTvPage />} />
          <Route path="guide/design" element={<GuideDesignPage />} />
          <Route path="guide/catalog" element={<GuideCatalogPage />} />
          {/* Alias de las rutas antiguas: enlaces guardados o abiertos en otra
              pestaña siguen funcionando en vez de dar un 404 de React Router. */}
          <Route path="guide/pois" element={<Navigate to="/guide/catalog" replace />} />
          <Route path="guide/experiences" element={<Navigate to="/guide/catalog" replace />} />
          <Route path="guide/store" element={<GuideStorePage />} />
          <Route path="guide/categories" element={<GuideCategoriesPage />} />
          <Route path="guide/restaurants" element={<GuideZoneRestaurantsPage />} />
          <Route path="guide/conversions" element={<GuideConversionsPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
