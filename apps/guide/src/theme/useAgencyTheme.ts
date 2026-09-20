// src/theme/useAgencyTheme.ts — aplica el tema de la agencia (colores y tipografías de la BD) a la guía.
//
// Antes esto vivía en GuidebookPage.tsx como un efecto de ~80 líneas que solo pisaba unos tokens del
// sistema anterior. Ahora la fuente única es `allVars()`: de los tres colores y las tres fuentes de la
// agencia salen todas las variables que lee guide.css. Sin datos de agencia se pintan los valores del
// diseño, no un azul heredado.
import { useEffect } from 'react';
import { deriveTheme, type GuideTheme } from './color';
import { googleFontsHref, resolveFonts } from './fonts';
import { THEME_COLOR, allVars, type GuideAgency } from './vars';

const FONTS_LINK_ID = 'agency-fonts';

/** Crea, actualiza o quita el <link> de Google Fonts de las familias que no van empaquetadas. */
function syncFontsLink(href: string | null): void {
  const existing = document.getElementById(FONTS_LINK_ID) as HTMLLinkElement | null;
  if (!href) {
    existing?.remove();
    return;
  }
  if (existing) {
    if (existing.href !== href) existing.href = href;
    return;
  }
  const link = document.createElement('link');
  link.id = FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function useAgencyTheme(agency: GuideAgency | null | undefined, lang: string): GuideTheme {
  const theme = deriveTheme(agency);

  useEffect(() => {
    const root = document.documentElement.style;
    const vars = allVars(agency);
    Object.entries(vars).forEach(([name, value]) => root.setProperty(name, value));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR);
    return () => {
      Object.keys(vars).forEach(name => root.removeProperty(name));
    };
  }, [agency?.primary_color, agency?.secondary_color, agency?.accent_color, agency?.headline_font, agency?.body_font, agency?.label_font]);

  // Las tipografías que no van empaquetadas se piden aparte y solo si hacen falta; el árabe pide la suya.
  useEffect(() => {
    const fonts = resolveFonts(agency);
    syncFontsLink(googleFontsHref([fonts.headline, fonts.body, fonts.label], lang));
    return () => syncFontsLink(null);
  }, [agency?.headline_font, agency?.body_font, agency?.label_font, lang]);

  return theme;
}
