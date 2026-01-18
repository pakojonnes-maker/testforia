// apps/admin/src/lib/apiClient.ts

import { createApiClient, getQueryDefaults, ApiClient } from "@visualtaste/api";
import type { DishMedia } from "@visualtaste/api";

// API URL desde variables de entorno o por defecto
const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

// Crear instancia base del cliente API
const baseApiClient = createApiClient(API_URL);

/**
 * AdminApiClient extiende la funcionalidad de ApiClient para la aplicación de administración
 */
class AdminApiClient {
  // Propiedades de estado
  public authToken: string | null = localStorage.getItem('auth_token') || null;

  // Referencia al cliente base para acceso directo
  private baseClient: ApiClient;

  constructor(baseClient: ApiClient) {
    this.baseClient = baseClient;

    // Si hay token guardado, inicializarlo en el cliente base
    if (this.authToken) {
      this.baseClient.setAuthToken(this.authToken);
    }
  }

  // Acceso directo al cliente HTTP
  public get client() {
    return this.baseClient.client;
  }

  /**
   * Método para interceptar cualquier llamada al apiClient y redirigirla al cliente base
   * Esto garantiza que cualquier método del baseClient esté disponible automáticamente
   */
  public async invokeBaseMethod(methodName: string, ...args: any[]): Promise<any> {
    // Verificar si el método existe en el cliente base
    if (typeof (this.baseClient as any)[methodName] === 'function') {
      console.log(`[apiClient] Invocando método del cliente base: ${methodName}`);
      return (this.baseClient as any)[methodName](...args);
    }

    console.error(`[apiClient] Método no encontrado en el cliente base: ${methodName}`);
    throw new Error(`El método "${methodName}" no está implementado`);
  }

  // Métodos de gestión de token
  public setAuthToken(token: string): void {
    this.authToken = token;
    localStorage.setItem('auth_token', token);
    this.baseClient.setAuthToken(token);
  }

  public clearAuthToken(): void {
    this.authToken = null;
    localStorage.removeItem('auth_token');
    this.baseClient.clearAuthToken();
  }

