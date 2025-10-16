// apps/client/src/lib/apiClient.ts

import { createApiClient, getQueryDefaults } from "@visualtaste/api";
import type { DishMedia, RestaurantReelsData } from "@visualtaste/api";

// ======================================================================
// CONFIGURACIÓN
// ======================================================================

// API URL desde variables de entorno o por defecto
const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

// Crear instancia del cliente API base
const baseApiClient = createApiClient(API_URL);

// ======================================================================
// TIPOS ESPECÍFICOS PARA EL CLIENTE
// ======================================================================

export interface RestaurantConfig {
  template: {
    id: string;
    name: string;
  };
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
  features: {
    showNutritionalInfo: boolean;
    showAllergens: boolean;
    enableReviews: boolean;
  };
}

// ======================================================================
// CLIENTE API EXTENDIDO
// ======================================================================

export const apiClient = {
  // Incluir todos los métodos del cliente base
  ...baseApiClient,
  
  // Acceso directo al cliente HTTP
  client: baseApiClient.client,

  // ======================================================================
  // MÉTODOS DE TRACKING
  // ======================================================================

  tracking: {
    /**
     * Iniciar una nueva sesión de tracking
     */
    async startSession(sessionData: {
      restaurantId: string;
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
      languages?: string;
      timezone?: string;
    }) {
      console.log('🚀 [apiClient.tracking] Iniciando sesión:', sessionData);
      
      try {
        const response = await baseApiClient.client.post('/track/session/start', sessionData);
        console.log('✅ [apiClient.tracking] Sesión iniciada:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ [apiClient.tracking] Error iniciando sesión:', error);
        throw error;
      }
    },

    /**
     * Finalizar sesión de tracking
     */
    async endSession(sessionData: {
      sessionId: string;
      startedAt: string;
      endedAt: string;
    }) {
      console.log('🔚 [apiClient.tracking] Finalizando sesión:', sessionData.sessionId);
      
      try {
        // Intentar sendBeacon primero (más confiable para cierre de página)
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });
          const sent = navigator.sendBeacon(`${API_URL}/track/session/end`, blob);
          if (sent) {
            console.log('✅ [apiClient.tracking] Sesión finalizada con sendBeacon');
            return { success: true };
          }
        }
        
        // Fallback a fetch normal
        const response = await baseApiClient.client.post('/track/session/end', sessionData);
        console.log('✅ [apiClient.tracking] Sesión finalizada con fetch:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ [apiClient.tracking] Error finalizando sesión:', error);
        throw error;
      }
    },

    /**
     * Enviar eventos de tracking
     */
    async sendEvents(eventsData: {
      sessionId: string;
      restaurantId: string;
      userid?: string;
      events: Array<{
        type: string;
        entityId?: string;
        entityType?: string;
        value?: any;
        ts?: string;
      }>;
    }) {
      console.log('📊 [apiClient.tracking] Enviando eventos:', eventsData.events.length, 'eventos');
      
      try {
        const response = await baseApiClient.client.post('/track/events', eventsData);
        console.log('✅ [apiClient.tracking] Eventos enviados:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ [apiClient.tracking] Error enviando eventos:', error);
        throw error;
      }
    },

    /**
     * Enviar eventos con sendBeacon (para mejor rendimiento)
     */
    async sendEventsBeacon(eventsData: {
      sessionId: string;
      restaurantId: string;
      userid?: string;
      events: Array<{
        type: string;
        entityId?: string;
        entityType?: string;
        value?: any;
        ts?: string;
      }>;
    }) {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(eventsData)], { type: 'application/json' });
        const sent = navigator.sendBeacon(`${API_URL}/track/events`, blob);
        
        if (sent) {
          console.log('✅ [apiClient.tracking] Eventos enviados con sendBeacon');
          return { success: true };
        }
      }
      
      // Fallback a método normal
      return this.sendEvents(eventsData);
    }
  },

  // ======================================================================
  // CONFIGURACIÓN DE REELS (SISTEMA DE PLANTILLAS)
  // ======================================================================

  /**
   * Obtiene la configuración del restaurante para el sistema de reels
   */
