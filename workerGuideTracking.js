// workerGuideTracking.js — Guide Session & Intent Tracking
// ============================================
// Endpoints:
//   POST /guide/track/session/start  — Create guide session
//   POST /guide/track/session/end    — End guide session  
//   POST /guide/track/intent         — Log affiliate intent
// ============================================

import { computeVisitorDayHash } from './workerVisitorHash.js';

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function generateId(prefix = 'gi') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Main handler for guide tracking routes
 */
export async function handleGuideTracking(request, env, ctx) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/guide/track/')) return null;
    if (request.method !== 'POST') return null;

    try {
        if (url.pathname === '/guide/track/session/start') {
            return await handleSessionStart(request, env);
        }
        if (url.pathname === '/guide/track/session/end') {
            return await handleSessionEnd(request, env);
        }
        if (url.pathname === '/guide/track/intent') {
            return await handleIntent(request, env);
        }
        if (url.pathname === '/guide/track/section-view') {
            return await handleSectionView(request, env);
        }

        return errorResponse('Guide tracking endpoint not found', 404);
    } catch (error) {
        console.error('[GuideTracking] Error:', error);
        return errorResponse('Tracking error: ' + error.message, 500);
    }
}

/**
 * POST /guide/track/session/start
 * Body: { apartmentId, deviceType?, osName?, browser?, language? }
 */
