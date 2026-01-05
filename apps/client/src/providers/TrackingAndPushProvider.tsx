// src/providers/TrackingAndPushProvider.tsx - VERSIÓN COMPLETA CON SECCIONES

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { IOSInstallPrompt } from '../components/IOSInstallPrompt';
import RestaurantContext from '../contexts/RestaurantContext';
import { Modal, Box, Typography, Button, IconButton } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';

// INTERNAL COMPONENT: Soft Prompt
function PushSoftPrompt({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: 400,
        bgcolor: 'background.paper',
        borderRadius: 4,
        boxShadow: 24,
        p: 3,
        textAlign: 'center',
        outline: 'none'
      }}>
        <Box display="flex" justifyContent="flex-end">
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2
        }}>
          <NotificationsActiveIcon fontSize="large" />
        </Box>

        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
          🎁 No te pierdas ningún regalo
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          Activa las notificaciones para saber cuándo ganaste premios y recibir ofertas exclusivas.
        </Typography>

        <Box mt={3} display="flex" flexDirection="column" gap={1.5}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={onConfirm}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontSize: '1rem',
              py: 1.5,
              fontWeight: 'bold',
              boxShadow: '0 4px 14px 0 rgba(0,0,0,0.2)'
            }}
          >
            Activar y Ver Oferta
          </Button>

          <Button
            variant="text"
            size="medium"
            fullWidth
            onClick={onClose}
            sx={{
              textTransform: 'none',
              color: 'text.secondary'
            }}
          >
            Solo Ver Oferta
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

interface TrackEvent {
  type: string;
  entityId?: string;
  entityType?: string;
  value?: any;
  props?: Record<string, any>;
  ts?: string;
  sectionId?: string;
}

interface TrackerApi {
  viewDish(dishId: string, sectionId?: string): void;
  favoriteDish(dishId: string, set?: boolean): void;
  rateDish(dishId: string, rating: number, comment?: string): void;
  shareDish(dishId: string, where: string): void;
  track(ev: TrackEvent): void;
  flush(immediate?: boolean): Promise<void>;
  isReady(): boolean;
  setCurrentSection(sectionId: string | null): void;
  viewSection(sectionId: string): void;
  trackDishViewDuration(dishId: string, duration: number, sectionId?: string): void;
  trackSectionTime(sectionId: string, duration: number, dishesViewed: number): void;
  trackScrollDepth(sectionId: string, dishIndex: number, totalDishes: number): void;
  trackMediaError(dishId: string, errorType: string, mediaUrl?: string): void;
  isFavorited(dishId: string): boolean;
}

interface TrackingContext {
  sessionId: string | null;
  startedAt: number | null;
  tracker: TrackerApi | null;
  isInitialized: boolean;
  revokeConsent: () => void;
  // Push Notifications
  isPushSupported: boolean;
  isPushEnabled: boolean;
  isIOS: boolean;
  showIOSPrompt: boolean;
  setShowIOSPrompt: (show: boolean) => void;
  subscribeToPush: () => Promise<'success' | 'denied' | 'error' | 'unsupported' | 'ios_prompt'>;
  triggerPushPrompt: (onSuccess?: () => void) => Promise<void>;
}



const VISITOR_KEY = 'vt_visitor_id';
const CONSENT_KEY = 'vt_consent_analytics';
const VISITOR_TTL = 365 * 24 * 60 * 60 * 1000; // 12 months

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Persistent Data Helpers
function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null;

  // 1. Check explicit consent
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent !== 'true') return null;

  // 2. Read ID
  const itemStr = localStorage.getItem(VISITOR_KEY);
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    // 3. Check TTL
    if (Date.now() > item.expiry) {
      localStorage.removeItem(VISITOR_KEY);
      return null;
    }
    return item.value;
  } catch {
    return null;
  }
}

function setVisitorId(id: string) {
  if (typeof window === 'undefined') return;
  const item = {
    value: id,
    expiry: Date.now() + VISITOR_TTL
  };
  localStorage.setItem(VISITOR_KEY, JSON.stringify(item));
}

