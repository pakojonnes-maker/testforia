// workerGuideImport.js — Importador de POIs desde Google Maps
// =====================================================
// Endpoint: POST /guide/admin/import/places/preview   (superadmin)
//
// Resuelve una lista de URLs/textos de Google Maps a place_id, trae los datos
// vía Places API (New), los cruza con lo que ya hay en guide_pois (exacto por
// google_place_id, "probable duplicado" por cercanía+nombre, y "ya es cliente
// VisualTaste" contra guide_zone_restaurants) y devuelve un diff campo a campo
// para que el admin decida qué importar.
//
// Este módulo es DE SOLO LECTURA a propósito: no escribe en D1. El "commit"
// real (crear/actualizar el POI) lo hace el frontend llamando a los endpoints
// que YA existen — POST/PUT /guide/admin/pois — en workerGuideAdmin.js, que ya
// resuelven authz, traducciones (saveTranslations) e invalidación de caché
// (touchZoneGuideVersions). Duplicar esa escritura aquí sería la forma segura
// de que, con el tiempo, uno de los dos caminos se olvide de tocar la versión
// de KV y producción sirva datos viejos.
//
// Coste real de Google (revisar antes de tocar los field masks de abajo):
//  - Resolver URL/texto → place_id usa Text Search con field mask "places.id"
//    (SKU "IDs Only"): sin coste, no cuenta para ningún tope.
//  - Place Details con rating + editorialSummary cae en el SKU
//    "Enterprise + Atmosphere" ($40/1.000), que trae 1.000 llamadas gratis AL
//    MES. RATE_LIMIT_GOOGLE_DETAILS_BUDGET se queda por debajo de eso a
//    propósito — no lo subas sin revisar la SKU de nuevo.
//  - La foto de preview (Place Photo) es OTRA SKU aparte de coste no
//    verificado; por eso se pide como mucho una por POI y se falla en
//    silencio (null) si algo va mal, sin bloquear el resto del preview.
// =====================================================

import { verifyJWT, hitRateLimit } from './workerAuthentication.js';

const GOOGLE_PLACES_BASE = 'https://places.googleapis.com/v1';
const FETCH_TIMEOUT_MS = 8000;

// 60 previews/hora/usuario: red de seguridad anti-bucle, no un límite de
// negocio (un lote ya trae hasta 20 URLs).
const RATE_LIMIT_PREVIEW_PER_USER = { limit: 60, windowSeconds: 3600 };
// ~30 días. Se queda en 900 (no 1000) para dejar margen bajo el tope gratuito
// mensual de la SKU Enterprise+Atmosphere de Place Details (ver cabecera).
const RATE_LIMIT_GOOGLE_DETAILS_BUDGET = { limit: 900, windowSeconds: 2592000 };
const MAX_URLS_PER_BATCH = 20;
const LIKELY_MATCH_THRESHOLD = 0.72;
const BBOX_DEGREES = 0.002; // ~200 m, para acotar la búsqueda de duplicados por SQL antes de puntuar en JS.

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

// ---------------------------------------------------------------------------
// Resolución de URL/texto → place_id
// ---------------------------------------------------------------------------

// Heurística deliberadamente permisiva: los place_id "modernos" empiezan por
// ChIJ, pero hay ids legacy que no. Si esto acepta un token que NO es un
// place_id real, fetchPlaceDetails fallará más adelante con un error visible
// en el preview — no en silencio — así que pecar de aceptar de más aquí es
// seguro.
const PLACE_ID_LIKE = /^[A-Za-z0-9_-]{18,}$/;

