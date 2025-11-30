// src/providers/TrackingAndPushProvider.tsx - VERSIÓN COMPLETA CON SECCIONES

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

interface TrackEvent {
  type: string;
  entityId?: string;
  entityType?: string;
  value?: any;
  props?: Record<string, any>;
  ts?: string;
  sectionId?: string;  // ✅ NUEVO: soporte para sectionId
}

interface TrackerApi {
  viewDish(dishId: string, sectionId?: string): void;  // ✅ NUEVO: sectionId opcional
  favoriteDish(dishId: string, set?: boolean): void;
  rateDish(dishId: string, rating: number, comment?: string): void;
  shareDish(dishId: string, where: string): void;
  track(ev: TrackEvent): void;
  flush(immediate?: boolean): Promise<void>;
  isReady(): boolean;
  setCurrentSection(sectionId: string | null): void;  // ✅ NUEVO: método para establecer sección actual
  viewSection(sectionId: string): void;  // ✅ NUEVO: método para trackear vista de sección
  // ✅ NUEVOS MÉTODOS DE ENGAGEMENT
  trackDishViewDuration(dishId: string, duration: number, sectionId?: string): void;
  trackSectionTime(sectionId: string, duration: number, dishesViewed: number): void;
  trackScrollDepth(sectionId: string, dishIndex: number, totalDishes: number): void;
  trackMediaError(dishId: string, errorType: string, mediaUrl?: string): void;
}

interface TrackingContext {
  sessionId: string | null;
  startedAt: number | null;
  tracker: TrackerApi | null;
  isInitialized: boolean;
}

const BATCH_SIZE = 8;
const FLUSH_INTERVAL = 3000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1500;

const TrackingCtx = createContext<TrackingContext>({
  sessionId: null,
  startedAt: null,
  tracker: null,
  isInitialized: false,
});

export const useTracking = () => useContext(TrackingCtx);

