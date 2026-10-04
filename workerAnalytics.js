// Analítica de la carta para el panel de restaurantes (apps/admin AnalyticsPage).
//
// Todas las rutas llegan ya autenticadas y con el tenant comprobado: llevan
// ?restaurant_id= y worker.js las pasa por checkRestaurantScope (capa 3).
//
// Oct-2026: cada endpoint lanza sus consultas en UNA ida a D1 (env.DB.batch) en
// vez de en serie, los nombres de platos/secciones se resuelven con un JOIN en
// vez de una consulta por fila (hasta 40 por carga del panel), y se dejaron de
// calcular los bloques que el panel nunca pintaba (flujos entre secciones,
// atribución por QR, top de secciones y seis desgloses de sesión). También se
// quitaron /analytics/debug (devolvía el stack trace) y /popular-dishes, que no
// llamaba nadie.

// Filtro común a todas las consultas sobre `sessions`. Excluye:
//   - is_internal: dispositivos de desarrollo/pruebas y personal del local.
//     Un solo visitor_id acumulaba 184 de las 1009 sesiones históricas (18%) y
//     contaminaba todas las medias del panel.
//   - Sesiones históricas de quien rechazó el banner de cookies (consent_analytics = 0
//     y sin visitor_day_hash). Desde la migración 0101 la carta mide de forma anónima,
//     como la guía: toda sesión nueva lleva visitor_day_hash (hash diario calculado en
//     el servidor, nada en el móvil) y cuenta aunque no haya consentimiento;
//     consent_analytics = 1 solo dice que además hay un visitor_id de 12 meses.
// Los únicos se cuentan con VISITOR_KEY. Asume que la tabla está aliasada como `s`.
const SESSION_FILTER = 'AND s.is_internal = 0 AND (s.consent_analytics = 1 OR s.visitor_day_hash IS NOT NULL)';
const VISITOR_KEY = 'COALESCE(s.visitor_id, s.visitor_day_hash, s.id)';

export async function handleAnalyticsRequests(request, env) {
    if (request.method !== 'GET') return null;
    const url = new URL(request.url);
    const handler = ROUTES[url.pathname.replace(/\/$/, '')];
    if (!handler) return null;

    const params = url.searchParams;
    const restaurantId = params.get('restaurant_id');
    if (!restaurantId) {
        return createResponse({ success: false, message: 'restaurant_id requerido' }, 400);
    }
    try {
        return createResponse(await handler(env, restaurantId, resolveRange(params), params, url));
    } catch (err) {
        console.error(`[Analytics] ${url.pathname}:`, err);
        return createResponse({ success: false, message: String(err?.message ?? err) }, 500);
    }
}

const ROUTES = {
    '/analytics': getOverview,
    '/analytics/dishes': getDishStats,
    '/analytics/sections': getSectionStats,
    '/analytics/sessions': getSessionList,
};

