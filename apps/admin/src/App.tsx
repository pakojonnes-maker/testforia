import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LinearProgress, ThemeProvider, CssBaseline } from '@mui/material';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import { useAuth } from './contexts/AuthContext';
import theme from './theme';

// Importaciones habituales
import DashboardPage from './pages/DashboardPage';
import DishesPage from './pages/DishesPage';
import DishFormPage from './pages/DishFormPage';
import SectionsPage from './pages/SectionsPage';
import LandingBuilder from './pages/landing/LandingBuilder';

// Importaciones con carga diferida para las nuevas páginas
const ConfigurationPage = lazy(() => import('./pages/ConfigurationPage'));
const StylingPage = lazy(() => import('./pages/StylingPage'));
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));

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
          <Route index element={<DashboardPage />} />
          <Route path="sections" element={<SectionsPage />} />
          <Route path="dishes" element={<DishesPage />} />
          <Route path="dishes/new" element={<DishFormPage />} />
          <Route path="dishes/:id" element={<DishFormPage />} />
          <Route path="/admin/landing" element={<LandingBuilder />} />

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
            path="analytics"
            element={
              <Suspense fallback={<LinearProgress />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="reviews"
            element={
              <Suspense fallback={<LinearProgress />}>
                <ReviewsPage />
              </Suspense>
            }
          />
          <Route
            path="media"
            element={
              <Suspense fallback={<LinearProgress />}>
                <MediaPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;