function extractFromMapsUrl(urlObj) {
    const full = urlObj.toString();

    const qParam = urlObj.searchParams.get('q');
    if (qParam?.startsWith('place_id:')) {
        return { placeId: qParam.slice('place_id:'.length) };
    }
    const dataIdMatch = full.match(/place_id:([A-Za-z0-9_-]+)/);
    if (dataIdMatch) return { placeId: dataIdMatch[1] };

    // El pin real (!3d/!4d, dentro de data=) es más fiable que @lat,lng, que es
    // solo el centro del viewport en el momento de compartir el enlace.
    const pinMatch = full.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    const viewportMatch = full.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    const coordMatch = pinMatch || viewportMatch;

    const pathMatch = urlObj.pathname.match(/\/maps\/place\/([^/@]+)/);
    const pathName = pathMatch ? decodeURIComponent(pathMatch[1].replace(/\+/g, ' ')) : null;

    const cid = urlObj.searchParams.get('cid');

    if (coordMatch || pathName || cid) {
        return {
            name: pathName,
            lat: coordMatch ? parseFloat(coordMatch[1]) : null,
            lng: coordMatch ? parseFloat(coordMatch[2]) : null,
            cid,
        };
    }

    // Un enlace corto (share.google) a veces no resuelve a una ficha de Maps,
    // sino a una página de resultados/Knowledge Graph de Google
    // (google.com/search?q=Nombre&kgmid=...). El nombre en `q` sigue
    // sirviendo igual como texto de búsqueda para Text Search. Caso real
    // encontrado en producción 2026-08-02: share.google/xxxx devolvía
    // "No resuelto" porque solo se miraba la URL final tras seguir
    // redirecciones, y esa URL final ni siquiera es de dominio maps.*.
    const isGoogleSearchPage = /(^|\.)google\.[a-z.]+$/i.test(urlObj.hostname) && urlObj.pathname === '/search';
    if (isGoogleSearchPage && qParam) {
        return { name: qParam, lat: null, lng: null, cid: null };
    }

    return null;
}

/**
 * Sigue redirecciones HTTP (redirect:'manual', hasta 4 saltos) probando
 * extractFromMapsUrl en CADA salto antes de pedir el siguiente — no solo al
 * final. Importa de verdad: un enlace share.google normalmente pasa por una
 * URL intermedia que YA lleva el nombre del sitio en `q=`, y el salto
 * siguiente suele caer en un muro de consentimiento de cookies de Google
 * (un fetch de Worker no tiene cookie jar entre peticiones) que no aporta
 * nada y solo gasta saltos. Comprobar en cada parada evita perseguir esa
 * redirección inútil.
 */
