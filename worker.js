// workers/worker.js (tu archivo principal) - CORREGIDO

import { handleDashboardRequests } from './workerDashboard.js';
import { handleAuthRequests } from './workerAuthentication.js';
// import { handleAnalyticsRequests } from './workerAnalytics.js';
// import { handleAllergensRequests } from './workerAllergens.js';
// import { handleMenuRequests } from './workerMenus.js';
import { handleDishRequests } from './workerDishes.js';
import { handleSectionRequests } from './workerSections.js';
import { handleRestaurantRequests } from './workerRestaurants.js';
// import { handleReelsRequests } from './workerReels.js';
import { handleMediaRequests } from './workerMedia.optimized.js';
// import { handleTracking } from './workerTracking.js'; 
// import { handleLandingRequests } from './workerLanding.js';
import { handleLandingAdminRequests } from './workerLandingAdmin.js';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function createResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...corsHeaders
        }
    });
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        try {
            const url = new URL(request.url);
            console.log(`[Worker] ${request.method} ${url.pathname}`);

            // AUTH
            if (url.pathname.startsWith('/auth')) {
                const authResponse = await handleAuthRequests(request, env);
                if (authResponse) return authResponse;
            }

            // DASHBOARD
            if (url.pathname.startsWith('/dashboard')) {
                const dashboardResponse = await handleDashboardRequests(request, env);
                if (dashboardResponse) return dashboardResponse;
            }

            // DISHES
            if (url.pathname.startsWith('/dishes')) {
                const dishesResponse = await handleDishRequests(request, env);
                if (dishesResponse) return dishesResponse;
            }

            // SECTIONS
            if (url.pathname.startsWith('/sections')) {
                const sectionsResponse = await handleSectionRequests(request, env);
                if (sectionsResponse) return sectionsResponse;
            }

            // RESTAURANTS
            if (url.pathname.startsWith('/restaurants')) {
                const restaurantsResponse = await handleRestaurantRequests(request, env);
                if (restaurantsResponse) return restaurantsResponse;
            }

            // MEDIA
            if (url.pathname.startsWith('/media')) {
                const mediaResponse = await handleMediaRequests(request, env);
                if (mediaResponse) return mediaResponse;
            }

            // LANDING ADMIN
            if (url.pathname.includes('/admin/landing')) {
                console.log('[Worker] → Landing Admin');
                const adminLandingResponse = await handleLandingAdminRequests(request, env);
                if (adminLandingResponse) return adminLandingResponse;
            }

            return createResponse({ success: false, message: "Ruta no encontrada" }, 404);

        } catch (error) {
            console.error("[Worker] Error general:", error);
            return createResponse({
                success: false,
                message: "Error en el servidor: " + error.message
            }, 500);
        }
    }
};
