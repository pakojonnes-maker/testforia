// Mapea categorías del guidebook a un emoji + degradado mediterráneo, para las
// tarjetas cuando no hay imagen (o como marco de la imagen).
const MAP: Record<string, { emoji: string; from: string; to: string }> = {
  beach:     { emoji: '🏖️', from: '#34c2c9', to: '#128099' },
  landmark:  { emoji: '🏛️', from: '#e2caa2', to: '#c9613f' },
  nature:    { emoji: '🌅', from: '#f6b24c', to: '#e07a5f' },
  food:      { emoji: '🍽️', from: '#e07a5f', to: '#c9613f' },
  boat:      { emoji: '⛵', from: '#7ad7d1', to: '#06415c' },
  kayak:     { emoji: '🛶', from: '#34c2c9', to: '#0a5a72' },
  shopping:  { emoji: '🛍️', from: '#d24c8e', to: '#c9613f' },
  restaurant:{ emoji: '🍴', from: '#e07a5f', to: '#c9613f' },
  default:   { emoji: '📍', from: '#128099', to: '#06415c' },
}

export function categoryVisual(category?: string) {
  return MAP[(category || '').toLowerCase()] || MAP.default
}

export function cuisineEmoji(): string { return '🍴' }
