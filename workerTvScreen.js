// workerTvScreen.js — VisualTaste TV screens (guidebook on TV)
// ============================================
// Endpoints:
//   GET  /guide/tv/config/:pairingCode?lang=es   — público: resuelve una TV emparejada a
//                                                   los datos de su alojamiento (reutiliza
//                                                   workerGuide.js), hace heartbeat y
//                                                   registra una impresión.
//   POST /guide/tv/track                         — público: registra un evento de analítica
//                                                   de la TV (wifi_reveal, screen_view...).
//   POST /guide/admin/tv/devices                 — protegido: empareja una TV nueva a un
//                                                   apartamento (genera pairing_code).
//   GET  /guide/admin/tv/devices?apartment_id=X  — protegido: lista TVs emparejadas.
//   GET  /guide/admin/tv/stats/:apartment_id     — protegido: KPIs agregados para el host.
//   PATCH /guide/admin/tv/devices/:id            — protegido: activa/desactiva una TV
//                                                   (soft, conserva el pairing_code).
// ============================================

import { verifyJWT } from './workerAuthentication.js';
import { handleGetGuidebook } from './workerGuide.js';

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

function generateId(prefix = 'tv') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// Código corto y legible (sin O/0/I/1, ambiguos en pantalla/mando) por si algún
// día hace falta introducirlo a mano; el flujo normal es un QR desde el admin.
function generatePairingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

const VALID_EVENT_TYPES = ['impression', 'screen_view', 'wifi_reveal', 'poi_select', 'menu_qr_shown', 'booking_qr_shown'];

/**
 * Main handler. Devuelve null si la ruta no es de TV (permite el patrón de
 * cascada de worker.js).
 */
export async function handleTvScreenRequests(request, env) {
    const url = new URL(request.url);
    const isTvRoute = url.pathname.startsWith('/guide/tv/') || url.pathname.startsWith('/guide/admin/tv/');
    if (!isTvRoute) return null;

    try {
        // ---- Público ----
        const configMatch = url.pathname.match(/^\/guide\/tv\/config\/([^/]+)$/);
        if (configMatch && request.method === 'GET') {
            return await handleTvConfig(env, configMatch[1], url.searchParams.get('lang') || 'es');
        }

        if (url.pathname === '/guide/tv/track' && request.method === 'POST') {
            return await handleTvTrack(request, env);
        }

        // ---- Protegido (pairing/stats de administración) ----
        if (url.pathname.startsWith('/guide/admin/tv/')) {
            const auth = await getAuthContext(request, env);
            if (!auth) return errorResponse('Unauthorized', 401);

            if (url.pathname === '/guide/admin/tv/devices' && request.method === 'POST') {
                return await handleCreateDevice(request, env, auth);
            }
            if (url.pathname === '/guide/admin/tv/devices' && request.method === 'GET') {
                return await handleListDevices(request, env, auth);
            }
            const statsMatch = url.pathname.match(/^\/guide\/admin\/tv\/stats\/([^/]+)$/);
            if (statsMatch && request.method === 'GET') {
                return await handleTvStats(env, statsMatch[1], auth, url.searchParams.get('range') || '30d');
            }
            const deviceMatch = url.pathname.match(/^\/guide\/admin\/tv\/devices\/([^/]+)$/);
            if (deviceMatch && request.method === 'PATCH') {
                return await handleUpdateDeviceStatus(request, env, deviceMatch[1], auth);
            }
        }

        return errorResponse('TV endpoint not found', 404);
    } catch (error) {
        console.error('[TvScreen] Error:', error);
        return errorResponse('TV screen error: ' + error.message, 500);
    }
}

// ============================================
// Auth (misma lógica de agencia/superadmin que workerGuideAdmin.js)
// ============================================
async function getAuthContext(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const userData = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
    if (!userData) return null;

    const isSuperAdmin = userData.is_superadmin === true;
    let agencyIds = [];
    if (!isSuperAdmin) {
        const staffRows = await env.DB.prepare(
            'SELECT agency_id FROM guide_agency_staff WHERE user_id = ? AND is_active = TRUE'
        ).bind(userData.userId).all();
        agencyIds = (staffRows.results || []).map(r => r.agency_id);
    }
    return { isSuperAdmin, agencyIds };
}

