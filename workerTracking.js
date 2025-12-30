// workerTracking.js - OPTIMIZED VERSION
// ============================================
// Key optimizations:
// - Batch DB operations using D1 batch()
// - Reduced logging (errors + critical only)
// - Single UPSERT for cart operations
// - Removed dead code
// - Simplified event handlers config
// ============================================

// ============================================
// RESPONSE UTILITIES
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
    return jsonResponse({ success: false, error: message, details }, status);
}

// ============================================
// GENERAL UTILITIES
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
        const hex = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function toSqlDateUTC(date = new Date()) {
    const d = new Date(date);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function generateId(prefix = 'evt') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================
// EVENT HANDLERS CONFIG (Simplified)
// ============================================
const EVENT_HANDLERS = {
    'viewdish': { field: 'view_count', shouldIncrement: true },
    'favorite': { field: 'favorite_count', shouldIncrement: v => v === true || v === 'true' },
    'rating': {
        field: 'rating_count',
        shouldIncrement: true,
        customUpdate: async (db, dishId, value) => {
            if (value?.rating && typeof value.rating === 'number') {
                const current = await db.prepare('SELECT avg_rating, rating_count FROM dishes WHERE id = ?').bind(dishId).first();
                if (current) {
                    const newCount = current.rating_count + 1;
                    const newAvg = ((current.avg_rating * current.rating_count) + value.rating) / newCount;
                    await db.prepare('UPDATE dishes SET avg_rating = ?, rating_count = ? WHERE id = ?')
                        .bind(Math.round(newAvg * 100) / 100, newCount, dishId).run();
                }
            }
        }
    },
    'share': {},
    'dish_view_duration': {
        customUpdate: async (db, dishId, value) => {
            if (typeof value === 'number' && value > 0) {
                await db.prepare('UPDATE dishes SET total_view_time = total_view_time + ? WHERE id = ?').bind(value, dishId).run();
            }
        }
    },
    'section_time': {},
    'scroll_depth': {},
    'media_error': {},
    'cart_created': {},
    'cart_item_added': {},
    'cart_item_removed': {},
    'cart_item_quantity': {},
    'cart_shown_to_staff': {},
    'cart_abandoned': {},
    // ✅ NEW: Heartbeat for session duration tracking
    'heartbeat': {
        // Heartbeat events update session duration on-the-fly
        // Value is the cumulative duration in seconds
    }
};

// ============================================
// SESSION MANAGEMENT
// ============================================
async function handleSessionStart(request, env) {
    try {
        const data = await request.json();
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
            qrcode = null,
            visitorId: clientVisitorId = null
        } = data;

        // ✅ FIX: Generate visitor_id if client doesn't have one (first visit)
        const visitorId = clientVisitorId || generateUUID();

        if (!restaurantId) {
            return errorResponse('restaurantId es requerido');
        }

        // Validate restaurant exists
        const restaurant = await env.DB.prepare(
            'SELECT id FROM restaurants WHERE (id = ? OR slug = ?) AND is_active = 1'
        ).bind(restaurantId, restaurantId).first();

        if (!restaurant) {
            return errorResponse(`Restaurant not found: ${restaurantId}`, 404);
        }
        restaurantId = restaurant.id;

        const sessionId = generateUUID();
        const now = new Date().toISOString();
        const country = request.cf?.country || null;
        const city = request.cf?.city || null;
        const finalUserId = userid || null;

        // Calculate visit count for returning visitors
        let visitCount = 1;
        if (visitorId) {
            const prevSessions = await env.DB.prepare(
                'SELECT count(*) as count FROM sessions WHERE visitor_id = ? AND restaurant_id = ?'
            ).bind(visitorId, restaurantId).first();
            if (prevSessions) visitCount = prevSessions.count + 1;
        }

        await env.DB.prepare(`
            INSERT INTO sessions (
                id, user_id, restaurant_id, device_type, os_name, browser,
                country, city, referrer, utm_source, utm_medium, utm_campaign,
                started_at, language_code, timezone_offset, network_type, 
                pwa_installed, consent_analytics, qr_code_id, visitor_id, visit_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            sessionId, finalUserId, restaurantId, devicetype, osname, browser,
            country, city, referrer, utm.source || null, utm.medium || null, utm.campaign || null,
            now, languages, timezone, networktype,
            ispwa ? 1 : 0, 1, qrcode, visitorId, visitCount
        ).run();

        return jsonResponse({
            success: true,
            sessionId,
            startedAt: now,
            restaurantId,
            visitorId,
            visitCount,
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
        const durationSeconds = Math.floor((new Date(endTime).getTime() - new Date(startedAt).getTime()) / 1000);

        const result = await env.DB.prepare(
            'UPDATE sessions SET ended_at = ?, duration_seconds = ? WHERE id = ?'
        ).bind(endTime, durationSeconds, sessionId).run();

        if (result.changes === 0) {
            return errorResponse('Session not found', 404);
        }

        return jsonResponse({ success: true, sessionId, duration: durationSeconds });
    } catch (error) {
        console.error('[SessionEnd] Error:', error);
        return errorResponse('Error ending session', 500, error.message);
    }
}

// ============================================
// EVENT PROCESSING - OPTIMIZED WITH BATCHING
// ============================================
async function handleEvents(request, env, ctx) {
    try {
        const data = await request.json();
        const { sessionId, restaurantId, events } = data;

        if (!sessionId || !restaurantId || !Array.isArray(events) || events.length === 0) {
            return errorResponse('sessionId, restaurantId y events son requeridos');
        }

        // Validate session
        const session = await env.DB.prepare(
            'SELECT id, user_id, device_type, language_code, qr_code_id FROM sessions WHERE id = ? AND restaurant_id = ?'
        ).bind(sessionId, restaurantId).first();

        if (!session) {
            return errorResponse('Session not found', 404);
        }

        const today = toSqlDateUTC();
        const processedEvents = [];
        const eventInsertStatements = [];
        const dishUpdates = new Map();
        const sectionUpdates = new Map();
        const engagementMetrics = {
            dishViewDurations: new Map(),
            sectionTimes: new Map(),
            scrollDepths: new Map()
        };
        const cartEvents = [];
        const customUpdates = [];

        // Phase 1: Prepare all event inserts and collect metrics
        for (const event of events) {
            const eventId = generateId('evt');
            const timestamp = event.ts || new Date().toISOString();

            // Sanitize values for D1
            const valueToStore = (event.value !== undefined && event.value !== null)
                ? (typeof event.value === 'string' ? event.value : JSON.stringify(event.value))
                : null;
            const numericValue = (typeof event.value === 'number') ? event.value : null;
            const propsToStore = event.props ? JSON.stringify(event.props) : null;

            // Prepare batch insert statement
            eventInsertStatements.push(
                env.DB.prepare(`
                    INSERT INTO events (id, session_id, user_id, restaurant_id, event_type, entity_id, entity_type, value, numeric_value, props, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(eventId, sessionId, session.user_id || null, restaurantId, event.type,
                    event.entityId || null, event.entityType || null, valueToStore, numericValue, propsToStore, timestamp)
            );

            processedEvents.push({ id: eventId, type: event.type, entityId: event.entityId, timestamp });

            // Collect cart events for separate processing
            if (event.entityType === 'cart' || event.type.startsWith('cart_')) {
                cartEvents.push({ ...event, ts: timestamp });
            }

            // Process dish events
            if (event.entityType === 'dish' && event.entityId) {
                const handler = EVENT_HANDLERS[event.type];
                if (handler) {
                    if (!dishUpdates.has(event.entityId)) {
                        dishUpdates.set(event.entityId, {
                            updates: {},
                            customUpdates: [],
                            dailyMetrics: { views: 0, favorites: 0, shares: 0, ratings: 0 }
                        });
                    }
                    const dishUpdate = dishUpdates.get(event.entityId);

                    // Handle field increments
                    if (handler.field && handler.shouldIncrement) {
                        const shouldInc = typeof handler.shouldIncrement === 'function'
                            ? handler.shouldIncrement(event.value)
                            : handler.shouldIncrement;
                        if (shouldInc) {
                            dishUpdate.updates[handler.field] = (dishUpdate.updates[handler.field] || 0) + 1;
                        }
                    }

                    // Daily metrics
                    if (event.type === 'viewdish') dishUpdate.dailyMetrics.views++;
                    else if (event.type === 'favorite' && (event.value === true || event.value === 'true')) dishUpdate.dailyMetrics.favorites++;
                    else if (event.type === 'share') dishUpdate.dailyMetrics.shares++;
                    else if (event.type === 'rating') dishUpdate.dailyMetrics.ratings++;

                    // View durations
                    if (event.type === 'dish_view_duration' && typeof event.value === 'number') {
                        if (!engagementMetrics.dishViewDurations.has(event.entityId)) {
                            engagementMetrics.dishViewDurations.set(event.entityId, []);
                        }
                        engagementMetrics.dishViewDurations.get(event.entityId).push(event.value);
                    }

                    // Custom updates
                    if (handler.customUpdate) {
                        customUpdates.push(() => handler.customUpdate(env.DB, event.entityId, event.value));
                    }
                }

                // Track section dish views
                if (event.sectionId && event.type === 'viewdish') {
                    if (!sectionUpdates.has(event.sectionId)) {
                        sectionUpdates.set(event.sectionId, { views: 0, dish_views: 0 });
                    }
                    sectionUpdates.get(event.sectionId).dish_views++;
                }
            }

            // Process section events
            if (event.type === 'view_section' && event.entityId) {
                if (!sectionUpdates.has(event.entityId)) {
                    sectionUpdates.set(event.entityId, { views: 0, dish_views: 0 });
                }
                sectionUpdates.get(event.entityId).views++;
            }

            if (event.entityType === 'section' && event.entityId) {
                if (!sectionUpdates.has(event.entityId)) {
                    sectionUpdates.set(event.entityId, { views: 0, dish_views: 0 });
                }
                if (event.type === 'section_time') {
                    if (!engagementMetrics.sectionTimes.has(event.entityId)) {
                        engagementMetrics.sectionTimes.set(event.entityId, []);
                    }
                    engagementMetrics.sectionTimes.get(event.entityId).push({
                        duration: event.value,
                        dishesViewed: event.props?.dishes_viewed || 0
                    });
                }
                if (event.type === 'scroll_depth' && typeof event.value === 'number') {
                    if (!engagementMetrics.scrollDepths.has(event.entityId)) {
                        engagementMetrics.scrollDepths.set(event.entityId, []);
                    }
                    // ✅ FIX: Store sessionId to allow grouping later
                    engagementMetrics.scrollDepths.get(event.entityId).push({
                        sessionId: sessionId, // Use the current session ID
                        value: event.value
                    });
                }
            }

            // User favorites
            if (event.type === 'favorite' && (event.value === true || event.value === 'true') && session.user_id && event.entityId) {
                eventInsertStatements.push(
                    env.DB.prepare(`
                        INSERT INTO user_favorites (user_id, dish_id, restaurant_id, created_at)
                        VALUES (?, ?, ?, ?) ON CONFLICT(user_id, dish_id) DO NOTHING
                    `).bind(session.user_id, event.entityId, restaurantId, timestamp)
                );
            }

            // ✅ HEARTBEAT: Update session duration in real-time
            // This ensures we always have accurate duration even if session end never fires
            if (event.type === 'heartbeat' && typeof event.value === 'number') {
                eventInsertStatements.push(
                    env.DB.prepare(`
                        UPDATE sessions SET duration_seconds = ? WHERE id = ?
                    `).bind(event.value, sessionId)
                );
            }
        }

        // Phase 2: Execute batch insert for all events
        if (eventInsertStatements.length > 0) {
            await env.DB.batch(eventInsertStatements);
        }

        // Phase 3: Execute custom updates and dish/section metrics
        const updateStatements = [];

        // Dish counter updates (batched)
        for (const [dishId, updateInfo] of dishUpdates) {
            if (Object.keys(updateInfo.updates).length > 0) {
                const setClauses = Object.keys(updateInfo.updates).map(f => `${f} = ${f} + ?`).join(', ');
                const values = [...Object.values(updateInfo.updates), dishId];
                updateStatements.push(
                    env.DB.prepare(`UPDATE dishes SET ${setClauses} WHERE id = ?`).bind(...values)
                );
            }

            // Dish daily metrics
            const durations = engagementMetrics.dishViewDurations.get(dishId) || [];
            const hasDurations = durations.length > 0;
            const m = updateInfo.dailyMetrics;

            if (m.views > 0 || m.favorites > 0 || m.shares > 0 || m.ratings > 0 || hasDurations) {
                const totalViewTime = durations.reduce((sum, d) => sum + d, 0);
                const avgViewDuration = durations.length > 0 ? totalViewTime / durations.length : 0;

                updateStatements.push(
                    env.DB.prepare(`
                        INSERT INTO dish_daily_metrics (restaurant_id, dish_id, date, views, favorites, shares, ratings, avg_view_duration, total_view_time)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(restaurant_id, dish_id, date) DO UPDATE SET
                            views = views + excluded.views,
                            favorites = favorites + excluded.favorites,
                            shares = shares + excluded.shares,
                            ratings = ratings + excluded.ratings,
                            avg_view_duration = CASE WHEN (views + excluded.views) > 0 THEN (total_view_time + excluded.total_view_time) / (views + excluded.views) ELSE avg_view_duration END,
                            total_view_time = total_view_time + excluded.total_view_time
                    `).bind(restaurantId, dishId, today, m.views, m.favorites, m.shares, m.ratings, Math.round(avgViewDuration * 100) / 100, totalViewTime)
                );
            }
        }

        // Section daily metrics (batched)
        for (const [sectionId, updateInfo] of sectionUpdates) {
            const sectionTimeData = engagementMetrics.sectionTimes.get(sectionId) || [];
            const scrollDepthEvents = engagementMetrics.scrollDepths.get(sectionId) || [];

            const totalDuration = sectionTimeData.reduce((sum, d) => sum + d.duration, 0);

            // ✅ FIX: Calculate MAX scroll depth per session, then sum those maxes
            // 1. Group by session
            const scrollBySession = {};
            for (const event of scrollDepthEvents) {
                if (!scrollBySession[event.sessionId]) {
                    scrollBySession[event.sessionId] = 0;
                }
                // Keep the deepest scroll for this session
                if (event.value > scrollBySession[event.sessionId]) {
                    scrollBySession[event.sessionId] = event.value;
                }
            }

            // 2. Sum the max depths
            const totalScroll = Object.values(scrollBySession).reduce((sum, val) => sum + val, 0);

            const totalDishesViewed = sectionTimeData.reduce((sum, d) => sum + d.dishesViewed, 0);
            const initialAvgTime = updateInfo.views > 0 ? totalDuration / updateInfo.views : 0;

            // Note: initialAvgScroll is used for the very first insert, 
            // but for updates we use totalScroll directly in the query formula
            const initialAvgScroll = updateInfo.views > 0 ? totalScroll / updateInfo.views : 0;

            updateStatements.push(
                env.DB.prepare(`
                    INSERT INTO section_daily_metrics (restaurant_id, section_id, date, views, dish_views, avg_time_spent, avg_scroll_depth, total_dishes_viewed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(restaurant_id, section_id, date) DO UPDATE SET
                        views = views + excluded.views,
                        dish_views = dish_views + excluded.dish_views,
                        avg_time_spent = CASE WHEN (views + excluded.views) > 0 THEN (avg_time_spent * views + ?) / (views + excluded.views) ELSE avg_time_spent END,
                        avg_scroll_depth = CASE WHEN (views + excluded.views) > 0 THEN (avg_scroll_depth * views + ?) / (views + excluded.views) ELSE avg_scroll_depth END,
                        total_dishes_viewed = total_dishes_viewed + excluded.total_dishes_viewed
                `).bind(restaurantId, sectionId, today, updateInfo.views, updateInfo.dish_views, initialAvgTime, initialAvgScroll, totalDishesViewed, totalDuration, totalScroll)
            );
        }

        // Execute all updates in batch
        if (updateStatements.length > 0) {
            await env.DB.batch(updateStatements);
        }

        // Execute custom updates (can't be batched - they have logic)
        for (const customUpdate of customUpdates) {
            try { await customUpdate(); } catch (e) { console.error('[Events] Custom update error:', e); }
        }

        // Process cart events
        for (const cartEvent of cartEvents) {
            await handleCartEvent(env.DB, cartEvent, session, restaurantId);
        }

        // Phase 4: Background aggregation (non-blocking)
        const aggregatePromise = Promise.all([
            aggregateDailyAnalytics(env.DB, restaurantId, today),
            aggregateCartMetrics(env.DB, restaurantId, today)
        ]);

        if (ctx?.waitUntil) {
            ctx.waitUntil(aggregatePromise);
        } else {
            aggregatePromise.catch(e => console.error('[Events] Aggregation error:', e));
        }

        return jsonResponse({ success: true, processed: processedEvents.length, events: processedEvents });
    } catch (error) {
        console.error('[Events] Error:', error);
        return errorResponse('Error processing events', 500, error.message);
    }
}

