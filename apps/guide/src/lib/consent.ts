// Consentimiento del guidebook (art. 22.2 LSSI / art. 6.1.a RGPD).
//
// QUÉ CUBRE HOY — y qué ya NO.
//
// Esto NO gobierna la analítica. Entre el 6 de agosto y el 5 de septiembre de
// 2026 sí lo hizo, y el resultado medido en producción fue 1 sesión y 1
// visitante único en 30 días para toda una agencia: sin un "sí" explícito no se
// abría sesión, y de ahí colgaba todo el dashboard. Encima "Rechazar" era
// definitivo e invisible — el banner no volvía a salir nunca en ese dispositivo.
//
// Ahora las visitas se cuentan con una identidad que deriva el SERVIDOR a partir
// de un salt que rota cada día (workerVisitorHash.js). No se escribe nada en el
// terminal del huésped, así que el art. 22.2 no entra y no hay permiso que pedir.
//
// Lo que sigue detrás de esta puerta es solo el RECUERDO ENTRE VISITAS, que sí
// necesita escribir en el dispositivo y no es necesario para mostrar la guía:
//   · vt_guide_visitor_id — UUID de 12 meses. Permite responder "¿ha vuelto otro
//     día?", que el hash diario no puede por diseño.
//   · vt_guide_ref — cookie de 30 días en .visualtastes.com. Atribuye a este
//     apartamento una cena de dentro de tres días en la que el huésped escanea
//     el QR físico de la mesa. El clic directo desde la guía y el QR del mismo
//     día NO la necesitan: van por la URL y por el join de servidor.
//
// Por defecto está desactivado y no se pregunta en ninguna parte: se activa
// desde /legal, accesible desde el icono de la cabecera en todas las pestañas.
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
