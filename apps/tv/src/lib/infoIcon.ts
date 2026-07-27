// Mapea el icono/clave de un item de info a un emoji grande para TV.
// Acepta tanto nombres de Material Symbols (datos reales del guidebook) como
// las claves cortas del mock. Fallback a ℹ️.
const BY_ICON: Record<string, string> = {
  key: '🔑', door_front: '🔑', lock: '🔑', vpn_key: '🔑',
  wifi: '📶', clock: '🕚', schedule: '🕚', logout: '🕚',
  snow: '❄️', ac_unit: '❄️', thermostat: '🌡️',
  trash: '🗑️', delete: '🗑️', recycling: '♻️',
  local_parking: '🅿️', parking: '🅿️',
  local_laundry_service: '🧺', wash: '🧺',
  tv: '📺', restaurant: '🍽️', pool: '🏊', beach_access: '🏖️',
  water_drop: '🚿', bolt: '⚡', pets: '🐾', elevator: '🛗',
  rule: '📋', gavel: '📋', shopping_cart: '🛒', directions_bus: '🚌',
  emergency: '🆘',
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
