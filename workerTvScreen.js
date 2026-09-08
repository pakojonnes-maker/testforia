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
//   GET  /guide/admin/tv/tiles?apartment_id=X    — protegido: imágenes de las teselas
//                                                   reescritas por el anfitrión.
//   PUT  /guide/admin/tv/tiles                   — protegido: sobrescribe (o restaura,
//                                                   con imageUrl null) una ranura.
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

// Espejo de TileSlot en apps/tv/src/lib/tileImages.ts y del CHECK de la tabla
// guide_tv_tile_images (migración 0092). Los tres tienen que moverse juntos.
const VALID_TILE_SLOTS = ['eat', 'do', 'store', 'info', 'background'];

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
            return await handleTvConfig(env, configMatch[1], url.searchParams.get('lang') || 'es', url.origin);
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
            if (url.pathname === '/guide/admin/tv/tiles' && request.method === 'GET') {
                return await handleListTiles(request, env, auth);
            }
            if (url.pathname === '/guide/admin/tv/tiles' && request.method === 'PUT') {
                return await handleSetTile(request, env, auth);
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
        SELECT d.id, d.apartment_id, d.is_active, a.slug AS apartment_slug,
               a.zone_id, a.agency_id
        FROM guide_tv_devices d
        JOIN guide_apartments a ON a.id = d.apartment_id
        WHERE d.pairing_code = ?
    `).bind(pairingCode).first();
}

async function handleTvConfig(env, pairingCode, lang, origin) {
    const device = await resolveDevice(env, pairingCode);
    if (!device || !device.is_active) {
        return errorResponse('TV no emparejada o inactiva', 404);
    }

    const now = new Date().toISOString();
    // Solo heartbeat técnico. Antes cada fetch de config registraba una
    // 'impression', y como el shell reconsulta al cambiar de idioma o al
    // reconectar, "impresiones" acababa midiendo arranques de app y cambios de
    // idioma, no huéspedes mirando la pantalla. Ahora la impresión la emite la
    // app una sola vez por sesión de TV vía POST /guide/tv/track.
    await env.DB.prepare('UPDATE guide_tv_devices SET last_seen_at = ? WHERE id = ?').bind(now, device.id).run();

    // Misma forma de datos que GET /guide/:slug — sin duplicar la query. La
    // superficie 'tv' va explícita porque el JSON lleva las URLs de afiliado ya
    // resueltas y su sub-id distingue TV de guía; también le da entrada de caché
    // propia (ver handleGetGuidebook), o las ventas de una se atribuirían a la otra.
    const response = await handleGetGuidebook(env, device.apartment_slug, lang, origin, 'tv');

    return await attachTvConfig(response, env, device.apartment_id);
}

/**
 * Cuelga el bloque `tv` del JSON del guidebook, FUERA de la caché KV.
 *
 * Es a propósito que no viaje dentro de handleGetGuidebook: esa respuesta se
 * cachea en KV con una clave versionada que sólo se invalida al editar el
 * CONTENIDO del guidebook (touchGuideVersion). Si las imágenes de las teselas
 * fueran ahí dentro, cambiar la foto de "Tienda" en el admin no se vería en la
 * tele hasta que caducara la entrada o alguien tocara un POI — el clásico de
 * este repo (CLAUDE.md §3). Aquí son una lectura suelta a D1 por arranque de
 * TV, que es un evento raro, y se ven en el siguiente encendido.
 */
async function attachTvConfig(response, env, apartmentId) {
    // Un 404/500 del guidebook se devuelve tal cual: no hay JSON que enriquecer.
    if (!response.ok) return response;

    let payload;
    try {
        payload = await response.clone().json();
    } catch {
        return response;
    }

    const tiles = await loadTileOverrides(env, apartmentId);
    // Sin overrides no se añade nada: la TV ya sabe pintar las de serie y así
    // el JSON no engorda para el 99 % de alojamientos que no tocan esto.
    if (!Object.keys(tiles).length) return response;

    payload.tv = { ...(payload.tv || {}), tiles };

    // Se conservan las cabeceras originales (X-Cache, CORS…) menos la longitud,
    // que ya no vale porque el cuerpo ha crecido.
    const headers = new Headers(response.headers);
    headers.delete('Content-Length');
    return new Response(JSON.stringify(payload), { status: response.status, headers });
}

/**
 * { slot: image_url } de las ranuras reescritas. Vacío si no hay ninguna.
 *
 * El try/catch NO es decorativo: en este repo no hay ledger de migraciones
 * (CLAUDE.md §3), así que un deploy puede adelantarse a la 0092 con toda
 * normalidad. Sin él, un "no such table" subiría hasta el catch de
 * handleTvScreenRequests y /guide/tv/config devolvería 500 — es decir, TODAS las
 * teles del parque en negro por una tabla de personalización que la mayoría de
 * alojamientos ni usa. Degradar a "sin overrides" deja la pantalla con sus
 * imágenes de serie, que es exactamente lo que tenía que enseñar de todos modos.
 */
async function loadTileOverrides(env, apartmentId) {
    let rows;
    try {
        rows = await env.DB.prepare(
            'SELECT slot, image_url FROM guide_tv_tile_images WHERE apartment_id = ?'
        ).bind(apartmentId).all();
    } catch (error) {
        console.error('[TvScreen] No se pudieron leer las imágenes de las teselas:', error.message);
        return {};
    }

    const tiles = {};
    for (const row of rows.results || []) {
        if (row.image_url) tiles[row.slot] = row.image_url;
    }
    return tiles;
}

async function handleTvTrack(request, env) {
    const data = await request.json();
    const { pairingCode, eventType, screen, lang, targetId, tvSessionId } = data;

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

    const now = new Date().toISOString();
    await env.DB.prepare(`
        INSERT INTO guide_tv_events (id, apartment_id, device_id, event_type, screen, lang, target_id, tv_session_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        generateId('tve'), device.apartment_id, device.id, eventType,
        screen || null, lang || null, targetId || null, tvSessionId || null, now
    ).run();

    // El heartbeat de last_seen_at solo se actualizaba al pedir la config. Como
    // en producción el shell va empaquetado en el APK y no la repide, ese campo
    // no servía para saber si la TV sigue viva. Ahora cualquier evento lo refresca.
    await env.DB.prepare('UPDATE guide_tv_devices SET last_seen_at = ? WHERE id = ?').bind(now, device.id).run();

    await logTvAffiliateIntent(env, device, eventType, targetId, now);

    return jsonResponse({ success: true });
}

