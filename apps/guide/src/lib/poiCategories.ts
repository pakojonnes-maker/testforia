// src/lib/poiCategories.ts — helpers for the Explore map tab (chip order,
// search normalization, straight-line distance for POIs outside the home zone).
//
// Kept separate from i18n.ts: this file has no translated strings, just
// ordering/geometry, and i18n.ts is already large.

// Order the category chip rail should follow when more than one category is
// present. Anything not listed here (a category not yet mapped above) sorts
// after these, in the order it first appears in the data — see
// sortCategories in useExploreState.ts.
export const CANONICAL_CATEGORY_ORDER = [
  'playas', 'cultura', 'naturaleza', 'actividades', 'restaurantes', 'compras', 'otro',
];

/**
 * ¿Es un restaurante? Los restaurantes (clientes de VisualTaste y los importados de
 * Google, que llegan como POIs de categoría "Restaurantes") viven en su propia pestaña:
 * Explorar los excluye, tanto de la lista y el mapa como del carril de categorías.
 * El valor guardado en la BD es el español, sea cual sea el idioma de la interfaz.
 */
export function isRestaurantCategory(category?: string | null): boolean {
  return (category || '').trim().toLowerCase() === 'restaurantes';
}

/**
 * Diacritic/case-insensitive normalization for the Explore search box, so
 * "malaga" matches "Málaga" and "cordoba" matches "Córdoba" without the guest
 * having to type the accent.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks left by NFD
    .toLowerCase()
    .trim();
}

/**
 * Straight-line (great-circle) distance in km between two lat/lng points.
 * Used only for POIs outside the guest's home zone, where the backend sends
 * travel_time_text/travel_mode/distance_text as null on purpose (those are
 * precomputed relative to the apartment and would be wrong — or from a
 * different city entirely — for anywhere else). See workerGuide.js
 * handleGetExplore and ExploreSection's use of explore_travel_from_home.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Human-readable distance for explore_travel_from_home: "800 m" under 1km, "12 km" above. */
export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}