// ============================================
// CART HANDLING - OPTIMIZED SINGLE UPSERT
// ============================================
async function handleCartEvent(db, event, session, restaurantId) {
    try {
        const value = (typeof event.value === 'string') ? JSON.parse(event.value) : (event.value || {});
        const timestamp = event.ts || new Date().toISOString();
        const cartId = event.type === 'cart_created' ? event.entityId : value.cartId;

        if (!cartId) return;

        const totalItems = value.totalItems || 0;
        const uniqueDishes = value.uniqueDishes || 0;
        const totalValue = value.totalValue || 0;
        const cartSnapshot = value.items ? JSON.stringify(value.items) : null;
        const timeSpent = value.timeSpentSeconds || 0;

        if (event.type === 'cart_created') {
            await db.prepare(`
                INSERT INTO cart_sessions (id, sessionid, restaurantid, createdat, status, devicetype, languagecode, qrcodeid)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
                ON CONFLICT(id) DO NOTHING
            `).bind(cartId, session.id, restaurantId, timestamp, session.device_type || 'unknown', session.language_code || 'es', session.qr_code_id || null).run();
        }
        else if (event.type === 'cart_item_added' || event.type === 'cart_item_removed' || event.type === 'cart_item_quantity') {
            // Single UPSERT - create if not exists, update if exists
            await db.prepare(`
                INSERT INTO cart_sessions (id, sessionid, restaurantid, createdat, updatedat, status, devicetype, languagecode, qrcodeid, totalitems, uniquedishes, estimatedvalue, cartsnapshotjson, modificationscount)
                VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(id) DO UPDATE SET
                    updatedat = excluded.updatedat,
                    totalitems = excluded.totalitems,
                    uniquedishes = excluded.uniquedishes,
                    estimatedvalue = excluded.estimatedvalue,
                    cartsnapshotjson = COALESCE(excluded.cartsnapshotjson, cartsnapshotjson),
                    modificationscount = modificationscount + 1
            `).bind(cartId, session.id, restaurantId, timestamp, timestamp, session.device_type || 'unknown', session.language_code || 'es', session.qr_code_id || null, totalItems, uniqueDishes, totalValue, cartSnapshot).run();
        }
        else if (event.type === 'cart_shown_to_staff') {
            await db.prepare(`
                UPDATE cart_sessions SET status = 'converted', showntostaffat = ?, updatedat = ?, estimatedvalue = ?, totalitems = ?, uniquedishes = ?, timespentseconds = ?, cartsnapshotjson = COALESCE(?, cartsnapshotjson)
                WHERE id = ?
            `).bind(timestamp, timestamp, totalValue, totalItems, uniqueDishes, timeSpent, cartSnapshot, cartId).run();
        }
        else if (event.type === 'cart_abandoned') {
            await db.prepare(`
                UPDATE cart_sessions SET status = 'abandoned', abandonedat = ?, updatedat = ? WHERE id = ?
            `).bind(timestamp, timestamp, cartId).run();
        }
    } catch (error) {
        console.error('[Cart] Error:', error);
    }
}

