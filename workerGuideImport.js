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
//
// Modo restaurante (body.mode === 'restaurant'; botón "Importar de Google" de
// "Restaurantes por zona"): mismo flujo, pero la ficha se mapea como restaurante
// (category 'Restaurantes', subcategory = tipo de cocina) y se piden a Google MÁS
// campos (RESTAURANT_DETAILS_FIELD_MASK: atributos de servicio, horarios por
// periodos, componentes de dirección...) para guardarlos en guide_pois.google_raw.
//  - Coste: el tramo de Place Details lo fija el campo MÁS caro de la máscara, y la
//    de POIs ya lleva editorialSummary (Enterprise + Atmosphere, el más alto). Todo
//    lo que añade la de restaurantes es de ese tramo o inferior: mismo precio por
//    llamada y el mismo tope gratuito (comprobado contra la documentación de Google,
//    2026-09-20).
//  - Fuera a propósito: reviews / reviewSummary / generativeSummary (contenido de
//    terceros o generado, con atribución obligatoria), las fotos (sus nombres
//    caducan y no se pueden guardar; sólo se usan para el preview) y todo lo
//    dinámico ("abierto ahora").
//  - Si Google rechaza la máscara ampliada (400: un campo renombrado o retirado en
//    una versión nueva de la API) se reintenta con la básica y el import sigue
//    funcionando; el raw deja anotada la máscara usada en _vt.fieldMask.
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

// Modo restaurante: la máscara básica MÁS los atributos que Google da de un sitio de
// comida (mismo tramo de precio, ver la cabecera). regularOpeningHours se pide por
// subcampos (periods, además del weekdayDescriptions que ya venía) para no traer
// `openNow`, que es "ahora" y envejece en cuanto se guarda. regularSecondaryOpeningHours
// (cocina, reparto, terraza) sí lo trae, y placeToRaw lo descarta.
const RESTAURANT_EXTRA_FIELDS = [
    'addressComponents', 'plusCode', 'viewport', 'googleMapsLinks', 'timeZone',
    'accessibilityOptions', 'nationalPhoneNumber', 'priceRange',
    'regularOpeningHours.periods', 'regularSecondaryOpeningHours',
    'delivery', 'dineIn', 'takeout', 'curbsidePickup', 'reservable', 'outdoorSeating',
    'servesBreakfast', 'servesBrunch', 'servesLunch', 'servesDinner', 'servesCoffee',
    'servesDessert', 'servesBeer', 'servesWine', 'servesCocktails', 'servesVegetarianFood',
    'goodForChildren', 'goodForGroups', 'goodForWatchingSports', 'menuForChildren',
    'liveMusic', 'allowsDogs', 'restroom', 'paymentOptions', 'parkingOptions',
];
export const RESTAURANT_DETAILS_FIELD_MASK = [PLACE_DETAILS_FIELD_MASK, ...RESTAURANT_EXTRA_FIELDS].join(',');

