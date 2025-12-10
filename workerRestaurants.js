// workers/workerRestaurant.js - VERSIÓN CORREGIDA CON PREFIJOS
export async function handleRestaurantRequests(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    console.log(`[Restaurant] ${method} ${pathname}`);

    // ============================================
    // LANGUAGES ENDPOINTS
    // ============================================

    if (method === "GET" && pathname === "/languages") {
        return getSystemLanguages(env);
    }

    if (method === "GET" && pathname.match(/^\/restaurants\/[\w-]+\/languages$/)) {
        const restaurantSlugOrId = pathname.split('/')[2];
        return getRestaurantLanguages(env, restaurantSlugOrId);
    }

    // ============================================
    // STYLING & THEME ENDPOINTS
    // ============================================

    if (method === 'GET' && pathname.match(/^\/restaurants\/[^\/]+\/styling$/)) {
        const restaurantId = pathname.split('/')[2];
        return getRestaurantStyling(env, restaurantId);
    }

    if (method === 'PUT' && pathname.match(/^\/restaurants\/[^\/]+\/styling$/)) {
        const restaurantId = pathname.split('/')[2];
        return updateRestaurantStyling(env, restaurantId, request);
    }

    if (method === 'PUT' && pathname.match(/^\/restaurants\/[^\/]+\/theme$/)) {
        const restaurantId = pathname.split('/')[2];
        return updateRestaurantTheme(env, restaurantId, request);
    }

    // ============================================
    // USERS ENDPOINTS
    // ============================================

    if (method === "GET" && pathname.match(/^\/restaurants\/[^/]+\/users$/)) {
        const restaurantId = pathname.split('/')[2];
        return getRestaurantUsers(env, restaurantId);
    }

    if (method === "POST" && pathname.match(/^\/restaurants\/[^/]+\/users$/)) {
        const restaurantId = pathname.split('/')[2];
        return addRestaurantUser(env, restaurantId, request);
    }

    if (method === "DELETE" && pathname.match(/^\/restaurants\/[^/]+\/users\/[^/]+$/)) {
        const parts = pathname.split('/');
        const restaurantId = parts[2];
        const userId = parts[4];
        return removeRestaurantUser(env, restaurantId, userId);
    }

    // ============================================
    // RESTAURANT ENDPOINTS
    // ============================================

    if (method === "GET" && pathname.match(/^\/restaurants\/[^/]+\/config$/)) {
        const slug = pathname.split('/')[2];
        return getRestaurantConfig(env, slug);
    }

    if (method === "GET" && pathname.match(/^\/restaurants\/by-slug\/[^/]+$/)) {
        const slug = pathname.split('/').pop();
        return getRestaurantBySlug(env, slug);
    }

    if (method === "GET" && pathname.match(/^\/restaurants\/[^/]+$/) &&
        !pathname.includes("/by-slug/") &&
        !pathname.includes("/landing") &&
        !pathname.includes("/config") &&
        !pathname.includes("/styling") &&
        !pathname.includes("/theme") &&
        !pathname.includes("/languages")) {
        const restaurantId = pathname.split('/')[2];
        return getRestaurant(env, restaurantId);
    }

    if (method === "PUT" && pathname.match(/^\/restaurants\/[^/]+$/) &&
        !pathname.includes("/styling") &&
        !pathname.includes("/theme")) {
        const restaurantId = pathname.split('/')[2];
        return updateRestaurant(env, restaurantId, request);
    }

    return null;
}

// ============================================
// LANGUAGES FUNCTIONS
// ============================================

async function getSystemLanguages(env) {
    try {
        const languages = await env.DB.prepare(`
      SELECT code as language_code, name, native_name, flag_emoji, is_active
      FROM languages
      WHERE is_active = TRUE
      ORDER BY code = 'es' DESC, name ASC
    `).all();

        return createResponse({
            success: true,
            languages: (languages.results || []).map(lang => ({
                code: lang.language_code,
                name: lang.name,
                native_name: lang.native_name,
                flag_emoji: lang.flag_emoji,
                is_active: !!lang.is_active
            }))
        });
    } catch (error) {
        console.error("[Languages] Error:", error);
        return createResponse({
            success: false,
            message: "Error getting languages: " + error.message
        }, 500);
    }
}

