// src/lib/api.ts — API helper for the guide app
import { getTranslation } from './i18n';
import { hasConsent } from './consent';

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

export async function fetchGuidebook(slug: string, lang: string = 'es') {
  const res = await fetch(`${API_URL}/guide/${slug}?lang=${lang}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * "Browse another city" for the Explore map tab (GET /guide/:slug/explore).
 * Only ever call this for a zone OTHER than the guest's home zone — the home
 * zone's POIs already come from fetchGuidebook() above, and may be a curated
 * subset/order the host picked (guide_apartment_pois); this endpoint always
 * returns the zone's full, uncurated catalog. See useExploreState.ts, which
 * enforces that and caches the result per zone+lang so re-selecting a city
 * already seen this session doesn't refetch it.
 */
export async function fetchExploreZone(apartmentSlug: string, zoneSlug: string, lang: string = 'es') {
  const res = await fetch(`${API_URL}/guide/${apartmentSlug}/explore?zone=${encodeURIComponent(zoneSlug)}&lang=${lang}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const VISITOR_KEY = 'vt_guide_visitor_id';
const VISITOR_TTL = 365 * 24 * 60 * 60 * 1000; // 12 meses

function randomUuid(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

/**
 * Id efímero, solo en memoria: muere al recargar y no toca el dispositivo.
 *
 * Es lo que se usa cuando el huésped NO ha consentido pero necesita un
 * identificador para un servicio que ha pedido él (el rate limit del chat, un
 * pedido de la Tienda). Así ese caso funciona sin escribir nada persistente.
 */
let ephemeralId: string | null = null;
function getEphemeralId(): string {
  if (!ephemeralId) ephemeralId = randomUuid();
  return ephemeralId;
}

/**
 * Identificador estable del visitante, persistido en localStorage.
 *
 * ⚖️ REQUIERE CONSENTIMIENTO. Sin él devuelve un id de memoria y NO escribe nada
 * en el dispositivo (art. 22.2 LSSI: el almacenamiento local necesita permiso
 * igual que las cookies). Ojo: es un id que permite reconocer a la misma persona
 * durante 12 meses, así que es dato personal seudonimizado, no anónimo.
 *
 * Sustituye a `getDeviceFingerprint()` como identidad principal: aquel hash de
 * 32 bits sobre UA + idioma + resolución + zona horaria colisionaba de forma
 * masiva (dos iPhone del mismo modelo, idioma y zona horaria daban el mismo
 * valor, que es justo el caso normal en un edificio de apartamentos turísticos).
 * En producción, 66 sesiones se agrupaban en solo 9 identidades.
 */
export function getVisitorId(): string {
  if (!hasConsent()) return getEphemeralId();

  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.value && Date.now() <= parsed.expiry) return parsed.value;
    }
  } catch {
    // localStorage bloqueado (modo privado, cookies de terceros): seguimos abajo.
  }
  const id = randomUuid();
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ value: id, expiry: Date.now() + VISITOR_TTL }));
  } catch { /* sin storage: el id vive solo esta sesión */ }
  return id;
}

const GUIDE_REFERRAL_COOKIE = 'vt_guide_ref';
const GUIDE_REFERRAL_COOKIE_MAX_AGE_DAYS = 30;

/**
 * Persiste la referencia guía→restaurante en una cookie de primera parte en
 * .visualtastes.com (leída por menu.visualtastes.com en
 * apps/client/src/providers/TrackingAndPushProvider.tsx). Sin esto, la
 * atribución al abrir el menú desde el guidebook solo vive dentro de la MISMA
 * sesión de navegador (sessionStorage del lado del menú): un huésped que hoy
 * ve un restaurante en la guía y va a cenar allí dos días después, escaneando
 * el QR físico de la mesa sin ningún ?ref= en la URL, no dejaba ningún rastro
 * de venir de la guía. 30 días cubre la duración típica de una estancia.
 *
 * El atributo Domain solo se fija cuando el guidebook corre de verdad en un
 * subdominio de visualtastes.com — en local/dev el navegador rechazaría un
 * Domain que no coincide con el host actual, así que ahí se usa una cookie de
 * host normal (sirve igual para probar el flujo en desarrollo).
 */
