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
// import { handleLandingAdminRequests } from './workerLandingAdmin.js';

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

            // ALÉRGENOS
            // if (url.pathname === "/allergens") {
            //   console.log("[Worker] → Allergens");
            //   const allergensResponse = await handleAllergensRequests(request, env);
            //   if (allergensResponse) return allergensResponse;
            // }

            // TRACKING
            // if (url.pathname.startsWith('/track/')) {
            //   console.log('[Worker] → Tracking');
            //   const trackingResponse = await handleTracking(request, env, ctx);
            //   if (trackingResponse) return trackingResponse;
            // }

            // ⭐ LANDING PÚBLICO (debe ir ANTES de restaurants y landing-sections)
            // if (url.pathname.match(/^\/restaurants\/[^/]+\/landing$/)) {
            //   console.log('[Worker] → Landing (público)');
            //   const landingResponse = await handleLandingRequests(request, env);
            //   if (landingResponse) return landingResponse;
            // }

            // LANDING ADMIN
            // if (url.pathname.includes('/admin/landing')) {
            //   console.log('[Worker] → Landing Admin');
            //   const adminLandingResponse = await handleLandingAdminRequests(request, env);
            //   if (adminLandingResponse) return adminLandingResponse;
            // }

            // LANDING SECTIONS (config)
            // if (url.pathname.includes('/landing-sections')) {

        } catch (error) {
            console.error("[Worker] Error general:", error);
            return createResponse({
                success: false,
                message: "Error en el servidor: " + error.message
            }, 500);
        }
    }
};
