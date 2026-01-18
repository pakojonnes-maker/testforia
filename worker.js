// workers/worker.js - MIDDLEWARE CENTRALIZADO
// ============================================================================
// API Gateway con autenticación y CORS centralizados
// ============================================================================

import { handleDashboardRequests } from './workerDashboard.js';
import { handleAuthRequests, verifyJWT } from './workerAuthentication.js';
import { handleAnalyticsRequests } from './workerAnalytics.js';
import { handleAllergensRequests } from './workerAllergens.js';
import { handleMenuRequests } from './workerMenus.js';
import { handleDishRequests } from './workerDishes.js';
import { handleSectionRequests } from './workerSections.js';
import { handleRestaurantRequests } from './workerRestaurants.js';
import { handleReelsRequests, handleLoyaltyRequests } from './workerReels.js';
import { handleMediaRequests } from './workerMedia.optimized.js';
import { handleTracking } from './workerTracking.js';
import { handleLandingRequests } from './workerLanding.js';
import { handleLandingAdminRequests } from './workerLandingAdmin.js';
import { handleMarketingRequests } from './workerMarketing.js';
import { handleReservationRequests } from './workerReservations.js';
import { handleDeliveryRequests } from './workerDelivery.js';

// ============================================================================
// CORS - Dominios permitidos (CENTRALIZADO)
// ============================================================================
const ALLOWED_ORIGINS = [
    'https://admin.visualtastes.com',
    'https://menu.visualtastes.com',
    'https://visualtastes.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://menu.localhost:5173',
    'http://admin.localhost:5174'
];

function getCorsHeaders(request) {
    const origin = request?.headers?.get('Origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
}

function createResponse(body, status = 200, request = null) {
    return new Response(JSON.stringify(body), {
        status,
        headers: getCorsHeaders(request)
    });
}

/**
 * Wrapper para añadir CORS headers correctos a respuestas de sub-handlers
 */
function addCorsHeaders(response, request) {
    if (!response) return null;

    const corsHeaders = getCorsHeaders(request);
    const newHeaders = new Headers(response.headers);

    // Sobreescribir headers CORS con los correctos
    Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
    });

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
    });
}

