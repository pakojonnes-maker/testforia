// Consentimiento del guidebook (art. 22.2 LSSI / art. 6.1.a RGPD).
//
// Hasta ahora el guidebook no pedía NADA y sin embargo escribía en el dispositivo
// del huésped un UUID de 12 meses (vt_guide_visitor_id), una cookie de atribución
// de 30 días en .visualtastes.com (vt_guide_ref) y calculaba una huella de
// dispositivo. Ninguna de las tres es necesaria para mostrar la guía.
//
// La puerta vive aquí y la aplica lib/api.ts en el origen: así ningún punto de
// llamada nuevo puede saltársela sin darse cuenta.

const CONSENT_KEY = 'vt_guide_consent';

export type ConsentState = 'granted' | 'denied' | 'unset';

/** Evento que se emite al cambiar la decisión, para que la UI reaccione sin recargar. */
export const CONSENT_EVENT = 'vt-guide-consent-change';

export function getConsent(): ConsentState {
  if (typeof window === 'undefined') return 'unset';
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw === 'granted' || raw === 'denied') return raw;
    return 'unset';
  } catch {
    // Sin storage no podemos recordar la decisión. Se trata como "no consiente":
    // el silencio nunca equivale a consentimiento.
    return 'unset';
  }
}

/** true solo con un "sí" explícito. El silencio NO es consentimiento. */
export function hasConsent(): boolean {
  return getConsent() === 'granted';
}

export function setConsent(state: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(CONSENT_KEY, state);
  } catch {
    /* sin storage: la decisión solo dura esta carga, pero se respeta igual */
  }
  if (state === 'denied') clearStoredIdentifiers();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

/**
 * Borra lo que hubiéramos dejado en el dispositivo. Se llama al rechazar y al
 * revocar, para que "no" signifique también "y quita lo que ya habías puesto".
 */
export function clearStoredIdentifiers(): void {
  try {
    localStorage.removeItem('vt_guide_visitor_id');
  } catch { /* nada que hacer */ }
  try {
    const host = window.location.hostname;
    const isVisualtastesDomain = host === 'visualtastes.com' || host.endsWith('.visualtastes.com');
    const domainAttr = isVisualtastesDomain ? '; domain=.visualtastes.com' : '';
    // max-age=0 la caduca de inmediato. Hay que repetir path y domain exactos o
    // el navegador no la reconoce como la misma cookie.
    document.cookie = `vt_guide_ref=; path=/; max-age=0${domainAttr}`;
  } catch { /* nada que hacer */ }
}

export function subscribeToConsent(listener: (state: ConsentState) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent).detail as ConsentState);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