// ============================================
// AGGREGATION FUNCTIONS
// ============================================
async function aggregateDailyAnalytics(db, restaurantId, date) {
    try {
        const dateStart = date + 'T00:00:00';
        const dateEnd = date + 'T23:59:59';

        const [sessionStats, visitorStats, eventStats] = await Promise.all([
            // ✅ IMPROVED: Smart fallback for duration calculation
            db.prepare(`
                SELECT COUNT(*) as total_sessions, 
                       AVG(COALESCE(
                           duration_seconds,
                           (SELECT MAX(CAST((julianday(e.created_at) - julianday(s.started_at)) * 86400 AS INTEGER))
                            FROM events e WHERE e.session_id = s.id)
                       )) as avg_session_duration
                FROM sessions s 
                WHERE s.restaurant_id = ? AND s.started_at BETWEEN ? AND ? AND s.consent_analytics = 1
            `).bind(restaurantId, dateStart, dateEnd).first(),
            // ✅ IMPROVED: Count sessions as unique visitors when visitor_id is NULL
            db.prepare(`
                SELECT COUNT(DISTINCT COALESCE(visitor_id, id)) as unique_visitors,
                       COUNT(DISTINCT CASE WHEN visit_count = 1 THEN COALESCE(visitor_id, id) END) as new_visitors,
                       COUNT(DISTINCT CASE WHEN visit_count > 1 THEN COALESCE(visitor_id, id) END) as returning_visitors
                FROM sessions WHERE restaurant_id = ? AND started_at BETWEEN ? AND ?
            `).bind(restaurantId, dateStart, dateEnd).first(),
            db.prepare(`
                SELECT SUM(CASE WHEN event_type = 'viewdish' THEN 1 ELSE 0 END) as dish_views,
                       COUNT(CASE WHEN event_type = 'favorite' AND (value = 'true' OR value = '1') THEN 1 END) as favorites_added,
                       COUNT(CASE WHEN event_type = 'rating' THEN 1 END) as ratings_submitted,
                       COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
                       AVG(CASE WHEN event_type = 'dish_view_duration' THEN numeric_value END) as avg_dish_view_duration,
                       AVG(CASE WHEN event_type = 'section_time' THEN numeric_value END) as avg_section_time,
                       AVG(CASE WHEN event_type = 'scroll_depth' THEN numeric_value END) as avg_scroll_depth,
                       COUNT(CASE WHEN event_type = 'media_error' THEN 1 END) as media_errors
                FROM events WHERE restaurant_id = ? AND created_at BETWEEN ? AND ?
            `).bind(restaurantId, dateStart, dateEnd).first()
        ]);

        await db.prepare(`
            INSERT INTO daily_analytics (restaurant_id, date, total_views, unique_visitors, total_sessions, avg_session_duration, dish_views, favorites_added, ratings_submitted, shares, avg_dish_view_duration, avg_section_time, avg_scroll_depth, media_errors, new_visitors, returning_visitors, reserve_clicks, call_clicks, directions_clicks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
            ON CONFLICT(restaurant_id, date) DO UPDATE SET
                total_views = excluded.total_views, unique_visitors = excluded.unique_visitors, total_sessions = excluded.total_sessions,
                avg_session_duration = excluded.avg_session_duration, dish_views = excluded.dish_views, favorites_added = excluded.favorites_added,
                ratings_submitted = excluded.ratings_submitted, shares = excluded.shares, avg_dish_view_duration = excluded.avg_dish_view_duration,
                avg_section_time = excluded.avg_section_time, avg_scroll_depth = excluded.avg_scroll_depth, media_errors = excluded.media_errors,
                new_visitors = excluded.new_visitors, returning_visitors = excluded.returning_visitors
        `).bind(
            restaurantId, date, sessionStats?.total_sessions || 0,
            visitorStats?.unique_visitors || sessionStats?.total_sessions || 0,
            sessionStats?.total_sessions || 0, sessionStats?.avg_session_duration || 0,
            eventStats?.dish_views || 0, eventStats?.favorites_added || 0, eventStats?.ratings_submitted || 0,
            eventStats?.shares || 0, Math.round((eventStats?.avg_dish_view_duration || 0) * 100) / 100,
            Math.round((eventStats?.avg_section_time || 0) * 100) / 100, Math.round(eventStats?.avg_scroll_depth || 0),
            eventStats?.media_errors || 0, visitorStats?.new_visitors || 0, visitorStats?.returning_visitors || 0
        ).run();
    } catch (error) {
        console.error('[Analytics] Daily aggregation error:', error);
    }
}

