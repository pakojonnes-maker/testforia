// API de la app TV. Habla con workerTvScreen.js: la TV se identifica por un
// código de emparejamiento (no conoce el slug del alojamiento), que el backend
// resuelve y devuelve la MISMA forma de datos que /guide/:slug.

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'

/**
 * Tipos de acción del CTA de una experiencia. El backend los escribe SIEMPRE en
 * mayúsculas (workerGuideAdmin.js) y ahora además los normaliza antes de
 * responder. Esta unión existe porque el fallo estaba justo aquí: la TV
 * comparaba con 'whatsapp' en minúsculas contra el 'WHATSAPP' que llegaba, así
 * que no se generaba un QR de reserva jamás y nadie se dio cuenta — con `string`
 * el compilador no tenía nada que decir.
 */
export type CtaActionType = 'URL' | 'WHATSAPP' | 'PHONE' | 'COUPON' | null

/** guide_zone_restaurants.tier: el CHECK de la tabla sólo admite estos dos. */
export type RestaurantTier = 'basic' | 'featured'

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
  pois: Array<{
    id: string; name: string; description: string; category: string; google_maps_url: string; media: any[]
    address?: string | null; phone?: string | null; website_url?: string | null; opening_hours?: string | null
    rating?: number | null; travel_time_text?: string | null; travel_mode?: 'walk' | 'drive' | 'bike' | null; distance_text?: string | null
    is_featured?: boolean; is_promoted?: boolean; cover_image_url?: string | null
  }>
  restaurants: Array<{
    id: string; name: string; slug: string; cuisine_type: string; tier: RestaurantTier; cover_image: string
    is_promoted?: boolean
    address?: string | null; city?: string | null; country?: string | null
    phone?: string | null; website?: string | null; description?: string
  }>
  experiences: Array<{
    id: string; name: string; description: string; category: string; service_subcategory: string | null
    // Ya resueltos por el worker: si la experiencia tiene CTA secundario, esto ES
    // el secundario. La TV no vuelve a decidir — antes lo hacía y se equivocaba.
    action_type: CtaActionType; action_data: string; prefilled_message: string; price_display: string
    /** 'affiliate' = el enlace es retribuido y hay que avisarlo en la ficha. */
    cta_source?: 'affiliate' | 'direct'
    is_featured: boolean; is_promoted?: boolean; cta_label: string; cover_image_url?: string; media?: any[]
    address?: string | null; phone?: string | null; website_url?: string | null; opening_hours?: string | null
    rating?: number | null; travel_time_text?: string | null; travel_mode?: 'walk' | 'drive' | 'bike' | null
    distance_text?: string | null; duration_text?: string | null
  }>
  // Ya venía en /guide/:slug (workerGuide.js) — el tipo simplemente no lo
  // declaraba porque nadie en la TV lo leía todavía.
  store_items: Array<{
    id: string; owner_type: 'host' | 'platform'; category: string | null; icon: string | null
    name: string; description: string
    price_amount: number | null; price_currency: string | null; price_display: string
    cover_image_url?: string | null; is_featured: boolean; is_promoted?: boolean; in_stock: boolean
    cta_label: string | null
  }>
  meta: { lang: string; available_langs: string[] }
  /**
   * Ajustes del DISPOSITIVO emparejado. Solo puede llegar por
   * `/guide/tv/config/:code`, nunca por `/guide/:slug` (ahí no hay dispositivo).
   * Opcional a propósito: el backend todavía no lo devuelve y la pantalla tiene
   * que funcionar igual sin él.
   */
  device?: {
    /** 'small' | 'normal' | 'large' — pulgadas de la tele, ver lib/display.ts */
    screen_size?: string | null
  }
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

// POST /guide/store/orders (workerGuideStore.js) — misma llamada que hace
// apps/guide. El número de WhatsApp de un producto NO llega en /guide/:slug
// (ni en `store_items` de arriba): lo resuelve el propio worker en servidor
// (contacto del ítem → del apartamento si es 'host' → PLATFORM_WHATSAPP si es
// 'platform'), y de paso dejar el pedido en D1 es lo que lo hace auditable —
// por eso esto no se puede construir en el cliente como el QR de una
// experiencia (ver bookingQr en lib/collections.ts).
export interface StoreOrderResult {
  success: boolean
  orders?: Array<{ orderId: string; ownerType: 'host' | 'platform'; whatsappUrl: string | null }>
  error?: string
}

export async function submitStoreOrder(params: {
  apartmentId: string
  itemId: string
  quantity?: number
}): Promise<StoreOrderResult> {
  try {
    const res = await fetch(`${API_URL}/guide/store/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apartmentId: params.apartmentId,
        items: [{ itemId: params.itemId, quantity: params.quantity || 1 }],
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { success: false, error: (data as any).error || `HTTP ${res.status}` }
    return data as StoreOrderResult
  } catch (err: any) {
    return { success: false, error: err?.message || 'network error' }
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
