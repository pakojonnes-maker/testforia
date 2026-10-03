// apps/client/src/lib/apiClient.ts
//
// Llamadas de la página de reservas. Antes envolvía @visualtaste/api (axios, ~95 KB sin
// comprimir) y lo metía en el arranque de la carta para un solo GET; ahora es fetch.
// Los errores conservan la forma de axios que lee ReservePage (err.response.status).

import { apiRequest } from './api';

export { API_URL } from './api';

export const apiClient = {
  reservations: {
    getConfig(restaurantId: string) {
      return apiRequest(`/reservations/config/${restaurantId}`);
    },
    checkAvailability(restaurantId: string, date: string, partySize: number) {
      const params = new URLSearchParams({ restaurant_id: restaurantId, date, party_size: String(partySize) });
      return apiRequest(`/reservations/availability?${params}`);
    },
    getCalendar(restaurantId: string, startDate?: string, endDate?: string) {
      const params = new URLSearchParams({ restaurant_id: restaurantId });
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      return apiRequest(`/reservations/availability/calendar?${params}`);
    },
    createReservation(data: Record<string, unknown>) {
      return apiRequest('/reservations', { method: 'POST', json: data });
    },
    joinWaitlist(data: Record<string, unknown>) {
      return apiRequest('/reservations/waitlist', { method: 'POST', json: data });
    },
    getByToken(token: string) {
      return apiRequest(`/reservations/by-token/${token}`);
    },
    cancelByToken(token: string, reason?: string) {
      return apiRequest('/reservations/cancel-by-token', { method: 'POST', json: { token, reason } });
    },
  },
};

export default apiClient;