async function resolveViaRedirects(startUrl) {
    let current = startUrl;
    for (let i = 0; i < 4; i++) {
        let urlObj;
        try { urlObj = new URL(current); } catch { return null; }

        const extracted = extractFromMapsUrl(urlObj);
        if (extracted) return extracted;

        let res;
        try {
            res = await fetch(current, {
                method: 'GET',
                redirect: 'manual',
                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VisualTasteImporter/1.0)' },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });
        } catch (err) {
            console.warn('[GuideImport] Fallo siguiendo enlace:', err.message);
            return null;
        }
        const location = res.headers.get('location');
        if (res.body) res.body.cancel().catch(() => {}); // no nos hace falta el cuerpo, solo la cabecera
        if (!location || res.status < 300 || res.status >= 400) return null;
        try {
            current = new URL(location, current).toString();
        } catch {
            return null;
        }
    }
    return null;
}

async function textSearchIdOnly(env, { textQuery, biasLat, biasLng, radius = 5000 }) {
    if (!textQuery) return null;
    const body = { textQuery, maxResultCount: 1, languageCode: 'es', regionCode: 'ES' };
    if (biasLat != null && biasLng != null) {
        body.locationBias = { circle: { center: { latitude: biasLat, longitude: biasLng }, radius } };
    }
    try {
        const res = await fetch(`${GOOGLE_PLACES_BASE}/places:searchText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask': 'places.id', // SKU "IDs Only": sin coste.
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) {
            console.warn('[GuideImport] Text Search falló', res.status, await res.text().catch(() => ''));
            return null;
        }
        const data = await res.json();
        return data.places?.[0]?.id || null;
    } catch (err) {
        console.warn('[GuideImport] Text Search error de red:', err.message);
        return null;
    }
}

/**
 * Acepta las formas habituales en que llega una ficha de Google Maps: un
 * place_id pelado, una URL larga de escritorio (con !3d/!4d o @lat,lng), un
 * enlace corto (maps.app.goo.gl, share.google, g.co...) que necesita seguir
 * redirecciones, o texto libre ("El Pimpi Málaga"), sesgado por `bias`
 * (normalmente la zona). No se mantiene una lista de dominios "conocidos" de
 * enlace corto — se prueba a extraer de la URL tal cual primero (gratis, sin
 * red) y solo si eso falla se siguen redirecciones probando en cada salto;
 * así cualquier dominio de acortador nuevo que Google introduzca funciona
 * igual sin tocar este código.
 * @returns {Promise<{placeId: string, via: string} | null>}
 */
export async function resolvePlaceRef(env, rawInput, bias = {}) {
    const input = (rawInput || '').trim();
    if (!input) return null;

    if (!/[\s/]/.test(input) && !input.includes('http') && PLACE_ID_LIKE.test(input)) {
        return { placeId: input, via: 'raw_id' };
    }

    let urlObj = null;
    try { urlObj = new URL(input); } catch { /* no es una URL: texto libre */ }

    if (urlObj) {
        let extracted = extractFromMapsUrl(urlObj);
        if (!extracted) {
            extracted = await resolveViaRedirects(urlObj.toString());
        }

        if (extracted?.placeId) return { placeId: extracted.placeId, via: 'url_place_id' };

        if (extracted?.name || extracted?.lat != null) {
            const placeId = await textSearchIdOnly(env, {
                textQuery: extracted.name || `${extracted.lat},${extracted.lng}`,
                biasLat: extracted.lat ?? bias.biasLat,
                biasLng: extracted.lng ?? bias.biasLng,
                radius: extracted.lat != null ? 500 : 5000, // pin conocido → radio ajustado; solo zona → más ancho
            });
            return placeId ? { placeId, via: 'url_search' } : null;
        }
        return null; // URL de maps.google.* reconocida pero sin nada resoluble (p.ej. solo ?cid= sin nombre)
    }

    const placeId = await textSearchIdOnly(env, { textQuery: input, biasLat: bias.biasLat, biasLng: bias.biasLng });
    return placeId ? { placeId, via: 'text_search' } : null;
}

// ---------------------------------------------------------------------------
// Place Details + mapeo a guide_pois
// ---------------------------------------------------------------------------

const PLACE_DETAILS_FIELD_MASK = [
    'id', 'displayName', 'formattedAddress', 'shortFormattedAddress', 'location',
    'types', 'primaryType', 'primaryTypeDisplayName', 'googleMapsUri', 'websiteUri',
    'internationalPhoneNumber', 'regularOpeningHours.weekdayDescriptions',
    'rating', 'userRatingCount', 'priceLevel', 'businessStatus',
    'editorialSummary', 'photos.name', 'photos.widthPx', 'photos.authorAttributions',
].join(',');

/** @throws {Error & {status?: number, body?: string}} si Google responde con error */
export async function fetchPlaceDetails(env, placeId) {
    const cacheKey = `gplace:${placeId}:es`;
    if (env.GUIDE_CACHE) {
        const cached = await env.GUIDE_CACHE.get(cacheKey, { type: 'json' }).catch(() => null);
        if (cached) return cached;
    }

    const res = await fetch(
        `${GOOGLE_PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=ES`,
        {
            headers: {
                'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }
    );
    if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw Object.assign(new Error(`Google Places respondió ${res.status}`), { status: res.status, body: bodyText });
    }
    const place = await res.json();

    if (env.GUIDE_CACHE) {
        // Mismo TTL que el resto del guide (workerGuideCache.js) y dentro del
        // margen de caché de 30 días que permiten los términos de Google.
        await env.GUIDE_CACHE.put(cacheKey, JSON.stringify(place), { expirationTtl: 86400 }).catch(() => {});
    }
    return place;
}

async function fetchPlacePhotoPreviewUrl(env, photoName) {
    if (!photoName) return null;
    try {
        const res = await fetch(
            `${GOOGLE_PLACES_BASE}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`,
            { headers: { 'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
        );
        if (!res.ok) return null;
        const data = await res.json();
        // photoUri es una URL de Google ya servible directamente (temporal, sin
        // key): así el frontend nunca ve nuestra GOOGLE_PLACES_API_KEY.
        return data.photoUri || null;
    } catch (err) {
        console.warn('[GuideImport] No se pudo obtener preview de foto:', err.message);
        return null;
    }
}

// primaryType (Google) → category/poi_type de guide_pois. CATEGORIES debe
// coincidir exactamente con la constante del mismo nombre en
// GuidePoisPage.tsx — si se añade una categoría allí, añadir aquí también.
// poi_type sigue el comentario de migrations/0059_unify_guide_pois.sql:
// sight|attraction|museum|beach|nature|service|experience. 'sight' es el
// cajón de sastre para "un sitio que merece una visita" cuando no aplica un
// valor más específico; esto es solo el punto de partida, se edita a mano.
const TYPE_TO_CATEGORY = {
    restaurant: ['Restaurantes', 'sight'], cafe: ['Restaurantes', 'sight'], bar: ['Restaurantes', 'sight'],
    bakery: ['Restaurantes', 'sight'], meal_takeaway: ['Restaurantes', 'sight'], meal_delivery: ['Restaurantes', 'sight'],
    night_club: ['Restaurantes', 'sight'], coffee_shop: ['Restaurantes', 'sight'], sandwich_shop: ['Restaurantes', 'sight'],
    museum: ['Cultura', 'museum'],
    art_gallery: ['Cultura', 'sight'], church: ['Cultura', 'sight'], hindu_temple: ['Cultura', 'sight'],
    mosque: ['Cultura', 'sight'], synagogue: ['Cultura', 'sight'], historical_landmark: ['Cultura', 'sight'],
    monument: ['Cultura', 'sight'], cultural_center: ['Cultura', 'sight'], city_hall: ['Cultura', 'sight'],
    beach: ['Playas', 'beach'],
    park: ['Naturaleza', 'nature'], national_park: ['Naturaleza', 'nature'], hiking_area: ['Naturaleza', 'nature'],
    natural_feature: ['Naturaleza', 'nature'], garden: ['Naturaleza', 'nature'], wildlife_park: ['Naturaleza', 'nature'],
    shopping_mall: ['Compras', 'sight'], clothing_store: ['Compras', 'sight'], store: ['Compras', 'sight'],
    market: ['Compras', 'sight'], supermarket: ['Compras', 'sight'], grocery_store: ['Compras', 'sight'],
    gift_shop: ['Compras', 'sight'],
    amusement_park: ['Actividades', 'sight'], water_park: ['Actividades', 'sight'], zoo: ['Actividades', 'sight'],
    aquarium: ['Actividades', 'sight'], spa: ['Actividades', 'sight'], bowling_alley: ['Actividades', 'sight'],
    movie_theater: ['Actividades', 'sight'], tourist_attraction: ['Actividades', 'sight'], visitor_center: ['Actividades', 'sight'],
};

export function mapGoogleTypeToCategory(primaryType) {
    const [category, poi_type] = TYPE_TO_CATEGORY[primaryType] || ['Otro', 'sight'];
    return { category, poi_type };
}

const PRICE_LEVEL_DISPLAY = {
    PRICE_LEVEL_FREE: 'Gratis',
    PRICE_LEVEL_INEXPENSIVE: '€',
    PRICE_LEVEL_MODERATE: '€€',
    PRICE_LEVEL_EXPENSIVE: '€€€',
    PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
};

export function mapPlaceToPoi(place) {
    const { category, poi_type } = mapGoogleTypeToCategory(place.primaryType);
    return {
        google_place_id: place.id,
        external_id: place.id,
        name_es: place.displayName?.text || null,
        // Semilla editable, no la verdad: es la sinopsis genérica de Google, se
        // espera que la reescribas con tu propio tono.
        description_es: place.editorialSummary?.text || null,
        address: place.shortFormattedAddress || place.formattedAddress || null,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null,
        google_maps_url: place.googleMapsUri || null,
        website_url: place.websiteUri || null,
        phone: place.internationalPhoneNumber || null,
        opening_hours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') || null,
        // Semilla de tu `rating`, no un espejo en vivo del de Google (ver
        // decisión en el plan): a partir de aquí es contenido tuyo.
        rating: place.rating ?? null,
        google_rating: place.rating ?? null,
        google_rating_count: place.userRatingCount ?? null,
        price_display: PRICE_LEVEL_DISPLAY[place.priceLevel] || null,
        category,
        poi_type,
        source: 'google_places',
        _photoName: place.photos?.[0]?.name || null,
    };
}

// ---------------------------------------------------------------------------
// Matching contra lo que ya hay en la BD
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
    'restaurante', 'restaurant', 'bar', 'cafe', 'cafeteria', 'hotel',
    'the', 'el', 'la', 'los', 'las', 'de', 'del',
]);

function normalizeName(s) {
    if (!s) return '';
    return s
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos (marcas diacríticas combinantes)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w && !STOPWORDS.has(w))
        .join(' ')
        .trim();
}

function trigrams(s) {
    if (s.length <= 3) return s ? [s] : [];
    const grams = [];
    for (let i = 0; i <= s.length - 3; i++) grams.push(s.slice(i, i + 3));
    return grams;
}

// Coeficiente de Dice sobre trigramas de caracteres: robusto a variaciones
// como "El Pimpi" vs "Restaurante El Pimpi" sin depender de ninguna librería
// de fuzzy-matching (D1/SQLite no trae una y el volumen por zona no lo pide).
export function nameSimilarity(a, b) {
    const na = normalizeName(a), nb = normalizeName(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    const ta = trigrams(na), tb = trigrams(nb);
    if (ta.length === 0 || tb.length === 0) return 0;
    const counts = new Map();
    for (const g of ta) counts.set(g, (counts.get(g) || 0) + 1);
    let overlap = 0;
    for (const g of tb) {
        const c = counts.get(g) || 0;
        if (c > 0) { overlap++; counts.set(g, c - 1); }
    }
    return (2 * overlap) / (ta.length + tb.length);
}

function flatDistanceMeters(lat1, lng1, lat2, lng2) {
    // Aproximación plana (no haversine): a la escala de un bbox de ~200 m el
    // error es irrelevante y evita funciones trigonométricas por fila en JS.
    const dLat = (lat1 - lat2) * 111320;
    const dLng = (lng1 - lng2) * 111320 * Math.cos((lat1 * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
}

const POI_MATCH_SELECT = `
    SELECT p.*,
        (SELECT value FROM translations WHERE entity_id = p.id AND entity_type = 'poi' AND language_code = 'es' AND field = 'name') AS name_es,
        (SELECT value FROM translations WHERE entity_id = p.id AND entity_type = 'poi' AND language_code = 'es' AND field = 'description') AS description_es
    FROM guide_pois p`;

async function matchClientRestaurant(env, zoneId, googleName) {
    if (!googleName) return null;
    const rows = await env.DB.prepare(`
        SELECT r.id, r.name FROM guide_zone_restaurants gzr
        JOIN restaurants r ON r.id = gzr.restaurant_id
        WHERE gzr.zone_id = ?
    `).bind(zoneId).all();

    let best = null;
    for (const r of rows.results || []) {
        const score = nameSimilarity(r.name, googleName);
        if (score >= LIKELY_MATCH_THRESHOLD && (!best || score > best.score)) {
            best = { restaurantId: r.id, name: r.name, score };
        }
    }
    return best;
}

/**
 * Cruza un place ya mapeado contra guide_pois: exacto (mismo google_place_id),
 * probable duplicado (cerca + nombre parecido, sin place_id propio todavía), o
 * ninguno. En paralelo, avisa si el nombre coincide con uno de tus
 * restaurantes clientes en esa zona (guide_zone_restaurants) — caso
 * comercialmente relevante que hoy pasaría desapercibido.
 */
export async function matchExistingPoi(env, zoneId, mapped) {
    if (mapped.google_place_id) {
        const exact = await env.DB.prepare(`${POI_MATCH_SELECT} WHERE p.google_place_id = ? LIMIT 1`)
            .bind(mapped.google_place_id).first();
        if (exact) {
            const clientMatch = await matchClientRestaurant(env, zoneId, mapped.name_es);
            return { poiMatch: { type: 'exact', poi: exact, score: 1 }, clientMatch };
        }
    }

    let poiMatch = { type: 'none', poi: null, score: 0 };
    if (mapped.latitude != null && mapped.longitude != null) {
        const candidates = await env.DB.prepare(`
            ${POI_MATCH_SELECT}
            WHERE p.zone_id = ? AND p.google_place_id IS NULL
              AND p.latitude BETWEEN ? AND ? AND p.longitude BETWEEN ? AND ?
        `).bind(
            zoneId,
            mapped.latitude - BBOX_DEGREES, mapped.latitude + BBOX_DEGREES,
            mapped.longitude - BBOX_DEGREES, mapped.longitude + BBOX_DEGREES
        ).all();

        for (const candidate of candidates.results || []) {
            const nameSim = nameSimilarity(candidate.name_es, mapped.name_es);
            const dist = flatDistanceMeters(mapped.latitude, mapped.longitude, candidate.latitude, candidate.longitude);
            const proximityScore = Math.max(0, 1 - dist / 250);
            const score = 0.6 * nameSim + 0.4 * proximityScore;
            if (score > poiMatch.score) poiMatch = { type: 'likely', poi: candidate, score };
        }
        if (poiMatch.score < LIKELY_MATCH_THRESHOLD) poiMatch = { type: 'none', poi: null, score: poiMatch.score };
    }

    const clientMatch = await matchClientRestaurant(env, zoneId, mapped.name_es);
    return { poiMatch, clientMatch };
}

// ---------------------------------------------------------------------------
// Diff campo a campo
// ---------------------------------------------------------------------------

const FIELD_DIFF_SPEC = [
    { key: 'name_es', label: 'Nombre' },
    { key: 'description_es', label: 'Descripción' },
    { key: 'category', label: 'Categoría' },
    { key: 'address', label: 'Dirección' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'website_url', label: 'Web' },
    { key: 'opening_hours', label: 'Horario' },
    { key: 'google_maps_url', label: 'Google Maps URL' },
    { key: 'latitude', label: 'Latitud' },
    { key: 'longitude', label: 'Longitud' },
    { key: 'rating', label: 'Rating' },
    { key: 'price_display', label: 'Precio' },
];

function normalizeForDiff(v) {
    return v === undefined || v === null ? '' : String(v).trim();
}

export function buildFieldDiff(existingPoi, mapped) {
    return FIELD_DIFF_SPEC.map(({ key, label }) => {
        const googleValue = mapped[key] ?? null;
        const currentValue = existingPoi ? (existingPoi[key] ?? null) : null;
        const hasCurrentValue = normalizeForDiff(currentValue) !== '';
        return {
            key,
            label,
            googleValue,
            currentValue,
            differs: normalizeForDiff(googleValue) !== normalizeForDiff(currentValue),
            // Premarcado SOLO si tú no tenías ya un valor propio: no pisar una
            // descripción que ya escribiste con la genérica de Google.
            defaultChecked: !hasCurrentValue && normalizeForDiff(googleValue) !== '',
        };
    });
}

// ---------------------------------------------------------------------------
// Handler HTTP
// ---------------------------------------------------------------------------

async function previewOne(env, rawUrl, zone) {
    try {
        const ref = await resolvePlaceRef(env, rawUrl, { biasLat: zone.latitude, biasLng: zone.longitude });
        if (!ref?.placeId) {
            return { input: rawUrl, status: 'unresolved', error: 'No se pudo identificar el lugar a partir de esta URL/texto.' };
        }

        if (env.RATE_LIMIT_KV) {
            const budget = await hitRateLimit(env, 'import:google_details_budget', RATE_LIMIT_GOOGLE_DETAILS_BUDGET);
            if (!budget.allowed) {
                return { input: rawUrl, status: 'budget_exceeded', error: 'Se alcanzó el límite mensual de consultas a Google Places.' };
            }
        }

        const place = await fetchPlaceDetails(env, ref.placeId);
        const mapped = mapPlaceToPoi(place);
        const match = await matchExistingPoi(env, zone.id, mapped);
        const fields = buildFieldDiff(match.poiMatch.poi, mapped);
        const photoPreviewUrl = await fetchPlacePhotoPreviewUrl(env, mapped._photoName);

        const status = match.poiMatch.type === 'exact' ? 'existing'
            : match.poiMatch.type === 'likely' ? 'likely_duplicate'
            : 'new';

        return {
            input: rawUrl,
            status,
            place_id: ref.placeId,
            resolved_via: ref.via,
            zone_id: zone.id,
            existing_poi_id: match.poiMatch.poi?.id || null,
            match_score: match.poiMatch.score ?? null,
            client_restaurant: match.clientMatch,
            photo_preview_url: photoPreviewUrl, // solo para pintar en el admin — nunca se guarda en R2
            fields,
        };
    } catch (err) {
        console.error('[GuideImport] Fallo importando', rawUrl, err.message);
        return { input: rawUrl, status: err.status === 404 ? 'not_found' : 'error', error: err.message };
    }
}

async function previewPlacesImport(env, body, userId) {
    if (!env.GOOGLE_PLACES_API_KEY) {
        console.warn('[GuideImport] GOOGLE_PLACES_API_KEY no configurado; importador desactivado');
        return errorResponse('google_places_not_configured', 503);
    }

    const { urls, zone_id } = body || {};
    if (!zone_id) return errorResponse('zone_id is required');
    if (!Array.isArray(urls) || urls.length === 0) return errorResponse('urls must be a non-empty array');
    if (urls.length > MAX_URLS_PER_BATCH) return errorResponse(`Maximum ${MAX_URLS_PER_BATCH} URLs per import batch`);

    const zone = await env.DB.prepare('SELECT id, latitude, longitude FROM guide_zones WHERE id = ?').bind(zone_id).first();
    if (!zone) return errorResponse('Zone not found', 404);

    if (env.RATE_LIMIT_KV) {
        const userLimit = await hitRateLimit(env, `import:user:${userId}`, RATE_LIMIT_PREVIEW_PER_USER);
        if (!userLimit.allowed) return errorResponse('rate_limited', 429);
    } else {
        console.warn('[GuideImport] RATE_LIMIT_KV no configurado: importador sin límite de uso');
    }

    const results = [];
    for (const rawUrl of urls) {
        results.push(await previewOne(env, rawUrl, zone));
    }
    return jsonResponse({ success: true, results });
}

/**
 * Registrar en worker.js ANTES del bloque genérico "/guide/admin/"
 * (handleGuideAdminRequests). Nota para la próxima sesión: empíricamente
 * handleGuideAdminRequests hace fallthrough con `return null` para rutas que
 * no reconoce (no un 404 duro pese a lo que sugiere el comentario sobre
 * /guide/admin/tv/* en worker.js) — así que registrar esto después también
 * funcionaría hoy. Se registra antes de todos modos para no depender de ese
 * detalle interno, igual que ya hace workerTvScreen.js.
 */
export async function handleGuideImportRequests(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/guide/admin/import/')) return null;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);
    const userData = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
    if (!userData) return errorResponse('Unauthorized', 401);
    if (userData.is_superadmin !== true) {
        return errorResponse('Only superadmin can import from Google Places', 403);
    }

    const path = url.pathname.replace('/guide/admin/import/', '');
    const method = request.method;

    try {
        if (path === 'places/preview' && method === 'POST') {
            let body;
            try { body = await request.json(); } catch { return errorResponse('Invalid JSON body'); }
            return await previewPlacesImport(env, body, userData.userId);
        }
        return null;
    } catch (error) {
        console.error('[GuideImport] Error:', error.message);
        return errorResponse('Import error: ' + error.message, 500);
    }
}