// ---------------------------------------------------------------------------
// GET /analytics — pestaña KPIs
// ---------------------------------------------------------------------------
async function getOverview(env, restaurantId, range, params) {
    const { from, to, fromTs, toTs } = range;
    const lang = params.get('lang') ?? 'es';
    const topN = clampInt(params.get('top'), 10, 1, 50);
    const sessionWhere = `s.restaurant_id = ? AND s.started_at >= ? AND s.started_at < ? ${SESSION_FILTER}`;
    const sessionArgs = [restaurantId, fromTs, toTs];

    const [
        sessionStats, eventStats, dishDuration, recurrence, attribution,
        topApartments, timeseries, topDishes, cities, byHour, cart,
    ] = await env.DB.batch([
        // Duración: duration_seconds si existe (heartbeat/fin de sesión); si no,
        // hasta el último evento de esa sesión. Sin visitor_id ni hash del día
        // (sesiones antiguas), la sesión cuenta como visitante.
        env.DB.prepare(`
            SELECT COUNT(*) AS total_sessions,
                   COUNT(DISTINCT ${VISITOR_KEY}) AS unique_visitors,
                   AVG(COALESCE(
                       s.duration_seconds,
                       (SELECT MAX(CAST((julianday(e.created_at) - julianday(s.started_at)) * 86400 AS INTEGER))
                        FROM events e WHERE e.session_id = s.id)
                   )) AS avg_session_duration
            FROM sessions s
            WHERE ${sessionWhere}`).bind(...sessionArgs),
        // 'favorite' solo cuenta los que marcan (value true/1), no los des-favoritos.
        env.DB.prepare(`
            SELECT SUM(CASE WHEN e.event_type = 'viewdish' THEN 1 ELSE 0 END) AS dish_views,
                   SUM(CASE WHEN e.event_type = 'favorite' AND (e.value = 'true' OR e.value = '1') THEN 1 ELSE 0 END) AS favorites
            FROM events e
            WHERE e.restaurant_id = ? AND e.created_at >= ? AND e.created_at < ?
              AND e.event_type IN ('viewdish', 'favorite')
              AND e.session_id IN (SELECT s.id FROM sessions s WHERE s.restaurant_id = ? ${SESSION_FILTER})`)
            .bind(restaurantId, fromTs, toTs, restaurantId),
        // Media ponderada por vistas, no media de medias diarias.
        env.DB.prepare(`
            SELECT CAST(SUM(total_view_time) AS REAL) / NULLIF(SUM(views), 0) AS avg_dish_view_duration
            FROM dish_daily_metrics
            WHERE restaurant_id = ? AND date BETWEEN ? AND ?`).bind(restaurantId, from, to),
        // Cada visitante cae en un solo cubo:
        //   nuevo      = su primera visita de siempre cae en el rango y no ha vuelto otro día
        //   recurrente = ya había venido antes, o ha vuelto otro día dentro del rango
        env.DB.prepare(`
            SELECT SUM(CASE WHEN first_visit = 1 AND visit_days = 1 THEN 1 ELSE 0 END) AS new_visitors,
                   SUM(CASE WHEN first_visit > 1 OR visit_days > 1 THEN 1 ELSE 0 END) AS returning_visitors
            FROM (
                SELECT ${VISITOR_KEY} AS vid,
                       MIN(s.visit_count) AS first_visit,
                       COUNT(DISTINCT DATE(s.started_at)) AS visit_days
                FROM sessions s
                WHERE ${sessionWhere}
                GROUP BY 1
            )`).bind(...sessionArgs),
        // De dónde llega el tráfico: guidebook, TV del alojamiento, QR o directo.
        env.DB.prepare(`
            SELECT COALESCE(s.referral_source, 'direct') AS source,
                   COUNT(*) AS sessions,
                   COUNT(DISTINCT s.referral_apartment_id) AS apartments,
                   SUM(CASE WHEN cs.id IS NOT NULL THEN 1 ELSE 0 END) AS with_cart
            FROM sessions s
            LEFT JOIN cart_sessions cs ON cs.sessionid = s.id
            WHERE ${sessionWhere}
            GROUP BY 1 ORDER BY sessions DESC`).bind(...sessionArgs),
        env.DB.prepare(`
            SELECT s.referral_apartment_id AS apartment_id,
                   a.name AS apartment_name,
                   COUNT(*) AS sessions,
                   COUNT(DISTINCT ${VISITOR_KEY}) AS visitors,
                   SUM(CASE WHEN cs.id IS NOT NULL THEN 1 ELSE 0 END) AS with_cart
            FROM sessions s
            LEFT JOIN guide_apartments a ON a.id = s.referral_apartment_id
            LEFT JOIN cart_sessions cs ON cs.sessionid = s.id
            WHERE ${sessionWhere} AND s.referral_apartment_id IS NOT NULL
            GROUP BY 1, 2 ORDER BY sessions DESC LIMIT ?`).bind(...sessionArgs, topN),
        // Serie diaria siempre desde la tabla fuente (daily_analytics dejó de
        // escribirse el 2026-01-18).
        env.DB.prepare(`
            SELECT DATE(s.started_at) AS date,
                   COUNT(*) AS total_sessions,
                   COUNT(DISTINCT ${VISITOR_KEY}) AS unique_visitors
            FROM sessions s
            WHERE ${sessionWhere}
            GROUP BY DATE(s.started_at)
            ORDER BY date ASC`).bind(...sessionArgs),
        topDishesQuery(env, `
            SELECT dish_id, SUM(views) AS views, SUM(favorites) AS favorites
            FROM dish_daily_metrics
            WHERE restaurant_id = ? AND date BETWEEN ? AND ?
            GROUP BY dish_id ORDER BY views DESC LIMIT ?`).bind(restaurantId, from, to, topN, lang),
        env.DB.prepare(`
            SELECT COALESCE(s.city, 'unknown') AS key, COUNT(*) AS count
            FROM sessions s
            WHERE ${sessionWhere}
            GROUP BY 1 ORDER BY count DESC LIMIT 20`).bind(...sessionArgs),
        // Hora local del visitante (offset que manda el cliente). Las sesiones
        // antiguas guardaron ahí un string IANA que castea a 0: cuentan como UTC.
        env.DB.prepare(`
            SELECT strftime('%H', datetime(s.started_at,
                       printf('%+d minutes', COALESCE(CAST(s.timezone_offset AS INTEGER), 0)))) AS hour,
                   COUNT(*) AS sessions
            FROM sessions s
            WHERE ${sessionWhere}
            GROUP BY hour ORDER BY hour ASC`).bind(...sessionArgs),
        env.DB.prepare(`
            SELECT COUNT(*) AS total_carts_created,
                   SUM(CASE WHEN modificationscount > 0 THEN 1 ELSE 0 END) AS total_carts_active,
                   SUM(CASE WHEN status IN ('converted', 'checkout') THEN 1 ELSE 0 END) AS total_carts_converted,
                   SUM(estimatedvalue) AS total_estimated_value,
                   AVG(estimatedvalue) AS avg_cart_value,
                   SUM(totalitems) AS total_items_added
            FROM cart_sessions cm
            WHERE cm.restaurantid = ? AND cm.createdat >= ? AND cm.createdat < ?
              AND cm.sessionid IN (SELECT s.id FROM sessions s WHERE s.restaurant_id = ? ${SESSION_FILTER})`)
            .bind(restaurantId, fromTs, toTs, restaurantId),
    ]);

    let dishes = topDishes.results ?? [];
    if (dishes.length === 0) {
        // Restaurantes cuyo agregado diario aún no existe: se cuenta desde events.
        const fallback = await topDishesQuery(env, `
            SELECT entity_id AS dish_id,
                   SUM(CASE WHEN event_type = 'viewdish' THEN 1 ELSE 0 END) AS views,
                   SUM(CASE WHEN event_type = 'favorite' THEN 1 ELSE 0 END) AS favorites
            FROM events
            WHERE restaurant_id = ? AND entity_type = 'dish' AND created_at >= ? AND created_at < ?
            GROUP BY entity_id ORDER BY views DESC LIMIT ?`).bind(restaurantId, fromTs, toTs, topN, lang).all();
        dishes = fallback.results ?? [];
    }

    const s = first(sessionStats);
    const ev = first(eventStats);
    const rec = first(recurrence);
    const c = first(cart);
    const created = Number(c?.total_carts_created ?? 0);
    const converted = Number(c?.total_carts_converted ?? 0);

    return {
        success: true,
        range: { from, to },
        summary: {
            total_views: ev?.dish_views || 0,
            unique_visitors: s?.unique_visitors || 0,
            total_sessions: s?.total_sessions || 0,
            avg_session_duration: s?.avg_session_duration || 0,
            dish_views: ev?.dish_views || 0,
            favorites: ev?.favorites || 0,
            avg_dish_view_duration: first(dishDuration)?.avg_dish_view_duration || 0,
            new_visitors: rec?.new_visitors || 0,
            returning_visitors: rec?.returning_visitors || 0,
        },
        timeseries: timeseries.results ?? [],
        topDishes: dishes.map(r => ({
            dish_id: r.dish_id,
            name: r.name ?? r.dish_id,
            views: Number(r.views ?? 0),
            favorites: Number(r.favorites ?? 0),
        })),
        breakdowns: { cities: cities.results ?? [] },
        trafficByHour: byHour.results ?? [],
        attribution: (attribution.results ?? []).map(r => ({
            source: r.source,
            sessions: Number(r.sessions ?? 0),
            apartments: Number(r.apartments ?? 0),
            with_cart: Number(r.with_cart ?? 0),
        })),
        topApartments: (topApartments.results ?? []).map(r => ({
            apartment_id: r.apartment_id,
            name: r.apartment_name ?? r.apartment_id,
            sessions: Number(r.sessions ?? 0),
            visitors: Number(r.visitors ?? 0),
            with_cart: Number(r.with_cart ?? 0),
        })),
        cartMetrics: {
            total_carts_created: created,
            total_carts_shown: Number(c?.total_carts_active ?? 0),
            total_carts_abandoned: created - converted,
            avg_conversion_rate: created > 0 ? converted / created : 0,
            total_estimated_value: Number(c?.total_estimated_value ?? 0),
            avg_cart_value: Number(c?.avg_cart_value ?? 0),
            total_items_added: Number(c?.total_items_added ?? 0),
        },
    };
}

