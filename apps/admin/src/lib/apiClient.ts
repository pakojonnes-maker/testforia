// apps/admin/src/lib/apiClient.ts
//
// Cliente del panel. Envuelve el @visualtaste/api compartido (axios, con el
// token en un interceptor) y añade los endpoints propios del admin.
//
// Oct-2026: antes era un Proxy que reenviaba CUALQUIER propiedad desconocida al
// cliente base. Así TypeScript no veía errores como `apiClient.reservations`,
// que no existe y dejaba sin funcionar confirmar o editar reservas. Ahora todo
// método que usa el panel está declarado aquí, y lo que no se usaba se quitó.

import { createApiClient, type ApiClient } from "@visualtaste/api";
import type { DishMedia } from "@visualtaste/api";

// API URL desde variables de entorno o por defecto
export const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

/** Respuesta de GET /auth/google/config: si hay que pintar el botón "Entrar con Google". */
export interface GoogleLoginConfig {
  enabled: boolean;
  clientId?: string;
}

/**
 * Respuesta de POST /auth/google: sesión completa, o el ticket de MFA si la
 * cuenta tiene TOTP activo (mismo contrato que /auth/login).
 */
export interface GoogleLoginResult {
  success: boolean;
  token?: string;
  mfaRequired?: boolean;
  ticket?: string;
  user?: unknown;
}

export type ReservationStatus =
  | 'pending' | 'confirmed' | 'cancelled' | 'cancelled_restaurant' | 'cancelled_user'
  | 'no_show' | 'completed' | 'waitlist';

export interface Reservation {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: ReservationStatus | string;
  special_requests?: string | null;
  occasion?: string | null;
  admin_notes?: string | null;
  table_assignment?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
}

export interface ReservationUpdate {
  status?: string;
  date?: string;
  time?: string;
  party_size?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  special_requests?: string;
  admin_notes?: string;
  table_assignment?: string;
  cancellation_reason?: string;
}

export type DeliveryStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled';

export interface DeliverySettings {
  is_enabled: boolean;
  show_whatsapp: boolean;
  show_phone: boolean;
  custom_whatsapp: string;
  custom_phone: string;
  payment_methods: { cash: boolean; card: boolean };
  shipping_cost: number;
  free_shipping_threshold: number;
  minimum_order: number;
  delivery_hours: Record<string, Array<{ start: string; end: string }>>;
  closed_dates: string[];
}

export interface DeliveryOrder {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  customer_address: string;
  customer_notes: string | null;
  items: Array<{ dish_id?: string; name: string; quantity: number; price: number }>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  payment_method: string | null;
  status: DeliveryStatus | string;
  order_source: string;
  created_at: string;
  updated_at?: string;
}

class AdminApiClient {
  public authToken: string | null = localStorage.getItem('auth_token') || null;
  private readonly base: ApiClient;

  constructor(base: ApiClient) {
    this.base = base;
    if (this.authToken) this.base.setAuthToken(this.authToken);
  }

  /** Cliente axios con el token ya puesto, para endpoints sin método propio. */
  public get client() {
    return this.base.client;
  }

  // ============================================
  // Sesión
  // ============================================
  public setAuthToken(token: string): void {
    this.authToken = token;
    localStorage.setItem('auth_token', token);
    this.base.setAuthToken(token);
  }

