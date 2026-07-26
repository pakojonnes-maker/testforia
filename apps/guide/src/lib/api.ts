// src/lib/api.ts — API helper for the guide app
import { getTranslation } from './i18n';

const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

export async function fetchGuidebook(slug: string, lang: string = 'es') {
  const res = await fetch(`${API_URL}/guide/${slug}?lang=${lang}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const VISITOR_KEY = 'vt_guide_visitor_id';
const VISITOR_TTL = 365 * 24 * 60 * 60 * 1000; // 12 meses

/**
 * Identificador anónimo y estable del visitante, persistido en localStorage.
 *
 * Sustituye a `getDeviceFingerprint()` como identidad principal: aquel hash de
 * 32 bits sobre UA + idioma + resolución + zona horaria colisionaba de forma
 * masiva (dos iPhone del mismo modelo, idioma y zona horaria daban el mismo
 * valor, que es justo el caso normal en un edificio de apartamentos turísticos).
 * En producción, 66 sesiones se agrupaban en solo 9 identidades.
 */
export function getVisitorId(): string {
  try {
    const raw = localStorage.getItem(VISITOR_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.value && Date.now() <= parsed.expiry) return parsed.value;
    }
  } catch {
    // localStorage bloqueado (modo privado, cookies de terceros): seguimos abajo.
  }
  const id = crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ value: id, expiry: Date.now() + VISITOR_TTL }));
  } catch { /* sin storage: el id vive solo esta sesión */ }
  return id;
}

export async function trackSessionStart(apartmentId: string, language: string) {
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

export async function trackSectionView(apartmentId: string, sessionId: string | null, section: string) {
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
      body: JSON.stringify({ apartmentId, message, history, lang }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || `HTTP ${res.status}`);
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
    // On error emit a fallback message
    onToken(getTranslation('chat_connection_error', lang));
  } finally {
    onDone();
  }
}
