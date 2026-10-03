// src/providers/TrackingAndPushProvider.tsx
//
// Medición de la carta y avisos push.
//
// ⚖️ Modelo de privacidad (oct-2026, igual que la guía): toda visita abre una sesión
// ANÓNIMA. La identidad del día la calcula el servidor (workerVisitorHash.js: hash de IP +
// navegador con un salt aleatorio que rota cada día) y aquí no se escribe nada en el móvil
// para medir, así que no hay banner. Antes la carta no abría ninguna sesión sin un "Aceptar"
// en un splash solo en español: 16 sesiones en 30 días entre las 4 cartas.
//
// Lo que de verdad le importa al negocio —saber si un cliente vuelve otro día y seguir
// atribuyendo a la guía al huésped que cena días después— exige reconocer el móvil entre
// días, y eso es guardar algo en él: con permiso o no se hace. Se pregunta en la hoja de
// bienvenida de la carta, en su idioma, con "Sí" y "No" al mismo nivel y sin tapar la carta
// (CartaApp); se puede cambiar en /legal/privacy. Con un "Sí", vt_visitor_id de 12 meses
// (vt_consent_analytics = 'true') y el servidor identifica la sesión en curso
// (/track/session/identify). La atribución guía → carta de otro día también llega por la
// cookie vt_guide_ref, que el huésped autoriza en la guía.
// Si cambias algo de esto, actualiza components/legal/PrivacyContent.tsx en el mismo commit.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_URL, apiRequest, beacon } from '../lib/api';
import { getVisitorId, hasRememberConsent, setRememberConsent, setVisitorId } from '../lib/visitor';

interface TrackEvent {
  type: string;
  entityId?: string;
  entityType?: string;
  value?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  ts?: string;
  sectionId?: string;
}

interface TrackerApi {
  viewDish(dishId: string, sectionId?: string): void;
  favoriteDish(dishId: string, set?: boolean): void;
  track(ev: TrackEvent): void;
  flush(immediate?: boolean): Promise<void>;
  isReady(): boolean;
  setCurrentSection(sectionId: string | null): void;
  trackDishViewDuration(dishId: string, duration: number, sectionId?: string): void;
  trackSectionTime(sectionId: string, duration: number, dishesViewed: number): void;
  trackScrollDepth(sectionId: string, dishIndex: number, totalDishes: number): void;
  trackMediaError(dishId: string, errorType: string, mediaUrl?: string): void;
}

export type PushResult = 'success' | 'denied' | 'error' | 'unsupported' | 'ios_prompt';

interface TrackingContext {
  sessionId: string | null;
  tracker: TrackerApi | null;
  /** "Recordar este dispositivo": guarda la respuesta y, si es sí, identifica ya la sesión en curso. */
  rememberDevice: (on: boolean) => Promise<void>;
  // Push Notifications
  isPushSupported: boolean;
  isPushEnabled: boolean;
  isIOS: boolean;
  /** iPhone con la carta ya en la pantalla de inicio y una activación de avisos a medias. */
  pushPending: boolean;
  clearPushPending: () => void;
  showIOSPrompt: boolean;
  setShowIOSPrompt: (show: boolean) => void;
  subscribeToPush: () => Promise<PushResult>;
  unsubscribeFromPush: () => Promise<boolean>;
}

const PUSH_PENDING_KEY = 'vt_push_pending';

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const BATCH_SIZE = 8;
const FLUSH_INTERVAL = 3000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1500;
const OFFLINE_KEY = 'vt_offline_events';

const TrackingCtx = createContext<TrackingContext>({
  sessionId: null,
  tracker: null,
  rememberDevice: async () => { },
  isPushSupported: false,
  isPushEnabled: false,
  isIOS: false,
  pushPending: false,
  clearPushPending: () => { },
  showIOSPrompt: false,
  setShowIOSPrompt: () => { },
  subscribeToPush: async () => 'unsupported',
  unsubscribeFromPush: async () => false,
});

export const useTracking = () => useContext(TrackingCtx);

// Cola de eventos con envío por lotes
class OptimizedTracker implements TrackerApi {
  private restaurantId: string;
  private sessionId: string | null = null;
  private currentSectionId: string | null = null;
  private queue: TrackEvent[] = [];
  private viewedDishes = new Set<string>();
  private viewedSections = new Set<string>();
  private favorites = new Map<string, boolean>();
  private timer: number | null = null;
  private isProcessing = false;
  private retryCount = 0;
  private isDestroyed = false;
  private sectionScrollDepth = new Map<string, number>();

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  setSession(sessionId: string | null) {
    if (this.isDestroyed) return;
    this.sessionId = sessionId;
    if (sessionId) {
      this.restoreOfflineQueue();
      this.scheduleFlush();
    }
  }

