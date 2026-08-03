// API de la app TV. Habla con workerTvScreen.js: la TV se identifica por un
// código de emparejamiento (no conoce el slug del alojamiento), que el backend
// resuelve y devuelve la MISMA forma de datos que /guide/:slug.

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'

// ---- Forma de datos del guidebook (espejo de GuidebookPage.tsx en apps/guide) ----
export interface GuidebookData {
  apartment: {
    id: string; name: string; slug: string; address: string
    cover_image_url: string
    wifi: { ssid: string | null; password: string | null; security: 'WPA' | 'WEP' | 'nopass' }
    info: Array<{
      id: string; key: string; category?: string | null; icon: string; color?: string | null;
      title: string; category_name?: string | null; content: string; media: any[];
      category_image_url?: string | null;
    }>
  }
  zone: { id: string; name: string; slug: string; region: string; description: string; cover_image_url: string }
  agency: { id: string; name: string; logo_url: string; primary_color: string | null; secondary_color: string | null; accent_color: string | null }
  pois: Array<{ id: string; name: string; description: string; category: string; google_maps_url: string; media: any[] }>
  restaurants: Array<{ id: string; name: string; slug: string; cuisine_type: string; tier: string; cover_image: string }>
  experiences: Array<{ id: string; name: string; description: string; category: string; service_subcategory: string | null; action_type: string; action_data: string; prefilled_message: string; price_display: string; is_featured: boolean; cta_label: string; cover_image_url?: string }>
  meta: { lang: string; available_langs: string[] }
}

// GET /guide/tv/config/:pairingCode — resuelve la TV emparejada, hace heartbeat
// y registra una impresión en el backend.
export async function fetchTvConfig(pairingCode: string, lang = 'es'): Promise<GuidebookData & { success: boolean }> {
  const res = await fetch(`${API_URL}/guide/tv/config/${encodeURIComponent(pairingCode)}?lang=${lang}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || `HTTP ${res.status}`)
  }
  return res.json()
}

// GET /guide/:slug — same endpoint apps/guide uses. Lets the TV shell preview a
// guidebook straight from its path (e.g. tv.visualtastes.com/paloma-park-benalmadena)
// without a paired device, for demos/QA. No pairingCode is involved, so the
// caller must NOT wire this identifier into lib/tracking.ts (there's no real TV
// session to attribute events to).
export async function fetchGuideBySlug(slug: string, lang = 'es'): Promise<GuidebookData & { success: boolean }> {
  const res = await fetch(`${API_URL}/guide/${encodeURIComponent(slug)}?lang=${lang}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).error || `HTTP ${res.status}`)
  }
  return res.json()
}

// Misma cookie de atribución que escribe apps/guide/src/lib/api.ts
// (setReferralCookie) — la TV es otra vía por la que un huésped descubre un
// restaurante antes de ir a cenar, así que también debe dejar el rastro de 30
// días que permite atribuir esa visita física si escanea el QR del restaurante
// días después, sin ningún ?ref= en la URL de esa sesión posterior.
const GUIDE_REFERRAL_COOKIE = 'vt_guide_ref'
const GUIDE_REFERRAL_COOKIE_MAX_AGE_DAYS = 30

export function setReferralCookie(apartmentId: string) {
  try {
    const host = window.location.hostname
    const isVisualtastesDomain = host === 'visualtastes.com' || host.endsWith('.visualtastes.com')
    const value = encodeURIComponent(JSON.stringify({ apt: apartmentId, ts: Date.now() }))
    const maxAge = GUIDE_REFERRAL_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
    const domainAttr = isVisualtastesDomain ? '; domain=.visualtastes.com' : ''
    const secureAttr = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${GUIDE_REFERRAL_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax${domainAttr}${secureAttr}`
  } catch {
    // best-effort
  }
}

export type TvEventType = 'impression' | 'screen_view' | 'wifi_reveal' | 'poi_select' | 'menu_qr_shown' | 'booking_qr_shown'

// POST /guide/tv/track — KPIs de la pantalla TV. Best-effort, no bloquea la UI.
// `targetId` identifica QUÉ se seleccionó (p.ej. el POI en un 'poi_select');
// `tvSessionId` agrupa los eventos de un mismo uso de la pantalla.
export async function trackTvEvent(
  pairingCode: string,
  eventType: TvEventType,
  extra?: { screen?: string; lang?: string; targetId?: string; tvSessionId?: string }
) {
  try {
    await fetch(`${API_URL}/guide/tv/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairingCode, eventType, ...extra }),
    })
  } catch { /* best effort */ }
}
