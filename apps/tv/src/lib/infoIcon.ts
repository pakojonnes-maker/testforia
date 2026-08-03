// Mapea el icono/clave de un item de info a un emoji grande para TV.
// Acepta tanto nombres de Material Symbols (datos reales del guidebook, incluido
// el catálogo global de categorías de migrations/0083_guide_info_categories.sql)
// como las claves cortas del mock. Fallback a ℹ️.
const BY_ICON: Record<string, string> = {
  // Llegada y salida
  key: '🔑', door_front: '🔑', vpn_key: '🔑', login: '🔑',
  logout: '🕚', clock: '🕚', schedule: '🕚',
  local_parking: '🅿️', parking: '🅿️',
  luggage: '🧳', directions: '🗺️',
  // Conectividad y ocio
  wifi: '📶', tv: '📺', speaker: '🔊',
  // Clima y confort
  snow: '❄️', ac_unit: '❄️', thermostat: '🌡️', water_drop: '🚿',
  blinds: '🪟', fireplace: '🔥',
  // Electrodomésticos
  local_laundry_service: '🧺', wash: '🧺', dry_cleaning: '🔄',
  soap: '🧼', oven: '🔥', countertops: '🍳', microwave: '⏱️',
  coffee_maker: '☕', kitchen: '🧊', air: '💨', iron: '👕',
  // La casa
  trash: '🗑️', delete: '🗑️', recycling: '♻️',
  bolt: '⚡', plumbing: '🚰', rule: '📋', gavel: '📋',
  volume_off: '🔇', smoke_free: '🚭', pets: '🐾',
  bed: '🛏️', cleaning_services: '🧹', elevator: '🛗', lock: '🔒',
  // Exterior y extras
  pool: '🏊', hot_tub: '🛁', outdoor_grill: '🍖', deck: '🌇',
  yard: '🌳', fitness_center: '🏋️', beach_access: '🏖️', directions_bike: '🚲',
  // Seguridad y ayuda
  emergency: '🆘', call: '📞', medical_services: '🩹', local_fire_department: '🧯',
  // Servicios de la zona
  shopping_cart: '🛒', local_grocery_store: '🛒', local_pharmacy: '💊',
  directions_bus: '🚌', local_taxi: '🚕', local_atm: '🏧',
  // Hotel
  front_desk: '🛎️', free_breakfast: '🥐', room_service: '🍽️',
  // Genérico ("appliances" y "custom" del catálogo)
  restaurant: '🍽️', info: 'ℹ️',
}
const BY_KEY: Record<string, string> = {
  entry: '🔑', door_code: '🔑', checkout: '🕚', check_out: '🕚',
  ac: '❄️', aire: '❄️', trash: '🗑️', basura: '🗑️', parking: '🅿️',
  rules: '📋', supermarket: '🛒', transport: '🚌', emergency: '🆘',
}

export function infoIcon(icon?: string, key?: string): string {
  return BY_ICON[(icon || '').toLowerCase()] || BY_KEY[(key || '').toLowerCase()] || 'ℹ️'
}

export function isDoorCode(key?: string): boolean {
  return /entry|door|codigo|código/i.test(key || '')
}
