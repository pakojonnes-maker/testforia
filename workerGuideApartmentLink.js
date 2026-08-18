// workerGuideApartmentLink.js — Importador de apartamentos desde una URL
// =====================================================
// Endpoint: POST /guide/admin/import/apartments/from-url   (agencia propia o superadmin)
//
// Botón "Importar desde URL" junto al de Excel: el anfitrión/agencia pega la
// URL del piso (o directamente una dirección en texto) y este módulo intenta
// extraer nombre, ubicación, capacidad, fotos, etc. sin que nadie tenga que
// rellenar una plantilla.
//
// De dónde sale el dato (investigación, agosto 2026): un enlace de una ficha
// de Google Vacation Rentals/Travel NO es la fuente real — Google la recibe
// de la web del propietario o de su PMS (Lodgify, Guesty, Hostaway...), que
// para entrar en Google está OBLIGADA a publicar JSON-LD schema.org
// VacationRental (nombre, ≥8 fotos, lat/lng, capacidad...) y a enlazar su
// "sitio oficial" (Google desactiva las fichas que no lo tienen). Por eso la
// vía principal aquí es leer esa web, no la ficha de Google — que además es
// JS-rendered, pide consentimiento de cookies y su URL es un blob sin
// formato estable: raspar `google.com/travel` se rompe solo (comprobado en
// vivo antes de escribir este módulo). Cuando la URL resuelve ahí (incluida
// la mayoría de enlaces cortos share.google), se devuelve un mensaje
// accionable en vez de intentarlo.
//
// Cadena de resolución (ver resolveApartmentDraft):
//   1. Web propia / PMS del alojamiento → JSON-LD (VacationRental >
//      LodgingBusiness/Hotel/Apartment/House > Product > Place) con fallback
//      a OpenGraph. Vía principal: la única que da fotos, capacidad,
//      dormitorios, baños y amenities.
//   2. URL de Google Maps / place_id → resolvePlaceRef + fetchPlaceDetails
//      (workerGuideImport.js). Fallback: solo si el piso tiene ficha de
//      Google Business, que es minoría. Sin foto (ver nota junto a
//      resolveFromGoogleMaps).
//   3. Dirección en texto plano (no es una URL) → geocodeAddress
//      (workerGuideApartmentImport.js).
//   4. Cualquier otra página que acabe en un dominio de Google tras seguir
//      redirecciones (ficha de Travel, resultado de búsqueda/Knowledge
//      Graph, muro de consentimiento...) → no se parsea, se explica por qué
//      y qué pegar en su lugar.
//
// Este módulo es DE SOLO LECTURA a propósito, mismo motivo que los otros dos
// importadores del admin: el alta real la hace el frontend llamando a
// POST /guide/admin/apartments (workerGuideAdmin.js), que ya resuelve authz
// de agencia, seedDefaultPhones y la invalidación de caché KV. Duplicar esa
// escritura aquí es la forma segura de que, con el tiempo, un camino se
// olvide de tocar la versión de KV y producción sirva datos viejos.
//
// Guardarraíles del fetch saliente (esto acepta una URL arbitraria que pone
// un usuario autenticado, no una lista fija de dominios de Google): solo
// https, se bloquean hosts locales/privados por nombre (ver isSafeExternalUrl
// — defensa en profundidad; en producción Cloudflare ya aísla el Worker de
// redes internas, pero `wrangler dev` en local sí comparte red con la
// máquina), tope de 2 MB de respuesta, timeout de 8s y máximo 5 redirecciones
// re-validadas en cada salto.
// =====================================================

import { verifyJWT, hitRateLimit } from './workerAuthentication.js';
import { resolvePlaceRef, fetchPlaceDetails } from './workerGuideImport.js';
import { geocodeAddress, findLikelyDuplicate } from './workerGuideApartmentImport.js';

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB: de sobra para el <head> con el JSON-LD, corta antes de cargar vídeos/galerías embebidas.
const MAX_REDIRECTS = 5;
const MAX_IMAGES = 30;
const MAX_AMENITIES = 60;