function revokeConsentHelper() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(VISITOR_KEY);
  localStorage.setItem(CONSENT_KEY, 'false');
  window.location.reload();
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
  revokeConsent: () => { },
  isPushSupported: false,
  isPushEnabled: false,
  isIOS: false,
  showIOSPrompt: false,
  setShowIOSPrompt: () => { },
  subscribeToPush: async () => 'unsupported',
  triggerPushPrompt: async () => { },
});

export const useTracking = () => useContext(TrackingCtx);

// Optimized Tracker
class OptimizedTracker implements TrackerApi {
  private restaurantId: string;
  private sessionId: string | null = null;
  private currentSectionId: string | null = null;
  private queue: TrackEvent[] = [];
  private viewedDishes = new Set<string>();
  private viewedSections = new Set<string>();
  private favorites = new Map<string, boolean>();
  private ratings = new Set<string>();
  private timer: number | null = null;
  private isProcessing = false;
  private retryCount = 0;
  private isDestroyed = false;
  private sectionScrollDepth = new Map<string, number>();

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
    console.log('🎯 [Tracker] Inicializado para:', restaurantId);
  }

  setSession(sessionId: string | null) {
    if (this.isDestroyed) return;
    this.sessionId = sessionId;
    console.log('🔄 [Tracker] Session:', sessionId);
    if (sessionId) {
      // ✅ FIX: Restore any events saved from previous failed sends
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

  viewSection(sectionId: string): void {
    if (!this.isReady() || this.viewedSections.has(sectionId)) return;
    this.viewedSections.add(sectionId);
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

  viewDish(dishId: string, sectionId?: string): void {
    if (!this.isReady() || this.viewedDishes.has(dishId)) return;
    this.viewedDishes.add(dishId);
    const finalSectionId = sectionId || this.currentSectionId;
    this.track({
      type: 'viewdish',
      entityId: dishId,
      entityType: 'dish',
      sectionId: finalSectionId || undefined
    });
  }

  favoriteDish(dishId: string, set: boolean = true): void {
    if (!this.isReady()) return;
    const currentState = this.favorites.get(dishId);
    if (currentState === set) return;
    this.favorites.set(dishId, set);
    this.track({
      type: 'favorite',
      entityId: dishId,
      entityType: 'dish',
      value: set,
      sectionId: this.currentSectionId || undefined
    });
  }

  isFavorited(dishId: string): boolean {
    return this.favorites.get(dishId) === true;
  }

  rateDish(dishId: string, rating: number, comment?: string): void {
    if (!this.isReady() || rating < 1 || rating > 5) return;
    const ratingKey = `${dishId}_${rating}`;
    if (this.ratings.has(ratingKey)) return;
    this.ratings.add(ratingKey);
    this.track({
      type: 'rating',
      entityId: dishId,
      entityType: 'dish',
      value: { rating, comment: comment || null },
      sectionId: this.currentSectionId || undefined
    });
  }

  shareDish(dishId: string, where: string): void {
    if (!this.isReady()) return;
    this.track({
      type: 'share',
      entityId: dishId,
      entityType: 'dish',
      value: where,
      sectionId: this.currentSectionId || undefined
    });
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
      props: { duration_seconds: duration }
    });
  }

  trackSectionTime(sectionId: string, duration: number, dishesViewed: number): void {
    if (!this.isReady() || duration < 1) return;
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
      props: {
        dish_index: dishIndex,
        total_dishes: totalDishes,
        depth_percent: depthPercent
      }
    });
  }

  trackMediaError(dishId: string, errorType: string, mediaUrl?: string): void {
    if (!this.isReady()) return;
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
      sectionId: ev.sectionId || this.currentSectionId || undefined
    };
    this.queue.push(event);

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

    const payload = {
      sessionId: this.sessionId!,
      restaurantId: this.restaurantId,
      events
    };

    try {
      if (immediate && typeof navigator.sendBeacon === 'function') {
        await apiClient.tracking.sendEventsBeacon(payload);
      } else {
        await apiClient.tracking.sendEvents(payload);
      }
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

  cleanup(): void {
    console.log('🧹 [Tracker] Iniciando cleanup');
    this.isDestroyed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length > 0 && this.sessionId) {
      const payload = {
        sessionId: this.sessionId,
        restaurantId: this.restaurantId,
        events: [...this.queue]
      };
      if (navigator.sendBeacon) {
        // ✅ FIX: sendBeacon returns false on failure, doesn't throw
        const sent = navigator.sendBeacon(
          `${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/track/events`,
          new Blob([JSON.stringify(payload)], { type: 'application/json' })
        );
        if (!sent) {
          console.warn('⚠️ [Tracker] sendBeacon failed, saving to offline queue');
          this.saveToOfflineQueue(this.queue);
        }
      } else {
        // No sendBeacon available, save to offline queue
        this.saveToOfflineQueue(this.queue);
      }
    }

    this.viewedDishes.clear();
    this.viewedSections.clear();
    this.favorites.clear();
    this.ratings.clear();
    this.queue = [];
    this.currentSectionId = null;
    this.sectionScrollDepth.clear();
  }

  // ✅ FIX: Offline queue for failed sendBeacon
  private saveToOfflineQueue(events: TrackEvent[]): void {
    try {
      const key = 'vt_offline_events';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const toSave = [...existing, ...events].slice(-100); // Keep last 100
      localStorage.setItem(key, JSON.stringify(toSave));
      console.log('📦 [Tracker] Saved', events.length, 'events to offline queue');
    } catch (e) {
      console.warn('⚠️ [Tracker] Failed to save offline queue:', e);
    }
  }

  restoreOfflineQueue(): void {
    try {
      const key = 'vt_offline_events';
      const saved = localStorage.getItem(key);
      if (saved) {
        const events = JSON.parse(saved);
        if (events.length > 0) {
          this.queue.unshift(...events);
          localStorage.removeItem(key);
          console.log('📦 [Tracker] Restored', events.length, 'events from offline queue');
        }
      }
    } catch (e) {
      console.warn('⚠️ [Tracker] Failed to restore offline queue:', e);
    }
  }
}

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

