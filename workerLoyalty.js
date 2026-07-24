// workerLoyalty.js — Sistema de lealtad: tarjeta de sellos por visita.
// El sello se otorga solo cuando el camarero valida con el PIN de canje
// (restaurant_details.redeem_pin, reutilizado del flujo de ofertas). Al
// completar la tarjeta se genera un magic_link_token y el canje reutiliza
// el mismo patrón público /api/r/:token que ya usa RedemptionPage.
export async function handleLoyaltyRequests(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "GET" && pathname === "/api/loyalty/card") {
        return getLoyaltyCard(request, env);
    }
    if (method === "POST" && pathname === "/api/loyalty/stamp") {
        return addLoyaltyStamp(request, env);
    }
    if (method === "GET" && pathname.match(/^\/api\/restaurants\/[^/]+\/loyalty-program$/)) {
        return getLoyaltyProgramAdmin(request, env);
    }
    if (method === "PUT" && pathname.match(/^\/api\/restaurants\/[^/]+\/loyalty-program$/)) {
        return saveLoyaltyProgramAdmin(request, env);
    }
    if (method === "GET" && pathname.match(/^\/api\/restaurants\/[^/]+\/loyalty-cards$/)) {
        return listLoyaltyCardsAdmin(request, env);
    }
    if (method === "POST" && pathname.match(/^\/api\/loyalty\/cards\/[^/]+\/admin-redeem$/)) {
        return adminRedeemCard(request, env);
    }
    if (method === "GET" && pathname.match(/^\/api\/r\/[a-zA-Z0-9]+$/)) {
        return getCardByToken(request, env, pathname.split('/').pop());
    }
    if (method === "POST" && pathname.match(/^\/api\/r\/[a-zA-Z0-9]+\/redeem$/)) {
        const token = pathname.split('/')[3];
        return redeemCardByToken(request, env, token);
    }
    return null;
}

function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
    });
}

function publicProgram(program) {
    if (!program || !program.is_active) return null;
    return {
        stamps_required: program.stamps_required,
        reward_name: program.reward_name,
        reward_description: program.reward_description,
        reward_image_url: program.reward_image_url,
        stamp_icon: program.stamp_icon || '⭐',
        card_color: program.card_color,
        terms: program.terms
    };
}

function publicCard(card) {
    if (!card) return null;
    return {
        id: card.id,
        stamps: card.stamps,
        status: card.status,
        magic_link_token: card.status === 'completed' ? card.magic_link_token : undefined,
        expires_at: card.expires_at,
        completed_at: card.completed_at
    };
}

// ============================================
// RATE LIMITING (PIN brute-force protection)
// ============================================
async function checkPinRateLimit(env, restaurantId, ip, limit = 15, windowSeconds = 900) {
    if (!env.RATE_LIMIT_KV) return { allowed: true };
    const key = `ratelimit:stamp-pin:${restaurantId}:${ip}`;
    const now = Math.floor(Date.now() / 1000);
    try {
        const data = await env.RATE_LIMIT_KV.get(key, { type: 'json' });
        if (data && data.windowStart > now - windowSeconds) {
            if (data.count >= limit) return { allowed: false };
            await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: data.count + 1, windowStart: data.windowStart }), { expirationTtl: windowSeconds });
            return { allowed: true };
        }
        await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: windowSeconds });
        return { allowed: true };
    } catch (e) {
        return { allowed: true };
    }
}