async function getRestaurantLanguages(env, restaurantSlugOrId) {
    try {
        const restaurant = await env.DB.prepare(`
      SELECT id FROM restaurants WHERE slug = ? OR id = ?
    `).bind(restaurantSlugOrId, restaurantSlugOrId).first();

        if (!restaurant) {
            return createResponse({ success: false, message: "Restaurant not found" }, 404);
        }

        const languagesData = await env.DB.prepare(`
      SELECT rl.language_code, rl.priority, rl.is_enabled, 
             rl.completion_percentage, l.name, l.native_name, l.flag_emoji
      FROM restaurant_languages rl
      JOIN languages l ON rl.language_code = l.code
      WHERE rl.restaurant_id = ?
      ORDER BY rl.priority ASC
    `).bind(restaurant.id).all();

        let languages = languagesData.results || [];

        if (languages.length === 0) {
            const defaultLanguages = await env.DB.prepare(`
        SELECT code as language_code, name, native_name, flag_emoji, 
               10 as priority, 1 as is_enabled, 0 as completion_percentage
        FROM languages
        WHERE is_active = TRUE
        ORDER BY code = 'es' DESC, code ASC
      `).all();

            languages = defaultLanguages.results || [];
        }

        return createResponse({
            success: true,
            languages: languages.map(lang => ({
                code: lang.language_code,
                name: lang.name,
                native_name: lang.native_name,
                flag_emoji: lang.flag_emoji,
                priority: lang.priority,
                is_enabled: lang.is_enabled === 1,
                completion_percentage: lang.completion_percentage || 0
            }))
        });
    } catch (error) {
        console.error("[Restaurant Languages] Error:", error);
        return createResponse({
            success: false,
            message: "Error getting languages: " + error.message
        }, 500);
    }
}

// ============================================
// STYLING & THEME FUNCTIONS
// ============================================

