// Identidad del comensal entre visitas ("recordar este dispositivo").
//
// Reconocer el mismo móvil en días distintos (recurrencia, y seguir atribuyendo a la guía
// al huésped que vuelve) exige guardar algo en él, y eso solo con permiso (art. 22.2 LSSI).
// Sin él, la carta mide igual pero de forma anónima: el servidor calcula la identidad del
// día (workerVisitorHash.js) y aquí no se escribe nada.
import { beacon } from './api';

const VISITOR_KEY = 'vt_visitor_id';
const CONSENT_KEY = 'vt_consent_analytics';
const VISITOR_TTL = 365 * 24 * 60 * 60 * 1000; // 12 meses

/** El id de 12 meses guardado en este móvil, si lo hay (también lo crea el primer sello). */
export function getVisitorId(): string | null {
  try {
    const itemStr = localStorage.getItem(VISITOR_KEY);
    if (!itemStr) return null;
    const item = JSON.parse(itemStr);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(VISITOR_KEY);
      return null;
    }
    return item.value;
  } catch {
    return null;
  }
}

export function setVisitorId(id: string) {
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ value: id, expiry: Date.now() + VISITOR_TTL }));
  } catch { /* sin storage */ }
}

/** Lo que contestó el comensal: sí, no, o todavía nada (entonces se le pregunta en la bienvenida). */
export function getRememberChoice(): 'yes' | 'no' | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'true' ? 'yes' : v === 'false' ? 'no' : null;
  } catch {
    // Sin storage (modo privado) no hay nada que recordar: no se pregunta.
    return 'no';
  }
}

/** ¿Ha dicho que sí a "recordar este dispositivo"? Solo un 'true' explícito cuenta. */
export function hasRememberConsent(): boolean {
  return getRememberChoice() === 'yes';
}

/**
 * Guarda la respuesta. Con un "no" se pide al servidor que desvincule las sesiones ya
 * registradas con ese id (/track/privacy/forget). vt_visitor_id no se borra: también es la
 * identidad de la tarjeta de sellos (useLoyaltyCard), y borrarlo hacía perder los sellos;
 * solo se deja de enviar con la analítica.
 */
export function setRememberConsent(on: boolean) {
  try {
    localStorage.setItem(CONSENT_KEY, on ? 'true' : 'false');
  } catch { /* sin storage: no hay nada que recordar */ }
  if (!on) {
    const visitorId = getVisitorId();
    if (visitorId) beacon('/track/privacy/forget', { visitorId });
  }
}
