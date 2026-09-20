// src/App.tsx — Guide App Router
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const GuidebookPage = lazy(() => import('./pages/GuidebookPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));

// Mientras baja el trozo de la página (aún no hay CSS ni textos): papel en blanco, sin literales en ningún
// idioma. En un instante lo sustituye GuideLoading, ya con el diseño.
function Loading() {
  return <div role="status" aria-busy="true" style={{ position: 'fixed', inset: 0, background: '#F8F3E9' }} />;
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
