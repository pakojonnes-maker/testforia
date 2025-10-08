// apps/admin/src/lib/apiClient.ts

import { createApiClient, getQueryDefaults, ApiClient } from "@visualtaste/api";
import type { Dish, DishMedia } from "@visualtaste/api";

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
  // Añadir este método a la clase AdminApiClient en apiClient.ts
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
    const dishes = await this.baseClient.getDishes(restaurantId);
    // Ordenamos por nombre para mejor visualización en admin
    return Array.isArray(dishes) ? dishes.sort((a, b) => {
      const nameA = a.translations?.name?.es || a.name || '';
      const nameB = b.translations?.name?.es || b.name || '';
      return nameA.localeCompare(nameB);
    }) : dishes;
  }
  
  public async getDish(dishId: string): Promise<Dish> {
    console.log(`[apiClient] Obteniendo plato con ID: ${dishId}`);
    try {
      // Intentar usar el método base si existe
      if (typeof this.baseClient.getDish === 'function') {
        return await this.baseClient.getDish(dishId);
      }
      
      // Implementación alternativa usando client.get directamente
      const response = await this.baseClient.client.get(`/dishes/${dishId}`);
      // Verificar estructura de respuesta
      return response.data.dish || response.data;
    } catch (error) {
      console.error(`[apiClient] Error obteniendo plato:`, error);
      throw new Error(`Error al cargar el plato: ${error?.message || 'Error desconocido'}`);
    }
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
  
  // Reemplaza el método uploadMedia actual
public async uploadMedia(dishId: string, file: File, role: string = 'GALLERY_IMAGE', orderIndex: number = 0): Promise<DishMedia> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('dish_id', dishId);
  formData.append('role', role);
  formData.append('order_index', String(orderIndex));
  formData.append('display_name', file.name || '');
  
  // Error: this.baseClient.uploadMediaWithRole is not a function
  // return await this.baseClient.uploadMediaWithRole(formData);
  
  // Solución: Usar directamente el método uploadMedia del cliente base
  const response = await this.baseClient.uploadMedia(formData);
  
  // Verificar y formatear la respuesta según se necesite
  return response.media || response;
}
  
  public async updateMediaRole(mediaId: string, dishId: string, role: string): Promise<DishMedia> {
    const response = await this.baseClient.updateMediaRole(mediaId, dishId, role);
    return response.media;
  }

  
  // Método para obtener medios por rol
  public async getMediaByRole(dishId: string, role: string): Promise<DishMedia[]> {
    try {
      return await this.baseClient.getMediaByRole(dishId, role);
    } catch (error) {
      console.error(`[apiClient] Error al obtener medios con rol ${role}:`, error);
      return [];
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
// En apiClient.ts, añade o actualiza este método
public async getMenus(restaurantId: string): Promise<any[]> {
  try {
    console.log(`[apiClient] Obteniendo menús para restaurante ${restaurantId}`);
    
    // Usar la nueva ruta RESTful
    const response = await this.client.get(`/restaurants/${restaurantId}/menus`);
    
    // Verificar respuesta y devolver menús
    if (response.data.success && Array.isArray(response.data.menus)) {
      return response.data.menus;
    }
    
    // Si hay algún problema con el formato, devolver array vacío
    console.warn('[apiClient] Formato inesperado en respuesta de menús:', response.data);
    return [];
  } catch (error) {
    console.error('[apiClient] Error al obtener menús:', error);
    // Crear un menú por defecto si hay error
    return [{
      id: `default_menu_${restaurantId}`,
      name: "Menú Predeterminado",
      is_default: true
    }];
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