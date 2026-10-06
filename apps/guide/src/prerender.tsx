// src/prerender.tsx — SOLO para el build: scripts/prerender-landing.mjs lo compila en modo SSR y escribe el HTML de
// cada página de venta (la landing en dist/index.html, las demás en dist/<ruta>.html).
//
// Por qué: los rastreadores de las IA (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot…) no ejecutan JavaScript.
// Sin esto, guide.visualtastes.com les llega como un <div id="root"></div> vacío y no pueden citar la guía.
// No se hidrata: en el navegador React pinta encima como siempre (ver el comentario de index.html).
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CompararPage from './pages/landing/CompararPage';
import ConserjePage from './pages/landing/ConserjePage';
import GestorasPage from './pages/landing/GestorasPage';
import LibroBienvenidaPage from './pages/landing/LibroBienvenidaPage';
import { CONSERJE_FAQ, FAQ, GESTORAS_FAQ, LIBRO_FAQ, PAGES, type PageMeta, type QA } from './pages/landing/data';

export interface PrerenderPage extends PageMeta {
  /** Fichero dentro de dist/: Pages sirve dist/para/x.html en /para/x. */
  file: string;
  faq: ReadonlyArray<QA>;
  html: () => string;
}

const render = (path: string, Page: ComponentType) => () =>
  renderToString(
    <StaticRouter location={path}>
      <Page />
    </StaticRouter>,
  );

const page = (meta: PageMeta, Page: ComponentType, faq: ReadonlyArray<QA>): PrerenderPage => ({
  ...meta,
  file: meta.path === '/' ? 'index.html' : `${meta.path.slice(1)}.html`,
  faq,
  html: render(meta.path, Page),
});

export const PRERENDER_PAGES: ReadonlyArray<PrerenderPage> = [
  page(PAGES.home, LandingPage, FAQ),
  page(PAGES.gestoras, GestorasPage, GESTORAS_FAQ),
  page(PAGES.conserje, ConserjePage, CONSERJE_FAQ),
  page(PAGES.libro, LibroBienvenidaPage, LIBRO_FAQ),
  page(PAGES.comparar, CompararPage, []),
];