async function aggregateCartMetrics(db, restaurantId, date) {
    try {
        const stats = await db.prepare(`
            SELECT COUNT(*) as total_carts_created,
                   COUNT(CASE WHEN status = 'converted' THEN 1 END) as total_carts_shown,
                   COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as total_carts_abandoned,
                   SUM(CASE WHEN status = 'converted' THEN estimatedvalue ELSE 0 END) as shown_carts_value,
                   SUM(estimatedvalue) as total_estimated_value,
                   AVG(estimatedvalue) as avg_cart_value,
                   SUM(totalitems) as total_items_added,
                   AVG(totalitems) as avg_items_per_cart,
                   AVG(CASE WHEN status = 'converted' THEN timespentseconds END) as avg_time_to_show
            FROM cart_sessions WHERE restaurantid = ? AND DATE(createdat) = ?
        `).bind(restaurantId, date).first();

        const conversionRate = stats?.total_carts_created > 0 ? (stats.total_carts_shown / stats.total_carts_created) * 100 : 0;

        await db.prepare(`
            INSERT INTO cart_daily_metrics (restaurantid, date, total_carts_created, total_carts_shown, total_carts_abandoned, conversion_rate, total_estimated_value, avg_cart_value, shown_carts_value, total_items_added, avg_items_per_cart, avg_time_to_show)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(restaurantid, date) DO UPDATE SET
                total_carts_created = excluded.total_carts_created, total_carts_shown = excluded.total_carts_shown,
                total_carts_abandoned = excluded.total_carts_abandoned, conversion_rate = excluded.conversion_rate,
                total_estimated_value = excluded.total_estimated_value, avg_cart_value = excluded.avg_cart_value,
                shown_carts_value = excluded.shown_carts_value, total_items_added = excluded.total_items_added,
                avg_items_per_cart = excluded.avg_items_per_cart, avg_time_to_show = excluded.avg_time_to_show
        `).bind(restaurantId, date, stats?.total_carts_created || 0, stats?.total_carts_shown || 0, stats?.total_carts_abandoned || 0,
            conversionRate, stats?.total_estimated_value || 0, stats?.avg_cart_value || 0, stats?.shown_carts_value || 0,
            stats?.total_items_added || 0, stats?.avg_items_per_cart || 0, stats?.avg_time_to_show || 0).run();
    } catch (error) {
        console.error('[Analytics] Cart aggregation error:', error);
    }
}

