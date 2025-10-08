export interface TrackingEvent {
  type: 'viewdish' | 'favorite' | 'rating' | 'share' | string;
  entityId?: string;
  entityType?: string;
  value?: any;
  ts?: string;
}

export interface SessionOptions {
  userid?: string;
  devicetype?: string;
  osname?: string;
  browser?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  networktype?: string;
  ispwa?: boolean;
  languages?: string[];
  timezone?: string;
}

export class Tracker {
  private baseURL: string;
  private restaurantId: string;
  private sessionId: string | null = null;
  private startTime: number = 0;
  private eventQueue: TrackingEvent[] = [];
  private viewedDishes = new Set<string>();
  private flushTimer: any = null;

  constructor(baseURL: string, restaurantId: string) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.restaurantId = restaurantId;
  }

  private async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      keepalive: true,
    });
    return response.json();
  }

// tracking.ts (método sendBeacon)
private async sendBeacon(endpoint: string, data: any): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    return navigator.sendBeacon(`${this.baseURL}${endpoint}`, blob);
  }
  try { await this.post(endpoint, data); return true; } catch { return false; }
}


  private detectEnvironment(): Partial<SessionOptions> {
    if (typeof navigator === 'undefined') return {};

    const connection = (navigator as any).connection;
    const userAgent = navigator.userAgent;
    
    return {
      devicetype: /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop',
      browser: this.getBrowserName(userAgent),
      networktype: connection?.effectiveType || null,
      ispwa: window.matchMedia?.('(display-mode: standalone)')?.matches || false,
      languages: [navigator.language],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  async startSession(options: SessionOptions = {}): Promise<any> {
    const envData = this.detectEnvironment();
    const sessionData = {
      restaurantId: this.restaurantId,
      referrer: document?.referrer || null,
      ...envData,
      ...options,
    };

    try {
      const result = await this.post('/track/session/start', sessionData);
      if (result.success) {
        this.sessionId = result.sessionId;
        this.startTime = Date.now();
        this.setupSessionEndHandlers();
        this.scheduleFlush();
      }
      return result;
    } catch (error) {
      console.error('Failed to start tracking session:', error);
      return { success: false, error };
    }
  }

  private setupSessionEndHandlers(): void {
    const endSession = () => {
      this.endSession().catch(() => {});
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', endSession);
      window.addEventListener('pagehide', endSession);
      
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          endSession();
        }
      });
    }
  }

  async endSession(): Promise<void> {
    if (!this.sessionId) return;

    // Flush pending events first
    await this.flush(true);

    const sessionData = {
      sessionId: this.sessionId,
      startedAt: new Date(this.startTime).toISOString(),
      endedAt: new Date().toISOString(),
    };

    // Try beacon first, fallback to fetch
    const beaconSent = await this.sendBeacon('/track/session/end', sessionData);
    
    if (!beaconSent) {
      try {
        await this.post('/track/session/end', sessionData);
      } catch (error) {
        console.error('Failed to end session:', error);
      }
    }

    this.cleanup();
  }

  private cleanup(): void {
    this.sessionId = null;
    this.startTime = 0;
    this.eventQueue = [];
    this.viewedDishes.clear();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  track(event: TrackingEvent): void {
    if (!this.sessionId) return;

    // Deduplicar viewdish por sesión
    if (event.type === 'viewdish' && event.entityId) {
      if (this.viewedDishes.has(event.entityId)) return;
      this.viewedDishes.add(event.entityId);
    }

    const trackingEvent: TrackingEvent = {
      ...event,
      ts: event.ts || new Date().toISOString(),
    };

    this.eventQueue.push(trackingEvent);

    // Auto-flush si tenemos muchos eventos
    if (this.eventQueue.length >= 20) {
      this.flush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flush();
    }, 5000); // Flush cada 5 segundos
  }

  async flush(immediate = false): Promise<void> {
    if (!this.sessionId || this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    const data = {
      sessionId: this.sessionId,
      restaurantId: this.restaurantId,
      events,
    };

    try {
      if (immediate) {
        // Usar beacon para flushes inmediatos (ej: al cerrar)
        const beaconSent = await this.sendBeacon('/track/events', data);
        if (!beaconSent) {
          await this.post('/track/events', data);
        }
      } else {
        await this.post('/track/events', data);
      }
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Re-agregar eventos a la cola en caso de error
      this.eventQueue.unshift(...events);
    }

    if (!immediate) {
      this.scheduleFlush();
    }
  }

  // Métodos de conveniencia
  viewDish(dishId: string): void {
    this.track({
      type: 'viewdish',
      entityId: dishId,
      entityType: 'dish',
    });
  }

  favoriteDish(dishId: string): void {
    this.track({
      type: 'favorite',
      entityId: dishId,
      entityType: 'dish',
    });
  }

  rateDish(dishId: string, rating: number, comment?: string): void {
    this.track({
      type: 'rating',
      entityId: dishId,
      entityType: 'dish',
      value: { rating, comment },
    });
  }

  shareDish(dishId: string, platform: string): void {
    this.track({
      type: 'share',
      entityId: dishId,
      entityType: 'dish',
      value: { platform },
    });
  }
}