async function assertApartmentAccess(env, apartmentId, auth) {
    const apt = await env.DB.prepare('SELECT id, agency_id FROM guide_apartments WHERE id = ?').bind(apartmentId).first();
    if (!apt) return { ok: false, response: errorResponse('Apartamento no encontrado', 404) };
    if (!auth.isSuperAdmin && !auth.agencyIds.includes(apt.agency_id)) {
        return { ok: false, response: errorResponse('Sin acceso a este apartamento', 403) };
    }
    return { ok: true, apartment: apt };
}

// ============================================
// Público: config + track
// ============================================
async function resolveDevice(env, pairingCode) {
    return env.DB.prepare(`
        SELECT d.id, d.apartment_id, d.is_active, a.slug AS apartment_slug
        FROM guide_tv_devices d
        JOIN guide_apartments a ON a.id = d.apartment_id
        WHERE d.pairing_code = ?
    `).bind(pairingCode).first();
}

async function handleTvConfig(env, pairingCode, lang) {
    const device = await resolveDevice(env, pairingCode);
    if (!device || !device.is_active) {
        return errorResponse('TV no emparejada o inactiva', 404);
    }

    const now = new Date().toISOString();
    await env.DB.prepare('UPDATE guide_tv_devices SET last_seen_at = ? WHERE id = ?').bind(now, device.id).run();
    await env.DB.prepare(`
        INSERT INTO guide_tv_events (id, apartment_id, device_id, event_type, lang, created_at)
        VALUES (?, ?, ?, 'impression', ?, ?)
    `).bind(generateId('tve'), device.apartment_id, device.id, lang, now).run();

    // Misma forma de datos que GET /guide/:slug (y misma caché KV) — sin duplicar la query.
    return handleGetGuidebook(env, device.apartment_slug, lang);
}

