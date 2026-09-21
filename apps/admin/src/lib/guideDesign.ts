// apps/admin/src/lib/guideDesign.ts
//
// Lo que el admin sabe del DISEÑO del guidebook (pantalla Diseño: colores y tipografía): con qué se pinta la
// guía cuando la agencia no ha elegido nada, qué fuentes sabe renderizar por rol y cómo se leen y se guardan
// las elecciones de la agencia.
//
// Regla de fondo: `null` = «sin elegir, usa el diseño por defecto». El formulario arranca en null y solo guarda
// lo que la agencia elige; nunca escribe un valor por defecto en la BD como si lo hubiera elegido ella. Antes lo
// hacía: el formulario arrancaba en Newsreader / Inter / Archivo Narrow y pulsar «Guardar» sin tocar nada los
// dejaba grabados en la agencia.
//
// Es un ESPEJO A MANO de apps/guide/src/theme/{fonts,color}.ts (dos apps, sin paquete compartido). Si allí cambia
// algo de esto, cambia aquí:
//   DEFAULT_FONTS, DEFAULT_COLORS  ↔  DEFAULT_FONTS, DEFAULT_PRIMARY / DEFAULT_SECONDARY / DEFAULT_ACCENT
//   FONT_OPTIONS                   ↔  las dos empaquetadas (Playfair Display, Montserrat) + GOOGLE_FONT_QUERY.
//                                     Una fuente que la guía no conozca no se descarga: cae a la del sistema.
//   LEGACY_FONT_TRIO               ↔  LEGACY_DEFAULT_TRIO
//   readSavedColor                 ↔  parseHex
//   derivedSecondary               ↔  la rama «sin secundario» de deriveTheme

export type FontRole = 'headline' | 'body' | 'label';
export type ColorRole = 'primary' | 'secondary' | 'accent';

/** Lo que la agencia ha elegido por rol; null = sin elegir. */
export type FontChoices = Record<FontRole, string | null>;
export type ColorChoices = Record<ColorRole, string | null>;

/** Las columnas de diseño de guide_agencies tal como llegan de GET /guide/admin/agencies/:id. */
export interface AgencyDesignRow {
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  headline_font?: string | null;
  body_font?: string | null;
  label_font?: string | null;
}

export const DEFAULT_FONTS: Record<FontRole, string> = {
  headline: 'Playfair Display',
  body: 'Montserrat',
  label: 'Montserrat',
};

export const DEFAULT_COLORS: Record<ColorRole, string> = {
  primary: '#C8613F',
  secondary: '#06415C',
  accent: '#F0B04B',
};

/**
 * Las fuentes que se ofrecen por rol: solo las que la guía sabe cargar, repartidas como siempre (serif para
 * titulares, sans para cuerpo, condensadas para labels). La de por defecto va primera. Una fuente nueva hay que
 * darla de alta en la guía ANTES de listarla aquí, o se elegiría en el admin y no se vería en la guía.
 */
export const FONT_OPTIONS: Record<FontRole, string[]> = {
  headline: ['Playfair Display', 'Newsreader', 'Lora', 'Fraunces'],
  body: ['Montserrat', 'Inter', 'Work Sans', 'Nunito Sans', 'Poppins'],
  label: ['Montserrat', 'Archivo Narrow', 'Oswald', 'Barlow Condensed'],
};

/**
 * Los tres valores con los que este formulario guardaba SUS valores por defecto. La guía trata ese trío exacto
 * (sin distinguir mayúsculas) como «sin elegir»: si una agencia lo eligiera a propósito, no se vería.
 */
const LEGACY_FONT_TRIO = ['newsreader', 'inter', 'archivo narrow'];

export function isLegacyFontTrio(fonts: FontChoices): boolean {
  return fonts.headline?.toLowerCase() === LEGACY_FONT_TRIO[0]
    && fonts.body?.toLowerCase() === LEGACY_FONT_TRIO[1]
    && fonts.label?.toLowerCase() === LEGACY_FONT_TRIO[2];
}

/**
 * Las fuentes guardadas de una agencia, tal como las ve la guía: vacías son «sin elegir», y el trío antiguo
 * completo también (la guía lo ignora, así que el formulario no debe enseñarlo como una elección).
 */
export function readSavedFonts(row: AgencyDesignRow): FontChoices {
  const clean = (v: string | null | undefined) => (v ?? '').trim() || null;
  const saved: FontChoices = {
    headline: clean(row.headline_font),
    body: clean(row.body_font),
    label: clean(row.label_font),
  };
  return isLegacyFontTrio(saved) ? { headline: null, body: null, label: null } : saved;
}

/** Las fuentes con las que la guía pinta estas elecciones: lo que enseña la vista previa. */
export function shownFonts(fonts: FontChoices): Record<FontRole, string> {
  if (isLegacyFontTrio(fonts)) return { ...DEFAULT_FONTS };
  return {
    headline: fonts.headline ?? DEFAULT_FONTS.headline,
    body: fonts.body ?? DEFAULT_FONTS.body,
    label: fonts.label ?? DEFAULT_FONTS.label,
  };
}

/** Las opciones del selector de un rol. Una fuente guardada que no esté en la lista se añade: mejor verla que un selector en blanco. */
export function fontOptions(role: FontRole, current: string | null): string[] {
  const list = FONT_OPTIONS[role];
  return current && !list.includes(current) ? [...list, current] : list;
}

/** Valor de font-family para la vista previa del admin. */
export const fontFamilyCss = (role: FontRole, name: string): string =>
  `"${name}", ${role === 'headline' ? 'Georgia, serif' : 'system-ui, sans-serif'}`;

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Los colores guardados de una agencia. Solo cuenta el que la guía aceptaría (#rgb o #rrggbb, con o sin «#»): si no, la guía usa el de por defecto y aquí es null. */
export function readSavedColors(row: AgencyDesignRow): ColorChoices {
  const read = (v: string | null | undefined) => {
    const s = (v ?? '').trim();
    return HEX.test(s) ? s : null;
  };
  return { primary: read(row.primary_color), secondary: read(row.secondary_color), accent: read(row.accent_color) };
}

/** El valor que admite un <input type="color">: siempre #rrggbb en minúsculas. */
export function toInputColor(hex: string): string {
  const digits = HEX.exec(hex.trim())?.[1] ?? '000000';
  return '#' + (digits.length === 3 ? digits.replace(/./g, c => c + c) : digits).toLowerCase();
}

/** La tinta fija del diseño (INK en apps/guide/src/theme/color.ts). */
const INK = '#0C2A37';

const channels = (hex: string): number[] =>
  [1, 3, 5].map(i => parseInt(toInputColor(hex).slice(i, i + 2), 16));

/** Un 40 % del primario y un 60 % de tinta: el secundario que la guía deriva cuando solo hay primario. */
export function derivedSecondary(primary: string): string {
  const p = channels(primary);
  const ink = channels(INK);
  const mixed = p.map((v, i) => Math.round(v * 0.4 + ink[i] * 0.6).toString(16).padStart(2, '0'));
  return '#' + mixed.join('').toUpperCase();
}

/**
 * Con qué pinta la guía un color que la agencia no ha elegido. El secundario, si el primario sí está elegido,
 * no es el de por defecto: sale del primario, así la tesela del WiFi no desentona.
 */
export function defaultColor(role: ColorRole, colors: ColorChoices): { hex: string; fromPrimary: boolean } {
  if (role === 'secondary' && colors.primary) return { hex: derivedSecondary(colors.primary), fromPrimary: true };
  return { hex: DEFAULT_COLORS[role], fromPrimary: false };
}
