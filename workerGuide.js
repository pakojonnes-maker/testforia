// workerGuide.js — Guidebook Public API
// ============================================
// Endpoint: GET /guide/:apartment_slug?lang=es
// Returns complete guidebook data for a single apartment
// ============================================

import { ACTIVE_LANGUAGES } from './workerGuideAdmin.js';
import { getGuideVersion } from './workerGuideCache.js';

const FALLBACK_LANG = 'es'; // es is the source of truth (see CLAUDE.md §5)
// Media URLs must be absolute: the guide/TV frontends live on a different
// origin (Pages) than the worker that serves /media/*, so a bare "/media/..."
// path resolves against the *frontend's* origin and 404s (SPA fallback masks
// it as a 200 text/html). Fall back to the workers.dev origin only for
// callers that don't have a request to derive it from.
const DEFAULT_MEDIA_ORIGIN = 'https://visualtasteworker.franciscotortosaestudios.workers.dev';

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

// Fallback for apartments without dedicated wifi_ssid/wifi_password columns:
// the WiFi info item is host-authored free text like "Red: X\nContraseña: Y"
// or "Network: X / Password: Y" in any of the 13 active languages. The label
// itself is never needed — every observed format is two "Label: value" pairs
// (network first, password second) separated by a newline or " / ", so we
// just take the text after each first colon instead of matching every
// language's word for "network"/"password".
function parseWifiFromInfo(content) {
    if (!content) return { ssid: null, password: null };
    const values = content.split(/\n|\s\/\s/)
        .map(part => {
            const idx = part.indexOf(':');
            return idx >= 0 ? part.slice(idx + 1).trim() : null;
        })
        .filter(Boolean);
    return { ssid: values[0] || null, password: values[1] || null };
}

/**
 * Main handler for guide public routes
 */
export async function handleGuideRequests(request, env) {
    const url = new URL(request.url);

    // Only handle GET /guide/:slug
    const match = url.pathname.match(/^\/guide\/([^/]+)$/);
    if (!match || request.method !== 'GET') return null;

    const slug = match[1];
    const lang = url.searchParams.get('lang') || 'es';

    try {
        return await handleGetGuidebook(env, slug, lang, url.origin);
    } catch (error) {
        console.error('[Guide] Error:', error);
        return errorResponse('Error loading guidebook: ' + error.message, 500);
    }
}

/**
 * Load complete guidebook for an apartment.
 * Exported so other public entry points (e.g. workerTvScreen.js's TV pairing
 * config) can return the exact same shape/cache without duplicating the query.
 */