  // Método para verificar autenticación
  public isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // Método login extendido para admin que guarda el token
  public async login(email: string, password: string): Promise<any> {
    const response = await this.baseClient.login(email, password);
    if (response && response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  // Relaciones plato-sección
  public async getDishSectionRelations(restaurantId: string): Promise<any[]> {
    try {
      console.log(`[apiClient] Obteniendo relaciones plato-sección para restaurante ${restaurantId}`);
      const response = await this.client.get(`/restaurants/${restaurantId}/dish-section-relations`);
      return response.data.relations || [];
    } catch (error) {
      console.error('[apiClient] Error al obtener relaciones plato-sección:', error);
      return [];
    }
  }

  // Métodos específicamente optimizados para el admin
  public async getDishes(restaurantId: string): Promise<Dish[]> {
    const dishes = await this.baseClient.getDishes(restaurantId) as unknown as Dish[];
    // Ordenamos por nombre para mejor visualización en admin
    return Array.isArray(dishes) ? dishes.sort((a, b) => {
      const nameA = a.translations?.name?.es || (a as any).name || '';
      const nameB = b.translations?.name?.es || (b as any).name || '';
      return nameA.localeCompare(nameB);
    }) : dishes;
  }

  public async getDish(dishId: string): Promise<Dish> {
    console.log(`[apiClient] Obteniendo plato con ID: ${dishId}`);
    try {
      // Intentar usar el método base si existe
      if (typeof this.baseClient.getDish === 'function') {
        return await this.baseClient.getDish(dishId) as unknown as Dish;
      }

      // Implementación alternativa usando client.get directamente
      const response = await this.baseClient.client.get(`/dishes/${dishId}`);
      // Verificar estructura de respuesta
      return (response.data.dish || response.data) as Dish;
    } catch (error) {
      console.error(`[apiClient] Error obteniendo plato:`, error);
      throw new Error(`Error al cargar el plato: ${(error as any)?.message || 'Error desconocido'}`);
    }
  }

  public async getSections(restaurantId: string): Promise<any[]> {
    return this.invokeBaseMethod('getSections', restaurantId);
  }

  public async createSection(sectionData: any): Promise<any> {
    return this.invokeBaseMethod('createSection', sectionData);
  }

  public async updateSection(sectionId: string, data: any): Promise<any> {
    return this.invokeBaseMethod('updateSection', sectionId, data);
  }

  public async deleteSection(sectionId: string, restaurantId: string): Promise<any> {
    return this.invokeBaseMethod('deleteSection', sectionId, restaurantId);
  }

  public async getAllergens(): Promise<any[]> {
    return this.invokeBaseMethod('getAllergens');
  }

  public async createDish(data: CreateDishData): Promise<any> {
    return this.invokeBaseMethod('createDish', data);
  }

  public async updateDish(id: string, data: UpdateDishData): Promise<any> {
    console.log('[apiClient] updateDish called with id:', id);
    console.log('[apiClient] updateDish data:', JSON.stringify(data, null, 2));
    try {
      const result = await this.invokeBaseMethod('updateDish', id, data);
      console.log('[apiClient] updateDish response:', result);
      return result;
    } catch (error) {
      console.error('[apiClient] updateDish error:', error);
      throw error;
    }
  }

  public async deleteDish(id: string, restaurantId: string): Promise<any> {
    return this.invokeBaseMethod('deleteDish', id, restaurantId);
  }

  // Métodos para la gestión de medios
  public async getRestaurantMedia(restaurantId: string): Promise<DishMedia[]> {
    try {
      const data = await this.baseClient.getRestaurantMedia(restaurantId);
      return this.normalizeMediaItems(data);
    } catch (error) {
      console.error('[apiClient] Error al obtener medios del restaurante:', error);
      throw error;
    }
  }

  public async getDishMedia(dishId: string): Promise<DishMedia[]> {
    try {
      const data = await this.baseClient.getDishMedia(dishId);
      return this.normalizeMediaItems(data);
    } catch (error) {
      console.error(`[apiClient] Error al obtener medios del plato ${dishId}:`, error);
      throw error;
    }
  }

  public async uploadMedia(dishId: string, file: File, role: string = 'GALLERY_IMAGE', orderIndex: number = 0): Promise<DishMedia> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dish_id', dishId);
    formData.append('role', role);
    formData.append('order_index', String(orderIndex));
    formData.append('display_name', file.name || '');

    const response = await this.baseClient.uploadMedia(formData);
    return response.media || response;
  }

  public async updateMediaRole(mediaId: string, dishId: string, role: string): Promise<DishMedia> {
    const response = await this.baseClient.updateMediaRole(mediaId, dishId, role);
    return response.media;
  }

  /**
  * Obtener analytics generales (resumen, timeseries, breakdowns)
  */
  public async getAnalytics(restaurantId: string, params: any): Promise<any> {
    try {
      const queryParamsObj: any = {
        restaurant_id: restaurantId,
        time_range: params.timeRange || params.time_range,
        lang: params.lang || 'es',
        top: String(params.top || 10),
        from: params.from || undefined,
        to: params.to || undefined
      };

      Object.keys(queryParamsObj).forEach(key => queryParamsObj[key] === undefined && delete queryParamsObj[key]);

      const queryParams = new URLSearchParams(queryParamsObj).toString();

      console.log(`[apiClient] Solicitando analytics: /analytics?${queryParams}`);
      const response = await this.client.get(`/analytics?${queryParams}`);
      const rawData = response.data;
      return {
        summary: {
          totalViews: rawData.summary?.total_views || 0,
          uniqueVisitors: rawData.summary?.unique_visitors || 0,
          totalSessions: rawData.summary?.total_sessions || 0,
          avgSessionDuration: rawData.summary?.avg_session_duration || 0,
          dishViews: rawData.summary?.dish_views || 0,
          favorites: rawData.summary?.favorites_added || rawData.summary?.favorites || 0,
          ratings: rawData.summary?.ratings_submitted || rawData.summary?.ratings || 0,
          shares: rawData.summary?.shares || 0,
          avgDishViewDuration: rawData.summary?.avg_dish_view_duration || 0,
          avgSectionTime: rawData.summary?.avg_section_time || 0,
          avgScrollDepth: rawData.summary?.avg_scroll_depth || 0,
          mediaErrors: rawData.summary?.media_errors || 0,
          // ✅ Map visitor recurrence fields
          new_visitors: rawData.summary?.new_visitors || 0,
          returning_visitors: rawData.summary?.returning_visitors || 0,
        },
        timeseries: (rawData.timeseries || []).map((item: any) => ({
          date: item.date,
          totalViews: item.total_views || 0,
          uniqueVisitors: item.unique_visitors || 0,
          totalSessions: item.total_sessions || 0,
        })),
        topDishes: rawData.topDishes || [],
        topSections: rawData.topSections || [],
        breakdowns: rawData.breakdowns || {},
        trafficByHour: rawData.trafficByHour || [],
        flows: rawData.flows || [],
        qrAttribution: rawData.qrAttribution || [],
        // ✅ Include cart metrics in returned data
        cartMetrics: {
          totalCarts: rawData.cartMetrics?.total_carts_created || 0,
          totalItems: rawData.cartMetrics?.total_items_added || 0,
          avgValue: rawData.cartMetrics?.avg_cart_value || 0,
          totalValue: rawData.cartMetrics?.total_estimated_value || 0,
          conversionRate: rawData.cartMetrics?.avg_conversion_rate || 0,
          cartsShown: rawData.cartMetrics?.total_carts_shown || 0,
          cartsAbandoned: rawData.cartMetrics?.total_carts_abandoned || 0,
        },
      };
    } catch (error) {
      console.error('[apiClient] Error al obtener analytics:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas detalladas de platos
   */
  public async getDishAnalytics(restaurantId: string, params: any): Promise<any> {
    try {
      const queryParamsObj: any = {
        restaurant_id: restaurantId,
        time_range: params.timeRange || params.time_range,
        lang: params.lang || 'es',
        from: params.from || undefined,
        to: params.to || undefined
      };

      // Eliminar claves undefined para que no se envíen como "undefined" o ""
      Object.keys(queryParamsObj).forEach(key => queryParamsObj[key] === undefined && delete queryParamsObj[key]);

      const queryParams = new URLSearchParams(queryParamsObj).toString();

      const response = await this.client.get(`/analytics/dishes?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener analytics de platos:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas detalladas de secciones
   */
  public async getSectionAnalytics(restaurantId: string, params: any): Promise<any> {
    try {
      const queryParamsObj: any = {
        restaurant_id: restaurantId,
        time_range: params.timeRange || params.time_range,
        lang: params.lang || 'es',
        from: params.from || undefined,
        to: params.to || undefined
      };

      // Eliminar claves undefined para que no se envíen como "undefined" o ""
      Object.keys(queryParamsObj).forEach(key => queryParamsObj[key] === undefined && delete queryParamsObj[key]);

      const queryParams = new URLSearchParams(queryParamsObj).toString();

      const response = await this.client.get(`/analytics/sections?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener analytics de secciones:', error);
      throw error;
    }
  }

  /**
   * Obtener lista detallada de sesiones
   */
  public async getSessionAnalytics(restaurantId: string, params: any): Promise<any> {
    try {
      const queryParamsObj: any = {
        restaurant_id: restaurantId,
        time_range: params.timeRange || params.time_range,
        page: String(params.page || 1),
        limit: String(params.limit || 20),
        from: params.from || undefined,
        to: params.to || undefined
      };

      Object.keys(queryParamsObj).forEach(key => queryParamsObj[key] === undefined && delete queryParamsObj[key]);

      const queryParams = new URLSearchParams(queryParamsObj).toString();

      const response = await this.client.get(`/analytics/sessions?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener analytics de sesiones:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de campañas de marketing
   */
  public async getCampaignAnalytics(restaurantId: string, params: any): Promise<any> {
    try {
      const queryParamsObj: any = {
        restaurant_id: restaurantId,
        time_range: params.timeRange || params.time_range || 'month',
        from: params.from || undefined,
        to: params.to || undefined
      };

      Object.keys(queryParamsObj).forEach(key => queryParamsObj[key] === undefined && delete queryParamsObj[key]);

      const queryParams = new URLSearchParams(queryParamsObj).toString();

      console.log(`[apiClient] Solicitando campaign analytics: /analytics/campaigns?${queryParams}`);
      const response = await this.client.get(`/analytics/campaigns?${queryParams}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener analytics de campañas:', error);
      throw error;
    }
  }

  // Normalización de datos de medios para consistencia
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

  public async getMenus(restaurantId: string): Promise<any[]> {
    try {
      console.log(`[apiClient] Obteniendo menús para restaurante ${restaurantId}`);

      const response = await this.client.get(`/restaurants/${restaurantId}/menus`);

      if (response.data.success && Array.isArray(response.data.menus)) {
        return response.data.menus;
      }

      console.warn('[apiClient] Formato inesperado en respuesta de menús:', response.data);
      return [];
    } catch (error) {
      console.error('[apiClient] Error al obtener menús:', error);
      return [{
        id: `default_menu_${restaurantId}`,
        name: "Menú Predeterminado",
        is_default: true
      }];
    }
  }

  /**
   * Obtener iconos del sistema disponibles desde R2
   */
  public async getSystemIcons(): Promise<any[]> {
    try {
      console.log('[apiClient] Obteniendo iconos del sistema');
      const response = await this.client.get('/system/icons');

      if (response.data.success && Array.isArray(response.data.icons)) {
        return response.data.icons;
      }

      console.warn('[apiClient] Formato inesperado en respuesta de iconos:', response.data);
      return [];
    } catch (error) {
      console.error('[apiClient] Error al obtener iconos del sistema:', error);
      return [];
    }
  }

  // ============================================
  // 🆕 MÉTODOS PARA RESTAURANT & STYLING - CORREGIDOS
  // ============================================

  /**
   * Obtener datos básicos del restaurante
   */
  public async getRestaurant(restaurantId: string): Promise<any> {
    try {
      console.log(`[apiClient] Obteniendo datos del restaurante ${restaurantId}`);
      const response = await this.baseClient.client.get(`/restaurants/${restaurantId}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener restaurante:', error);
      throw error;
    }
  }

  /**
   * Obtener configuración completa del restaurante (themes, branding, features)
   */
  public async getRestaurantConfig(restaurantId: string): Promise<any> {
    try {
      console.log(`[apiClient] Obteniendo configuración del restaurante ${restaurantId}`);
      const response = await this.baseClient.client.get(`/restaurants/${restaurantId}/config`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener configuración:', error);
      throw error;
    }
  }

  /**
   * Actualizar datos básicos del restaurante (name, description, contact, etc.)
   */
  public async updateRestaurant(restaurantId: string, data: any): Promise<any> {
    try {
      console.log(`[apiClient] Actualizando datos del restaurante ${restaurantId}`);
      const response = await this.baseClient.client.put(`/restaurants/${restaurantId}`, data);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al actualizar restaurante:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Actualizar THEME (tabla themes) - Para pestaña "Diseño"
   */
  public async updateRestaurantTheme(restaurantId: string, data: any): Promise<any> {
    try {
      console.log(`[apiClient] Actualizando theme del restaurante ${restaurantId}`);
      const response = await this.baseClient.client.put(`/restaurants/${restaurantId}/theme`, data);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al actualizar theme:', error);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener colores de reels (config_overrides)
   */
  public async getRestaurantStyling(restaurantId: string): Promise<any> {
    try {
      console.log(`[apiClient] Obteniendo styling para restaurante ${restaurantId}`);
      const response = await this.baseClient.client.get(`/restaurants/${restaurantId}/styling`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener styling:', error);
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Actualizar colores de reels (config_overrides)
   * Para pestaña "Colores Reels"
   */
  public async updateRestaurantStyling(restaurantId: string, data: any): Promise<any> {
    try {
      console.log(`[apiClient] Actualizando styling del restaurante ${restaurantId}`, data);

      // Send ALL fields directly - backend handles the reel_ prefix
      const response = await this.baseClient.client.put(`/restaurants/${restaurantId}/styling`, data);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al actualizar styling:', error);
      throw error;
    }
  }

  // ============================================
  // 🆕 DASHBOARD API METHODS
  // ============================================

  /**
   * Get lightweight dashboard status (Pulse)
   */
  public async getDashboardPulse(restaurantId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/restaurants/${restaurantId}/dashboard/pulse`
      );
      return response.data;
    } catch (error) {
      console.warn('[apiClient] Dashboard pulse endpoint failed:', error);
      return null;
    }
  }

  /**
   * Get dashboard summary with today vs yesterday comparison
   */
  public async getDashboardSummary(
    restaurantId: string,
    period: '1d' | '7d' | '30d' = '7d'
  ): Promise<any> {
    try {
      const response = await this.client.get(
        `/restaurants/${restaurantId}/analytics/summary?period=${period}`
      );
      return response.data;
    } catch (error) {
      console.warn('[apiClient] Dashboard summary endpoint failed:', error);
      return null; // Return null instead of mock data
    }
  }

  /**
   * Get top performing dishes
   */
  public async getTopDishes(
    restaurantId: string,
    period: '7d' | '30d' = '7d',
    limit: number = 10
  ): Promise<any> {
    try {
      const response = await this.client.get(
        `/restaurants/${restaurantId}/analytics/dishes/top?period=${period}&limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.warn('[apiClient] Top dishes endpoint failed:', error);
      return null; // Return null instead of mock data
    }
  }

  /**
   * Get QR code breakdown
   */
  public async getQRBreakdown(restaurantId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/restaurants/${restaurantId}/analytics/qr-breakdown`
      );
      return response.data;
    } catch (error) {
      console.warn('[apiClient] QR breakdown endpoint failed:', error);
      return null; // Return null instead of mock data
    }
  }

  /**
   * Get content health metrics
   */
  public async getContentHealth(restaurantId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/restaurants/${restaurantId}/content/health`
      );
      return response.data;
    } catch (error) {
      console.warn('[apiClient] Content health endpoint failed:', error);
      return null; // Return null instead of mock data
    }
  }

  /**
   * Get stagnant dishes (low views)
   */
  public async getStagnantDishes(
    restaurantId: string,
    days: number = 7
  ): Promise<any> {
    try {
      const response = await this.client.get(
        `/restaurants/${restaurantId}/dishes/stagnant?days=${days}`
      );
      return response.data;
    } catch (error) {
      console.warn('[apiClient] Stagnant dishes endpoint failed:', error);
      return null; // Return null instead of mock data
    }
  }

  // Método para actualizar el orden de los platos por sección
  public async updateDishesOrderBySection(restaurantId: string, orderData: Array<{
    section_id: string;
    dish_orders: Array<{
      dish_id: string;
      order_index: number;
    }>;
  }>): Promise<any> {
    try {
      console.log(`[apiClient] Actualizando orden de platos por sección para restaurante ${restaurantId}`);
      const response = await this.client.post(
        `/restaurants/${restaurantId}/dishes/order-by-section`,
        { dishOrders: orderData }
      );
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al actualizar orden de platos por sección:', error);
      throw error;
    }
  }

  // ============================================
  // RESERVATIONS METHODS
  // ============================================
  public async getReservationSettings(restaurantId: string): Promise<any> {
    try {
      const response = await this.client.get(`/reservations/config/${restaurantId}`);
      return response.data.config;
    } catch (error) {
      console.error('[apiClient] Error al obtener configuración de reservas:', error);
      throw error;
    }
  }

  public async updateReservationConfig(restaurantId: string, config: any): Promise<any> {
    try {
      const response = await this.client.put(`/reservations/config/${restaurantId}`, config);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al actualizar configuración de reservas:', error);
      throw error;
    }
  }

  public async toggleReservations(restaurantId: string, enabled: boolean): Promise<any> {
    try {
      const response = await this.client.post(`/reservations/settings/toggle`, {
        restaurant_id: restaurantId,
        is_enabled: enabled
      });
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al cambiar estado de reservas:', error);
      throw error;
    }
  }

  public async getReservationsList(restaurantId: string, date?: string): Promise<any> {
    try {
      const params = new URLSearchParams({ restaurant_id: restaurantId });
      if (date) params.append('date', date);
      const response = await this.client.get(`/reservations/admin/list?${params}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener lista de reservas:', error);
      throw error;
    }
  }



  public async getReservationLogs(restaurantId: string): Promise<any> {
    try {
      const response = await this.client.get(`/reservations/admin/logs?restaurant_id=${restaurantId}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener logs:', error);
      throw error;
    }
  }

  public async getReservationStats(restaurantId: string, month: string): Promise<any> {
    try {
      const response = await this.client.get(`/reservations/stats?restaurant_id=${restaurantId}&month=${month}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al obtener estadisticas:', error);
      throw error;
    }
  }

  public async updateReservationStatus(reservationId: string, status: string, reason?: string): Promise<any> {
    try {
      const response = await this.client.patch(`/reservations/${reservationId}`, {
        status,
        cancellation_reason: reason
      });
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al actualizar estado:', error);
      throw error;
    }
  }

  // ============================================
  // USERS METHODS
  // ============================================

  public async getRestaurantUsers(restaurantId: string): Promise<any[]> {
    try {
      console.log(`[apiClient] Obteniendo usuarios para restaurante ${restaurantId}`);
      const response = await this.baseClient.client.get(`/restaurants/${restaurantId}/users`);
      return response.data.users || [];
    } catch (error) {
      console.error('[apiClient] Error al obtener usuarios:', error);
      throw error;
    }
  }

  public async addRestaurantUser(restaurantId: string, userData: { email: string; name?: string; role: string }): Promise<any> {
    try {
      console.log(`[apiClient] Añadiendo usuario al restaurante ${restaurantId}`, userData);
      const response = await this.baseClient.client.post(`/restaurants/${restaurantId}/users`, userData);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al añadir usuario:', error);
      throw error;
    }
  }

  public async removeRestaurantUser(restaurantId: string, userId: string): Promise<any> {
    try {
      console.log(`[apiClient] Eliminando usuario ${userId} del restaurante ${restaurantId}`);
      const response = await this.baseClient.client.delete(`/restaurants/${restaurantId}/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al eliminar usuario:', error);
      throw error;
    }
  }

  public async resetUserPassword(restaurantId: string, userId: string): Promise<any> {
    try {
      console.log(`[apiClient] Reseteando contraseña para usuario ${userId}`);
      const response = await this.baseClient.client.post(`/restaurants/${restaurantId}/users/${userId}/reset-password`);
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al resetear contraseña:', error);
      throw error;
    }
  }

  public async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    try {
      console.log(`[apiClient] Cambiando contraseña del usuario actual`);
      const response = await this.baseClient.client.put(`/auth/me/password`, {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('[apiClient] Error al cambiar contraseña:', error);
      throw error;
    }
  }

  // Configuración de React Query
  public get queryDefaults() {
    return getQueryDefaults();
  }
}

// Crear el proxy que interceptará todas las llamadas a métodos no definidos
const adminApiClient = new AdminApiClient(baseApiClient);

// Crear un proxy que intercepte cualquier llamada a métodos no definidos
export const apiClient = new Proxy(adminApiClient, {
  get(target, prop, receiver) {
    // Si la propiedad existe directamente en adminApiClient, la devolvemos
    if (prop in target) {
      return Reflect.get(target, prop, receiver);
    }

    // Si la propiedad es una función en baseApiClient, devolvemos una función que la invoca
    if (typeof prop === 'string' && typeof (baseApiClient as any)[prop] === 'function') {
      return (...args: any[]) => target.invokeBaseMethod(prop, ...args);
    }

    // Para cualquier otra propiedad, intentamos accederla en baseApiClient
    return Reflect.get(baseApiClient as any, prop, receiver);
  }
});

// Para uso directo si es necesario
export { baseApiClient };

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
  allergens?: any[]; // Changed Allergen[] to any[] to avoid strict type issues
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

export interface UpdateDishData {
  restaurant_id?: string;
  price?: number;
  status?: string;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  is_new?: boolean;
  is_featured?: boolean;
  has_half_portion?: boolean;
  half_price?: number;
  translations?: {
    name?: Record<string, string>;
    description?: Record<string, string>;
    ingredients?: Record<string, string>;
  };
  allergens?: string[];
  section_ids?: string[];
}
