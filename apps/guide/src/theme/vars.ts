// src/theme/vars.ts — del tema calculado a las variables CSS que pinta la app. Funciones puras (sin DOM
// ni React) para poder comprobarlas en scripts/check-theme.mjs.
import { PAPER, deriveTheme, type AgencyColors, type GuideTheme } from './color';
import { fontStack, resolveFonts, type AgencyFonts, type FontRole } from './fonts';

export type GuideAgency = AgencyColors & AgencyFonts;

/** Color de la barra del navegador en móvil: el papel de la guía, no el de la marca. */
export const THEME_COLOR = PAPER;

/** Variables del tema de color. Las lee guide.css; ningún componente lleva un color de marca escrito a mano. */
export function colorVars(theme: GuideTheme): Record<string, string> {
  return {
    '--g-brand': theme.brand,
    '--g-fill': theme.fill,
    '--g-on-fill': theme.onFill,
    '--g-fill-edge': theme.fillEdge,
    '--g-second-edge': theme.secondEdge,
    '--g-accent-edge': theme.accentEdge,
    '--g-text': theme.text,
    '--g-soft': theme.soft,
    '--g-second': theme.second,
    '--g-on-second': theme.onSecond,
    '--g-accent': theme.accent,
    '--g-on-accent': theme.onAccent,
    '--g-accent-mark': theme.accentMark,
    '--g-accent-on-ink': theme.accentOnInk,
  };
}

/** Variables de tipografía: una pila por rol. */
export function fontVars(agency: AgencyFonts | null | undefined): Record<string, string> {
  const f = resolveFonts(agency);
  return {
    '--g-ff-head': fontStack('headline', f.headline),
    '--g-ff-body': fontStack('body', f.body),
    '--g-ff-label': fontStack('label', f.label),
  };
}

/**
 * Puente para los componentes que aún usan los tokens del sistema anterior (index.css, Tailwind
 * `bg-primary`, `font-headline-md`…). Se va vaciando parte a parte y desaparece en la última.
 */
const LEGACY_FONT_TOKENS: Record<FontRole, string[]> = {
  headline: ['--font-display-xl', '--font-display-lg', '--font-headline-lg', '--font-headline-lg-mobile', '--font-headline-md', '--font-headline-sm'],
  body: ['--font-body-md', '--font-body-lg'],
  label: ['--font-label-lg', '--font-label-md', '--font-label-sm', '--font-label-caps'],
};

export function legacyVars(theme: GuideTheme, agency: AgencyFonts | null | undefined): Record<string, string> {
  const fonts = resolveFonts(agency);
  const vars: Record<string, string> = {
    '--brand-primary': theme.fill,
    '--brand-secondary': theme.second,
    '--color-terracotta': theme.fill,
    '--color-deep-sea': theme.second,
    '--color-primary': theme.fill,
    '--color-on-primary': theme.onFill,
    '--color-accent-gold': theme.accent,
  };
  (Object.keys(LEGACY_FONT_TOKENS) as FontRole[]).forEach(role => {
    const stack = fontStack(role, fonts[role]);
    LEGACY_FONT_TOKENS[role].forEach(token => { vars[token] = stack; });
  });
  return vars;
}

/** Todo lo que se escribe en <html> para una agencia. */
export function allVars(agency: GuideAgency | null | undefined): Record<string, string> {
  const theme = deriveTheme(agency);
  return { ...colorVars(theme), ...fontVars(agency), ...legacyVars(theme, agency) };
}
