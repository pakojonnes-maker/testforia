// workerGuideQr.js — Láminas con QR para enmarcar (admin del guidebook)
// ============================================
// La lámina se compone y se exporta en el navegador (apps/admin/src/lib/qrPoster): aquí solo
// viven los datos que necesita esa pantalla. Auth central en worker.js; este módulo resuelve
// agencia/superadmin igual que workerGuideAdmin.js y workerTvScreen.js.
//
// Debe registrarse en worker.js ANTES del bloque "/guide/admin/": ese handler devuelve un 404
// duro para lo que no conoce.
//
// Rutas:
//   GET  /guide/admin/qr/overview?agency_id=X  — agencia + pisos + láminas + zonas, en una llamada
//   PUT  /guide/admin/qr/design                — guarda el diseño (QR y marco) de la agencia
//   POST /guide/admin/qr/posters               — sube o sustituye la lámina de una zona (superadmin)
//   PUT  /guide/admin/qr/posters/:id           — mueve el hueco del QR de una lámina (superadmin)
//
// Nada de esto toca la caché KV de la guía: el huésped no ve ninguno de estos datos, y KV admite
// 1.000 escrituras al día para toda la cuenta. Por eso el diseño NO se guarda con updateAgency.
// ============================================

import { verifyJWT } from './workerAuthentication.js';

const R2_PREFIX = 'guide/qr-posters';
const MAX_POSTER_BYTES = 25 * 1024 * 1024;
const MAX_DESIGN_CHARS = 8000;
const POSTER_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
// Lo que el editor guarda. Cualquier otra clave se descarta al escribir.
const DESIGN_KEYS = ['version', 'qr', 'frame', 'texts', 'print'];

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

function generateId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

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
        agencyIds = (staffRows.results || []).map((r) => r.agency_id);
    }
    return { isSuperAdmin, agencyIds };
}

const canAccessAgency = (auth, agencyId) => auth.isSuperAdmin || auth.agencyIds.includes(agencyId);

const posterUrl = (origin, r2Key) => `${origin}/media/${r2Key}`;

function parseDesign(raw) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** Fracción de la lámina, lejos de los bordes: un marco pegado al canto no cabe. */
function clampFraction(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(0.85, Math.max(0.15, n));
}

function positiveInt(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 && n <= 30000 ? n : null;
}

export async function handleGuideQrRequests(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/guide/admin/qr/')) return null;

    try {
        const auth = await getAuthContext(request, env);
        if (!auth) return errorResponse('Unauthorized', 401);
        if (!auth.isSuperAdmin && auth.agencyIds.length === 0) {
            return errorResponse('User has no agency access', 403);
        }

        const path = url.pathname.slice('/guide/admin/qr/'.length);
        const method = request.method;

        if (path === 'overview' && method === 'GET') {
            return await getOverview(env, auth, url.searchParams.get('agency_id'), url.origin);
        }
        if (path === 'design' && method === 'PUT') {
            return await saveDesign(request, env, auth);
        }
        if (path === 'posters' && method === 'POST') {
            if (!auth.isSuperAdmin) return errorResponse('Solo un superadmin puede cambiar las láminas', 403);
            return await uploadPoster(request, env, url.origin);
        }
        const posterMatch = path.match(/^posters\/([^/]+)$/);
        if (posterMatch && method === 'PUT') {
            if (!auth.isSuperAdmin) return errorResponse('Solo un superadmin puede cambiar las láminas', 403);
            return await updatePoster(request, env, posterMatch[1], url.origin);
        }

        return errorResponse('QR endpoint not found', 404);
    } catch (error) {
        console.error('[GuideQr] Error:', error);
        return errorResponse('QR error: ' + error.message, 500);
    }
}

async function getOverview(env, auth, agencyId, origin) {
    if (!agencyId) return errorResponse('agency_id is required');
    if (!canAccessAgency(auth, agencyId)) return errorResponse('Forbidden', 403);

    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const [agencyRes, apartmentsRes, postersRes, zonesRes] = await env.DB.batch([
        env.DB.prepare(`
            SELECT id, name, slug, logo_url, primary_color, secondary_color, accent_color, qr_design
            FROM guide_agencies WHERE id = ?
        `).bind(agencyId),
        // Entradas por el marco: sesiones abiertas con ?o=marco. Los únicos, con la misma regla
        // que el resto de la analítica (COALESCE del id consentido y el hash del día).
        env.DB.prepare(`
            SELECT a.id, a.name, a.slug, a.zone_id, z.name AS zone_name,
                (SELECT COUNT(*) FROM guide_sessions s
                  WHERE s.apartment_id = a.id AND s.entry_source = 'marco') AS frame_sessions,
                (SELECT COUNT(*) FROM guide_sessions s
                  WHERE s.apartment_id = a.id AND s.entry_source = 'marco' AND s.started_at >= ?1) AS frame_sessions_30d,
                (SELECT COUNT(DISTINCT COALESCE(s.visitor_id, s.visitor_day_hash, s.device_fingerprint, s.id))
                   FROM guide_sessions s
                  WHERE s.apartment_id = a.id AND s.entry_source = 'marco' AND s.started_at >= ?1) AS frame_visitors_30d
            FROM guide_apartments a
            JOIN guide_zones z ON z.id = a.zone_id
            WHERE a.agency_id = ?2 AND a.is_active = TRUE
            ORDER BY a.name ASC
        `).bind(since, agencyId),
        env.DB.prepare(`
            SELECT id, zone_id, name, r2_key, width, height, qr_x, qr_y, modified_at
            FROM guide_qr_posters WHERE is_active = 1
            ORDER BY modified_at DESC
        `),
        env.DB.prepare(`
            SELECT id, name, slug FROM guide_zones WHERE is_active = TRUE ORDER BY name ASC
        `),
    ]);

    const agency = agencyRes.results?.[0];
    if (!agency) return errorResponse('Agency not found', 404);

    // Una lámina por zona: la activa más reciente (el ORDER BY ya las trae así).
    const byZone = new Map();
    for (const row of postersRes.results || []) {
        if (!byZone.has(row.zone_id)) byZone.set(row.zone_id, row);
    }
    const posters = [...byZone.values()].map(({ r2_key, ...poster }) => ({ ...poster, url: posterUrl(origin, r2_key) }));

    return jsonResponse({
        success: true,
        agency: { ...agency, qr_design: parseDesign(agency.qr_design) },
        apartments: apartmentsRes.results || [],
        posters,
        zones: zonesRes.results || [],
        can_manage_posters: auth.isSuperAdmin,
    });
}