// ============================================
// ANALYTICS QUERY ENDPOINTS
// ============================================
async function handleDailyAnalytics(request, env) {
    try {
        const { restaurantId, date } = await request.json();
        if (!restaurantId) return errorResponse('restaurantId es requerido');

        await aggregateDailyAnalytics(env.DB, restaurantId, date || toSqlDateUTC());
        return jsonResponse({ success: true, restaurantId, date: date || toSqlDateUTC() });
    } catch (error) {
        console.error('[DailyAnalytics] Error:', error);
        return errorResponse('Error aggregating daily analytics', 500, error.message);
    }
}

async function handleAnalyticsQuery(request, env) {
    const pathParts = new URL(request.url).pathname.split('/');
    if (pathParts[3] === 'daily') return handleDailyAnalyticsQuery(request, env);
    if (pathParts[3] === 'dishes') return handleDishAnalyticsQuery(request, env);
    if (pathParts[3] === 'sections') return handleSectionAnalyticsQuery(request, env);
    return errorResponse('Analytics endpoint not found', 404);
}

async function handleDailyAnalyticsQuery(request, env) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get('restaurant_id');
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date') || toSqlDateUTC();

        if (!restaurantId) return errorResponse('restaurant_id es requerido');

        let query = 'SELECT * FROM daily_analytics WHERE restaurant_id = ?';
        const params = [restaurantId];
        if (startDate) { query += ' AND date >= ?'; params.push(startDate); }
        query += ' AND date <= ? ORDER BY date DESC LIMIT 30';
        params.push(endDate);

        const results = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse({ success: true, data: results.results || [], restaurantId, dateRange: { start: startDate, end: endDate } });
    } catch (error) {
        console.error('[DailyAnalyticsQuery] Error:', error);
        return errorResponse('Error querying daily analytics', 500, error.message);
    }
}

