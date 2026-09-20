// src/lib/types.ts — shared data shapes for the guest-facing guidebook.
//
// Before the Explore map tab, every component that touched a POI (DiscoverSection,
// PoiDetailModal, MapModal, GuidebookPage) declared its own slightly different local
// `POI` interface. That's fine as long as there's exactly one place data comes from,
// but the Explore tab pulls POIs from TWO endpoints (GET /guide/:slug for the home
// zone, GET /guide/:slug/explore for any other city) that are deliberately kept
// identical in shape (see workerGuide.js) — so from here on there's one canonical
// type instead of four drifting ones.
/**
 * Canal del CTA de una experiencia, tal y como llega YA RESUELTO del worker
 * (workerGuide.js: si el ítem tiene CTA secundario relleno, es ese).
 *
 * La unión no es cosmética: mientras esto era `string`, apps/tv comparaba con
 * 'whatsapp' en minúsculas contra el 'WHATSAPP' que manda el backend y no
 * enseñaba un QR de reserva jamás, sin que el compilador dijera nada.
 */
export type CtaActionType = 'URL' | 'WHATSAPP' | 'PHONE' | 'COUPON' | null;

export interface GuidePoi {
  id: string;
  name: string;
  description: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string;
  rating: number | null;
  // Relative to the guest's own apartment — null for every POI returned by
  // GET /guide/:slug/explore (a city that isn't home), on purpose. See
  // explore_travel_from_home in i18n.ts and haversineKm in poiCategories.ts
  // for the straight-line fallback used in that case.
  travel_time_text: string | null;
  travel_mode: 'walk' | 'drive' | 'bike' | null;
  distance_text: string | null;
  poi_type: string;
  access_type: string; // 'free' | 'paid' | 'mixed' — see AccessBadge.tsx
  price_display: string;
  duration_text: string;
  is_bookable: boolean;
  media: Array<{ id: string; url: string; type: string; role: string }>;
}

// A sibling city in the same region as the guest's apartment, for the Explore
// tab's city picker. Same shape whether it comes embedded in GET /guide/:slug
// (`cities`) or from GET /guide/:slug/explore (also `cities`) — see
// workerGuide.js, both queries are intentionally identical.
export interface CitySummary {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  poi_count: number;
  is_home: boolean;
}

export interface ZoneSummary {
  id: string;
  name: string;
  slug: string;
  region: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  description?: string;
}

/**
 * Canales del botón "Reservar" de un restaurante. Llegan YA limpios del worker
 * (workerGuide.js → buildReservation): sin teléfonos repetidos ni basura, y con
 * la URL comprobada como http(s). El cliente sólo los pinta.
 */
export interface RestaurantReservation {
  /** Sin duplicados, el preferido primero. */
  phones: string[];
  whatsapp: string | null;
  /** Reserva online. */
  url: string | null;
}

/**
 * Un restaurante de la pestaña Restaurantes (GET /guide/:slug → `restaurants`).
 *
 * `reservation` es opcional a propósito: la respuesta se cachea en KV 24 h y un
 * JSON de antes de que existiera el campo llega sin él — sin canal no hay botón,
 * en vez de un error.
 */
export interface GuideRestaurant {
  id: string;
  name: string;
  /**
   * Sólo los clientes de VisualTaste tienen carta en vídeo (y por tanto slug). Un restaurante
   * traído de Google llega con `slug: null`: sin "Ver carta en vídeo", con "Reservar" y
   * "Cómo llegar".
   */
  slug: string | null;
  /** Texto libre del admin (guide_zone_restaurants.cuisine_type_override): alimenta el filtro. */
  cuisine_type: string | null;
  tier: 'basic' | 'featured';
  is_promoted: boolean;
  /** Foto de un plato (siempre imagen, nunca vídeo) o null → MediaPlaceholder. */
  cover_image: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  description: string;
  reservation?: RestaurantReservation | null;
  /** Enlace exacto de Maps si el restaurante lo tiene; si no, "Cómo llegar" usa el texto. */
  maps_url?: string | null;
}
