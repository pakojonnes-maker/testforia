// src/App.tsx — Guide App Router
import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const GuidebookPage = lazy(() => import('./pages/GuidebookPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

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
        {/* Guidebook for a specific apartment */}
        <Route path="/:slug" element={<GuidebookPage />} />
      </Routes>
    </Suspense>
  );
}
