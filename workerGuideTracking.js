// workerGuideTracking.js — Guide Session & Intent Tracking
// ============================================
// Endpoints:
//   POST /guide/track/session/start  — Create guide session
//   POST /guide/track/session/end    — End guide session  
//   POST /guide/track/intent         — Log affiliate intent
// ============================================

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

    await env.DB.prepare(`
        INSERT INTO guide_sessions (id, apartment_id, zone_id, device_type, os_name, browser, country, city, language_code, started_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        new Date().toISOString()
    ).run();

    return jsonResponse({
        success: true,
        sessionId,
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

    const result = await env.DB.prepare(
        'UPDATE guide_sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?'
    ).bind(endedAt, duration, sessionId).run();

    if (result.changes === 0) {
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