// El top de platos con su nombre en el idioma pedido, en la misma consulta.
// `inner` devuelve dish_id/views/favorites y recibe sus binds; el último bind
// es el idioma del nombre.
function topDishesQuery(env, inner) {
    return env.DB.prepare(`
        WITH top AS (${inner})
        SELECT top.dish_id, top.views, top.favorites, t.value AS name
        FROM top
        LEFT JOIN translations t ON t.entity_id = top.dish_id AND t.entity_type = 'dish'
             AND t.field = 'name' AND t.language_code = ?
        ORDER BY top.views DESC`);
}

// ---------------------------------------------------------------------------
// GET /analytics/dishes — pestaña Platos
// ---------------------------------------------------------------------------
async function getDishStats(env, restaurantId, range, params, url) {
    const { from, to, fromTs, toTs } = range;
    const lang = params.get('lang') ?? 'es';
    // Una consulta: métricas diarias + añadidos al carrito (índice
    // restaurant_id/event_type/created_at de events) + nombre + foto principal.
    const { results } = await env.DB.prepare(`
        WITH m AS (
            SELECT dish_id,
                   SUM(views) AS views,
                   SUM(favorites) AS favorites,
                   COALESCE(CAST(SUM(total_view_time) AS REAL) / NULLIF(SUM(views), 0), 0) AS avg_dwell_seconds
            FROM dish_daily_metrics
            WHERE restaurant_id = ? AND date BETWEEN ? AND ?
            GROUP BY dish_id
        ), carts AS (
            SELECT entity_id AS dish_id, COUNT(*) AS cart_additions
            FROM events
            WHERE restaurant_id = ? AND event_type = 'cart_item_added' AND created_at >= ? AND created_at < ?
            GROUP BY entity_id
        )
        SELECT m.dish_id, m.views, m.favorites, m.avg_dwell_seconds,
               COALESCE(c.cart_additions, 0) AS cart_additions,
               t.value AS name,
               (SELECT dm.r2_key FROM dish_media dm
                WHERE dm.dish_id = m.dish_id AND dm.media_type = 'image'
                ORDER BY dm.is_primary DESC, dm.order_index ASC LIMIT 1) AS image_key
        FROM m
        LEFT JOIN carts c ON c.dish_id = m.dish_id
        LEFT JOIN translations t ON t.entity_id = m.dish_id AND t.entity_type = 'dish'
             AND t.field = 'name' AND t.language_code = ?
        ORDER BY m.views DESC`)
        .bind(restaurantId, from, to, restaurantId, fromTs, toTs, lang).all();

    return {
        success: true,
        data: (results ?? []).map(({ image_key, ...d }) => ({
            ...d,
            name: d.name ?? 'Sin nombre',
            image: image_key ? `${url.origin}/media/${image_key}` : null,
        })),
    };
}