// ============================================================================
// RUTAS PÚBLICAS (no requieren autenticación)
// ============================================================================
const PUBLIC_ROUTES = [
    // Auth
    { method: 'POST', pattern: /^\/auth\/login$/ },
    { method: 'GET', pattern: /^\/auth\/me$/ },

    // Tracking y Analytics públicos
    { method: 'ALL', pattern: /^\/track\// },

    // Contenido público del menú
    { method: 'GET', pattern: /^\/allergens$/ },
    { method: 'GET', pattern: /^\/media\// },
    { method: 'GET', pattern: /^\/restaurants\/[^/]+\/reels/ },
    { method: 'GET', pattern: /^\/restaurants\/[^/]+\/landing$/ },
    { method: 'GET', pattern: /^\/restaurants\/[^/]+\/sections$/ },
    { method: 'GET', pattern: /^\/restaurants\/[^/]+\/menus$/ },
    { method: 'GET', pattern: /^\/menus/ },
    { method: 'GET', pattern: /^\/sections/ },

    // Reservas (cliente puede crear/consultar)
    { method: 'GET', pattern: /^\/restaurants\/[^/]+\/reservation/ },
    { method: 'POST', pattern: /^\/restaurants\/[^/]+\/reservations$/ },

    // Delivery público (rutas de workerDelivery.js)
    { method: 'GET', pattern: /^\/delivery\/config\/[\w-]+$/ },
    { method: 'GET', pattern: /^\/delivery\/available\/[\w-]+$/ },
    { method: 'GET', pattern: /^\/delivery\/translations\/[\w-]+$/ },
    { method: 'POST', pattern: /^\/delivery\/orders$/ },
    // Delivery (rutas legacy con /restaurants/)
    { method: 'GET', pattern: /^\/restaurants\/[^/]+\/delivery\/config$/ },
    { method: 'POST', pattern: /^\/restaurants\/[^/]+\/delivery\/orders$/ },

    // Marketing/Leads público
    { method: 'POST', pattern: /^\/api\/leads$/ },
    { method: 'POST', pattern: /^\/restaurants\/[^/]+\/leads$/ },
    { method: 'GET', pattern: /^\/api\/campaigns\/[a-zA-Z0-9-]+$/ },
    { method: 'GET', pattern: /^\/restaurants\/[^/]+\/campaigns\// },

    // Magic link / Redemption público
    { method: 'GET', pattern: /^\/api\/r\/[a-zA-Z0-9]+$/ },
    { method: 'POST', pattern: /^\/api\/r\/[a-zA-Z0-9]+\/redeem$/ },

    // Loyalty público
    { method: 'ALL', pattern: /^\/restaurants\/[^/]+\/loyalty/ },

    // System icons
    { method: 'GET', pattern: /^\/system\/icons$/ },
];

function isPublicRoute(method, pathname) {
    return PUBLIC_ROUTES.some(route => {
        const methodMatch = route.method === 'ALL' || route.method === method;
        return methodMatch && route.pattern.test(pathname);
    });
}

async function authenticateRequest(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    return await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
export default {
    async fetch(request, env, ctx) {
        // 1. CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: getCorsHeaders(request)
            });
        }

        try {
            const url = new URL(request.url);
            console.log(`[Worker] ${request.method} ${url.pathname}`);

            // 2. Autenticación centralizada
            let userData = null;
            const isPublic = isPublicRoute(request.method, url.pathname);

            if (!isPublic) {
                userData = await authenticateRequest(request, env);
                if (!userData) {
                    console.log(`[Worker] 401 - Ruta protegida sin auth: ${url.pathname}`);
                    return createResponse({
                        success: false,
                        message: 'No autorizado'
                    }, 401, request);
                }
                console.log(`[Worker] Auth OK: ${userData.email}`);
            }

            // 3. Routing a handlers (con CORS wrapper)

            // ALÉRGENOS
            if (url.pathname === "/allergens") {
                console.log("[Worker] → Allergens");
                const response = await handleAllergensRequests(request, env);
                if (response) return addCorsHeaders(response, request);
            }

            // TRACKING
            if (url.pathname.startsWith('/track/')) {
                console.log('[Worker] → Tracking');
                const response = await handleTracking(request, env, ctx);
                if (response) return addCorsHeaders(response, request);
            }

            // LANDING PÚBLICO
            if (url.pathname.match(/^\/restaurants\/[^/]+\/landing$/)) {
                console.log('[Worker] → Landing (público)');
                const response = await handleLandingRequests(request, env);
                if (response) return addCorsHeaders(response, request);
            }

            // LANDING ADMIN
            if (url.pathname.includes('/admin/landing')) {
                console.log('[Worker] → Landing Admin');
                const response = await handleLandingAdminRequests(request, env);
                if (response) return addCorsHeaders(response, request);
            }

            // LANDING SECTIONS
            if (url.pathname.includes('/landing-sections')) {
                console.log('[Worker] → Landing Sections');
                const response = await handleLandingRequests(request, env);
                if (response) return addCorsHeaders(response, request);
            }

            // DELIVERY
            const deliveryResponse = await handleDeliveryRequests(request.clone(), env);
            if (deliveryResponse) return addCorsHeaders(deliveryResponse, request);

            // MARKETING
            const marketingResponse = await handleMarketingRequests(request.clone(), env);
            if (marketingResponse) return addCorsHeaders(marketingResponse, request);

            // RESERVATIONS
            const reservationsResponse = await handleReservationRequests(request.clone(), env);
            if (reservationsResponse) return addCorsHeaders(reservationsResponse, request);

            // MEDIA - NO envolver con addCorsHeaders (tiene su propio manejo de CORS para binarios)
            const mediaResponse = await handleMediaRequests(request.clone(), env);
            if (mediaResponse) return mediaResponse;

            // REELS
            const reelsResponse = await handleReelsRequests(request.clone(), env);
            if (reelsResponse) return addCorsHeaders(reelsResponse, request);

            // LOYALTY
            const loyaltyResponse = await handleLoyaltyRequests(request.clone(), env);
            if (loyaltyResponse) return addCorsHeaders(loyaltyResponse, request);

            // RESTAURANTES
            const restaurantResponse = await handleRestaurantRequests(request.clone(), env);
            if (restaurantResponse) return addCorsHeaders(restaurantResponse, request);

            // AUTENTICACIÓN
            const authResponse = await handleAuthRequests(request, env);
            if (authResponse) return addCorsHeaders(authResponse, request);

            // ANALYTICS
            const analyticsResponse = await handleAnalyticsRequests(request, env);
            if (analyticsResponse) return addCorsHeaders(analyticsResponse, request);

            // DASHBOARD
            const dashboardResponse = await handleDashboardRequests(request, env);
            if (dashboardResponse) return addCorsHeaders(dashboardResponse, request);

            // DISHES
            const dishesResponse = await handleDishRequests(request.clone(), env);
            if (dishesResponse) return addCorsHeaders(dishesResponse, request);

            // SECTIONS
            const sectionsResponse = await handleSectionRequests(request, env);
            if (sectionsResponse) return addCorsHeaders(sectionsResponse, request);

            // MENUS
            const menusResponse = await handleMenuRequests(request, env);
            if (menusResponse) return addCorsHeaders(menusResponse, request);

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