async function startTrackingSession(restaurantId: string): Promise<{ sessionId: string | null; visitorId: string | null }> {
  const env = detectEnvironment();
  const existingVisitorId = getVisitorId();

  console.log('🚀 [Session] Iniciando sesión para:', restaurantId, 'Visitor:', existingVisitorId || 'Nuevo/Anónimo');

  try {
    const response = await apiClient.tracking.startSession({
      restaurantId,
      ...env,
      visitorId: existingVisitorId || undefined
    });

    if (response?.success && response?.sessionId) {
      console.log('✅ [Session] Sesión iniciada:', response.sessionId);

      if (response.visitorId) {
        setVisitorId(response.visitorId);
      }
      return { sessionId: response.sessionId, visitorId: response.visitorId };
    } else {
      console.error('❌ [Session] Respuesta inválida:', response);
      return { sessionId: null, visitorId: null };
    }
  } catch (error) {
    console.error('❌ [Session] Error iniciando sesión:', error);
    return { sessionId: null, visitorId: null };
  }
}



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

  const trackerInstance = useMemo(() => {
    return new OptimizedTracker(restaurantId);
  }, [restaurantId]);

  useEffect(() => {
    if (initializingRef.current || !restaurantId) return;

    let isMounted = true;
    initializingRef.current = true;

    const initialize = async () => {
      console.log('🎬 [Provider] Inicializando tracking...');
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!isMounted) return;

        const { sessionId: sid } = await startTrackingSession(restaurantId);

        if (!isMounted) return;

        if (sid) {
          setSessionId(sid);
          startedAtRef.current = Date.now();
          trackerInstance.setSession(sid);
          setTracker(trackerInstance);

          if (typeof window !== 'undefined') {
            (window as any).vtTracker = {
              sessionId: sid,
              restaurantId,
              tracker: trackerInstance
            };
          }
        }
      } catch (error) {
        console.error('❌ [Provider] Error en inicialización:', error);
      } finally {
        if (isMounted) setIsInitialized(true);
      }
    };

    initialize();
    return () => { isMounted = false; };
  }, [restaurantId, trackerInstance]);

  // ✅ Listen for consent updates (from Splash or Settings)
  useEffect(() => {
    const handleConsentUpdate = () => {
      console.log('🔔 [Provider] Consentimiento actualizado, re-verificando...');
      // Trigger initialization if not already initialized
      if (!sessionId && !initializingRef.current) {
        initializingRef.current = true; // Prevent double init
        startTrackingSession(restaurantId).then(({ sessionId: sid }) => {
          if (sid) {
            setSessionId(sid);
            startedAtRef.current = Date.now();
            trackerInstance.setSession(sid);
            setTracker(trackerInstance);
            setIsInitialized(true);
          }
          initializingRef.current = false;
        });
      }
    };

    window.addEventListener('vt-consent-update', handleConsentUpdate);
    return () => window.removeEventListener('vt-consent-update', handleConsentUpdate);
  }, [restaurantId, trackerInstance, sessionId]);

  // ✅ HEARTBEAT SYSTEM: Ensures accurate session duration even on abrupt tab close
  useEffect(() => {
    if (!sessionId || !tracker || !startedAtRef.current) return;

    let sessionEndSent = false;
    let heartbeatInterval: number | null = null;
    const HEARTBEAT_INTERVAL = 30000; // 30 seconds

    // Send heartbeat event to update session duration on backend
    const sendHeartbeat = () => {
      if (sessionEndSent || !tracker) return;

      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - (startedAtRef.current || now.getTime())) / 1000);

      tracker.track({
        type: 'heartbeat',
        value: durationSeconds,
        ts: now.toISOString()
      });
    };

    // Start heartbeat interval when page is visible
    const startHeartbeat = () => {
      if (heartbeatInterval) return;
      heartbeatInterval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    };

    // Stop heartbeat interval
    const stopHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    // Called on true page close (beforeunload/pagehide)
    const handlePageClose = () => {
      if (sessionEndSent || !tracker || !sessionId || !startedAtRef.current) return;
      sessionEndSent = true;
      stopHeartbeat();

      // Flush remaining events
      tracker.cleanup();

      // Send session end
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
    };

    // Called on visibility change (tab switch, etc)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && tracker && !sessionEndSent) {
        // ✅ Send final heartbeat before going hidden - CRITICAL for mobile
        sendHeartbeat();
        // Flush events immediately
        tracker.flush(true).catch(() => { });
        stopHeartbeat();
        console.log('🔄 [Provider] Tab hidden - sent heartbeat, flushed events');
      } else if (document.visibilityState === 'visible' && !sessionEndSent) {
        // Resume heartbeats when page becomes visible again
        startHeartbeat();
      }
    };

    // Send initial heartbeat and start interval
    sendHeartbeat();
    startHeartbeat();

    window.addEventListener('beforeunload', handlePageClose);
    window.addEventListener('pagehide', handlePageClose);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopHeartbeat();
      window.removeEventListener('beforeunload', handlePageClose);
      window.removeEventListener('pagehide', handlePageClose);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sessionId, tracker]);

  // ============================================
  // PUSH NOTIFICATIONS LOGIC
  // ============================================
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showSoftPrompt, setShowSoftPrompt] = useState(false);
  const [softPromptCallback, setSoftPromptCallback] = useState<(() => void) | undefined>();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsPushSupported(true);

      // Check if already subscribed
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          setIsPushEnabled(!!subscription);
        });
      });

      // iOS Detection
      const ua = navigator.userAgent;
      const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
      setIsIOS(isIosDevice);
    }
  }, []);

  const subscribeToPush = async (): Promise<'success' | 'denied' | 'error' | 'unsupported' | 'ios_prompt'> => {
    console.log('🔔 [Push] subscribeToPush triggered');
    if (!isPushSupported) {
      console.warn('🔔 [Push] Not supported');
      return 'unsupported';
    }

    // iOS Smart Onboarding
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isIOS && !isStandalone) {
      console.log('🔔 [Push] iOS Browser detected -> Show Prompt');
      setShowIOSPrompt(true);
      return 'ios_prompt';
    }

    try {
      console.log('🔔 [Push] Requesting Permission...');
      const permission = await Notification.requestPermission();
      console.log('🔔 [Push] Permission result:', permission);

      if (permission !== 'granted') {
        console.warn('🔔 [Push] Permission denied or dismissed');
        return 'denied';
      }

      // VAPID Key (Should be env var, using public key generated earlier)
      const VAPID_PUBLIC_KEY = 'BB34mfUFVy5s-Cnbtu7dB_OhXAx06GRlKKruLbJIbnTefFd0ECHqtcJP4x6r6MN-A3nr4Yl57wZ7iRm16SnSoQw';

      let registration;
      try {
        console.log('🔔 [Push] Registering SW...');
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('🔔 [Push] SW Registered:', registration);
      } catch (swError) {
        console.error('🔔 [Push] SW Registration Error:', swError);
        alert('Debug Error: Service Worker registration failed - ' + (swError instanceof Error ? swError.message : String(swError)));
        return 'error';
      }

      try {
        console.log('🔔 [Push] Waiting for SW ready...');
        await navigator.serviceWorker.ready;
        console.log('🔔 [Push] SW Ready. Subscribing using VAPID...');
      } catch (readyError) {
        console.error('🔔 [Push] SW Ready Error:', readyError);
        alert('Debug Error: Service Worker not ready - ' + (readyError instanceof Error ? readyError.message : String(readyError)));
        return 'error';
      }

      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        console.log('🔔 [Push] Subscription object created:', subscription);
      } catch (subError) {
        console.error('🔔 [Push] Push Subscription Error:', subError);
        alert('Debug Error: Push subscription failed - ' + (subError instanceof Error ? subError.message : String(subError)) + '\n\nThis usually means:\n1. Push service unavailable\n2. VAPID key issue\n3. Network issue');
        return 'error';
      }

      // Send to Backend
      const env = detectEnvironment();
      const visitorId = getVisitorId();

      try {
        console.log('🔔 [Push] Sending to backend...');
        await fetch(`${import.meta.env.VITE_API_URL || 'https://visualtasteworker.franciscotortosaestudios.workers.dev'}/api/notifications/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription,
            restaurant_id: restaurantId,
            visitor_id: visitorId,
            device_type: env.devicetype
          })
        });
        console.log('🔔 [Push] Backend registration success');
      } catch (backendError) {
        console.error('🔔 [Push] Backend registration error:', backendError);
        // Still mark as enabled since the subscription was created
        console.log('🔔 [Push] Subscription created but backend sync failed');
      }

      setIsPushEnabled(true);
      return 'success';
    } catch (error) {
      console.error('🔔 [Push] CRITICAL ERROR:', error);
      alert('Debug Error: ' + (error instanceof Error ? error.message : JSON.stringify(error)));
      return 'error';
    }
  };

  // Safe access to restaurant context
  const restaurantContext = useContext(RestaurantContext);
  const restaurantFeatures = restaurantContext?.restaurant?.features || {};

  const triggerPushPrompt = async (onSuccess?: () => void) => {
    // 1. Check Global Setting
    if (restaurantFeatures.push_notifications_enabled === false) {
      if (onSuccess) onSuccess();
      return;
    }

    // 2. Check if already supported and not subscribed
    if (!isPushSupported) {
      if (onSuccess) onSuccess();
      return;
    }

    if (isPushEnabled) {
      // Already subscribed
      if (onSuccess) onSuccess();
      return;
    }

    // 3. Show Soft Prompt
    setSoftPromptCallback(() => onSuccess);
    setShowSoftPrompt(true);
  };

  const handleSoftPromptConfirm = async () => {
    // Keep dialog open or show loading? For now, close it to show alerts.
    setShowSoftPrompt(false);

    // Trigger Native Request
    const result = await subscribeToPush();

    if (result === 'success') {
      alert('✅ Notificaciones activadas. ¡Gracias!');
      // Proceed
      if (softPromptCallback) softPromptCallback();
    } else if (result === 'denied') {
      alert('❌ Has bloqueado las notificaciones. Actívalas en la configuración para recibir regalos.');
      // Still proceed to offer? Maybe, or maybe not. User said "ya no se volvera a activar" (this was for rating).
      // Proceed anyway to let them see the offer content?
      if (softPromptCallback) softPromptCallback();
    } else if (result === 'error') {
      alert('❌ Ocurrió un error. Inténtalo de nuevo.');
    } else if (result === 'ios_prompt') {
      // Handled by IOSPrompt component state
    }
  };

  const handleSoftPromptClose = () => {
    setShowSoftPrompt(false);
    if (softPromptCallback) softPromptCallback();
  };

  const contextValue = useMemo<TrackingContext>(() => ({
    sessionId,
    startedAt: startedAtRef.current,
    tracker,
    isInitialized,
    revokeConsent: revokeConsentHelper,
    isPushSupported,
    isPushEnabled,
    isIOS,
    showIOSPrompt,
    setShowIOSPrompt,
    subscribeToPush,
    triggerPushPrompt
  }), [sessionId, tracker, isInitialized, isPushSupported, isPushEnabled, isIOS, showIOSPrompt]);

  return (
    <TrackingCtx.Provider value={contextValue}>
      {children}
      <IOSInstallPrompt />
      <PushSoftPrompt
        open={showSoftPrompt}
        onClose={handleSoftPromptClose}
        onConfirm={handleSoftPromptConfirm}
      />
    </TrackingCtx.Provider>
  );
}

export function useDishTracking() {
  const { tracker, revokeConsent, subscribeToPush, triggerPushPrompt, isPushEnabled, showIOSPrompt, setShowIOSPrompt, isIOS, isPushSupported } = useTracking();

  return useMemo(() => ({
    viewDish: (dishId: string, sectionId?: string) => tracker?.viewDish(dishId, sectionId),
    favoriteDish: (dishId: string, set: boolean = true) => tracker?.favoriteDish(dishId, set),
    isFavorited: (dishId: string) => tracker?.isFavorited(dishId) ?? false,
    rateDish: (dishId: string, rating: number, comment?: string) => tracker?.rateDish(dishId, rating, comment),
    shareDish: (dishId: string, platform: string) => tracker?.shareDish(dishId, platform),
    setCurrentSection: (sectionId: string | null) => tracker?.setCurrentSection(sectionId),
    viewSection: (sectionId: string) => tracker?.viewSection(sectionId),
    trackDishViewDuration: (dishId: string, duration: number, sectionId?: string) => tracker?.trackDishViewDuration(dishId, duration, sectionId),
    trackSectionTime: (sectionId: string, duration: number, dishesViewed: number) => tracker?.trackSectionTime(sectionId, duration, dishesViewed),
    trackScrollDepth: (sectionId: string, dishIndex: number, totalDishes: number) => tracker?.trackScrollDepth(sectionId, dishIndex, totalDishes),
    trackMediaError: (dishId: string, errorType: string, mediaUrl?: string) => tracker?.trackMediaError(dishId, errorType, mediaUrl),
    isReady: () => tracker?.isReady() ?? false,
    revokeConsent,
    subscribeToPush,
    triggerPushPrompt,
    isPushEnabled,
    showIOSPrompt,
    setShowIOSPrompt,
    isIOS,
    isPushSupported
  }), [tracker, revokeConsent, subscribeToPush, triggerPushPrompt, isPushEnabled, showIOSPrompt, setShowIOSPrompt, isIOS, isPushSupported]);
}
