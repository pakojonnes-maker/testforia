// apps/client/src/lib/apiClient.ts

import { createApiClient, getQueryDefaults, ApiClient } from "@visualtaste/api";
import type { DishMedia, RestaurantReelsData } from "@visualtaste/api";

// API URL desde variables de entorno o por defecto
const API_URL = import.meta.env.VITE_API_URL || "https://visualtasteworker.franciscotortosaestudios.workers.dev";

// Crear instancia del cliente API
const baseApiClient = createApiClient(API_URL);

// Extender con métodos específicos para la aplicación cliente
export const apiClient = {
  // Incluir todos los métodos del cliente base
  ...baseApiClient,
  
  // Acceso directo al cliente HTTP
  client: baseApiClient.client,

  // ✅ NUEVO: Métodos de Tracking
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

// apps/client/src/lib/apiClient.ts - CORREGIR CONSTRUCCIÓN MANUAL

// apps/client/src/lib/apiClient.ts - CORREGIR el manejo de tipos
 async getReelsConfig(slug: string) {
    const response = await fetch(`${this.baseURL}/restaurants/${slug}/reels/config`);
    if (!response.ok) throw new Error('Failed to fetch reels config');
    return response.json();
  },

  async getReelTemplates() {
    const response = await fetch(`${this.baseURL}/reel-templates`);
    if (!response.ok) throw new Error('Failed to fetch reel templates');
    return response.json();
  },

  async updateReelsConfig(restaurantId: string, config: any, token: string) {
    const response = await fetch(`${this.baseURL}/admin/restaurants/${restaurantId}/reels/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error('Failed to update reels config');
    return response.json();
  },


async getRestaurantReelsData(slug: string) {
  console.log('🚀 [apiClient] Cargando datos para:', slug);

  try {
    // ESTRATEGIA 1: Endpoint directo optimizado
    const response = await this.client(`/restaurants/${slug}/reels`);
    
    if (response?.data) {
      console.log('✅ [apiClient] Datos obtenidos del endpoint directo');
      return this.processReelsData(response.data);
    }

  } catch (directError) {
    console.log('⚠️ [apiClient] Endpoint directo falló, construyendo datos...');
    
    // ESTRATEGIA 2: Construcción manual COMPLETA Y CORRECTA
    try {
      const restaurantResponse = await this.client(`/restaurants/by-slug/${slug}`);
        console.log('🔍 [apiClient] Raw restaurant response:', restaurantResponse?.data);

      const restaurant = restaurantResponse?.data?.restaurant || restaurantResponse?.data;
      
        
  // 🚨 DEBUG TEMPORAL  
  console.log('🔍 [apiClient] Extracted restaurant:', {
    id: restaurant?.id,
    name: restaurant?.name,
    slug: restaurant?.slug,
    fullObject: restaurant
  });


      if (!restaurant?.id) {
        throw new Error(`Restaurante '${slug}' no encontrado`);
      }

      console.log('🔧 [apiClient] Construyendo menú manual para:', restaurant.id);

      // 🎯 PASO 2: Obtener menú principal
      let menuResponse;
      try {
        menuResponse = await this.client(`/restaurants/${restaurant.id}/menus`);
      } catch (menuError) {
        console.warn('⚠️ [apiClient] Error obteniendo menús:', menuError.message);
      }

      // 🚨 FIX: Manejar correctamente la estructura de respuesta de menús
      console.log('📋 [apiClient] Respuesta de menús:', menuResponse?.data);
      
      let menus = [];
      if (menuResponse?.data) {
        // Si es un array directo
        if (Array.isArray(menuResponse.data)) {
          menus = menuResponse.data;
        }
        // Si es un objeto con propiedad menus
        else if (menuResponse.data.menus && Array.isArray(menuResponse.data.menus)) {
          menus = menuResponse.data.menus;
        }
        // Si es un objeto con results
        else if (menuResponse.data.results && Array.isArray(menuResponse.data.results)) {
          menus = menuResponse.data.results;
        }
        // Si es un objeto que contiene un menú único
        else if (menuResponse.data.id) {
          menus = [menuResponse.data];
        }
      }

      console.log('📋 [apiClient] Menús procesados:', menus.length, 'encontrados');

      if (!menus || menus.length === 0) {
        console.warn('⚠️ [apiClient] No se encontró menú, usando datos básicos de BD');
        
        // 🎯 FALLBACK: Intentar obtener platos directamente del restaurante
        try {
          const dishesResponse = await this.client(`/restaurants/${restaurant.id}/dishes`);
          const dishesData = dishesResponse?.data || [];
          
          console.log('🍽️ [apiClient] Platos encontrados directamente:', dishesData.length);
          
          if (dishesData.length > 0) {
            // Crear una sección única con todos los platos
            const result = {
              restaurant: {
                ...restaurant,
                theme: restaurant.theme || {
                  primary_color: '#9c27b0',
                  secondary_color: '#2196f3',
                  text_color: '#000000',
                  background_color: '#ffffff',
                  font_family: 'Roboto, sans-serif'
                }
              },
              sections: [{
                id: 'general',
                name: 'Nuestro Menú',
                description: 'Todos nuestros platos',
                orderindex: 0,
                position: 0
              }],
              dishesBySection: {
                0: {
                  dishes: dishesData.map(dish => ({
                    id: dish.id,
                    name: dish.name || dish.translations?.name?.es || 'Plato sin nombre',
                    description: dish.description || dish.translations?.description?.es || '',
                    price: dish.price || 0,
                    discountprice: dish.discountprice,
                    discountactive: dish.discountactive || false,
                    isvegetarian: dish.isvegetarian || false,
                    isvegan: dish.isvegan || false,
                    isglutenfree: dish.isglutenfree || false,
                    isnew: dish.isnew || false,
                    isfeatured: dish.isfeatured || false,
                    media: dish.media && dish.media.length > 0 ? dish.media : [{
                      id: `placeholder-${dish.id}`,
                      type: 'image',
                      url: `https://via.placeholder.com/400x600/9c27b0/ffffff?text=${encodeURIComponent((dish.name || 'Plato').substring(0, 10))}`,
                      role: 'PRIMARY_IMAGE'
                    }],
                    allergens: dish.allergens || [],
                    translations: {
                      name: { es: dish.name || dish.translations?.name?.es || 'Plato sin nombre' },
                      description: { es: dish.description || dish.translations?.description?.es || '' }
                    }
                  }))
                }
              },
              languages: [{ code: 'es', name: 'Español' }]
            };

            console.log('✅ [apiClient] Menú creado con platos directos:', {
              restaurant: result.restaurant.name,
              sectionsCount: result.sections.length,
              totalDishes: result.dishesBySection[0].dishes.length
            });

            return result;
          }
        } catch (dishesError) {
          console.warn('⚠️ [apiClient] No se pudieron obtener platos directamente:', dishesError.message);
        }

        // ÚLTIMO RECURSO: Datos vacíos pero estructura válida
        return {
          restaurant: {
            ...restaurant,
            theme: restaurant.theme || {
              primary_color: '#9c27b0',
              secondary_color: '#2196f3',
              text_color: '#000000',
              background_color: '#ffffff',
              font_family: 'Roboto, sans-serif'
            }
          },
          sections: [],
          dishesBySection: {},
          languages: [{ code: 'es', name: 'Español' }]
        };
      }

      const mainMenu = menus.find(m => m.isdefault) || menus[0];
      console.log('🎯 [apiClient] Menú seleccionado:', mainMenu.name || mainMenu.id);

      // 🎯 PASO 3: Obtener secciones del menú
      let sectionsResponse;
      try {
        sectionsResponse = await this.client(`/menus/${mainMenu.id}/sections`);
      } catch (sectionsError) {
        console.warn('⚠️ [apiClient] Error obteniendo secciones:', sectionsError.message);
      }

      // Manejar estructura de secciones similar a menús
      let sectionsData = [];
      if (sectionsResponse?.data) {
        if (Array.isArray(sectionsResponse.data)) {
          sectionsData = sectionsResponse.data;
        } else if (sectionsResponse.data.sections && Array.isArray(sectionsResponse.data.sections)) {
          sectionsData = sectionsResponse.data.sections;
        } else if (sectionsResponse.data.results && Array.isArray(sectionsResponse.data.results)) {
          sectionsData = sectionsResponse.data.results;
        }
      }

      console.log('📂 [apiClient] Secciones encontradas:', sectionsData.length);
      
      if (!sectionsData.length) {
        console.warn('⚠️ [apiClient] No se encontraron secciones en el menú');
        // Volver al fallback anterior
        return {
          restaurant: {
            ...restaurant,
            theme: restaurant.theme || {
              primary_color: '#9c27b0',
              secondary_color: '#2196f3',
              text_color: '#000000',
              background_color: '#ffffff',
              font_family: 'Roboto, sans-serif'
            }
          },
          sections: [],
          dishesBySection: {},
          languages: [{ code: 'es', name: 'Español' }]
        };
      }

      // 🎯 PASO 4: Obtener platos de cada sección
      const sections = [];
      const dishesBySection = {};

      for (let i = 0; i < sectionsData.length; i++) {
        const section = sectionsData[i];
        
        // Agregar sección
        sections.push({
          id: section.id,
          name: section.name || section.translations?.name?.es || `Sección ${i + 1}`,
          description: section.description || section.translations?.description?.es || '',
          orderindex: section.orderindex || i,
          position: section.position || i
        });

        // Obtener platos de la sección
        let dishesResponse;
        try {
          dishesResponse = await this.client(`/sections/${section.id}/dishes`);
        } catch (dishesError) {
          console.warn(`⚠️ [apiClient] Error obteniendo platos para sección ${section.id}:`, dishesError.message);
        }

        // Manejar estructura de platos
        let dishesData = [];
        if (dishesResponse?.data) {
          if (Array.isArray(dishesResponse.data)) {
            dishesData = dishesResponse.data;
          } else if (dishesResponse.data.dishes && Array.isArray(dishesResponse.data.dishes)) {
            dishesData = dishesResponse.data.dishes;
          } else if (dishesResponse.data.results && Array.isArray(dishesResponse.data.results)) {
            dishesData = dishesResponse.data.results;
          }
        }

        console.log(`🍽️ [apiClient] Platos en sección ${section.name}:`, dishesData.length);
        
        // Procesar platos
        const processedDishes = dishesData.map(dish => ({
          id: dish.id,
          name: dish.name || dish.translations?.name?.es || 'Plato sin nombre',
          description: dish.description || dish.translations?.description?.es || '',
          price: dish.price || 0,
          discountprice: dish.discountprice,
          discountactive: dish.discountactive || false,
          isvegetarian: dish.isvegetarian || false,
          isvegan: dish.isvegan || false,
          isglutenfree: dish.isglutenfree || false,
          isnew: dish.isnew || false,
          isfeatured: dish.isfeatured || false,
          media: dish.media && dish.media.length > 0 ? dish.media : [{
            id: `placeholder-${dish.id}`,
            type: 'image',
            url: `https://via.placeholder.com/400x600/9c27b0/ffffff?text=${encodeURIComponent((dish.name || 'Plato').substring(0, 10))}`,
            role: 'PRIMARY_IMAGE'
          }],
          allergens: dish.allergens || [],
          translations: {
            name: { es: dish.name || dish.translations?.name?.es || 'Plato sin nombre' },
            description: { es: dish.description || dish.translations?.description?.es || '' }
          }
        }));

        dishesBySection[i] = {
          dishes: processedDishes
        };
      }

      const result = {
        restaurant: {
          ...restaurant,
          theme: restaurant.theme || {
            primary_color: '#9c27b0',
            secondary_color: '#2196f3',
            text_color: '#000000',
            background_color: '#ffffff',
            font_family: 'Roboto, sans-serif'
          }
        },
        sections: sections,
        dishesBySection: dishesBySection,
        languages: [{ code: 'es', name: 'Español' }]
      };

      console.log('✅ [apiClient] Datos construidos manualmente:', {
        restaurant: result.restaurant.name,
        sectionsCount: result.sections.length,
        totalDishes: Object.values(result.dishesBySection).reduce((sum, section) => sum + (section.dishes?.length || 0), 0)
      });

      return result;

    } catch (constructError) {
      console.error('❌ [apiClient] Error en construcción manual:', constructError);
      throw new Error(`No se pudo cargar el restaurante '${slug}': ${constructError.message}`);
    }
  }
},


  // Helper para procesar datos
  processReelsData(data: any) {
    if (!data || data.success === false) {
      throw new Error(data?.message || "Error en los datos recibidos");
    }
    
    const result = {
      restaurant: data.restaurant,
      sections: data.sections || [],
      dishesBySection: {} as any,
      languages: data.languages || [{ code: 'es', name: 'Español' }]
    };
    
    // Organizar platos por secciones
    (data.sections || []).forEach((section: any, index: number) => {
      result.dishesBySection[index] = {
        dishes: section.dishes || []
      };
      
      // Limpiar dishes de sections para evitar duplicación
      if (result.sections[index]?.dishes) {
        delete result.sections[index].dishes;
      }
    });
    
    return result;
  },
  
  async getMediaWithPlaceholders(dishId) {
    try {
      const allMedia = await baseApiClient.getDishMedia(dishId);
      
      const primaryVideo = allMedia.find(m => m.role === 'PRIMARY_VIDEO');
      const primaryImage = allMedia.find(m => m.role === 'PRIMARY_IMAGE');
      const galleryImages = allMedia.filter(m => m.role === 'GALLERY_IMAGE');
      
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
  
  queryDefaults: getQueryDefaults()
};