// 30 análisis/hora/usuario: red de seguridad anti-bucle, no un límite de
// negocio (dar de alta un piso es una acción puntual, no un lote).
const RATE_LIMIT_PREVIEW_PER_USER = { limit: 30, windowSeconds: 3600 };
// Namespace de KV propio ('aptlink:'), distinto de 'aptimport:' (Excel) y
// 'import:' (POIs) — presupuestos independientes por importador, mismo
// patrón que los otros dos módulos.
const RATE_LIMIT_GOOGLE_MAPS_BUDGET = { limit: 300, windowSeconds: 2592000 };

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function errorResponse(message, status = 400) {
    return jsonResponse({ success: false, error: message }, status);
}

const MESSAGES = {
    google_page_unreadable:
        'Esa URL termina en una página de Google (ficha de Vacation Rentals, ' +
        'resultado de búsqueda o muro de cookies), no en la web del alojamiento: ' +
        'es una página dinámica que Google no permite leer así. Abre la ficha, ' +
        'pulsa el enlace al sitio oficial del alojamiento (Google exige que exista) ' +
        'y pega esa URL — trae más datos que la propia ficha de Google.',
    not_configured: 'La geocodificación / Google Places no está configurada en este entorno.',
    budget_exhausted: 'Se agotó el presupuesto de consultas a Google de este mes. Inténtalo más tarde o rellena los datos a mano.',
    place_not_resolved: 'No se ha podido identificar ningún lugar de Google Maps a partir de esa URL.',
    no_data_found: 'No se encontraron datos de apartamento en esa página (ni ficha schema.org ni metadatos). Prueba con la web oficial del alojamiento o rellena los datos a mano.',
    blocked_host: 'Esa dirección no se puede consultar por motivos de seguridad.',
    invalid_url: 'La URL no es válida.',
    fetch_failed: 'No se pudo descargar esa página.',
    too_many_redirects: 'Esa URL redirige demasiadas veces.',
    empty_input: 'Pega una URL o una dirección.',
    no_address: 'Escribe una dirección.',
    default: 'No se pudieron extraer datos de esa URL o dirección — rellena los datos a mano.',
};

// ---------------------------------------------------------------------------
// Guardarraíles de red (SSRF, tamaño, redirecciones)
// ---------------------------------------------------------------------------

// Bloqueo por nombre de host, no por resolución DNS (no hay forma barata de
// resolver+comprobar la IP desde un Worker antes de cada fetch): cubre el
// caso obvio (alguien pega http://localhost/... o una IP privada) y, sobre
// todo, `wrangler dev` en local, donde el Worker SÍ comparte red con la
// máquina que lo ejecuta.
const BLOCKED_HOSTNAME_RE = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0$|\[?::1\]?$|f[cd][0-9a-f]{2}:|fe80:)/i;

// Exportada: workerGuideAdmin.js la reutiliza para validar la URL de portada
// remota antes de descargarla a R2 (ver uploadGenericMediaFromUrl) — mismo
// criterio de host seguro en los dos sitios que hacen fetch de una URL
// puesta por el usuario, en vez de mantener dos copias de esta lista.
export function isSafeExternalUrl(urlObj) {
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') return false;
    const host = urlObj.hostname.toLowerCase();
    if (BLOCKED_HOSTNAME_RE.test(host)) return false;
    if (host.endsWith('.localhost')) return false;
    const priv172 = host.match(/^172\.(\d{1,3})\./);
    if (priv172 && Number(priv172[1]) >= 16 && Number(priv172[1]) <= 31) return false;
    return true;
}

function safeParseUrl(raw) {
    try { return new URL(raw); } catch { return null; }
}

/**
 * Descarga una página siguiendo redirecciones a mano (redirect: 'manual'),
 * re-validando el host en CADA salto — así una URL inicial inofensiva no
 * puede acabar sirviendo de trampolín a un host bloqueado. Corta la lectura
 * del cuerpo en MAX_HTML_BYTES en vez de fiarse de Content-Length (puede
 * faltar o mentir).
 */
