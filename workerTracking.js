// workers/workerTracking.js - VERSIÓN CORREGIDA (FIX D1 TYPE ERROR + CART FIX)
// ============================================
// UTILIDADES DE RESPUESTA
// ============================================
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
function errorResponse(message, status = 400, details = null) {
    return jsonResponse({
        success: false,
        error: message,
        details
    }, status);
}
// ============================================
// UTILIDADES GENERALES
// ============================================
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        array[6] = (array[6] & 0x0f) | 0x40;
        array[8] = (array[8] & 0x3f) | 0x80;
        const hex = Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return [
            hex.slice(0, 8),
            hex.slice(8, 12),
            hex.slice(12, 16),
            hex.slice(16, 20),
            hex.slice(20, 32)
        ].join('-');
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
function toSqlDateUTC(date = new Date()) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function generateId(prefix = 'track') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
}
// ============================================
// EVENT HANDLERS
// ============================================
const EVENT_HANDLERS = {
    'viewdish': {
        field: 'view_count',
        shouldIncrement: true,
        analyticsField: 'dish_views'
    },
    'favorite': {
        field: 'favorite_count',
        shouldIncrement: (value) => value === true || value === 'true',
        analyticsField: 'favorites_added'
    },
    'rating': {
        field: 'rating_count',
        shouldIncrement: true,
        analyticsField: 'ratings_submitted',
        customUpdate: async (db, dishId, value) => {
            if (value && typeof value.rating === 'number') {
                const current = await db.prepare(
                    'SELECT avg_rating, rating_count FROM dishes WHERE id = ?'
                ).bind(dishId).first();
                if (current) {
                    const newCount = current.rating_count + 1;
                    const newAvg = ((current.avg_rating * current.rating_count) + value.rating) / newCount;
                    await db.prepare(
                        'UPDATE dishes SET avg_rating = ?, rating_count = ? WHERE id = ?'
                    ).bind(Math.round(newAvg * 100) / 100, newCount, dishId).run();
                }
            }
        }
    },
    'share': {
        analyticsField: 'shares'
    },
    'dish_view_duration': {
        field: 'total_view_time',
        shouldIncrement: false,
        analyticsField: 'total_dish_view_time',
        customUpdate: async (db, dishId, value) => {
            if (typeof value === 'number' && value > 0) {
                await db.prepare(
                    'UPDATE dishes SET total_view_time = total_view_time + ? WHERE id = ?'
                ).bind(value, dishId).run();
                console.log(`⏱️ [Handler] Tiempo acumulado para ${dishId}: +${value}s`);
            }
        }
    },
    'section_time': {
        analyticsField: 'total_section_time'
    },
    'scroll_depth': {
        analyticsField: 'scroll_depth_events'
    },
    'media_error': {
        analyticsField: 'media_errors'
    },
    // ✅ NEW: Cart Events Handlers (Configuration)
    'cart_created': { analyticsField: 'carts_created' },
    'cart_item_added': { analyticsField: 'cart_items_added' },
    'cart_item_removed': { analyticsField: 'cart_items_removed' },
    'cart_item_quantity': { analyticsField: 'cart_items_quantity' },
    'cart_shown_to_staff': { analyticsField: 'carts_converted' },
    'cart_abandoned': { analyticsField: 'carts_abandoned' }
};
// ============================================
// PRIVACY & ANONYMIZATION UTILS
// ============================================
async function generatePrivacyHash(request, secretSalt) {
    const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Salt rotatorio diario: Hace que el hash sea imposible de rastrear mañana
    const dailyData = `${ip}-${userAgent}-${today}-${secretSalt}`;

    const msgBuffer = new TextEncoder().encode(dailyData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// ============================================
// SESSION MANAGEMENT
// ============================================
async function handleSessionStart(request, env) {
    try {
        const data = await request.json();
        console.log('🔍 [SessionStart] Datos recibidos:', JSON.stringify(data, null, 2));
        let restaurantId = data.restaurantId;
        const {
            userid = null,
            devicetype = 'unknown',
            osname = null,
            browser = 'unknown',
            referrer = null,
            utm = {},
            networktype = null,
            ispwa = false,
            languages = 'es',
            timezone = null,
            qrcode = null // ✅ NEW: Recibir QR code
        } = data;

        if (!restaurantId) {
            return errorResponse('restaurantId es requerido');
        }

        const restaurant = await env.DB.prepare(
            'SELECT id, name, slug, is_active FROM restaurants WHERE id = ? AND is_active = 1'
        ).bind(restaurantId).first();

        if (!restaurant) {
            const bySlug = await env.DB.prepare(
                'SELECT id, name, slug, is_active FROM restaurants WHERE slug = ? AND is_active = 1'
            ).bind(restaurantId).first();

            if (!bySlug) {
                console.error(`[Tracking] Restaurant no encontrado: ${restaurantId}`);
                return errorResponse(`Restaurant not found: ${restaurantId}`, 404);
            }
            restaurantId = bySlug.id;
        }

        const sessionId = generateUUID();
        const now = new Date().toISOString();
        const country = request.cf?.country || null;
        const city = request.cf?.city || null;

        // ✅ PRIVACY LOGIC: Generar ID anónimo si no hay usuario logueado
        let finalUserId = userid;
        if (!finalUserId) {
            // Si es anónimo, NO guardamos 'anon_xxx' en user_id porque viola la FK (Foreign Key) a users(id).
            // Dejamos user_id en NULL.
            // La "Unicidad" se calcula via Hashing en memoria para métricas agregadas (ej: daily_analytics.unique_visitors),
            // pero no persistimos el hash en la tabla sessions individualmente si no hay columna para ello.
            finalUserId = null;
        }

        await env.DB.prepare(`
    INSERT INTO sessions (
      id, user_id, restaurant_id, device_type, os_name, browser,
      country, city, referrer, utm_source, utm_medium, utm_campaign,
      started_at, language_code, timezone_offset, network_type, 
      pwa_installed, consent_analytics, qr_code_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
            sessionId, finalUserId, restaurantId, devicetype, osname, browser,
            country, city, referrer, utm.source || null, utm.medium || null, utm.campaign || null,
            now, languages, timezone, networktype,
            ispwa ? 1 : 0, 1, qrcode
        ).run();

        console.log(`✅ [SessionStart] Sesión creada: ${sessionId} para ${restaurantId}. User: ${finalUserId || 'ANON'}`);

        return jsonResponse({
            success: true,
            sessionId,
            startedAt: now,
            restaurantId,
            isAnonymous: !userid
        });
    } catch (error) {
        console.error('[SessionStart] Error:', error);
        return errorResponse('Error creating session', 500, error.message);
    }
}
async function handleSessionEnd(request, env) {
    try {
        const data = await request.json();
        const { sessionId, startedAt, endedAt } = data;
        if (!sessionId) {
            return errorResponse('sessionId es requerido');
        }
        const endTime = endedAt || new Date().toISOString();
        const startTime = new Date(startedAt);
        const endTimeDate = new Date(endTime);
        const durationSeconds = Math.floor((endTimeDate.getTime() - startTime.getTime()) / 1000);
        const result = await env.DB.prepare(`
    UPDATE sessions 
    SET ended_at = ?, duration_seconds = ?
    WHERE id = ?
  `).bind(endTime, durationSeconds, sessionId).run();
        if (result.changes === 0) {
            return errorResponse('Session not found', 404);
        }
        console.log(`[SessionEnd] Sesión finalizada: ${sessionId}, duración: ${durationSeconds}s`);
        return jsonResponse({
            success: true,
            sessionId,
            duration: durationSeconds
        });
    } catch (error) {
        console.error('[SessionEnd] Error:', error);
        return errorResponse('Error ending session', 500, error.message);
    }
}
// ============================================
// EVENT PROCESSING - ✅ CORREGIDO
// ============================================
async function handleEvents(request, env, ctx) {
    try {
        const data = await request.json();
        const { sessionId, restaurantId, events } = data;
        console.log('🔍 [Events] === DATOS RECIBIDOS ===');
        console.log('🔍 [Events] SessionId:', sessionId);
        console.log('🔍 [Events] RestaurantId:', restaurantId);
        console.log('🔍 [Events] Total eventos:', events?.length);
        if (!sessionId || !restaurantId || !Array.isArray(events)) {
            return errorResponse('sessionId, restaurantId y events son requeridos');
        }
        const session = await env.DB.prepare(
            'SELECT id, user_id, device_type, language_code, qr_code_id FROM sessions WHERE id = ? AND restaurant_id = ?'
        ).bind(sessionId, restaurantId).first();
        if (!session) {
            console.error('[Events] Session not found:', { sessionId, restaurantId });
            return errorResponse('Session not found', 404);
        }
        const processedEvents = [];
        const dishUpdates = new Map();
        const sectionUpdates = new Map();
        const engagementMetrics = {
            dishViewDurations: new Map(),
            sectionTimes: new Map(),
            scrollDepths: new Map()
        };
        const today = toSqlDateUTC();
        console.log('🔍 [Events] === PROCESANDO EVENTOS ===');
        for (const event of events) {
            try {
                const eventId = generateId('evt');
                const timestamp = event.ts || new Date().toISOString();
                console.log(`🔍 [Events] Procesando evento: ${event.type} para ${event.entityId}`);
                // ✅ FIX CRÍTICO: Manejo robusto de valores NULL/UNDEFINED para D1
                const valueToStore = (event.value !== undefined && event.value !== null)
                    ? (typeof event.value === 'string' ? event.value : JSON.stringify(event.value))
                    : null;
                const numericValueToStore = (typeof event.value === 'number') ? event.value : null;
                const propsToStore = (event.props !== undefined && event.props !== null)
                    ? JSON.stringify(event.props)
                    : null;
                // Insertar en tabla events
                await env.DB.prepare(`
        INSERT INTO events (
          id, session_id, user_id, restaurant_id, event_type,
          entity_id, entity_type, value, numeric_value, props, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
                    eventId,
                    sessionId,
                    session.user_id || null,
                    restaurantId,
                    event.type,
                    event.entityId || null,
                    event.entityType || null,
                    valueToStore,        // ✅ Usar variable sanitizada
                    numericValueToStore, // ✅ Usar variable sanitizada
                    propsToStore,        // ✅ Usar variable sanitizada
                    timestamp
                ).run();
                console.log(`✅ [Events] Evento insertado en BD: ${eventId}`);
                // ✅ CRÍTICO: Agregar a processedEvents INMEDIATAMENTE después de insertar
                processedEvents.push({
                    id: eventId,
                    type: event.type,
                    entityId: event.entityId,
                    timestamp
                });
                // Actualizar contadores de platos
                if (event.entityType === 'dish' && event.entityId) {
                    const handler = EVENT_HANDLERS[event.type];
                    if (handler) {
                        if (!dishUpdates.has(event.entityId)) {
                            dishUpdates.set(event.entityId, {
                                dishId: event.entityId,
                                updates: {},
                                customUpdates: [],
                                dailyMetrics: {
                                    views: 0,
                                    favorites: 0,
                                    shares: 0,
                                    ratings: 0
                                }
                            });
                        }
                        const dishUpdate = dishUpdates.get(event.entityId);
                        // Contadores normales
                        if (handler.field && handler.shouldIncrement) {
                            const shouldInc = typeof handler.shouldIncrement === 'function'
                                ? handler.shouldIncrement(event.value)
                                : handler.shouldIncrement;
                            if (shouldInc) {
                                dishUpdate.updates[handler.field] = (dishUpdate.updates[handler.field] || 0) + 1;
                                console.log(`✅ [Events] Acumulando ${handler.field} para ${event.entityId}`);
                            }
                        }
                        // Métricas diarias de platos
                        if (event.type === 'viewdish') {
                            dishUpdate.dailyMetrics.views += 1;
                        } else if (event.type === 'favorite' && (event.value === true || event.value === 'true')) {
                            dishUpdate.dailyMetrics.favorites += 1;
                        } else if (event.type === 'share') {
                            dishUpdate.dailyMetrics.shares += 1;
                        } else if (event.type === 'rating') {
                            dishUpdate.dailyMetrics.ratings += 1;
                        }
                        // Acumular duraciones de visualización
                        if (event.type === 'dish_view_duration' && typeof event.value === 'number') {
                            if (!engagementMetrics.dishViewDurations.has(event.entityId)) {
                                engagementMetrics.dishViewDurations.set(event.entityId, []);
                            }
                            engagementMetrics.dishViewDurations.get(event.entityId).push(event.value);
                            console.log(`⏱️ [Events] Duración registrada para ${event.entityId}: ${event.value}s`);
                        }
                        // Custom updates
                        if (handler.customUpdate) {
                            dishUpdate.customUpdates.push(() => handler.customUpdate(env.DB, event.entityId, event.value));
                        }
                    }
                    // Tracking de secciones
                    if (event.sectionId) {
                        if (!sectionUpdates.has(event.sectionId)) {
                            sectionUpdates.set(event.sectionId, {
                                views: 0,
                                dish_views: 0
                            });
                        }
                        const sectionUpdate = sectionUpdates.get(event.sectionId);
                        if (event.type === 'viewdish') {
                            sectionUpdate.dish_views += 1;
                        }
                    }
                }
                // ✅ NEW: Handle view_section event
                if (event.type === 'view_section' && event.entityId) {
                    if (!sectionUpdates.has(event.entityId)) {
                        sectionUpdates.set(event.entityId, {
                            views: 0,
                            dish_views: 0
                        });
                    }
                    const sectionUpdate = sectionUpdates.get(event.entityId);
                    sectionUpdate.views += 1;
                    console.log(`👁️ [Events] Section view registrada: ${event.entityId}`);
                }
                // ✅ NEW: Cart Event Processing
                if (event.entityType === 'cart' || event.type.startsWith('cart_')) {
                    await handleCartEvent(env.DB, event, session, restaurantId);
                }
                // ✅ NEW: User Favorites Processing
                if (event.type === 'favorite' && (event.value === true || event.value === 'true') && session.user_id && event.entityId) {
                    try {
                        await env.DB.prepare(`
                            INSERT INTO user_favorites (user_id, dish_id, restaurant_id, created_at)
                            VALUES (?, ?, ?, ?)
                            ON CONFLICT(user_id, dish_id) DO NOTHING
                        `).bind(session.user_id, event.entityId, restaurantId, timestamp).run();
                        console.log(`❤️ [Events] Favorito guardado para usuario ${session.user_id} plato ${event.entityId}`);
                    } catch (favError) {
                        console.error('[Events] Error guardando favorito de usuario:', favError);
                    }
                }
                // Nuevas métricas de sección
                if (event.entityType === 'section' && event.entityId) {
                    // ✅ FIX: Asegurar que sectionUpdates tenga una entrada para procesar las métricas después
                    if (event.type === 'section_time' || event.type === 'scroll_depth') {
                        if (!sectionUpdates.has(event.entityId)) {
                            sectionUpdates.set(event.entityId, {
                                views: 0,
                                dish_views: 0
                            });
                        }
                    }

                    if (event.type === 'section_time') {
                        if (!engagementMetrics.sectionTimes.has(event.entityId)) {
                            engagementMetrics.sectionTimes.set(event.entityId, []);
                        }
                        engagementMetrics.sectionTimes.get(event.entityId).push({
                            duration: event.value,
                            dishesViewed: event.props?.dishes_viewed || 0
                        });
                        console.log(`⏱️ [Events] Section time registrado: ${event.entityId}, ${event.value}s`);
                    }
                    if (event.type === 'scroll_depth') {
                        if (!engagementMetrics.scrollDepths.has(event.entityId)) {
                            engagementMetrics.scrollDepths.set(event.entityId, []);
                        }
                        if (typeof event.value === 'number') {
                            engagementMetrics.scrollDepths.get(event.entityId).push(event.value);
                            console.log(`📊 [Events] Scroll depth registrado: ${event.entityId}, ${event.value}%`);
                        }
                    }
                }
            } catch (eventError) {
                console.error('[Events] Error procesando evento:', eventError, event);
            }
        }
        console.log(`🔍 [Events] === RESUMEN ACUMULADO ===`);
        console.log(`🔍 [Events] Total processedEvents: ${processedEvents.length}`);
        console.log(`🔍 [Events] Total dishUpdates: ${dishUpdates.size}`);
        console.log(`🔍 [Events] Total sectionUpdates: ${sectionUpdates.size}`);
        // Actualizar platos
        for (const [dishId, updateInfo] of dishUpdates) {
            try {
                // Actualizar counters principales
                if (Object.keys(updateInfo.updates).length > 0) {
                    const setClauses = Object.keys(updateInfo.updates).map(field =>
                        `${field} = ${field} + ?`
                    ).join(', ');
                    const values = Object.values(updateInfo.updates);
                    values.push(dishId);
                    const updateQuery = `UPDATE dishes SET ${setClauses} WHERE id = ?`;
                    await env.DB.prepare(updateQuery).bind(...values).run();
                    console.log(`✅ [Events] Dishes actualizado:`, updateInfo.updates);
                }
                // Custom updates
                for (const customUpdate of updateInfo.customUpdates) {
                    await customUpdate();
                }
                // Actualizar dish_daily_metrics
                const hasDurations = (engagementMetrics.dishViewDurations.get(dishId) || []).length > 0;

                if (updateInfo.dailyMetrics.views > 0 || updateInfo.dailyMetrics.favorites > 0 ||
                    updateInfo.dailyMetrics.shares > 0 || updateInfo.dailyMetrics.ratings > 0 || hasDurations) {

                    const dishDurations = engagementMetrics.dishViewDurations.get(dishId) || [];
                    const totalViewTime = dishDurations.reduce((sum, d) => sum + d, 0);
                    // Si solo hay duraciones nuevas pero no nuevas views, el avg se recalcula ponderado en el SQL
                    // pero necesitamos pasar 0 en views si no hubo views nuevas.

                    const avgViewDuration = dishDurations.length > 0
                        ? totalViewTime / dishDurations.length
                        : 0;

                    await env.DB.prepare(`
          INSERT INTO dish_daily_metrics (
            restaurant_id, dish_id, date, views, favorites, shares, ratings,
            avg_view_duration, total_view_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(restaurant_id, dish_id, date) 
          DO UPDATE SET
            views = views + excluded.views,
            favorites = favorites + excluded.favorites,
            shares = shares + excluded.shares,
            ratings = ratings + excluded.ratings,
            avg_view_duration = (
              -- Recalcular promedio ponderado: (promedio_actual * views_totales_actuales + nuevos_datos) / nuevas_total_views
              -- Como no tenemos views_totales_actuales facilmente, aproximamos usando la media acumulada
              -- OJO: La logica original intentaba ponderar. Si excluded.views es 0 (solo actualizacion de tiempo), 
              -- esto podria dar problemas si no se maneja bien.
              -- Para simplificar y corregir el caso "solo tiempo": sumamos tiempo total y dividimos por views acumuladas (si pudieramos).
              -- DADO QUE NO TENEMOS 'TOTAL_VIEWS' acumulado aqui para dividir, mantenemos la logica de acumulacion de TIEMPO TOTAL.
              -- Y actualizamos el promedio si hay nuevas views. Si no hay nuevas views, el promedio deberia mantenerse O actualizarse
              -- asumiendo que estas duraciones pertenecen a views pasadas?
              -- MEJOR ESTRATEGIA: Actualizar total_view_time SIEMPRE.
              -- Y avg_view_duration = total_view_time / NULLIF(views, 0) (se puede hacer en query de lectura o aqui si leemos primero).
              -- Para este fix rapido sin leer previo:
              CASE 
                WHEN (views + excluded.views) > 0 THEN
                  (total_view_time + excluded.total_view_time) / (views + excluded.views)
                ELSE avg_view_duration
              END
            ),
            total_view_time = total_view_time + excluded.total_view_time
        `).bind(
                        restaurantId, dishId, today,
                        updateInfo.dailyMetrics.views,
                        updateInfo.dailyMetrics.favorites,
                        updateInfo.dailyMetrics.shares,
                        updateInfo.dailyMetrics.ratings,
                        Math.round(avgViewDuration * 100) / 100,
                        totalViewTime
                    ).run();
                }
            } catch (updateError) {
                console.error('[Events] Error actualizando plato:', updateError, dishId);
            }
        }
        // Actualizar secciones
        for (const [sectionId, updateInfo] of sectionUpdates) {
            try {
                // Calcular métricas de engagement para esta sección
                const sectionTimeData = engagementMetrics.sectionTimes.get(sectionId) || [];
                const scrollDepthData = engagementMetrics.scrollDepths.get(sectionId) || [];

                // ✅ FIX: Calcular TOTALES acumulados en este batch, no promedios dependientes de views del batch
                const totalDurationAdded = sectionTimeData.reduce((sum, d) => sum + d.duration, 0);
                const totalScrollAdded = scrollDepthData.reduce((sum, d) => sum + d, 0);
                const totalDishesViewed = sectionTimeData.reduce((sum, d) => sum + d.dishesViewed, 0);

                // Si hay nuevas views en este batch, usarlas para el promedio. Si no, usamos 0.
                // En la query, usaremos 'views' (existentes en BD) + 'excluded.views' (nuevas) como divisor.
                // Para el dividendo, sumamos (avg_actual * views_actuales) + totalDurationAdded.

                await env.DB.prepare(`
        INSERT INTO section_daily_metrics (
          restaurant_id, section_id, date, views, dish_views,
          avg_time_spent, avg_scroll_depth, total_dishes_viewed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(restaurant_id, section_id, date) 
        DO UPDATE SET
          views = views + excluded.views,
          dish_views = dish_views + excluded.dish_views,
          avg_time_spent = (
            (avg_time_spent * views + ?) /  -- ? = totalDurationAdded
            NULLIF(views + excluded.views, 0)
          ),
          avg_scroll_depth = (
            (avg_scroll_depth * views + ?) / -- ? = totalScrollAdded
            NULLIF(views + excluded.views, 0)
          ),
          total_dishes_viewed = total_dishes_viewed + excluded.total_dishes_viewed
      `).bind(
                    restaurantId, sectionId, today,
                    updateInfo.views,
                    updateInfo.dish_views,
                    0, // avg_time_spent placeholder (no se usa en INSERT si updateInfo.views es 0, pero si es nuevo insert, necesitamos avg)
                    // OJO: Si es INSERT nuevo, avg_time_spent debería ser (totalDuration / views).
                    // Si updateInfo.views es 0 (solo tiempo), un INSERT fallaría lógicamente (division by zero metrics) a menos que
                    // avg_time_spent sea 0.
                    // Para simplificar: Si es INSERT (conflict no salta), toma los valores VALUES.
                    // Si updateInfo.views > 0, calculamos el promedio inicial. Si es 0, ponemos 0.
                    0, // avg_scroll_depth placeholder
                    totalDishesViewed
                );

                // Re-bind correcto para INSERT vs UPDATE
                // Problema: ? en UPDATE no es accesible via bind posicional simple si usara excluded.
                // Solución: Binding directo de valores calculados.

                // Calculamos promedios iniciales para el caso INSERT
                const initialAvgTime = updateInfo.views > 0 ? (totalDurationAdded / updateInfo.views) : 0;
                const initialAvgScroll = updateInfo.views > 0 ? (totalScrollAdded / updateInfo.views) : 0;

                await env.DB.prepare(`
        INSERT INTO section_daily_metrics (
          restaurant_id, section_id, date, views, dish_views,
          avg_time_spent, avg_scroll_depth, total_dishes_viewed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(restaurant_id, section_id, date) 
        DO UPDATE SET
          views = views + excluded.views,
          dish_views = dish_views + excluded.dish_views,
          avg_time_spent = (
            (avg_time_spent * views + ?) / 
            NULLIF(views + excluded.views, 1) -- Avoid div/0 if totally empty
          ),
          avg_scroll_depth = (
            (avg_scroll_depth * views + ?) / 
            NULLIF(views + excluded.views, 1)
          ),
          total_dishes_viewed = total_dishes_viewed + excluded.total_dishes_viewed
                `).bind(
                    restaurantId, sectionId, today,
                    updateInfo.views,
                    updateInfo.dish_views,
                    initialAvgTime,
                    initialAvgScroll,
                    totalDishesViewed,
                    totalDurationAdded, // Param para update avg_time_spent
                    totalScrollAdded    // Param para update avg_scroll_depth
                ).run();

                console.log(`✅ [Events] section_daily_metrics actualizado para ${sectionId}`);
            } catch (updateError) {
                console.error('[Events] Error actualizando sección:', updateError, sectionId);
            }
        }
        // ============================================
        // AGREGACIÓN DIARIA
        // ============================================
        if (processedEvents.length > 0) {
            const aggregatePromise = Promise.all([
                aggregateDailyAnalytics(env.DB, restaurantId, today),
                aggregateCartMetrics(env.DB, restaurantId, today),
                aggregateDishMetrics(env.DB, restaurantId, today),
                aggregateSectionMetrics(env.DB, restaurantId, today)
            ]);
            if (ctx && ctx.waitUntil) {
                ctx.waitUntil(aggregatePromise);
            } else {
                try {
                    await aggregatePromise;
                } catch (error) {
                    console.error('[Events] Error en agregación diaria:', error);
                }
            }
        }
        console.log(`✅ [Events] Procesados ${processedEvents.length} eventos para sesión: ${sessionId}`);
        return jsonResponse({
            success: true,
            processed: processedEvents.length,
            events: processedEvents
        });
    } catch (error) {
        console.error('[Events] Error general:', error);
        return errorResponse('Error processing events', 500, error.message);
    }
}
// ============================================
//  RESTO DE FUNCIONES (sin cambios)
// ============================================
// ... (aggregateDailyAnalytics, handleDailyAnalytics, handleAnalyticsQuery, etc.)
async function aggregateDailyAnalytics(db, restaurantId, date) {
    try {
        console.log(`🔍 [Analytics] === INICIANDO AGREGACIÓN ===`);
        console.log(`🔍 [Analytics] restaurantId: ${restaurantId}`);
        console.log(`🔍 [Analytics] date: ${date}`);
        const sessionStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT user_id) as distinct_users, -- Optional fallback
        AVG(duration_seconds) as avg_session_duration,
        SUM(CASE WHEN duration_seconds IS NOT NULL THEN 1 ELSE 0 END) as finished_sessions
      FROM sessions
      WHERE restaurant_id = ? 
        AND started_at BETWEEN ? AND ?
        AND consent_analytics = 1
    `).bind(restaurantId, date + 'T00:00:00', date + 'T23:59:59').first();

        const eventStats = await db.prepare(`
      SELECT 
        SUM(CASE WHEN event_type = 'viewdish' THEN 1 ELSE 0 END) as dish_views,
        COUNT(CASE WHEN event_type = 'favorite' AND (value = 'true' OR value = '1') THEN 1 END) as favorites_added,
        COUNT(CASE WHEN event_type = 'rating' THEN 1 END) as ratings_submitted,
        COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
        AVG(CASE WHEN event_type = 'dish_view_duration' THEN numeric_value END) as avg_dish_view_duration,
        AVG(CASE WHEN event_type = 'section_time' THEN numeric_value END) as avg_section_time,
        AVG(CASE WHEN event_type = 'scroll_depth' THEN numeric_value END) as avg_scroll_depth,
        COUNT(CASE WHEN event_type = 'media_error' THEN 1 END) as media_errors
      FROM events
      WHERE restaurant_id = ?
        AND created_at BETWEEN ? AND ?
    `).bind(restaurantId, date + 'T00:00:00', date + 'T23:59:59').first();

        console.log(`🔍 [Analytics] Session Stats:`, sessionStats);
        console.log(`🔍 [Analytics] Event Stats:`, eventStats);

        await db.prepare(`
      INSERT INTO daily_analytics (
        restaurant_id, date, total_views, unique_visitors, total_sessions,
        avg_session_duration, dish_views, favorites_added, ratings_submitted, 
        shares, avg_dish_view_duration, avg_section_time, avg_scroll_depth, media_errors,
        reserve_clicks, call_clicks, directions_clicks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
      ON CONFLICT(restaurant_id, date) 
      DO UPDATE SET
        total_views = excluded.total_views,
        unique_visitors = excluded.unique_visitors,
        total_sessions = excluded.total_sessions,
        avg_session_duration = excluded.avg_session_duration,
        dish_views = excluded.dish_views,
        favorites_added = excluded.favorites_added,
        ratings_submitted = excluded.ratings_submitted,
        shares = excluded.shares,
        avg_dish_view_duration = excluded.avg_dish_view_duration,
        avg_section_time = excluded.avg_section_time,
        avg_scroll_depth = excluded.avg_scroll_depth,
        media_errors = excluded.media_errors
    `).bind(
            restaurantId, date,
            sessionStats.total_sessions || 0,
            sessionStats.total_sessions || 0, // unique_visitors heuristic (using sessions for now as users are sparse)
            sessionStats.total_sessions || 0,
            sessionStats.avg_session_duration || 0,
            eventStats.dish_views || 0,
            eventStats.favorites_added || 0,
            eventStats.ratings_submitted || 0,
            eventStats.shares || 0,
            Math.round((eventStats.avg_dish_view_duration || 0) * 100) / 100,
            Math.round((eventStats.avg_section_time || 0) * 100) / 100,
            Math.round(eventStats.avg_scroll_depth || 0),
            eventStats.media_errors || 0
        ).run();
        console.log(`✅ [Analytics] daily_analytics actualizado para ${restaurantId} - ${date}`);
    } catch (error) {
        console.error('[Analytics] Error en agregación diaria:', error);
        throw error;
    }
}

async function aggregateDishMetrics(db, restaurantId, date) {
    try {
        const results = await db.prepare(`
            SELECT 
                entity_id as dish_id,
                COUNT(DISTINCT session_id) as unique_viewers
            FROM events
            WHERE restaurant_id = ? 
              AND event_type = 'viewdish'
              AND created_at BETWEEN ? AND ?
            GROUP BY entity_id
        `).bind(restaurantId, date + 'T00:00:00', date + 'T23:59:59').all();

        for (const row of results.results || []) {
            await db.prepare(`
                UPDATE dish_daily_metrics 
                SET unique_viewers = ?
                WHERE restaurant_id = ? AND dish_id = ? AND date = ?
            `).bind(row.unique_viewers, restaurantId, row.dish_id, date).run();
        }
        console.log(`✅ [Analytics] Métricas únicas de platos actualizadas`);
    } catch (error) {
        console.error('[Analytics] Error agregando métricas de platos:', error);
    }
}

async function aggregateSectionMetrics(db, restaurantId, date) {
    try {
        const results = await db.prepare(`
            SELECT 
                entity_id as section_id,
                COUNT(DISTINCT session_id) as unique_viewers
            FROM events
            WHERE restaurant_id = ? 
              AND event_type = 'view_section'
              AND created_at BETWEEN ? AND ?
            GROUP BY entity_id
        `).bind(restaurantId, date + 'T00:00:00', date + 'T23:59:59').all();

        for (const row of results.results || []) {
            await db.prepare(`
                UPDATE section_daily_metrics 
                SET unique_viewers = ?
                WHERE restaurant_id = ? AND section_id = ? AND date = ?
            `).bind(row.unique_viewers, restaurantId, row.section_id, date).run();
        }
        console.log(`✅ [Analytics] Métricas únicas de secciones actualizadas`);
    } catch (error) {
        console.error('[Analytics] Error agregando métricas de secciones:', error);
    }
}

async function handleDailyAnalytics(request, env) {
    try {
        const data = await request.json();
        const { restaurantId, date } = data;
        if (!restaurantId) {
            return errorResponse('restaurantId es requerido');
        }
        const targetDate = date || toSqlDateUTC();
        await aggregateDailyAnalytics(env.DB, restaurantId, targetDate);
        return jsonResponse({
            success: true,
            restaurantId,
            date: targetDate,
            message: 'Daily analytics aggregated successfully'
        });
    } catch (error) {
        console.error('[DailyAnalytics] Error:', error);
        return errorResponse('Error aggregating daily analytics', 500, error.message);
    }
}
async function handleAnalyticsQuery(request, env) {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    if (pathParts[3] === 'daily') {
        return await handleDailyAnalyticsQuery(request, env);
    }
    if (pathParts[3] === 'dishes') {
        return await handleDishAnalyticsQuery(request, env);
    }
    if (pathParts[3] === 'sections') {
        return await handleSectionAnalyticsQuery(request, env);
    }
    return errorResponse('Analytics endpoint not found', 404);
}
async function handleDailyAnalyticsQuery(request, env) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get('restaurant_id');
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date') || toSqlDateUTC();
        if (!restaurantId) {
            return errorResponse('restaurant_id es requerido');
        }
        let query = `
    SELECT * FROM daily_analytics 
    WHERE restaurant_id = ?
            `;
        const params = [restaurantId];
        if (startDate) {
            query += ` AND date >= ? `;
            params.push(startDate);
        }
        query += ` AND date <= ? ORDER BY date DESC LIMIT 30`;
        params.push(endDate);
        const results = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse({
            success: true,
            data: results.results || [],
            restaurantId,
            dateRange: { start: startDate, end: endDate }
        });
    } catch (error) {
        console.error('[DailyAnalyticsQuery] Error:', error);
        return errorResponse('Error querying daily analytics', 500, error.message);
    }
}
async function handleDishAnalyticsQuery(request, env) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get('restaurant_id');
        if (!restaurantId) {
            return errorResponse('restaurant_id es requerido');
        }
        const dishes = await env.DB.prepare(`
    SELECT 
      d.id,
            d.view_count,
            d.favorite_count,
            d.rating_count,
            d.avg_rating,
            d.total_view_time,
            CAST(d.total_view_time AS REAL) / NULLIF(d.view_count, 0) as avg_view_duration,
            t.value as name
    FROM dishes d
    LEFT JOIN translations t ON d.id = t.entity_id 
      AND t.entity_type = 'dish' 
      AND t.field = 'name' 
      AND t.language_code = 'es'
    WHERE d.restaurant_id = ?
            ORDER BY d.view_count DESC, d.favorite_count DESC
            `).bind(restaurantId).all();
        return jsonResponse({
            success: true,
            data: dishes.results || [],
            restaurantId
        });
    } catch (error) {
        console.error('[DishAnalyticsQuery] Error:', error);
        return errorResponse('Error querying dish analytics', 500, error.message);
    }
}
async function handleSectionAnalyticsQuery(request, env) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get('restaurant_id');
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date') || toSqlDateUTC();
        if (!restaurantId) {
            return errorResponse('restaurant_id es requerido');
        }
        let query = `
    SELECT 
      s.id,
            t.value as name,
            SUM(sdm.views) as total_views,
            SUM(sdm.dish_views) as total_dish_views,
            AVG(sdm.avg_time_spent) as avg_time_spent,
            AVG(sdm.avg_scroll_depth) as avg_scroll_depth,
            SUM(sdm.total_dishes_viewed) as total_dishes_viewed
    FROM sections s
    LEFT JOIN section_daily_metrics sdm ON s.id = sdm.section_id
    LEFT JOIN translations t ON s.id = t.entity_id 
      AND t.entity_type = 'section' 
      AND t.field = 'name' 
      AND t.language_code = 'es'
    WHERE s.restaurant_id = ?
            `;
        const params = [restaurantId];
        if (startDate) {
            query += ` AND sdm.date >= ? `;
            params.push(startDate);
        }
        query += ` AND sdm.date <= ? GROUP BY s.id ORDER BY total_views DESC`;
        params.push(endDate);
        const results = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse({
            success: true,
            data: results.results || [],
            restaurantId,
            dateRange: { start: startDate, end: endDate }
        });
    } catch (error) {
        console.error('[SectionAnalyticsQuery] Error:', error);
        return errorResponse('Error querying section analytics', 500, error.message);
    }
}
// ============================================
// ✅ NEW: CART HANDLING FUNCTIONS - FULL DATA
// ============================================
async function handleCartEvent(db, event, session, restaurantId) {
    try {
        const value = (typeof event.value === 'string') ? JSON.parse(event.value) : (event.value || {});
        const timestamp = event.ts || new Date().toISOString();

        // ✅ FIX: Get cartId from the correct place depending on event type
        const cartId = event.type === 'cart_created' ? event.entityId : value.cartId;

        if (!cartId) {
            console.error(`❌[Cart] No cartId found for event ${event.type}: `, event);
            return;
        }

        console.log(`🛒[Cart] Procesando ${event.type} para cartId = ${cartId} `);

        // Datos comunes para update
        const totalItems = value.totalItems || 0;
        const uniqueDishes = value.uniqueDishes || 0;
        const totalValue = value.totalValue || 0;
        const cartSnapshot = value.items ? JSON.stringify(value.items) : null;
        const timeSpent = value.timeSpentSeconds || 0; // Frontend debe enviarlo o calculamos diferencia

        if (event.type === 'cart_created') {
            await db.prepare(`
                INSERT INTO cart_sessions(
                id, sessionid, restaurantid, createdat, status,
                devicetype, languagecode, qrcodeid
            ) VALUES(?, ?, ?, ?, 'active', ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
            `).bind(
                cartId, session.id, restaurantId, timestamp,
                session.device_type || 'unknown', session.language_code || 'es', session.qr_code_id || null
            ).run();
            console.log(`✅[Cart] Cart session created: ${cartId} `);
        }
        else if (event.type === 'cart_item_added' || event.type === 'cart_item_removed' || event.type === 'cart_item_quantity') {
            // Ensure cart exists first
            await db.prepare(`
                INSERT INTO cart_sessions(
                id, sessionid, restaurantid, createdat, status,
                devicetype, languagecode, qrcodeid
            ) VALUES(?, ?, ?, ?, 'active', ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
            `).bind(
                cartId, session.id, restaurantId, timestamp,
                session.device_type || 'unknown', session.language_code || 'es', session.qr_code_id || null
            ).run();

            // Update with full metrics
            let query = `
                UPDATE cart_sessions 
                SET updatedat = ?,
            modificationscount = modificationscount + 1
                `;
            const params = [timestamp];

            // Solo actualizar si vienen datos válidos (el frontend los enviará siempre ahora)
            if (value.totalItems !== undefined) {
                query += `, totalitems = ?, uniquedishes = ?, estimatedvalue = ? `;
                params.push(totalItems, uniqueDishes, totalValue);
            }

            if (cartSnapshot) {
                query += `, cartsnapshotjson = ? `;
                params.push(cartSnapshot);
            }

            query += ` WHERE id = ? `;
            params.push(cartId);

            await db.prepare(query).bind(...params).run();
            console.log(`✅[Cart] Cart updated: ${cartId}, items = ${totalItems}, value = ${totalValue} `);
        }
        else if (event.type === 'cart_shown_to_staff') {
            await db.prepare(`
                UPDATE cart_sessions 
                SET status = 'converted',
            showntostaffat = ?,
            updatedat = ?,
            estimatedvalue = ?,
            totalitems = ?,
            uniquedishes = ?,
            timespentseconds = ?,
            cartsnapshotjson = COALESCE(?, cartsnapshotjson)
                WHERE id = ?
            `).bind(
                timestamp, timestamp,
                totalValue,
                totalItems,
                uniqueDishes,
                timeSpent,
                cartSnapshot,
                cartId
            ).run();
            console.log(`✅[Cart] Cart converted: ${cartId} `);
        }
        else if (event.type === 'cart_abandoned') {
            await db.prepare(`
                UPDATE cart_sessions 
                SET status = 'abandoned',
            abandonedat = ?,
            updatedat = ?
                WHERE id = ?
                    `).bind(timestamp, timestamp, cartId).run();
            console.log(`✅[Cart] Cart abandoned: ${cartId} `);
        }
    } catch (error) {
        console.error('❌ [Cart] Error handling cart event:', error);
    }
}
async function aggregateCartMetrics(db, restaurantId, date) {
    try {
        console.log(`🛒[Analytics] Agregando métricas de carrito para ${restaurantId} - ${date} `);
        // Calcular estadísticas desde cart_sessions
        const stats = await db.prepare(`
        SELECT
        COUNT(*) as total_carts_created,
            COUNT(CASE WHEN status = 'converted' THEN 1 END) as total_carts_shown,
            COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as total_carts_abandoned,
            SUM(CASE WHEN status = 'converted' THEN estimatedvalue ELSE 0 END) as shown_carts_value,
            SUM(estimatedvalue) as total_estimated_value,
            AVG(estimatedvalue) as avg_cart_value,
            SUM(totalitems) as total_items_added,
            AVG(totalitems) as avg_items_per_cart,
            AVG(CASE WHEN status = 'converted' THEN timespentseconds END) as avg_time_to_show
            FROM cart_sessions
            WHERE restaurantid = ? AND DATE(createdat) = ?
            `).bind(restaurantId, date).first();
        const conversionRate = stats.total_carts_created > 0
            ? (stats.total_carts_shown / stats.total_carts_created) * 100
            : 0;
        // Insertar o actualizar en cart_daily_metrics
        await db.prepare(`
            INSERT INTO cart_daily_metrics(
                restaurantid, date,
                total_carts_created, total_carts_shown, total_carts_abandoned,
                conversion_rate, total_estimated_value, avg_cart_value,
                shown_carts_value, total_items_added, avg_items_per_cart,
                avg_time_to_show
            ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(restaurantid, date) DO UPDATE SET
        total_carts_created = excluded.total_carts_created,
            total_carts_shown = excluded.total_carts_shown,
            total_carts_abandoned = excluded.total_carts_abandoned,
            conversion_rate = excluded.conversion_rate,
            total_estimated_value = excluded.total_estimated_value,
            avg_cart_value = excluded.avg_cart_value,
            shown_carts_value = excluded.shown_carts_value,
            total_items_added = excluded.total_items_added,
            avg_items_per_cart = excluded.avg_items_per_cart,
            avg_time_to_show = excluded.avg_time_to_show
                `).bind(
            restaurantId, date,
            stats.total_carts_created || 0,
            stats.total_carts_shown || 0,
            stats.total_carts_abandoned || 0,
            conversionRate,
            stats.total_estimated_value || 0,
            stats.avg_cart_value || 0,
            stats.shown_carts_value || 0,
            stats.total_items_added || 0,
            stats.avg_items_per_cart || 0,
            stats.avg_time_to_show || 0
        ).run();
        console.log(`✅[Analytics] cart_daily_metrics actualizado.`);
    } catch (error) {
        console.error('❌ [Analytics] Error agregando métricas de carrito:', error);
    }
}
// ============================================
// EXPORT PRINCIPAL
// ============================================
export async function handleTracking(request, env, ctx) {
    const url = new URL(request.url);
    console.log('[Tracking] Procesando:', request.method, url.pathname);
    if (!url.pathname.startsWith('/track/')) {
        return null;
    }
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        });
    }
    try {
        if (url.pathname === '/track/session/start' && request.method === 'POST') {
            return await handleSessionStart(request, env);
        }
        if (url.pathname === '/track/session/end' && request.method === 'POST') {
            return await handleSessionEnd(request, env);
        }
        if (url.pathname === '/track/events' && request.method === 'POST') {
            return await handleEvents(request, env, ctx);
        }
        if (url.pathname === '/track/analytics/daily' && request.method === 'POST') {
            return await handleDailyAnalytics(request, env);
        }
        if (url.pathname.startsWith('/track/analytics/') && request.method === 'GET') {
            return await handleAnalyticsQuery(request, env);
        }
        return errorResponse('Tracking endpoint not found', 404);
    } catch (error) {
        console.error('[Tracking] Error general:', error);
        return errorResponse('Internal server error', 500, error.message);
    }
}