  public clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem('auth_token');
    this.base.clearAuthToken();
  }

  public async login(email: string, password: string): Promise<any> {
    const response: any = await this.base.login(email, password);
    if (response?.token) this.setAuthToken(response.token);
    return response;
  }

  public getCurrentUser(): Promise<any> {
    return this.base.getCurrentUser();
  }

  public async logoutOnServer(): Promise<void> {
    try {
      await this.client.post(`/auth/logout`);
    } catch (error) {
      // El logout local (borrar el token) no debe bloquearse porque el
      // servidor no responda — igualmente ya no se podrá usar el token viejo.
      console.error('[apiClient] Error al cerrar sesión en el servidor:', error);
    }
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return (await this.client.put(`/auth/me/password`, { currentPassword, newPassword })).data;
  }

  public async mfaSetup(): Promise<{ secret: string; provisioningUri: string }> {
    return (await this.client.post(`/auth/mfa/setup`)).data;
  }

  public async mfaEnable(secret: string, code: string): Promise<{ recoveryCodes: string[] }> {
    return (await this.client.post(`/auth/mfa/enable`, { secret, code })).data;
  }

  public async mfaDisable(password: string): Promise<any> {
    return (await this.client.post(`/auth/mfa/disable`, { password })).data;
  }

  public async mfaVerify(ticket: string, code: string): Promise<any> {
    return (await this.client.post(`/auth/mfa/verify`, { ticket, code })).data;
  }

  // Login con Google (solo superadmin). El Client ID lo sirve el worker, así
  // que no hay variable de build que mantener sincronizada con él.
  public async getGoogleLoginConfig(): Promise<GoogleLoginConfig> {
    return (await this.client.get<GoogleLoginConfig>(`/auth/google/config`)).data;
  }

  public async googleLogin(credential: string): Promise<GoogleLoginResult> {
    return (await this.client.post<GoogleLoginResult>(`/auth/google`, { credential })).data;
  }

  public async getInvitation(token: string): Promise<any> {
    return (await this.client.get(`/auth/invitations/${token}`)).data;
  }

  public async acceptInvitation(token: string, password: string): Promise<any> {
    return (await this.client.post(`/auth/invitations/${token}/accept`, { password })).data;
  }

  // ============================================
  // Carta: menús, secciones, platos, alérgenos
  // ============================================
  public async getMenus(restaurantId: string): Promise<any[]> {
    const response = await this.client.get(`/restaurants/${restaurantId}/menus`);
    return Array.isArray(response.data?.menus) ? response.data.menus : [];
  }

  public getSections(restaurantId: string): Promise<any[]> {
    return this.base.getSections(restaurantId);
  }

  public createSection(sectionData: any): Promise<any> {
    return this.base.createSection(sectionData);
  }

  public updateSection(sectionId: string, data: any): Promise<any> {
    return this.base.updateSection(sectionId, data);
  }

  public async getDishSectionRelations(restaurantId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/restaurants/${restaurantId}/dish-section-relations`);
      return response.data.relations || [];
    } catch (error) {
      console.error('[apiClient] Error al obtener relaciones plato-sección:', error);
      return [];
    }
  }

  /** Platos del restaurante, ordenados por nombre en español. */
  public async getDishes(restaurantId: string): Promise<Dish[]> {
    const dishes = await this.base.getDishes(restaurantId) as unknown as Dish[];
    if (!Array.isArray(dishes)) return [];
    const nameOf = (d: Dish) => d.translations?.name?.es || (d as any).name || '';
    return [...dishes].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }

  public async getDish(dishId: string): Promise<Dish> {
    return await this.base.getDish(dishId) as unknown as Dish;
  }

  public createDish(data: CreateDishData): Promise<any> {
    return this.base.createDish(data as any);
  }

  public updateDish(id: string, data: UpdateDishData): Promise<any> {
    return this.base.updateDish(id, data as any);
  }

  public deleteDish(id: string, restaurantId: string): Promise<void> {
    return this.base.deleteDish(id, restaurantId);
  }

  public getAllergens(): Promise<any[]> {
    return this.base.getAllergens();
  }

  public async updateDishesOrderBySection(restaurantId: string, orderData: Array<{
    section_id: string;
    dish_orders: Array<{ dish_id: string; order_index: number }>;
  }>): Promise<any> {
    return (await this.client.post(`/restaurants/${restaurantId}/dishes/order-by-section`, { dishOrders: orderData })).data;
  }

  /** Iconos del sistema disponibles en R2 (selector de iconos de sección). */
  public async getSystemIcons(): Promise<any[]> {
    try {
      const response = await this.client.get('/system/icons');
      return Array.isArray(response.data?.icons) ? response.data.icons : [];
    } catch (error) {
      console.error('[apiClient] Error al obtener iconos del sistema:', error);
      return [];
    }
  }

  // ============================================
  // Media de platos
  // ============================================
  public async getDishMedia(dishId: string): Promise<DishMedia[]> {
    return this.normalizeMediaItems(await this.base.getDishMedia(dishId));
  }

  public async uploadMedia(
    dishId: string,
    file: File,
    role: string = 'GALLERY_IMAGE',
    orderIndex: number = 0,
    meta: { width?: number; height?: number; duration?: number } = {}
  ): Promise<DishMedia> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dish_id', dishId);
    formData.append('role', role);
    formData.append('order_index', String(orderIndex));
    formData.append('display_name', file.name || '');
    // Medidas reales (las lee el navegador al preparar el archivo): la carta decide con ellas
    // si una foto o vídeo va a sangre o entero, antes de que termine de cargar.
    if (meta.width) formData.append('width', String(meta.width));
    if (meta.height) formData.append('height', String(meta.height));
    if (meta.duration) formData.append('duration', String(meta.duration));

    const response: any = await this.base.uploadMedia(formData);
    return response.media || response;
  }

  public async updateMediaRole(mediaId: string, dishId: string, role: string): Promise<DishMedia> {
    return (await this.base.updateMediaRole(mediaId, dishId, role)).media;
  }

  public deleteMedia(mediaId: string): Promise<{ success: boolean; message: string }> {
    return this.base.deleteMedia(mediaId);
  }

  // Sin rol en la BD (filas antiguas): se deduce de is_primary y el tipo.
  private normalizeMediaItems(items: DishMedia[]): DishMedia[] {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      ...item,
      role: item.role || (item.is_primary ?
        (item.media_type === 'video' ? 'PRIMARY_VIDEO' : 'PRIMARY_IMAGE') :
        'GALLERY_IMAGE'),
      order_index: item.order_index || 0
    }));
  }

  // ============================================
  // Analítica (workerAnalytics.js)
  // ============================================
  private analyticsQuery(restaurantId: string, params: Record<string, string | number | undefined>): string {
    const query = new URLSearchParams({ restaurant_id: restaurantId });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }
    return query.toString();
  }

  /** Pestaña KPIs: resumen, serie diaria, top platos, ciudades, horas, origen y carritos. */
  public async getAnalytics(restaurantId: string, params: { timeRange: string; top?: number; lang?: string }): Promise<any> {
    const qs = this.analyticsQuery(restaurantId, { time_range: params.timeRange, top: params.top ?? 10, lang: params.lang ?? 'es' });
    const raw = (await this.client.get(`/analytics?${qs}`)).data;
    return {
      summary: {
        uniqueVisitors: raw.summary?.unique_visitors || 0,
        totalSessions: raw.summary?.total_sessions || 0,
        avgSessionDuration: raw.summary?.avg_session_duration || 0,
        dishViews: raw.summary?.dish_views || 0,
        favorites: raw.summary?.favorites || 0,
        avgDishViewDuration: raw.summary?.avg_dish_view_duration || 0,
        new_visitors: raw.summary?.new_visitors || 0,
        returning_visitors: raw.summary?.returning_visitors || 0,
      },
      timeseries: (raw.timeseries || []).map((item: any) => ({
        date: item.date,
        uniqueVisitors: item.unique_visitors || 0,
        totalSessions: item.total_sessions || 0,
      })),
      topDishes: raw.topDishes || [],
      cities: raw.breakdowns?.cities || [],
      trafficByHour: raw.trafficByHour || [],
      // De dónde vienen los clientes (guidebook/TV/QR/directo) y qué
      // apartamentos envían más tráfico.
      attribution: raw.attribution || [],
      topApartments: raw.topApartments || [],
      cartMetrics: {
        totalItems: raw.cartMetrics?.total_items_added || 0,
        avgValue: raw.cartMetrics?.avg_cart_value || 0,
      },
    };
  }

  public async getDishAnalytics(restaurantId: string, params: { timeRange: string; lang?: string }): Promise<any> {
    const qs = this.analyticsQuery(restaurantId, { time_range: params.timeRange, lang: params.lang ?? 'es' });
    return (await this.client.get(`/analytics/dishes?${qs}`)).data;
  }

  public async getSectionAnalytics(restaurantId: string, params: { timeRange: string; lang?: string }): Promise<any> {
    const qs = this.analyticsQuery(restaurantId, { time_range: params.timeRange, lang: params.lang ?? 'es' });
    return (await this.client.get(`/analytics/sections?${qs}`)).data;
  }

  public async getSessionAnalytics(restaurantId: string, params: { timeRange: string; page?: number; limit?: number }): Promise<any> {
    const qs = this.analyticsQuery(restaurantId, { time_range: params.timeRange, page: params.page ?? 1, limit: params.limit ?? 20 });
    return (await this.client.get(`/analytics/sessions?${qs}`)).data;
  }

  // ============================================
  // Restaurante: datos, tema y colores de la carta
  // ============================================
  public async getRestaurant(restaurantId: string): Promise<any> {
    return (await this.client.get(`/restaurants/${restaurantId}`)).data;
  }

  /** Configuración completa (themes, branding, features). */
  public async getRestaurantConfig(restaurantId: string): Promise<any> {
    return (await this.client.get(`/restaurants/${restaurantId}/config`)).data;
  }

  public async updateRestaurant(restaurantId: string, data: any): Promise<any> {
    return (await this.client.put(`/restaurants/${restaurantId}`, data)).data;
  }

  /** Tabla themes — pestaña "Diseño" de la landing. */
  public async updateRestaurantTheme(restaurantId: string, data: any): Promise<any> {
    return (await this.client.put(`/restaurants/${restaurantId}/theme`, data)).data;
  }

  /** Colores de la carta (config_overrides con prefijo reel_). */
  public async getRestaurantStyling(restaurantId: string): Promise<any> {
    return (await this.client.get(`/restaurants/${restaurantId}/styling`)).data;
  }

  public async updateRestaurantStyling(restaurantId: string, data: any): Promise<any> {
    return (await this.client.put(`/restaurants/${restaurantId}/styling`, data)).data;
  }

  // ============================================
  // Reservas (workerReservations.js)
  // ============================================
  public async getReservationSettings(restaurantId: string): Promise<any> {
    return (await this.client.get(`/reservations/config/${restaurantId}`)).data.config;
  }

  public async updateReservationConfig(restaurantId: string, config: any): Promise<any> {
    return (await this.client.put(`/reservations/config/${restaurantId}`, config)).data;
  }

  public async toggleReservations(restaurantId: string, enabled: boolean): Promise<any> {
    return (await this.client.post(`/reservations/settings/toggle`, { restaurant_id: restaurantId, is_enabled: enabled })).data;
  }

  public async getReservationsList(
    restaurantId: string,
    filters: { date?: string; status?: string } = {},
  ): Promise<{ success: boolean; reservations: Reservation[] }> {
    const params = new URLSearchParams({ restaurant_id: restaurantId });
    if (filters.date) params.set('date', filters.date);
    if (filters.status) params.set('status', filters.status);
    return (await this.client.get(`/reservations/admin/list?${params}`)).data;
  }

  public async getReservationLogs(restaurantId: string): Promise<any> {
    return (await this.client.get(`/reservations/admin/logs?restaurant_id=${encodeURIComponent(restaurantId)}`)).data;
  }

  public async updateReservation(reservationId: string, data: ReservationUpdate): Promise<any> {
    return (await this.client.patch(`/reservations/${reservationId}`, data)).data;
  }

  // ============================================
  // Delivery (workerDelivery.js). Antes DeliveryPage hacía fetch sin token:
  // todo menos la config pública daba 401.
  // ============================================
  /** Lo guardado tal cual (no la vista pública con los números de respaldo ya resueltos). */
  public async getDeliverySettings(restaurantId: string): Promise<{ success: boolean; settings: DeliverySettings }> {
    return (await this.client.get(`/delivery/settings/${restaurantId}`)).data;
  }

  public async updateDeliveryConfig(restaurantId: string, config: any): Promise<any> {
    return (await this.client.put(`/delivery/config/${restaurantId}`, config)).data;
  }

  public async getDeliveryTranslations(restaurantId: string): Promise<any> {
    return (await this.client.get(`/delivery/translations/${restaurantId}`)).data;
  }

  public async updateDeliveryTranslations(restaurantId: string, translations: any): Promise<any> {
    return (await this.client.put(`/delivery/translations/${restaurantId}`, translations)).data;
  }

  public async getDeliveryOrders(restaurantId: string, status?: string): Promise<{ success: boolean; orders: DeliveryOrder[] }> {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return (await this.client.get(`/delivery/orders/${restaurantId}${qs}`)).data;
  }

  public async updateDeliveryOrderStatus(orderId: string, status: DeliveryStatus): Promise<any> {
    return (await this.client.patch(`/delivery/orders/${orderId}/status`, { status })).data;
  }

  // ============================================
  // Usuarios del restaurante
  // ============================================
  public async getRestaurantUsers(restaurantId: string): Promise<any[]> {
    return (await this.client.get(`/restaurants/${restaurantId}/users`)).data.users || [];
  }

  public async addRestaurantUser(restaurantId: string, userData: { email: string; name?: string; role: string }): Promise<any> {
    return (await this.client.post(`/restaurants/${restaurantId}/users`, userData)).data;
  }

  public async removeRestaurantUser(restaurantId: string, userId: string): Promise<any> {
    return (await this.client.delete(`/restaurants/${restaurantId}/users/${userId}`)).data;
  }

  public async resetUserPassword(restaurantId: string, userId: string): Promise<any> {
    return (await this.client.post(`/restaurants/${restaurantId}/users/${userId}/reset-password`)).data;
  }

  // ============================================
  // Petición genérica (guidebook y endpoints sin método propio)
  // ============================================
  /** Usa el token y parsea el JSON; lanza con el mensaje del servidor si no es 2xx. */
  public async request(path: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

    const response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
      body: options.body || undefined,
      signal: options.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new AdminApiClient(createApiClient(API_URL));

export interface Dish {
  id: string;
  restaurant_id: string;
  price: number;
  status: 'active' | 'out_of_stock' | 'seasonal' | 'hidden';
  calories?: number;
  preparation_time?: number;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_new: boolean;
  is_featured: boolean;
  has_half_portion: boolean;
  half_price?: number;
  avg_rating?: number;
  rating_count?: number;
  translations?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
    ingredients?: Record<string, string>;
  };
  media?: DishMedia[];
  allergens?: any[];
  section_ids?: string[];
}

export interface CreateDishData {
  restaurant_id: string;
  price: number;
  status: string;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  has_half_portion?: boolean;
  half_price?: number;
  name?: string; // Para compatibilidad
  description?: string; // Para compatibilidad
  translations?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
    ingredients?: Record<string, string>;
  };
  allergens?: string[];
  section_ids?: string[];
}

export type UpdateDishData = Partial<CreateDishData>;
