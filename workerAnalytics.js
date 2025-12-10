
export async function handleAnalyticsRequests(request, env) {
    const url = new URL(request.url);
    // CORS preflight
    if (request.method === "OPTIONS") {
        return createResponse({}, 204);
    }
    // /analytics: dataset completo para AnalyticsPage
    if (request.method === "GET" && (url.pathname === "/analytics" || url.pathname === "/analytics/")) {
        // Auth
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        // Params
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get("restaurant_id");
        const lang = params.get("lang") ?? "es";
        const topN = Number(params.get("top") ?? 10);
        const fromParam = params.get("from");
        const toParam = params.get("to");
        const timeRange = params.get("time_range") ?? "week";
        if (!restaurantId) {
            return createResponse({ success: false, message: "restaurant_id requerido" }, 400);
        }
        // Rango de fechas
        const now = new Date();
        const to = (toParam && toParam !== "") ? toParam : isoDate(now);
        const from = (fromParam && fromParam !== "") ? fromParam : computeFrom(timeRange, now);
        // Timestamps para consultas a tablas con datetime (sessions, events)
        const fromTs = from + 'T00:00:00';
        const toTs = to + 'T23:59:59';
        try {
            // 1) Summary (daily_analytics)
            // ✅ UPDATED: Added new metrics columns
            const summary = await env.DB.prepare(
                `SELECT 
           COALESCE(SUM(total_views),0) AS total_views,
           COALESCE(SUM(unique_visitors),0) AS unique_visitors,
           COALESCE(SUM(total_sessions),0) AS total_sessions,
           COALESCE(AVG(avg_session_duration),0) AS avg_session_duration,
           COALESCE(SUM(dish_views),0) AS dish_views,
           COALESCE(SUM(favorites_added),0) AS favorites,
           -- COALESCE(SUM(ratings_submitted),0) AS ratings,
           -- COALESCE(SUM(shares),0) AS shares,
           COALESCE(AVG(avg_dish_view_duration),0) AS avg_dish_view_duration,
           COALESCE(AVG(avg_section_time),0) AS avg_section_time,
           COALESCE(AVG(avg_scroll_depth),0) AS avg_scroll_depth,
           COALESCE(SUM(media_errors),0) AS media_errors
         FROM daily_analytics
         WHERE restaurant_id = ? AND date BETWEEN ? AND ?`
            ).bind(restaurantId, from, to).first();
            // 2) Timeseries (daily_analytics)
            const timeseriesRes = await env.DB.prepare(
                `SELECT date, total_views, unique_visitors, total_sessions
         FROM daily_analytics
         WHERE restaurant_id = ? AND date BETWEEN ? AND ?
         ORDER BY date ASC`
            ).bind(restaurantId, from, to).all();
            // 3) Top dishes (dish_daily_metrics → fallback events)
            let topDishes = await env.DB.prepare(
                `SELECT dm.dish_id,
                COALESCE(SUM(dm.views),0) AS views,
                COALESCE(SUM(dm.favorites),0) AS favorites
                -- COALESCE(SUM(dm.ratings),0) AS ratings,
                -- COALESCE(AVG(dm.avg_rating),0) AS avg_rating
         FROM dish_daily_metrics dm
         WHERE dm.restaurant_id = ? AND dm.date BETWEEN ? AND ?
         GROUP BY dm.dish_id
         ORDER BY views DESC
         LIMIT ?`
            ).bind(restaurantId, from, to, topN).all();
            if ((topDishes.results?.length ?? 0) === 0) {
                // Fallback a events con tipos reales guardados por el tracking: 'viewdish', 'favorite', 'rating'
                topDishes = await env.DB.prepare(
                    `SELECT e.entity_id AS dish_id,
                  SUM(CASE WHEN e.event_type='viewdish' THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN e.event_type='favorite' THEN 1 ELSE 0 END) AS favorites
                  -- SUM(CASE WHEN e.event_type='rating' THEN 1 ELSE 0 END) AS ratings,
                  -- AVG(CASE WHEN e.event_type='rating' AND e.numeric_value IS NOT NULL THEN e.numeric_value END) AS avg_rating
           FROM events e
           WHERE e.restaurant_id = ?
             AND e.entity_type='dish'
             AND e.created_at BETWEEN ? AND ?
           GROUP BY e.entity_id
           ORDER BY views DESC
           LIMIT ?`
                ).bind(restaurantId, fromTs, toTs, topN).all();
            }
            const dishNames = {};
            for (const row of topDishes.results ?? []) {
                const t = await env.DB.prepare(
                    `SELECT value FROM translations 
           WHERE entity_id = ? AND entity_type='dish' AND field='name' AND language_code = ?`
                ).bind(row.dish_id, lang).first();
                dishNames[row.dish_id] = t?.value ?? row.dish_id;
            }
            // 4) Top sections (section_daily_metrics → fallback events)
            let topSections = await env.DB.prepare(
                `SELECT sm.section_id,
                COALESCE(SUM(sm.views),0) AS views,
                COALESCE(SUM(sm.dish_views),0) AS dish_views
         FROM section_daily_metrics sm
         WHERE sm.restaurant_id = ? AND sm.date BETWEEN ? AND ?
         GROUP BY sm.section_id
         ORDER BY views DESC
         LIMIT ?`
            ).bind(restaurantId, from, to, topN).all();
            if ((topSections.results?.length ?? 0) === 0) {
                // Nota: si no hay eventos de sección capturados, este fallback puede devolver vacío
                topSections = await env.DB.prepare(
                    `SELECT e.entity_id AS section_id,
                  SUM(CASE WHEN e.event_type='click_section' THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN e.event_type='viewdish' THEN 1 ELSE 0 END) AS dish_views
           FROM events e
           WHERE e.restaurant_id = ?
             AND e.entity_type='section'
             AND e.created_at BETWEEN ? AND ?
           GROUP BY e.entity_id
           ORDER BY views DESC
           LIMIT ?`
                ).bind(restaurantId, fromTs, toTs, topN).all();
            }
            const sectionNames = {};
            for (const row of topSections.results ?? []) {
                const t = await env.DB.prepare(
                    `SELECT value FROM translations 
           WHERE entity_id = ? AND entity_type='section' AND field='name' AND language_code = ?`
                ).bind(row.section_id, lang).first();
                sectionNames[row.section_id] = t?.value ?? row.section_id;
            }
            // 5) Breakdown sesiones (dispositivo/OS/navegador/idioma/país/ciudad/red/PWA)
            // Importante: en SQLite, no agrupar por alias; usamos GROUP BY 1 (la primera expresión seleccionada)
            const [
                devices, os, browsers, languages, countries, cities, netTypes, pwaStats
            ] = await Promise.all([
                env.DB.prepare(
                    `SELECT COALESCE(device_type,'unknown') AS key, COUNT(*) AS count
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
           GROUP BY 1 ORDER BY count DESC`
                ).bind(restaurantId, fromTs, toTs).all(),
                env.DB.prepare(
                    `SELECT COALESCE(os_name,'unknown') AS key, COUNT(*) AS count
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
           GROUP BY 1 ORDER BY count DESC`
                ).bind(restaurantId, fromTs, toTs).all(),
                env.DB.prepare(
                    `SELECT COALESCE(browser,'unknown') AS key, COUNT(*) AS count
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
           GROUP BY 1 ORDER BY count DESC`
                ).bind(restaurantId, fromTs, toTs).all(),
                env.DB.prepare(
                    `SELECT COALESCE(language_code,'unknown') AS key, COUNT(*) AS count
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
           GROUP BY 1 ORDER BY count DESC`
                ).bind(restaurantId, fromTs, toTs).all(),
                env.DB.prepare(
                    `SELECT COALESCE(country,'unknown') AS key, COUNT(*) AS count
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
           GROUP BY 1 ORDER BY count DESC`
                ).bind(restaurantId, fromTs, toTs).all(),
                env.DB.prepare(
                    `SELECT COALESCE(city,'unknown') AS key, COUNT(*) AS count
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
           GROUP BY 1 ORDER BY count DESC`
                ).bind(restaurantId, fromTs, toTs).all(),
                env.DB.prepare(
                    `SELECT COALESCE(network_type,'unknown') AS key, COUNT(*) AS count
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
           GROUP BY 1 ORDER BY count DESC`
                ).bind(restaurantId, fromTs, toTs).all(),
                env.DB.prepare(
                    `SELECT 
             SUM(CASE WHEN pwa_installed=1 THEN 1 ELSE 0 END) AS installed,
             COUNT(*) AS total
           FROM sessions
           WHERE restaurant_id=? AND started_at BETWEEN ? AND ?`
                ).bind(restaurantId, fromTs, toTs).first(),
            ]);
            // 6) Tráfico por hora
            const byHour = await env.DB.prepare(
                `SELECT strftime('%H', started_at) AS hour, COUNT(*) AS sessions
         FROM sessions
         WHERE restaurant_id=? AND started_at BETWEEN ? AND ?
         GROUP BY hour ORDER BY hour ASC`
            ).bind(restaurantId, fromTs, toTs).all();
            // 7) Flujos (entry_exit_flows)
            const flows = await env.DB.prepare(
                `SELECT from_entity_type, to_entity_type, 
                SUM(count) AS count
         FROM entry_exit_flows
         WHERE restaurant_id=? AND date BETWEEN ? AND ?
         GROUP BY from_entity_type, to_entity_type
         ORDER BY count DESC
         LIMIT ?`
            ).bind(restaurantId, from, to, topN).all();
            // 8) Atribución por QR
            const qr = await env.DB.prepare(
                `SELECT qc.id AS qr_code_id, qc.location,
                COUNT(qs.id) AS scans
         FROM qr_codes qc
         LEFT JOIN qr_scans qs ON qc.id = qs.qr_code_id
         WHERE qc.restaurant_id = ?
           AND (qs.scanned_at IS NULL OR qs.scanned_at BETWEEN ? AND ?)
         GROUP BY qc.id, qc.location
         ORDER BY scans DESC`
            ).bind(restaurantId, fromTs, toTs).all();
            // 9) ✅ NEW: Cart Metrics (cart_daily_metrics)
            const cartMetrics = await env.DB.prepare(
                `SELECT 
                    COALESCE(SUM(total_carts_created),0) AS total_carts_created,
                    COALESCE(SUM(total_carts_shown),0) AS total_carts_shown,
                    COALESCE(SUM(total_carts_abandoned),0) AS total_carts_abandoned,
                    COALESCE(AVG(conversion_rate),0) AS avg_conversion_rate,
                    COALESCE(SUM(total_estimated_value),0) AS total_estimated_value,
                    COALESCE(AVG(avg_cart_value),0) AS avg_cart_value,
                    COALESCE(SUM(shown_carts_value),0) AS shown_carts_value,
                    COALESCE(SUM(total_items_added),0) AS total_items_added,
                    COALESCE(AVG(avg_items_per_cart),0) AS avg_items_per_cart,
                    COALESCE(AVG(avg_time_to_show),0) AS avg_time_to_show
                FROM cart_daily_metrics
                WHERE restaurantid = ? AND date BETWEEN ? AND ?`
            ).bind(restaurantId, from, to).first();
            return createResponse({
                success: true,
                range: { from, to },
                summary,
                timeseries: timeseriesRes.results ?? [],
                topDishes: (topDishes.results ?? []).map(r => ({
                    dish_id: r.dish_id,
                    name: dishNames[r.dish_id] ?? r.dish_id,
                    views: Number(r.views ?? 0),
                    favorites: Number(r.favorites ?? 0),
                    // ratings: Number(r.ratings ?? 0),
                    // avg_rating: Number(r.avg_rating ?? 0),
                })),
                topSections: (topSections.results ?? []).map(r => ({
                    section_id: r.section_id,
                    name: sectionNames[r.section_id] ?? r.section_id,
                    views: Number(r.views ?? 0),
                    dish_views: Number(r.dish_views ?? 0),
                })),
                breakdowns: {
                    devices: devices.results ?? [],
                    os: os.results ?? [],
                    browsers: browsers.results ?? [],
                    languages: languages.results ?? [],
                    countries: countries.results ?? [],
                    cities: cities.results ?? [],
                    networks: netTypes.results ?? [],
                    pwa: {
                        installed: Number(pwaStats?.installed ?? 0),
                        total: Number(pwaStats?.total ?? 0),
                        rate: rate(Number(pwaStats?.installed ?? 0), Number(pwaStats?.total ?? 0)),
                    },
                },
                trafficByHour: byHour.results ?? [],
                flows: flows.results ?? [],
                qrAttribution: qr.results ?? [],
                cartMetrics: cartMetrics ?? {
                    total_carts_created: 0,
                    total_carts_shown: 0,
                    total_carts_abandoned: 0,
                    avg_conversion_rate: 0,
                    total_estimated_value: 0,
                    avg_cart_value: 0,
                    shown_carts_value: 0,
                    total_items_added: 0,
                    avg_items_per_cart: 0,
                    avg_time_to_show: 0
                },
            });
        } catch (err) {
            console.error("Analytics error:", err);
            return createResponse({ success: false, message: String(err?.message ?? err) }, 500);
        }
    }
    // /popular-dishes: compat con el worker previo (opcional)
    if (request.method === "GET" && url.pathname === "/popular-dishes") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get("restaurant_id");
        const fromParam = params.get("from");
        const toParam = params.get("to");
        const timeRange = params.get("time_range") ?? "week";
        const lang = params.get("lang") ?? "es";
        const topN = Number(params.get("top") ?? 10);
        if (!restaurantId) {
            return createResponse({ success: false, message: "restaurant_id requerido" }, 400);
        }
        const now = new Date();
        const to = (toParam && toParam !== "") ? toParam : isoDate(now);
        const from = (fromParam && fromParam !== "") ? fromParam : computeFrom(timeRange, now);
        const fromTs = from + 'T00:00:00';
        const toTs = to + 'T23:59:59';
        try {
            const rows = await env.DB.prepare(
                `WITH dish_stats AS (
           SELECT 
             e.entity_id AS dish_id,
             SUM(CASE WHEN e.event_type = 'viewdish' THEN 1 ELSE 0 END) AS views,
             SUM(CASE WHEN e.event_type = 'favorite' THEN 1 ELSE 0 END) AS favorites
           FROM events e
           WHERE e.restaurant_id = ?
             AND e.entity_type='dish'
             AND e.created_at BETWEEN ? AND ?
           GROUP BY e.entity_id
         )
         SELECT 
           ds.dish_id AS id,
           t.value AS name,
           ds.views,
           ds.favorites,
           -- Nota: usar r2_key como referencia de media principal si existe
           (SELECT dm.r2_key FROM dish_media dm 
              WHERE dm.dish_id = ds.dish_id 
                AND dm.is_primary = 1 
              LIMIT 1) AS image_key
         FROM dish_stats ds
         LEFT JOIN translations t ON ds.dish_id = t.entity_id 
           AND t.entity_type = 'dish' 
           AND t.field = 'name' 
           AND t.language_code = ? 
         ORDER BY ds.views DESC, ds.favorites DESC
         LIMIT ?`
            ).bind(restaurantId, fromTs, toTs, lang, topN).all();
            const result = (rows.results ?? []).map(d => ({
                id: d.id,
                name: d.name ?? "Plato sin nombre",
                views: Number(d.views ?? 0),
                favorites: Number(d.favorites ?? 0),
                image: d.image_key ?? null
            }));
            return createResponse(result);
        } catch (error) {
            console.error("Error /popular-dishes:", error);
            return createResponse({ success: false, message: "Error: " + error.message }, 500);
        }
    }
    // /analytics/dishes: Detailed dish statistics
    if (request.method === "GET" && (url.pathname === "/analytics/dishes" || url.pathname === "/analytics/dishes/")) {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get("restaurant_id");
        const lang = params.get("lang") ?? "es";
        const fromParam = params.get("from");
        const toParam = params.get("to");
        const timeRange = params.get("time_range") ?? "week";
        if (!restaurantId) {
            return createResponse({ success: false, message: "restaurant_id requerido" }, 400);
        }
        const now = new Date();
        const to = (toParam && toParam !== "") ? toParam : isoDate(now);
        const from = (fromParam && fromParam !== "") ? fromParam : computeFrom(timeRange, now);
        try {
            // Fetch aggregated metrics from dish_daily_metrics
            const dishes = await env.DB.prepare(
                `SELECT 
                    dm.dish_id,
                    COALESCE(SUM(dm.views), 0) as views,
                    COALESCE(SUM(dm.unique_viewers), 0) as unique_viewers,
                    COALESCE(SUM(dm.favorites), 0) as favorites,
                    -- COALESCE(SUM(dm.ratings), 0) as ratings,
                    -- COALESCE(AVG(dm.avg_rating), 0) as avg_rating,
                    -- COALESCE(SUM(dm.shares), 0) as shares,
                    -- ✅ FIX: Leer la columna correcta que tiene los datos (avg_view_duration en vez de avg_dwell_seconds)
                    COALESCE(AVG(dm.avg_view_duration), 0) as avg_dwell_seconds,
                    COALESCE(SUM(dm.reserve_clicks), 0) as reserve_clicks,
                    COALESCE(SUM(dm.call_clicks), 0) as call_clicks,
                    COALESCE(SUM(dm.directions_clicks), 0) as directions_clicks
                FROM dish_daily_metrics dm
                WHERE dm.restaurant_id = ? AND dm.date BETWEEN ? AND ?
                GROUP BY dm.dish_id
                ORDER BY views DESC`
            ).bind(restaurantId, from, to).all();
            // Fetch names and images
            const results = await Promise.all((dishes.results ?? []).map(async (d) => {
                const [nameRes, imageRes] = await Promise.all([
                    env.DB.prepare(
                        `SELECT value FROM translations 
                         WHERE entity_id = ? AND entity_type='dish' AND field='name' AND language_code = ?`
                    ).bind(d.dish_id, lang).first(),
                    env.DB.prepare(
                        `SELECT r2_key FROM dish_media 
                         WHERE dish_id = ? AND is_primary = 1`
                    ).bind(d.dish_id).first()
                ]);
                return {
                    ...d,
                    name: nameRes?.value ?? "Sin nombre",
                    image: imageRes?.r2_key ? `${url.origin}/media/${imageRes.r2_key}` : null
                };
            }));
            return createResponse({ success: true, data: results });
        } catch (err) {
            console.error("Analytics dishes error:", err);
            return createResponse({ success: false, message: String(err?.message ?? err) }, 500);
        }
    }
    // /analytics/sections: Detailed section statistics
    if (request.method === "GET" && (url.pathname === "/analytics/sections" || url.pathname === "/analytics/sections/")) {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get("restaurant_id");
        const lang = params.get("lang") ?? "es";
        const fromParam = params.get("from");
        const toParam = params.get("to");
        const timeRange = params.get("time_range") ?? "week";
        if (!restaurantId) {
            return createResponse({ success: false, message: "restaurant_id requerido" }, 400);
        }
        const now = new Date();
        const to = (toParam && toParam !== "") ? toParam : isoDate(now);
        const from = (fromParam && fromParam !== "") ? fromParam : computeFrom(timeRange, now);
        try {
            const sections = await env.DB.prepare(
                `SELECT 
                    sm.section_id,
                    COALESCE(SUM(sm.views), 0) as views,
                    COALESCE(SUM(sm.unique_viewers), 0) as unique_viewers,
                    COALESCE(SUM(sm.dish_views), 0) as dish_views,
                    -- ✅ FIX: Leer la columna correcta que tiene los datos (avg_time_spent en vez de avg_dwell_seconds)
                    COALESCE(AVG(sm.avg_time_spent), 0) as avg_dwell_seconds,
                    COALESCE(AVG(sm.avg_scroll_depth), 0) as avg_scroll_depth
                FROM section_daily_metrics sm
                WHERE sm.restaurant_id = ? AND sm.date BETWEEN ? AND ?
                GROUP BY sm.section_id
                ORDER BY views DESC`
            ).bind(restaurantId, from, to).all();
            const results = await Promise.all((sections.results ?? []).map(async (s) => {
                const nameRes = await env.DB.prepare(
                    `SELECT value FROM translations 
                     WHERE entity_id = ? AND entity_type='section' AND field='name' AND language_code = ?`
                ).bind(s.section_id, lang).first();
                return {
                    ...s,
                    name: nameRes?.value ?? "Sin nombre"
                };
            }));
            return createResponse({ success: true, data: results });
        } catch (err) {
            console.error("Analytics sections error:", err);
            return createResponse({ success: false, message: String(err?.message ?? err) }, 500);
        }
    }
    // /analytics/sessions: Detailed sessions list
    if (request.method === "GET" && (url.pathname === "/analytics/sessions" || url.pathname === "/analytics/sessions/")) {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return createResponse({ success: false, message: "No autorizado" }, 401);
        }
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get("restaurant_id");
        const page = Number(params.get("page") ?? 1);
        const limit = Number(params.get("limit") ?? 20);
        const offset = (page - 1) * limit;
        const fromParam = params.get("from");
        const toParam = params.get("to");
        const timeRange = params.get("time_range") ?? "week";
        if (!restaurantId) {
            return createResponse({ success: false, message: "restaurant_id requerido" }, 400);
        }
        const now = new Date();
        const to = (toParam && toParam !== "") ? toParam : isoDate(now);
        const from = (fromParam && fromParam !== "") ? fromParam : computeFrom(timeRange, now);
        const fromTs = from + 'T00:00:00';
        const toTs = to + 'T23:59:59';
        try {
            // Get sessions with basic info
            const sessions = await env.DB.prepare(
                `SELECT 
                    s.id, s.started_at, s.duration_seconds, s.device_type, s.os_name, s.browser, s.country, s.city,
                    u.display_name as user_name,
                    cs.totalitems as cart_items,
                    cs.estimatedvalue as cart_value
                FROM sessions s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN cart_sessions cs ON s.id = cs.sessionid
                WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ?
                ORDER BY s.started_at DESC
                LIMIT ? OFFSET ?`
            ).bind(restaurantId, fromTs, toTs, limit, offset).all();
            // Get total count for pagination
            const total = await env.DB.prepare(
                `SELECT COUNT(*) as count FROM sessions 
                 WHERE restaurant_id = ? AND started_at BETWEEN ? AND ?`
            ).bind(restaurantId, fromTs, toTs).first();
            // Enrich with event summaries
            const enrichedSessions = await Promise.all((sessions.results ?? []).map(async (s) => {
                const events = await env.DB.prepare(
                    `SELECT event_type, COUNT(*) as count 
                     FROM events 
                     WHERE session_id = ? 
                     GROUP BY event_type`
                ).bind(s.id).all();
                const eventSummary = (events.results ?? []).reduce((acc, curr) => {
                    acc[curr.event_type] = curr.count;
                    return acc;
                }, {});
                // Get liked dishes names
                const likedDishes = await env.DB.prepare(
                    `SELECT DISTINCT t.value as name
                     FROM events e
                     JOIN translations t ON e.entity_id = t.entity_id
                     WHERE e.session_id = ? AND e.event_type = 'favorite' 
                     AND t.entity_type = 'dish' AND t.field = 'name' AND t.language_code = 'es'`
                ).bind(s.id).all();
                return {
                    ...s,
                    events: eventSummary,
                    liked_dishes: (likedDishes.results ?? []).map(d => d.name)
                };
            }));
            return createResponse({
                success: true,
                data: enrichedSessions,
                pagination: {
                    page,
                    limit,
                    total: total?.count ?? 0,
                    totalPages: Math.ceil((total?.count ?? 0) / limit)
                }
            });
        } catch (err) {
            console.error("Analytics sessions error:", err);
            return createResponse({ success: false, message: String(err?.message ?? err) }, 500);
        }
    }
    // No es ruta de analytics
    return null;
}
// Utilidades
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
function isoDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function computeFrom(range, now) {
    const d = new Date(now);
    if (range === "today") {
        // For "today", we want from the start of the current UTC day
        return isoDate(d);
    }
    else if (range === "week") d.setUTCDate(d.getUTCDate() - 7);
    else if (range === "month") d.setUTCMonth(d.getUTCMonth() - 1);
    else if (range === "quarter") d.setUTCMonth(d.getUTCMonth() - 3);
    else if (range === "year") d.setUTCFullYear(d.getUTCFullYear() - 1);
    else d.setUTCDate(d.getUTCDate() - 7);
    return isoDate(d);
}
function rate(a, b) {
    return b > 0 ? a / b : 0;
}