// ============================================
// PUBLIC: GET /api/loyalty/card
// ============================================
async function getLoyaltyCard(request, env) {
    const url = new URL(request.url);
    const restaurantId = url.searchParams.get('restaurant_id');
    const visitorId = request.headers.get('x-visitor-id') || url.searchParams.get('visitor_id');
    if (!restaurantId) return createResponse({ success: false, message: 'restaurant_id requerido' }, 400);

    try {
        const program = await env.DB.prepare(
            'SELECT * FROM loyalty_programs WHERE restaurant_id = ?'
        ).bind(restaurantId).first();

        let card = null;
        if (visitorId && program?.is_active) {
            card = await env.DB.prepare(`
                SELECT * FROM loyalty_cards
                WHERE restaurant_id = ? AND visitor_id = ? AND status IN ('active', 'completed')
                ORDER BY created_at DESC LIMIT 1
            `).bind(restaurantId, visitorId).first();
        }

        return createResponse({
            success: true,
            program: publicProgram(program),
            card: publicCard(card)
        });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// PUBLIC: POST /api/loyalty/stamp
// ============================================
async function addLoyaltyStamp(request, env) {
    try {
        const { restaurant_id, visitor_id, pin, session_id } = await request.json();
        if (!restaurant_id || !visitor_id) {
            return createResponse({ success: false, message: 'restaurant_id y visitor_id requeridos' }, 400);
        }

        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rateCheck = await checkPinRateLimit(env, restaurant_id, clientIp);
        if (!rateCheck.allowed) {
            return createResponse({ success: false, message: 'Demasiados intentos. Espera unos minutos.' }, 429);
        }

        const program = await env.DB.prepare(
            'SELECT * FROM loyalty_programs WHERE restaurant_id = ?'
        ).bind(restaurant_id).first();
        if (!program || !program.is_active) {
            return createResponse({ success: false, message: 'Programa de lealtad no activo' }, 404);
        }

        const details = await env.DB.prepare(
            'SELECT redeem_pin FROM restaurant_details WHERE restaurant_id = ?'
        ).bind(restaurant_id).first();
        if (!details?.redeem_pin) {
            return createResponse({ success: false, message: 'El restaurante no ha configurado el PIN de validación' }, 400);
        }
        if (!pin || pin !== details.redeem_pin) {
            return createResponse({ success: false, message: 'PIN incorrecto', requires_pin: true }, 403);
        }

        let card = await env.DB.prepare(`
            SELECT * FROM loyalty_cards
            WHERE restaurant_id = ? AND visitor_id = ? AND status IN ('active', 'completed')
            ORDER BY created_at DESC LIMIT 1
        `).bind(restaurant_id, visitor_id).first();

        if (card && card.status === 'completed') {
            return createResponse({
                success: true,
                already_completed: true,
                message: 'Ya completaste esta tarjeta, canjea tu premio.',
                card: publicCard(card)
            });
        }

        if (!card) {
            const cardId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO loyalty_cards (id, restaurant_id, visitor_id, stamps, status)
                VALUES (?, ?, ?, 0, 'active')
            `).bind(cardId, restaurant_id, visitor_id).run();
            card = { id: cardId, restaurant_id, visitor_id, stamps: 0, status: 'active' };
        }

        const newStamps = card.stamps + 1;
        const justCompleted = newStamps >= program.stamps_required;

        await env.DB.prepare(`
            INSERT INTO loyalty_stamps (id, card_id, restaurant_id, visitor_id, session_id)
            VALUES (?, ?, ?, ?, ?)
        `).bind(crypto.randomUUID(), card.id, restaurant_id, visitor_id, session_id || null).run();

        let magicToken = null;
        let expiresAt = null;
        if (justCompleted) {
            magicToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
            expiresAt = program.expiry_days
                ? new Date(Date.now() + program.expiry_days * 24 * 60 * 60 * 1000).toISOString()
                : null;
            await env.DB.prepare(`
                UPDATE loyalty_cards
                SET stamps = ?, status = 'completed', magic_link_token = ?, expires_at = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(newStamps, magicToken, expiresAt, card.id).run();
        } else {
            await env.DB.prepare(`
                UPDATE loyalty_cards SET stamps = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).bind(newStamps, card.id).run();
        }

        const restaurant = await env.DB.prepare('SELECT slug FROM restaurants WHERE id = ?').bind(restaurant_id).first();
        const magicLink = justCompleted && restaurant?.slug
            ? `https://menu.visualtastes.com/${restaurant.slug}/oferta/${magicToken}`
            : null;

        return createResponse({
            success: true,
            just_completed: justCompleted,
            magic_link: magicLink,
            card: publicCard({ ...card, stamps: newStamps, status: justCompleted ? 'completed' : 'active', magic_link_token: magicToken, expires_at: expiresAt })
        });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// ADMIN: loyalty program config (protegido por auth por defecto en worker.js)
// ============================================
async function getLoyaltyProgramAdmin(request, env) {
    const restaurantId = new URL(request.url).pathname.split('/')[3];
    try {
        const program = await env.DB.prepare(
            'SELECT * FROM loyalty_programs WHERE restaurant_id = ?'
        ).bind(restaurantId).first();
        return createResponse({ success: true, program: program || null });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function saveLoyaltyProgramAdmin(request, env) {
    const restaurantId = new URL(request.url).pathname.split('/')[3];
    try {
        const data = await request.json();
        const {
            is_active, stamps_required, reward_name, reward_description,
            reward_image_url, stamp_icon, card_color, expiry_days, terms
        } = data;

        await env.DB.prepare(`
            INSERT INTO loyalty_programs (
                restaurant_id, is_active, stamps_required, reward_name, reward_description,
                reward_image_url, stamp_icon, card_color, expiry_days, terms, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(restaurant_id) DO UPDATE SET
                is_active = excluded.is_active,
                stamps_required = excluded.stamps_required,
                reward_name = excluded.reward_name,
                reward_description = excluded.reward_description,
                reward_image_url = excluded.reward_image_url,
                stamp_icon = excluded.stamp_icon,
                card_color = excluded.card_color,
                expiry_days = excluded.expiry_days,
                terms = excluded.terms,
                updated_at = CURRENT_TIMESTAMP
        `).bind(
            restaurantId,
            is_active ? 1 : 0,
            stamps_required || 8,
            reward_name ?? null,
            reward_description ?? null,
            reward_image_url ?? null,
            stamp_icon || '⭐',
            card_color ?? null,
            expiry_days ?? null,
            terms ?? null
        ).run();

        return createResponse({ success: true, message: 'Programa guardado' });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function listLoyaltyCardsAdmin(request, env) {
    const restaurantId = new URL(request.url).pathname.split('/')[3];
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    try {
        let whereClause = 'WHERE restaurant_id = ?';
        const bindings = [restaurantId];
        if (statusFilter && ['active', 'completed', 'redeemed', 'expired'].includes(statusFilter)) {
            whereClause += ' AND status = ?';
            bindings.push(statusFilter);
        }
        const cards = await env.DB.prepare(`
            SELECT id, visitor_id, stamps, status, created_at, completed_at, redeemed_at, expires_at
            FROM loyalty_cards ${whereClause}
            ORDER BY created_at DESC LIMIT ? OFFSET ?
        `).bind(...bindings, limit, offset).all();

        const counts = await env.DB.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END) as redeemed
            FROM loyalty_cards WHERE restaurant_id = ?
        `).bind(restaurantId).first();

        return createResponse({
            success: true,
            cards: cards.results || [],
            counts: {
                total: counts?.total || 0,
                active: counts?.active || 0,
                completed: counts?.completed || 0,
                redeemed: counts?.redeemed || 0
            }
        });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function adminRedeemCard(request, env) {
    const cardId = new URL(request.url).pathname.split('/')[4];
    try {
        const card = await env.DB.prepare('SELECT id, status FROM loyalty_cards WHERE id = ?').bind(cardId).first();
        if (!card) return createResponse({ success: false, message: 'Tarjeta no encontrada' }, 404);
        if (card.status !== 'completed') return createResponse({ success: false, message: 'La tarjeta no está completada' }, 400);
        const redeemedAt = new Date().toISOString();
        await env.DB.prepare(
            "UPDATE loyalty_cards SET status = 'redeemed', redeemed_at = ? WHERE id = ?"
        ).bind(redeemedAt, cardId).run();
        return createResponse({ success: true, redeemed_at: redeemedAt });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

// ============================================
// PUBLIC: magic link redemption (reutilizado por RedemptionPage)
// ============================================
async function getCardByToken(request, env, token) {
    try {
        const card = await env.DB.prepare(`
            SELECT
                lc.id as card_id, lc.status, lc.expires_at, lc.created_at, lc.redeemed_at, lc.visitor_id,
                lp.reward_name, lp.reward_description, lp.reward_image_url,
                r.id as restaurant_id, r.name as restaurant_name, r.slug as restaurant_slug, r.logo_url as restaurant_logo
            FROM loyalty_cards lc
            JOIN loyalty_programs lp ON lc.restaurant_id = lp.restaurant_id
            JOIN restaurants r ON lc.restaurant_id = r.id
            WHERE lc.magic_link_token = ?
        `).bind(token).first();

        if (!card) return createResponse({ success: false, message: 'Oferta no encontrada' }, 404);

        const isExpired = card.expires_at && new Date(card.expires_at) < new Date();
        const isRedeemed = card.status === 'redeemed';

        let isReturningVisitor = false;
        if (card.visitor_id) {
            const previous = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM loyalty_cards
                WHERE visitor_id = ? AND id != ? AND restaurant_id = ? AND status = 'redeemed'
            `).bind(card.visitor_id, card.card_id, card.restaurant_id).first();
            isReturningVisitor = (previous?.count || 0) > 0;
        }

        const pinCheck = await env.DB.prepare(
            'SELECT redeem_pin FROM restaurant_details WHERE restaurant_id = ?'
        ).bind(card.restaurant_id).first();

        return createResponse({
            success: true,
            claim: {
                id: card.card_id,
                status: isExpired ? 'expired' : (isRedeemed ? 'redeemed' : 'active'),
                is_valid: !isExpired && !isRedeemed,
                expires_at: card.expires_at,
                created_at: card.created_at,
                redeemed_at: card.redeemed_at || null,
                validation_code: token.toUpperCase().substring(0, 8)
            },
            campaign: {
                id: card.restaurant_id,
                name: 'Tarjeta de fidelidad',
                type: 'loyalty',
                title: card.reward_name,
                description: card.reward_description,
                image_url: card.reward_image_url
            },
            reward: {
                id: card.card_id,
                name: card.reward_name,
                description: card.reward_description,
                image_url: card.reward_image_url
            },
            restaurant: {
                id: card.restaurant_id,
                name: card.restaurant_name,
                slug: card.restaurant_slug,
                logo_url: card.restaurant_logo
            },
            requires_pin: !!pinCheck?.redeem_pin,
            is_returning_visitor: isReturningVisitor
        });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function redeemCardByToken(request, env, token) {
    try {
        const body = await request.json().catch(() => ({}));
        const card = await env.DB.prepare(`
            SELECT id, status, expires_at, restaurant_id FROM loyalty_cards WHERE magic_link_token = ?
        `).bind(token).first();
        if (!card) return createResponse({ success: false, message: 'Tarjeta no encontrada' }, 404);
        if (card.status === 'redeemed') {
            return createResponse({ success: false, message: 'Ya canjeado', already_redeemed: true }, 400);
        }
        const isExpired = card.expires_at && new Date(card.expires_at) < new Date();
        if (isExpired) {
            return createResponse({ success: false, message: 'Oferta expirada', is_expired: true }, 400);
        }

        const details = await env.DB.prepare(
            'SELECT redeem_pin FROM restaurant_details WHERE restaurant_id = ?'
        ).bind(card.restaurant_id).first();
        if (details?.redeem_pin) {
            if (!body.pin || body.pin !== details.redeem_pin) {
                return createResponse({ success: false, message: 'PIN incorrecto', requires_pin: true }, 403);
            }
        }

        const redeemedAt = new Date().toISOString();
        await env.DB.prepare(
            "UPDATE loyalty_cards SET status = 'redeemed', redeemed_at = ? WHERE id = ?"
        ).bind(redeemedAt, card.id).run();

        return createResponse({ success: true, message: 'Canjeado correctamente', redeemed_at: redeemedAt });
    } catch (error) {
        return createResponse({ success: false, message: error.message }, 500);
    }
}
