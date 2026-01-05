// workers/worker.js (tu archivo principal) - CORREGIDO

import { handleDashboardRequests } from './workerDashboard.js';
import { handleAuthRequests } from './workerAuthentication.js';
import { handleAnalyticsRequests } from './workerAnalytics.js';
import { handleAllergensRequests } from './workerAllergens.js';
import { handleMenuRequests } from './workerMenus.js';
import { handleDishRequests } from './workerDishes.js';
import { handleSectionRequests } from './workerSections.js';
import { handleRestaurantRequests } from './workerRestaurants.js';
import { handleReelsRequests, handleLoyaltyRequests } from './workerReels.js';
import { handleMediaRequests } from './workerMedia.js';
import { handleTracking } from './workerTracking.js';
import { handleLandingRequests } from './workerLanding.js';
import { handleLandingAdminRequests } from './workerLandingAdmin.js';
import { handleMarketingRequests } from './workerMarketing.js';
import { handleReservationRequests } from './workerReservations.js';
import { handleDeliveryRequests } from './workerDelivery.js';


// CORS - Dominios permitidos
const ALLOWED_ORIGINS = [
    'https://admin.visualtastes.com',
    'https://menu.visualtastes.com',
    'https://visualtastes.com',
    'http://localhost:5173',  // Dev cliente
    'http://localhost:5174',  // Dev admin
    'http://menu.localhost:5173',
    'http://admin.localhost:5174'
];

function getCorsHeaders(request) {
    const origin = request?.headers?.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
}

function createResponse(body, status = 200, request = null) {
    return new Response(JSON.stringify(body), {
        status,
        headers: getCorsHeaders(request)
    });
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: getCorsHeaders(request)
            });
        }

        try {
            const url = new URL(request.url);
            console.log(`[Worker] ${request.method} ${url.pathname}`);



            // ALÉRGENOS
            if (url.pathname === "/allergens") {
                console.log("[Worker] → Allergens");
                const allergensResponse = await handleAllergensRequests(request, env);
                if (allergensResponse) return allergensResponse;
            }

            // TRACKING
            if (url.pathname.startsWith('/track/')) {
                console.log('[Worker] → Tracking');
                const trackingResponse = await handleTracking(request, env, ctx);
                if (trackingResponse) return trackingResponse;
            }

            // ⭐ LANDING PÚBLICO (debe ir ANTES de restaurants y landing-sections)
            if (url.pathname.match(/^\/restaurants\/[^/]+\/landing$/)) {
                console.log('[Worker] → Landing (público)');
                const landingResponse = await handleLandingRequests(request, env);
                if (landingResponse) return landingResponse;
            }

            // LANDING ADMIN
            if (url.pathname.includes('/admin/landing')) {
                console.log('[Worker] → Landing Admin');
                const adminLandingResponse = await handleLandingAdminRequests(request, env);
                if (adminLandingResponse) return adminLandingResponse;
            }

            // LANDING SECTIONS (config)
            if (url.pathname.includes('/landing-sections')) {
                console.log('[Worker] → Landing Sections');
                const landingResponse = await handleLandingRequests(request, env);
                if (landingResponse) return landingResponse;
            }

            // DELIVERY
            const deliveryResponse = await handleDeliveryRequests(request.clone(), env);
            if (deliveryResponse) return deliveryResponse;

            // MARKETING (Leads)
            const marketingResponse = await handleMarketingRequests(request.clone(), env);
            if (marketingResponse) return marketingResponse;



            // RESERVATIONS
            const reservationsResponse = await handleReservationRequests(request.clone(), env);
            if (reservationsResponse) return reservationsResponse;

            // MEDIA
            const mediaResponse = await handleMediaRequests(request.clone(), env);
            if (mediaResponse) return mediaResponse;

            // REELS
            const reelsResponse = await handleReelsRequests(request.clone(), env);
            if (reelsResponse) return reelsResponse;

            // LOYALTY (Client)
            const loyaltyResponse = await handleLoyaltyRequests(request.clone(), env);
            if (loyaltyResponse) return loyaltyResponse;

            // RESTAURANTES (ahora va DESPUÉS de landing)
            const restaurantResponse = await handleRestaurantRequests(request.clone(), env);
            if (restaurantResponse) return restaurantResponse;


            // AUTENTICACIÓN
            const authResponse = await handleAuthRequests(request, env);
            if (authResponse) return authResponse;

            // ANALYTICS
            const analyticsResponse = await handleAnalyticsRequests(request, env);
            if (analyticsResponse) return analyticsResponse;

            // DASHBOARD
            const dashboardResponse = await handleDashboardRequests(request, env);
            if (dashboardResponse) return dashboardResponse;

            // DISHES
            const dishesResponse = await handleDishRequests(request, env);
            if (dishesResponse) return dishesResponse;

            // SECTIONS
            const sectionsResponse = await handleSectionRequests(request, env);
            if (sectionsResponse) return sectionsResponse;

            // MENUS
            const menusResponse = await handleMenuRequests(request, env);
            if (menusResponse) return menusResponse;

            // NOT FOUND
            return createResponse({
                success: false,
                message: "Endpoint no encontrado"
            }, 404);

        } catch (error) {
            console.error("[Worker] Error general:", error);
            return createResponse({
                success: false,
                message: "Error en el servidor: " + error.message
            }, 500);
        }
    }
};