async function fetchHtmlSafely(startUrl) {
    let current = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const urlObj = safeParseUrl(current);
        if (!urlObj) return { ok: false, reason: 'invalid_url' };
        if (!isSafeExternalUrl(urlObj)) return { ok: false, reason: 'blocked_host' };

        let res;
        try {
            res = await fetch(current, {
                redirect: 'manual',
                headers: {
                    'User-Agent': 'VisualTasteApartmentImporter/1.0 (+https://visualtastes.com)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            });
        } catch (err) {
            return { ok: false, reason: 'network_error', detail: err.message };
        }

        if ([301, 302, 303, 307, 308].includes(res.status)) {
            const location = res.headers.get('location');
            if (!location) return { ok: false, reason: `redirect_${res.status}_no_location` };
            const next = safeParseUrl(new URL(location, current).toString());
            if (!next) return { ok: false, reason: 'invalid_redirect' };
            current = next.toString();
            continue;
        }

        // No es una redirección: es la página final. Si un salto (p.ej.
        // share.google) terminó aterrizando en un dominio de Google, no se
        // lee el cuerpo — ni una ficha, ni una SERP, ni un muro de
        // consentimiento son legibles con un fetch simple (ver cabecera del
        // módulo) — se deja que resolveApartmentDraft decida (Maps → vía 2;
        // cualquier otro Google → mensaje accionable) sin gastar hasta 2 MB
        // de lectura en un cuerpo que se iba a tirar igualmente.
        if (isGoogleHost(urlObj.hostname)) {
            return { ok: false, reason: 'landed_on_google', finalUrl: current };
        }

        if (!res.ok) return { ok: false, reason: `http_${res.status}`, finalUrl: current };

        const contentType = res.headers.get('content-type') || '';
        if (contentType && !contentType.includes('html') && !contentType.includes('xml') && !contentType.includes('text/plain')) {
            return { ok: false, reason: 'not_html', finalUrl: current };
        }

        const html = await readBodyCapped(res, MAX_HTML_BYTES);
        return { ok: true, html, finalUrl: current };
    }
    return { ok: false, reason: 'too_many_redirects' };
}

async function readBodyCapped(res, maxBytes) {
    const reader = res.body?.getReader();
    if (!reader) return (await res.text()).slice(0, maxBytes);

    const chunks = [];
    let received = 0;
    while (received < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
    }
    reader.cancel().catch(() => {});

    const buffer = new Uint8Array(Math.min(received, maxBytes));
    let offset = 0;
    for (const chunk of chunks) {
        const room = buffer.length - offset;
        if (room <= 0) break;
        buffer.set(chunk.subarray(0, room), offset);
        offset += Math.min(chunk.length, room);
    }
    return new TextDecoder('utf-8').decode(buffer);
}

// ---------------------------------------------------------------------------
// Clasificación de la URL de entrada
// ---------------------------------------------------------------------------

// El regex ya cubre consent.google.com (termina en ".google.com") sin
// necesidad de un caso especial aparte — comprobado explícitamente.
function isGoogleHost(hostname) {
    return /(^|\.)google\.[a-z.]{2,}$/i.test(hostname);
}

// Enlaces que casi seguro son una ficha de Google MAPS: se resuelven mejor
// con resolvePlaceRef, que ya sabe seguir enlaces cortos de Maps por su
// cuenta (incluida la extracción de nombre desde un salto intermedio de
// Knowledge Graph), sin que este módulo descargue HTML primero.
// share.google queda FUERA a propósito: en ese dominio, el mismo formato de
// enlace corto sirve tanto para fichas de Maps como de Travel/Knowledge Graph
// (ver isUnreadableGoogleUrl), así que no se puede clasificar sin seguir la
// redirección primero.
function isLikelyGoogleMapsInput(urlObj) {
    const host = urlObj.hostname.toLowerCase();
    if (host === 'maps.app.goo.gl' || host === 'goo.gl') return true;
    if (!isGoogleHost(host)) return false;
    return urlObj.pathname.startsWith('/maps');
}

// Cualquier página que siga viviendo en un dominio de Google DESPUÉS de
// seguir redirecciones, y que no sea una ficha de Maps (esa tiene su propia
// vía 2, más arriba). No es solo /travel/hotels/entity/... — comprobado con
// casos reales de share.google: a veces cae en el muro de cookies
// (consent.google.com), otras en una página de resultados/Knowledge Graph
// (google.com/search?kgmid=...). ninguna de las tres es una web de
// alojamiento leíble con un fetch simple, así que las tres se tratan igual:
// se avisa en vez de intentar parsear la SERP de Google como si fuera la
// ficha del piso.
function isUnreadableGoogleUrl(urlObj) {
    return isGoogleHost(urlObj.hostname) && !isLikelyGoogleMapsInput(urlObj);
}

// ---------------------------------------------------------------------------
// Vía 2 — Google Maps (fallback)
// ---------------------------------------------------------------------------

function withSource(flatFields, source) {
    const out = {};
    for (const [key, value] of Object.entries(flatFields)) {
        out[key] = { value: value ?? null, source: (value ?? null) !== null ? source : null };
    }
    return out;
}

/**
 * Fallback, no la vía principal: la mayoría de pisos particulares no tienen
 * ficha de Google Business propia (Table A de tipos de Places no tiene
 * "alquiler vacacional"). No se pide foto de Places aquí a propósito — a
 * diferencia del importador de POIs, esto es solo un colchón cuando falla
 * todo lo demás, y una llamada más a Google (con su propia SKU) no se
 * justifica para un dato que va a ser secundario.
 */
async function resolveFromGoogleMaps(env, rawInput) {
    if (!env.GOOGLE_PLACES_API_KEY) return { ok: false, reason: 'not_configured' };

    if (env.RATE_LIMIT_KV) {
        const budget = await hitRateLimit(env, 'aptlink:google:budget', RATE_LIMIT_GOOGLE_MAPS_BUDGET);
        if (!budget.allowed) return { ok: false, reason: 'budget_exhausted' };
    }

    const ref = await resolvePlaceRef(env, rawInput, {});
    if (!ref?.placeId) return { ok: false, reason: 'place_not_resolved' };

    let place;
    try {
        place = await fetchPlaceDetails(env, ref.placeId);
    } catch (err) {
        return { ok: false, reason: err.status ? `google_${err.status}` : 'google_error' };
    }

    return {
        ok: true,
        source_kind: 'places',
        source_url: place.googleMapsUri || rawInput,
        fields: withSource({
            name: place.displayName?.text || null,
            description: place.editorialSummary?.text || null,
            address: place.shortFormattedAddress || place.formattedAddress || null,
            latitude: place.location?.latitude ?? null,
            longitude: place.location?.longitude ?? null,
        }, 'places'),
        images: [],
        source_payload: place,
    };
}

// ---------------------------------------------------------------------------
// Vía 3 — dirección en texto plano
// ---------------------------------------------------------------------------

async function resolveFromAddressText(env, address) {
    if (!address) return { ok: false, reason: 'no_address' };
    const geo = await geocodeAddress(env, address);
    if (!geo.ok) return { ok: false, reason: geo.reason };
    return {
        ok: true,
        source_kind: 'geocode',
        source_url: null,
        fields: withSource({
            name: null,
            address: geo.formatted_address || address,
            latitude: geo.latitude,
            longitude: geo.longitude,
        }, 'geocode'),
        images: [],
        source_payload: null,
    };
}

// ---------------------------------------------------------------------------
// Vía 1 — web propia / PMS: extracción JSON-LD + OpenGraph
// ---------------------------------------------------------------------------

function decodeHtmlEntities(s) {
    if (!s) return s;
    return s
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');
}

// Tolerante a propósito: una página con un <script type="application/ld+json">
// roto no debe tumbar la extracción entera, solo perder ese bloque.
function extractJsonLdBlocks(html) {
    const blocks = [];
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
        try {
            blocks.push(JSON.parse(m[1].trim()));
        } catch {
            // bloque roto: se ignora, no se aborta la extracción entera.
        }
    }
    return blocks;
}

function flattenGraph(blocks) {
    const nodes = [];
    for (const b of blocks) {
        if (Array.isArray(b)) { nodes.push(...b); continue; }
        if (Array.isArray(b?.['@graph'])) { nodes.push(...b['@graph']); continue; }
        if (b && typeof b === 'object') nodes.push(b);
    }
    return nodes;
}

// Orden de preferencia: cuanto más específico de alojamiento, mejor señal.
// 'Product' y 'Place' son el fallback de sitios que no siguen el vocabulario
// de hospedaje pero sí marcan algo con coordenadas/imagen.
const TYPE_PRIORITY = ['VacationRental', 'LodgingBusiness', 'Hotel', 'Apartment', 'House', 'Product', 'Place'];

function typeMatches(nodeType, want) {
    if (!nodeType) return false;
    const types = Array.isArray(nodeType) ? nodeType : [nodeType];
    return types.some(t => String(t).split('/').pop() === want);
}

function pickBestNode(nodes) {
    for (const want of TYPE_PRIORITY) {
        const found = nodes.find(n => typeMatches(n['@type'], want));
        if (found) return { node: found, matchedType: want };
    }
    return null;
}

function firstOf(v) { return Array.isArray(v) ? v[0] : v; }

function textOf(v) {
    if (v == null) return null;
    if (typeof v === 'string') return decodeHtmlEntities(v.trim()) || null;
    if (typeof v === 'object') return textOf(v.name ?? v.text ?? v['@value'] ?? null);
    return null;
}

function numberOf(v) {
    if (v == null) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'object') return numberOf(v.value ?? v['@value'] ?? null);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function imagesOf(v) {
    if (v == null) return [];
    const arr = Array.isArray(v) ? v : [v];
    return arr
        .map(img => {
            if (typeof img === 'string') return img;
            if (img && typeof img === 'object') return img.url || img.contentUrl || null;
            return null;
        })
        .filter(Boolean)
        .slice(0, MAX_IMAGES);
}

function addressOf(v) {
    if (v == null) return null;
    if (typeof v === 'string') return decodeHtmlEntities(v);
    if (typeof v === 'object') {
        const partOf = p => (typeof p === 'string' ? p : p?.name || null);
        const parts = [v.streetAddress, v.addressLocality, v.addressRegion, v.postalCode, v.addressCountry]
            .map(partOf)
            .filter(Boolean);
        return parts.length ? decodeHtmlEntities(parts.join(', ')) : null;
    }
    return null;
}

function amenitiesOf(...sources) {
    const all = [];
    for (const s of sources) {
        const arr = Array.isArray(s) ? s : (s ? [s] : []);
        for (const a of arr) {
            const name = typeof a === 'string' ? a : a?.name;
            if (name) all.push(decodeHtmlEntities(name));
        }
    }
    return [...new Set(all)].slice(0, MAX_AMENITIES);
}

/**
 * Lee un nodo JSON-LD del tipo que sea (VacationRental, LodgingBusiness...) y
 * su containsPlace (si lo tiene) mezclados: en la práctica, distintos sitios
 * reparten los mismos datos (ocupación, dormitorios, amenities) entre el
 * nodo principal y containsPlace de forma inconsistente, así que se leen de
 * los dos y se prioriza el nodo principal.
 */
function extractListingNode(node) {
    const place = firstOf(node.containsPlace) || {};
    const geo = node.geo || place.geo || {};

    return {
        name: textOf(node.name),
        description: textOf(node.description),
        property_type: textOf(node.additionalType) || textOf(place.additionalType),
        address: addressOf(node.address),
        latitude: numberOf(node.latitude ?? geo.latitude),
        longitude: numberOf(node.longitude ?? geo.longitude),
        checkin_time: textOf(node.checkinTime),
        checkout_time: textOf(node.checkoutTime),
        capacity: numberOf(place.occupancy?.value ?? place.occupancy ?? node.occupancy?.value),
        bedrooms: numberOf(node.numberOfBedrooms ?? place.numberOfBedrooms),
        bathrooms: numberOf(node.numberOfBathroomsTotal ?? place.numberOfBathroomsTotal),
        size_m2: numberOf(node.floorSize?.value ?? place.floorSize?.value),
        amenities: amenitiesOf(node.amenityFeature, place.amenityFeature),
        images: imagesOf(node.image),
    };
}

function extractOpenGraph(html) {
    const get = (prop) => {
        let m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']*)["']`, 'i'));
        if (!m) m = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${prop}["']`, 'i'));
        return m ? decodeHtmlEntities(m[1]) : null;
    };
    const images = [];
    const imgRe = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/gi;
    let m;
    while ((m = imgRe.exec(html)) && images.length < MAX_IMAGES) images.push(decodeHtmlEntities(m[1]));
    return { name: get('title'), description: get('description'), images };
}

