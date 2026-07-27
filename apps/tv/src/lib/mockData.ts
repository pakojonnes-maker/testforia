// Cadena estándar para QR de WiFi: al escanearla el móvil se conecta solo.
export function wifiQrPayload(w: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass' }): string {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
  return `WIFI:T:${w.security};S:${esc(w.ssid)};P:${esc(w.password)};;`
}