// En apiClient.ts - CORREGIR el método getRestaurantConfig

async getRestaurantConfig(slug: string): Promise<RestaurantConfig> {
  console.log(`🎨 [apiClient] Obteniendo configuración para: ${slug}`);
  
  try {
    // Intentar obtener configuración específica del restaurante
    const response = await baseApiClient.client.get(`/restaurants/${slug}/config`);
    
    if (response?.data?.success && response.data.config) {
      console.log('✅ [apiClient] Configuración específica obtenida:', response.data.config);
      return response.data.config; // ✅ CORREGIDO: extraer config del wrapper
    }
    
    throw new Error('No hay configuración específica');
    
  } catch (error) {
    console.warn(`⚠️ [apiClient] Configuración específica no disponible, usando configuración por defecto`);
    console.warn(`⚠️ [apiClient] Error:`, error instanceof Error ? error.message : error);
    return this.getDefaultConfig();
  }
},


  /**
   * Devuelve la configuración por defecto para template Classic
   */
  getDefaultConfig(): RestaurantConfig {
    const config = {
      template: {
        id: 'tpl_classic',
        name: 'Classic'
      },
      branding: {
        primaryColor: '#FF6B6B',
        secondaryColor: '#4ECDC4'
      },
      features: {
        showNutritionalInfo: true,
        showAllergens: true,
        enableReviews: false
      }
    };
    
    console.log('🎨 [apiClient] Usando configuración por defecto:', config);
    return config;
  },

  // ======================================================================
  // DATOS DE REELS
  // ======================================================================

  /**
   * Obtiene datos completos del restaurante para reels
   * Usa el método del cliente base que ya funciona correctamente
   */
  async getRestaurantReelsData(slug: string): Promise<RestaurantReelsData> {
    console.log('🚀 [apiClient] Cargando datos de reels para:', slug);

    try {
      // Usar el método del cliente base que ya funciona correctamente
      const data = await baseApiClient.getRestaurantReelsData(slug);
      console.log('✅ [apiClient] Datos de reels obtenidos:', {
        restaurant: data.restaurant?.name || 'N/A',
        sections: data.sections?.length || 0,
        languages: data.languages?.length || 0
      });
      return data;
    } catch (error) {
      console.error('❌ [apiClient] Error obteniendo datos de reels:', error);
      throw error;
    }
  },

  // ======================================================================
  // HELPERS PARA MEDIA
  // ======================================================================

  /**
   * Obtiene medios de un plato con placeholders si no existen
   */
  async getMediaWithPlaceholders(dishId: string) {
    try {
      const allMedia = await baseApiClient.getDishMedia(dishId);
      
      const primaryVideo = allMedia.find((m: DishMedia) => m.role === 'PRIMARY_VIDEO');
      const primaryImage = allMedia.find((m: DishMedia) => m.role === 'PRIMARY_IMAGE');
      const galleryImages = allMedia.filter((m: DishMedia) => m.role === 'GALLERY_IMAGE');
      
      return {
        primaryVideo,
        primaryImage,
        galleryImages
      };
    } catch (error) {
      console.error(`[apiClient] Error al obtener medios para plato ${dishId}:`, error);
      return {
        primaryVideo: null,
        primaryImage: null,
        galleryImages: []
      };
    }
  },

  /**
   * Verifica si un plato tiene medios primarios
   */
  async hasPrimaryMedia(dishId: string): Promise<boolean> {
    try {
      const { primaryVideo, primaryImage } = await this.getMediaWithPlaceholders(dishId);
      return !!(primaryVideo || primaryImage);
    } catch (error) {
      console.error(`[apiClient] Error verificando medios para plato ${dishId}:`, error);
      return false;
    }
  },

  // ======================================================================
  // CONFIGURACIÓN DE REACT QUERY
  // ======================================================================
  
  queryDefaults: getQueryDefaults()
};

// ======================================================================
// EXPORTAR TIPOS
// ======================================================================
export type { RestaurantConfig, DishMedia, RestaurantReelsData };

// Exportar cliente por defecto
export default apiClient;