  setCurrentSection(sectionId: string | null) {
    if (this.isDestroyed) return;
    if (sectionId && sectionId !== this.currentSectionId && !this.viewedSections.has(sectionId)) {
      this.viewSection(sectionId);
    }
    this.currentSectionId = sectionId;
  }

  private viewSection(sectionId: string): void {
    if (!this.isReady() || this.viewedSections.has(sectionId)) return;
    this.viewedSections.add(sectionId);
    this.track({ type: 'view_section', entityId: sectionId, entityType: 'section' });
  }

  isReady(): boolean {
    return !this.isDestroyed && !!(this.sessionId && this.restaurantId);
  }

  private scheduleFlush() {
    if (this.isDestroyed || this.timer) return;
    this.timer = window.setTimeout(() => {
      // Sin este reset el guard de arriba bloqueaba todos los flush periódicos posteriores.
      this.timer = null;
      if (!this.isDestroyed) {
        this.flush().catch((error) => console.warn('⚠️ [Tracker] Error flush programado:', error));
      }
    }, FLUSH_INTERVAL);
  }

  viewDish(dishId: string, sectionId?: string): void {
    if (!this.isReady() || this.viewedDishes.has(dishId)) return;
    this.viewedDishes.add(dishId);
    const finalSectionId = sectionId || this.currentSectionId;
    this.track({ type: 'viewdish', entityId: dishId, entityType: 'dish', sectionId: finalSectionId || undefined });
  }

  favoriteDish(dishId: string, set: boolean = true): void {
    if (!this.isReady()) return;
    if (this.favorites.get(dishId) === set) return;
    this.favorites.set(dishId, set);
    this.track({ type: 'favorite', entityId: dishId, entityType: 'dish', value: set, sectionId: this.currentSectionId || undefined });
  }

  trackDishViewDuration(dishId: string, duration: number, sectionId?: string): void {
    if (!this.isReady() || duration < 1) return;
    const finalSectionId = sectionId || this.currentSectionId;
    this.track({
      type: 'dish_view_duration',
      entityId: dishId,
      entityType: 'dish',
      value: duration,
      sectionId: finalSectionId || undefined,
      props: { duration_seconds: duration },
    });
  }

  trackSectionTime(sectionId: string, duration: number, dishesViewed: number): void {
    if (!this.isReady() || duration < 1) return;
    this.track({
      type: 'section_time',
      entityId: sectionId,
      entityType: 'section',
      value: duration,
      props: { duration_seconds: duration, dishes_viewed: dishesViewed },
    });
  }

  trackScrollDepth(sectionId: string, dishIndex: number, totalDishes: number): void {
    if (!this.isReady()) return;
    const currentMax = this.sectionScrollDepth.get(sectionId) || 0;
    if (dishIndex <= currentMax) return;
    this.sectionScrollDepth.set(sectionId, dishIndex);
    const depthPercent = Math.round((dishIndex / totalDishes) * 100);
    this.track({
      type: 'scroll_depth',
      entityId: sectionId,
      entityType: 'section',
      value: depthPercent,
      props: { dish_index: dishIndex, total_dishes: totalDishes, depth_percent: depthPercent },
    });
  }

  trackMediaError(dishId: string, errorType: string, mediaUrl?: string): void {
    if (!this.isReady()) return;
    this.track({
      type: 'media_error',
      entityId: dishId,
      entityType: 'dish',
      value: errorType,
      props: { error_type: errorType, media_url: mediaUrl || null, section_id: this.currentSectionId },
    });
  }

  track(ev: TrackEvent): void {
    if (!this.isReady() || this.isDestroyed) return;
    this.queue.push({
      ...ev,
      ts: ev.ts || new Date().toISOString(),
      sectionId: ev.sectionId || this.currentSectionId || undefined,
    });
    if (this.queue.length >= BATCH_SIZE) {
      this.flush().catch(console.error);
    }
  }

