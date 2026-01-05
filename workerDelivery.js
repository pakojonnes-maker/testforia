// workerDelivery.js - Sistema de Delivery
// Gestiona configuración y disponibilidad de delivery para restaurantes

export async function handleDeliveryRequests(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Solo procesar rutas de delivery
    if (!pathname.startsWith('/delivery/')) {
        return null;
    }

    console.log(`[Delivery] ${method} ${pathname}`);

    // CORS Preflight
    if (method === "OPTIONS") {
        return createResponse(null, 204);
    }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    // GET /delivery/config/:slug - Obtener configuración pública
    if (method === "GET" && pathname.match(/^\/delivery\/config\/[\w-]+$/)) {
        const slug = pathname.split('/')[3];
        return getDeliveryConfig(env, slug, url.searchParams.get('lang') || 'es');
    }

    // GET /delivery/available/:slug - Verificar disponibilidad actual
    if (method === "GET" && pathname.match(/^\/delivery\/available\/[\w-]+$/)) {
        const slug = pathname.split('/')[3];
        return checkDeliveryAvailability(env, slug);
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    // PUT /delivery/config/:restaurantId - Actualizar configuración
    if (method === "PUT" && pathname.match(/^\/delivery\/config\/[\w-]+$/)) {
        const restaurantId = pathname.split('/')[3];
        return updateDeliveryConfig(env, request, restaurantId);
    }

    // GET /delivery/translations/:restaurantId - Obtener traducciones admin
    if (method === "GET" && pathname.match(/^\/delivery\/translations\/[\w-]+$/)) {
        const restaurantId = pathname.split('/')[3];
        return getDeliveryTranslations(env, restaurantId);
    }

    // PUT /delivery/translations/:restaurantId - Actualizar traducciones
    if (method === "PUT" && pathname.match(/^\/delivery\/translations\/[\w-]+$/)) {
        const restaurantId = pathname.split('/')[3];
        return updateDeliveryTranslations(env, request, restaurantId);
    }

    // ============================================
    // ORDER ENDPOINTS
    // ============================================

    // POST /delivery/orders - Crear nuevo pedido
    if (method === "POST" && pathname === '/delivery/orders') {
        return createDeliveryOrder(env, request);
    }

    // GET /delivery/orders/:restaurantId - Listar pedidos (admin)
    if (method === "GET" && pathname.match(/^\/delivery\/orders\/[\w-]+$/)) {
        const restaurantId = pathname.split('/')[3];
        const status = url.searchParams.get('status');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        return getDeliveryOrders(env, restaurantId, { status, limit, offset });
    }

    // PATCH /delivery/orders/:orderId/status - Actualizar estado
    if (method === "PATCH" && pathname.match(/^\/delivery\/orders\/[\w-]+\/status$/)) {
        const orderId = pathname.split('/')[3];
        return updateOrderStatus(env, request, orderId);
    }

    return null;
}

// ============================================
// GET DELIVERY CONFIG (Public)
// ============================================
async function getDeliveryConfig(env, slugOrId, lang) {
    try {
        // Resolver restaurante
        const restaurant = await env.DB.prepare(`
            SELECT r.id, r.name, r.phone, rd.whatsapp_number, rd.reservation_phone
            FROM restaurants r
            LEFT JOIN restaurant_details rd ON r.id = rd.restaurant_id
            WHERE r.slug = ? OR r.id = ?
        `).bind(slugOrId, slugOrId).first();

        if (!restaurant) {
            return createResponse({ success: false, message: "Restaurant not found" }, 404);
        }

        // Obtener configuración de delivery
        const settings = await env.DB.prepare(`
            SELECT * FROM delivery_settings WHERE restaurant_id = ?
        `).bind(restaurant.id).first();

        if (!settings || !settings.is_enabled) {
            return createResponse({
                success: true,
                is_enabled: false
            });
        }

        // Obtener traducciones del restaurante para este idioma (usando tabla translations)
        const translationsResult = await env.DB.prepare(`
            SELECT field, value
            FROM translations
            WHERE entity_id = ? AND entity_type = 'delivery' AND language_code = ?
        `).bind(restaurant.id, lang).all();

        // Construir objeto de traducciones
        const translationsMap = {};
        for (const row of translationsResult.results || []) {
            translationsMap[row.field] = row.value;
        }

        // Fallback a español si no hay traducción
        let translationsFallback = {};
        if (Object.keys(translationsMap).length === 0 && lang !== 'es') {
            const fallbackResult = await env.DB.prepare(`
                SELECT field, value
                FROM translations
                WHERE entity_id = ? AND entity_type = 'delivery' AND language_code = 'es'
            `).bind(restaurant.id).all();

            for (const row of fallbackResult.results || []) {
                translationsFallback[row.field] = row.value;
            }
        }

        // Obtener strings de UI
        const uiStrings = await env.DB.prepare(`
            SELECT key_name, label
            FROM localization_strings
            WHERE context = 'delivery' AND language_code = ?
        `).bind(lang).all();

        // Convertir a objeto
        const uiStringsMap = {};
        for (const row of uiStrings.results || []) {
            uiStringsMap[row.key_name] = row.label;
        }

        // Parsear payment_methods
        let paymentMethods = { cash: true, card: false };
        try {
            if (settings.payment_methods) {
                paymentMethods = JSON.parse(settings.payment_methods);
            }
        } catch (e) { /* keep defaults */ }

        // Parsear delivery_hours
        let deliveryHours = null;
        try {
            if (settings.delivery_hours) {
                deliveryHours = JSON.parse(settings.delivery_hours);
            }
        } catch (e) { /* keep null */ }

        // Determinar números de contacto
        const whatsappNumber = settings.custom_whatsapp || restaurant.whatsapp_number || restaurant.phone;
        const phoneNumber = settings.custom_phone || restaurant.reservation_phone || restaurant.phone;

        return createResponse({
            success: true,
            is_enabled: true,
            show_whatsapp: !!settings.show_whatsapp,
            show_phone: !!settings.show_phone,
            whatsapp_number: whatsappNumber,
            phone_number: phoneNumber,
            payment_methods: paymentMethods,
            shipping_cost: settings.shipping_cost || 0,
            free_shipping_threshold: settings.free_shipping_threshold || 0,
            minimum_order: settings.minimum_order || 0,
            delivery_hours: deliveryHours,
            closed_dates: settings.closed_dates ? JSON.parse(settings.closed_dates) : [],
            translations: {
                delivery_zones: translationsMap.delivery_zones || translationsFallback.delivery_zones || '',
                custom_message: translationsMap.custom_message || translationsFallback.custom_message || ''
            },
            ui_strings: uiStringsMap
        });

    } catch (error) {
        console.error('[Delivery] Error getDeliveryConfig:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// CHECK DELIVERY AVAILABILITY
// ============================================
async function checkDeliveryAvailability(env, slugOrId) {
    try {
        // Resolver restaurante
        const restaurant = await env.DB.prepare(`
            SELECT id FROM restaurants WHERE slug = ? OR id = ?
        `).bind(slugOrId, slugOrId).first();

        if (!restaurant) {
            return createResponse({ success: false, message: "Restaurant not found" }, 404);
        }

        const settings = await env.DB.prepare(`
            SELECT is_enabled, delivery_hours, closed_dates
            FROM delivery_settings WHERE restaurant_id = ?
        `).bind(restaurant.id).first();

        if (!settings || !settings.is_enabled) {
            return createResponse({
                success: true,
                available: false,
                reason: 'disabled'
            });
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Verificar día cerrado
        const closedDates = settings.closed_dates ? JSON.parse(settings.closed_dates) : [];
        if (closedDates.includes(todayStr)) {
            return createResponse({
                success: true,
                available: false,
                reason: 'closed_today'
            });
        }

        // Verificar horario
        if (settings.delivery_hours) {
            const hours = JSON.parse(settings.delivery_hours);
            const todaySlots = hours[dayOfWeek] || hours['default'] || [];

            if (todaySlots.length === 0) {
                return createResponse({
                    success: true,
                    available: false,
                    reason: 'no_schedule_today'
                });
            }

            // Verificar si estamos dentro de algún slot
            let withinSlot = false;
            for (const slot of todaySlots) {
                const startMins = convertToMinutes(slot.start);
                const endMins = convertToMinutes(slot.end);
                if (currentMinutes >= startMins && currentMinutes <= endMins) {
                    withinSlot = true;
                    break;
                }
            }

            if (!withinSlot) {
                return createResponse({
                    success: true,
                    available: false,
                    reason: 'outside_hours'
                });
            }
        }

        return createResponse({
            success: true,
            available: true
        });

    } catch (error) {
        console.error('[Delivery] Error checkAvailability:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// UPDATE DELIVERY CONFIG (Admin)
// ============================================
async function updateDeliveryConfig(env, request, restaurantId) {
    try {
        const body = await request.json();

        const {
            is_enabled,
            show_whatsapp,
            show_phone,
            custom_whatsapp,
            custom_phone,
            delivery_hours,
            closed_dates,
            payment_methods,
            shipping_cost,
            free_shipping_threshold,
            minimum_order,
            custom_message
        } = body;

        // Serializar JSON fields
        const deliveryHoursJson = delivery_hours ? (typeof delivery_hours === 'object' ? JSON.stringify(delivery_hours) : delivery_hours) : null;
        const closedDatesJson = closed_dates ? (typeof closed_dates === 'object' ? JSON.stringify(closed_dates) : closed_dates) : null;
        const paymentMethodsJson = payment_methods ? (typeof payment_methods === 'object' ? JSON.stringify(payment_methods) : payment_methods) : '{"cash":true,"card":false}';

        // Check if exists
        const exists = await env.DB.prepare(`
            SELECT restaurant_id FROM delivery_settings WHERE restaurant_id = ?
        `).bind(restaurantId).first();

        if (exists) {
            await env.DB.prepare(`
                UPDATE delivery_settings SET
                    is_enabled = ?,
                    show_whatsapp = ?,
                    show_phone = ?,
                    custom_whatsapp = ?,
                    custom_phone = ?,
                    delivery_hours = ?,
                    closed_dates = ?,
                    payment_methods = ?,
                    shipping_cost = ?,
                    free_shipping_threshold = ?,
                    minimum_order = ?,
                    custom_message = ?,
                    modified_at = CURRENT_TIMESTAMP
                WHERE restaurant_id = ?
            `).bind(
                is_enabled ? 1 : 0,
                show_whatsapp !== false ? 1 : 0,
                show_phone ? 1 : 0,
                custom_whatsapp || null,
                custom_phone || null,
                deliveryHoursJson,
                closedDatesJson,
                paymentMethodsJson,
                shipping_cost || 0,
                free_shipping_threshold || 0,
                minimum_order || 0,
                custom_message || null,
                restaurantId
            ).run();
        } else {
            await env.DB.prepare(`
                INSERT INTO delivery_settings (
                    restaurant_id, is_enabled, show_whatsapp, show_phone,
                    custom_whatsapp, custom_phone, delivery_hours, closed_dates,
                    payment_methods, shipping_cost, free_shipping_threshold,
                    minimum_order, custom_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                restaurantId,
                is_enabled ? 1 : 0,
                show_whatsapp !== false ? 1 : 0,
                show_phone ? 1 : 0,
                custom_whatsapp || null,
                custom_phone || null,
                deliveryHoursJson,
                closedDatesJson,
                paymentMethodsJson,
                shipping_cost || 0,
                free_shipping_threshold || 0,
                minimum_order || 0,
                custom_message || null
            ).run();
        }

        return createResponse({ success: true, message: "Delivery settings updated" });

    } catch (error) {
        console.error('[Delivery] Error updateDeliveryConfig:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// GET DELIVERY TRANSLATIONS (Admin)
// ============================================
async function getDeliveryTranslations(env, restaurantId) {
    try {
        const translations = await env.DB.prepare(`
            SELECT language_code, field, value
            FROM translations
            WHERE entity_id = ? AND entity_type = 'delivery'
        `).bind(restaurantId).all();

        // Agrupar por idioma
        const result = {};
        for (const row of translations.results || []) {
            if (!result[row.language_code]) {
                result[row.language_code] = { delivery_zones: '', custom_message: '' };
            }
            result[row.language_code][row.field] = row.value || '';
        }

        return createResponse({ success: true, translations: result });

    } catch (error) {
        console.error('[Delivery] Error getDeliveryTranslations:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// UPDATE DELIVERY TRANSLATIONS (Admin)
// ============================================
async function updateDeliveryTranslations(env, request, restaurantId) {
    try {
        const body = await request.json();
        // body format: { es: { delivery_zones: "...", custom_message: "..." }, en: {...} }

        const statements = [];

        for (const [langCode, data] of Object.entries(body)) {
            // Campos a guardar
            const fields = ['delivery_zones', 'custom_message'];

            for (const field of fields) {
                if (data[field] !== undefined) {
                    // UPSERT usando la tabla translations existente
                    statements.push(
                        env.DB.prepare(`
                            INSERT INTO translations (entity_id, entity_type, language_code, field, value)
                            VALUES (?, 'delivery', ?, ?, ?)
                            ON CONFLICT(entity_id, entity_type, language_code, field) DO UPDATE SET
                                value = excluded.value,
                                modified_at = CURRENT_TIMESTAMP
                        `).bind(restaurantId, langCode, field, data[field] || '')
                    );
                }
            }
        }

        if (statements.length > 0) {
            await env.DB.batch(statements);
        }

        return createResponse({ success: true, message: "Translations updated" });

    } catch (error) {
        console.error('[Delivery] Error updateDeliveryTranslations:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// CREATE DELIVERY ORDER (Public)
// ============================================
async function createDeliveryOrder(env, request) {
    try {
        const body = await request.json();
        const {
            restaurant_id,
            customer_name,
            customer_phone,
            customer_address,
            customer_notes,
            items,
            subtotal,
            shipping_cost,
            total,
            payment_method,
            session_id,
            visitor_id,
            order_source
        } = body;

        // Validaciones
        if (!restaurant_id) {
            return createResponse({ success: false, message: 'restaurant_id is required' }, 400);
        }
        if (!customer_phone) {
            return createResponse({ success: false, message: 'customer_phone is required' }, 400);
        }
        if (!customer_address) {
            return createResponse({ success: false, message: 'customer_address is required' }, 400);
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return createResponse({ success: false, message: 'items array is required' }, 400);
        }

        const orderId = 'ord_' + crypto.randomUUID().split('-')[0];

        await env.DB.prepare(`
            INSERT INTO delivery_orders (
                id, restaurant_id, customer_name, customer_phone, customer_address,
                customer_notes, items, subtotal, shipping_cost, total,
                payment_method, session_id, visitor_id, order_source, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `).bind(
            orderId,
            restaurant_id,
            customer_name || null,
            customer_phone,
            customer_address,
            customer_notes || null,
            JSON.stringify(items),
            subtotal || 0,
            shipping_cost || 0,
            total || subtotal || 0,
            payment_method || null,
            session_id || null,
            visitor_id || null,
            order_source || 'whatsapp'
        ).run();

        console.log(`[Delivery] ✅ Order created: ${orderId}`);

        return createResponse({
            success: true,
            order_id: orderId,
            message: 'Order created successfully'
        });

    } catch (error) {
        console.error('[Delivery] Error createDeliveryOrder:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// GET DELIVERY ORDERS (Admin)
// ============================================
async function getDeliveryOrders(env, restaurantId, options = {}) {
    try {
        const { status, limit = 50, offset = 0 } = options;

        let query = `
            SELECT * FROM delivery_orders
            WHERE restaurant_id = ?
        `;
        const params = [restaurantId];

        if (status && status !== 'all') {
            query += ` AND status = ?`;
            params.push(status);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const orders = await env.DB.prepare(query).bind(...params).all();

        // Parsear items JSON
        const parsedOrders = (orders.results || []).map(order => ({
            ...order,
            items: JSON.parse(order.items || '[]')
        }));

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM delivery_orders WHERE restaurant_id = ?`;
        const countParams = [restaurantId];
        if (status && status !== 'all') {
            countQuery += ` AND status = ?`;
            countParams.push(status);
        }
        const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

        return createResponse({
            success: true,
            orders: parsedOrders,
            pagination: {
                total: countResult?.total || 0,
                limit,
                offset
            }
        });

    } catch (error) {
        console.error('[Delivery] Error getDeliveryOrders:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// UPDATE ORDER STATUS (Admin)
// ============================================
async function updateOrderStatus(env, request, orderId) {
    try {
        const body = await request.json();
        const { status } = body;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return createResponse({ success: false, message: 'Invalid status' }, 400);
        }

        // Build update query with timestamp for specific statuses
        let updateFields = 'status = ?, updated_at = CURRENT_TIMESTAMP';
        const params = [status];

        if (status === 'confirmed') {
            updateFields += ', confirmed_at = CURRENT_TIMESTAMP';
        } else if (status === 'delivered') {
            updateFields += ', delivered_at = CURRENT_TIMESTAMP';
        }

        params.push(orderId);

        await env.DB.prepare(`
            UPDATE delivery_orders SET ${updateFields} WHERE id = ?
        `).bind(...params).run();

        console.log(`[Delivery] ✅ Order ${orderId} status updated to: ${status}`);

        return createResponse({
            success: true,
            message: `Order status updated to ${status}`
        });

    } catch (error) {
        console.error('[Delivery] Error updateOrderStatus:', error);
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

function createResponse(data, status = 200) {
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