/**
 * Enseñar el QR de reserva en la TV es la misma intención comercial que pulsar
 * el botón en la guía, pero hasta ahora sólo caía en guide_tv_events: las
 * conversiones de TV y las de guía vivían en tablas distintas y no se podían
 * sumar. Aquí se replica el evento en guide_affiliate_intents, la tabla que
 * alimenta el panel de conversiones.
 *
 * El TIPO de objetivo se deduce en el servidor, no se pide al cliente: el shell
 * de la TV va empaquetado en el APK y puede ser una versión vieja que no mande
 * campos nuevos. 'booking_qr_shown' lo emiten tanto las experiencias reservables
 * como el QR de "cómo llegar" de un lugar cualquiera, así que sólo cuenta como
 * intención de reserva si el POI es realmente is_bookable.
 */
async function logTvAffiliateIntent(env, device, eventType, targetId, now) {
    if (!targetId || !device.zone_id) return;
    if (eventType !== 'booking_qr_shown' && eventType !== 'menu_qr_shown') return;

    let targetType = null;
    if (eventType === 'menu_qr_shown') {
        const restaurant = await env.DB.prepare('SELECT 1 FROM restaurants WHERE id = ?').bind(targetId).first();
        if (restaurant) targetType = 'restaurant';
    } else {
        const poi = await env.DB.prepare('SELECT is_bookable FROM guide_pois WHERE id = ?').bind(targetId).first();
        if (poi?.is_bookable === 1) targetType = 'experience';
    }
    if (!targetType) return;

    try {
        await env.DB.prepare(`
            INSERT INTO guide_affiliate_intents
                (id, session_id, apartment_id, agency_id, zone_id, target_type, target_id, action_taken, created_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, 'tv_qr_shown', ?)
        `).bind(
            generateId('gi'), device.apartment_id, device.agency_id || null,
            device.zone_id, targetType, targetId, now
        ).run();
    } catch (error) {
        // La analítica no debe tumbar el evento de la TV: si esto falla, el
        // guide_tv_events de arriba ya se ha guardado y la pantalla sigue.
        console.error('[TvScreen] No se pudo registrar el intent de afiliación:', error);
    }
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

    const [totals, byScreen, daily, devices, sessions, topPois] = await Promise.all([
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
        // Estancias: agrupar por tv_session_id convierte "eventos sueltos" en algo
        // que un anfitrión entiende ("cuántas veces se ha usado la pantalla, y
        // cuánto se hace en cada uso").
        env.DB.prepare(`
            SELECT COUNT(DISTINCT tv_session_id) AS total_sessions,
                   CAST(COUNT(*) AS REAL) / NULLIF(COUNT(DISTINCT tv_session_id), 0) AS events_per_session,
                   SUM(CASE WHEN event_type = 'wifi_reveal' THEN 1 ELSE 0 END) AS wifi_reveals
            FROM guide_tv_events
            WHERE apartment_id = ? AND tv_session_id IS NOT NULL ${dateClause}
        `).bind(apartmentId).first(),
        // Top POIs seleccionados desde la TV. Antes 'poi_select' se registraba sin
        // saber QUÉ punto de interés se había elegido.
        env.DB.prepare(`
            SELECT e.target_id,
                   COALESCE(t.value, p.category, e.target_id) AS name,
                   COUNT(*) AS selections
            FROM guide_tv_events e
            LEFT JOIN guide_pois p ON p.id = e.target_id
            LEFT JOIN translations t ON t.entity_id = e.target_id
                 AND t.entity_type = 'poi' AND t.field = 'name' AND t.language_code = 'es'
            WHERE e.apartment_id = ? AND e.event_type = 'poi_select'
              AND e.target_id IS NOT NULL ${dateClause.replace(/created_at/g, 'e.created_at')}
            GROUP BY e.target_id, name
            ORDER BY selections DESC LIMIT 10
        `).bind(apartmentId).all(),
    ]);

    return jsonResponse({
        success: true,
        range,
        totals: Object.fromEntries((totals.results || []).map(r => [r.event_type, r.count])),
        byScreen: byScreen.results || [],
        daily: daily.results || [],
        devices: { total: devices?.total || 0, active: devices?.active || 0 },
        sessions: {
            total: sessions?.total_sessions || 0,
            events_per_session: Number(sessions?.events_per_session || 0),
            // % de usos de la pantalla en los que el huésped consultó el WiFi,
            // que es el motivo nº1 por el que se enciende.
            wifi_reveal_rate: sessions?.total_sessions
                ? (sessions.wifi_reveals || 0) / sessions.total_sessions
                : 0,
        },
        topPois: topPois.results || [],
    });
}