function requestPlaceDetails(env, placeId, fieldMask) {
    return fetch(
        `${GOOGLE_PLACES_BASE}/places/${encodeURIComponent(placeId)}?languageCode=es&regionCode=ES`,
        {
            headers: {
                'X-Goog-Api-Key': env.GOOGLE_PLACES_API_KEY,
                'X-Goog-FieldMask': fieldMask,
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        }
    );
}

/**
 * @param {{extended?: boolean}} [options] extended = máscara de restaurante.
 * @throws {Error & {status?: number, body?: string}} si Google responde con error
 */
export async function fetchPlaceDetails(env, placeId, { extended = false } = {}) {
    // La clave lleva la máscara: una ficha pedida con la básica no puede servir de
    // respuesta a una petición ampliada (le faltarían los atributos), ni al revés.
    const cacheKey = `gplace:${placeId}:es${extended ? ':rest' : ''}`;
    if (env.GUIDE_CACHE) {
        const cached = await env.GUIDE_CACHE.get(cacheKey, { type: 'json' }).catch(() => null);
        if (cached) return cached;
    }

    let res = await requestPlaceDetails(env, placeId, extended ? RESTAURANT_DETAILS_FIELD_MASK : PLACE_DETAILS_FIELD_MASK);
    let fieldMask = extended ? 'restaurant' : 'basic';
    if (extended && res.status === 400) {
        // Un campo de la máscara ampliada que Google haya renombrado o retirado no
        // debe tumbar el import entero: se reintenta con la básica.
        const detail = await res.text().catch(() => '');
        console.warn('[GuideImport] Google rechazó la máscara ampliada (400); reintento con la básica:', detail.slice(0, 300));
        res = await requestPlaceDetails(env, placeId, PLACE_DETAILS_FIELD_MASK);
        fieldMask = 'basic';
    }
    if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw Object.assign(new Error(`Google Places respondió ${res.status}`), { status: res.status, body: bodyText });
    }
    const place = await res.json();
    // Trazabilidad del raw: con qué máscara se pidió de verdad y cuándo. Clave propia (_vt),
    // no de Google, para que nunca pueda chocar con un campo que Google añada.
    place._vt = { fieldMask, fetched_at: new Date().toISOString() };

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

// Google solo informa `priceLevel` en una parte de los sitios (sobre todo
// hostelería). Sin señal devolvemos null y se queda el DEFAULT 'free' de la
// columna, que el host corrige a mano — mejor eso que inventar "de pago".
export function deriveAccessType(priceLevel) {
    if (!priceLevel) return null;
    if (priceLevel === 'PRICE_LEVEL_FREE') return 'free';
    return PRICE_LEVEL_DISPLAY[priceLevel] ? 'paid' : null;
}

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
        access_type: deriveAccessType(place.priceLevel),
        category,
        poi_type,
        source: 'google_places',
        _photoName: place.photos?.[0]?.name || null,
    };
}

// ---------------------------------------------------------------------------
// Modo restaurante (botón "Importar de Google" de "Restaurantes por zona")
// ---------------------------------------------------------------------------

// Google antepone en español "Restaurante" (y a veces "de/del/de la...") al tipo de
// cocina: "Restaurante italiano", "Restaurante de mariscos". Como etiqueta de un
// filtro de cocina esas palabras sobran.
const CUISINE_PREFIX = /^restaurante\s+(?:de(?:l|\s+la|\s+los|\s+las)?\s+)?(.+)$/i;

/**
 * Tipo de cocina legible a partir de primaryTypeDisplayName, que Google ya devuelve
 * en español (languageCode=es): "Restaurante de mariscos" → "Mariscos", "Cafetería" →
 * "Cafetería". null si sólo dice "Restaurante" (no aporta nada como filtro). Es la
 * semilla de guide_pois.subcategory, que el admin puede corregir a mano.
 */
export function cuisineFromGoogle(place) {
    const text = place?.primaryTypeDisplayName?.text?.trim();
    if (!text || /^restaurante$/i.test(text)) return null;
    const core = (text.match(CUISINE_PREFIX)?.[1] ?? text).trim();
    return core ? core.charAt(0).toUpperCase() + core.slice(1) : null;
}

const FOOD_TYPES = new Set([
    'food', 'restaurant', 'cafe', 'coffee_shop', 'bar', 'pub', 'wine_bar', 'bakery',
    'meal_takeaway', 'meal_delivery', 'sandwich_shop', 'ice_cream_shop', 'bar_and_grill',
]);

/** ¿Google lo considera un sitio de comida o bebida? (para avisar si pegaron un museo). */
export function isFoodPlace(place) {
    const types = [place?.primaryType, ...(place?.types || [])].filter(Boolean);
    return types.some(t => FOOD_TYPES.has(t) || t.endsWith('_restaurant'));
}

/**
 * Lo que se guarda en guide_pois.google_raw: la respuesta de Place Details SIN fotos
 * (sus nombres caducan y los ToS no permiten guardarlas) ni reseñas, y sin `openNow`,
 * que es un dato de "ahora mismo" y envejece en el instante de guardarlo. Ver la
 * migración 0095 para el aviso sobre los términos de Google.
 */