async function handleTvTrack(request, env) {
    const data = await request.json();
    const { pairingCode, eventType, screen, lang } = data;

    if (!pairingCode || !eventType) {
        return errorResponse('pairingCode y eventType son obligatorios');
    }
    if (!VALID_EVENT_TYPES.includes(eventType)) {
        return errorResponse('eventType inválido');
    }

    const device = await resolveDevice(env, pairingCode);
    if (!device) {
        return errorResponse('TV no emparejada', 404);
    }

    await env.DB.prepare(`
        INSERT INTO guide_tv_events (id, apartment_id, device_id, event_type, screen, lang, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
        generateId('tve'), device.apartment_id, device.id, eventType, screen || null, lang || null, new Date().toISOString()
    ).run();

    return jsonResponse({ success: true });
}

// ============================================
// Protegido: pairing + stats
// ============================================
async function handleCreateDevice(request, env, auth) {
    const data = await request.json();
    const { apartmentId, deviceLabel } = data;
    if (!apartmentId) return errorResponse('apartmentId es obligatorio');

    const access = await assertApartmentAccess(env, apartmentId, auth);
    if (!access.ok) return access.response;

    let pairingCode = null;
    for (let attempt = 0; attempt < 5 && !pairingCode; attempt++) {
        const candidate = generatePairingCode();
        const exists = await env.DB.prepare('SELECT 1 FROM guide_tv_devices WHERE pairing_code = ?').bind(candidate).first();
        if (!exists) pairingCode = candidate;
    }
    if (!pairingCode) return errorResponse('No se pudo generar un código único, reintenta', 500);

    const id = generateId('tvd');
    const now = new Date().toISOString();
    await env.DB.prepare(`
        INSERT INTO guide_tv_devices (id, apartment_id, pairing_code, device_label, is_active, paired_at, created_at)
        VALUES (?, ?, ?, ?, TRUE, ?, ?)
    `).bind(id, apartmentId, pairingCode, deviceLabel || null, now, now).run();

    return jsonResponse({ success: true, device: { id, apartmentId, pairingCode, deviceLabel: deviceLabel || null } });
}

async function handleListDevices(request, env, auth) {
    const url = new URL(request.url);
    const apartmentId = url.searchParams.get('apartment_id');
    if (!apartmentId) return errorResponse('apartment_id es obligatorio');

    const access = await assertApartmentAccess(env, apartmentId, auth);
    if (!access.ok) return access.response;

    const devices = await env.DB.prepare(`
        SELECT id, pairing_code, device_label, is_active, paired_at, last_seen_at
        FROM guide_tv_devices WHERE apartment_id = ? ORDER BY created_at DESC
    `).bind(apartmentId).all();

    return jsonResponse({ success: true, devices: devices.results || [] });
}

async function handleUpdateDeviceStatus(request, env, deviceId, auth) {
    const data = await request.json();
    if (typeof data.isActive !== 'boolean') return errorResponse('isActive (boolean) es obligatorio');

    const device = await env.DB.prepare('SELECT id, apartment_id FROM guide_tv_devices WHERE id = ?').bind(deviceId).first();
    if (!device) return errorResponse('TV no encontrada', 404);

    const access = await assertApartmentAccess(env, device.apartment_id, auth);
    if (!access.ok) return access.response;

    await env.DB.prepare('UPDATE guide_tv_devices SET is_active = ? WHERE id = ?').bind(data.isActive, deviceId).run();

    return jsonResponse({ success: true, id: deviceId, isActive: data.isActive });
}

// Traduce el rango solicitado a un filtro SQL de fecha. 'all' = sin filtro.
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

async function handleTvStats(env, apartmentId, auth, range = '30d') {
    const access = await assertApartmentAccess(env, apartmentId, auth);
    if (!access.ok) return access.response;

    const days = RANGE_DAYS[range];
    // Cláusula de fecha reutilizable; para 'all' queda vacía.
    const dateClause = days ? `AND created_at >= datetime('now', '-${days} days')` : '';

    // Pivot diario: una fila por día con una columna por tipo de evento.
    // Conditional aggregation (SQLite lo soporta con SUM(CASE...)).
    const dailySql = `
        SELECT date(created_at) AS day,
            SUM(CASE WHEN event_type='impression'      THEN 1 ELSE 0 END) AS impression,
            SUM(CASE WHEN event_type='screen_view'     THEN 1 ELSE 0 END) AS screen_view,
            SUM(CASE WHEN event_type='wifi_reveal'     THEN 1 ELSE 0 END) AS wifi_reveal,
            SUM(CASE WHEN event_type='poi_select'      THEN 1 ELSE 0 END) AS poi_select,
            SUM(CASE WHEN event_type='menu_qr_shown'   THEN 1 ELSE 0 END) AS menu_qr_shown,
            SUM(CASE WHEN event_type='booking_qr_shown' THEN 1 ELSE 0 END) AS booking_qr_shown
        FROM guide_tv_events
        WHERE apartment_id = ? ${dateClause}
        GROUP BY day ORDER BY day ASC`;

    const [totals, byScreen, daily, devices] = await Promise.all([
        env.DB.prepare(`
            SELECT event_type, COUNT(*) as count
            FROM guide_tv_events WHERE apartment_id = ? ${dateClause}
            GROUP BY event_type
        `).bind(apartmentId).all(),
        env.DB.prepare(`
            SELECT screen, COUNT(*) as count
            FROM guide_tv_events WHERE apartment_id = ? AND screen IS NOT NULL ${dateClause}
            GROUP BY screen ORDER BY count DESC
        `).bind(apartmentId).all(),
        env.DB.prepare(dailySql).bind(apartmentId).all(),
        env.DB.prepare(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS active
            FROM guide_tv_devices WHERE apartment_id = ?
        `).bind(apartmentId).first(),
    ]);

    return jsonResponse({
        success: true,
        range,
        totals: Object.fromEntries((totals.results || []).map(r => [r.event_type, r.count])),
        byScreen: byScreen.results || [],
        daily: daily.results || [],
        devices: { total: devices?.total || 0, active: devices?.active || 0 },
    });
}
