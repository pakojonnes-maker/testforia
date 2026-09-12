// workerGuide.js — Guidebook Public API
// ============================================
// Endpoint: GET /guide/:apartment_slug?lang=es
// Returns complete guidebook data for a single apartment
// ============================================

import { ACTIVE_LANGUAGES } from './workerGuideAdmin.js';
import { getGuideVersion, getZoneExploreVersion, getZoneCatalogVersion } from './workerGuideCache.js';

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

// Shared by handleGetGuidebook (home zone's POIs) and handleGetExplore (any zone
// in the same region) — same R2-backed media table, same URL shape either way.
export async function loadPoiMedia(env, poiIds, mediaOrigin) {
    if (!poiIds || poiIds.length === 0) return {};
    const placeholders = poiIds.map(() => '?').join(',');
    const mediaResults = await env.DB.prepare(`
        SELECT poi_id, id, r2_key, media_type, role, order_index
        FROM guide_poi_media
        WHERE poi_id IN (${placeholders})
        ORDER BY order_index ASC
    `).bind(...poiIds).all();

    const byPoi = {};
    for (const media of (mediaResults.results || [])) {
        if (!byPoi[media.poi_id]) byPoi[media.poi_id] = [];
        byPoi[media.poi_id].push({
            id: media.id,
            url: `${mediaOrigin}/media/${media.r2_key}`,
            type: media.media_type,
            role: media.role
        });
    }
    return byPoi;
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

// ============================================
// Orden de las listas (migración 0091)
// ============================================
// Tres niveles, en este orden: promoción DE PAGO vigente → destacado editorial
// → orden manual. Se separan a propósito: is_featured es "esto lo recomiendo de
// verdad" y promotion_rank es "esto me lo pagan"; mezclarlos hacía imposible
// justificar qué se le vendió a un cliente y qué recomendación es publicidad.

/** Un ítem está promocionado si tiene rank y hoy cae dentro de su vigencia. */
const promotedExpr = (alias) => `(
    ${alias}.promotion_rank IS NOT NULL
    AND (${alias}.promoted_from  IS NULL OR ${alias}.promoted_from  <= datetime('now'))
    AND (${alias}.promoted_until IS NULL OR ${alias}.promoted_until >= datetime('now'))
)`;

/** Sentinela para los NULL: sin rank/orden, al final. */
const LAST = 2147483647;

/**
 * Cláusula ORDER BY completa. `overrideCol` es la columna de override por
 * apartamento (guide_apartment_item_order) o null si esa lista no lo soporta.
 *
 * Termina SIEMPRE en una columna única: sin desempate final SQLite ordena los
 * empates como quiere, y como la respuesta se cachea en KV ese capricho se
 * congela dentro del JSON. Es el mismo fallo que tenía restaurantes, sólo que
 * ahí era explícito (ABS(RANDOM())).
 */
const orderClause = (alias, overrideCol, featuredExpr = null, tiebreak = null) => `
    CASE WHEN ${promotedExpr(alias)} THEN 0 ELSE 1 END,
    COALESCE(${alias}.promotion_rank, ${LAST}),
    ${featuredExpr || `${alias}.is_featured DESC`},
    COALESCE(${overrideCol ? `${overrideCol}, ` : ''}${alias}.order_index, ${LAST}),
    ${tiebreak || `${alias}.id`}
`;

// ============================================
// CTA de una experiencia (migración 0091)
// ============================================
// Dos ranuras por ítem: principal (por defecto el enlace de afiliado) y
// secundaria. Si la secundaria está rellena, MANDA — es la única que ve el
// huésped, botón en la guía y QR incrustado en la TV.
//
// La resolución vive aquí, en el servidor, y el JSON sale ya resuelto en
// action_type/action_data. Antes cada cliente decidía por su cuenta y divergían:
// apps/tv/src/lib/collections.ts comparaba action_type === 'whatsapp' en
// minúsculas contra el 'WHATSAPP' que escribe el admin, así que en la TV no
// aparecía un QR de reserva jamás.

const VALID_ACTION_TYPES = ['URL', 'WHATSAPP', 'PHONE', 'COUPON'];

function normalizeActionType(value) {
    if (!value) return null;
    const upper = String(value).trim().toUpperCase();
    return VALID_ACTION_TYPES.includes(upper) ? upper : null;
}

/**
 * Sustituye marcadores dentro de una URL de afiliado. Sólo sustituye lo que el
 * admin haya escrito: NO se concatenan parámetros a ciegas, porque muchas redes
 * firman el enlace y un query param extra lo invalida.
 */
function applyUrlPlaceholders(url, ctx) {
    if (!url) return url;
    return String(url)
        .replace(/\{\{affiliate_code\}\}/g, encodeURIComponent(ctx.affiliateCode || ''))
        .replace(/\{\{sub_id\}\}/g, encodeURIComponent(ctx.subId))
        .replace(/\{\{apartment_id\}\}/g, encodeURIComponent(ctx.apartmentId))
        .replace(/\{\{apartment_name\}\}/g, encodeURIComponent(ctx.apartmentName))
        .replace(/\{\{surface\}\}/g, encodeURIComponent(ctx.surface));
}

/** Mensaje prefijado de WhatsApp: sin URL-encode, lo hace el cliente al abrir wa.me. */
function applyMessagePlaceholders(message, ctx) {
    if (!message) return message;
    return String(message).replace(/\{\{apartment_name\}\}/g, ctx.apartmentName);
}

function resolveExperienceCta(exp, ctx) {
    const secondaryType = normalizeActionType(exp.secondary_action_type);
    const secondaryData = String(exp.secondary_action_data || '').trim();

    if (secondaryType && secondaryData) {
        return {
            action_type: secondaryType,
            action_data: secondaryType === 'URL' ? applyUrlPlaceholders(secondaryData, ctx) : secondaryData,
            prefilled_message: applyMessagePlaceholders(exp.secondary_action_prefilled_message, ctx),
            // El secundario nunca es retribuido: es el contacto directo del
            // partner. Por eso desplaza al afiliado en vez de convivir con él.
            cta_source: 'direct',
        };
    }

    const primaryType = normalizeActionType(exp.action_type);
    const primaryData = String(exp.action_data || '').trim();
    return {
        action_type: primaryType,
        action_data: primaryType === 'URL' ? applyUrlPlaceholders(primaryData, ctx) : primaryData,
        prefilled_message: applyMessagePlaceholders(exp.action_prefilled_message, ctx),
        // Alimenta el aviso de publicidad EN LA TARJETA (Directiva 2005/29/CE,
        // anexo I.11), en vez del párrafo general que daba por afiliadas todas
        // las experiencias.
        cta_source: primaryType && exp.action_is_affiliate === 1 ? 'affiliate' : 'direct',
    };
}

/**
 * Main handler for guide public routes
 */
export async function handleGuideRequests(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return null;

    // GET /guide/:slug/explore?zone=<zone_slug> — "browse another city" for the
    // Airbnb-style map tab. Must be checked BEFORE the plain /guide/:slug match
    // below, or the /^\/guide\/([^/]+)$/ regex never gets a chance (it doesn't
    // match the extra /explore segment anyway, but keep the order in case that
    // ever changes).
    const exploreMatch = url.pathname.match(/^\/guide\/([^/]+)\/explore$/);
    if (exploreMatch) {
        const [, apartmentSlug] = exploreMatch;
        const zoneSlug = url.searchParams.get('zone');
        const lang = url.searchParams.get('lang') || 'es';
        try {
            return await handleGetExplore(env, apartmentSlug, zoneSlug, lang, url.origin);
        } catch (error) {
            console.error('[Guide] Explore error:', error);
            return errorResponse('Error loading explore data: ' + error.message, 500);
        }
    }

    // Only handle GET /guide/:slug
    const match = url.pathname.match(/^\/guide\/([^/]+)$/);
    if (!match) return null;

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
export async function handleGetGuidebook(env, slug, lang, origin, surface = 'guide') {
    // KV Cache check. The key embeds a version bumped by the admin panel on any
    // edit (see workerGuideCache.js), so a 24h TTL is safe here: content changes
    // land on a fresh key instantly instead of relying on the TTL to expire stale
    // data.
    //
    // `surface` entra en la clave porque el JSON lleva las URLs de afiliado ya
    // resueltas, y su sub-id distingue guía de TV: compartir entrada haría que
    // las ventas de la TV se atribuyeran a la guía o al revés. El caso 'guide'
    // conserva la clave EXACTA de antes para no invalidar de golpe la caché
    // entera en el despliegue.
    let cacheKey = null;
    if (env.GUIDE_CACHE) {
        const version = await getGuideVersion(env, slug);
        cacheKey = surface === 'guide'
            ? `guide:${slug}:${lang}:v${version}`
            : `guide:${slug}:${lang}:${surface}:v${version}`;
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
            a.zone_id, a.agency_id, a.wifi_ssid, a.wifi_password, a.wifi_security,
            -- Horas de entrada y salida. Existen en la tabla desde la importación
            -- de fichas (el importador las rellena) y NUNCA se habían devuelto, así
            -- que la TV las adivinaba con un regex sobre el texto libre del bloque
            -- "Check-in". Cuando ese texto no llevaba un HH:MM —que es lo normal si
            -- lo escribió el anfitrión a su manera— la tesela "Tu estancia" salía
            -- con un guion. Dato fantasma, mismo patrón que las fotos de los POIs.
            a.checkin_time, a.checkout_time,
            -- Horas de entrada y salida. Existen en la tabla desde la importación
            -- de fichas (el importador las rellena) y NUNCA se habían devuelto, así
            -- que la TV las adivinaba con un regex sobre el texto libre del bloque
            -- "Check-in". Cuando ese texto no llevaba un HH:MM —que es lo normal si
            -- lo escribió el anfitrión a su manera— la tesela "Tu estancia" salía
            -- con un guion. Dato fantasma, mismo patrón que las fotos de los POIs.
            a.checkin_time, a.checkout_time
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

    // 2. Parallel load: zone, agency, info, POIs, experiences, restaurants, welcome modal, store items, sibling cities
    const [zone, agency, apartmentInfo, pois, experiences, zoneRestaurants, welcomeModal, storeItems, apartmentPhones, cities] = await Promise.all([
        // Zone
        env.DB.prepare(`
            SELECT id, name, slug, country, region, latitude, longitude, cover_image_url
            FROM guide_zones WHERE id = ? AND is_active = TRUE
        `).bind(apartment.zone_id).first(),

        // Agency
        env.DB.prepare(`
            SELECT id, name, slug, logo_url, primary_color, secondary_color, accent_color, headline_font, body_font, label_font
            FROM guide_agencies WHERE id = ? AND is_active = TRUE
        `).bind(apartment.agency_id).first(),

        // Apartment info with translations (falls back to Spanish when the
        // requested language has no translation row yet).
        //
        // Title comes from one of two places (see migration 0083):
        //   use_custom_title = TRUE  -> the apartment's own translations.title,
        //                               same as before this migration existed.
        //   use_custom_title = FALSE (default) -> the global category's name,
        //                               shared across every apartment so a host
        //                               never has to translate "Lavadora" again.
        // icon/color/image follow the same inherit-unless-overridden shape:
        // an apartment-specific icon_name wins if set, otherwise the category's.
        // The category's own name/icon/color are seeded in all 13 languages for
        // every category (migration 0083), so cat_name_es is only a safety net,
        // never expected to actually fire for a real category_key.
        env.DB.prepare(`
            SELECT
                ai.id, ai.info_key, ai.order_index, ai.category_key, ai.use_custom_title,
                ai.latitude, ai.longitude,
                COALESCE(ai.icon_name, c.icon_name) AS icon,
                c.color AS category_color,
                c.image_r2_key AS category_image_r2_key,
                COALESCE(cat_name.value, cat_name_es.value) AS category_name,
                CASE WHEN ai.use_custom_title
                    THEN COALESCE(t_title.value, t_title_es.value)
                    ELSE COALESCE(cat_name.value, cat_name_es.value)
                END AS title,
                COALESCE(t_content.value, t_content_es.value) AS content,
                COALESCE(t_pickup.value, t_pickup_es.value) AS pickup_instructions
            FROM guide_apartment_info ai
            LEFT JOIN guide_info_categories c ON ai.category_key = c.key
            LEFT JOIN translations t_title ON ai.id = t_title.entity_id
                AND t_title.entity_type = 'apartment_info'
                AND t_title.field = 'title'
                AND t_title.language_code = ?
            LEFT JOIN translations t_title_es ON ai.id = t_title_es.entity_id
                AND t_title_es.entity_type = 'apartment_info'
                AND t_title_es.field = 'title'
                AND t_title_es.language_code = ?
            LEFT JOIN translations cat_name ON c.key = cat_name.entity_id
                AND cat_name.entity_type = 'info_category'
                AND cat_name.field = 'name'
                AND cat_name.language_code = ?
            LEFT JOIN translations cat_name_es ON c.key = cat_name_es.entity_id
                AND cat_name_es.entity_type = 'info_category'
                AND cat_name_es.field = 'name'
                AND cat_name_es.language_code = ?
            LEFT JOIN translations t_content ON ai.id = t_content.entity_id
                AND t_content.entity_type = 'apartment_info'
                AND t_content.field = 'content'
                AND t_content.language_code = ?
            LEFT JOIN translations t_content_es ON ai.id = t_content_es.entity_id
                AND t_content_es.entity_type = 'apartment_info'
                AND t_content_es.field = 'content'
                AND t_content_es.language_code = ?
            LEFT JOIN translations t_pickup ON ai.id = t_pickup.entity_id
                AND t_pickup.entity_type = 'apartment_info'
                AND t_pickup.field = 'pickup_instructions'
                AND t_pickup.language_code = ?
            LEFT JOIN translations t_pickup_es ON ai.id = t_pickup_es.entity_id
                AND t_pickup_es.entity_type = 'apartment_info'
                AND t_pickup_es.field = 'pickup_instructions'
                AND t_pickup_es.language_code = ?
            WHERE ai.apartment_id = ?
            ORDER BY ai.order_index ASC
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.id).all(),

        // POIs with translations (falls back to Spanish when missing)
        hasAssignedPois
        ? env.DB.prepare(`
            SELECT
                p.id, p.category, p.latitude, p.longitude, p.google_maps_url,
                p.rating, p.travel_time_text, p.travel_mode, p.distance_text,
                p.poi_type, p.access_type, p.price_display, p.duration_text, p.is_bookable,
                p.address, p.phone, p.website_url, p.booking_url, p.opening_hours,
                p.is_featured, p.cover_image_url,
                ${promotedExpr('p')} AS is_promoted,
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
            ORDER BY ${orderClause('p', 'gap.order_override')}
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.id).all()
        : env.DB.prepare(`
            SELECT
                p.id, p.category, p.latitude, p.longitude, p.google_maps_url,
                p.rating, p.travel_time_text, p.travel_mode, p.distance_text,
                p.poi_type, p.access_type, p.price_display, p.duration_text, p.is_bookable,
                p.address, p.phone, p.website_url, p.booking_url, p.opening_hours,
                p.is_featured, p.cover_image_url,
                ${promotedExpr('p')} AS is_promoted,
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
            ORDER BY ${orderClause('p', null)}
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.zone_id).all(),

        // Experiences = bookable items, now sourced from the unified guide_pois
        // table (is_bookable = TRUE). Translations live under entity_type='poi'.
        // subcategory is aliased back to service_subcategory to keep the API shape.
        env.DB.prepare(`
            SELECT
                e.id, e.category, e.subcategory AS service_subcategory, e.action_type, e.action_data, e.action_prefilled_message,
                e.price_display, e.cover_image_url, e.is_featured,
                e.discount_display, e.original_price_display, e.badge_type,
                e.address, e.phone, e.website_url, e.booking_url, e.opening_hours,
                e.rating, e.travel_time_text, e.travel_mode, e.distance_text, e.duration_text,
                -- CTA doble + afiliación (migración 0091). Se resuelven en JS
                -- (resolveExperienceCta) para que guía y TV no puedan divergir.
                e.action_is_affiliate, e.affiliate_code,
                e.secondary_action_type, e.secondary_action_data, e.secondary_action_prefilled_message,
                ${promotedExpr('e')} AS is_promoted,
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
            -- Override de orden/visibilidad de ESTE apartamento sobre el catálogo
            -- de la zona (migración 0091). LEFT JOIN, no INNER: un apartamento que
            -- no ha tocado nada sigue viendo la zona entera en su orden global.
            LEFT JOIN guide_apartment_item_order aio
                ON aio.item_id = e.id AND aio.item_type = 'experience' AND aio.apartment_id = ?
            WHERE e.zone_id = ? AND e.is_active = TRUE AND e.is_bookable = TRUE
              AND COALESCE(aio.is_hidden, 0) = 0
            ORDER BY ${orderClause('e', 'aio.order_override')}
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.id, apartment.zone_id).all(),

        // Zone restaurants (bridge to existing restaurants table). address/city/country
        // (no lat/long on this table — restaurants live outside guide_pois, ver
        // BDschemaFinal.sql) alimentan el botón "Cómo Llegar": Google Maps admite
        // texto libre como destination=, no hace falta geocodificar aquí.
        env.DB.prepare(`
            SELECT
                r.id, r.name, r.slug, r.address, r.city, r.country,
                r.phone, r.website, r.description,
                zr.tier, zr.cuisine_type_override AS cuisine_type,
                ${promotedExpr('zr')} AS is_promoted,
                (SELECT dm.r2_key FROM dish_media dm
                 JOIN dishes d ON dm.dish_id = d.id
                 WHERE d.restaurant_id = r.id AND dm.is_primary = 1
                 LIMIT 1) AS cover_image
            FROM guide_zone_restaurants zr
            JOIN restaurants r ON zr.restaurant_id = r.id AND r.is_active = TRUE
            LEFT JOIN guide_apartment_item_order aio
                ON aio.item_id = r.id AND aio.item_type = 'restaurant' AND aio.apartment_id = ?
            WHERE zr.zone_id = ? AND zr.is_active = TRUE
              AND COALESCE(aio.is_hidden, 0) = 0
            -- Antes: ABS(RANDOM()) % 1000 para todo lo que no tuviera
            -- order_override, que no se podía fijar desde el admin — o sea,
            -- para todo. Y como esta respuesta se cachea en KV, el "azar" se
            -- congelaba dentro de la entrada: ni ordenado ni rotando.
            -- Ahora: promoción de pago → tier destacado → orden manual →
            -- alfabético como último desempate estable.
            ORDER BY
                CASE WHEN ${promotedExpr('zr')} THEN 0 ELSE 1 END,
                COALESCE(zr.promotion_rank, ${LAST}),
                CASE WHEN zr.tier = 'featured' THEN 0 ELSE 1 END,
                COALESCE(aio.order_override, zr.order_override, ${LAST}),
                r.name
        `).bind(apartment.id, apartment.zone_id).all(),

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
        `).bind(lang, lang, lang, apartment.id).first(),

        // Store items: TRES ámbitos fusionados en un solo array, de más específico
        // a más general:
        //   · apartment_id = este piso  → productos sólo de este alojamiento
        //   · owner_type='agency'       → catálogo del property manager: sale en
        //                                 TODAS sus propiedades
        //   · owner_type='platform'     → catálogo de VisualTaste, slot reservado
        //                                 que la agencia no edita ni borra
        //                                 (ver migrations/0080_guide_store.sql)
        //
        // El nivel de agencia se añadió porque un PM ofrece los mismos extras en
        // todos sus pisos (salida tardía, cesta de bienvenida, traslado): sin él,
        // seis productos por cinco pisos eran treinta filas y treinta juegos de
        // traducciones a los 13 idiomas, que había que editar de una en una. Las
        // excepciones no obligan a duplicar nada: se ocultan o se recolocan en el
        // piso concreto con guide_apartment_item_order — el mismo mecanismo que ya
        // usaban los productos 'platform'.
        env.DB.prepare(`
            SELECT
                si.id, si.owner_type, si.category, si.icon_name,
                si.price_amount, si.price_currency, si.price_display,
                si.cover_image_url, si.is_featured, si.stock_unlimited, si.stock_qty,
                ${promotedExpr('si')} AS is_promoted,
                COALESCE(t_name.value, t_name_es.value) AS name,
                COALESCE(t_desc.value, t_desc_es.value) AS description,
                COALESCE(t_cta.value, t_cta_es.value) AS cta_label
            FROM guide_store_items si
            LEFT JOIN translations t_name ON si.id = t_name.entity_id
                AND t_name.entity_type = 'store_item'
                AND t_name.field = 'name'
                AND t_name.language_code = ?
            LEFT JOIN translations t_name_es ON si.id = t_name_es.entity_id
                AND t_name_es.entity_type = 'store_item'
                AND t_name_es.field = 'name'
                AND t_name_es.language_code = ?
            LEFT JOIN translations t_desc ON si.id = t_desc.entity_id
                AND t_desc.entity_type = 'store_item'
                AND t_desc.field = 'description'
                AND t_desc.language_code = ?
            LEFT JOIN translations t_desc_es ON si.id = t_desc_es.entity_id
                AND t_desc_es.entity_type = 'store_item'
                AND t_desc_es.field = 'description'
                AND t_desc_es.language_code = ?
            LEFT JOIN translations t_cta ON si.id = t_cta.entity_id
                AND t_cta.entity_type = 'store_item'
                AND t_cta.field = 'cta_label'
                AND t_cta.language_code = ?
            LEFT JOIN translations t_cta_es ON si.id = t_cta_es.entity_id
                AND t_cta_es.entity_type = 'store_item'
                AND t_cta_es.field = 'cta_label'
                AND t_cta_es.language_code = ?
            -- Los ítems 'host' ya son de este apartamento (su order_index basta).
            -- El override existe por los HEREDADOS, que no lo son: los 'platform'
            -- (catálogo de VisualTaste) y los 'agency' (catálogo del property
            -- manager, en todas sus propiedades). Es lo que permite que un piso
            -- concreto recoloque u oculte algo que no ha escrito él — y, en el
            -- caso de agencia, es el mecanismo entero de las excepciones.
            LEFT JOIN guide_apartment_item_order aio
                ON aio.item_id = si.id AND aio.item_type = 'store_item' AND aio.apartment_id = ?
            WHERE si.is_active = TRUE
              AND (si.apartment_id = ?
                   OR si.owner_type = 'platform'
                   OR (si.owner_type = 'agency' AND si.agency_id = ?))
              AND COALESCE(aio.is_hidden, 0) = 0
            ORDER BY ${orderClause('si', 'aio.order_override')}
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, lang, FALLBACK_LANG, apartment.id, apartment.id, apartment.agency_id).all(),

        // Apartment phones (migración 0084) — la agencia va siempre primera por
        // order_index del catálogo (10), luego policía/bomberos/ambulancia/otro.
        env.DB.prepare(`
            SELECT
                p.id, p.category_key, p.phone_number, p.label,
                pc.icon_name AS category_icon_name,
                COALESCE(t_name.value, t_name_es.value) AS category_name
            FROM guide_apartment_phones p
            JOIN guide_phone_categories pc ON p.category_key = pc.key
            LEFT JOIN translations t_name ON pc.key = t_name.entity_id
                AND t_name.entity_type = 'phone_category' AND t_name.field = 'name' AND t_name.language_code = ?
            LEFT JOIN translations t_name_es ON pc.key = t_name_es.entity_id
                AND t_name_es.entity_type = 'phone_category' AND t_name_es.field = 'name' AND t_name_es.language_code = ?
            WHERE p.apartment_id = ?
            ORDER BY pc.order_index ASC, p.order_index ASC
        `).bind(lang, FALLBACK_LANG, apartment.id).all(),

        // Sibling cities in the same region (Costa del Sol today), each with its
        // own visitable-POI count, for the Explore tab's city picker. Resolved via
        // a subquery on this apartment's own zone rather than a second round-trip,
        // since `zone` above isn't awaited yet when this array is built. Same
        // is_active/coords/latitude-not-null filter as the POIs query below, so the
        // count shown here always matches what /guide/:slug/explore?zone=<slug>
        // actually returns.
        env.DB.prepare(`
            SELECT z2.id, z2.name, z2.slug, z2.latitude, z2.longitude, z2.cover_image_url,
                   COUNT(p.id) AS poi_count
            FROM guide_zones z2
            LEFT JOIN guide_pois p
                   ON p.zone_id = z2.id AND p.is_active = TRUE AND p.latitude IS NOT NULL
            WHERE z2.region = (SELECT region FROM guide_zones WHERE id = ?) AND z2.is_active = TRUE
            GROUP BY z2.id, z2.name, z2.slug, z2.latitude, z2.longitude, z2.cover_image_url
            ORDER BY z2.name ASC
        `).bind(apartment.zone_id).all()
    ]);

    if (!zone) {
        return errorResponse('Zone not found for this apartment', 404);
    }

    const mediaOrigin = origin || DEFAULT_MEDIA_ORIGIN;

    // 3. Load POI + experience media. Bookable rows are the same guide_pois
    // table (migration 0059 unified it), so a experience can have a
    // guide_poi_media gallery exactly like a place — the admin upload endpoint
    // never distinguished between the two. cover_image_url stays a separate
    // single-image fallback for experiences that only ever set that field.
    const poiIds = (pois.results || []).map(p => p.id);
    const experienceIds = (experiences.results || []).map(e => e.id);
    const poiMedia = await loadPoiMedia(env, [...poiIds, ...experienceIds], mediaOrigin);

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
    // Contexto de sustitución de los CTA. `sub_id` es lo que verá Francisco en
    // el panel del afiliado, así que va legible: "<slug del piso>-<guide|tv>".
    const baseCtaContext = {
        apartmentId: apartment.id,
        apartmentName: apartment.name,
        surface,
        subId: `${apartment.slug}-${surface}`,
    };

    const processedExperiences = (experiences.results || []).map(exp => {
        const cta = resolveExperienceCta(exp, { ...baseCtaContext, affiliateCode: exp.affiliate_code });
        return {
            id: exp.id,
            name: exp.name || exp.id,
            description: exp.description || '',
            category: exp.category,
            service_subcategory: exp.service_subcategory || null,
            // Ya resueltos: si hay CTA secundario, es este. Los clientes sólo
            // pintan lo que llega — no vuelven a decidir.
            action_type: cta.action_type,
            action_data: cta.action_data,
            prefilled_message: cta.prefilled_message,
            // 'affiliate' | 'direct'. La guía y la TV avisan de publicidad sólo
            // en las tarjetas cuyo enlace es retribuido.
            cta_source: cta.cta_source,
            is_promoted: exp.is_promoted === 1,
            price_display: exp.price_display,
            original_price_display: exp.original_price_display,
            discount_display: exp.discount_display,
            badge_type: exp.badge_type,
            cover_image_url: exp.cover_image_url,
            is_featured: exp.is_featured === 1,
            // Una sola etiqueta por ítem: como sólo se muestra un CTA, describe
            // siempre el que se muestre. El defecto se calcula sobre el tipo YA
            // resuelto, no sobre el principal.
            cta_label: exp.cta_label || (cta.action_type === 'WHATSAPP' ? 'WhatsApp' : 'Reservar'),
            // Mismos campos de contacto/distancia que un POI normal: un bookable
            // sigue siendo un sitio real (guide_pois unificó ambos, migración 0059).
            address: exp.address || null,
            phone: exp.phone || null,
            website_url: exp.website_url || null,
            // Se guardaba desde el admin desde la migración 0059 y no se devolvía
            // en ninguna respuesta: dato fantasma. Es la página de reservas propia
            // del sitio (informativa), distinta del CTA resuelto de arriba.
            booking_url: exp.booking_url || null,
            opening_hours: exp.opening_hours || null,
            rating: exp.rating ?? null,
            travel_time_text: exp.travel_time_text || null,
            travel_mode: exp.travel_mode || null,
            distance_text: exp.distance_text || null,
            duration_text: exp.duration_text || null,
            media: poiMedia[exp.id] || []
        };
    });

    const wifiInfoRow = (apartmentInfo.results || []).find(info => info.info_key === 'wifi');
    const wifiFallback = parseWifiFromInfo(wifiInfoRow?.content);
    const wifiPassword = apartment.wifi_password || wifiFallback.password;

    const responseData = {
        success: true,
        apartment: {
            id: apartment.id,
            name: apartment.name,
            slug: apartment.slug,
            address: apartment.address,
            cover_image_url: apartment.cover_image_url,
            // Exposed for the Explore tab: straight-line distance to POIs in a
            // city other than home (those don't have a precomputed travel_time_text).
            // null for apartments the host never geocoded — the frontend just
            // omits the distance row rather than showing 0km or lying.
            latitude: apartment.latitude ?? null,
            longitude: apartment.longitude ?? null,
            checkin_time: apartment.checkin_time || null,
            checkout_time: apartment.checkout_time || null,
            checkin_time: apartment.checkin_time || null,
            checkout_time: apartment.checkout_time || null,
            wifi: {
                ssid: apartment.wifi_ssid || wifiFallback.ssid,
                password: wifiPassword,
                // wifi_security no tiene selector en ningún sitio del admin
                // (ni el formulario ni la importación) — en la práctica es
                // siempre el 'WPA' por defecto de la columna, nunca una
                // elección real del anfitrión. La única señal fiable de si
                // la red pide contraseña es si HAY contraseña: declarar WPA
                // sin ella rompe el autoconectado del QR de la TV (el móvil
                // pide una clave que no existe en vez de conectarse solo).
                security: wifiPassword ? (apartment.wifi_security || 'WPA') : 'nopass'
            },
            info: (apartmentInfo.results || []).map(info => ({
                id: info.id,
                key: info.info_key,
                category: info.category_key,
                icon: info.icon || 'info',
                color: info.category_color || null,
                title: info.title || info.info_key,
                // Only meaningful when it differs from `title` — i.e. the host
                // wrote a custom title on top of the category (e.g. "Lavadora —
                // planta baja"). The frontend uses this to show the category as
                // a small eyebrow above the custom headline; when there's no
                // custom title the two are identical, so showing both would
                // just repeat the same word twice.
                category_name: info.category_name || null,
                content: info.content || '',
                // Punto de recogida opcional (migración 0084) — solo relevante cuando
                // difiere de la ubicación del apartamento (código de entrada en la
                // agencia, parking en otra dirección...). null/null si no se ha
                // configurado, el frontend simplemente no muestra el botón "Cómo llegar".
                pickup_instructions: info.pickup_instructions || null,
                latitude: info.latitude ?? null,
                longitude: info.longitude ?? null,
                // Apartment-specific photos (guide_apartment_media) always win.
                // category_image_url is the shared stock photo for this category
                // (migration 0083, still empty for most categories at launch —
                // null here just means "no photo", the frontend falls back to
                // icon+color). Kept separate from `media` rather than synthesized
                // into it, so the UI can tell "the host's own photo" apart from
                // "the shared default" if that distinction ever matters.
                media: aptMedia[info.id] || [],
                category_image_url: info.category_image_r2_key ? `${mediaOrigin}/media/${info.category_image_r2_key}` : null
            })),
            // Teléfonos (migración 0084) — ya vienen ordenados agencia-primero desde
            // la query (pc.order_index). Vacío si el anfitrión no ha configurado
            // ninguno; el frontend simplemente no muestra la fila "Teléfonos".
            phones: (apartmentPhones.results || []).map(p => ({
                id: p.id,
                category: p.category_key,
                icon: p.category_icon_name || 'call',
                name: p.label || p.category_name || p.category_key,
                phone_number: p.phone_number
            }))
        },
        zone: {
            id: zone.id,
            name: zone.name,
            slug: zone.slug,
            region: zone.region,
            country: zone.country || null,
            // Fallback center for the Explore map when there are no POIs to
            // fitBounds() on (e.g. every POI filtered out). Was already selected
            // by the query above but never made it into the response until now.
            latitude: zone.latitude ?? null,
            longitude: zone.longitude ?? null,
            cover_image_url: zone.cover_image_url,
            description: zoneDesc?.value || ''
        },
        // Sibling cities in the same region, for the Explore tab's city picker.
        // is_home flags the apartment's own zone so the frontend can badge it and
        // skip refetching it via /guide/:slug/explore (this payload already has
        // its full, possibly host-curated, POI list in `pois` below).
        cities: (cities.results || []).map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            latitude: c.latitude,
            longitude: c.longitude,
            cover_image_url: c.cover_image_url,
            poi_count: c.poi_count || 0,
            is_home: c.slug === zone.slug
        })),
        agency: {
            id: agency?.id,
            name: agency?.name || 'Host',
            logo_url: agency?.logo_url,
            primary_color: agency?.primary_color || null,
            secondary_color: agency?.secondary_color || null,
            accent_color: agency?.accent_color || null,
            headline_font: agency?.headline_font || null,
            body_font: agency?.body_font || null,
            label_font: agency?.label_font || null,
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
            // Access/pricing: sin esto, en "Ubicaciones" un museo de pago se ve
            // igual que una cala gratuita y que una experiencia reservable.
            poi_type: poi.poi_type || 'sight',
            access_type: poi.access_type || 'free',
            price_display: poi.price_display || '',
            duration_text: poi.duration_text || '',
            is_bookable: poi.is_bookable === 1,
            // Contacto directo (migración 0059 ya traía las columnas; nunca se
            // habían expuesto fuera del admin). null cuando el host no lo rellenó,
            // el frontend simplemente omite esa fila.
            address: poi.address || null,
            phone: poi.phone || null,
            website_url: poi.website_url || null,
            booking_url: poi.booking_url || null,
            opening_hours: poi.opening_hours || null,
            is_featured: poi.is_featured === 1,
            is_promoted: poi.is_promoted === 1,
            media: poiMedia[poi.id] || [],
            cover_image_url: poi.cover_image_url || null
        })),
        restaurants: (zoneRestaurants.results || []).map(r => ({
            id: r.id,
            name: r.name,
            slug: r.slug,
            cuisine_type: r.cuisine_type,
            tier: r.tier,
            is_promoted: r.is_promoted === 1,
            cover_image: r.cover_image ? `${mediaOrigin}/media/${r.cover_image}` : null,
            // Sin lat/long en esta tabla (restaurants vive fuera de guide_pois) —
            // el botón "Cómo llegar" arma el destino de Google Maps con este texto.
            address: r.address || null,
            city: r.city || null,
            country: r.country || null,
            phone: r.phone || null,
            website: r.website || null,
            description: r.description || ''
        })),
        experiences: processedExperiences,
        store_items: (storeItems.results || []).map(item => ({
            id: item.id,
            owner_type: item.owner_type,
            category: item.category,
            icon: item.icon_name,
            name: item.name || item.id,
            description: item.description || '',
            price_amount: item.price_amount,
            price_currency: item.price_currency,
            price_display: item.price_display || (item.price_amount != null
                ? `${item.price_amount.toFixed(2)} ${item.price_currency || 'EUR'}`
                : ''),
            cover_image_url: item.cover_image_url,
            is_featured: item.is_featured === 1,
            is_promoted: item.is_promoted === 1,
            in_stock: item.stock_unlimited === 1 || (item.stock_qty ?? 0) > 0,
            cta_label: item.cta_label || null
        })),
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