// ============================================
// Admin: imágenes de las teselas
// ============================================

/** GET /guide/admin/tv/tiles?apartment_id=X */
async function handleListTiles(request, env, auth) {
    const url = new URL(request.url);
    const apartmentId = url.searchParams.get('apartment_id');
    if (!apartmentId) return errorResponse('apartment_id es obligatorio');

    const access = await assertApartmentAccess(env, apartmentId, auth);
    if (!access.ok) return access.response;

    return jsonResponse({ success: true, tiles: await loadTileOverrides(env, apartmentId) });
}

/**
 * PUT /guide/admin/tv/tiles  { apartmentId, slot, imageUrl }
 *
 * `imageUrl: null` (o cadena vacía) BORRA la fila en vez de guardar un vacío:
 * "restaurar la de serie" y "poner una imagen en blanco" son cosas distintas, y
 * la ausencia de fila es lo que la TV entiende como "usa la del APK".
 */
async function handleSetTile(request, env, auth) {
    let data;
    try {
        data = await request.json();
    } catch {
        return errorResponse('JSON inválido');
    }

    const { apartmentId, slot } = data;
    if (!apartmentId) return errorResponse('apartmentId es obligatorio');
    if (!VALID_TILE_SLOTS.includes(slot)) {
        return errorResponse(`slot debe ser uno de: ${VALID_TILE_SLOTS.join(', ')}`);
    }

    const access = await assertApartmentAccess(env, apartmentId, auth);
    if (!access.ok) return access.response;

    const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl.trim() : '';

    if (!imageUrl) {
        await env.DB.prepare(
            'DELETE FROM guide_tv_tile_images WHERE apartment_id = ? AND slot = ?'
        ).bind(apartmentId, slot).run();
        return jsonResponse({ success: true, slot, imageUrl: null });
    }

    // Sólo http(s): el valor acaba en el `src` de un <img> de la TV, y un
    // `javascript:` o un `data:` ahí no tiene ningún uso legítimo.
    if (!/^https?:\/\//i.test(imageUrl)) {
        return errorResponse('imageUrl debe ser una URL http(s)');
    }

    await env.DB.prepare(`
        INSERT INTO guide_tv_tile_images (apartment_id, slot, image_url, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(apartment_id, slot) DO UPDATE SET image_url = excluded.image_url, updated_at = excluded.updated_at
    `).bind(apartmentId, slot, imageUrl, new Date().toISOString()).run();

    return jsonResponse({ success: true, slot, imageUrl });
}
