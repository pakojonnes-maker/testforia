// src/utils/analytics.tsx
import { useDishTracking } from '../providers/TrackingAndPushProvider';
import { apiClient } from '../lib/apiClient';

// Hook para usar analytics
export function useAnalytics() {
  return useDishTracking();
}

// Hook para obtener datos de analytics
export function useAnalyticsData() {
  return {
    getDailyAnalytics: apiClient.tracking.getDailyAnalytics,
    getDishAnalytics: apiClient.tracking.getDishAnalytics,
    aggregateDailyAnalytics: apiClient.tracking.aggregateDailyAnalytics
  };
}

// Funciones de conveniencia (mantener compatibilidad)
export async function trackDishView(_dishId: string) {
  console.warn('⚠️ [analytics] trackDishView deprecated, use useDishTracking hook instead');
  // Esta función ahora es solo para compatibilidad
}

export async function toggleFavorite(_dishId: string, _set: boolean = true) {
  console.warn('⚠️ [analytics] toggleFavorite deprecated, use useDishTracking hook instead');
  // Esta función ahora es solo para compatibilidad
}

export async function shareDish(_dishId: string, _platform: string) {
  console.warn('⚠️ [analytics] shareDish deprecated, use useDishTracking hook instead');
  // Esta función ahora es solo para compatibilidad
}

// Funciones utilitarias actualizadas
export function getShareUrl(dishId: string, restaurantSlug: string) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/${restaurantSlug}?dish=${dishId}&utm_source=share&utm_medium=social`;
}

export function getShareText(dishName: string, restaurantName: string) {
  return `¡Mira este delicioso plato "${dishName}" de ${restaurantName}! 🍽️`;
}

// Nueva función para obtener estadísticas
export async function getDishStatistics(restaurantId: string) {
  try {
    const response = await apiClient.tracking.getDishAnalytics(restaurantId);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Error obteniendo estadísticas');
  } catch (error) {
    console.error('Error obteniendo estadísticas de platos:', error);
    throw error;
  }
}

// Nueva función para obtener analytics diarios
export async function getDailyStatistics(
  restaurantId: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const response = await apiClient.tracking.getDailyAnalytics({
      restaurant_id: restaurantId,
      start_date: startDate,
      end_date: endDate
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Error obteniendo analytics diarios');
  } catch (error) {
    console.error('Error obteniendo analytics diarios:', error);
    throw error;
  }
}
