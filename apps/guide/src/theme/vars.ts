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
    '--g-fill-2': theme.fill2,
    '--g-fill-edge': theme.fillEdge,
    '--g-second-edge': theme.secondEdge,
    '--g-accent-edge': theme.accentEdge,
    '--g-text': theme.text,
    '--g-mark': theme.mark,
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

/** Todo lo que se escribe en <html> para una agencia. */
export function allVars(agency: GuideAgency | null | undefined): Record<string, string> {
  const theme = deriveTheme(agency);
  return { ...colorVars(theme), ...fontVars(agency) };
}
