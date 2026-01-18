import { WebPushCrypto } from './workerCrypto.js';

export async function handleMarketingRequests(request, env) {
    // ... (rest of file)

    async function sendWebPushEncrypted(subscription, encryptedData, vapidKeys) {
        const { endpoint } = subscription;

        // 1. Generate VAPID Token (JWT)
        const url = new URL(endpoint);
        const audience = `${url.protocol}//${url.hostname}`;
        const token = await signVapidToken(audience, vapidKeys.publicKey, vapidKeys.privateKey);

        // 2. Construct Headers (RFC 8188 / Web Push - aes128gcm)
        const headers = {
            'TTL': '86400', // 24 hours
            'Authorization': `vapid t=${token}, k=${vapidKeys.publicKey}`,
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm'
        };

        // 3. Construct RFC 8188 Encrypted Body
        // Format: salt (16) + rs (4) + idlen (1) + keyid (65) + ciphertext
        const binaryBody = new Uint8Array(16 + 4 + 1 + 65 + encryptedData.body.byteLength);
        let offset = 0;

        // Salt (16 bytes)
        // encryptedData.salt is now Uint8Array
        binaryBody.set(encryptedData.salt, 0); offset += 16;

        // Record Size (4 bytes) - 4096 is standard
        const rs = 4096;
        new DataView(binaryBody.buffer).setUint32(offset, rs, false); offset += 4;

        // Key ID Length (1 byte) = 65 for P-256 Uncompressed
        binaryBody[offset] = 65; offset += 1;

        // Key ID (Local Public Key - 65 bytes)
        // encryptedData.localPublicKey is now ArrayBuffer
        const keyBytes = new Uint8Array(encryptedData.localPublicKey);
        binaryBody.set(keyBytes, offset); offset += 65;

        // Ciphertext
        binaryBody.set(new Uint8Array(encryptedData.body), offset);

        // 4. Send Request
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: binaryBody
        });

        if (!response.ok) {
            throw { status: response.status, statusText: response.statusText, body: await response.text() };
        }
    }

    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    function createResponse(body, status = 200) {
        return new Response(JSON.stringify(body), {
            status,
            headers: {
                "Content-Type": "application/json",
                ...corsHeaders
            }
        });
    }

    if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    // ============================================
    // RATE LIMITING HELPER
    // ============================================
    async function checkRateLimit(ip, env, limit = 5, windowSeconds = 60) {
        const key = `ratelimit:leads:${ip}`;
        const now = Math.floor(Date.now() / 1000);

        // Try KV first (preferred for rate limiting)
        if (env.RATE_LIMIT_KV) {
            try {
                const data = await env.RATE_LIMIT_KV.get(key, { type: 'json' });
                if (data && data.windowStart > now - windowSeconds) {
                    if (data.count >= limit) {
                        return { allowed: false, remaining: 0, resetIn: windowSeconds - (now - data.windowStart) };
                    }
                    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: data.count + 1, windowStart: data.windowStart }), { expirationTtl: windowSeconds });
                    return { allowed: true, remaining: limit - data.count - 1 };
                } else {
                    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, windowStart: now }), { expirationTtl: windowSeconds });
                    return { allowed: true, remaining: limit - 1 };
                }
            } catch (e) {
                console.warn('[RateLimit] KV error, allowing request:', e.message);
                return { allowed: true, remaining: limit }; // Fail open
            }
        }

        // Fallback: simple in-memory (per-isolate, not persistent - only basic protection)
        console.warn('[RateLimit] No KV binding, rate limiting disabled');
        return { allowed: true, remaining: limit };
    }

    // ============================================
    // LEADS ENDPOINTS
    // ============================================

    if (method === "POST" && pathname === "/api/leads") {
        try {
            // Rate limiting: 5 requests per IP per minute
            const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0] || 'unknown';
            const rateCheck = await checkRateLimit(clientIP, env, 5, 60);

            if (!rateCheck.allowed) {
                console.log(`[RateLimit] Blocked IP ${clientIP} on /api/leads`);
                return createResponse({
                    success: false,
                    message: "Too many requests. Please try again later.",
                    retry_after: rateCheck.resetIn
                }, 429);
            }

            const data = await request.json();
            const { restaurant_id, campaign_id, type, contact_value, name, consent_given, source, metadata, session_id, visitor_id, save_method } = data;

            if (!restaurant_id || !type || !contact_value) {
                return createResponse({ success: false, message: "Missing required fields" }, 400);
            }

            if (!['email', 'phone'].includes(type)) {
                return createResponse({ success: false, message: "Invalid type" }, 400);
            }

            const leadId = crypto.randomUUID();

            // 1. Save the lead
            await env.DB.prepare(
                `INSERT INTO marketing_leads (id, restaurant_id, campaign_id, type, contact_value, source, consent_given, metadata)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                leadId,
                restaurant_id,
                campaign_id || null,
                type,
                contact_value,
                source || 'welcome_modal',
                consent_given ? 1 : 0,
                metadata ? JSON.stringify(metadata) : null
            ).run();

            // 2. Create a claim with magic link (for WhatsApp save)
            let claimData = null;
            if (campaign_id) {
                const claimId = crypto.randomUUID();
                const magicToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
                const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(); // 20 days

                // Ensure we have a session_id (required by DB schema)
                const claimSessionId = session_id || `anon_${crypto.randomUUID().substring(0, 8)}`;

                await env.DB.prepare(`
                    INSERT INTO campaign_claims (id, restaurant_id, campaign_id, session_id, customer_contact, magic_link_token, status, expires_at, visitor_id, save_method, source, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                    claimId,
                    restaurant_id,
                    campaign_id,
                    claimSessionId,
                    contact_value,
                    magicToken,
                    expiresAt,
                    visitor_id || null,
                    save_method || 'direct',
                    source || 'welcome_modal'
                ).run();


                // 3. Track the event
                const eventId = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO campaign_events (id, campaign_id, claim_id, visitor_id, session_id, restaurant_id, event_type, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind(
                    eventId,
                    campaign_id,
                    claimId,
                    visitor_id || null,
                    session_id || null,
                    restaurant_id,
                    type === 'phone' ? 'phone_captured' : 'email_captured',
                    JSON.stringify({ save_method: save_method || 'direct', source: source || 'welcome_modal' })
                ).run();

                // Fetch restaurant slug for magic link URL
                const restaurant = await env.DB.prepare(`SELECT slug FROM restaurants WHERE id = ?`).bind(restaurant_id).first();
                const baseUrl = 'https://menu.visualtastes.com';
                const restaurantSlug = restaurant?.slug || 'oferta';

                claimData = {
                    claim_id: claimId,
                    magic_link: `${baseUrl}/${restaurantSlug}/oferta/${magicToken}`,
                    magic_token: magicToken,
                    expires_at: expiresAt,
                    expires_in_days: 20,
                    restaurant_slug: restaurantSlug
                };
            }


            return createResponse({
                success: true,
                message: "Lead saved successfully",
                lead_id: leadId,
                ...claimData
            });

        } catch (error) {
            console.error("Error saving lead:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // ============================================
    // LOYALTY / SCRATCH WIN ENDPOINTS
    // ============================================

    // Claim a prize from Scratch & Win
    if (method === "POST" && pathname === "/api/loyalty/claim") {
        try {
            const data = await request.json();
            const { session_id, reward_id, campaign_id, contact, restaurant_id, visitor_id } = data;

            if (!reward_id || !campaign_id || !contact || !restaurant_id) {
                return createResponse({ success: false, message: "Missing required fields" }, 400);
            }

            // Verify reward exists and is active
            const reward = await env.DB.prepare(`
                SELECT cr.*, mc.name as campaign_name, mc.content as campaign_content
                FROM campaign_rewards cr
                JOIN marketing_campaigns mc ON cr.campaign_id = mc.id
                WHERE cr.id = ? AND cr.is_active = 1
            `).bind(reward_id).first();

            if (!reward) {
                return createResponse({ success: false, message: "Reward not found or inactive" }, 404);
            }

            // Check if already claimed in this session (prevent double claims)
            const existingClaim = await env.DB.prepare(`
                SELECT id FROM campaign_claims 
                WHERE session_id = ? AND reward_id = ? AND status != 'expired'
            `).bind(session_id || 'anonymous', reward_id).first();

            if (existingClaim) {
                return createResponse({ success: false, message: "Already claimed", already_claimed: true }, 400);
            }

            // Create claim
            const claimId = crypto.randomUUID();
            const magicToken = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
            const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
            const claimSessionId = session_id || `anon_${crypto.randomUUID().substring(0, 8)}`;

            await env.DB.prepare(`
                INSERT INTO campaign_claims (id, restaurant_id, campaign_id, reward_id, session_id, customer_contact, magic_link_token, status, expires_at, visitor_id, save_method, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, 'whatsapp', 'scratch_win', CURRENT_TIMESTAMP)
            `).bind(
                claimId,
                restaurant_id,
                campaign_id,
                reward_id,
                claimSessionId,
                contact,
                magicToken,
                expiresAt,
                visitor_id || null
            ).run();

            // Track event
            await env.DB.prepare(`
                INSERT INTO campaign_events (id, campaign_id, claim_id, visitor_id, session_id, restaurant_id, event_type, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'prize_claimed', ?, CURRENT_TIMESTAMP)
            `).bind(
                crypto.randomUUID(),
                campaign_id,
                claimId,
                visitor_id || null,
                claimSessionId,
                restaurant_id,
                JSON.stringify({ reward_id, reward_name: reward.name, contact_type: contact.includes('@') ? 'email' : 'phone' })
            ).run();

            // Decrement reward quantity if max_quantity is set
            if (reward.max_quantity) {
                await env.DB.prepare(`
                    UPDATE campaign_rewards 
                    SET claimed_count = COALESCE(claimed_count, 0) + 1
                    WHERE id = ?
                `).bind(reward_id).run();
            }

            // Construct magic link
            const restaurant = await env.DB.prepare(`SELECT slug FROM restaurants WHERE id = ?`).bind(restaurant_id).first();
            const restaurantSlug = restaurant?.slug || 'oferta';
            const magicLink = `https://menu.visualtastes.com/${restaurantSlug}/oferta/${magicToken}`;

            return createResponse({
                success: true,
                message: "Prize claimed successfully",
                claim_id: claimId,
                magic_link: magicLink,
                magic_token: magicToken,
                expires_at: expiresAt,
                expires_in_days: 20,
                reward: {
                    id: reward.id,
                    name: reward.name,
                    description: reward.description
                }
            });

        } catch (error) {
            console.error("Error claiming prize:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // ============================================
    // CAMPAIGNS ENDPOINTS (Admin)
    // ============================================


    // Get campaigns
    if (method === "GET" && pathname.match(/^\/api\/restaurants\/[^/]+\/campaigns$/)) {
        const restaurantId = pathname.split('/')[3];
        try {
            const campaigns = await env.DB.prepare(`
                SELECT 
                    mc.*,
                    (SELECT COUNT(*) FROM campaign_claims WHERE campaign_id = mc.id) as total_claims,
                    (SELECT COUNT(*) FROM campaign_claims WHERE campaign_id = mc.id AND status = 'redeemed') as redeemed_count,
                    (SELECT COUNT(*) FROM campaign_claims WHERE campaign_id = mc.id AND opened_at IS NOT NULL) as opened_count
                FROM marketing_campaigns mc 
                WHERE restaurant_id = ? 
                ORDER BY created_at DESC
            `).bind(restaurantId).all();

            const results = (campaigns.results || []).map(c => ({
                ...c,
                content: c.content ? JSON.parse(c.content) : {},
                settings: c.settings ? JSON.parse(c.settings) : {},
                is_active: !!c.is_active,
                stats: {
                    leads: c.total_claims || 0,
                    redeemed: c.redeemed_count || 0,
                    opened: c.opened_count || 0
                }
            }));

            return createResponse({ success: true, campaigns: results });

        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Create campaign
    if (method === "POST" && pathname === "/api/campaigns") {
        try {
            const data = await request.json();
            const { restaurant_id, name, type, content, settings, start_date, end_date } = data;

            const id = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO marketing_campaigns (id, restaurant_id, name, type, is_active, content, settings, start_date, end_date)
                 VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`
            ).bind(
                id,
                restaurant_id,
                name,
                type || 'welcome_modal',
                JSON.stringify(content || {}),
                JSON.stringify(settings || {}),
                start_date || null,
                end_date || null
            ).run();

            return createResponse({ success: true, id, message: "Campaign created" });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Update campaign
    if (method === "PUT" && pathname.match(/^\/api\/campaigns\/[^/]+$/)) {
        const id = pathname.split('/').pop();
        try {
            const data = await request.json();
            await env.DB.prepare(
                `UPDATE marketing_campaigns 
                 SET name = COALESCE(?, name), 
                     content = COALESCE(?, content), 
                     settings = COALESCE(?, settings), 
                     is_active = COALESCE(?, is_active),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`
            ).bind(
                data.name,
                data.content ? JSON.stringify(data.content) : null,
                data.settings ? JSON.stringify(data.settings) : null,
                data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
                id
            ).run();

            return createResponse({ success: true, message: "Campaign updated" });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // ============================================
    // REWARDS ENDPOINTS
    // ============================================

    // Get rewards
    if (method === "GET" && pathname.match(/^\/api\/campaigns\/[^/]+\/rewards$/)) {
        const campaignId = pathname.split('/')[3];
        try {
            const rewards = await env.DB.prepare(
                `SELECT * FROM campaign_rewards WHERE campaign_id = ? AND is_active = TRUE`
            ).bind(campaignId).all();
            return createResponse({ success: true, rewards: rewards.results || [] });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Create/Update Reward
    if (method === "POST" && pathname === "/api/rewards") {
        try {
            const data = await request.json();
            const { id, campaign_id, name, description, probability, max_quantity, image_url, is_active } = data;

            // Validation
            if (!id && !campaign_id) {
                return createResponse({ success: false, message: "campaign_id is required for new rewards" }, 400);
            }
            if (!name) {
                return createResponse({ success: false, message: "name is required" }, 400);
            }

            // Convert undefined to null for D1 compatibility
            const safeDescription = description ?? null;
            const safeProbability = probability ?? 0.1;
            const safeMaxQuantity = max_quantity ?? null;
            const safeImageUrl = image_url ?? null;
            const safeIsActive = is_active !== undefined ? (is_active ? 1 : 0) : 1;

            if (id) {
                // Update
                await env.DB.prepare(`
                    UPDATE campaign_rewards 
                    SET name = ?, description = ?, probability = ?, max_quantity = ?, image_url = ?, is_active = ?
                    WHERE id = ?
                `).bind(
                    name, safeDescription, safeProbability, safeMaxQuantity, safeImageUrl, safeIsActive, id
                ).run();
                return createResponse({ success: true, message: "Reward updated" });
            } else {
                // Create
                const newId = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO campaign_rewards (id, campaign_id, name, description, probability, max_quantity, image_url, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    newId, campaign_id, name, safeDescription, safeProbability, safeMaxQuantity, safeImageUrl, safeIsActive
                ).run();
                return createResponse({ success: true, id: newId, message: "Reward created" });
            }

        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Delete Reward
    if (method === "DELETE" && pathname.match(/^\/api\/rewards\/[^/]+$/)) {
        const id = pathname.split('/').pop();
        try {
            await env.DB.prepare(`DELETE FROM campaign_rewards WHERE id = ?`).bind(id).run();
            return createResponse({ success: true, message: "Reward deleted" });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // ============================================
    // STAFF QR ENDPOINTS
    // ============================================

    // List Staff QRs
    if (method === "GET" && pathname.match(/^\/api\/restaurants\/[^/]+\/staff-qrs$/)) {
        const restaurantId = pathname.split('/')[3];
        try {
            const qrs = await env.DB.prepare(`
                SELECT qr.*, u.display_name as staff_name, rs.role
                FROM qr_codes qr
                LEFT JOIN restaurant_staff rs ON qr.assigned_staff_id = rs.user_id AND rs.restaurant_id = qr.restaurant_id
                LEFT JOIN users u ON rs.user_id = u.id
                WHERE qr.restaurant_id = ? AND qr.type = 'loyalty'
            `).bind(restaurantId).all();

            return createResponse({ success: true, qrs: qrs.results || [] });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Generate Staff QR
    if (method === "POST" && pathname === "/api/staff/assign-qr") {
        try {
            const requestData = await request.json();
            const { staff_id, restaurant_id } = requestData;

            if (!staff_id || !restaurant_id) {
                return createResponse({ success: false, message: "Missing staff_id or restaurant_id" }, 400);
            }

            const qrId = `qr_loyalty_${staff_id}_${Date.now().toString(36)}`;

            await env.DB.prepare(`
                INSERT INTO qr_codes (id, restaurant_id, type, assigned_staff_id, created_at)
                VALUES (?, ?, 'loyalty', ?, CURRENT_TIMESTAMP)
            `).bind(qrId, restaurant_id, staff_id).run();

            return createResponse({ success: true, qr_id: qrId, message: "QR generated for staff" });
        } catch (error) {
            return createResponse({ success: false, message: error.message }, 500);
        }
    }


    // ============================================
    // NOTIFICATIONS ENDPOINTS (Web Push)
    // ============================================

    // Subscribe
    if (method === "POST" && pathname === "/api/notifications/subscribe") {
        try {
            const { subscription, visitor_id, restaurant_id, user_id, device_type } = await request.json();

            if (!subscription || !subscription.endpoint) {
                return createResponse({ success: false, message: "Invalid subscription" }, 400);
            }

            const token = JSON.stringify(subscription);
            const id = crypto.randomUUID();

            await env.DB.prepare(`
                INSERT INTO notification_tokens (id, user_id, visitor_id, token, device_type, restaurant_id, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET last_used = CURRENT_TIMESTAMP, restaurant_id = ?
            `).bind(
                id,
                user_id || null,
                visitor_id || null,
                token,
                device_type || 'unknown',
                restaurant_id,
                restaurant_id
            ).run();

            return createResponse({ success: true, message: "Subscribed successfully" });
        } catch (error) {
            console.error("Subscribe Error:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Send Notification - supports both /api/notifications/send and /api/restaurants/:id/notifications/send
    const notifSendMatch = pathname.match(/^\/api\/restaurants\/([^/]+)\/notifications\/send$/);
    if (method === "POST" && (pathname === "/api/notifications/send" || notifSendMatch)) {
        try {
            const body = await request.json();
            // Extract restaurant_id from URL path if available, otherwise from body
            const restaurant_id = notifSendMatch ? notifSendMatch[1] : body.restaurant_id;
            const { title, message, url, image_url, icon, badge, color, debug } = body;

            // Fetch Restaurant Branding (logo and colors from themes)
            const restaurantQuery = await env.DB.prepare(`
                SELECT r.id, r.slug, r.logo_url,
                       t.accent_color, t.primary_color, t.secondary_color
                FROM restaurants r
                LEFT JOIN themes t ON r.theme_id = t.id
                WHERE r.id = ? OR r.slug = ?
            `).bind(restaurant_id, restaurant_id).first();

            const API_BASE = 'https://visualtasteworker.franciscotortosaestudios.workers.dev';
            const restaurantLogo = restaurantQuery?.logo_url || `${API_BASE}/media/System/icon.png`;
            const restaurantColor = restaurantQuery?.accent_color || restaurantQuery?.primary_color || '#FF6B6B';

            // Match against ID OR Slug
            let query = `
                SELECT DISTINCT nt.id, nt.token, nt.visitor_id
                FROM notification_tokens nt
                LEFT JOIN restaurants r ON r.id = ? 
                WHERE (nt.restaurant_id = ? OR nt.restaurant_id = r.slug)
                AND nt.is_active = 1
            `;

            const tokens = await env.DB.prepare(query).bind(restaurant_id, restaurant_id).all();

            if (!tokens.results || tokens.results.length === 0) {
                return createResponse({ success: true, count: 0, message: "No subscribers found for this restaurant" });
            }

            // Create Notification Record
            const notificationId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO notifications (id, restaurant_id, title, message, deep_link, image_url, status, target_type, created_at, sent_at)
                VALUES (?, ?, ?, ?, ?, ?, 'sending', 'all', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).bind(notificationId, restaurant_id, title, message, url, image_url).run();

            // 3. Send (Parallel) with Encryption
            let sentCount = 0;
            const errors = [];
            const logs = []; // Debug logs

            // Base Payload Data - Use restaurant branding as defaults
            const payloadData = {
                title,
                body: message,
                icon: icon || image_url || restaurantLogo,
                image: image_url, // Maps to BigPicture in SW
                badge: badge || restaurantLogo, // Use logo as badge too if not specified
                color: color || restaurantColor, // Use restaurant accent color
                data: { url: url || '/' }
            };

            // VAPID Keys
            const vapidKeys = {
                publicKey: env.VAPID_PUBLIC_KEY,
                privateKey: env.VAPID_PRIVATE_KEY
            };

            if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
                return createResponse({ success: false, message: "VAPID keys not configured" }, 500);
            }

            const sendPromises = tokens.results.map(async (row) => {
                const targetId = row.visitor_id || row.id;
                const stepLogs = [`Target ${targetId} (Visitor: ${row.visitor_id})`];
                try {
                    const sub = JSON.parse(row.token);

                    // A. ENCRYPT PAYLOAD (Native WebCrypto)
                    stepLogs.push("Encrypting...");
                    const encrypted = await WebPushCrypto.encrypt(sub, JSON.stringify(payloadData));
                    stepLogs.push("Encrypted OK");

                    // B. SEND TO PUSH SERVICE
                    stepLogs.push(`Sending to ${sub.endpoint.substr(0, 30)}...`);
                    await sendWebPushEncrypted(sub, encrypted, vapidKeys);
                    stepLogs.push("Sent OK");

                    // C. LOG SUCCESS
                    sentCount++;
                    await env.DB.prepare(`
                        INSERT INTO notification_targets (notification_id, user_id, visitor_id, sent, sent_at)
                        VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
                        ON CONFLICT(notification_id, visitor_id) DO UPDATE SET sent = 1, sent_at = CURRENT_TIMESTAMP
                    `).bind(notificationId, null, targetId).run();

                    logs.push({ visitor: targetId, status: "success", steps: stepLogs });

                } catch (e) {
                    console.error("Push Error for", targetId, e);
                    stepLogs.push(`ERROR: ${e.message} ${e.status || ''}`);

                    errors.push({ visitor_id: targetId, error: e.message || e.toString(), status: e.status });
                    logs.push({ visitor: targetId, status: "error", error: e.message, steps: stepLogs });

                    // Log Failure
                    await env.DB.prepare(`
                        INSERT INTO notification_targets (notification_id, user_id, visitor_id, sent, sent_at)
                        VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
                        ON CONFLICT(notification_id, visitor_id) DO NOTHING
                    `).bind(notificationId, null, targetId).run();

                    if (e.status === 410 || e.status === 404) {
                        try {
                            await env.DB.prepare("UPDATE notification_tokens SET is_active = 0 WHERE token = ?").bind(row.token).run();
                        } catch (err) { /* ignore cleanup error */ }
                    }
                }
            });

            await Promise.all(sendPromises);

            // Update Notification Status
            await env.DB.prepare("UPDATE notifications SET status = 'sent' WHERE id = ?").bind(notificationId).run();

            return createResponse({
                success: true,
                sent_count: sentCount,
                total_attempted: tokens.results.length,
                errors: errors,
                message: "Notifications processed",
                debug_info: debug ? logs : undefined // Return detailed logs
            });

        } catch (error) {
            console.error("Send Error:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }
    // ============================================
    // PUBLIC CAMPAIGN ENDPOINTS (Event Landing)
    // ============================================

    // Get public campaign by ID (for event landing page)
    if (method === "GET" && pathname.match(/^\/api\/campaigns\/[a-zA-Z0-9-]+$/)) {
        const campaignId = pathname.split('/').pop();
        try {
            const campaign = await env.DB.prepare(`
                SELECT 
                    mc.id,
                    mc.name,
                    mc.type,
                    mc.is_active,
                    mc.content,
                    mc.start_date,
                    mc.end_date,
                    r.id as restaurant_id,
                    r.name as restaurant_name,
                    r.slug as restaurant_slug,
                    r.logo_url as restaurant_logo
                FROM marketing_campaigns mc
                JOIN restaurants r ON mc.restaurant_id = r.id
                WHERE mc.id = ? AND mc.is_active = 1
            `).bind(campaignId).first();

            if (!campaign) {
                return createResponse({ success: false, message: "Campaign not found" }, 404);
            }

            // Parse content JSON
            let content = {};
            try {
                content = campaign.content ? JSON.parse(campaign.content) : {};
            } catch (e) { }

            return createResponse({
                success: true,
                campaign: {
                    id: campaign.id,
                    name: campaign.name,
                    type: campaign.type,
                    is_active: campaign.is_active,
                    content: content,
                    start_date: campaign.start_date,
                    end_date: campaign.end_date
                },
                restaurant: {
                    id: campaign.restaurant_id,
                    name: campaign.restaurant_name,
                    slug: campaign.restaurant_slug,
                    logo_url: campaign.restaurant_logo
                }
            });

        } catch (error) {
            console.error("Campaign fetch error:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // ============================================
    // MAGIC LINK ENDPOINTS (Redemption)
    // ============================================


    // Get claim by magic link token (for redemption page)
    if (method === "GET" && pathname.match(/^\/api\/r\/[a-zA-Z0-9]+$/)) {
        const token = pathname.split('/').pop();
        try {
            // Fetch claim with campaign and reward details
            const claim = await env.DB.prepare(`
                SELECT 
                    cc.id as claim_id,
                    cc.status,
                    cc.expires_at,
                    cc.created_at,
                    cc.redeemed_at,
                    cc.opened_at,
                    cc.customer_contact,
                    cc.visitor_id,
                    mc.id as campaign_id,
                    mc.name as campaign_name,
                    mc.type as campaign_type,
                    mc.content as campaign_content,
                    cr.id as reward_id,
                    cr.name as reward_name,
                    cr.description as reward_description,
                    cr.image_url as reward_image,
                    r.id as restaurant_id,
                    r.name as restaurant_name,
                    r.slug as restaurant_slug,
                    r.logo_url as restaurant_logo
                FROM campaign_claims cc
                JOIN marketing_campaigns mc ON cc.campaign_id = mc.id
                LEFT JOIN campaign_rewards cr ON cc.reward_id = cr.id
                JOIN restaurants r ON cc.restaurant_id = r.id
                WHERE cc.magic_link_token = ?
            `).bind(token).first();

            if (!claim) {
                return createResponse({ success: false, message: "Offer not found" }, 404);
            }

            // Check expiry
            const isExpired = claim.expires_at && new Date(claim.expires_at) < new Date();
            const isRedeemed = claim.status === 'redeemed';

            // Track "opened" if first time
            if (!claim.opened_at) {
                await env.DB.prepare(`
                    UPDATE campaign_claims SET opened_at = CURRENT_TIMESTAMP WHERE magic_link_token = ?
                `).bind(token).run();

                // Track event
                await env.DB.prepare(`
                    INSERT INTO campaign_events (id, campaign_id, claim_id, visitor_id, restaurant_id, event_type, created_at)
                    VALUES (?, ?, ?, ?, ?, 'opened', CURRENT_TIMESTAMP)
                `).bind(
                    crypto.randomUUID(),
                    claim.campaign_id,
                    claim.claim_id,
                    claim.visitor_id,
                    claim.restaurant_id
                ).run();
            }

            // Check visitor recurrence (has this visitor claimed before?)
            let isReturningVisitor = false;
            if (claim.visitor_id) {
                const previousClaims = await env.DB.prepare(`
                    SELECT COUNT(*) as count FROM campaign_claims 
                    WHERE visitor_id = ? AND id != ? AND restaurant_id = ?
                `).bind(claim.visitor_id, claim.claim_id, claim.restaurant_id).first();
                isReturningVisitor = (previousClaims?.count || 0) > 0;
            }

            // Parse campaign content
            let content = {};
            try {
                content = claim.campaign_content ? JSON.parse(claim.campaign_content) : {};
            } catch (e) { }

            return createResponse({
                success: true,
                claim: {
                    id: claim.claim_id,
                    status: isExpired ? 'expired' : claim.status,
                    is_valid: !isExpired && !isRedeemed,
                    expires_at: claim.expires_at,
                    created_at: claim.created_at,
                    redeemed_at: claim.redeemed_at || null,
                    validation_code: token.toUpperCase().substring(0, 8) // Short code for visual validation
                },
                campaign: {
                    id: claim.campaign_id,
                    name: claim.campaign_name,
                    type: claim.campaign_type,
                    title: content.title,
                    description: content.description,
                    image_url: content.image_url
                },
                reward: claim.reward_id ? {
                    id: claim.reward_id,
                    name: claim.reward_name,
                    description: claim.reward_description,
                    image_url: claim.reward_image
                } : null,
                restaurant: {
                    id: claim.restaurant_id,
                    name: claim.restaurant_name,
                    slug: claim.restaurant_slug,
                    logo_url: claim.restaurant_logo
                },
                is_returning_visitor: isReturningVisitor
            });

        } catch (error) {
            console.error("Magic Link Error:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    // Redeem a claim (staff validation) - supports both /api/claims/:token/redeem and /api/r/:token/redeem
    const redeemMatch = pathname.match(/^\/api\/(claims|r)\/([a-zA-Z0-9]+)\/redeem$/);
    if (method === "POST" && redeemMatch) {
        const token = redeemMatch[2];
        try {
            // Verify claim exists and is valid
            const claim = await env.DB.prepare(`
                SELECT id, status, expires_at, campaign_id, visitor_id, restaurant_id
                FROM campaign_claims WHERE magic_link_token = ?
            `).bind(token).first();

            if (!claim) {
                return createResponse({ success: false, message: "Claim not found" }, 404);
            }

            if (claim.status === 'redeemed') {
                return createResponse({ success: false, message: "Already redeemed", already_redeemed: true }, 400);
            }

            const isExpired = claim.expires_at && new Date(claim.expires_at) < new Date();
            if (isExpired) {
                return createResponse({ success: false, message: "Offer expired", is_expired: true }, 400);
            }

            // Mark as redeemed with explicit timestamp
            const redeemedAt = new Date().toISOString();
            await env.DB.prepare(`
                UPDATE campaign_claims SET status = 'redeemed', redeemed_at = ? 
                WHERE id = ?
            `).bind(redeemedAt, claim.id).run();

            // Track event
            await env.DB.prepare(`
                INSERT INTO campaign_events (id, campaign_id, claim_id, visitor_id, restaurant_id, event_type, created_at)
                VALUES (?, ?, ?, ?, ?, 'redeemed', CURRENT_TIMESTAMP)
            `).bind(
                crypto.randomUUID(),
                claim.campaign_id,
                claim.id,
                claim.visitor_id,
                claim.restaurant_id
            ).run();

            return createResponse({
                success: true,
                message: "Claim redeemed successfully",
                redeemed_at: redeemedAt
            });

        } catch (error) {
            console.error("Redeem Error:", error);
            return createResponse({ success: false, message: error.message }, 500);
        }
    }

    return null;
}


// ============================================
// WEB PUSH UTILS (Edge Compatible)
// ============================================

// VAPID Signing (ES256) using WebCrypto
async function signVapidToken(audience, publicKey, privateKey) {
    const header = { typ: 'JWT', alg: 'ES256' };
    const jwtExp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12h
    const claims = {
        aud: audience,
        exp: jwtExp,
        sub: 'mailto:admin@visualtaste.app'
    };

    const unsignedToken = base64Url(JSON.stringify(header)) + '.' + base64Url(JSON.stringify(claims));

    // Convert keys to JWK format for import
    const d = privateKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    // Public Key needs to be split into x and y
    const pubKeyClean = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    const pubKeyBin = atob(pubKeyClean);
    const pubKeyBytes = new Uint8Array(pubKeyBin.length);
    for (let i = 0; i < pubKeyBin.length; i++) pubKeyBytes[i] = pubKeyBin.charCodeAt(i);

    // Uncompressed point starts with 0x04
    if (pubKeyBytes[0] !== 0x04) {
        throw new Error('Invalid public key format (must be uncompressed 0x04 prefix)');
    }

    const xBytes = pubKeyBytes.slice(1, 33);
    const yBytes = pubKeyBytes.slice(33, 65);

    const key = await crypto.subtle.importKey(
        'jwk',
        {
            kty: "EC",
            crv: "P-256",
            x: base64Url(xBytes),
            y: base64Url(yBytes),
            d: d
        },
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        key,
        new TextEncoder().encode(unsignedToken)
    );

    return unsignedToken + '.' + base64Url(signature);
}

function base64Url(input) {
    let val = input;
    if (typeof input !== 'string') {
        val = String.fromCharCode(...new Uint8Array(input));
    }
    return btoa(val).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