  async flush(immediate = false): Promise<void> {
    if (!this.isReady() || this.queue.length === 0 || this.isProcessing || this.isDestroyed) {
      if (!immediate && !this.isDestroyed) this.scheduleFlush();
      return;
    }

    this.isProcessing = true;
    const events = [...this.queue];
    this.queue = [];
    const payload = { sessionId: this.sessionId!, restaurantId: this.restaurantId, events };

    try {
      if (immediate) beacon('/track/events', payload);
      else await apiRequest('/track/events', { method: 'POST', json: payload });
      this.retryCount = 0;
    } catch (error) {
      console.error('❌ [Tracker] Error enviando eventos:', error);
      if (this.retryCount < MAX_RETRIES && !this.isDestroyed) {
        this.queue.unshift(...events);
        this.retryCount++;
        setTimeout(() => {
          if (!this.isDestroyed) this.flush().catch(console.error);
        }, RETRY_DELAY * Math.pow(2, this.retryCount - 1));
      }
    }
    this.isProcessing = false;
    if (!immediate && !this.isDestroyed) this.scheduleFlush();
  }

  /** Cierre de verdad de la página: lo pendiente sale por sendBeacon y el tracker se apaga. */
  cleanup(): void {
    this.isDestroyed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length > 0 && this.sessionId) {
      const payload = { sessionId: this.sessionId, restaurantId: this.restaurantId, events: [...this.queue] };
      const sent = typeof navigator.sendBeacon === 'function'
        && navigator.sendBeacon(`${API_URL}/track/events`, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      if (!sent) this.saveToOfflineQueue(this.queue);
    }

    this.viewedDishes.clear();
    this.viewedSections.clear();
    this.favorites.clear();
    this.queue = [];
    this.currentSectionId = null;
    this.sectionScrollDepth.clear();
  }

  // Guardar eventos en el móvil para mandarlos en la siguiente visita es almacenamiento con
  // fines de medición: solo con "recordar este dispositivo" activado. Si no, se pierden.
  private saveToOfflineQueue(events: TrackEvent[]): void {
    if (!hasRememberConsent()) return;
    try {
      const existing = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
      localStorage.setItem(OFFLINE_KEY, JSON.stringify([...existing, ...events].slice(-100)));
    } catch { /* sin storage */ }
  }

  private restoreOfflineQueue(): void {
    try {
      const saved = localStorage.getItem(OFFLINE_KEY);
      if (!saved) return;
      localStorage.removeItem(OFFLINE_KEY);
      const events = JSON.parse(saved);
      if (Array.isArray(events) && events.length > 0 && hasRememberConsent()) this.queue.unshift(...events);
    } catch { /* ignorar */ }
  }
}

function detectEnvironment() {
  if (typeof navigator === 'undefined') return {};
  const ua = navigator.userAgent;

  let devicetype = 'desktop';
  if (/Mobile|Android|iPhone/i.test(ua)) devicetype = 'mobile';
  else if (/iPad|Tablet/i.test(ua)) devicetype = 'tablet';

  // El orden importa: el UA de un iPhone dice "like Mac OS X" y el de Android dice "Linux".
  // Antes se comprobaban al revés y todos los iPhone contaban como macOS y los Android como Linux.
  let osname = 'Unknown';
  if (/Windows/i.test(ua)) osname = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) osname = 'iOS';
  else if (/Mac OS X/i.test(ua)) osname = 'macOS';
  else if (/Android/i.test(ua)) osname = 'Android';
  else if (/Linux/i.test(ua)) osname = 'Linux';

  let browser = 'Unknown';
  if (ua.includes('Edg/') || ua.includes('EdgiOS/')) browser = 'Edge';
  else if (ua.includes('Firefox/') || ua.includes('FxiOS/')) browser = 'Firefox';
  else if (ua.includes('Chrome/') || ua.includes('CriOS/')) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';

  const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  const networktype = connection?.effectiveType ?? '4g';

  const ispwa = (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.location.search.includes('utm_source=homescreen')
  );

  const urlParams = new URLSearchParams(window.location.search);
  const utm = {
    source: urlParams.get('utm_source') || undefined,
    medium: urlParams.get('utm_medium') || undefined,
    campaign: urlParams.get('utm_campaign') || undefined,
  };

  // Atribución cruzada: la guía y la TV del alojamiento añaden ?ref=&apt=&gsid= al enlazar
  // a la carta. Si el comensal llegó sin nada en la URL, el servidor aún puede atribuirla
  // por el hash del día (mismo día) o por la cookie vt_guide_ref (otro día, con permiso).
  const referral = readReferral(urlParams);

  return {
    devicetype,
    osname,
    browser,
    networktype,
    ispwa,
    languages: navigator.language,
    // El backend espera minutos de offset, no el identificador IANA.
    timezone: -new Date().getTimezoneOffset(),
    referrer: document?.referrer || undefined,
    utm,
    qrcode: urlParams.get('qrcode') || urlParams.get('qr') || undefined,
    referralSource: referral.source,
    referralApartmentId: referral.apartmentId,
    referralSessionId: referral.sessionId,
  };
}

