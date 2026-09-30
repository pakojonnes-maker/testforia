// src/prerender.tsx — SOLO para el build: scripts/prerender-landing.mjs lo compila en modo SSR y mete el HTML de
// la landing dentro de dist/index.html.
//
// Por qué: los rastreadores de las IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot…) no ejecutan JavaScript.
// Sin esto, guide.visualtastes.com les llega como un <div id="root"></div> vacío y no pueden citar la guía.
// No se hidrata: en el navegador React pinta encima como siempre (ver el comentario de index.html).
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';

export { FAQ } from './pages/landing/data';

export function renderLanding(): string {
  return renderToString(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>,
  );
}