// ---------------------------------------------------------------------------
// GET /analytics/sections — pestaña Secciones
// ---------------------------------------------------------------------------
async function getSectionStats(env, restaurantId, range, params) {
    const { from, to } = range;
    const lang = params.get('lang') ?? 'es';
    // Medias ponderadas por vistas, no medias de medias diarias.
    const { results } = await env.DB.prepare(`
        SELECT sm.section_id,
               COALESCE(SUM(sm.views), 0) AS views,
               COALESCE(SUM(sm.dish_views), 0) AS dish_views,
               COALESCE(SUM(sm.avg_time_spent * sm.views) / NULLIF(SUM(sm.views), 0), 0) AS avg_dwell_seconds,
               COALESCE(SUM(sm.avg_scroll_depth * sm.views) / NULLIF(SUM(sm.views), 0), 0) AS avg_scroll_depth,
               t.value AS name
        FROM section_daily_metrics sm
        LEFT JOIN translations t ON t.entity_id = sm.section_id AND t.entity_type = 'section'
             AND t.field = 'name' AND t.language_code = ?
        WHERE sm.restaurant_id = ? AND sm.date BETWEEN ? AND ?
        GROUP BY sm.section_id, t.value
        ORDER BY views DESC`)
        .bind(lang, restaurantId, from, to).all();

    return {
        success: true,
        data: (results ?? []).map(r => ({ ...r, name: r.name ?? 'Sin nombre' })),
    };
}