async function saveDesign(request, env, auth) {
    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('JSON no válido');
    }
    const agencyId = body?.agency_id;
    if (!agencyId || typeof agencyId !== 'string') return errorResponse('agency_id is required');
    if (!canAccessAgency(auth, agencyId)) return errorResponse('Forbidden', 403);

    // design: null vuelve al diseño por defecto.
    let stored = null;
    if (body.design !== null && body.design !== undefined) {
        if (typeof body.design !== 'object' || Array.isArray(body.design)) {
            return errorResponse('design debe ser un objeto');
        }
        const clean = {};
        for (const key of DESIGN_KEYS) {
            if (body.design[key] !== undefined) clean[key] = body.design[key];
        }
        stored = JSON.stringify(clean);
        if (stored.length > MAX_DESIGN_CHARS) return errorResponse('El diseño ocupa demasiado');
    }

    const result = await env.DB.prepare(
        'UPDATE guide_agencies SET qr_design = ?, modified_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(stored, agencyId).run();
    if (!result.meta?.changes) return errorResponse('Agency not found', 404);

    return jsonResponse({ success: true, design: stored ? JSON.parse(stored) : null });
}

async function uploadPoster(request, env, origin) {
    let formData;
    try {
        formData = await request.formData();
    } catch {
        return errorResponse('Se esperaba un formulario con la imagen');
    }
    const file = formData.get('file');
    const zoneId = formData.get('zone_id');
    if (!file || typeof file === 'string') return errorResponse('file required');
    if (!zoneId || typeof zoneId !== 'string') return errorResponse('zone_id is required');

    const ext = POSTER_TYPES[file.type];
    if (!ext) return errorResponse('La lámina debe ser PNG, JPG o WebP');
    if (file.size > MAX_POSTER_BYTES) return errorResponse('La lámina pesa más de 25 MB');

    const zone = await env.DB.prepare(
        'SELECT id, name, slug FROM guide_zones WHERE id = ?'
    ).bind(zoneId).first();
    if (!zone) return errorResponse('Zona no encontrada', 404);

    const width = positiveInt(formData.get('width'));
    const height = positiveInt(formData.get('height'));
    const rawName = formData.get('name');
    const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim().slice(0, 120) : `Lámina · ${zone.name}`;

    // Clave nueva en cada subida: /media/ se cachea 24 h y una clave reutilizada serviría la vieja.
    const r2Key = `${R2_PREFIX}/${zone.slug}-${Date.now().toString(36)}.${ext}`;
    await env.R2_BUCKET.put(r2Key, file.stream(), { httpMetadata: { contentType: file.type } });

    const id = generateId('qrp');
    const qrX = clampFraction(formData.get('qr_x'), 0.5);
    const qrY = clampFraction(formData.get('qr_y'), 0.55);
    // La anterior se desactiva, no se borra: su fila y su archivo quedan por si hay que volver.
    await env.DB.batch([
        env.DB.prepare(
            'UPDATE guide_qr_posters SET is_active = 0, modified_at = CURRENT_TIMESTAMP WHERE zone_id = ? AND is_active = 1'
        ).bind(zone.id),
        env.DB.prepare(`
            INSERT INTO guide_qr_posters (id, zone_id, name, r2_key, width, height, qr_x, qr_y)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, zone.id, name, r2Key, width, height, qrX, qrY),
    ]);

    return jsonResponse({
        success: true,
        poster: { id, zone_id: zone.id, name, width, height, qr_x: qrX, qr_y: qrY, url: posterUrl(origin, r2Key) },
    });
}

async function updatePoster(request, env, posterId, origin) {
    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('JSON no válido');
    }
    const current = await env.DB.prepare(
        'SELECT id, zone_id, name, r2_key, width, height, qr_x, qr_y FROM guide_qr_posters WHERE id = ? AND is_active = 1'
    ).bind(posterId).first();
    if (!current) return errorResponse('Lámina no encontrada', 404);

    const qrX = clampFraction(body?.qr_x, current.qr_x);
    const qrY = clampFraction(body?.qr_y, current.qr_y);
    const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : current.name;

    await env.DB.prepare(
        'UPDATE guide_qr_posters SET qr_x = ?, qr_y = ?, name = ?, modified_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(qrX, qrY, name, posterId).run();

    const { r2_key: r2Key, ...poster } = current;
    return jsonResponse({
        success: true,
        poster: { ...poster, name, qr_x: qrX, qr_y: qrY, url: posterUrl(origin, r2Key) },
    });
}
