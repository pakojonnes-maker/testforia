// src/components/guide/catalogTypes.ts
// Tipos y constantes del catálogo de zona (lugares + experiencias).
//
// Desde la migración 0059 no hay dos tablas: todo vive en `guide_pois` y lo
// único que separa una experiencia de un lugar es `is_bookable`. Por eso el
// admin tiene UNA pantalla (GuideCatalogPage) y no dos, y por eso aquí hay un
// solo tipo `CatalogItem` con los campos de ambos mundos.

/** Una fila de guide_pois tal y como la devuelve /guide/admin/pois. */
export interface CatalogItem {
  id: string;
  zone_id: string;
  category: string;
  subcategory?: string | null;
  /** Alias que devuelve el worker por compatibilidad con el antiguo /experiences. */
  service_subcategory?: string | null;
  poi_type?: string | null;
  /** 1 = experiencia reservable, 0/null = lugar del mapa. */
  is_bookable?: number | boolean | null;
  is_featured?: number | boolean | null;
  is_active?: number | boolean | null;
  order_index?: number | null;

  // Contenido (traducciones ES/EN; el resto de idiomas los rellena el traductor IA)
  name_es?: string | null;
  name_en?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  short_tip_es?: string | null;
  short_tip_en?: string | null;
  cta_label_es?: string | null;
  cta_label_en?: string | null;

  // Ubicación y contacto
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
  google_place_id?: string | null;
  phone?: string | null;
  website_url?: string | null;
  booking_url?: string | null;
  opening_hours?: string | null;
  duration_text?: string | null;
  rating?: number | null;
  /** Valor por defecto de la zona; cada apartamento puede sobreescribirlo. */
  travel_mode?: string | null;
  travel_time_text?: string | null;
  distance_text?: string | null;

  // Precio y acceso
  access_type?: string | null;
  price_display?: string | null;
  original_price_display?: string | null;
  discount_display?: string | null;
  badge_type?: string | null;

  // Acción del huésped (solo experiencias)
  action_type?: string | null;
  action_data?: string | null;
  action_prefilled_message?: string | null;

  // Negocio (solo superadmin: el worker lo elimina para agencias)
  commission_type?: string | null;
  commission_value?: number | null;

  cover_image_url?: string | null;
  source?: string | null;
}

export interface Zone {
  id: string;
  name: string;
}

export type CatalogKind = 'place' | 'experience';

/** Categorías sugeridas. El campo es libre: una experiencia puede traer la suya. */
export const CATEGORIES = [
  'Restaurantes', 'Playas', 'Cultura', 'Naturaleza', 'Actividades', 'Compras', 'Otro',
];

export const ACCESS_TYPES = [
  { value: 'free', label: 'Gratuito' },
  { value: 'paid', label: 'De pago' },
  { value: 'mixed', label: 'Mixto' },
];

export const ACTION_TYPES = [
  { value: 'URL', label: 'Enlace web (URL)' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'PHONE', label: 'Teléfono' },
  { value: 'COUPON', label: 'Cupón de descuento' },
];

export const TRAVEL_MODES = [
  { value: 'walk', label: 'Caminando' },
  { value: 'drive', label: 'Coche' },
  { value: 'bike', label: 'Bici' },
];

export const BADGE_LABELS: Record<string, string> = {
  discount: 'Descuento',
  courtesy: 'Cortesía',
  exclusive: 'Exclusivo',
  new: 'Nuevo',
};

export const BADGE_TYPES = [
  { value: 'none', label: 'Ninguno' },
  ...Object.entries(BADGE_LABELS).map(([value, label]) => ({ value, label })),
];

const CATEGORY_GRADIENTS: Record<string, string> = {
  'Restaurantes': 'linear-gradient(135deg, #C96D4B 0%, #D4896C 100%)',
  'Playas': 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)',
  'Cultura': 'linear-gradient(135deg, #7B1FA2 0%, #AB47BC 100%)',
  'Naturaleza': 'linear-gradient(135deg, #388E3C 0%, #66BB6A 100%)',
  'Actividades': 'linear-gradient(135deg, #F57C00 0%, #FFB74D 100%)',
  'Compras': 'linear-gradient(135deg, #C2185B 0%, #F06292 100%)',
};

/** Fondo de la tarjeta cuando el item no tiene foto de portada. */
export const getCategoryGradient = (category?: string | null): string =>
  (category && CATEGORY_GRADIENTS[category]) || 'linear-gradient(135deg, #1E3A5F 0%, #2D5F9E 100%)';

/** D1 devuelve 0/1, no booleanos. */
export const isTrue = (value: number | boolean | null | undefined): boolean =>
  value === true || value === 1;

export const isExperience = (item: CatalogItem): boolean => isTrue(item.is_bookable);

export const kindOf = (item: CatalogItem): CatalogKind =>
  isExperience(item) ? 'experience' : 'place';

/** Lo mismo que ve el huésped en la tarjeta: "Gratis", "12 €" o el tipo de acceso. */
export const priceLabel = (item: CatalogItem): string => {
  if (item.price_display) return item.price_display;
  const access = item.access_type || 'free';
  if (access === 'free') return 'Gratis';
  return ACCESS_TYPES.find(a => a.value === access)?.label || 'De pago';
};

export const displayName = (item: CatalogItem): string =>
  item.name_es || item.name_en || item.category || 'Sin nombre';
