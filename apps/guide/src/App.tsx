// src/App.tsx — Guide App Router
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const GuidebookPage = lazy(() => import('./pages/GuidebookPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

function Loading() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>Cargando guidebook...</p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Landing page (sales) */}
        <Route path="/" element={<LandingPage />} />
        {/* Privacidad + aviso legal. Va ANTES de /:slug o el router la trataría
            como el slug de un apartamento llamado "legal". El idioma llega por
            ?lang= para no arrastrar el estado del guidebook. */}
        <Route path="/legal" element={<LegalPage />} />
        {/* Guidebook for a specific apartment */}
        <Route path="/:slug" element={<GuidebookPage />} />
      </Routes>
    </Suspense>
  );
}
