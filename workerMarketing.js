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
    // LEADS ENDPOINTS
    // ============================================

    if (method === "POST" && pathname === "/api/leads") {
        // ... (rest of logic checked, no changes needed inside blocks)
        try {
            const data = await request.json();
            const { restaurant_id, campaign_id, type, contact_value, name, consent_given, source, metadata } = data;

            if (!restaurant_id || !type || !contact_value) {
                return createResponse({ success: false, message: "Missing required fields" }, 400);
            }

            if (!['email', 'phone'].includes(type)) {
                return createResponse({ success: false, message: "Invalid type" }, 400);
            }

            const id = crypto.randomUUID();
            await env.DB.prepare(
                `INSERT INTO marketing_leads (id, restaurant_id, campaign_id, type, contact_value, source, consent_given, metadata)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
                id,
                restaurant_id,
                campaign_id || null,
                type,
                contact_value,
                source || 'welcome_modal',
                consent_given ? 1 : 0,
                metadata ? JSON.stringify(metadata) : null
            ).run();

            return createResponse({ success: true, message: "Lead saved successfully" });

        } catch (error) {
            console.error("Error saving lead:", error);
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
            const campaigns = await env.DB.prepare(
                `SELECT * FROM marketing_campaigns WHERE restaurant_id = ? ORDER BY created_at DESC`
            ).bind(restaurantId).all();

            const results = (campaigns.results || []).map(c => ({
                ...c,
                content: c.content ? JSON.parse(c.content) : {},
                settings: c.settings ? JSON.parse(c.settings) : {},
                is_active: !!c.is_active
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

            if (id) {
                // Update
                await env.DB.prepare(`
                    UPDATE campaign_rewards 
                    SET name = ?, description = ?, probability = ?, max_quantity = ?, image_url = ?, is_active = ?
                    WHERE id = ?
                `).bind(
                    name, description, probability, max_quantity, image_url,
                    is_active !== undefined ? (is_active ? 1 : 0) : 1,
                    id
                ).run();
                return createResponse({ success: true, message: "Reward updated" });
            } else {
                // Create
                const newId = crypto.randomUUID();
                await env.DB.prepare(`
                    INSERT INTO campaign_rewards (id, campaign_id, name, description, probability, max_quantity, image_url, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                `).bind(
                    newId, campaign_id, name, description, probability, max_quantity, image_url
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

    // Send Notification
    if (method === "POST" && pathname === "/api/notifications/send") {
        try {
            const { restaurant_id, title, message, url, image_url, icon, badge, color, debug } = await request.json();

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