function extractFromHtml(html, finalUrl) {
    const nodes = flattenGraph(extractJsonLdBlocks(html));
    const picked = pickBestNode(nodes);
    const listing = picked ? extractListingNode(picked.node) : null;
    const og = extractOpenGraph(html);

    const hasAnyData = listing || og.name || og.description || (og.images && og.images.length > 0);
    if (!hasAnyData) return { ok: false, reason: 'no_data_found' };

    const fields = {};
    const setField = (key, jsonldVal, ogVal) => {
        const jv = Array.isArray(jsonldVal) ? (jsonldVal.length ? jsonldVal : null) : jsonldVal;
        if (jv != null && jv !== '') fields[key] = { value: jv, source: 'jsonld' };
        else if (ogVal != null && ogVal !== '') fields[key] = { value: ogVal, source: 'opengraph' };
        else fields[key] = { value: null, source: null };
    };

    setField('name', listing?.name, og.name);
    setField('description', listing?.description, og.description);
    setField('address', listing?.address, null);
    setField('latitude', listing?.latitude, null);
    setField('longitude', listing?.longitude, null);
    setField('property_type', listing?.property_type, null);
    setField('checkin_time', listing?.checkin_time, null);
    setField('checkout_time', listing?.checkout_time, null);
    setField('capacity', listing?.capacity, null);
    setField('bedrooms', listing?.bedrooms, null);
    setField('bathrooms', listing?.bathrooms, null);
    setField('size_m2', listing?.size_m2, null);
    setField('amenities', listing?.amenities, null);

    const images = (listing?.images?.length ? listing.images : og.images) || [];

    return {
        ok: true,
        source_kind: listing ? 'jsonld' : 'opengraph',
        matched_type: picked?.matchedType || null,
        source_url: finalUrl,
        fields,
        images,
        // Todo lo extraído tal cual, sin filtrar por lo que la app usa hoy —
        // es la red de seguridad de la migración 0087 (columna
        // source_payload): si mañana hace falta un campo que hoy no se
        // mapea, ya está guardado y no hay que volver a pedirle la URL a
        // nadie.
        source_payload: { jsonld: nodes.length ? nodes : undefined, opengraph: og },
    };
}