async function handleDishAnalyticsQuery(request, env) {
    try {
        const restaurantId = new URL(request.url).searchParams.get('restaurant_id');
        if (!restaurantId) return errorResponse('restaurant_id es requerido');

        const dishes = await env.DB.prepare(`
            SELECT d.id, d.view_count, d.favorite_count, d.rating_count, d.avg_rating, d.total_view_time,
                   CAST(d.total_view_time AS REAL) / NULLIF(d.view_count, 0) as avg_view_duration, t.value as name
            FROM dishes d
            LEFT JOIN translations t ON d.id = t.entity_id AND t.entity_type = 'dish' AND t.field = 'name' AND t.language_code = 'es'
            WHERE d.restaurant_id = ? ORDER BY d.view_count DESC, d.favorite_count DESC
        `).bind(restaurantId).all();

        return jsonResponse({ success: true, data: dishes.results || [], restaurantId });
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

        if (!restaurantId) return errorResponse('restaurant_id es requerido');

        let query = `
            SELECT s.id, t.value as name, SUM(sdm.views) as total_views, SUM(sdm.dish_views) as total_dish_views,
                   AVG(sdm.avg_time_spent) as avg_time_spent, AVG(sdm.avg_scroll_depth) as avg_scroll_depth, SUM(sdm.total_dishes_viewed) as total_dishes_viewed
            FROM sections s
            LEFT JOIN section_daily_metrics sdm ON s.id = sdm.section_id
            LEFT JOIN translations t ON s.id = t.entity_id AND t.entity_type = 'section' AND t.field = 'name' AND t.language_code = 'es'
            WHERE s.restaurant_id = ?`;
        const params = [restaurantId];
        if (startDate) { query += ' AND sdm.date >= ?'; params.push(startDate); }
        query += ' AND sdm.date <= ? GROUP BY s.id ORDER BY total_views DESC';
        params.push(endDate);

        const results = await env.DB.prepare(query).bind(...params).all();
        return jsonResponse({ success: true, data: results.results || [], restaurantId, dateRange: { start: startDate, end: endDate } });
    } catch (error) {
        console.error('[SectionAnalyticsQuery] Error:', error);
        return errorResponse('Error querying section analytics', 500, error.message);
    }
}

