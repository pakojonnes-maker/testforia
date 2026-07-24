// Datos de ejemplo para el prototipo. En producción vendrán del worker
// (workerTvScreen.js) resueltos por el código de emparejamiento del alojamiento,
// reutilizando el mismo backend que apps/guide.

export interface StayData {
  propertyName: string
  hostBrand: string
  guestName: string
  checkIn: string
  checkOut: string
  wifi: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass' }
  address: string
}

export const MOCK_STAY: StayData = {
  propertyName: 'Villa Serena',
  hostBrand: 'Mediterrà Stays',
  guestName: 'Olivia',
  checkIn: '24 Jul · 15:00',
  checkOut: '31 Jul · 11:00',
  wifi: {
    ssid: 'VillaSerena_5G',
    password: 'MarAzul2026',
    security: 'WPA',
  },
  address: 'Cala Blanca, 12 · Menorca',
}

// Cadena estándar para QR de WiFi: al escanearla el móvil se conecta solo.
export function wifiQrPayload(w: StayData['wifi']): string {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
  return `WIFI:T:${w.security};S:${esc(w.ssid)};P:${esc(w.password)};;`
}