// ---------------------------------------------------------------------------
// Orquestador
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<{ok: true, source_kind: string, source_url: string|null,
 *   fields: Record<string, {value: any, source: string|null}>, images: string[],
 *   source_payload: any} | {ok: false, reason: string}>}
 */
export async function resolveApartmentDraft(env, rawInput) {
    const input = (rawInput || '').trim();
    if (!input) return { ok: false, reason: 'empty_input' };

    const urlObj = safeParseUrl(input);
    if (!urlObj || (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:')) {
        // No es una URL http(s): vía 3, dirección en texto plano.
        return await resolveFromAddressText(env, input);
    }

    if (isLikelyGoogleMapsInput(urlObj)) {
        return await resolveFromGoogleMaps(env, input);
    }
    if (isUnreadableGoogleUrl(urlObj)) {
        // Pegaron directamente una URL de Google que no es de Maps (ficha de
        // Travel, buscador, consentimiento...): se sabe sin gastar ningún
        // fetch — el caso más probable en la práctica si el usuario copia la
        // URL ya expandida desde la barra de direcciones.
        return { ok: false, reason: 'google_page_unreadable' };
    }

    const fetched = await fetchHtmlSafely(input);
    if (!fetched.ok) {
        if (fetched.reason === 'landed_on_google') {
            // Un enlace corto (share.google...) resolvió, tras seguir
            // redirecciones, en un host de Google — fetchHtmlSafely ya
            // descartó el cuerpo sin leerlo. Si resultó ser una ficha de
            // Maps se puede aprovechar por la vía 2; cualquier otro destino
            // de Google no es legible.
            const landedUrlObj = safeParseUrl(fetched.finalUrl);
            if (landedUrlObj && isLikelyGoogleMapsInput(landedUrlObj)) {
                return await resolveFromGoogleMaps(env, fetched.finalUrl);
            }
            return { ok: false, reason: 'google_page_unreadable' };
        }
        return { ok: false, reason: fetched.reason || 'fetch_failed' };
    }

    return extractFromHtml(fetched.html, fetched.finalUrl);
}

// ---------------------------------------------------------------------------
// Handler HTTP
// ---------------------------------------------------------------------------

async function previewApartmentFromUrl(env, body, userId, agencyId) {
    const rawInput = (body?.url || '').trim();
    if (!rawInput) return errorResponse('url is required');

    if (env.RATE_LIMIT_KV) {
        const userLimit = await hitRateLimit(env, `aptlink:user:${userId}`, RATE_LIMIT_PREVIEW_PER_USER);
        if (!userLimit.allowed) return errorResponse('rate_limited', 429);
    } else {
        console.warn('[GuideApartmentLink] RATE_LIMIT_KV no configurado: importador sin límite de uso');
    }

    const draft = await resolveApartmentDraft(env, rawInput);
    if (!draft.ok) {
        return jsonResponse({
            success: true,
            resolved: false,
            reason: draft.reason,
            message: MESSAGES[draft.reason] || MESSAGES.default,
        });
    }

    // Relleno de coordenadas: algunas webs publican dirección en texto pero
    // no lat/lng estructurada (fuera del schema VacationRental completo, que
    // está gated a partners con PMS — ver cabecera del módulo).
    if ((draft.fields.latitude?.value == null || draft.fields.longitude?.value == null) && draft.fields.address?.value) {
        const geo = await geocodeAddress(env, draft.fields.address.value);
        if (geo.ok) {
            draft.fields.latitude = { value: geo.latitude, source: 'geocode' };
            draft.fields.longitude = { value: geo.longitude, source: 'geocode' };
        }
    }

    // La zona VisualTaste no la publica ninguna web externa — se ofrece la
    // lista para que el admin elija, igual que hace a mano hoy.
    const zonesRes = await env.DB.prepare('SELECT id, name FROM guide_zones WHERE is_active = TRUE').all();
    const zones = zonesRes.results || [];

    let likelyDuplicate = null;
    const name = draft.fields.name?.value;
    if (name) {
        const existingAptsRes = await env.DB.prepare(
            'SELECT id, name FROM guide_apartments WHERE agency_id = ? AND is_active = TRUE'
        ).bind(agencyId).all();
        const dup = findLikelyDuplicate(name, existingAptsRes.results || []);
        if (dup) likelyDuplicate = { apartment_id: dup.apartment.id, name: dup.apartment.name, score: dup.score };
    }

    return jsonResponse({
        success: true,
        resolved: true,
        source_kind: draft.source_kind,
        matched_type: draft.matched_type || null,
        source_url: draft.source_url || rawInput,
        fields: draft.fields,
        images: draft.images || [],
        source_payload: draft.source_payload ?? null,
        zones: zones.map(z => ({ id: z.id, name: z.name })),
        likely_duplicate: likelyDuplicate,
    });
}

/**
 * Registrar en worker.js ANTES de handleGuideImportRequests (workerGuideImport.js):
 * ese módulo enruta sobre el prefijo ANCHO "/guide/admin/import/" (no solo
 * "places/") y exige superadmin ANTES de mirar el sub-path — un usuario de
 * agencia (no superadmin) golpeando esta ruta se comería un 403 del módulo
 * equivocado si este handler se registrara después. Mismo problema de fondo
 * que ya tiene hoy /guide/admin/import/apartments/preview (el importador de
 * Excel) — no se toca aquí, es un módulo aparte; ver aviso separado.
 */
export async function handleGuideApartmentLinkRequests(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/guide/admin/import/apartments/from-url') return null;
    if (request.method !== 'POST') return null;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);
    const userData = await verifyJWT(authHeader.substring(7), env.JWT_SECRET);
    if (!userData) return errorResponse('Unauthorized', 401);

    let body;
    try { body = await request.json(); } catch { return errorResponse('Invalid JSON body'); }

    const agencyId = body?.agency_id;
    if (!agencyId) return errorResponse('agency_id is required');

    const isSuperAdmin = userData.is_superadmin === true;
    if (!isSuperAdmin) {
        const staffRows = await env.DB.prepare(
            'SELECT agency_id FROM guide_agency_staff WHERE user_id = ? AND is_active = TRUE'
        ).bind(userData.userId).all();
        const userAgencyIds = (staffRows.results || []).map(r => r.agency_id);
        if (!userAgencyIds.includes(agencyId)) return errorResponse('Forbidden', 403);
    }

    try {
        return await previewApartmentFromUrl(env, body, userData.userId, agencyId);
    } catch (error) {
        console.error('[GuideApartmentLink] Error:', error.message);
        return errorResponse('Import error: ' + error.message, 500);
    }
}
