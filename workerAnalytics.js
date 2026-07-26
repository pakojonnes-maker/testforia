// Filtro común a todas las consultas sobre `sessions`. Excluye:
//   - is_internal: dispositivos de desarrollo/pruebas y personal del local.
//     Un solo visitor_id acumulaba 184 de las 1009 sesiones históricas (18%) y
//     contaminaba todas las medias del panel.
//   - consent_analytics = 0: visitantes que rechazaron el banner de cookies.
// SESSION_FILTER asume que la tabla está aliasada como `s`; SESSION_FILTER_RAW
// es la variante sin alias.
const SESSION_FILTER = 'AND s.is_internal = 0 AND s.consent_analytics = 1';
const SESSION_FILTER_RAW = 'AND is_internal = 0 AND consent_analytics = 1';

export async function handleAnalyticsRequests(request, env) {
    const url = new URL(request.url);
    // CORS preflight
    if (request.method === "OPTIONS") {
        return createResponse({}, 204);
    }
    // 🔧 DEBUG ENDPOINT - Check what data exists
    if (request.method === "GET" && url.pathname === "/analytics/debug") {
        const params = new URLSearchParams(url.search);
        const restaurantId = params.get("restaurant_id");
        if (!restaurantId) {
            return createResponse({ error: "restaurant_id required" }, 400);
        }
        try {
            // Check daily_analytics table
            const dailyAnalytics = await env.DB.prepare(
                `SELECT date, total_views, unique_visitors, total_sessions, dish_views 
                 FROM daily_analytics 
                 WHERE restaurant_id = ? 
                 ORDER BY date DESC 
                 LIMIT 10`
            ).bind(restaurantId).all();
            // Check sessions table
            const sessions = await env.DB.prepare(
                `SELECT COUNT(*) as count, MIN(started_at) as first, MAX(started_at) as last 
                 FROM sessions 
                 WHERE restaurant_id = ?`
            ).bind(restaurantId).first();
            // Check events table
            const events = await env.DB.prepare(
                `SELECT event_type, COUNT(*) as count 
                 FROM events 
                 WHERE restaurant_id = ? 
                 GROUP BY event_type 
                 ORDER BY count DESC 
                 LIMIT 20`
            ).bind(restaurantId).all();
            // Check dish_daily_metrics
            const dishMetrics = await env.DB.prepare(
                `SELECT dish_id, SUM(views) as views, SUM(favorites) as favorites 
                 FROM dish_daily_metrics 
                 WHERE restaurant_id = ? 
                 GROUP BY dish_id 
                 ORDER BY views DESC 
                 LIMIT 10`
            ).bind(restaurantId).all();
            // Check section_daily_metrics
            const sectionMetrics = await env.DB.prepare(
                `SELECT section_id, SUM(views) as views, AVG(avg_time_spent) as avg_time 
                 FROM section_daily_metrics 
                 WHERE restaurant_id = ? 
                 GROUP BY section_id`
            ).bind(restaurantId).all();
            return createResponse({
                success: true,
                restaurantId,
                debug: {
                    daily_analytics: {
                        rows: dailyAnalytics.results?.length || 0,
                        sample: dailyAnalytics.results?.slice(0, 3) || []
                    },
                    sessions: sessions,
                    events: {
                        types: events.results || []
                    },
                    dish_daily_metrics: {
                        dishes: dishMetrics.results?.length || 0,
                        sample: dishMetrics.results?.slice(0, 5) || []
                    },
                    section_daily_metrics: {
                        sections: sectionMetrics.results?.length || 0,
                        sample: sectionMetrics.results || []
                    }
                }
            });
        } catch (err) {
            return createResponse({ error: err.message, stack: err.stack }, 500);
        }
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
            // 1) Summary - Calculate from source tables (not daily_analytics which may be empty)
            // ✅ IMPROVED: Smart fallback for session duration
            // - Uses duration_seconds if available (from heartbeats or session end)
            // - Falls back to calculating from last event timestamp
            // - Counts sessions as unique visitors when visitor_id is NULL
            const sessionStats = await env.DB.prepare(
                `SELECT
                   COUNT(*) AS total_sessions,
                   COUNT(DISTINCT COALESCE(visitor_id, id)) AS unique_visitors,
                   AVG(
                       COALESCE(
                           duration_seconds,
                           -- Fallback: Calculate from last event if duration_seconds is NULL
                           (SELECT MAX(
                               CAST((julianday(e.created_at) - julianday(s.started_at)) * 86400 AS INTEGER)
                           ) FROM events e WHERE e.session_id = s.id)
                       )
                   ) AS avg_session_duration
                 FROM sessions s
                 WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}`
            ).bind(restaurantId, fromTs, toTs).first();
            // Get event stats
            // ✅ FIX: 'favorite' se contaba entero, incluidos los DES-favoritos
            // (value='false'), inflando el engagement. Ahora solo cuentan los que
            // marcan como favorito, igual que hacía la agregación diaria.
            const eventStats = await env.DB.prepare(
                `SELECT
                   SUM(CASE WHEN e.event_type = 'viewdish' THEN 1 ELSE 0 END) AS dish_views,
                   SUM(CASE WHEN e.event_type = 'favorite' AND (e.value = 'true' OR e.value = '1') THEN 1 ELSE 0 END) AS favorites,
                   SUM(CASE WHEN e.event_type = 'rating' THEN 1 ELSE 0 END) AS ratings,
                   SUM(CASE WHEN e.event_type = 'share' THEN 1 ELSE 0 END) AS shares,
                   SUM(CASE WHEN e.event_type = 'media_error' THEN 1 ELSE 0 END) AS media_errors,
                   AVG(CASE WHEN e.event_type = 'section_time' THEN e.numeric_value END) AS avg_section_time,
                   AVG(CASE WHEN e.event_type = 'scroll_depth' THEN e.numeric_value END) AS avg_scroll_depth
                 FROM events e
                 WHERE e.restaurant_id = ? AND e.created_at BETWEEN ? AND ?
                   AND e.session_id IN (SELECT s.id FROM sessions s WHERE s.restaurant_id = ? ${SESSION_FILTER})`
            ).bind(restaurantId, fromTs, toTs, restaurantId).first();
            // ✅ FIX: era AVG(avg_view_duration) — una media de medias diarias, en la
            // que un día con 2 visitas pesaba lo mismo que uno con 500. Ahora se
            // pondera por número de vistas.
            const dishDurationStats = await env.DB.prepare(
                `SELECT CAST(SUM(total_view_time) AS REAL) / NULLIF(SUM(views), 0) AS avg_dish_view_duration
                 FROM dish_daily_metrics
                 WHERE restaurant_id = ? AND date BETWEEN ? AND ?`
            ).bind(restaurantId, from, to).first();
            // ✅ FIX (doble contabilidad): antes se contaba a nivel de SESIÓN, así que
            // un visitante con 3 sesiones caía en los dos cubos a la vez (su primera
            // sesión tiene visit_count=1 y las siguientes >1). En producción daba
            // 394 nuevos + 63 recurrentes = 457 sobre 394 únicos reales.
            // Ahora se agrega primero por visitante y cada uno cae en un solo cubo:
            //   - nuevo      = su primera visita de todos los tiempos cae en el rango
            //   - recurrente = ya había visitado antes, o ha vuelto otro día
            const visitorRecurrence = await env.DB.prepare(
                `SELECT
                   SUM(CASE WHEN first_visit = 1 AND visit_days = 1 THEN 1 ELSE 0 END) AS new_visitors,
                   SUM(CASE WHEN first_visit > 1 OR visit_days > 1 THEN 1 ELSE 0 END) AS returning_visitors
                 FROM (
                   SELECT COALESCE(visitor_id, id) AS vid,
                          MIN(visit_count) AS first_visit,
                          COUNT(DISTINCT DATE(started_at)) AS visit_days
                   FROM sessions s
                   WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}
                   GROUP BY 1
                 )`
            ).bind(restaurantId, fromTs, toTs).first();
            // Atribución cruzada: de dónde llegan las sesiones de este restaurante.
            const attribution = await env.DB.prepare(
                `SELECT COALESCE(s.referral_source, 'direct') AS source,
                        COUNT(*) AS sessions,
                        COUNT(DISTINCT s.referral_apartment_id) AS apartments,
                        SUM(CASE WHEN cs.id IS NOT NULL THEN 1 ELSE 0 END) AS with_cart
                 FROM sessions s
                 LEFT JOIN cart_sessions cs ON cs.sessionid = s.id
                 WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}
                 GROUP BY 1 ORDER BY sessions DESC`
            ).bind(restaurantId, fromTs, toTs).all();
            // Top alojamientos que envían clientes a este restaurante.
            const topApartments = await env.DB.prepare(
                `SELECT s.referral_apartment_id AS apartment_id,
                        a.name AS apartment_name,
                        COUNT(*) AS sessions,
                        COUNT(DISTINCT COALESCE(s.visitor_id, s.id)) AS visitors,
                        SUM(CASE WHEN cs.id IS NOT NULL THEN 1 ELSE 0 END) AS with_cart
                 FROM sessions s
                 LEFT JOIN guide_apartments a ON a.id = s.referral_apartment_id
                 LEFT JOIN cart_sessions cs ON cs.sessionid = s.id
                 WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ?
                   AND s.referral_apartment_id IS NOT NULL ${SESSION_FILTER}
                 GROUP BY 1, 2 ORDER BY sessions DESC LIMIT ?`
            ).bind(restaurantId, fromTs, toTs, topN).all();
            // Combine into summary object
            const summary = {
                total_views: eventStats?.dish_views || 0,
                unique_visitors: sessionStats?.unique_visitors || 0,
                total_sessions: sessionStats?.total_sessions || 0,
                avg_session_duration: sessionStats?.avg_session_duration || 0,
                dish_views: eventStats?.dish_views || 0,
                favorites: eventStats?.favorites || 0,
                ratings: eventStats?.ratings || 0,
                shares: eventStats?.shares || 0,
                avg_dish_view_duration: dishDurationStats?.avg_dish_view_duration || 0,
                avg_section_time: eventStats?.avg_section_time || 0,
                avg_scroll_depth: eventStats?.avg_scroll_depth || 0,
                media_errors: eventStats?.media_errors || 0,
                // ✅ NEW: Include visitor recurrence for return rate calculation
                new_visitors: visitorRecurrence?.new_visitors || 0,
                returning_visitors: visitorRecurrence?.returning_visitors || 0
            };
            console.log('[Analytics] Summary calculated:', summary);
            // 2) Timeseries — SIEMPRE desde las tablas fuente.
            // ✅ FIX: antes se leía primero de `daily_analytics` y solo se caía al
            // cálculo en vivo si el resultado venía COMPLETAMENTE vacío. Como esa
            // tabla dejó de escribirse el 2026-01-18, cualquier rango que incluyera
            // diciembre-enero devolvía 34 filas rancias, no activaba el fallback y
            // dejaba invisibles los seis meses siguientes de tráfico real.
            const timeseriesRes = await env.DB.prepare(
                `SELECT
                    DATE(s.started_at) as date,
                    COUNT(*) as total_sessions,
                    COUNT(DISTINCT COALESCE(s.visitor_id, s.id)) as unique_visitors,
                    COUNT(*) as total_views
                 FROM sessions s
                 WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}
                 GROUP BY DATE(s.started_at)
                 ORDER BY date ASC`
            ).bind(restaurantId, fromTs, toTs).all();
            const timeseries = timeseriesRes.results ?? [];
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
            // Todos los desgloses comparten la misma forma: una columna de `sessions`
            // agrupada y contada, con el filtro común de tráfico interno/consentimiento.
            const breakdownBy = (column) => env.DB.prepare(
                `SELECT COALESCE(${column},'unknown') AS key, COUNT(*) AS count
                 FROM sessions s
                 WHERE s.restaurant_id=? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}
                 GROUP BY 1 ORDER BY count DESC`
            ).bind(restaurantId, fromTs, toTs).all();
            const [
                devices, os, browsers, languages, countries, cities, netTypes, pwaStats
            ] = await Promise.all([
                breakdownBy('s.device_type'),
                breakdownBy('s.os_name'),
                breakdownBy('s.browser'),
                breakdownBy('s.language_code'),
                breakdownBy('s.country'),
                breakdownBy('s.city'),
                breakdownBy('s.network_type'),
                env.DB.prepare(
                    `SELECT
                       SUM(CASE WHEN s.pwa_installed=1 THEN 1 ELSE 0 END) AS installed,
                       COUNT(*) AS total
                     FROM sessions s
                     WHERE s.restaurant_id=? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}`
                ).bind(restaurantId, fromTs, toTs).first(),
            ]);
            // 6) Tráfico por hora
            // ✅ FIX: agrupaba por hora UTC, así que un restaurante en España veía su
            // hora punta desplazada 1-2 h según la estación ("mi pico es a las 21h, no
            // a las 19h"). Ahora se convierte a la hora local del visitante usando el
            // offset que manda el cliente. Las sesiones antiguas guardaron ahí un
            // string IANA que castea a 0, así que se comportan como UTC igual que antes.
            const byHour = await env.DB.prepare(
                `SELECT strftime('%H', datetime(s.started_at,
                            printf('%+d minutes', COALESCE(CAST(s.timezone_offset AS INTEGER), 0)))) AS hour,
                        COUNT(*) AS sessions
                 FROM sessions s
                 WHERE s.restaurant_id=? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}
                 GROUP BY hour ORDER BY hour ASC`
            ).bind(restaurantId, fromTs, toTs).all();
            // 7) Flujos entre entidades.
            // `entry_exit_flows` nunca ha tenido una sola escritura (0 filas en
            // producción, ni un INSERT en todo el repo), así que la consulta que
            // había aquí devolvía siempre vacío. Se reconstruye a partir de los
            // eventos reales: pares consecutivos de sección visitada dentro de una
            // misma sesión, que es lo que el panel de flujo quería enseñar.
            const flows = await env.DB.prepare(
                `WITH ordered AS (
                    SELECT e.session_id, e.entity_id, e.created_at,
                           LEAD(e.entity_id) OVER (PARTITION BY e.session_id ORDER BY e.created_at) AS next_entity
                    FROM events e
                    JOIN sessions s ON s.id = e.session_id
                    WHERE e.restaurant_id = ? AND e.event_type = 'view_section'
                      AND e.created_at BETWEEN ? AND ? ${SESSION_FILTER}
                 )
                 SELECT entity_id AS from_entity_id, next_entity AS to_entity_id,
                        'section' AS from_entity_type, 'section' AS to_entity_type,
                        COUNT(*) AS count
                 FROM ordered
                 WHERE next_entity IS NOT NULL AND next_entity <> entity_id
                 GROUP BY 1, 2 ORDER BY count DESC LIMIT ?`
            ).bind(restaurantId, fromTs, toTs, topN).all();
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
            // 9) ✅ NEW: Cart Metrics - Calculated from source (cart_sessions)
            const cartMetricsRaw = await env.DB.prepare(
                `SELECT 
                    COUNT(*) AS total_carts_created,
                    SUM(CASE WHEN modificationscount > 0 THEN 1 ELSE 0 END) AS total_carts_active,
                    SUM(CASE WHEN (status = 'converted' OR status = 'checkout') THEN 1 ELSE 0 END) AS total_carts_converted,
                    SUM(estimatedvalue) AS total_estimated_value,
                    AVG(estimatedvalue) AS avg_cart_value,
                    SUM(totalitems) AS total_items_added,
                    AVG(totalitems) AS avg_items_per_cart
                FROM cart_sessions cm
                WHERE cm.restaurantid = ? AND cm.createdat BETWEEN ? AND ?
                  AND cm.sessionid IN (SELECT s.id FROM sessions s WHERE s.restaurant_id = ? ${SESSION_FILTER})`
            ).bind(restaurantId, fromTs, toTs, restaurantId).first();
            const cartMetrics = {
                total_carts_created: cartMetricsRaw?.total_carts_created || 0,
                total_carts_shown: cartMetricsRaw?.total_carts_active || 0, // Proxying active as shown
                total_carts_abandoned: (cartMetricsRaw?.total_carts_created || 0) - (cartMetricsRaw?.total_carts_converted || 0),
                avg_conversion_rate: cartMetricsRaw?.total_carts_created > 0
                    ? (cartMetricsRaw?.total_carts_converted / cartMetricsRaw?.total_carts_created)
                    : 0,
                total_estimated_value: cartMetricsRaw?.total_estimated_value || 0,
                avg_cart_value: cartMetricsRaw?.avg_cart_value || 0,
                shown_carts_value: cartMetricsRaw?.total_estimated_value || 0,
                total_items_added: cartMetricsRaw?.total_items_added || 0,
                avg_items_per_cart: cartMetricsRaw?.avg_items_per_cart || 0,
                avg_time_to_show: 0
            };
            return createResponse({
                success: true,
                range: { from, to },
                summary,
                timeseries: timeseries,
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
                // De dónde llega el tráfico: guidebook de un apartamento, TV del
                // alojamiento, QR físico o acceso directo.
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
            // Fetch aggregated metrics from dish_daily_metrics + cart events
            const dishes = await env.DB.prepare(
                // ✅ FIX: `unique_viewers` se leía de dish_daily_metrics, columna que
                // el tracking nunca escribe (siempre 0 en pantalla). Ahora se calcula
                // de verdad contando sesiones distintas. Se han quitado
                // reserve_clicks / call_clicks / directions_clicks: no existe ningún
                // evento que las alimente, así que eran tres columnas de ceros.
                // avg_dwell_seconds pasa de media-de-medias a media ponderada.
                `SELECT
                    dm.dish_id,
                    COALESCE(SUM(dm.views), 0) as views,
                    COALESCE(SUM(dm.favorites), 0) as favorites,
                    COALESCE(CAST(SUM(dm.total_view_time) AS REAL) / NULLIF(SUM(dm.views), 0), 0) as avg_dwell_seconds,
                    (SELECT COUNT(DISTINCT e.session_id) FROM events e
                     WHERE e.entity_id = dm.dish_id
                     AND e.event_type = 'viewdish'
                     AND e.restaurant_id = dm.restaurant_id
                     AND DATE(e.created_at) BETWEEN ? AND ?) as unique_viewers,
                    (SELECT COUNT(*) FROM events e
                     WHERE e.entity_id = dm.dish_id
                     AND e.event_type = 'cart_item_added'
                     AND e.restaurant_id = dm.restaurant_id
                     AND DATE(e.created_at) BETWEEN ? AND ?) as cart_additions
                FROM dish_daily_metrics dm
                WHERE dm.restaurant_id = ? AND dm.date BETWEEN ? AND ?
                GROUP BY dm.dish_id
                ORDER BY views DESC`
            ).bind(from, to, from, to, restaurantId, from, to).all();
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
                // ✅ FIX: igual que en platos — `unique_viewers` nunca se escribe, así
                // que se calcula desde events; y las medias se ponderan por vistas en
                // vez de promediar medias diarias.
                `SELECT
                    sm.section_id,
                    COALESCE(SUM(sm.views), 0) as views,
                    COALESCE(SUM(sm.dish_views), 0) as dish_views,
                    COALESCE(SUM(sm.avg_time_spent * sm.views) / NULLIF(SUM(sm.views), 0), 0) as avg_dwell_seconds,
                    COALESCE(SUM(sm.avg_scroll_depth * sm.views) / NULLIF(SUM(sm.views), 0), 0) as avg_scroll_depth,
                    (SELECT COUNT(DISTINCT e.session_id) FROM events e
                     WHERE e.entity_id = sm.section_id
                     AND e.event_type = 'view_section'
                     AND e.restaurant_id = sm.restaurant_id
                     AND DATE(e.created_at) BETWEEN ? AND ?) as unique_viewers
                FROM section_daily_metrics sm
                WHERE sm.restaurant_id = ? AND sm.date BETWEEN ? AND ?
                GROUP BY sm.section_id
                ORDER BY views DESC`
            ).bind(from, to, restaurantId, from, to).all();
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
            // Get sessions with basic info + recurrence data
            const sessions = await env.DB.prepare(
                `SELECT 
                    s.id, s.started_at, s.duration_seconds, s.device_type, s.os_name, s.browser, s.country, s.city,
                    s.visit_count, s.visitor_id, s.language_code, s.referrer, s.pwa_installed,
                    s.referral_source, s.referral_apartment_id,
                    u.display_name as user_name,
                    cs.totalitems as cart_items,
                    cs.estimatedvalue as cart_value
                FROM sessions s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN cart_sessions cs ON s.id = cs.sessionid
                WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}
                ORDER BY s.started_at DESC
                LIMIT ? OFFSET ?`
            ).bind(restaurantId, fromTs, toTs, limit, offset).all();
            // Get total count for pagination
            const total = await env.DB.prepare(
                `SELECT COUNT(*) as count FROM sessions s
                 WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ? ${SESSION_FILTER}`
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
    // /analytics/campaigns: Campaign performance statistics
    // Campaign analytics removed with scratch&win/leads (Fase 2 rework).
    // Loyalty program analytics live in workerLoyalty.js (Fase 3).
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