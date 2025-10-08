import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LinearProgress } from '@mui/material';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import { useAuth } from './contexts/AuthContext';

// Importaciones habituales
import DashboardPage from './pages/DashboardPage';
import DishesPage from './pages/DishesPage';
import DishFormPage from './pages/DishFormPage';
import SectionsPage from './pages/SectionsPage';

// Importaciones con carga diferida para las nuevas páginas
const ConfigurationPage = lazy(() => import('./pages/ConfigurationPage'));
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
  );
}

export default App;