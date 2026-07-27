// Mapea categorías del guidebook a un emoji + degradado mediterráneo, para las
// tarjetas cuando no hay imagen (o como marco de la imagen).
//
// El catálogo real (guide_pois.category, ver migrations/0060 y 0063) usa
// vocabulario en español ("Actividades", "Transporte"...); el mock y alguna
// zona antigua usa claves en inglés ("beach", "boat"...). Sin las claves en
// español, TODO caía en el fallback 📍 — que es justo lo que se veía en la
// pantalla de Guía: kayak, catamarán y mariposario mostraban el mismo pin
// genérico en vez de un icono acorde. `subcategory` (p.ej. "nautical/kayak")
// es más específico que `category` y se comprueba primero.
const MAP: Record<string, { emoji: string; from: string; to: string }> = {
  // Categorías en español (vocabulario real de guide_pois.category)
  cultura:     { emoji: '🏛️', from: '#e2caa2', to: '#c9613f' },
  naturaleza:  { emoji: '🌅', from: '#f6b24c', to: '#e07a5f' },
  compras:     { emoji: '🛍️', from: '#d24c8e', to: '#c9613f' },
  playas:      { emoji: '🏖️', from: '#34c2c9', to: '#128099' },
  actividades: { emoji: '🎟️', from: '#34c2c9', to: '#0a5a72' },
  transporte:  { emoji: '🚗', from: '#7ad7d1', to: '#06415c' },
  bienestar:   { emoji: '💆', from: '#e07a5f', to: '#c9613f' },
  relax:       { emoji: '💆', from: '#e07a5f', to: '#c9613f' },
  gastronomia: { emoji: '🍽️', from: '#e07a5f', to: '#c9613f' },

  // Categorías en inglés (mock data / zonas antiguas)
  beach:     { emoji: '🏖️', from: '#34c2c9', to: '#128099' },
  landmark:  { emoji: '🏛️', from: '#e2caa2', to: '#c9613f' },
  nature:    { emoji: '🌅', from: '#f6b24c', to: '#e07a5f' },
  food:      { emoji: '🍽️', from: '#e07a5f', to: '#c9613f' },
  boat:      { emoji: '⛵', from: '#7ad7d1', to: '#06415c' },
  kayak:     { emoji: '🛶', from: '#34c2c9', to: '#0a5a72' },
  shopping:  { emoji: '🛍️', from: '#d24c8e', to: '#c9613f' },
  restaurant:{ emoji: '🍴', from: '#e07a5f', to: '#c9613f' },

  // Subcategorías (el segmento tras la "/", más específico que category)
  catamaran: { emoji: '⛵', from: '#7ad7d1', to: '#06415c' },
  yacht:     { emoji: '⛵', from: '#7ad7d1', to: '#06415c' },
  surf:      { emoji: '🏄', from: '#34c2c9', to: '#128099' },
  massage:   { emoji: '💆', from: '#e07a5f', to: '#c9613f' },
  nails:     { emoji: '💅', from: '#d24c8e', to: '#c9613f' },
  chef:      { emoji: '👨‍🍳', from: '#e07a5f', to: '#c9613f' },
  transfer:  { emoji: '🚗', from: '#7ad7d1', to: '#06415c' },

  default:   { emoji: '📍', from: '#128099', to: '#06415c' },
}

export function categoryVisual(category?: string, subcategory?: string | null) {
  const leaf = subcategory?.split('/').pop()?.toLowerCase()
  if (leaf && MAP[leaf]) return MAP[leaf]
  return MAP[(category || '').toLowerCase()] || MAP.default
}

export function cuisineEmoji(): string { return '🍴' }
