/**
 * Mapea categorías del guidebook a un DEGRADADO, para las tarjetas cuando no
 * hay imagen.
 *
 * Antes cada entrada traía además un emoji, que se pintaba encima del degradado
 * a 72 px en la tarjeta de sección y a 144 px como imagen heroica de la ficha.
 * Se quitó: era redundante con el título que tiene justo debajo, y dependía de
 * que el aparato trajera fuente de emoji — el mismo motivo por el que las
 * banderas ya se sirven como SVG (ver lib/languages.ts). Lo que diferencia una
 * tarjeta sin foto de otra es el COLOR de su categoría y su título, que es como
 * ya funcionaba PhotoTile en el mosaico de inicio.
 *
 * El catálogo real (guide_pois.category, ver migrations/0060 y 0063) usa
 * vocabulario en español ("Actividades", "Transporte"...); el mock y alguna
 * zona antigua usa claves en inglés ("beach", "boat"...). Sin las claves en
 * español, TODO caía en el degradado por defecto. `subcategory` (p.ej.
 * "nautical/kayak") es más específico que `category` y se comprueba primero.
 */
const MAP: Record<string, { from: string; to: string }> = {
  // Categorías en español (vocabulario real de guide_pois.category)
  cultura:     { from: '#e2caa2', to: '#c9613f' },
  naturaleza:  { from: '#f6b24c', to: '#e07a5f' },
  compras:     { from: '#d24c8e', to: '#c9613f' },
  playas:      { from: '#34c2c9', to: '#128099' },
  actividades: { from: '#34c2c9', to: '#0a5a72' },
  transporte:  { from: '#7ad7d1', to: '#06415c' },
  bienestar:   { from: '#e07a5f', to: '#c9613f' },
  relax:       { from: '#e07a5f', to: '#c9613f' },
  gastronomia: { from: '#e07a5f', to: '#c9613f' },

  // Categorías en inglés (mock data / zonas antiguas)
  beach:     { from: '#34c2c9', to: '#128099' },
  landmark:  { from: '#e2caa2', to: '#c9613f' },
  nature:    { from: '#f6b24c', to: '#e07a5f' },
  food:      { from: '#e07a5f', to: '#c9613f' },
  boat:      { from: '#7ad7d1', to: '#06415c' },
  kayak:     { from: '#34c2c9', to: '#0a5a72' },
  shopping:  { from: '#d24c8e', to: '#c9613f' },
  restaurant:{ from: '#e07a5f', to: '#c9613f' },

  // Subcategorías (el segmento tras la "/", más específico que category)
  catamaran: { from: '#7ad7d1', to: '#06415c' },
  yacht:     { from: '#7ad7d1', to: '#06415c' },
  surf:      { from: '#34c2c9', to: '#128099' },
  massage:   { from: '#e07a5f', to: '#c9613f' },
  nails:     { from: '#d24c8e', to: '#c9613f' },
  chef:      { from: '#e07a5f', to: '#c9613f' },
  transfer:  { from: '#7ad7d1', to: '#06415c' },

  // Tienda (buildStore en collections.ts) — mismo color que 'compras'/'shopping'.
  store_host:     { from: '#d24c8e', to: '#c9613f' },
  store_platform: { from: '#d24c8e', to: '#c9613f' },

  default:   { from: '#128099', to: '#06415c' },
}

export function categoryVisual(category?: string, subcategory?: string | null) {
  const leaf = subcategory?.split('/').pop()?.toLowerCase()
  if (leaf && MAP[leaf]) return MAP[leaf]
  return MAP[(category || '').toLowerCase()] || MAP.default
}

// Etiqueta legible para la cabecera de cada fila de categoría (pantalla de
// colección). El resto de la app TV no traduce su propio texto de UI a los 13
// idiomas (sólo el CONTENIDO viene traducido del backend, ver App.tsx/
// collections.ts) — aquí se sigue la misma convención: español fijo, con
// mayúscula inicial como fallback razonable para una categoría sin mapear.
const LABEL: Record<string, string> = {
  cultura: 'Cultura', naturaleza: 'Naturaleza', compras: 'Compras', playas: 'Playas',
  actividades: 'Actividades', transporte: 'Transporte', bienestar: 'Bienestar',
  relax: 'Bienestar', gastronomia: 'Gastronomía', restaurantes: 'Restaurantes', otro: 'Otros',
  beach: 'Playas', landmark: 'Cultura', nature: 'Naturaleza', food: 'Gastronomía',
  boat: 'Náutica', kayak: 'Náutica', shopping: 'Compras',
  // Agrupación de la Tienda (buildStore en collections.ts) — mismo criterio
  // host/platform que ya usa apps/guide (ServicesSection.tsx).
  store_host: 'Productos del anfitrión', store_platform: 'Productos locales',
}

export function categoryLabel(category?: string | null): string {
  const key = (category || '').trim().toLowerCase()
  if (!key) return 'Más recomendaciones'
  if (LABEL[key]) return LABEL[key]
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
}
