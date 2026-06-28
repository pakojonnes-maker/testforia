// src/lib/api.ts — API helper for the guide app
const API_URL = import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

export async function fetchGuidebook(slug: string, lang: string = 'es') {
  const res = await fetch(`${API_URL}/guide/${slug}?lang=${lang}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
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
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function trackSessionEnd(sessionId: string) {
  try {
    navigator.sendBeacon(
      `${API_URL}/guide/track/session/end`,
      JSON.stringify({ sessionId })
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
