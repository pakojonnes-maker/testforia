import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LinearProgress, ThemeProvider, CssBaseline } from '@mui/material';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import { useAuth } from './contexts/AuthContext';
import theme from './theme';

// Importaciones habituales

import DishesPage from './pages/DishesPage';
import DishFormPage from './pages/DishFormPage';
const WebPage = lazy(() => import('./pages/WebPage'));

// Importaciones con carga diferida para las nuevas páginas
const ConfigurationPage = lazy(() => import('./pages/ConfigurationPage'));
const StylingPage = lazy(() => import('./pages/StylingPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const QRGeneratorPage = lazy(() => import('./pages/QRGeneratorPage'));
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'));
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'));
// ✅ Guidebook Admin Pages
const GuideAgencyDashboard = lazy(() => import('./pages/guide/GuideAgencyDashboard'));
const GuideApartmentsPage = lazy(() => import('./pages/guide/GuideApartmentsPage'));
const GuideApartmentDetail = lazy(() => import('./pages/guide/GuideApartmentDetail'));


// Componente para proteger rutas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LinearProgress />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={
            <Suspense fallback={<LinearProgress />}>
              <AnalyticsPage />
            </Suspense>
          } />
          <Route path="dishes" element={<DishesPage />} />
          <Route path="dishes/new" element={<DishFormPage />} />
          <Route path="dishes/:id" element={<DishFormPage />} />
          <Route
            path="/admin/landing"
            element={
              <Suspense fallback={<LinearProgress />}>
                <WebPage />
              </Suspense>
            }
          />

          {/* Nuevas rutas */}
          <Route
            path="settings"
            element={
              <Suspense fallback={<LinearProgress />}>
                <ConfigurationPage />
              </Suspense>
            }
          />
          <Route
            path="settings/styling"
            element={
              <Suspense fallback={<LinearProgress />}>
                <StylingPage />
              </Suspense>
            }
          />
          <Route
            path="marketing"
            element={
              <Suspense fallback={<LinearProgress />}>
                <MarketingPage />
              </Suspense>
            }
          />

          <Route
            path="users"
            element={
              <Suspense fallback={<LinearProgress />}>
                <UsersPage />
              </Suspense>
            }
          />
          <Route
            path="qr-generator"
            element={
              <Suspense fallback={<LinearProgress />}>
                <QRGeneratorPage />
              </Suspense>
            }
          />
          <Route
            path="reservations"
            element={
              <Suspense fallback={<LinearProgress />}>
                <ReservationsPage />
              </Suspense>
            }
          />
          <Route
            path="delivery"
            element={
              <Suspense fallback={<LinearProgress />}>
                <DeliveryPage />
              </Suspense>
            }
          />

          {/* ✅ Guidebook Admin Routes */}
          <Route
            path="guide"
            element={
              <Suspense fallback={<LinearProgress />}>
                <GuideAgencyDashboard />
              </Suspense>
            }
          />
          <Route
            path="guide/apartments"
            element={
              <Suspense fallback={<LinearProgress />}>
                <GuideApartmentsPage />
              </Suspense>
            }
          />
          <Route
            path="guide/apartments/:id"
            element={
              <Suspense fallback={<LinearProgress />}>
                <GuideApartmentDetail />
              </Suspense>
            }
          />

        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;