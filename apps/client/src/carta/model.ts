// Tipos de la respuesta de GET /restaurants/:slug/reels que usa la carta, y utilidades.

export interface CartaAllergen {
  id: string;
  name?: string;
  icon_url?: string;
}

export interface CartaMedia {
  type?: string;
  url: string;
  width?: number | null;
  height?: number | null;
}

export interface CartaDish {
  id: string;
  name?: string;
  description?: string;
  ingredients?: string;
  price?: number | null;
  discount_price?: number | null;
  discount_active?: boolean | number;
  half_price?: number | null;
  has_half_portion?: boolean | number;
  is_new?: boolean | number;
  is_featured?: boolean | number;
  is_vegetarian?: boolean | number;
  is_vegan?: boolean | number;
  is_gluten_free?: boolean | number;
  favorite_count?: number | null;
  media?: CartaMedia[];
  allergens?: CartaAllergen[];
}

export interface CartaSection {
  id: string;
  name?: string;
  dishes?: CartaDish[];
}

export interface CartaLanguage {
  code: string;
  name?: string;
  native_name?: string;
}

export interface FeedItem {
  si: number;
  di: number;
  index: number;
  dish: CartaDish;
  section: CartaSection;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

/** Un 0/1 de D1 o un booleano: nunca pintar el 0 suelto. */
export const yes = (v: unknown): boolean => v === true || v === 1 || v === '1';

export function flattenSections(sections: CartaSection[]): FeedItem[] {
  const out: FeedItem[] = [];
  sections.forEach((section, si) => {
    (section.dishes || []).forEach((dish, di) => out.push({ si, di, index: out.length, dish, section }));
  });
  return out;
}

export function dishName(d: CartaDish, fallback: string): string {
  return (d.name || '').trim() || fallback;
}

export function mainMedia(d: CartaDish): CartaMedia | null {
  const m = d.media?.find((x) => x?.url);
  return m || null;
}

export function isVideo(m: CartaMedia | null): boolean {
  return !!m && (m.type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(m.url));
}

export function hasHalf(d: CartaDish): boolean {
  return yes(d.has_half_portion) && typeof d.half_price === 'number' && d.half_price > 0;
}

/** Precio vigente (con descuento activo si lo hay) y el anterior para tacharlo. */
export function priceOf(d: CartaDish): { now: number; before: number | null } {
  const base = typeof d.price === 'number' ? d.price : 0;
  if (yes(d.discount_active) && typeof d.discount_price === 'number' && d.discount_price > 0 && d.discount_price < base) {
    return { now: d.discount_price, before: base };
  }
  return { now: base, before: null };
}

const LOCALE: Record<string, string> = {
  es: 'es-ES', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ca: 'ca-ES',
  // Cifras latinas también en árabe: el camarero tiene que poder leerlas
  ar: 'ar-u-nu-latn', ru: 'ru-RU', uk: 'uk-UA', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
};

export function money(n: number, lang: string): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang] || 'es-ES', { style: 'currency', currency: 'EUR' }).format(n);
  } catch {
    return `${n.toFixed(2)} €`;
  }
}

export function allergenIcon(a: CartaAllergen): string {
  if (a.icon_url && /^https?:/.test(a.icon_url)) return a.icon_url;
  const file = a.icon_url || (a.id.endsWith('.svg') ? a.id : `${a.id}.svg`);
  return `${API_URL}/media/System/allergens/${file}`;
}

export function allergenName(a: CartaAllergen): string {
  if (a.name) return a.name;
  const raw = a.id.replace(/^allergen_/, '').replace(/\.svg$/, '').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Todos los alérgenos que aparecen en la carta, sin repetir, en el orden en que salen. */
export function menuAllergens(items: FeedItem[]): CartaAllergen[] {
  const seen = new Map<string, CartaAllergen>();
  for (const it of items) for (const a of it.dish.allergens || []) if (!seen.has(a.id)) seen.set(a.id, a);
  return [...seen.values()].sort((a, b) => allergenName(a).localeCompare(allergenName(b)));
}

export function initialOf(text: string): string {
  return (text.trim().charAt(0) || '·').toUpperCase();
}
