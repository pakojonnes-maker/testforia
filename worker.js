import { handleDashboardRequests } from './workerDashboard.js';
import { handleAuthRequests, authenticateRequest } from './workerAuthentication.js';
import { handleAnalyticsRequests } from './workerAnalytics.js';
import { handleAllergensRequests } from './workerAllergens.js';
import { handleMenuRequests } from './workerMenus.js';
import { handleDishRequests } from './workerDishes.js';
import { handleSectionRequests } from './workerSections.js';
import { handleRestaurantRequests } from './workerRestaurants.js';
import { handleReelsRequests } from './workerReels.js';
import { handleMediaRequests } from './workerMedia.js';
import { handleTracking } from './workerTracking.js';
import { handleLandingRequests } from './workerLanding.js';
import { handleLandingAdminRequests } from './workerLandingAdmin.js';
import { handleMarketingRequests } from './workerMarketing.js';
import { handleLoyaltyRequests } from './workerLoyalty.js';
import { handleReservationRequests } from './workerReservations.js';
import { handleDeliveryRequests } from './workerDelivery.js';
import { handleGuideRequests } from './workerGuide.js';
import { handleGuideTracking } from './workerGuideTracking.js';
import { handleGuideAdminRequests } from './workerGuideAdmin.js';
import { handleGuideAI } from './workerGuideAI.js';
import { handleGuideStoreRequests } from './workerGuideStore.js';
import { handleTvScreenRequests } from './workerTvScreen.js';
import { handleGuideImportRequests } from './workerGuideImport.js';
import { checkRestaurantScope } from './workerAuthz.js';
// CORS: la allowlist vive en workerCors.js, compartida con los demás módulos.
import { getCorsHeaders } from './workerCors.js';
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
    { method: 'POST', pattern: /^\/auth\/mfa\/verify$/ },
    // Invitaciones: quien las canjea todavía no tiene sesión, por definición.
    { method: 'GET', pattern: /^\/auth\/invitations\/[^/]+$/ },
    { method: 'POST', pattern: /^\/auth\/invitations\/[^/]+\/accept$/ },
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
    // Magic link / Redemption público (loyalty card claim, ver workerLoyalty.js)
    { method: 'GET', pattern: /^\/api\/r\/[a-zA-Z0-9]+$/ },
    { method: 'POST', pattern: /^\/api\/r\/[a-zA-Z0-9]+\/redeem$/ },
    // Loyalty público (tarjeta de sellos: consulta y sello validado por PIN de sala)
    { method: 'GET', pattern: /^\/api\/loyalty\/card$/ },
    { method: 'POST', pattern: /^\/api\/loyalty\/stamp$/ },

    { method: 'POST', pattern: /^\/api\/notifications\/subscribe$/ },
    { method: 'GET', pattern: /^\/api\/restaurants\/[^/]+\/notifications\/subscribers$/ },
    // System icons
    { method: 'GET', pattern: /^\/system\/icons$/ },
    // Guidebook public routes
    { method: 'GET', pattern: /^\/guide\/[\w-]+$/ },
    { method: 'ALL', pattern: /^\/guide\/track\// },
    { method: 'POST', pattern: /^\/guide\/ai\// },
    { method: 'POST', pattern: /^\/guide\/store\/orders$/ },
    // TV screens (guidebook on TV) — config + analytics son públicos;
    // /guide/admin/tv/* queda protegido por el chequeo por defecto.
    { method: 'GET', pattern: /^\/guide\/tv\/config\/[^/]+$/ },
    { method: 'POST', pattern: /^\/guide\/tv\/track$/ },
];
function isPublicRoute(method, pathname) {
    return PUBLIC_ROUTES.some(route => {
        const methodMatch = route.method === 'ALL' || route.method === method;
        return methodMatch && route.pattern.test(pathname);
    });
}
// authenticateRequest (verificación de JWT + comprobación de revocación) se
// importa de workerAuthentication.js — antes estaba duplicada aquí sin la
// comprobación de revocación, lo que la hacía divergir en silencio.
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
            let access = null;
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
                console.log(`[Worker] Auth OK: user=${userData.userId}`);

                // 2b. Autorización por tenant (chokepoint único).
                // Exige pertenencia activa al restaurante afectado, verificada
                // contra D1, venga el restaurante en la ruta, en un recurso hijo,
                // en la query o en el body. Sin esto, cualquier JWT válido valía
                // para cualquier restaurante.
                const scope = await checkRestaurantScope(request, env, userData);
                if (scope.denied) {
                    console.log(`[Worker] 403 - Sin acceso al tenant: user=${userData.userId} ${url.pathname}`);
                    return createResponse({
                        success: false,
                        message: 'No tienes acceso a este restaurante'
                    }, 403, request);
                }
                access = scope.access || null;
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
            // GUIDEBOOK
            if (url.pathname.startsWith('/guide/')) {
                console.log('[Worker] → Guidebook');
                // Guide tracking
                if (url.pathname.startsWith('/guide/track/')) {
                    const response = await handleGuideTracking(request, env, ctx);
                    if (response) return addCorsHeaders(response, request);
                }
                // Guide AI assistant
                if (url.pathname.startsWith('/guide/ai/')) {
                    const response = await handleGuideAI(request, env);
                    if (response) return addCorsHeaders(response, request);
                }
                // Guide store (guest order intake)
                if (url.pathname.startsWith('/guide/store/')) {
                    const response = await handleGuideStoreRequests(request, env);
                    if (response) return addCorsHeaders(response, request);
                }
                // TV screens (guidebook on TV): config/track público + pairing/stats
                // protegido. Debe ir ANTES de "Guide admin" porque /guide/admin/tv/*
                // si no lo intercepta aquí, handleGuideAdminRequests le devolvería
                // un 404 duro (no hace fallthrough con null para rutas desconocidas).
                if (url.pathname.startsWith('/guide/tv/') || url.pathname.startsWith('/guide/admin/tv/')) {
                    const response = await handleTvScreenRequests(request, env);
                    if (response) return addCorsHeaders(response, request);
                }
                // Importador de POIs desde Google Maps: debe ir ANTES del bloque
                // genérico "Guide admin" de abajo, mismo motivo que TV screens arriba.
                if (url.pathname.startsWith('/guide/admin/import/')) {
                    const response = await handleGuideImportRequests(request, env);
                    if (response) return addCorsHeaders(response, request);
                }
                // Guide admin
                if (url.pathname.startsWith('/guide/admin/')) {
                    const response = await handleGuideAdminRequests(request, env);
                    if (response) return addCorsHeaders(response, request);
                }
                // Guide public (GET /guide/:slug)
                const guideResponse = await handleGuideRequests(request, env);
                if (guideResponse) return addCorsHeaders(guideResponse, request);
            }
            // DELIVERY
            const deliveryResponse = await handleDeliveryRequests(request.clone(), env);
            if (deliveryResponse) return addCorsHeaders(deliveryResponse, request);
            // MARKETING
            const marketingResponse = await handleMarketingRequests(request.clone(), env);
            if (marketingResponse) return addCorsHeaders(marketingResponse, request);
            // LOYALTY (tarjeta de sellos)
            const loyaltyResponse = await handleLoyaltyRequests(request.clone(), env);
            if (loyaltyResponse) return addCorsHeaders(loyaltyResponse, request);
            // RESERVATIONS
            const reservationsResponse = await handleReservationRequests(request.clone(), env);
            if (reservationsResponse) return addCorsHeaders(reservationsResponse, request);
            // MEDIA - NO envolver con addCorsHeaders (tiene su propio manejo de CORS para binarios)
            const mediaResponse = await handleMediaRequests(request.clone(), env);
            if (mediaResponse) return mediaResponse;
            // REELS
            const reelsResponse = await handleReelsRequests(request.clone(), env);
            if (reelsResponse) return addCorsHeaders(reelsResponse, request);
            // RESTAURANTES
            const restaurantResponse = await handleRestaurantRequests(request.clone(), env, access, userData);
            if (restaurantResponse) return addCorsHeaders(restaurantResponse, request);
            // AUTENTICACIÓN
            const authResponse = await handleAuthRequests(request, env, userData);
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