// ============================================
// PRIVACY FUNCTIONS
// ============================================
async function handlePrivacyForget(request, env) {
    try {
        const { visitorId } = await request.json();
        if (!visitorId) return errorResponse('visitorId required');

        await env.DB.prepare('UPDATE sessions SET visitor_id = NULL, consent_analytics = 0 WHERE visitor_id = ?').bind(visitorId).run();
        return jsonResponse({ success: true });
    } catch (error) {
        console.error('[Privacy] Error:', error);
        return errorResponse('Error', 500, error.message);
    }
}

// ============================================
// MAIN EXPORT
// ============================================
export async function handleTracking(request, env, ctx) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/track/')) return null;

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
        if (url.pathname === '/track/session/start' && request.method === 'POST') return await handleSessionStart(request, env);
        if (url.pathname === '/track/session/end' && request.method === 'POST') return await handleSessionEnd(request, env);
        if (url.pathname === '/track/events' && request.method === 'POST') return await handleEvents(request, env, ctx);
        if (url.pathname === '/track/analytics/daily' && request.method === 'POST') return await handleDailyAnalytics(request, env);
        if (url.pathname.startsWith('/track/analytics/') && request.method === 'GET') return await handleAnalyticsQuery(request, env);
        if (url.pathname === '/track/privacy/forget' && request.method === 'POST') return await handlePrivacyForget(request, env);

        return errorResponse('Tracking endpoint not found', 404);
    } catch (error) {
        console.error('[Tracking] Error:', error);
        return errorResponse('Internal server error', 500, error.message);
    }
}