/**
 * GET /guide/:apartment_slug/explore?zone=<zone_slug>&lang=xx
 *
 * "Browse another city" for the Explore map tab: given an apartment (proves the
 * caller has a legitimate guidebook link — this stays unauthenticated like the
 * rest of /guide/*, so it's scoping, not a security boundary) and a target zone
 * slug, returns that zone's full POI catalog plus the list of sibling cities in
 * the same region.
 *
 * Deliberately never used for the apartment's own home zone: GET /guide/:slug
 * already returns that zone's POIs in `pois`, which may be a host-curated
 * subset/order (guide_apartment_pois.order_override) — this endpoint always
 * returns the *uncurated* full zone catalog, so calling it for home would
 * silently drop that curation. The frontend keeps the home zone's POIs from
 * the main payload and only calls this for a different zone.
 */
export async function handleGetExplore(env, apartmentSlug, zoneSlug, lang, origin) {
    if (!zoneSlug) return errorResponse('zone is required', 400);

    // 1. Resolve the apartment's own region + home zone slug. Also doubles as
    // the "does this apartment slug exist and is it active" check.
    const home = await env.DB.prepare(`
        SELECT z.region AS region, z.slug AS home_zone_slug
        FROM guide_apartments a
        JOIN guide_zones z ON a.zone_id = z.id
        WHERE a.slug = ? AND a.is_active = TRUE
    `).bind(apartmentSlug).first();

    if (!home) return errorResponse('Apartment not found', 404);

    // 2. Resolve the target zone and confirm it's in the same region as home.
    // Without this check, any live apartment slug becomes a key to browse every
    // zone in the database, not just the ones a guest could plausibly want.
    const zone = await env.DB.prepare(`
        SELECT id, name, slug, country, region, latitude, longitude, cover_image_url
        FROM guide_zones WHERE slug = ? AND is_active = TRUE
    `).bind(zoneSlug).first();

    if (!zone || zone.region !== home.region) {
        return errorResponse('Zone not found', 404);
    }

    // KV cache: keyed by zone + lang, versioned by two independent counters —
    // ver:zone:{slug} (bumped on any POI/experience edit within this zone, see
    // touchZoneGuideVersions) and ver:zonecatalog (bumped only when a zone itself
    // is created/edited, which changes the `cities` list every response includes).
    // Either one changing invalidates the cached payload.
    let cacheKey = null;
    if (env.GUIDE_CACHE) {
        const [zoneVer, catalogVer] = await Promise.all([
            getZoneExploreVersion(env, zone.slug),
            getZoneCatalogVersion(env),
        ]);
        cacheKey = `explore:${zone.slug}:${lang}:v${zoneVer}.${catalogVer}`;
        const cached = await env.GUIDE_CACHE.get(cacheKey);
        if (cached) {
            return new Response(cached, {
                headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
            });
        }
    }

    const [cities, pois] = await Promise.all([
        // Sibling cities in the same region — same shape/query as the `cities`
        // embedded in GET /guide/:slug, so the frontend uses one type for both.
        env.DB.prepare(`
            SELECT z2.id, z2.name, z2.slug, z2.latitude, z2.longitude, z2.cover_image_url,
                   COUNT(p.id) AS poi_count
            FROM guide_zones z2
            LEFT JOIN guide_pois p
                   ON p.zone_id = z2.id AND p.is_active = TRUE AND p.latitude IS NOT NULL
            WHERE z2.region = ? AND z2.is_active = TRUE
            GROUP BY z2.id, z2.name, z2.slug, z2.latitude, z2.longitude, z2.cover_image_url
            ORDER BY z2.name ASC
        `).bind(zone.region).all(),

        // Every active, mappable POI in the target zone. Unlike GET /guide/:slug,
        // there's no per-apartment curation to honor here — guide_apartment_pois
        // only ever applies to the guest's own home zone — so this is always the
        // full zone catalog, same projection as the p.zone_id branch of the main
        // guidebook query minus the apartment-relative travel fields.
        env.DB.prepare(`
            SELECT
                p.id, p.category, p.latitude, p.longitude, p.google_maps_url,
                p.rating, p.poi_type, p.access_type, p.price_display, p.duration_text, p.is_bookable,
                COALESCE(t_name.value, t_name_es.value) AS name,
                COALESCE(t_desc.value, t_desc_es.value) AS description
            FROM guide_pois p
            LEFT JOIN translations t_name ON p.id = t_name.entity_id
                AND t_name.entity_type = 'poi' AND t_name.field = 'name' AND t_name.language_code = ?
            LEFT JOIN translations t_name_es ON p.id = t_name_es.entity_id
                AND t_name_es.entity_type = 'poi' AND t_name_es.field = 'name' AND t_name_es.language_code = ?
            LEFT JOIN translations t_desc ON p.id = t_desc.entity_id
                AND t_desc.entity_type = 'poi' AND t_desc.field = 'description' AND t_desc.language_code = ?
            LEFT JOIN translations t_desc_es ON p.id = t_desc_es.entity_id
                AND t_desc_es.entity_type = 'poi' AND t_desc_es.field = 'description' AND t_desc_es.language_code = ?
            WHERE p.zone_id = ? AND p.is_active = TRUE AND p.latitude IS NOT NULL
            ORDER BY ${orderClause('p', null)}
        `).bind(lang, FALLBACK_LANG, lang, FALLBACK_LANG, zone.id).all(),
    ]);

    const mediaOrigin = origin || DEFAULT_MEDIA_ORIGIN;
    const poiIds = (pois.results || []).map(p => p.id);
    const poiMedia = await loadPoiMedia(env, poiIds, mediaOrigin);

    const responseData = {
        success: true,
        zone: {
            id: zone.id,
            name: zone.name,
            slug: zone.slug,
            region: zone.region,
            country: zone.country || null,
            latitude: zone.latitude ?? null,
            longitude: zone.longitude ?? null,
            cover_image_url: zone.cover_image_url,
        },
        cities: (cities.results || []).map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            latitude: c.latitude,
            longitude: c.longitude,
            cover_image_url: c.cover_image_url,
            poi_count: c.poi_count || 0,
            is_home: c.slug === home.home_zone_slug
        })),
        pois: (pois.results || []).map(poi => ({
            id: poi.id,
            name: poi.name || poi.id,
            description: poi.description || '',
            category: poi.category,
            latitude: poi.latitude,
            longitude: poi.longitude,
            google_maps_url: poi.google_maps_url,
            rating: poi.rating,
            // Travel times are relative to the guest's own apartment — meaningless
            // (and actively misleading) for a POI in a city that isn't home. The
            // frontend falls back to a straight-line distance from the apartment's
            // own lat/lng when these are null instead of reusing stale home-zone text.
            travel_time_text: null,
            travel_mode: null,
            distance_text: null,
            poi_type: poi.poi_type || 'sight',
            access_type: poi.access_type || 'free',
            price_display: poi.price_display || '',
            duration_text: poi.duration_text || '',
            is_bookable: poi.is_bookable === 1,
            media: poiMedia[poi.id] || []
        })),
        meta: {
            lang,
            is_home_zone: zone.slug === home.home_zone_slug
        }
    };

    if (env.GUIDE_CACHE && cacheKey) {
        await env.GUIDE_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 86400 });
    }

    return jsonResponse(responseData);
}