async function handleSessionStart(request, env) {
    const data = await request.json();
    const { apartmentId } = data;

    if (!apartmentId) {
        return errorResponse('apartmentId is required');
    }

    // Validate apartment exists and get zone_id
    const apartment = await env.DB.prepare(
        'SELECT id, zone_id FROM guide_apartments WHERE id = ? AND is_active = TRUE'
    ).bind(apartmentId).first();

    if (!apartment) {
        return errorResponse('Apartment not found', 404);
    }

    const sessionId = generateUUID();
    const country = request.cf?.country || null;
    const city = request.cf?.city || null;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // Identidad del visitante. Hay DOS modos, y el anónimo es el normal.
    //
    //  1. Anónimo (por defecto, sin pedir permiso): el hash del día que deriva
    //     workerVisitorHash.js en el servidor. No se escribe nada en el móvil
    //     del huésped, así que el art. 22.2 LSSI no entra y no hace falta
    //     banner. Es lo que devolvió la analítica a la vida: con el banner
    //     anterior había 1 sesión en 30 días para toda la agencia.
    //
    //  2. Consentido: si el huésped activó el recuerdo entre visitas, la app
    //     manda un visitor_id persistente de 12 meses. Solo ese modo puede
    //     responder "¿ha vuelto otro día?", porque el salt del hash rota y el
    //     vínculo entre días desaparece a propósito.
    //
    // Antes esto era `data.visitorId || generateUUID()`: sin consentimiento
    // generaba un UUID NUEVO por sesión, y como el dashboard cuenta
    // COALESCE(visitor_id, ...) cada recarga habría sido un visitante distinto.
    const consentedVisitorId = typeof data.visitorId === 'string' && data.visitorId ? data.visitorId : null;
    const visitorDayHash = await computeVisitorDayHash(request, env);

    // Recurrencia por DÍAS distintos, no por sesiones: recargar o cambiar de idioma
    // no debe convertir a un huésped en "recurrente". Solo se puede calcular con
    // un id que sobreviva a la medianoche, es decir, en el modo consentido.
    let visitCount = 1;
    if (consentedVisitorId) {
        const prior = await env.DB.prepare(`
            SELECT COUNT(DISTINCT DATE(started_at)) AS prior_days
            FROM guide_sessions
            WHERE visitor_id = ? AND apartment_id = ? AND DATE(started_at) <> ?
        `).bind(consentedVisitorId, apartment.id, today).first();
        visitCount = (prior?.prior_days || 0) + 1;
    }

    await env.DB.prepare(`
        INSERT INTO guide_sessions (id, apartment_id, zone_id, device_type, os_name, browser, country, city, language_code, device_fingerprint, visitor_id, visitor_day_hash, visit_count, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        sessionId,
        apartment.id,
        apartment.zone_id,
        data.deviceType || 'unknown',
        data.osName || null,
        data.browser || 'unknown',
        country,
        city,
        data.language || 'es',
        // device_fingerprint deja de escribirse: era la señal legalmente más
        // problemática (el fingerprinting no tiene excepción posible) y además
        // la que peor funcionaba. La columna se conserva por el histórico.
        null,
        consentedVisitorId,
        visitorDayHash,
        visitCount,
        now
    ).run();

    return jsonResponse({
        success: true,
        sessionId,
        // null en modo anónimo: la app no debe persistir lo que no ha pedido.
        visitorId: consentedVisitorId,
        visitCount,
        apartmentId: apartment.id,
        zoneId: apartment.zone_id
    });
}

/**
 * POST /guide/track/session/end
 * Body: { sessionId, duration? }
 */
async function handleSessionEnd(request, env) {
    const data = await request.json();
    const { sessionId } = data;

    if (!sessionId) {
        return errorResponse('sessionId is required');
    }

    const endedAt = new Date().toISOString();
    
    // If duration provided by client, use it. Otherwise calculate from started_at.
    let duration = data.duration || null;

    if (!duration) {
        const session = await env.DB.prepare(
            'SELECT started_at FROM guide_sessions WHERE id = ?'
        ).bind(sessionId).first();

        if (session?.started_at) {
            duration = Math.floor(
                (new Date(endedAt).getTime() - new Date(session.started_at).getTime()) / 1000
            );
        }
    }

    // La app llama aquí en cada `visibilitychange`, no solo al cerrar. Si el huésped
    // vuelve y sigue navegando, la duración debe crecer, nunca encogerse: por eso se
    // toma el máximo en vez de sobrescribir.
    const result = await env.DB.prepare(
        'UPDATE guide_sessions SET ended_at = ?, duration_seconds = MAX(COALESCE(duration_seconds, 0), ?) WHERE id = ?'
    ).bind(endedAt, duration || 0, sessionId).run();

    // D1 devuelve el contador en result.meta.changes; `result.changes` es
    // undefined, así que esta rama de 404 nunca se disparaba y session/end
    // respondía success:true sobre sesiones inexistentes.
    if (result.meta?.changes === 0) {
        return errorResponse('Session not found', 404);
    }

    return jsonResponse({ success: true, sessionId, duration });
}

/**
 * POST /guide/track/intent
 * Body: { sessionId?, apartmentId, targetType, targetId, actionTaken }
 * 
 * Action types: 'click_menu', 'click_whatsapp', 'click_phone', 'click_url', 'view_coupon', 'click_directions'
 */
async function handleIntent(request, env) {
    const data = await request.json();
    const { apartmentId, targetType, targetId, actionTaken } = data;

    if (!targetType || !targetId || !actionTaken) {
        return errorResponse('targetType, targetId, and actionTaken are required');
    }

    // Get agency_id and zone_id from apartment
    let agencyId = null;
    let zoneId = null;

    if (apartmentId) {
        const apartment = await env.DB.prepare(
            'SELECT agency_id, zone_id FROM guide_apartments WHERE id = ?'
        ).bind(apartmentId).first();
        
        if (apartment) {
            agencyId = apartment.agency_id;
            zoneId = apartment.zone_id;
        }
    }

    if (!zoneId) {
        // Try to get zone from session
        if (data.sessionId) {
            const session = await env.DB.prepare(
                'SELECT zone_id FROM guide_sessions WHERE id = ?'
            ).bind(data.sessionId).first();
            zoneId = session?.zone_id;
        }
        if (!zoneId) {
            return errorResponse('Could not determine zone. Provide apartmentId or valid sessionId.');
        }
    }

    const intentId = generateId('gi');
    const userAgent = request.headers.get('User-Agent') || null;
    const country = request.cf?.country || null;
    const city = request.cf?.city || null;

    await env.DB.prepare(`
        INSERT INTO guide_affiliate_intents 
            (id, session_id, apartment_id, agency_id, zone_id, target_type, target_id, action_taken, user_agent, ip_country, ip_city, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        intentId,
        data.sessionId || null,
        apartmentId || null,
        agencyId,
        zoneId,
        targetType,
        targetId,
        actionTaken,
        userAgent,
        country,
        city,
        new Date().toISOString()
    ).run();

    return jsonResponse({
        success: true,
        intentId,
        targetType,
        targetId,
        actionTaken
    });
}

/**
 * POST /guide/track/section-view
 * Body: { apartmentId, sessionId, section, durationSeconds? }
 */
async function handleSectionView(request, env) {
    const data = await request.json();
    const { apartmentId, sessionId, section, durationSeconds } = data;

    if (!apartmentId || !section) {
        return errorResponse('apartmentId and section are required');
    }

    const validSections = ['info', 'discover', 'restaurants', 'services'];
    if (!validSections.includes(section)) {
        return errorResponse('Invalid section');
    }

    const apartment = await env.DB.prepare(
        'SELECT zone_id FROM guide_apartments WHERE id = ?'
    ).bind(apartmentId).first();

    if (!apartment) {
        return errorResponse('Apartment not found', 404);
    }

    const viewId = generateId('sv');
    await env.DB.prepare(`
        INSERT INTO guide_section_views (id, session_id, apartment_id, zone_id, section, duration_seconds, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        viewId,
        sessionId || null,
        apartmentId,
        apartment.zone_id,
        section,
        durationSeconds || 0,
        new Date().toISOString()
    ).run();

    return jsonResponse({ success: true, viewId });
}