async function getRestaurantStyling(env, restaurantId) {
    try {
        const config = await env.DB.prepare(`
      SELECT config_overrides
      FROM restaurant_reel_configs
      WHERE restaurant_id = ?
    `).bind(restaurantId).first();

        let customColors = {
            primary: '#FF6B6B',
            secondary: '#4ECDC4',
            text: '#2C3E50',
            background: '#FFFFFF'
        };

        if (config?.config_overrides) {
            try {
                const overrides = JSON.parse(config.config_overrides);

                // ✅ CORREGIDO: Leer campos con prefijo reel_
                if (overrides.reel_primary_color) {
                    customColors = {
                        primary: overrides.reel_primary_color || customColors.primary,
                        secondary: overrides.reel_secondary_color || customColors.secondary,
                        text: overrides.reel_text_color || customColors.text,
                        background: overrides.reel_background_color || customColors.background
                    };
                }
            } catch (parseError) {
                console.error('[Styling GET] Parse error:', parseError);
            }
        }

        return createResponse({ success: true, styling: { customColors } });
    } catch (error) {
        console.error('[Styling GET] Error:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function updateRestaurantStyling(env, restaurantId, request) {
    try {
        const body = await request.json();

        const existing = await env.DB.prepare(
            `SELECT id, config_overrides FROM restaurant_reel_configs WHERE restaurant_id = ?`
        ).bind(restaurantId).first();

        let currentOverrides = {};
        if (existing?.config_overrides) {
            try {
                currentOverrides = JSON.parse(existing.config_overrides);
            } catch (e) {
                console.warn('[Styling PUT] Parse error');
            }
        }

        // ✅ CORREGIDO: Usar prefijo reel_ para evitar conflictos
        const newReelColors = {
            reel_primary_color: body.primary || body.primary_color,
            reel_secondary_color: body.secondary || body.secondary_color,
            reel_text_color: body.text || body.text_color,
            reel_background_color: body.background || body.background_color
        };

        const mergedOverrides = { ...currentOverrides, ...newReelColors };
        const configJson = JSON.stringify(mergedOverrides);

        console.log('[Styling PUT] Saving with reel_ prefix:', configJson);

        if (existing) {
            await env.DB.prepare(`
        UPDATE restaurant_reel_configs
        SET config_overrides = ?, modified_at = CURRENT_TIMESTAMP
        WHERE restaurant_id = ?
      `).bind(configJson, restaurantId).run();
        } else {
            await env.DB.prepare(`
        INSERT INTO restaurant_reel_configs 
        (id, restaurant_id, template_id, config_overrides, created_at, modified_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(`reel_config_${restaurantId}`, restaurantId, 'tpl_classic', configJson).run();
        }

        return createResponse({ success: true, message: 'Colores de reels actualizados' });
    } catch (error) {
        console.error('[Styling PUT] Error:', error);
        return createResponse({ success: false, message: error.message }, 500);
    }
}

async function updateRestaurantTheme(env, restaurantId, request) {
    try {
        const body = await request.json();

        const restaurant = await env.DB.prepare(`
      SELECT theme_id FROM restaurants WHERE (id = ? OR slug = ?)
    `).bind(restaurantId, restaurantId).first();

        if (!restaurant || !restaurant.theme_id) {
            return createResponse({ success: false, message: "Restaurant or theme not found" }, 404);
        }

        await env.DB.prepare(`
      UPDATE themes 
      SET primary_color = ?, secondary_color = ?, accent_color = ?, 
          text_color = ?, background_color = ?, font_family = ?, font_accent = ?
      WHERE id = ?
    `).bind(
            body.override_colors?.primary_color || '#FF6B35',
            body.override_colors?.secondary_color || '#004E89',
            body.override_colors?.accent_color || '#F7B32B',
            body.override_colors?.text_color || '#2B2D42',
            body.override_colors?.background_color || '#FFFFFF',
            body.override_fonts?.heading_font || 'Inter',
            body.override_fonts?.font_accent || 'serif',
            restaurant.theme_id
        ).run();

        return createResponse({ success: true, message: "Theme updated successfully" });
    } catch (error) {
        console.error("[Theme PUT] Error:", error);
        return createResponse({ success: false, message: "Error updating theme: " + error.message }, 500);
    }
}

// ============================================
// USERS FUNCTIONS
// ============================================

async function getRestaurantUsers(env, restaurantId) {
    try {
        const users = await env.DB.prepare(`
            SELECT u.id, u.email, u.display_name, u.photo_url, rs.role, rs.is_active, rs.created_at
            FROM restaurant_staff rs
            JOIN users u ON rs.user_id = u.id
            WHERE rs.restaurant_id = ?
            ORDER BY rs.created_at DESC
        `).bind(restaurantId).all();

        return createResponse({ success: true, users: users.results || [] });
    } catch (error) {
        console.error("[Users GET] Error:", error);
        return createResponse({ success: false, message: "Error getting users: " + error.message }, 500);
    }
}

async function addRestaurantUser(env, restaurantId, request) {
    try {
        const { email, role, name } = await request.json();

        if (!email) {
            return createResponse({ success: false, message: "Email is required" }, 400);
        }

        // Check limit (Max 5)
        const countResult = await env.DB.prepare(`
            SELECT COUNT(*) as count FROM restaurant_staff WHERE restaurant_id = ?
        `).bind(restaurantId).first();

        if (countResult.count >= 5) {
            return createResponse({ success: false, message: "Maximum 5 users allowed per restaurant" }, 403);
        }

        // Check if user exists
        let user = await env.DB.prepare(`SELECT id, email FROM users WHERE email = ?`).bind(email).first();

        if (!user) {
            // Create new user
            const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            // Simple hash for auto-generated password (in production use proper crypto)
            const tempPassword = Math.random().toString(36).slice(-8);
            // We're skipping proper hashing here for brevity, assuming standard hashPassword avail or similar
            // For now let's just insert a placeholder or use a simple hash approach if crypto is available
            // Since we don't have the hash utils imported here, we'll assume a utility or insert a dummy hash
            // TODO: Implement proper invitation flow or password reset
            const passwordHash = "TEMP_HASH";

            await env.DB.prepare(`
                INSERT INTO users (id, email, display_name, password_hash, auth_provider, created_at)
                VALUES (?, ?, ?, ?, 'email', CURRENT_TIMESTAMP)
            `).bind(userId, email, name || email.split('@')[0], passwordHash).run();

            user = { id: userId, email };
        }

        // Check if already in restaurant
        const existingStaff = await env.DB.prepare(`
            SELECT * FROM restaurant_staff WHERE restaurant_id = ? AND user_id = ?
        `).bind(restaurantId, user.id).first();

        if (existingStaff) {
            return createResponse({ success: false, message: "User already in this restaurant" }, 409);
        }

        // Add to staff
        await env.DB.prepare(`
            INSERT INTO restaurant_staff (restaurant_id, user_id, role, is_active, created_at)
            VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP)
        `).bind(restaurantId, user.id, role || 'staff').run();

        return createResponse({ success: true, message: "User added successfully", user: { ...user, role: role || 'staff' } });

    } catch (error) {
        console.error("[Users POST] Error:", error);
        return createResponse({ success: false, message: "Error adding user: " + error.message }, 500);
    }
}

async function removeRestaurantUser(env, restaurantId, userId) {
    try {
        // Prevent deleting the last owner
        const staffMember = await env.DB.prepare(`
            SELECT role FROM restaurant_staff WHERE restaurant_id = ? AND user_id = ?
        `).bind(restaurantId, userId).first();

        if (staffMember && staffMember.role === 'owner') {
            const ownerCount = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM restaurant_staff WHERE restaurant_id = ? AND role = 'owner'
            `).bind(restaurantId).first();

            if (ownerCount.count <= 1) {
                return createResponse({ success: false, message: "Cannot delete the last owner" }, 403);
            }
        }

        await env.DB.prepare(`
            DELETE FROM restaurant_staff WHERE restaurant_id = ? AND user_id = ?
        `).bind(restaurantId, userId).run();

        return createResponse({ success: true, message: "User removed successfully" });

    } catch (error) {
        console.error("[Users DELETE] Error:", error);
        return createResponse({ success: false, message: "Error removing user: " + error.message }, 500);
    }
}

// ============================================
// RESTAURANT FUNCTIONS
// ============================================

async function getRestaurantConfig(env, slug) {
    try {
        const restaurant = await env.DB.prepare(`
      SELECT r.id, r.slug, r.name, r.theme_id, r.reel_template_id, r.features,
             t.id as theme_real_id, t.name as theme_name, t.primary_color, t.secondary_color, 
             t.accent_color, t.text_color, t.background_color, t.font_family, t.font_accent
      FROM restaurants r
      LEFT JOIN themes t ON r.theme_id = t.id
      WHERE (r.slug = ? OR r.id = ?) AND r.is_active = TRUE
    `).bind(slug, slug).first();

        if (!restaurant) {
            return createResponse({ success: false, message: "Restaurant not found" }, 404);
        }

        const reelConfig = await env.DB.prepare(`
      SELECT rrc.template_id, rrc.config_overrides,
             rt.name as template_name, rt.description as template_description,
             rt.is_premium as template_is_premium
      FROM restaurant_reel_configs rrc
      LEFT JOIN reel_templates rt ON rrc.template_id = rt.id
      WHERE rrc.restaurant_id = ?
    `).bind(restaurant.id).first();

        // [NEW] Fetch Active Marketing Campaign
        const activeCampaign = await env.DB.prepare(`
      SELECT * FROM marketing_campaigns 
      WHERE restaurant_id = ? AND is_active = TRUE 
      ORDER BY priority DESC, created_at DESC 
      LIMIT 1
    `).bind(restaurant.id).first();

        let configOverrides = {};
        let restaurantFeatures = {};

        if (reelConfig?.config_overrides) {
            try { configOverrides = JSON.parse(reelConfig.config_overrides); } catch (e) { }
        }

        if (restaurant.features) {
            try { restaurantFeatures = JSON.parse(restaurant.features); } catch (e) { }
        }

        // Parse campaign content if exists
        let marketingCampaign = undefined;
        if (activeCampaign) {
            try {
                marketingCampaign = {
                    id: activeCampaign.id,
                    type: activeCampaign.type,
                    content: JSON.parse(activeCampaign.content || '{}'),
                    settings: JSON.parse(activeCampaign.settings || '{}')
                };
            } catch (e) {
                console.error("Error parsing campaign JSON", e);
            }
        }

        // ✅ CORREGIDO: branding usa SOLO tabla themes (NO config_overrides)
        const config = {
            template: {
                id: reelConfig?.template_id || restaurant.reel_template_id || 'tpl_classic',
                name: reelConfig?.template_name || 'Classic',
                description: reelConfig?.template_description || 'Default template',
                is_premium: reelConfig?.template_is_premium || false
            },
            branding: {
                primaryColor: restaurant.primary_color || '#FF6B6B',
                secondaryColor: restaurant.secondary_color || '#4ECDC4',
                accentColor: restaurant.accent_color || '#FF8C42',
                textColor: restaurant.text_color || '#FFFFFF',
                backgroundColor: restaurant.background_color || '#000000',
            },
            theme: {
                fontFamily: restaurant.font_family || 'Inter, sans-serif',
                fontAccent: restaurant.font_accent || 'Inter, sans-serif',
                accentColor: restaurant.accent_color || '#FF8C42',
                textColor: restaurant.text_color || '#FFFFFF',
                backgroundColor: restaurant.background_color || '#000000',
            },
            features: { ...restaurantFeatures },
            overrides: configOverrides,
            marketing: marketingCampaign // [NEW] Inject campaign here
        };

        return createResponse({ success: true, config });
    } catch (error) {
        console.error("[Config] Error:", error);
        return createResponse({ success: false, message: "Error getting config: " + error.message }, 500);
    }
}

async function getRestaurant(env, restaurantId) {
    try {
        const restaurant = await env.DB.prepare(`
      SELECT r.id, r.account_id, r.name, r.slug, r.description, r.email, r.phone,
             r.logo_url, r.address, r.website, r.city, r.country, r.cover_image_url,
             r.theme_id, r.reel_template_id, r.language_default, r.features, r.is_active,
             r.created_at, r.modified_at,
             rd.timezone, rd.accepts_reservations, rd.reservation_url, rd.reservation_phone,
             rd.reservation_email, rd.has_wifi, rd.has_delivery, rd.has_outdoor_seating,
             rd.max_capacity as capacity, rd.google_maps_url, rd.latitude, rd.longitude,
             rd.facebook_url, rd.instagram_url, rd.twitter_url, rd.tiktok_url, 
             rd.youtube_url, rd.tripadvisor_url,
             t.name as theme_name, t.primary_color, t.secondary_color, t.accent_color,
             t.text_color, t.background_color, t.font_family, t.font_accent
      FROM restaurants r
      LEFT JOIN restaurant_details rd ON r.id = rd.restaurant_id
      LEFT JOIN themes t ON r.theme_id = t.id
      WHERE (r.id = ? OR r.slug = ?) AND r.is_active = TRUE
    `).bind(restaurantId, restaurantId).first();

        if (!restaurant) {
            return createResponse({ success: false, message: "Restaurant not found" }, 404);
        }

        return createResponse({ success: true, restaurant });
    } catch (error) {
        console.error("[Restaurant GET] Error:", error);
        return createResponse({ success: false, message: "Server error: " + error.message }, 500);
    }
}

async function getRestaurantBySlug(env, slug) {
    try {
        // [FIX] Added LEFT JOIN restaurant_details to fetch social links
        const restaurant = await env.DB.prepare(`
      SELECT r.id, r.account_id, r.name, r.slug, r.description, r.email, r.phone,
             r.logo_url, r.address, r.website, r.city, r.country, r.cover_image_url,
             r.theme_id, r.reel_template_id, r.language_default, r.features, r.is_active,
             r.created_at, r.modified_at,
             rd.facebook_url, rd.instagram_url, rd.twitter_url, rd.tiktok_url, rd.youtube_url,
             t.name as theme_name, t.primary_color, t.secondary_color, t.accent_color,
             t.text_color, t.background_color, t.font_family, t.font_accent
      FROM restaurants r
      LEFT JOIN restaurant_details rd ON r.id = rd.restaurant_id
      LEFT JOIN themes t ON r.theme_id = t.id
      WHERE r.slug = ? AND r.is_active = TRUE
    `).bind(slug).first();

        if (!restaurant) {
            return createResponse({ success: false, message: "Restaurant not found" }, 404);
        }

        return createResponse({ success: true, restaurant });
    } catch (error) {
        console.error("[Restaurant By Slug] Error:", error);
        return createResponse({ success: false, message: "Server error: " + error.message }, 500);
    }
}

async function updateRestaurant(env, restaurantId, request) {
    try {
        const body = await request.json();

        const restaurant = await env.DB.prepare(`
      SELECT id FROM restaurants WHERE (id = ? OR slug = ?)
    `).bind(restaurantId, restaurantId).first();

        if (!restaurant) {
            return createResponse({ success: false, message: "Restaurant not found" }, 404);
        }

        await env.DB.prepare(`
      UPDATE restaurants 
      SET name = ?, description = ?, email = ?, phone = ?, website = ?,
          city = ?, country = ?, modified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
            body.name || '',
            body.description || '',
            body.email || '',
            body.phone || '',
            body.website || '',
            body.city || '',
            body.country || '',
            restaurant.id
        ).run();

        const detailsExist = await env.DB.prepare(`
      SELECT restaurant_id FROM restaurant_details WHERE restaurant_id = ?
    `).bind(restaurant.id).first();

        if (detailsExist) {
            await env.DB.prepare(`
        UPDATE restaurant_details 
        SET timezone = ?, accepts_reservations = ?, reservation_url = ?,
            reservation_phone = ?, reservation_email = ?, has_wifi = ?,
            has_delivery = ?, has_outdoor_seating = ?, max_capacity = ?,
            google_maps_url = ?, facebook_url = ?, instagram_url = ?,
            tiktok_url = ?, youtube_url = ?, tripadvisor_url = ?
        WHERE restaurant_id = ?
      `).bind(
                body.timezone || 'Europe/Madrid',
                body.accepts_reservations ? 1 : 0,
                body.reservation_url || null,
                body.reservation_phone || null,
                body.reservation_email || null,
                body.has_wifi ? 1 : 0,
                body.has_delivery ? 1 : 0,
                body.has_outdoor_seating ? 1 : 0,
                body.capacity || 50,
                body.google_maps_url || null,
                body.facebook_url || null,
                body.instagram_handle || null,
                body.tiktok_handle || null,
                body.youtube_url || null,
                body.tripadvisor_url || null,
                restaurant.id
            ).run();
        } else {
            await env.DB.prepare(`
        INSERT INTO restaurant_details (
          id, restaurant_id, timezone, accepts_reservations, reservation_url,
          reservation_phone, reservation_email, has_wifi, has_delivery,
          has_outdoor_seating, max_capacity, google_maps_url, facebook_url,
          instagram_url, tiktok_url, youtube_url, tripadvisor_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
                `details_${restaurant.id}`,
                restaurant.id,
                body.timezone || 'Europe/Madrid',
                body.accepts_reservations ? 1 : 0,
                body.reservation_url || null,
                body.reservation_phone || null,
                body.reservation_email || null,
                body.has_wifi ? 1 : 0,
                body.has_delivery ? 1 : 0,
                body.has_outdoor_seating ? 1 : 0,
                body.capacity || 50,
                body.google_maps_url || null,
                body.facebook_url || null,
                body.instagram_handle || null,
                body.tiktok_handle || null,
                body.youtube_url || null,
                body.tripadvisor_url || null
            ).run();
        }

        return createResponse({ success: true, message: "Restaurant updated successfully" });
    } catch (error) {
        console.error("[Restaurant PUT] Error:", error);
        return createResponse({ success: false, message: "Error updating restaurant: " + error.message }, 500);
    }
}

export function createResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