// ✅ TRACKER OPTIMIZADO con soporte completo para sectionId
class OptimizedTracker implements TrackerApi {
  private restaurantId: string;
  private sessionId: string | null = null;
  private currentSectionId: string | null = null;  // ✅ NUEVO: sección actual
  private queue: TrackEvent[] = [];
  private viewedDishes = new Set<string>();
  private viewedSections = new Set<string>();  // ✅ NUEVO: secciones ya vistas
  private favorites = new Map<string, boolean>();
  private ratings = new Set<string>();
  private timer: number | null = null;
  private isProcessing = false;
  private retryCount = 0;
  private isDestroyed = false;
  // ✅ TRACKING DE ENGAGEMENT
  private sectionScrollDepth = new Map<string, number>();  // sectionId -> max dish index viewed

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
    console.log('🎯 [Tracker] Inicializado para:', restaurantId);
  }

  setSession(sessionId: string | null) {
    if (this.isDestroyed) return;

    this.sessionId = sessionId;
    console.log('🔄 [Tracker] Session:', sessionId);

    if (sessionId) {
      this.scheduleFlush();
    }
  }

  // ✅ NUEVO: Establecer sección actual y trackear automáticamente
  setCurrentSection(sectionId: string | null) {
    if (this.isDestroyed) return;

    // Si es una nueva sección, trackear la vista
    if (sectionId && sectionId !== this.currentSectionId && !this.viewedSections.has(sectionId)) {
      this.viewSection(sectionId);
    }

    this.currentSectionId = sectionId;
    console.log('📂 [Tracker] Sección actual:', sectionId);
  }

  // ✅ NUEVO: Trackear vista de sección
  viewSection(sectionId: string): void {
    if (!this.isReady() || this.viewedSections.has(sectionId)) return;

    this.viewedSections.add(sectionId);
    console.log('👁️ [Tracker] Vista de sección registrada:', sectionId);

    this.track({
      type: 'view_section',
      entityId: sectionId,
      entityType: 'section'
    });
  }

  isReady(): boolean {
    return !this.isDestroyed && !!(this.sessionId && this.restaurantId);
  }

  private scheduleFlush() {
    if (this.isDestroyed || this.timer) return;

    this.timer = window.setTimeout(() => {
      if (!this.isDestroyed) {
        this.flush().catch(error => {
          console.warn('⚠️ [Tracker] Error flush programado:', error);
        });
      }
    }, FLUSH_INTERVAL);
  }

  // ✅ MODIFICADO: viewDish con sectionId opcional
  viewDish(dishId: string, sectionId?: string): void {
    if (!this.isReady() || this.viewedDishes.has(dishId)) return;

    this.viewedDishes.add(dishId);
    const finalSectionId = sectionId || this.currentSectionId;

    console.log('👁️ [Tracker] Vista registrada:', {
      dishId,
      sectionId: finalSectionId
    });

    this.track({
      type: 'viewdish',
      entityId: dishId,
      entityType: 'dish',
      sectionId: finalSectionId || undefined  // ✅ INCLUIR sectionId
    });
  }

  favoriteDish(dishId: string, set: boolean = true): void {
    if (!this.isReady()) return;

    const currentState = this.favorites.get(dishId);
    if (currentState === set) {
      console.debug('❤️ [Tracker] Estado favorito sin cambios:', { dishId, set });
      return;
    }

    this.favorites.set(dishId, set);
    console.log('❤️ [Tracker] Favorito actualizado:', { dishId, set });

    this.track({
      type: 'favorite',
      entityId: dishId,
      entityType: 'dish',
      value: set,
      sectionId: this.currentSectionId || undefined  // ✅ INCLUIR sectionId
    });
  }

  rateDish(dishId: string, rating: number, comment?: string): void {
    if (!this.isReady() || rating < 1 || rating > 5) return;

    const ratingKey = `${dishId}_${rating}`;
    if (this.ratings.has(ratingKey)) {
      console.debug('⭐ [Tracker] Rating ya enviado:', { dishId, rating });
      return;
    }

    this.ratings.add(ratingKey);
    console.log('⭐ [Tracker] Rating registrado:', { dishId, rating, comment });

    this.track({
      type: 'rating',
      entityId: dishId,
      entityType: 'dish',
      value: { rating, comment: comment || null },
      sectionId: this.currentSectionId || undefined  // ✅ INCLUIR sectionId
    });
  }

  shareDish(dishId: string, where: string): void {
    if (!this.isReady()) return;

    console.log('📤 [Tracker] Compartir registrado:', { dishId, where });

    this.track({
      type: 'share',
      entityId: dishId,
      entityType: 'dish',
      value: where,
      sectionId: this.currentSectionId || undefined  // ✅ INCLUIR sectionId
    });
  }

  // ✅ NUEVO: Trackear duración de visualización de plato
  trackDishViewDuration(dishId: string, duration: number, sectionId?: string): void {
    if (!this.isReady() || duration < 1) return;

    const finalSectionId = sectionId || this.currentSectionId;

    console.log('⏱️ [Tracker] Duración de vista:', {
      dishId,
      duration: `${duration}s`,
      sectionId: finalSectionId
    });

    this.track({
      type: 'dish_view_duration',
      entityId: dishId,
      entityType: 'dish',
      value: duration,
      sectionId: finalSectionId || undefined,
      props: { duration_seconds: duration }
    });
  }

  // ✅ NUEVO: Trackear tiempo en sección
  trackSectionTime(sectionId: string, duration: number, dishesViewed: number): void {
    if (!this.isReady() || duration < 1) return;

    console.log('⏱️ [Tracker] Tiempo en sección:', {
      sectionId,
      duration: `${duration}s`,
      dishesViewed
    });

    this.track({
      type: 'section_time',
      entityId: sectionId,
      entityType: 'section',
      value: duration,
      props: {
        duration_seconds: duration,
        dishes_viewed: dishesViewed
      }
    });
  }

  // ✅ NUEVO: Trackear scroll depth (profundidad de scroll en sección)
  trackScrollDepth(sectionId: string, dishIndex: number, totalDishes: number): void {
    if (!this.isReady()) return;

    const currentMax = this.sectionScrollDepth.get(sectionId) || 0;

    // Solo trackear si llegó más lejos que antes
    if (dishIndex <= currentMax) return;

    this.sectionScrollDepth.set(sectionId, dishIndex);
    const depthPercent = Math.round((dishIndex / totalDishes) * 100);

    console.log('📊 [Tracker] Scroll depth:', {
      sectionId,
      dishIndex,
      totalDishes,
      depth: `${depthPercent}%`
    });

    this.track({
      type: 'scroll_depth',
      entityId: sectionId,
      entityType: 'section',
      value: depthPercent,
      props: {
        dish_index: dishIndex,
        total_dishes: totalDishes,
        depth_percent: depthPercent
      }
    });
  }

  // ✅ NUEVO: Trackear errores de carga de media
  trackMediaError(dishId: string, errorType: string, mediaUrl?: string): void {
    if (!this.isReady()) return;

    console.log('❌ [Tracker] Error de media:', {
      dishId,
      errorType,
      mediaUrl
    });

    this.track({
      type: 'media_error',
      entityId: dishId,
      entityType: 'dish',
      value: errorType,
      props: {
        error_type: errorType,
        media_url: mediaUrl || null,
        section_id: this.currentSectionId
      }
    });
  }

  track(ev: TrackEvent): void {
    if (!this.isReady() || this.isDestroyed) return;

    const event: TrackEvent = {
      ...ev,
      ts: ev.ts || new Date().toISOString(),
      sectionId: ev.sectionId || this.currentSectionId || undefined  // ✅ ASEGURAR sectionId
    };

    this.queue.push(event);

    console.debug('📝 [Tracker] Evento encolado:', {
      type: event.type,
      entityId: event.entityId,
      sectionId: event.sectionId,  // ✅ LOG sectionId
      queueLength: this.queue.length
    });

    // Flush si la cola está llena
    if (this.queue.length >= BATCH_SIZE) {
      console.log('📦 [Tracker] Cola llena, enviando inmediatamente');
      this.flush().catch(console.error);
    }
  }

  async flush(immediate = false): Promise<void> {
    if (!this.isReady() || this.queue.length === 0 || this.isProcessing || this.isDestroyed) {
      if (!immediate && !this.isDestroyed) {
        this.scheduleFlush();
      }
      return;
    }

    this.isProcessing = true;
    const events = [...this.queue];
    this.queue = [];

    const payload = {
      sessionId: this.sessionId!,
      restaurantId: this.restaurantId,
      events
    };

    console.log('🚀 [Tracker] Enviando eventos:', {
      count: events.length,
      immediate,
      sessionId: this.sessionId,
      types: events.map(e => e.type),
      withSections: events.filter(e => e.sectionId).length  // ✅ LOG eventos con sectionId
    });

    try {
      if (immediate && navigator.sendBeacon) {
        await apiClient.tracking.sendEventsBeacon(payload);
      } else {
        await apiClient.tracking.sendEvents(payload);
      }

      console.log('✅ [Tracker] Eventos enviados exitosamente');
      this.retryCount = 0;

    } catch (error) {
      console.error('❌ [Tracker] Error enviando eventos:', error);

      if (this.retryCount < MAX_RETRIES && !this.isDestroyed) {
        this.queue.unshift(...events);
        this.retryCount++;

        setTimeout(() => {
          if (!this.isDestroyed) {
            this.flush().catch(console.error);
          }
        }, RETRY_DELAY * Math.pow(2, this.retryCount - 1));

        console.log(`🔄 [Tracker] Reintento ${this.retryCount}/${MAX_RETRIES}`);
      }
    }

    this.isProcessing = false;

    if (!immediate && !this.isDestroyed) {
      this.scheduleFlush();
    }
  }

  cleanup(): void {
    console.log('🧹 [Tracker] Iniciando cleanup');
    this.isDestroyed = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // 🚨 FLUSH FINAL CRÍTICO
    if (this.queue.length > 0 && this.sessionId) {
      console.log('🚨 [Tracker] Flush final crítico con', this.queue.length, 'eventos');

      // Envío síncrono con sendBeacon
      const payload = {
        sessionId: this.sessionId,
        restaurantId: this.restaurantId,
        events: [...this.queue]
      };

      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/track/events`,
          new Blob([JSON.stringify(payload)], { type: 'application/json' })
        );

        if (success) {
          console.log('📡 [Tracker] Eventos finales enviados con sendBeacon');
        } else {
          console.error('❌ [Tracker] sendBeacon falló');
        }
      }
    }

    this.viewedDishes.clear();
    this.viewedSections.clear();  // ✅ LIMPIAR secciones vistas
    this.favorites.clear();
    this.ratings.clear();
    this.queue = [];
    this.currentSectionId = null;  // ✅ LIMPIAR sección actual
    this.sectionScrollDepth.clear();  // ✅ LIMPIAR scroll depth
  }
}

// Detectar entorno
function detectEnvironment() {
  if (typeof navigator === 'undefined') return {};

  const ua = navigator.userAgent;

  let devicetype = 'desktop';
  if (/Mobile|Android|iPhone/i.test(ua)) devicetype = 'mobile';
  else if (/iPad|Tablet/i.test(ua)) devicetype = 'tablet';

  let osname = 'Unknown';
  if (/Windows/i.test(ua)) osname = 'Windows';
  else if (/Mac OS X/i.test(ua)) osname = 'macOS';
  else if (/Linux/i.test(ua)) osname = 'Linux';
  else if (/Android/i.test(ua)) osname = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) osname = 'iOS';

  let browser = 'Unknown';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  const connection = (navigator as any).connection;
  const networktype = connection?.effectiveType ?? '4g';

  const ispwa = (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as any).standalone === true ||
    window.location.search.includes('utm_source=homescreen')
  );

  const urlParams = new URLSearchParams(window.location.search);
  const utm = {
    source: urlParams.get('utm_source') || undefined,
    medium: urlParams.get('utm_medium') || undefined,
    campaign: urlParams.get('utm_campaign') || undefined
  };

  return {
    devicetype,
    osname,
    browser,
    networktype,
    ispwa,
    languages: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    referrer: document?.referrer || undefined,
    utm,
    qrcode: urlParams.get('qrcode') || urlParams.get('qr') || undefined
  };
}

// Iniciar sesión
async function startTrackingSession(restaurantId: string): Promise<string | null> {
  const env = detectEnvironment();

  console.log('🚀 [Session] Iniciando sesión para:', restaurantId);

  try {
    const response = await apiClient.tracking.startSession({
      restaurantId,
      ...env
    });

    if (response?.success && response?.sessionId) {
      console.log('✅ [Session] Sesión iniciada:', response.sessionId);
      return response.sessionId;
    } else {
      console.error('❌ [Session] Respuesta inválida:', response);
      return null;
    }
  } catch (error) {
    console.error('❌ [Session] Error iniciando sesión:', error);
    return null;
  }
}

// Finalizar sesión
async function endTrackingSession(sessionId: string, startedAt: number) {
  console.log('🔚 [Session] Finalizando:', {
    sessionId,
    duration: Math.floor((Date.now() - startedAt) / 1000) + 's'
  });

  try {
    await apiClient.tracking.endSession({
      sessionId,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date().toISOString()
    });

    console.log('✅ [Session] Sesión finalizada correctamente');
  } catch (error) {
    console.error('❌ [Session] Error finalizando sesión:', error);
  }
}

// 🚨 PROVIDER CORREGIDO: Evitar desmontaje prematuro
interface Props {
  restaurantId: string;
  children: React.ReactNode;
}

export function TrackingAndPushProvider({ restaurantId, children }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tracker, setTracker] = useState<OptimizedTracker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const initializingRef = useRef(false);

  // Crear tracker una sola vez
  const trackerInstance = useMemo(() => {
    return new OptimizedTracker(restaurantId);
  }, [restaurantId]);

  // 🚨 INICIALIZACIÓN MEJORADA: Sin posibilidad de desmontaje prematuro
  useEffect(() => {
    if (initializingRef.current || !restaurantId) return;

    let isMounted = true;
    initializingRef.current = true;

    const initialize = async () => {
      console.log('🎬 [Provider] Inicializando tracking...');

      try {
        // ⏳ Pequeño delay para asegurar que el componente esté montado
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!isMounted) {
          console.log('⚠️ [Provider] Componente desmontado durante delay');
          return;
        }

        const sid = await startTrackingSession(restaurantId);

        if (!isMounted) {
          console.log('⚠️ [Provider] Componente desmontado durante inicialización');
          return;
        }

        if (sid) {
          setSessionId(sid);
          startedAtRef.current = Date.now();
          trackerInstance.setSession(sid);
          setTracker(trackerInstance);

          // Debug info
          if (typeof window !== 'undefined') {
            (window as any).vtTracker = {
              sessionId: sid,
              restaurantId,
              tracker: trackerInstance
            };
          }

          console.log('✅ [Provider] Tracking inicializado correctamente');
        } else {
          console.error('❌ [Provider] No se pudo inicializar el tracking');
        }

      } catch (error) {
        console.error('❌ [Provider] Error en inicialización:', error);
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [restaurantId, trackerInstance]);

  // 🚨 CLEANUP MEJORADO: Asegurar envío final
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🚨 [Provider] beforeunload - cleanup crítico');
      if (tracker && sessionId && startedAtRef.current) {
        tracker.cleanup();

        // Finalizar sesión con sendBeacon
        if (navigator.sendBeacon) {
          const payload = {
            sessionId,
            startedAt: new Date(startedAtRef.current).toISOString(),
            endedAt: new Date().toISOString()
          };

          navigator.sendBeacon(
            `${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/track/session/end`,
            new Blob([JSON.stringify(payload)], { type: 'application/json' })
          );
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && tracker) {
        console.log('👋 [Provider] Página oculta, flush final');
        tracker.flush(true).catch(console.error);
      }
    };

    const handlePageHide = () => {
      console.log('🚨 [Provider] pagehide - cleanup crítico');
      handleBeforeUnload();
    };

    // 🚨 LISTENERS CRÍTICOS para evitar pérdida de datos
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, tracker]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (sessionId && startedAtRef.current && tracker) {
        console.log('👋 [Provider] Cleanup en desmontaje');
        tracker.cleanup();
        endTrackingSession(sessionId, startedAtRef.current).catch(console.error);
      }
    };
  }, [sessionId, tracker]);

  const contextValue = useMemo<TrackingContext>(() => ({
    sessionId,
    startedAt: startedAtRef.current,
    tracker,
    isInitialized
  }), [sessionId, tracker, isInitialized]);

  return (
    <TrackingCtx.Provider value={contextValue}>
      {children}
    </TrackingCtx.Provider>
  );
}

// ✅ HOOK CORREGIDO con soporte completo para sectionId
export function useDishTracking() {
  const { tracker } = useTracking();

  return {
    viewDish: useCallback((dishId: string, sectionId?: string) => {
      tracker?.viewDish(dishId, sectionId);
    }, [tracker]),

    favoriteDish: useCallback((dishId: string, set: boolean = true) => {
      tracker?.favoriteDish(dishId, set);
    }, [tracker]),

    rateDish: useCallback((dishId: string, rating: number, comment?: string) => {
      tracker?.rateDish(dishId, rating, comment);
    }, [tracker]),

    shareDish: useCallback((dishId: string, platform: string) => {
      tracker?.shareDish(dishId, platform);
    }, [tracker]),

    setCurrentSection: useCallback((sectionId: string | null) => {
      tracker?.setCurrentSection(sectionId);
    }, [tracker]),  // ✅ MÉTODO para establecer sección

    viewSection: useCallback((sectionId: string) => {
      tracker?.viewSection(sectionId);
    }, [tracker]),  // ✅ NUEVO: método para trackear vista de sección manualmente

    // ✅ NUEVOS MÉTODOS DE ENGAGEMENT
    trackDishViewDuration: useCallback((dishId: string, duration: number, sectionId?: string) => {
      tracker?.trackDishViewDuration(dishId, duration, sectionId);
    }, [tracker]),

    trackSectionTime: useCallback((sectionId: string, duration: number, dishesViewed: number) => {
      tracker?.trackSectionTime(sectionId, duration, dishesViewed);
    }, [tracker]),

    trackScrollDepth: useCallback((sectionId: string, dishIndex: number, totalDishes: number) => {
      tracker?.trackScrollDepth(sectionId, dishIndex, totalDishes);
    }, [tracker]),

    trackMediaError: useCallback((dishId: string, errorType: string, mediaUrl?: string) => {
      tracker?.trackMediaError(dishId, errorType, mediaUrl);
    }, [tracker]),

    isReady: useCallback(() => {
      return tracker?.isReady() ?? false;
    }, [tracker])
  };
}
