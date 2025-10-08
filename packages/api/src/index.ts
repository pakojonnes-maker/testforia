import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  DEFAULT_API_URL, AUTH_HEADER_PREFIX, CONTENT_TYPE_JSON,
  API_TIMEOUT, QUERY_CONFIG
} from './constants';
import {
  Account, Restaurant, RestaurantDetails, Menu, Section, Dish,
  Theme, DishMedia, Language, RestaurantLanguage, Allergen, 
  RestaurantReelsData, Session, Event, User, Translation
} from './types';
export type {
  ReelTemplate,
  ReelTemplateConfig,
  RestaurantReelConfig,
  ReelColors,
  ReelFonts,
  ReelFullConfig,
  ClassicReelConfig,
  PremiumReelConfig,
  MinimalReelConfig,
  DynamicReelConfig,
  AnyReelConfig
} from './types/reels';

// Exportar todos los tipos y constantes para uso externo
export * from './types';
export * from './constants';
export * from './tracking';

/**
 * Cliente API principal para todas las comunicaciones con el backend
 */
export class ApiClient {
  readonly client: AxiosInstance;
  private authToken?: string;

  /**
   * Crea una nueva instancia del cliente API
   * @param baseURL - URL base para todas las solicitudes API
   */
  constructor(baseURL: string = DEFAULT_API_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': CONTENT_TYPE_JSON,
      },
      timeout: API_TIMEOUT
    });

    // Interceptor para añadir token de autenticación
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `${AUTH_HEADER_PREFIX}${this.authToken}`;
      }
      return config;
    });

    // Interceptor para manejar respuestas
    this.client.interceptors.response.use(
      response => response,
      error => {
        // Personalizar mensajes de error
        if (error.response) {
          // Error de servidor con respuesta
          error.message = error.response.data?.message || error.message;
        } else if (error.request) {
          // Error sin respuesta (problemas de red)
          error.message = 'No se pudo conectar al servidor. Comprueba tu conexión.';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Establece el token de autenticación para solicitudes autenticadas
   * @param token - Token JWT de autenticación
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Elimina el token de autenticación actual
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  // ======================================================================
  // Métodos para cuentas y usuarios
  // ======================================================================

  async login(email: string, password: string): Promise<{user: User, token: string}> {
    const response = await this.client.post<{user: User, token: string}>('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, name: string): Promise<{user: User, token: string}> {
    const response = await this.client.post<{user: User, token: string}>('/auth/register', { email, password, name });
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  async getAccounts(): Promise<Account[]> {
    const response = await this.client.get<Account[]>('/accounts');
    return response.data;
  }

  async createAccount(account: Partial<Account>): Promise<Account> {
    const response = await this.client.post<Account>('/accounts', account);
    return response.data;
  }

  // ======================================================================
  // Métodos para restaurantes
  // ======================================================================

  async getRestaurants(): Promise<Restaurant[]> {
    const response = await this.client.get<Restaurant[]>('/restaurants');
    return response.data;
  }

  async getRestaurantBySlug(slug: string): Promise<Restaurant> {
    const response = await this.client.get<Restaurant>(`/restaurants/by-slug/${slug}`);
    return response.data;
  }

  async getRestaurant(id: string): Promise<Restaurant> {
    const response = await this.client.get<Restaurant>(`/restaurants/${id}`);
    return response.data;
  }

  async createRestaurant(restaurant: Partial<Restaurant>): Promise<Restaurant> {
    const response = await this.client.post<Restaurant>('/restaurants', restaurant);
    return response.data;
  }

  async updateRestaurant(id: string, restaurant: Partial<Restaurant>): Promise<Restaurant> {
    const response = await this.client.put<Restaurant>(`/restaurants/${id}`, restaurant);
    return response.data;
  }

  async deleteRestaurant(id: string): Promise<void> {
    await this.client.delete(`/restaurants/${id}`);
  }

  async getRestaurantDetails(restaurantId: string): Promise<RestaurantDetails> {
    const response = await this.client.get<RestaurantDetails>(`/restaurants/${restaurantId}/details`);
    return response.data;
  }

  async updateRestaurantDetails(restaurantId: string, details: Partial<RestaurantDetails>): Promise<RestaurantDetails> {
    const response = await this.client.put<RestaurantDetails>(`/restaurants/${restaurantId}/details`, details);
    return response.data;
  }

  // ======================================================================
  // Métodos para menús
  // ======================================================================

  async getMenus(restaurantId: string): Promise<Menu[]> {
    const response = await this.client.get<Menu[]>(`/restaurants/${restaurantId}/menus`);
    return response.data;
  }

  async getMenu(id: string): Promise<Menu> {
    const response = await this.client.get<Menu>(`/menus/${id}`);
    return response.data;
  }

  async getDefaultMenu(restaurantId: string): Promise<Menu> {
    const response = await this.client.get<Menu>(`/restaurants/${restaurantId}/menus/default`);
    return response.data;
  }

  async createMenu(menu: Partial<Menu>): Promise<Menu> {
    const response = await this.client.post<Menu>('/menus', menu);
    return response.data;
  }

  async updateMenu(id: string, menu: Partial<Menu>): Promise<Menu> {
    const response = await this.client.put<Menu>(`/menus/${id}`, menu);
    return response.data;
  }

  async deleteMenu(id: string): Promise<void> {
    await this.client.delete(`/menus/${id}`);
  }

  // ======================================================================
  // Métodos para secciones
  // ======================================================================

  async getSections(restaurantId: string, menuId?: string): Promise<Section[]> {
    const params = menuId ? { menu_id: menuId } : {};
    const response = await this.client.get<{sections: Section[]} | Section[]>(`/restaurants/${restaurantId}/sections`, { params });
    return Array.isArray(response.data) ? response.data : response.data.sections || [];
  }

  async getSection(id: string): Promise<Section> {
    const response = await this.client.get<{section: Section} | Section>(`/sections/${id}`);
    return 'section' in response.data ? response.data.section : response.data;
  }

  async createSection(section: Partial<Section>): Promise<Section> {
    const response = await this.client.post<Section>('/sections', section);
    return response.data;
  }

  async updateSection(id: string, section: Partial<Section>): Promise<Section> {
    const response = await this.client.put<Section>(`/sections/${id}`, section);
    return response.data;
  }

  async deleteSection(id: string, restaurantId: string): Promise<void> {
    await this.client.delete(`/sections/${id}?restaurant_id=${restaurantId}`);
  }

  async updateSectionsOrder(restaurantId: string, sectionIds: string[]): Promise<void> {
    await this.client.put(`/restaurants/${restaurantId}/sections/order`, { section_ids: sectionIds });
  }

  // ======================================================================
  // Métodos para platos
  // ======================================================================

  async getDishes(restaurantId: string, sectionId?: string): Promise<Dish[]> {
    const params = sectionId ? { section_id: sectionId } : {};
    const response = await this.client.get<{dishes: Dish[]} | Dish[]>(`/restaurants/${restaurantId}/dishes`, { params });
    return Array.isArray(response.data) ? response.data : response.data.dishes || [];
  }

  async getDish(id: string): Promise<Dish> {
    const response = await this.client.get<{dish: Dish} | Dish>(`/dishes/${id}`);
    return 'dish' in response.data ? response.data.dish : response.data;
  }

  async createDish(dish: Partial<Dish>): Promise<Dish> {
    const response = await this.client.post<Dish>('/dishes', dish);
    return response.data;
  }

  async updateDish(id: string, dish: Partial<Dish>): Promise<Dish> {
    const response = await this.client.put<Dish>(`/dishes/${id}`, dish);
    return response.data;
  }

  async deleteDish(id: string, restaurantId: string): Promise<void> {
    await this.client.delete(`/dishes/${id}?restaurant_id=${restaurantId}`);
  }

  async updateDishOrder(sectionId: string, dishIds: string[]): Promise<void> {
    await this.client.put(`/sections/${sectionId}/dishes/order`, { dish_ids: dishIds });
  }

  // ======================================================================
  // Métodos para media de platos
  // ======================================================================

  
/**
 * Obtiene medios de un plato por rol específico
 * @param dishId - ID del plato
 * @param role - Rol de los medios (PRIMARY_VIDEO, PRIMARY_IMAGE, GALLERY_IMAGE)
 */
async getMediaByRole(dishId: string, role: string): Promise<DishMedia[]> {
  const response = await this.client.get<{success: boolean, media: DishMedia[]}>(`/dishes/${dishId}/media/role/${role}`);
  return response.data.media || [];
}

/**
 * Actualiza el rol de un medio
 * @param mediaId - ID del medio a actualizar
 * @param dishId - ID del plato al que pertenece
 * @param role - Nuevo rol para el medio
 */
async updateMediaRole(mediaId: string, dishId: string, role: string): Promise<{success: boolean, media: DishMedia}> {
  const response = await this.client.put(`/media/${mediaId}/role`, { 
    role,
    dish_id: dishId
  });
  return response.data;
}

/**
 * Actualiza el orden de los medios en la galería
 * @param dishId - ID del plato 
 * @param mediaIds - Array con IDs de medios en el orden deseado
 */
async updateMediaOrder(dishId: string, mediaIds: string[]): Promise<{success: boolean}> {
  const response = await this.client.put(`/dishes/${dishId}/media/order`, {
    media_ids: mediaIds
  });
  return response.data;
}

/**
 * Sube un medio con rol específico
 * @param formData - FormData con el archivo y metadata
 * @param config - Configuración opcional para la petición
 */
async uploadMediaWithRole(formData: FormData, config?: AxiosRequestConfig): Promise<{success: boolean, media: DishMedia}> {
  const response = await this.client.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config
  });
  return response.data;
}

async getPrimaryVideo(dishId: string): Promise<DishMedia | null> {
  try {
    const response = await this.client.get<{success: boolean, media: DishMedia[]}>(`/dishes/${dishId}/media/role/PRIMARY_VIDEO`);
    return (response.data.media && response.data.media.length > 0) ? response.data.media[0] : null;
  } catch (error) {
    console.error("Error al obtener video principal:", error);
    return null;
  }
}

/**
 * Obtiene la imagen principal/thumbnail de un plato
 * @param dishId - ID del plato
 */
async getPrimaryImage(dishId: string): Promise<DishMedia | null> {
  try {
    const response = await this.client.get<{success: boolean, media: DishMedia[]}>(`/dishes/${dishId}/media/role/PRIMARY_IMAGE`);
    return (response.data.media && response.data.media.length > 0) ? response.data.media[0] : null;
  } catch (error) {
    console.error("Error al obtener imagen principal:", error);
    return null;
  }
}

/**
 * Obtiene las imágenes de galería de un plato
 * @param dishId - ID del plato
 */
async getGalleryImages(dishId: string): Promise<DishMedia[]> {
  try {
    const response = await this.client.get<{success: boolean, media: DishMedia[]}>(`/dishes/${dishId}/media/role/GALLERY_IMAGE`);
    return response.data.media || [];
  } catch (error) {
    console.error("Error al obtener imágenes de galería:", error);
    return [];
  }
}
  async getRestaurantMedia(restaurantId: string): Promise<DishMedia[]> {
    const response = await this.client.get<{success: boolean, media: DishMedia[]}>(`/restaurants/${restaurantId}/media`);
    return response.data.media || [];
  }

  async getDishMedia(dishId: string): Promise<DishMedia[]> {
    const response = await this.client.get<{success: boolean, media: DishMedia[]}>(`/dishes/${dishId}/media`);
    return response.data.media || [];
  }

  async uploadMedia(formData: FormData, config?: AxiosRequestConfig): Promise<{success: boolean, media: DishMedia}> {
    const response = await this.client.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config
    });
    return response.data;
  }

  async setMediaAsPrimary(mediaId: string, dishId: string): Promise<{success: boolean, message: string}> {
    const response = await this.client.put(`/dishes/${dishId}/media/${mediaId}/primary`);
    return response.data;
  }

  async deleteMedia(mediaId: string): Promise<{success: boolean, message: string}> {
    const response = await this.client.delete(`/media/${mediaId}`);
    return response.data;
  }

  async updateMediaInfo(mediaId: string, data: {display_name?: string}): Promise<{success: boolean, media: DishMedia}> {
    const response = await this.client.patch(`/media/${mediaId}`, data);
    return response.data;
  }

  async getMediaStats(restaurantId: string): Promise<{
    total_files: number,
    image_count: number,
    video_count: number,
    storage_used: number,
    storage_limit: number
  }> {
    const response = await this.client.get(`/restaurants/${restaurantId}/media/stats`);
    return response.data;
  }

  // ======================================================================
  // Métodos para traducciones
  // ======================================================================

  async getLanguages(): Promise<Language[]> {
    const response = await this.client.get<{languages: Language[]} | Language[]>('/languages');
    return Array.isArray(response.data) ? response.data : response.data.languages || [];
  }

  async getRestaurantLanguages(restaurantId: string): Promise<RestaurantLanguage[]> {
    const response = await this.client.get<{languages: RestaurantLanguage[]} | RestaurantLanguage[]>(`/restaurants/${restaurantId}/languages`);
    return Array.isArray(response.data) ? response.data : response.data.languages || [];
  }

  // ======================================================================
  // Métodos para alérgenos
  // ======================================================================

// En tu cliente API (packages-api-index.ts)
async getAllergens(): Promise<Allergen[]> {
  try {
    console.log("[apiClient] Obteniendo alérgenos");
    const response = await this.client.get<{success?: boolean, allergens?: Allergen[]} | Allergen[]>('/allergens');
    
    // Analizar la respuesta y extraer los alérgenos
    if (response.data) {
      // Si es un array directamente
      if (Array.isArray(response.data)) {
        console.log(`[apiClient] Recibidos ${response.data.length} alérgenos (formato array)`);
        return response.data;
      }
      // Si tiene propiedad allergens y es un array
      else if (response.data.allergens && Array.isArray(response.data.allergens)) {
        console.log(`[apiClient] Recibidos ${response.data.allergens.length} alérgenos (formato objeto con allergens)`);
        return response.data.allergens;
      }
      // Si es otro formato, mostrar advertencia y devolver array vacío
      else {
        console.warn("[apiClient] Formato de respuesta inesperado para alérgenos:", 
          JSON.stringify(response.data).substring(0, 100) + "...");
        return [];
      }
    }
    
    console.warn("[apiClient] Respuesta vacía al obtener alérgenos");
    return [];
  } catch (error) {
    console.error("[apiClient] Error al obtener alérgenos:", error);
    
    // Intentar un enfoque alternativo si falla
    try {
      console.log("[apiClient] Intentando endpoint alternativo para alérgenos");
      const altResponse = await this.client.get('/system/allergens');
      if (altResponse.data?.allergens && Array.isArray(altResponse.data.allergens)) {
        return altResponse.data.allergens;
      }
    } catch (altError) {
      console.error("[apiClient] Error en intento alternativo para alérgenos:", altError);
    }
    
    return []; // Devolver array vacío como último recurso
  }
}

  async getDishAllergens(dishId: string): Promise<Allergen[]> {
    const response = await this.client.get<{allergens: Allergen[]} | Allergen[]>(`/dishes/${dishId}/allergens`);
    return Array.isArray(response.data) ? response.data : response.data.allergens || [];
  }

  // ======================================================================
  // Métodos para analíticas
  // ======================================================================

  async getDashboardStats(restaurantId: string): Promise<any> {
    const response = await this.client.get(`/dashboard/stats?restaurant_id=${restaurantId}`);
    return response.data;
  }

  async getAnalytics(restaurantId: string, timeRange: string = 'week'): Promise<any> {
    const response = await this.client.get(`/analytics?restaurant_id=${restaurantId}&time_range=${timeRange}`);
    return response.data;
  }

  async getPopularDishes(restaurantId: string, timeRange: string = 'week'): Promise<any> {
    const response = await this.client.get(`/popular-dishes?restaurant_id=${restaurantId}&time_range=${timeRange}`);
    return response.data;
  }

  // ======================================================================
  // Métodos adicionales para reels
  // ======================================================================

  async getRestaurantTheme(restaurantId: string): Promise<Theme | null> {
    try {
      const restaurant = await this.getRestaurant(restaurantId);
      if (!restaurant?.theme_id) {
        return null;
      }
      
      const response = await this.client.get<Theme>(`/themes/${restaurant.theme_id}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo tema del restaurante:', error);
      return null;
    }
  }

  async getRestaurantReelsData(slug: string): Promise<RestaurantReelsData> {
    try {
      // 1. Obtener información del restaurante por slug
      const response = await this.client.get(`/restaurants/by-slug/${slug}`);
      
      // Extraer el restaurante de la respuesta
      const restaurantResponse = response.data;
      const restaurant = restaurantResponse.restaurant || restaurantResponse;
      
      if (!restaurant || !restaurant.id) {
        throw new Error(`No se pudo encontrar el restaurante con slug: ${slug}`);
      }
      
      // 2. Obtener el tema del restaurante
      let theme: Theme | null = null;
      if (restaurant.theme_id) {
        theme = await this.getRestaurantTheme(restaurant.id);
      }
      
      // Tema predeterminado si no existe
      if (!theme) {
        theme = {
          id: 'default',
          name: 'Default Theme',
          primary_color: '#9c27b0',
          secondary_color: '#2196f3',
          text_color: '#ffffff',
          background_color: '#121212',
          font_family: 'Inter, system-ui, sans-serif',
          is_premium: false
        };
      }
      
      // 3. Obtener datos del restaurant y estructurarlos
      const reelsResponse = await this.client.get(`/restaurants/${slug}/reels`);
      const reelsData = reelsResponse.data;
      
      // Inicializar el objeto de resultado
      const result: RestaurantReelsData = {
        restaurant: { ...restaurant, theme },
        sections: reelsData.sections || [],
        dishesBySection: {},
        languages: reelsData.languages || []
      };
      
      // 4. Organizar platos por sección
      if (reelsData.sections) {
        reelsData.sections.forEach((section: Section, index: number) => {
          result.dishesBySection[index] = {
            dishes: section.dishes || []
          };
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error obteniendo datos del restaurante para reels:', error);
      throw new Error(`Error cargando datos para reels: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Crea una instancia del cliente API con la URL base especificada
 * @param baseURL - URL base para todas las solicitudes API
 * @returns Instancia configurada del cliente API
 */
export const createApiClient = (baseURL: string = DEFAULT_API_URL): ApiClient => {
  return new ApiClient(baseURL);
};

/**
 * Configuración predeterminada para consultas React Query
 * @returns Objeto con la configuración recomendada
 */
export const getQueryDefaults = () => QUERY_CONFIG;