export function setReferralCookie(apartmentId: string, sessionId: string | null) {
  // ⚖️ Atribución entre guide y menu: cookie propia pero de finalidad analítica,
  // no necesaria para mostrar la guía. Sin consentimiento no se escribe.
  if (!hasConsent()) return;
  try {
    const host = window.location.hostname;
    const isVisualtastesDomain = host === 'visualtastes.com' || host.endsWith('.visualtastes.com');
    const value = encodeURIComponent(JSON.stringify({ apt: apartmentId, gsid: sessionId, ts: Date.now() }));
    const maxAge = GUIDE_REFERRAL_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    const domainAttr = isVisualtastesDomain ? '; domain=.visualtastes.com' : '';
    const secureAttr = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${GUIDE_REFERRAL_COOKIE}=${value}; path=/; max-age=${maxAge}; samesite=lax${domainAttr}${secureAttr}`;
  } catch {
    // best-effort: sin document.cookie disponible, la atribución cruzada se pierde
    // pero el guidebook sigue funcionando con normalidad.
  }
}

export async function trackSessionStart(apartmentId: string, language: string) {
  // ⚖️ Analítica pura: sin consentimiento no se abre sesión, y por tanto no hay
  // ni section-views ni intents que registrar (ambos cuelgan de sessionId).
  if (!hasConsent()) return null;
  try {
    const res = await fetch(`${API_URL}/guide/track/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apartmentId,
        language,
        deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        osName: getOS(),
        browser: getBrowser(),
        visitorId: getVisitorId(),
        // Se sigue enviando como respaldo para navegadores sin localStorage.
        deviceFingerprint: getDeviceFingerprint(),
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * URL del menú de un restaurante con la atribución del guidebook incrustada.
 *
 * Sin estos parámetros los dos mundos no se tocan: al abrir el menú se creaba
 * una sesión que no sabía nada del apartamento de origen, así que era imposible
 * responder "cuántos clientes le manda este alojamiento a este restaurante".
 */
export function buildMenuUrl(menuBase: string, slug: string, apartmentId: string, sessionId: string | null): string {
  const url = new URL(`${menuBase.replace(/\/$/, '')}/${slug}`);
  url.searchParams.set('ref', 'guide');
  url.searchParams.set('apt', apartmentId);
  if (sessionId) url.searchParams.set('gsid', sessionId);
  return url.toString();
}

export async function trackSessionEnd(sessionId: string, duration?: number) {
  if (!hasConsent()) return;
  try {
    // La duración la calcula el cliente porque el servidor solo veía `started_at`
    // y, al llamarse esto en cada `visibilitychange`, la sesión quedaba cerrada
    // en el primer cambio de pestaña aunque el huésped siguiera navegando.
    // El backend se queda con el máximo, así que reenviar es seguro.
    navigator.sendBeacon(
      `${API_URL}/guide/track/session/end`,
      JSON.stringify({ sessionId, duration })
    );
  } catch {
    // Best-effort
  }
}

export async function trackIntent(data: {
  sessionId?: string;
  apartmentId: string;
  targetType: 'restaurant' | 'experience' | 'product';
  targetId: string;
  actionTaken: string;
}) {
  if (!hasConsent()) return;
  try {
    await fetch(`${API_URL}/guide/track/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Best-effort
  }
}

// Build WhatsApp URL with prefilled message
export function buildWhatsAppUrl(phone: string, message?: string): string {
  const cleaned = phone.replace(/[^+\d]/g, '');
  const base = `https://wa.me/${cleaned}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export interface StoreOrderResult {
  success: boolean;
  orders?: Array<{ orderId: string; ownerType: 'host' | 'platform'; whatsappUrl: string | null }>;
  error?: string;
}

/**
 * Envía el pedido de la Tienda: se guarda en D1 ANTES de abrir WhatsApp (a
 * diferencia de las experiencias de zona, que son un enlace directo sin
 * rastro). Si el carrito mezcla productos del anfitrión y de la plataforma,
 * el backend los separa en varios pedidos — cada uno con su propio hilo de
 * WhatsApp, porque solo puede haber un destinatario por conversación.
 */
export async function submitStoreOrder(params: {
  apartmentId: string;
  items: Array<{ itemId: string; quantity: number }>;
  sessionId?: string | null;
  visitorId?: string;
}): Promise<StoreOrderResult> {
  try {
    const res = await fetch(`${API_URL}/guide/store/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apartmentId: params.apartmentId,
        items: params.items,
        sessionId: params.sessionId || null,
        visitorId: params.visitorId || getVisitorId(),
      }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || `HTTP ${res.status}` };
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'network_error' };
  }
}

export async function trackSectionView(apartmentId: string, sessionId: string | null, section: string) {
  if (!hasConsent()) return;
  try {
    await fetch(`${API_URL}/guide/track/section-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apartmentId, sessionId, section }),
    });
  } catch { /* best effort */ }
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Win/.test(ua)) return 'Windows';
  if (/Mac/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'unknown';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/CriOS|Chrome/.test(ua)) return 'Chrome';
  if (/FxiOS|Firefox/.test(ua)) return 'Firefox';
  if (/Safari/.test(ua)) return 'Safari';
  if (/Edge/.test(ua)) return 'Edge';
  return 'unknown';
}