const REFERRAL_KEY = 'vt_referral';

// Cookie de primera parte que la guía y la TV escriben en .visualtastes.com, solo con el
// permiso del huésped (ver apps/guide/src/lib/consent.ts), para atribuir una visita a la
// carta de otro día.
const GUIDE_REFERRAL_COOKIE = 'vt_guide_ref';

function readGuideReferralCookie(): { apartmentId?: string; sessionId?: string } {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${GUIDE_REFERRAL_COOKIE}=([^;]*)`));
    if (!match) return {};
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return { apartmentId: parsed.apt || undefined, sessionId: parsed.gsid || undefined };
  } catch {
    return {};
  }
}

function readReferral(urlParams: URLSearchParams): { source?: string; apartmentId?: string; sessionId?: string } {
  const source = urlParams.get('ref') || undefined;
  if (source) {
    const referral = {
      source,
      apartmentId: urlParams.get('apt') || undefined,
      sessionId: urlParams.get('gsid') || urlParams.get('tvsid') || undefined,
    };
    // Para que sobreviva a una recarga hay que guardarlo en el móvil: solo con permiso.
    if (hasRememberConsent()) {
      try { sessionStorage.setItem(REFERRAL_KEY, JSON.stringify(referral)); } catch { /* ignorar */ }
    }
    return referral;
  }
  try {
    const stored = sessionStorage.getItem(REFERRAL_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignorar */ }

  const cookieReferral = readGuideReferralCookie();
  if (cookieReferral.apartmentId) {
    return { source: 'guide', apartmentId: cookieReferral.apartmentId, sessionId: cookieReferral.sessionId };
  }
  return {};
}

async function startTrackingSession(restaurantId: string): Promise<string | null> {
  const remember = hasRememberConsent();
  try {
    const response = await apiRequest<{ success?: boolean; sessionId?: string; visitorId?: string | null }>('/track/session/start', {
      method: 'POST',
      json: {
        restaurantId,
        ...detectEnvironment(),
        visitorId: remember ? getVisitorId() || undefined : undefined,
        consentAnalytics: remember,
      },
    });
    if (!response?.success || !response.sessionId) return null;
    if (remember && response.visitorId) setVisitorId(response.visitorId);
    return response.sessionId;
  } catch (error) {
    console.error('❌ [Session] Error iniciando sesión:', error);
    return null;
  }
}

interface Props {
  restaurantId: string;
  children: React.ReactNode;
}

export function TrackingAndPushProvider({ restaurantId, children }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tracker, setTracker] = useState<OptimizedTracker | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    let isMounted = true;
    const instance = new OptimizedTracker(restaurantId);
    startTrackingSession(restaurantId).then((sid) => {
      if (!isMounted || !sid) return;
      startedAtRef.current = Date.now();
      instance.setSession(sid);
      setSessionId(sid);
      setTracker(instance);
    });
    return () => { isMounted = false; };
  }, [restaurantId]);

  // ✅ HEARTBEAT: duración de la sesión, en pausa tras 5 min sin tocar nada
  useEffect(() => {
    if (!sessionId || !tracker || !startedAtRef.current) return;

    let sessionEndSent = false;
    let heartbeatInterval: number | null = null;
    let activityThrottleTimer: number | null = null;

    const HEARTBEAT_INTERVAL = 30000;
    const IDLE_TIMEOUT = 5 * 60 * 1000;
    const ACTIVITY_THROTTLE = 1000;

    let lastActivityTime = Date.now();
    let isIdle = false;

    const sendHeartbeat = () => {
      if (sessionEndSent) return;
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - (startedAtRef.current || now.getTime())) / 1000);
      tracker.track({ type: 'heartbeat', value: durationSeconds, ts: now.toISOString() });
    };

    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    const checkIdleAndSendHeartbeat = () => {
      if (sessionEndSent) return;
      if (Date.now() - lastActivityTime >= IDLE_TIMEOUT) {
        if (!isIdle) {
          isIdle = true;
          sendHeartbeat();
          stopHeartbeat();
        }
      } else {
        sendHeartbeat();
      }
    };

    const startHeartbeat = () => {
      if (heartbeatInterval) return;
      heartbeatInterval = window.setInterval(checkIdleAndSendHeartbeat, HEARTBEAT_INTERVAL);
    };

    const handleActivity = () => {
      if (activityThrottleTimer) return;
      activityThrottleTimer = window.setTimeout(() => { activityThrottleTimer = null; }, ACTIVITY_THROTTLE);
      lastActivityTime = Date.now();
      if (isIdle && document.visibilityState === 'visible') {
        isIdle = false;
        sendHeartbeat();
        startHeartbeat();
      }
    };

    // Cierre real de la página. Un `pagehide` con `persisted` es la página entrando en la
    // bfcache (volver atrás en Safari la restaura tal cual): ahí solo se vacía la cola. Antes
    // se apagaba el tracker y, al volver, la sesión seguía abierta pero sin medir nada.
    const handlePageClose = (e?: Event) => {
      if (sessionEndSent || !startedAtRef.current) return;
      if (e && (e as PageTransitionEvent).persisted) {
        sendHeartbeat();
        tracker.flush(true).catch(() => { });
        return;
      }
      sessionEndSent = true;
      stopHeartbeat();
      tracker.cleanup();
      beacon('/track/session/end', {
        sessionId,
        startedAt: new Date(startedAtRef.current).toISOString(),
        endedAt: new Date().toISOString(),
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !sessionEndSent) {
        // Último latido antes de ocultarse: en móvil puede que no haya otra ocasión.
        sendHeartbeat();
        tracker.flush(true).catch(() => { });
        stopHeartbeat();
      } else if (document.visibilityState === 'visible' && !sessionEndSent && !isIdle) {
        startHeartbeat();
      }
    };

    const activityEvents = ['scroll', 'touchstart', 'click', 'keydown'];
    activityEvents.forEach((event) => {
      const options = event === 'scroll' || event === 'touchstart' ? { passive: true, capture: true } : { capture: true };
      document.addEventListener(event, handleActivity, options);
    });

    sendHeartbeat();
    startHeartbeat();

    window.addEventListener('beforeunload', handlePageClose);
    window.addEventListener('pagehide', handlePageClose);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopHeartbeat();
      if (activityThrottleTimer) clearTimeout(activityThrottleTimer);
      activityEvents.forEach((event) => document.removeEventListener(event, handleActivity, true));
      window.removeEventListener('beforeunload', handlePageClose);
      window.removeEventListener('pagehide', handlePageClose);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, tracker]);

  // ============================================
  // AVISOS PUSH
  // ============================================
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [pushPending, setPushPending] = useState(false);

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setIsPushSupported(true);

    // getRegistration y no `ready`: `ready` no se resuelve nunca si no hay service worker.
    navigator.serviceWorker.getRegistration('/').then((registration) =>
      registration?.pushManager.getSubscription().then((subscription) => setIsPushEnabled(!!subscription)),
    ).catch(() => { });

    const iosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iosDevice);

    // En iPhone los avisos solo funcionan con la carta en la pantalla de inicio. Si el cliente
    // lo pidió desde Safari, al abrir la app instalada se le lleva a la pantalla de avisos
    // (iOS exige que el permiso salga de un toque suyo: no se puede pedir solo).
    try {
      if (iosDevice && isStandalone() && localStorage.getItem(PUSH_PENDING_KEY)) setPushPending(true);
    } catch { /* ignorar */ }
  }, []);

  const clearPushPending = () => {
    setPushPending(false);
    try { localStorage.removeItem(PUSH_PENDING_KEY); } catch { /* ignorar */ }
  };

  const subscribeToPush = async (): Promise<PushResult> => {
    if (!isPushSupported) return 'unsupported';

    if (isIOS && !isStandalone()) {
      // Se guarda la carta en la que estaba: la app instalada arranca en la raíz del dominio
      // (start_url del manifest) y App.tsx le devuelve aquí.
      try { localStorage.setItem(PUSH_PENDING_KEY, window.location.pathname.split('/')[1] || 'true'); } catch { /* ignorar */ }
      setShowIOSPrompt(true);
      return 'ios_prompt';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return 'denied';

      const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BB34mfUFVy5s-Cnbtu7dB_OhXAx06GRlKKruLbJIbnTefFd0ECHqtcJP4x6r6MN-A3nr4Yl57wZ7iRm16SnSoQw';

      // Registrar primero (si ya lo está, no hace nada) y luego esperar a `ready`, que se
      // queda colgado para siempre si no hay ningún service worker registrado.
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await apiRequest('/api/notifications/subscribe', {
        method: 'POST',
        json: {
          subscription,
          restaurant_id: restaurantId,
          visitor_id: hasRememberConsent() ? getVisitorId() : null,
          device_type: detectEnvironment().devicetype,
        },
      });

      setIsPushEnabled(true);
      clearPushPending();
      return 'success';
    } catch (error) {
      console.error('🔔 [Push] Error activando avisos:', error);
      return 'error';
    }
  };

  // Baja de avisos desde la carta. El worker ya borra las suscripciones que el
  // servicio de push devuelve con 404/410, así que basta con anularla en el navegador.
  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!isPushSupported) return false;
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
      setIsPushEnabled(false);
      return true;
    } catch (error) {
      console.error('🔔 [Push] Unsubscribe error:', error);
      return false;
    }
  };

  // "Sí, recuérdame": la sesión ya está abierta (anónima); el servidor le pone ahora el
  // visitor_id (el que ya hubiera en el móvil, p. ej. el de la tarjeta de sellos, o uno
  // nuevo), con su recurrencia y la atribución a la guía que herede. "No": se guarda la
  // respuesta para no volver a preguntar, y si había un id se pide al servidor que lo olvide.
  const rememberDevice = async (on: boolean) => {
    setRememberConsent(on);
    if (!on || !sessionId) return;
    try {
      const res = await apiRequest<{ success?: boolean; visitorId?: string }>('/track/session/identify', {
        method: 'POST',
        json: { sessionId, visitorId: getVisitorId() || undefined },
      });
      if (res?.success && res.visitorId) setVisitorId(res.visitorId);
    } catch (error) {
      // Si falla, la próxima sesión ya sale identificada (la respuesta está guardada).
      console.warn('[Session] identify', error);
    }
  };

  const contextValue: TrackingContext = {
    sessionId,
    tracker,
    rememberDevice,
    isPushSupported,
    isPushEnabled,
    isIOS,
    pushPending,
    clearPushPending,
    showIOSPrompt,
    setShowIOSPrompt,
    subscribeToPush,
    unsubscribeFromPush,
  };

  return <TrackingCtx.Provider value={contextValue}>{children}</TrackingCtx.Provider>;
}

export function useDishTracking() {
  const ctx = useTracking();
  const { tracker } = ctx;

  return useMemo(() => ({
    viewDish: (dishId: string, sectionId?: string) => tracker?.viewDish(dishId, sectionId),
    favoriteDish: (dishId: string, set: boolean = true) => tracker?.favoriteDish(dishId, set),
    setCurrentSection: (sectionId: string | null) => tracker?.setCurrentSection(sectionId),
    trackDishViewDuration: (dishId: string, duration: number, sectionId?: string) => tracker?.trackDishViewDuration(dishId, duration, sectionId),
    trackSectionTime: (sectionId: string, duration: number, dishesViewed: number) => tracker?.trackSectionTime(sectionId, duration, dishesViewed),
    trackScrollDepth: (sectionId: string, dishIndex: number, totalDishes: number) => tracker?.trackScrollDepth(sectionId, dishIndex, totalDishes),
    trackMediaError: (dishId: string, errorType: string, mediaUrl?: string) => tracker?.trackMediaError(dishId, errorType, mediaUrl),
    // Cola genérica con envío por lotes (eventos de carrito, etc.)
    track: (ev: TrackEvent) => tracker?.track(ev),
    sessionId: ctx.sessionId,
    rememberDevice: ctx.rememberDevice,
    subscribeToPush: ctx.subscribeToPush,
    unsubscribeFromPush: ctx.unsubscribeFromPush,
    isPushEnabled: ctx.isPushEnabled,
    isPushSupported: ctx.isPushSupported,
    isIOS: ctx.isIOS,
    pushPending: ctx.pushPending,
    clearPushPending: ctx.clearPushPending,
    showIOSPrompt: ctx.showIOSPrompt,
    setShowIOSPrompt: ctx.setShowIOSPrompt,
  }), [tracker, ctx]);
}
