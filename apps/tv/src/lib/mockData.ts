// Cadena estándar para QR de WiFi: al escanearla el móvil se conecta solo.
//
// No se fía de `security` a ciegas. Esa etiqueta puede no cuadrar con si hay
// contraseña de verdad — dato de host, fallback de texto libre parseado en
// el worker, o simplemente el 'WPA' por defecto de la columna cuando el
// admin ni siquiera deja elegir seguridad (ver workerGuide.js). Sin
// contraseña, declarar WPA/WEP rompe el autoconectado: el móvil pide una
// clave que no existe en vez de conectarse solo. La única señal fiable de
// si la red la necesita es si HAY contraseña, así que la deriva de ahí en
// vez de repetir lo que diga `security` — correcto tanto si el dato viene
// bien del backend como si es un valor de prueba/placeholder.
export function wifiQrPayload(w: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass' }): string {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
  const ssid = (w.ssid || '').trim()
  const password = (w.password || '').trim()
  const security = password ? (w.security === 'WEP' ? 'WEP' : 'WPA') : 'nopass'
  return `WIFI:T:${security};S:${esc(ssid)};P:${security === 'nopass' ? '' : esc(password)};H:false;;`
}
