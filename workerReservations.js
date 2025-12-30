export async function handleReservationRequests(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    console.log(`[Reservations] ${method} ${pathname}`);
    // CORS Preflight
    if (method === "OPTIONS") {
        return createResponse(null, 204);
    }
    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================
    // GET /reservations/config/:restaurant_id
    // Returns settings if enabled, or checks if enabled
    if (method === "GET" && pathname.match(/^\/reservations\/config\/[\w-]+$/)) {
        const restaurantSlugOrId = pathname.split('/')[3];
        return getReservationConfig(env, restaurantSlugOrId);
    }

    // PUT /reservations/config/:restaurant_id
    // Updates reservation settings (schedule, closed dates, etc.)
    if (method === "PUT" && pathname.match(/^\/reservations\/config\/[\w-]+$/)) {
        const restaurantSlugOrId = pathname.split('/')[3];
        return updateReservationConfig(env, request, restaurantSlugOrId);
    }

    // NEW: GET /reservations/availability/calendar
    // Returns availability status for a range of dates
    if (method === "GET" && pathname === "/reservations/availability/calendar") {
        return getAvailabilityCalendar(env, url.searchParams);
    }

    // GET /reservations/availability?restaurant_id=X&date=Y&party_size=Z
    if (method === "GET" && pathname === "/reservations/availability") {
        return checkAvailability(env, url.searchParams);
    }
    // POST /reservations
    if (method === "POST" && pathname === "/reservations") {
        return createReservation(env, request);
    }
    // POST /reservations/waitlist
    if (method === "POST" && pathname === "/reservations/waitlist") {
        return joinWaitlist(env, request);
    }
    // ============================================
    // ADMIN ENDPOINTS
    // ============================================
    // POST /reservations/settings/toggle
    if (method === "POST" && pathname === "/reservations/settings/toggle") {
        return toggleReservationSystem(env, request);
    }
    // GET /reservations/admin/list?restaurant_id=X&date=Y
    if (method === "GET" && pathname === "/reservations/admin/list") {
        return getReservations(env, url.searchParams);
    }
    // GET /reservations/stats?restaurant_id=X&month=YYYY-MM
    if (method === "GET" && pathname === "/reservations/stats") {
        return getReservationStats(env, url.searchParams);
    }
    // GET /reservations/admin/logs?restaurant_id=X
    if (method === "GET" && pathname === "/reservations/admin/logs") {
        return getReservationLogs(env, url.searchParams);
    }
    // PATCH /reservations/:id
    if (method === "PATCH" && pathname.match(/^\/reservations\/[\w-]+$/)) {
        const id = pathname.split('/')[2];
        return updateReservationStatus(env, id, request);
    }
    // ❌ IMPORTANTE: Retornar NULL si no es una ruta de reservas
    // para que el worker principal pruebe con el siguiente handler (Reels, Restaurants, etc.)
    return null;
}
// ============================================
// LOGIC FUNCTIONS
// ============================================
async function getReservationConfig(env, restaurantSlugOrId) {
    try {
        // Resolve ID
        const restaurant = await env.DB.prepare(
            `SELECT id FROM restaurants WHERE slug = ? OR id = ?`
        ).bind(restaurantSlugOrId, restaurantSlugOrId).first();
        if (!restaurant) return createResponse({ success: false, message: "Restaurant not found" }, 404);
        const settings = await env.DB.prepare(
            `SELECT * FROM reservation_settings WHERE restaurant_id = ?`
        ).bind(restaurant.id).first();
        // If no settings exist, return disabled by default
        if (!settings) {
            return createResponse({ success: true, config: { is_enabled: false } });
        }
        return createResponse({
            success: true,
            config: {
                ...settings,
                booking_availability: settings.booking_availability ? JSON.parse(settings.booking_availability) : null,
                is_enabled: settings.is_enabled === 1 || settings.is_enabled === true || settings.is_enabled === "true"
            }
        });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function updateReservationConfig(env, request, restaurantSlugOrId) {
    try {
        const body = await request.json();
        // Resolve ID
        const restaurant = await env.DB.prepare(
            `SELECT id FROM restaurants WHERE slug = ? OR id = ?`
        ).bind(restaurantSlugOrId, restaurantSlugOrId).first();

        if (!restaurant) return createResponse({ success: false, message: "Restaurant not found" }, 404);

        const {
            is_enabled, max_capacity, max_party_size, slot_duration_minutes,
            gap_between_slots_minutes, booking_availability, closed_dates,
            advance_days, holiday_closures
        } = body;

        // Check if settings exist
        const exists = await env.DB.prepare(`SELECT restaurant_id FROM reservation_settings WHERE restaurant_id = ?`).bind(restaurant.id).first();

        // Ensure JSON fields are strings if they are objects, OR null if undefined
        const availabilityJson = booking_availability ? (typeof booking_availability === 'object' ? JSON.stringify(booking_availability) : booking_availability) : null;
        const closedDatesJson = closed_dates ? (typeof closed_dates === 'object' ? JSON.stringify(closed_dates) : closed_dates) : null;
        const holidaysJson = holiday_closures ? (typeof holiday_closures === 'object' ? JSON.stringify(holiday_closures) : holiday_closures) : null;

        if (exists) {
            await env.DB.prepare(`
                UPDATE reservation_settings SET
                    is_enabled = ?, max_capacity = ?, max_party_size = ?,
                    slot_duration_minutes = ?, gap_between_slots_minutes = ?,
                    booking_availability = ?, closed_dates = ?, advance_days = ?,
                    holiday_closures = ?, modified_at = CURRENT_TIMESTAMP
                WHERE restaurant_id = ?
            `).bind(
                is_enabled ? 1 : 0, max_capacity || 50, max_party_size || 10,
                slot_duration_minutes || 90, gap_between_slots_minutes || 0,
                availabilityJson, closedDatesJson, advance_days || 30,
                holidaysJson, restaurant.id
            ).run();
        } else {
            await env.DB.prepare(`
                INSERT INTO reservation_settings (
                    restaurant_id, is_enabled, max_capacity, max_party_size,
                    slot_duration_minutes, gap_between_slots_minutes,
                    booking_availability, closed_dates, advance_days, holiday_closures
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                restaurant.id, is_enabled ? 1 : 0, max_capacity || 50, max_party_size || 10,
                slot_duration_minutes || 90, gap_between_slots_minutes || 0,
                availabilityJson, closedDatesJson, advance_days || 30, holidaysJson
            ).run();
        }

        return createResponse({ success: true, message: "Settings updated successfully" });

    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function getAvailabilityCalendar(env, params) {
    try {
        const restaurantId = params.get('restaurant_id');
        const startDateStr = params.get('start_date'); // YYYY-MM-DD
        const endDateStr = params.get('end_date');     // YYYY-MM-DD

        if (!restaurantId) return createResponse({ success: false, message: "Missing restaurant_id" }, 400);

        // Get Settings
        const settings = await env.DB.prepare(
            `SELECT * FROM reservation_settings WHERE restaurant_id = ?`
        ).bind(restaurantId).first();

        if (!settings || !settings.is_enabled) {
            return createResponse({ success: true, calendar: [], is_enabled: false });
        }

        const closedDates = settings.closed_dates ? JSON.parse(settings.closed_dates) : [];
        const bookingAvailability = settings.booking_availability ? JSON.parse(settings.booking_availability) : null;

        // Generate date range
        const calendar = [];
        const start = startDateStr ? new Date(startDateStr) : new Date();
        const end = endDateStr ? new Date(endDateStr) : new Date(start);
        if (!endDateStr) end.setDate(end.getDate() + (settings.advance_days || 30));

        const now = new Date();

        // Loop through dates
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            let status = 'open';
            let reason = null;

            // 1. Check Closed Dates
            if (closedDates.includes(dateStr)) {
                status = 'closed';
                reason = 'closed_date';
            }

            // 2. Check Schedule Existence
            if (status === 'open' && bookingAvailability) {
                const dailySlots = bookingAvailability[dayOfWeek] || bookingAvailability['default'];
                if (!dailySlots || dailySlots.length === 0) {
                    status = 'closed';
                    reason = 'no_schedule';
                }
            }

            // 3. Check Past Dates (allowing today)
            const todayStr = now.toISOString().split('T')[0];
            if (dateStr < todayStr) {
                status = 'closed';
                reason = 'past';
            }

            calendar.push({
                date: dateStr,
                status,
                reason
            });
        }

        return createResponse({ success: true, calendar });

    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function checkAvailability(env, params) {
    try {
        const restaurantId = params.get('restaurant_id');
        const date = params.get('date'); // YYYY-MM-DD
        const partySize = parseInt(params.get('party_size') || '2');
        if (!restaurantId || !date) return createResponse({ success: false, message: "Missing params" }, 400);

        // 1. Get Settings
        const settings = await env.DB.prepare(
            `SELECT * FROM reservation_settings WHERE restaurant_id = ? AND is_enabled = TRUE`
        ).bind(restaurantId).first();

        if (!settings) return createResponse({ success: false, message: "Reservations disabled" }, 403);

        // Check Closed Dates
        const closedDates = settings.closed_dates ? JSON.parse(settings.closed_dates) : [];
        if (closedDates.includes(date)) {
            return createResponse({ success: true, slots: [], message: "Restaurant closed on this date" });
        }

        const maxCapacity = settings.max_capacity || 50;
        const maxPartySize = settings.max_party_size || 10;
        const slotDuration = settings.slot_duration_minutes || 90;
        const gap = settings.gap_between_slots_minutes;
        const pacing = (gap && gap > 0) ? gap : 15; // Default 15 min interval for slot generation

        if (partySize > maxCapacity) return createResponse({ success: false, message: "Party size exceeds restaurant capacity" }, 400);

        // 2. Count existing reservations
        const existingReservations = await env.DB.prepare(`
            SELECT reservation_time, party_size 
            FROM reservations 
            WHERE restaurant_id = ? 
            AND reservation_date = ? 
            AND status IN ('confirmed', 'pending')
        `).bind(restaurantId, date).all();

        // 3. Process Schedule (MERGE INTERVALS STRATEGY)
        let rawSchedule = settings.booking_availability ? JSON.parse(settings.booking_availability) : null;
        if (!rawSchedule) {
            rawSchedule = {
                "default": [{ "start": "13:00", "end": "23:00" }]
            };
        }

        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        let definedSlots = rawSchedule[dayOfWeek] || rawSchedule['default'] || [];

        // MERGE LOGIC: Combine [13-14, 14-15] into [13-15]
        const mergedWindows = mergeTimeRanges(definedSlots);

        // 4. Generate Dynamic Slots
        let availableSlots = [];

        // Current time for same-day validation
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const isToday = date === todayStr;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const bufferMinutes = 30; // Min time before booking

        for (const window of mergedWindows) {
            let current = window.start; // in minutes
            const windowEnd = window.end; // in minutes

            // While the reservation fits in the window
            while (current + slotDuration <= windowEnd) {

                // Past validation
                if (isToday && current < currentMinutes + bufferMinutes) {
                    current += pacing;
                    continue;
                }

                // Capacity Calculation (Overlap check)
                // A reservation starting at 'current' ends at 'current + slotDuration'
                // It overlaps with existing Res if: ResStart < MyEnd AND ResEnd > MyStart
                const potentialStart = current;
                const potentialEnd = current + slotDuration;

                const currentOccupancy = existingReservations.results.reduce((acc, res) => {
                    const resStart = convertToMinutes(res.reservation_time);
                    const resEnd = resStart + slotDuration; // Assuming constant duration for calculation simplicity

                    if (resStart < potentialEnd && resEnd > potentialStart) {
                        return acc + res.party_size;
                    }
                    return acc;
                }, 0);

                if (currentOccupancy + partySize <= maxCapacity) {
                    availableSlots.push(convertToTime(current));
                }

                current += pacing; // Move to next potential slot
            }
        }

        return createResponse({ success: true, slots: availableSlots });

    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// Helper: Merge overlapping or adjacent time ranges
// Input: [{start: "13:00", end: "14:00"}, {start: "14:00", end: "15:00"}]
// Output: [{start: 780, end: 900}] (in minutes)
function mergeTimeRanges(ranges) {
    if (!ranges || ranges.length === 0) return [];

    // Convert to minutes and sort
    const sorted = ranges.map(r => ({
        start: convertToMinutes(r.start),
        end: convertToMinutes(r.end)
    })).sort((a, b) => a.start - b.start);

    const merged = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        if (current.end >= next.start) {
            // Overlap or adjacent -> Merge
            current.end = Math.max(current.end, next.end);
        } else {
            // Gap -> Push current and start new
            merged.push(current);
            current = next;
        }
    }
    merged.push(current);
    return merged;
}

async function createReservation(env, request) {
    try {
        const body = await request.json();
        // Validation would go here (Zod is best but vanilla JS for now)
        if (!body.restaurant_id || !body.client_name || !body.client_email) {
            return createResponse({ success: false, message: "Missing fields" }, 400);
        }
        // GDPR Check
        if (!body.accepted_policy) {
            return createResponse({ success: false, message: "GDPR Consent required" }, 400);
        }
        const id = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const status = 'pending'; // Default to pending as per user request
        await env.DB.prepare(`
            INSERT INTO reservations (
                id, restaurant_id, client_name, client_email, client_phone,
                reservation_date, reservation_time, party_size, status,
                special_requests, occasion, accepted_policy, ip_address
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id, body.restaurant_id, body.client_name, body.client_email, body.client_phone,
            body.reservation_date, body.reservation_time, body.party_size, status,
            body.special_requests, body.occasion, body.accepted_policy ? 1 : 0,
            request.headers.get('CF-Connecting-IP') || 'unknown'
        ).run();
        // Log it
        await env.DB.prepare(`
            INSERT INTO reservation_logs (id, reservation_id, action, changed_by, reason)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            `log_${Date.now()}`, id, 'created', 'user', 'Online Booking'
        ).run();
        return createResponse({ success: true, reservation_id: id });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
async function joinWaitlist(env, request) {
    try {
        const body = await request.json();
        if (!body.restaurant_id || !body.client_name || !body.client_contact_value) {
            return createResponse({ success: false, message: "Missing fields" }, 400);
        }
        if (!body.accepted_policy) {
            return createResponse({ success: false, message: "GDPR Consent required" }, 400);
        }
        const id = `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await env.DB.prepare(`
            INSERT INTO reservation_waitlist (
                id, restaurant_id, client_name, client_contact_method, client_contact_value,
                desired_date, desired_time_range, party_size, notes, status, accepted_policy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?)
        `).bind(
            id, body.restaurant_id, body.client_name, body.client_contact_method, body.client_contact_value,
            body.desired_date, body.desired_time_range || 'Any', body.party_size,
            body.notes, body.accepted_policy ? 1 : 0
        ).run();
        return createResponse({ success: true, waitlist_id: id });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
async function toggleReservationSystem(env, request) {
    try {
        const body = await request.json();
        const { restaurant_id, is_enabled } = body;
        if (!restaurant_id) {
            return createResponse({ success: false, message: "Missing restaurant_id" }, 400);
        }
        // Check if settings exist, if not create
        const exists = await env.DB.prepare(`SELECT restaurant_id FROM reservation_settings WHERE restaurant_id = ?`).bind(restaurant_id).first();
        if (exists) {
            await env.DB.prepare(`UPDATE reservation_settings SET is_enabled = ? WHERE restaurant_id = ?`)
                .bind(is_enabled ? 1 : 0, restaurant_id).run();
        } else {
            await env.DB.prepare(`
                INSERT INTO reservation_settings (restaurant_id, is_enabled, max_capacity) 
                VALUES (?, ?, 50)
            `).bind(restaurant_id, is_enabled ? 1 : 0).run();
        }
        return createResponse({ success: true, is_enabled });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
async function getReservations(env, params) {
    try {
        const restaurant_id = params.get('restaurant_id');
        const date = params.get('date');
        if (!restaurant_id) return createResponse({ success: false, message: "Rest ID req" }, 400);
        let query = `SELECT * FROM reservations WHERE restaurant_id = ?`;
        let bindParams = [restaurant_id];
        if (date) {
            query += ` AND reservation_date = ?`;
            bindParams.push(date);
        }
        query += ` ORDER BY reservation_date ASC, reservation_time ASC`;
        const reservations = await env.DB.prepare(query).bind(...bindParams).all();
        // Also get waitlist for that date
        let wlQuery = `SELECT * FROM reservation_waitlist WHERE restaurant_id = ?`;
        let wlBind = [restaurant_id];
        if (date) {
            wlQuery += ` AND desired_date = ?`;
            wlBind.push(date);
        }
        const waitlist = await env.DB.prepare(wlQuery).bind(...wlBind).all();
        return createResponse({
            success: true,
            reservations: reservations.results || [],
            waitlist: waitlist.results || []
        });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
async function getReservationStats(env, params) {
    try {
        const restaurant_id = params.get('restaurant_id');
        const month = params.get('month'); // YYYY-MM
        if (!restaurant_id || !month) return createResponse({ success: false, message: "Missing params" }, 400);
        const stats = await env.DB.prepare(`
            SELECT reservation_date, COUNT(*) as count, SUM(party_size) as covers 
            FROM reservations 
            WHERE restaurant_id = ? 
            AND reservation_date LIKE ? 
            AND status NOT IN ('cancelled', 'cancelled_restaurant')
            GROUP BY reservation_date
        `).bind(restaurant_id, `${month}%`).all();
        return createResponse({ success: true, stats: stats.results || [] });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
async function getReservationLogs(env, params) {
    try {
        const restaurant_id = params.get('restaurant_id');
        if (!restaurant_id) return createResponse({ success: false, message: "Rest ID req" }, 400);
        const logs = await env.DB.prepare(`
            SELECT l.*, r.client_name, r.reservation_date 
            FROM reservation_logs l 
            JOIN reservations r ON l.reservation_id = r.id 
            WHERE r.restaurant_id = ? 
            ORDER BY l.created_at DESC 
            LIMIT 50
        `).bind(restaurant_id).all();
        return createResponse({ success: true, logs: logs.results || [] });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
async function updateReservationStatus(env, id, request) {
    try {
        const body = await request.json();
        const { status, cancellation_reason } = body;
        await env.DB.prepare(`
            UPDATE reservations SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(status, cancellation_reason || null, id).run();
        // Log
        await env.DB.prepare(`
            INSERT INTO reservation_logs (id, reservation_id, action, changed_by, new_state)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            `log_${Date.now()}`, id, 'status_change', 'admin', status
        ).run();
        return createResponse({ success: true });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
// ============================================
// HELPERS
// ============================================
function convertToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}
function convertToTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}
export function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