/**
 * ⚖️ Huella de dispositivo. Solo se llama desde trackSessionStart(), que ya está
 * detrás del consentimiento — NO la invoques desde ningún otro sitio sin
 * comprobar hasConsent() antes. El fingerprinting está expresamente cubierto por
 * el art. 5.3 de la Directiva ePrivacy (Directrices 2/2023 del CEPD) y es de los
 * tratamientos peor vistos por las autoridades cuando se hace sin permiso.
 */
function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    window.screen.width + 'x' + window.screen.height,
    window.screen.colorDepth,
    new Date().getTimezoneOffset(),
  ];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Send a chat message to the AI assistant and stream the response.
 * Calls POST /guide/ai/chat and reads the SSE stream.
 * @param apartmentId - The apartment ID
 * @param message - The user message
 * @param history - Previous chat messages (max 10)
 * @param lang - Language code
 * @param onToken - Callback called with each text token as it arrives
 * @param onDone - Callback called when the stream is complete
 */
export async function sendChatMessage(
  apartmentId: string,
  message: string,
  history: ChatMessage[],
  lang: string,
  onToken: (token: string) => void,
  onDone: () => void
): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/guide/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // visitorId es la clave del rate limit por visitante en el worker (ver
      // workerGuideAI.js) — sin esto, todos los clientes comparten un único
      // contador "anon" y el límite deja de ser "por huésped".
      body: JSON.stringify({ apartmentId, message, history, lang, visitorId: getVisitorId() }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      const code = (err as any).error;
      if (code === 'rate_limited') throw new Error('__rate_limited__');
      if (code === 'ai_unavailable') throw new Error('__ai_unavailable__');
      throw new Error(code || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Workers AI streams SSE: "data: {...}\n\n"
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          // Workers AI format: { response: "token" }
          const token = parsed?.response ?? parsed?.choices?.[0]?.delta?.content ?? '';
          if (token) onToken(token);
        } catch {
          // Non-JSON SSE line, skip
        }
      }
    }
  } catch (err: any) {
    if (err?.message === '__rate_limited__') {
      onToken(getTranslation('chat_rate_limited', lang));
    } else if (err?.message === '__ai_unavailable__') {
      onToken(getTranslation('chat_unavailable', lang));
    } else {
      onToken(getTranslation('chat_connection_error', lang));
    }
  } finally {
    onDone();
  }
}
