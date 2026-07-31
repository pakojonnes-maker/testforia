// workerGuideStore.js — Guidebook Store (guest-facing order intake)
// ============================================
// Endpoint: POST /guide/store/orders
// Público (sin auth) — el CRUD del catálogo vive en workerGuideAdmin.js.
//
// El pedido se guarda en D1 ANTES de abrir WhatsApp: es la pieza que falta hoy
// en todo el guidebook para poder auditar una venta (CTAButton.tsx abre un
// enlace ciego y no deja rastro). Aquí sí queda un registro con producto,
// cantidad y precio recalculado en servidor — nunca confiamos en un precio
// que mande el cliente.
// ============================================

import { hitRateLimit } from './workerAuthentication.js';

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

function generateId(prefix = 'sord') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

// Un pedido con demasiadas líneas o cantidades absurdas es o un guest confundido
// o un abuso del endpoint (no hay pasarela de pago que lo frene antes). Límite
// generoso para un pedido real de tienda de alojamiento, no para un carrito de
// e-commerce.
const MAX_ORDER_LINES = 10;
const MAX_ITEM_QUANTITY = 20;
const ORDER_RATE_LIMIT = { limit: 8, windowSeconds: 3600 }; // 8 pedidos/hora por visitante

function buildWhatsAppUrl(phone, message) {
    if (!phone) return null;
    const cleaned = String(phone).replace(/[^+\d]/g, '');
    if (!cleaned) return null;
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export async function handleGuideStoreRequests(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/guide/store/orders' || request.method !== 'POST') return null;

    let body;
    try {
        body = await request.json();
    } catch {
        return errorResponse('Invalid JSON body');
    }

    const { apartmentId, items, sessionId = null, visitorId = null, guestNote = null } = body;

    if (!apartmentId) return errorResponse('apartmentId is required');
    if (!Array.isArray(items) || items.length === 0) return errorResponse('items is required');
    if (items.length > MAX_ORDER_LINES) return errorResponse(`Too many order lines (max ${MAX_ORDER_LINES})`);

    for (const line of items) {
        if (!line?.itemId || typeof line.itemId !== 'string') return errorResponse('Each item requires itemId');
        const qty = Number(line.quantity);
        if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QUANTITY) {
            return errorResponse(`Invalid quantity for item ${line.itemId}`);
        }
    }

    if (env.RATE_LIMIT_KV && visitorId) {
        const { allowed, retryAfter } = await hitRateLimit(env, `store_order:${visitorId}`, ORDER_RATE_LIMIT);
        if (!allowed) {
            return errorResponse(`Too many orders, try again in ${retryAfter}s`, 429);
        }
    }

    const apartment = await env.DB.prepare(
        'SELECT id, name, contact_whatsapp FROM guide_apartments WHERE id = ? AND is_active = TRUE'
    ).bind(apartmentId).first();
    if (!apartment) return errorResponse('Apartment not found', 404);

    // Solo ítems activos de ESTE apartamento (host) o del catálogo global (platform) —
    // un host item de OTRO apartamento no debe poder pedirse desde aquí.
    const itemIds = items.map(i => i.itemId);
    const placeholders = itemIds.map(() => '?').join(',');
    const dbItems = await env.DB.prepare(`
        SELECT id, owner_type, price_amount, price_currency, contact_whatsapp
        FROM guide_store_items
        WHERE id IN (${placeholders}) AND is_active = TRUE
            AND (apartment_id = ? OR owner_type = 'platform')
    `).bind(...itemIds, apartmentId).all();

    const itemsById = new Map((dbItems.results || []).map(i => [i.id, i]));
    for (const line of items) {
        if (!itemsById.has(line.itemId)) return errorResponse(`Item not available: ${line.itemId}`, 404);
    }

    // Nombres traducidos ES para congelarlos en la línea del pedido (si el manager
    // renombra o borra el ítem después, el pedido histórico sigue siendo legible).
    const namesResult = await env.DB.prepare(`
        SELECT entity_id, value FROM translations
        WHERE entity_type = 'store_item' AND field = 'name' AND language_code = 'es'
            AND entity_id IN (${placeholders})
    `).bind(...itemIds).all();
    const namesById = new Map((namesResult.results || []).map(r => [r.entity_id, r.value]));

    // Un pedido solo puede tener UN destinatario de WhatsApp. Si el carrito mezcla
    // productos del anfitrión y de la plataforma (destinos distintos), se separa en
    // varios pedidos — cada uno con su propio hilo de WhatsApp.
    const groups = new Map(); // contactNumber -> { lines: [], ownerType }
    for (const line of items) {
        const item = itemsById.get(line.itemId);
        const contact = item.contact_whatsapp
            || (item.owner_type === 'host' ? apartment.contact_whatsapp : env.PLATFORM_WHATSAPP)
            || null;
        const key = contact || `__no_contact_${item.owner_type}`;
        if (!groups.has(key)) groups.set(key, { contact, ownerType: item.owner_type, lines: [] });
        groups.get(key).lines.push({ line, item });
    }

    const now = new Date().toISOString();
    const orders = [];
    const statements = [];

    for (const [, group] of groups) {
        const orderId = generateId();
        let total = 0;
        const orderLines = group.lines.map(({ line, item }) => {
            const unitPrice = item.price_amount ?? null;
            if (unitPrice != null) total += unitPrice * line.quantity;
            return {
                id: generateId('sordi'),
                itemId: item.id,
                name: namesById.get(item.id) || item.id,
                quantity: line.quantity,
                unitPrice
            };
        });

        statements.push(env.DB.prepare(`
            INSERT INTO guide_store_orders (id, apartment_id, session_id, visitor_id, status, total_amount, currency, guest_note, created_at, modified_at)
            VALUES (?, ?, ?, ?, 'requested', ?, 'EUR', ?, ?, ?)
        `).bind(orderId, apartmentId, sessionId, visitorId, total || null, guestNote, now, now));

        for (const ol of orderLines) {
            statements.push(env.DB.prepare(`
                INSERT INTO guide_store_order_items (id, order_id, item_id, item_name_es, quantity, unit_price)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(ol.id, orderId, ol.itemId, ol.name, ol.quantity, ol.unitPrice));
        }

        const linesText = orderLines.map(ol => `${ol.quantity}x ${ol.name}`).join(', ');
        const shortRef = orderId.slice(-6).toUpperCase();
        const message = `Hola, escribo desde ${apartment.name}. Quiero pedir: ${linesText}. (Pedido #${shortRef})`;

        orders.push({
            orderId,
            ownerType: group.ownerType,
            whatsappUrl: buildWhatsAppUrl(group.contact, message)
        });
    }

    if (statements.length > 0) {
        await env.DB.batch(statements);
    }

    return jsonResponse({ success: true, orders });
}