export function placeToRaw(place) {
    const { photos, reviews, ...rest } = place || {};
    return JSON.stringify(rest, (key, value) => (key === 'openNow' ? undefined : value));
}

/** mapPlaceToPoi + lo que sólo tiene sentido en un restaurante y los metadatos de Google. */
export function mapPlaceToRestaurant(place) {
    return {
        ...mapPlaceToPoi(place),
        // Se pegue lo que se pegue en "Restaurantes por zona", lo que sale es un
        // restaurante: aunque Google lo tipifique como hotel o comida para llevar.
        category: 'Restaurantes',
        subcategory: cuisineFromGoogle(place),
        google_types: JSON.stringify(place.types || []),
        google_primary_type: place.primaryType || null,
        business_status: place.businessStatus || null,
        price_level: place.priceLevel || null,
        google_raw: placeToRaw(place),
        _isFood: isFoodPlace(place), // sólo para el aviso del diálogo; no se guarda
    };
}

/** Avisos que el diálogo enseña junto a la ficha (y que la dejan en "Descartar" por defecto). */
export function restaurantWarnings(mapped) {
    const warnings = [];
    if (mapped.business_status === 'CLOSED_PERMANENTLY') warnings.push('permanently_closed');
    else if (mapped.business_status === 'CLOSED_TEMPORARILY') warnings.push('temporarily_closed');
    if (!mapped._isFood) warnings.push('not_food');
    return warnings;
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

// En modo restaurante el tipo de cocina también se ve y se elige en el diff, justo
// después de la categoría, y se pisa sólo si el admin no tenía ya uno propio (mismo
// criterio de defaultChecked que el resto de campos).
const RESTAURANT_FIELD_DIFF_SPEC = [
    ...FIELD_DIFF_SPEC.slice(0, 3),
    { key: 'subcategory', label: 'Tipo de cocina' },
    ...FIELD_DIFF_SPEC.slice(3),
];

export function buildFieldDiff(existingPoi, mapped, mode = 'poi') {
    const spec = mode === 'restaurant' ? RESTAURANT_FIELD_DIFF_SPEC : FIELD_DIFF_SPEC;
    return spec.map(({ key, label }) => {
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

async function previewOne(env, rawUrl, zone, mode) {
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

        const restaurantMode = mode === 'restaurant';
        const place = await fetchPlaceDetails(env, ref.placeId, { extended: restaurantMode });
        const mapped = restaurantMode ? mapPlaceToRestaurant(place) : mapPlaceToPoi(place);
        const match = await matchExistingPoi(env, zone.id, mapped);
        const fields = buildFieldDiff(match.poiMatch.poi, mapped, mode);
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
            // Fuera del diff de campos a propósito: es un derivado de `price_display`,
            // no un campo que se elija por separado. Solo se aplica al crear (ver
            // buildPayload en GuidePoisImportDialog) para no pisar lo que ya editó el host.
            access_type: mapped.access_type,
            // Sólo modo restaurante. import_meta son datos de Google, no contenido del host, así
            // que se reescriben siempre (también al actualizar) en vez de pasar por el diff campo
            // a campo. Van fuera de `fields` a propósito: google_raw pesa varios KB y no es algo
            // que se elija.
            import_meta: restaurantMode
                ? {
                    google_types: mapped.google_types,
                    google_primary_type: mapped.google_primary_type,
                    business_status: mapped.business_status,
                    price_level: mapped.price_level,
                    google_raw: mapped.google_raw,
                }
                : null,
            warnings: restaurantMode ? restaurantWarnings(mapped) : [],
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

    const { urls, zone_id, mode } = body || {};
    if (mode !== undefined && mode !== 'poi' && mode !== 'restaurant') {
        return errorResponse("mode must be 'poi' or 'restaurant'");
    }
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
        results.push(await previewOne(env, rawUrl, zone, mode));
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