// ---------------------------------------------------------------------------
// GET /analytics/sessions — pestaña Sesiones (paginada)
// ---------------------------------------------------------------------------
async function getSessionList(env, restaurantId, range, params) {
    const { fromTs, toTs } = range;
    const page = clampInt(params.get('page'), 1, 1, 10000);
    const limit = clampInt(params.get('limit'), 20, 1, 100);
    const offset = (page - 1) * limit;
    const sessionWhere = `s.restaurant_id = ? AND s.started_at >= ? AND s.started_at < ? ${SESSION_FILTER}`;

    const [sessions, total] = await env.DB.batch([
        env.DB.prepare(`
            SELECT s.id, s.started_at, s.duration_seconds, s.device_type, s.os_name, s.browser, s.country, s.city,
                   s.visit_count, s.visitor_id, s.language_code, s.referrer, s.pwa_installed,
                   s.referral_source, s.referral_apartment_id,
                   u.display_name AS user_name,
                   cs.totalitems AS cart_items,
                   cs.estimatedvalue AS cart_value
            FROM sessions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN cart_sessions cs ON s.id = cs.sessionid
            WHERE ${sessionWhere}
            ORDER BY s.started_at DESC
            LIMIT ? OFFSET ?`).bind(restaurantId, fromTs, toTs, limit, offset),
        env.DB.prepare(`SELECT COUNT(*) AS count FROM sessions s WHERE ${sessionWhere}`)
            .bind(restaurantId, fromTs, toTs),
    ]);

    const rows = sessions.results ?? [];
    const ids = rows.map(r => r.id);
    const eventsBySession = {};
    const likedBySession = {};
    if (ids.length > 0) {
        // Resumen de eventos y platos favoritos de TODA la página en dos
        // consultas. Antes eran dos por sesión (hasta 200 en una página de 100).
        const marks = ids.map(() => '?').join(',');
        const [counts, liked] = await env.DB.batch([
            env.DB.prepare(`
                SELECT session_id, event_type, COUNT(*) AS count
                FROM events WHERE session_id IN (${marks})
                GROUP BY session_id, event_type`).bind(...ids),
            env.DB.prepare(`
                SELECT DISTINCT e.session_id, t.value AS name
                FROM events e
                JOIN translations t ON t.entity_id = e.entity_id AND t.entity_type = 'dish'
                     AND t.field = 'name' AND t.language_code = 'es'
                WHERE e.session_id IN (${marks}) AND e.event_type = 'favorite'`).bind(...ids),
        ]);
        for (const r of counts.results ?? []) {
            (eventsBySession[r.session_id] ??= {})[r.event_type] = r.count;
        }
        for (const r of liked.results ?? []) {
            (likedBySession[r.session_id] ??= []).push(r.name);
        }
    }

    const count = first(total)?.count ?? 0;
    return {
        success: true,
        data: rows.map(r => ({ ...r, events: eventsBySession[r.id] ?? {}, liked_dishes: likedBySession[r.id] ?? [] })),
        pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
export function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Cache-Control": "no-store"
        },
    });
}

function first(result) {
    return result?.results?.[0] ?? null;
}

function clampInt(raw, fallback, min, max) {
    const n = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

/**
 * Rango de días [from, to] (YYYY-MM-DD, UTC) y su equivalente en timestamps
 * ISO para las tablas con datetime. `toTs` es EXCLUSIVO (medianoche del día
 * siguiente): con '23:59:59' se perdían los eventos de ese último segundo, que
 * el tracking guarda con milisegundos.
 */
function resolveRange(params) {
    const now = new Date();
    const to = isDateParam(params.get('to')) ? params.get('to') : isoDate(now);
    const from = isDateParam(params.get('from')) ? params.get('from') : computeFrom(params.get('time_range') ?? 'week', now);
    const next = new Date(`${to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { from, to, fromTs: `${from}T00:00:00`, toTs: `${isoDate(next)}T00:00:00` };
}

function isDateParam(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isoDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function computeFrom(range, now) {
    const d = new Date(now);
    if (range === "today") return isoDate(d);
    if (range === "month") d.setUTCMonth(d.getUTCMonth() - 1);
    else if (range === "quarter") d.setUTCMonth(d.getUTCMonth() - 3);
    else if (range === "year") d.setUTCFullYear(d.getUTCFullYear() - 1);
    else d.setUTCDate(d.getUTCDate() - 7);
    return isoDate(d);
}