export async function handleGetGuidebook(env, slug, lang, origin) {
    // KV Cache check. The key embeds a version bumped by the admin panel on any
    // edit (see workerGuideCache.js), so a 24h TTL is safe here: content changes
    // land on a fresh key instantly instead of relying on the TTL to expire stale
    // data.
    let cacheKey = null;
    if (env.GUIDE_CACHE) {
        const version = await getGuideVersion(env, slug);
        cacheKey = `guide:${slug}:${lang}:v${version}`;
        const cached = await env.GUIDE_CACHE.get(cacheKey);
        if (cached) {
            return new Response(cached, {
                headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
            });
        }
    }

    // 1. Load apartment + zone + agency
    const apartment = await env.DB.prepare(`
        SELECT
            a.id, a.name, a.slug, a.address, a.latitude, a.longitude, a.cover_image_url,
            a.zone_id, a.agency_id, a.wifi_ssid, a.wifi_password, a.wifi_security
        FROM guide_apartments a
        WHERE a.slug = ? AND a.is_active = TRUE
    `).bind(slug).first();

    if (!apartment) {
        return errorResponse('Apartment not found', 404);
    }

    // Check if apartment has specific POI assignments
    const aptPoisCheck = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM guide_apartment_pois WHERE apartment_id = ?'
    ).bind(apartment.id).first();
    const hasAssignedPois = aptPoisCheck?.count > 0;

    // 2. Parallel load: zone, agency, info, POIs, experiences, restaurants, welcome modal
    const [zone, agency, apartmentInfo, pois, experiences, zoneRestaurants, welcomeModal] = await Promise.all([
        // Zone
        env.DB.prepare(`
            SELECT id, name, slug, country, region, latitude, longitude, cover_image_url
            FROM guide_zones WHERE id = ? AND is_active = TRUE
        `).bind(apartment.zone_id).first(),

        // Agency
        env.DB.prepare(`
            SELECT id, name, slug, logo_url, primary_color, secondary_color, accent_color
            FROM guide_agencies WHERE id = ? AND is_active = TRUE
        `).bind(apartment.agency_id).first(),

        // Apartment info with translations (falls back to Spanish when the
        // requested language has no translation row yet)
        env.DB.prepare(`
            SELECT
                ai.id, ai.info_key, ai.icon_name, ai.order_index,
                COALESCE(t_title.value, t_title_es.value) AS title,
                COALESCE(t_content.value, t_content_es.value) AS content
            FROM guide_apartment_info ai
            LEFT JOIN translations t_title ON ai.id = t_title.entity_id
                AND t_title.entity_type = 'apartment_info'
                AND t_title.field = 'title'
                AND t_title.language_code = ?
            LEFT JOIN translations t_title_es ON ai.id = t_title_es.entity_id
                AND t_title_es.entity_type = 'apartment_info'
                AND t_title_es.field = 'title'
                AND t_title_es.language_code = ?
            LEFT JOIN translations t_content ON ai.id = t_content.entity_id
                AND t_content.entity_type = 'apartment_info'
                AND t_content.field = 'content'
                AND t_content.language_code = ?
            LEFT JOIN translations t_content_es ON ai.id = t_content_es.entity_id
                AND t_content_es.entity_type = 'apartment_info'
                AND t_content_es.field = 'content'
                AND t_content_es.language_code = ?
            WHERE ai.apartment_id = ?
            ORDER BY ai.order_index ASC
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.id).all(),

        // POIs with translations (falls back to Spanish when missing)
        hasAssignedPois
        ? env.DB.prepare(`
            SELECT
                p.id, p.category, p.latitude, p.longitude, p.google_maps_url,
                p.rating, p.travel_time_text, p.travel_mode, p.distance_text,
                COALESCE(t_name.value, t_name_es.value) AS name,
                COALESCE(t_desc.value, t_desc_es.value) AS description
            FROM guide_apartment_pois gap
            JOIN guide_pois p ON gap.poi_id = p.id AND p.is_active = TRUE
            LEFT JOIN translations t_name ON p.id = t_name.entity_id
                AND t_name.entity_type = 'poi'
                AND t_name.field = 'name'
                AND t_name.language_code = ?
            LEFT JOIN translations t_name_es ON p.id = t_name_es.entity_id
                AND t_name_es.entity_type = 'poi'
                AND t_name_es.field = 'name'
                AND t_name_es.language_code = ?
            LEFT JOIN translations t_desc ON p.id = t_desc.entity_id
                AND t_desc.entity_type = 'poi'
                AND t_desc.field = 'description'
                AND t_desc.language_code = ?
            LEFT JOIN translations t_desc_es ON p.id = t_desc_es.entity_id
                AND t_desc_es.entity_type = 'poi'
                AND t_desc_es.field = 'description'
                AND t_desc_es.language_code = ?
            WHERE gap.apartment_id = ? AND p.latitude IS NOT NULL
            ORDER BY gap.order_override ASC
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.id).all()
        : env.DB.prepare(`
            SELECT
                p.id, p.category, p.latitude, p.longitude, p.google_maps_url,
                p.rating, p.travel_time_text, p.travel_mode, p.distance_text,
                COALESCE(t_name.value, t_name_es.value) AS name,
                COALESCE(t_desc.value, t_desc_es.value) AS description
            FROM guide_pois p
            LEFT JOIN translations t_name ON p.id = t_name.entity_id
                AND t_name.entity_type = 'poi'
                AND t_name.field = 'name'
                AND t_name.language_code = ?
            LEFT JOIN translations t_name_es ON p.id = t_name_es.entity_id
                AND t_name_es.entity_type = 'poi'
                AND t_name_es.field = 'name'
                AND t_name_es.language_code = ?
            LEFT JOIN translations t_desc ON p.id = t_desc.entity_id
                AND t_desc.entity_type = 'poi'
                AND t_desc.field = 'description'
                AND t_desc.language_code = ?
            LEFT JOIN translations t_desc_es ON p.id = t_desc_es.entity_id
                AND t_desc_es.entity_type = 'poi'
                AND t_desc_es.field = 'description'
                AND t_desc_es.language_code = ?
            WHERE p.zone_id = ? AND p.is_active = TRUE AND p.latitude IS NOT NULL
            ORDER BY p.order_index ASC
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.zone_id).all(),

        // Experiences = bookable items, now sourced from the unified guide_pois
        // table (is_bookable = TRUE). Translations live under entity_type='poi'.
        // subcategory is aliased back to service_subcategory to keep the API shape.
        env.DB.prepare(`
            SELECT
                e.id, e.category, e.subcategory AS service_subcategory, e.action_type, e.action_data, e.action_prefilled_message,
                e.price_display, e.cover_image_url, e.is_featured,
                e.discount_display, e.original_price_display, e.badge_type,
                COALESCE(t_name.value, t_name_es.value) AS name,
                COALESCE(t_desc.value, t_desc_es.value) AS description,
                COALESCE(t_cta.value, t_cta_es.value) AS cta_label
            FROM guide_pois e
            LEFT JOIN translations t_name ON e.id = t_name.entity_id
                AND t_name.entity_type = 'poi'
                AND t_name.field = 'name'
                AND t_name.language_code = ?
            LEFT JOIN translations t_name_es ON e.id = t_name_es.entity_id
                AND t_name_es.entity_type = 'poi'
                AND t_name_es.field = 'name'
                AND t_name_es.language_code = ?
            LEFT JOIN translations t_desc ON e.id = t_desc.entity_id
                AND t_desc.entity_type = 'poi'
                AND t_desc.field = 'description'
                AND t_desc.language_code = ?
            LEFT JOIN translations t_desc_es ON e.id = t_desc_es.entity_id
                AND t_desc_es.entity_type = 'poi'
                AND t_desc_es.field = 'description'
                AND t_desc_es.language_code = ?
            LEFT JOIN translations t_cta ON e.id = t_cta.entity_id
                AND t_cta.entity_type = 'poi'
                AND t_cta.field = 'cta_label'
                AND t_cta.language_code = ?
            LEFT JOIN translations t_cta_es ON e.id = t_cta_es.entity_id
                AND t_cta_es.entity_type = 'poi'
                AND t_cta_es.field = 'cta_label'
                AND t_cta_es.language_code = ?
            WHERE e.zone_id = ? AND e.is_active = TRUE AND e.is_bookable = TRUE
            ORDER BY e.is_featured DESC, e.order_index ASC
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.zone_id).all(),

        // Zone restaurants (bridge to existing restaurants table)
        env.DB.prepare(`
            SELECT 
                r.id, r.name, r.slug,
                zr.tier, zr.cuisine_type_override AS cuisine_type,
                (SELECT dm.r2_key FROM dish_media dm 
                 JOIN dishes d ON dm.dish_id = d.id 
                 WHERE d.restaurant_id = r.id AND dm.is_primary = 1 
                 LIMIT 1) AS cover_image
            FROM guide_zone_restaurants zr
            JOIN restaurants r ON zr.restaurant_id = r.id AND r.is_active = TRUE
            WHERE zr.zone_id = ? AND zr.is_active = TRUE
            ORDER BY
                CASE WHEN zr.tier = 'featured' THEN 0 ELSE 1 END,
                CASE WHEN zr.order_override IS NOT NULL THEN zr.order_override
                     ELSE ABS(RANDOM()) % 1000 END
        `).bind(apartment.zone_id).all(),

        // Welcome modal (with translations for the current language, falling back to Spanish)
        env.DB.prepare(`
            SELECT
                w.id, w.image_url, w.action_enabled, w.action_type, w.action_data,
                t_title.value AS title, t_title_es.value AS title_es,
                t_body.value AS body, t_body_es.value AS body_es,
                t_cta.value AS action_label, t_cta_es.value AS action_label_es
            FROM guide_welcome_modals w
            LEFT JOIN translations t_title ON w.id = t_title.entity_id AND t_title.entity_type = 'welcome_modal' AND t_title.field = 'title' AND t_title.language_code = ?
            LEFT JOIN translations t_title_es ON w.id = t_title_es.entity_id AND t_title_es.entity_type = 'welcome_modal' AND t_title_es.field = 'title' AND t_title_es.language_code = 'es'
            LEFT JOIN translations t_body ON w.id = t_body.entity_id AND t_body.entity_type = 'welcome_modal' AND t_body.field = 'body' AND t_body.language_code = ?
            LEFT JOIN translations t_body_es ON w.id = t_body_es.entity_id AND t_body_es.entity_type = 'welcome_modal' AND t_body_es.field = 'body' AND t_body_es.language_code = 'es'
            LEFT JOIN translations t_cta ON w.id = t_cta.entity_id AND t_cta.entity_type = 'welcome_modal' AND t_cta.field = 'action_label' AND t_cta.language_code = ?
            LEFT JOIN translations t_cta_es ON w.id = t_cta_es.entity_id AND t_cta_es.entity_type = 'welcome_modal' AND t_cta_es.field = 'action_label' AND t_cta_es.language_code = 'es'
            WHERE w.apartment_id = ? AND w.is_active = TRUE
        `).bind(lang, lang, lang, apartment.id).first()
    ]);

    if (!zone) {
        return errorResponse('Zone not found for this apartment', 404);
    }

    const mediaOrigin = origin || DEFAULT_MEDIA_ORIGIN;

    // 3. Load POI media
    const poiIds = (pois.results || []).map(p => p.id);
    let poiMedia = {};
    if (poiIds.length > 0) {
        const placeholders = poiIds.map(() => '?').join(',');
        const mediaResults = await env.DB.prepare(`
            SELECT poi_id, id, r2_key, media_type, role, order_index
            FROM guide_poi_media
            WHERE poi_id IN (${placeholders})
            ORDER BY order_index ASC
        `).bind(...poiIds).all();

        for (const media of (mediaResults.results || [])) {
            if (!poiMedia[media.poi_id]) poiMedia[media.poi_id] = [];
            poiMedia[media.poi_id].push({
                id: media.id,
                url: `${mediaOrigin}/media/${media.r2_key}`,
                type: media.media_type,
                role: media.role
            });
        }
    }

    // 4. Load apartment media
    const infoIds = (apartmentInfo.results || []).map(i => i.id);
    let aptMedia = {};
    if (infoIds.length > 0) {
        const placeholders = infoIds.map(() => '?').join(',');
        const mediaResults = await env.DB.prepare(`
            SELECT apartment_info_id, id, r2_key, media_type, order_index
            FROM guide_apartment_media
            WHERE apartment_info_id IN (${placeholders})
            ORDER BY order_index ASC
        `).bind(...infoIds).all();

        for (const media of (mediaResults.results || [])) {
            if (!aptMedia[media.apartment_info_id]) aptMedia[media.apartment_info_id] = [];
            aptMedia[media.apartment_info_id].push({
                id: media.id,
                url: `${mediaOrigin}/media/${media.r2_key}`,
                type: media.media_type
            });
        }
    }

    // 5. Get zone translated description (falls back to Spanish when missing)
    const zoneDesc = await env.DB.prepare(`
        SELECT COALESCE(
            (SELECT value FROM translations WHERE entity_id = ? AND entity_type = 'zone' AND field = 'description' AND language_code = ?),
            (SELECT value FROM translations WHERE entity_id = ? AND entity_type = 'zone' AND field = 'description' AND language_code = ?)
        ) AS value
    `).bind(zone.id, lang, zone.id, FALLBACK_LANG).first();

    const deviceCount = await env.DB.prepare(`
        SELECT COUNT(DISTINCT device_fingerprint) as count
        FROM guide_sessions
        WHERE apartment_id = ? AND device_fingerprint IS NOT NULL
        AND started_at >= datetime('now', '-24 hours')
    `).bind(apartment.id).first();

    // 6. Compose response  
    // Replace {{apartment_name}} in prefilled WhatsApp messages
    const processedExperiences = (experiences.results || []).map(exp => {
        let prefilled = exp.action_prefilled_message;
        if (prefilled) {
            prefilled = prefilled.replace(/\{\{apartment_name\}\}/g, apartment.name);
        }
        return {
            id: exp.id,
            name: exp.name || exp.id,
            description: exp.description || '',
            category: exp.category,
            service_subcategory: exp.service_subcategory || null,
            action_type: exp.action_type,
            action_data: exp.action_data,
            prefilled_message: prefilled,
            price_display: exp.price_display,
            original_price_display: exp.original_price_display,
            discount_display: exp.discount_display,
            badge_type: exp.badge_type,
            cover_image_url: exp.cover_image_url,
            is_featured: exp.is_featured === 1,
            cta_label: exp.cta_label || (exp.action_type === 'WHATSAPP' ? 'WhatsApp' : 'Reservar')
        };
    });

    const wifiInfoRow = (apartmentInfo.results || []).find(info => info.info_key === 'wifi');
    const wifiFallback = parseWifiFromInfo(wifiInfoRow?.content);

    const responseData = {
        success: true,
        apartment: {
            id: apartment.id,
            name: apartment.name,
            slug: apartment.slug,
            address: apartment.address,
            cover_image_url: apartment.cover_image_url,
            wifi: {
                ssid: apartment.wifi_ssid || wifiFallback.ssid,
                password: apartment.wifi_password || wifiFallback.password,
                security: apartment.wifi_security || 'WPA'
            },
            info: (apartmentInfo.results || []).map(info => ({
                id: info.id,
                key: info.info_key,
                icon: info.icon_name,
                title: info.title || info.info_key,
                content: info.content || '',
                media: aptMedia[info.id] || []
            }))
        },
        zone: {
            id: zone.id,
            name: zone.name,
            slug: zone.slug,
            region: zone.region,
            cover_image_url: zone.cover_image_url,
            description: zoneDesc?.value || ''
        },
        agency: {
            id: agency?.id,
            name: agency?.name || 'Host',
            logo_url: agency?.logo_url,
            primary_color: agency?.primary_color || null,
            secondary_color: agency?.secondary_color || null,
            accent_color: agency?.accent_color || null,
        },
        pois: (pois.results || []).map(poi => ({
            id: poi.id,
            name: poi.name || poi.id,
            description: poi.description || '',
            category: poi.category,
            latitude: poi.latitude,
            longitude: poi.longitude,
            google_maps_url: poi.google_maps_url,
            rating: poi.rating,
            travel_time_text: poi.travel_time_text,
            travel_mode: poi.travel_mode,
            distance_text: poi.distance_text,
            media: poiMedia[poi.id] || []
        })),
        restaurants: (zoneRestaurants.results || []).map(r => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            cuisine_type: r.cuisine_type,
            tier: r.tier,
            cover_image: r.cover_image ? `${mediaOrigin}/media/${r.cover_image}` : null
        })),
        experiences: processedExperiences,
        welcome_modal: welcomeModal ? {
            image_url: welcomeModal.image_url,
            title: welcomeModal.title || welcomeModal.title_es || '',
            body: welcomeModal.body || welcomeModal.body_es || '',
            action_enabled: welcomeModal.action_enabled === 1,
            action_type: welcomeModal.action_type,
            action_data: welcomeModal.action_data,
            action_label: welcomeModal.action_label || welcomeModal.action_label_es || '',
        } : null,
        meta: {
            lang,
            available_langs: ACTIVE_LANGUAGES,
            active_devices_24h: deviceCount?.count || 0
        }
    };

    if (env.GUIDE_CACHE && cacheKey) {
        await env.GUIDE_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 86400 });
    }

    return jsonResponse(responseData);
}
