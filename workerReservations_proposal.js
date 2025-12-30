
// ESTE ARCHIVO ES UNA REFERENCIA PARA QUE EL USUARIO ACTUALICE SU WORKER MANUALMENTE
// Copiar las funciones relevantes a workerReservations.js

export async function handleReservationRequests(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    console.log(`[Reservations] ${method} ${pathname}`);

    // CORS Preflight
    if (method === "OPTIONS") {
        return createResponse(null, 204);
    }

    // ... (endpoints existentes) ...

    // NUEVO ENDPOINT: GET /reservations/availability/calendar?restaurant_id=X&start_date=Y&end_date=Z
    if (method === "GET" && pathname === "/reservations/availability/calendar") {
        return getAvailabilityCalendar(env, url.searchParams);
    }

    // MODIFICADO: GET /reservations/availability?restaurant_id=X&date=Y&party_size=Z
    if (method === "GET" && pathname === "/reservations/availability") {
        return checkAvailability(env, url.searchParams);
    }

    // ... resto del router ...
}

// NUEVA FUNCIÓN
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

// FUNCIÓN MODIFICADA
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

        if (partySize > maxPartySize) return createResponse({ success: false, message: "Party size too large" }, 400);

        // 2. Count existing reservations for that date
        const existingReservations = await env.DB.prepare(`
            SELECT reservation_time, party_size 
            FROM reservations 
            WHERE restaurant_id = ? 
            AND reservation_date = ? 
            AND status IN ('confirmed', 'pending')
        `).bind(restaurantId, date).all();

        // Parse Standard Availability
        let schedule = settings.booking_availability ? JSON.parse(settings.booking_availability) : null;
        if (!schedule) {
            // Default generic schedule
            schedule = {
                "default": [
                    { "start": "13:00", "end": "15:30" },
                    { "start": "20:00", "end": "22:30" }
                ]
            };
        }

        // Determine day of week
        const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dailySlots = schedule[dayOfWeek] || schedule['default'] || [];

        // Generate Time Slots
        let availableSlots = [];
        const slotInterval = 30; // mins

        // Current time for same-day validation
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const isToday = date === todayStr;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (const range of dailySlots) {
            let current = convertToMinutes(range.start);
            let end = convertToMinutes(range.end);

            while (current + (settings.slot_duration_minutes || 90) <= end) {
                // VALIDACIÓN IMPORTANTE: Si es hoy, saltar horas pasadas (+30m buffer)
                if (isToday && current < currentMinutes + 30) {
                    current += slotInterval;
                    continue;
                }

                const timeLabel = convertToTime(current);

                const currentOccupancy = existingReservations.results.reduce((acc, res) => {
                    const resStart = convertToMinutes(res.reservation_time);
                    const resEnd = resStart + (settings.slot_duration_minutes || 90);

                    if (resStart <= current && resEnd > current) {
                        return acc + res.party_size;
                    }
                    return acc;
                }, 0);

                if (currentOccupancy + partySize <= maxCapacity) {
                    availableSlots.push(timeLabel);
                }

                current += slotInterval;
            }
        }

        return createResponse({ success: true, slots: availableSlots });

    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
