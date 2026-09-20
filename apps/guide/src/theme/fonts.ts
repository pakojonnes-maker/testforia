// src/theme/fonts.ts — las tres tipografías de la guía (titulares, cuerpo, etiquetas) salen de la BD,
// una por rol, y si la agencia no ha elegido ninguna se usan las del diseño: Playfair Display para los
// titulares y Montserrat para todo lo demás.
//
// Las dos del diseño van EMPAQUETADAS con la app (@fontsource-variable, mismo origen): no hacen ninguna
// petición a terceros. Las demás que ofrece el admin se piden a Google Fonts bajo demanda, solo si una
// agencia las ha elegido.

export type FontRole = 'headline' | 'body' | 'label';

export interface AgencyFonts {
  headline_font?: string | null;
  body_font?: string | null;
  label_font?: string | null;
}

export const DEFAULT_FONTS: Record<FontRole, string> = {
  headline: 'Playfair Display',
  body: 'Montserrat',
  label: 'Montserrat',
};

/**
 * Los tres valores con los que el selector de Diseño del admin guardaba SUS valores por defecto
 * (GuideDesignPage.tsx): una agencia que pulsó «Guardar» sin tocar las fuentes los tiene en la BD sin
 * haberlos elegido. Cuando llegan los tres juntos y exactamente esos, se tratan como «sin elegir».
 * Si la agencia cambió cualquiera de los tres, se respetan los tres tal cual.
 */
const LEGACY_DEFAULT_TRIO = ['newsreader', 'inter', 'archivo narrow'];

const clean = (v: string | null | undefined): string | null => {
  const s = (v ?? '').trim();
  return s ? s : null;
};

export function resolveFonts(fonts: AgencyFonts | null | undefined): Record<FontRole, string> {
  const h = clean(fonts?.headline_font);
  const b = clean(fonts?.body_font);
  const l = clean(fonts?.label_font);
  const untouched = h && b && l
    && h.toLowerCase() === LEGACY_DEFAULT_TRIO[0]
    && b.toLowerCase() === LEGACY_DEFAULT_TRIO[1]
    && l.toLowerCase() === LEGACY_DEFAULT_TRIO[2];
  if (untouched) return { ...DEFAULT_FONTS };
  return {
    headline: h ?? DEFAULT_FONTS.headline,
    body: b ?? DEFAULT_FONTS.body,
    label: l ?? DEFAULT_FONTS.label,
  };
}

/** Nombre de la familia tal como la declara el CSS empaquetado (las variables de fontsource llevan «Variable»). */
const SELF_HOSTED: Record<string, string> = {
  'Playfair Display': 'Playfair Display Variable',
  'Montserrat': 'Montserrat Variable',
};

/** Las que se piden a Google Fonts si una agencia las elige (query de css2, con los pesos que usa el diseño). */
const GOOGLE_FONT_QUERY: Record<string, string> = {
  'Lora': 'Lora:ital,wght@0,400..700;1,400..700',
  'Fraunces': 'Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900',
  'Newsreader': 'Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800',
  'Work Sans': 'Work+Sans:wght@300..900',
  'Nunito Sans': 'Nunito+Sans:wght@300..900',
  'Inter': 'Inter:wght@300..800',
  'Poppins': 'Poppins:wght@300;400;500;600;700',
  'Oswald': 'Oswald:wght@300..700',
  'Barlow Condensed': 'Barlow+Condensed:wght@300;400;500;600;700',
  'Archivo Narrow': 'Archivo+Narrow:ital,wght@0,400..700;1,400..700',
};

/** Playfair no tiene glifos árabes: en árabe la pila cae a Noto Naskh Arabic, que se pide solo en árabe. */
const ARABIC_QUERY = 'Noto+Naskh+Arabic:wght@400..700';

const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';
const SANS_FALLBACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const ARABIC_FALLBACK = '"Noto Naskh Arabic", "Geeza Pro", "Segoe UI", Tahoma';

/** Valor de font-family para un rol. */
export function fontStack(role: FontRole, name: string): string {
  const own = SELF_HOSTED[name] ? `"${SELF_HOSTED[name]}", "${name}"` : `"${name}"`;
  return `${own}, ${ARABIC_FALLBACK}, ${role === 'headline' ? SERIF_FALLBACK : SANS_FALLBACK}`;
}

/** URL de Google Fonts con las familias que hacen falta, o null si todas van empaquetadas. */
export function googleFontsHref(names: string[], lang: string): string | null {
  const queries = Array.from(new Set(names))
    .filter(n => !SELF_HOSTED[n] && GOOGLE_FONT_QUERY[n])
    .map(n => GOOGLE_FONT_QUERY[n]);
  if (lang === 'ar') queries.push(ARABIC_QUERY);
  if (queries.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${queries.map(q => `family=${q}`).join('&')}&display=swap`;
}
