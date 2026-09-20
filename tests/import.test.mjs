// Test del importador de POIs desde Google Maps (workerGuideImport.js).
// Ejecutar:  npm run test:import
//
// Cubre las funciones puras (parseo de URL, similitud de nombres, mapeo de
// categorías, diff de campos, matching contra la BD) mockeando globalThis.fetch
// y un env.DB al estilo de tests/auth.test.mjs — no hay precedente de mockear
// fetch en esta carpeta, así que el patrón (guardar/restaurar globalThis.fetch
// alrededor de cada bloque) es nuevo aquí, pero deliberadamente simple.
//
// Lo que NO se testea: fetchPlaceDetails/fetchPlacePhotoPreviewUrl contra la
// Places API real (harían falta credenciales y red), y el flujo HTTP completo
// más allá del guardarraíl de auth de abajo.

import { loadWorkerModule } from './_load.mjs';

const { module: importer, cleanup } = await loadWorkerModule('workerGuideImport.js');
const {
    resolvePlaceRef,
    nameSimilarity,
    mapGoogleTypeToCategory,
    buildFieldDiff,
    matchExistingPoi,
    handleGuideImportRequests,
    // Modo restaurante ("Restaurantes por zona")
    fetchPlaceDetails,
    mapPlaceToPoi,
    mapPlaceToRestaurant,
    cuisineFromGoogle,
    isFoodPlace,
    placeToRaw,
    restaurantWarnings,
    RESTAURANT_DETAILS_FIELD_MASK,
} = importer;

// --- Utilidades -------------------------------------------------------------

const originalFetch = globalThis.fetch;
function mockFetch(handler) { globalThis.fetch = handler; }
function restoreFetch() { globalThis.fetch = originalFetch; }

/** Firma un JWT HS256 igual que generateJWT() en workerAuthentication.js (no
 * exportado), para poder probar el guardarraíl de auth con un token real. */
async function signTestJWT(payload, secret) {
    const b64url = (data) => {
        const base64 = typeof data === 'string'
            ? btoa(data)
            : btoa(String.fromCharCode(...new Uint8Array(data)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }));
    const signingInput = `${header}.${body}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    return `${signingInput}.${b64url(sigBuffer)}`;
}

function makeDbEnv(pois, restaurants = []) {
    return {
        DB: {
            prepare(sql) {
                const s = sql.replace(/\s+/g, ' ').trim();
                return {
                    bind(...args) {
                        return {
                            async first() {
                                if (s.includes('WHERE p.google_place_id = ?')) {
                                    return pois.find(p => p.google_place_id === args[0]) || null;
                                }
                                return null;
                            },
                            async all() {
                                if (s.includes('WHERE p.zone_id = ? AND p.google_place_id IS NULL')) {
                                    const [zoneId, latMin, latMax, lngMin, lngMax] = args;
                                    return {
                                        results: pois.filter(p =>
                                            p.zone_id === zoneId && !p.google_place_id &&
                                            p.latitude >= latMin && p.latitude <= latMax &&
                                            p.longitude >= lngMin && p.longitude <= lngMax
                                        ),
                                    };
                                }
                                if (s.includes('FROM guide_zone_restaurants')) {
                                    return { results: restaurants };
                                }
                                return { results: [] };
                            },
                        };
                    },
                };
            },
        },
    };
}

// --- Runner ------------------------------------------------------------------

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

// -----------------------------------------------------------------------------

console.log('\n--- resolvePlaceRef: formas de entrada ---');
{
    let fetchCalled = false;
    mockFetch(async () => { fetchCalled = true; throw new Error('no debería llamar a fetch'); });
    const ref = await resolvePlaceRef({}, 'ChIJN1t_tDeuEmsRUsoyG83frY4');
    assert('Place ID pelado se reconoce sin red', ref?.placeId === 'ChIJN1t_tDeuEmsRUsoyG83frY4' && ref.via === 'raw_id');
    assert('No se llamó a fetch para un place_id directo', !fetchCalled);
    restoreFetch();
}
{
    const url = 'https://www.google.com/maps/place/?q=place_id:ChIJrTLr-GyuEmsRBfy61i59si0';
    const ref = await resolvePlaceRef({}, url);
    assert('Extrae el place_id de ?q=place_id:...', ref?.placeId === 'ChIJrTLr-GyuEmsRBfy61i59si0' && ref.via === 'url_place_id');
}
{
    // URL de escritorio con AMBAS formas de coordenadas: @lat,lng (viewport,
    // donde estaba centrado el mapa al compartir) y !3d/!4d dentro de data=
    // (el pin real). Deben ser distintas a propósito, para comprobar que se
    // prefiere la segunda.
    const url = 'https://www.google.com/maps/place/El+Pimpi/@36.0,-4.0,17z/data=!4m6!3m5!1s0x0:0x0!8m2!3d36.72127!4d-4.41639';
    let capturedBody = null;
    mockFetch(async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return new Response(JSON.stringify({ places: [{ id: 'ChIJPINMATCH' }] }), { status: 200 });
    });
    const ref = await resolvePlaceRef({ GOOGLE_PLACES_API_KEY: 'test-key' }, url);
    assert('Sin place_id en la URL, resuelve vía Text Search', ref?.placeId === 'ChIJPINMATCH' && ref.via === 'url_search');
    assert('El textQuery es el nombre extraído del path', capturedBody?.textQuery === 'El Pimpi');
    assert(
        'Usa las coords del pin (!3d/!4d), NO las del viewport (@lat,lng)',
        capturedBody?.locationBias?.circle?.center?.latitude === 36.72127 &&
        capturedBody?.locationBias?.circle?.center?.longitude === -4.41639,
        JSON.stringify(capturedBody?.locationBias)
    );
    restoreFetch();
}
{
    // Enlace corto de móvil: hay que seguir la redirección para llegar a la
    // URL larga. resolveViaRedirects prueba extractFromMapsUrl en CADA salto
    // ANTES de pedir el siguiente, así que en cuanto la URL expandida trae un
    // place_id ya no hace falta un segundo fetch para "confirmar" nada — de
    // ahí 1 sola llamada, no 2.
    let callCount = 0;
    mockFetch(async (url) => {
        callCount++;
        if (String(url).includes('goo.gl')) {
            return new Response(null, { status: 302, headers: { location: 'https://www.google.com/maps/place/?q=place_id:ChIJSHORTLINK' } });
        }
        throw new Error('No debería hacer falta un segundo fetch: la URL expandida ya se resuelve por extracción — ' + url);
    });
    const ref = await resolvePlaceRef({}, 'https://maps.app.goo.gl/abc123');
    assert('Sigue el enlace corto y extrae el place_id de la URL expandida', ref?.placeId === 'ChIJSHORTLINK');
    assert('1 solo salto de red: la URL expandida ya resuelve por extracción, sin fetch extra', callCount === 1);
    restoreFetch();
}
{
    // Caso real de producción (2026-08-02): share.google no lleva NINGÚN dato
    // de Maps en la URL. Dos redirecciones HTTP (302 luego 301) llevan a una
    // página de resultados/Knowledge Graph de Google
    // (google.com/search?q=Nombre&kgmid=...) — el nombre real vive en `q=`
    // de esa URL intermedia. Un tercer salto (fetch de la propia página de
    // búsqueda) caería en un muro de consentimiento de cookies inútil, así
    // que el test falla fuerte si el código llega a intentarlo.
    let redirectHops = 0;
    let capturedTextSearchBody = null;
    mockFetch(async (url, opts) => {
        const urlStr = String(url);
        if (urlStr.startsWith('https://share.google/')) {
            redirectHops++;
            return new Response(null, { status: 302, headers: { location: 'https://www.google.com/share.google?q=8VcC4yfVat9iRWNaE' } });
        }
        if (urlStr.includes('google.com/share.google?q=')) {
            redirectHops++;
            return new Response(null, { status: 301, headers: { location: 'https://www.google.com/search?kgmid=/g/121k353j&q=Casa+de+los+Navajas&hl=es-ES' } });
        }
        if (urlStr.includes('places:searchText')) {
            capturedTextSearchBody = JSON.parse(opts.body);
            return new Response(JSON.stringify({ places: [{ id: 'ChIJCASANAVAJAS' }] }), { status: 200 });
        }
        throw new Error('No debería llegar a fetchear la página de búsqueda (muro de consentimiento inútil): ' + urlStr);
    });
    const ref = await resolvePlaceRef({ GOOGLE_PLACES_API_KEY: 'test-key' }, 'https://share.google/8VcC4yfVat9iRWNaE');
    assert('2 saltos de redirección antes de extraer el nombre (sin llegar a la página de búsqueda)', redirectHops === 2);
    assert('El nombre extraído de la URL intermedia se usa como textQuery de Text Search', capturedTextSearchBody?.textQuery === 'Casa de los Navajas');
    assert('Resuelve un place_id vía Text Search a partir del nombre', ref?.placeId === 'ChIJCASANAVAJAS' && ref.via === 'url_search');
    restoreFetch();
}
{
    const ref = await resolvePlaceRef({}, 'https://maps.google.com/maps?cid=12345678901234567890');
    assert(
        'URL con SOLO ?cid= (sin nombre en el path) no se resuelve — limitación conocida, documentada en el código',
        ref === null
    );
}
{
    let capturedBody = null;
    mockFetch(async (_url, opts) => {
        capturedBody = JSON.parse(opts.body);
        return new Response(JSON.stringify({ places: [{ id: 'ChIJFREETEXT' }] }), { status: 200 });
    });
    const ref = await resolvePlaceRef({ GOOGLE_PLACES_API_KEY: 'test-key' }, 'El Pimpi Málaga', { biasLat: 36.72, biasLng: -4.42 });
    assert('Texto libre (sin URL) resuelve vía Text Search', ref?.placeId === 'ChIJFREETEXT' && ref.via === 'text_search');
    assert('Usa el texto tal cual como textQuery', capturedBody?.textQuery === 'El Pimpi Málaga');
    assert('Aplica el sesgo de la zona cuando no hay coords propias en la entrada', capturedBody?.locationBias?.circle?.center?.latitude === 36.72);
    restoreFetch();
}
{
    mockFetch(async () => new Response(JSON.stringify({}), { status: 200 }));
    const ref = await resolvePlaceRef({ GOOGLE_PLACES_API_KEY: 'test-key' }, 'Sitio Que No Existe De Verdad En Ningún Sitio');
    assert('Google sin resultados → resolvePlaceRef devuelve null (no lanza)', ref === null);
    restoreFetch();
}

console.log('\n--- nameSimilarity ---');
{
    assert('Nombres idénticos tras quitar muletillas ("El Pimpi" / "Restaurante El Pimpi") → 1', nameSimilarity('El Pimpi', 'Restaurante El Pimpi') === 1);
    assert('Nombres sin relación → score bajo', nameSimilarity('Panadería Central', 'Kayak Aventura Costa del Sol') < 0.3);
    assert('Cadena vacía o null nunca casa', nameSimilarity('', 'Algo') === 0 && nameSimilarity(null, 'Algo') === 0);
    assert('Acentos no afectan a la comparación', nameSimilarity('Cafeteria Malaga', 'Cafetería Málaga') === 1);

    // Caso límite documentado, no un bug: nombres CORTOS que difieren en una
    // sola letra comparten la mayoría de sus trigramas y pueden puntuar por
    // ENCIMA del umbral de "posible duplicado" (0.72). No se afina el umbral
    // para forzar este caso concreto por debajo — el matching es una
    // sugerencia para revisión humana (la acción por defecto de un "posible
    // duplicado" en el admin es Descartar, nunca Actualizar en silencio), así
    // que un falso positivo aquí es visible y barato de descartar en el
    // diálogo, no un dato que se corrompe solo.
    const manoloScore = nameSimilarity('Bar Manolo', 'Bar Manola');
    assert(
        '"Bar Manolo" vs "Bar Manola" puntúa alto por trigramas compartidos (caso límite conocido)',
        manoloScore > 0.7,
        manoloScore.toFixed(2)
    );
}

console.log('\n--- mapGoogleTypeToCategory ---');
{
    assert('restaurant → Restaurantes/sight', JSON.stringify(mapGoogleTypeToCategory('restaurant')) === JSON.stringify({ category: 'Restaurantes', poi_type: 'sight' }));
    assert('museum → Cultura/museum', JSON.stringify(mapGoogleTypeToCategory('museum')) === JSON.stringify({ category: 'Cultura', poi_type: 'museum' }));
    assert('beach → Playas/beach', JSON.stringify(mapGoogleTypeToCategory('beach')) === JSON.stringify({ category: 'Playas', poi_type: 'beach' }));
    assert('park → Naturaleza/nature', JSON.stringify(mapGoogleTypeToCategory('park')) === JSON.stringify({ category: 'Naturaleza', poi_type: 'nature' }));
    assert('Tipo desconocido → Otro/sight (default)', JSON.stringify(mapGoogleTypeToCategory('submarine_base')) === JSON.stringify({ category: 'Otro', poi_type: 'sight' }));
    assert('primaryType ausente → Otro/sight (default)', JSON.stringify(mapGoogleTypeToCategory(undefined)) === JSON.stringify({ category: 'Otro', poi_type: 'sight' }));
}

console.log('\n--- buildFieldDiff ---');
{
    const mapped = {
        name_es: 'El Pimpi', description_es: 'Bodega histórica', category: 'Restaurantes',
        address: 'Calle Granada 62', phone: null, website_url: null, opening_hours: null,
        google_maps_url: 'https://maps.example/x', latitude: 36.72, longitude: -4.41,
        rating: 4.5, price_display: '€€',
    };

    const diffNew = buildFieldDiff(null, mapped);
    const nameFieldNew = diffNew.find(f => f.key === 'name_es');
    assert('POI nuevo (sin existente): campo con valor de Google viene premarcado y "differs"', nameFieldNew.defaultChecked === true && nameFieldNew.differs === true);

    const existing = { name_es: 'El Pimpi', description_es: 'Mi descripción escrita a mano', category: 'Restaurantes', address: null };
    const diffExisting = buildFieldDiff(existing, mapped);
    const nameFieldExisting = diffExisting.find(f => f.key === 'name_es');
    const descFieldExisting = diffExisting.find(f => f.key === 'description_es');
    const addressFieldExisting = diffExisting.find(f => f.key === 'address');

    assert('Campo igual al existente: no difiere y no se premarca', nameFieldExisting.differs === false && nameFieldExisting.defaultChecked === false);
    assert('Campo con valor propio DISTINTO: difiere, pero NO se premarca (no pisar tu edición)', descFieldExisting.differs === true && descFieldExisting.defaultChecked === false);
    assert('Campo vacío en el existente: difiere y SÍ se premarca con el valor de Google', addressFieldExisting.differs === true && addressFieldExisting.defaultChecked === true);
}

console.log('\n--- matchExistingPoi ---');
{
    const env = makeDbEnv([
        { id: 'poi_1', zone_id: 'zone_a', google_place_id: 'ChIJEXISTING', name_es: 'El Pimpi', latitude: 36.72, longitude: -4.41 },
    ]);
    const mapped = { google_place_id: 'ChIJEXISTING', name_es: 'El Pimpi', latitude: 36.72, longitude: -4.41 };
    const { poiMatch, clientMatch } = await matchExistingPoi(env, 'zone_a', mapped);
    assert('Mismo google_place_id ya en BD → match exacto', poiMatch.type === 'exact' && poiMatch.poi.id === 'poi_1' && poiMatch.score === 1);
    assert('Sin restaurantes en la zona → sin cliente coincidente', clientMatch === null);
}
{
    const env = makeDbEnv([
        { id: 'poi_2', zone_id: 'zone_a', google_place_id: null, name_es: 'Restaurante El Pimpi', latitude: 36.7201, longitude: -4.4101 },
    ]);
    const mapped = { google_place_id: 'ChIJNEW', name_es: 'El Pimpi', latitude: 36.7200, longitude: -4.4100 };
    const { poiMatch } = await matchExistingPoi(env, 'zone_a', mapped);
    assert('Sin place_id propio + a ~15m + nombre parecido → posible duplicado', poiMatch.type === 'likely' && poiMatch.poi.id === 'poi_2');
}
{
    const env = makeDbEnv([
        { id: 'poi_3', zone_id: 'zone_a', google_place_id: null, name_es: 'Ferretería Muy Lejana', latitude: 36.9, longitude: -4.9 },
    ]);
    const mapped = { google_place_id: 'ChIJNEW2', name_es: 'El Pimpi', latitude: 36.72, longitude: -4.41 };
    const { poiMatch } = await matchExistingPoi(env, 'zone_a', mapped);
    assert('Nada cerca (fuera del bbox de ~200m) → sin match, ni se llega a puntuar por nombre', poiMatch.type === 'none');
}
{
    const env = makeDbEnv([], [{ id: 'rest_1', name: 'El Pimpi' }]);
    const mapped = { google_place_id: 'ChIJNEW3', name_es: 'El Pimpi', latitude: 36.72, longitude: -4.41 };
    const { clientMatch } = await matchExistingPoi(env, 'zone_a', mapped);
    assert('Nombre coincide con un restaurante cliente VisualTaste de la zona → avisa', clientMatch?.restaurantId === 'rest_1');
}

console.log('\n--- handleGuideImportRequests: guardarraíles HTTP ---');
{
    const JWT_SECRET = 'secreto-de-prueba-import-no-usado-en-ningun-sitio-real';
    const env = { JWT_SECRET, DB: {} }; // ninguno de estos casos debería tocar DB

    function req(path, token, method = 'POST') {
        return new Request(`https://api.visualtastes.com${path}`, {
            method,
            headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: method === 'POST' ? JSON.stringify({ urls: ['x'], zone_id: 'z1' }) : undefined,
        });
    }

    const noAuthRes = await handleGuideImportRequests(req('/guide/admin/import/places/preview', null), env);
    assert('Sin cabecera Authorization → 401', noAuthRes?.status === 401);

    const badTokenRes = await handleGuideImportRequests(req('/guide/admin/import/places/preview', 'esto-no-es-un-jwt'), env);
    assert('Token con formato inválido → 401', badTokenRes?.status === 401);

    const nonAdminToken = await signTestJWT({ userId: 'u1', is_superadmin: false }, JWT_SECRET);
    const forbiddenRes = await handleGuideImportRequests(req('/guide/admin/import/places/preview', nonAdminToken), env);
    assert('Usuario autenticado pero NO superadmin → 403', forbiddenRes?.status === 403);

    const adminToken = await signTestJWT({ userId: 'u_admin', is_superadmin: true }, JWT_SECRET);
    const unmatchedRes = await handleGuideImportRequests(req('/guide/admin/import/no-existe', adminToken), env);
    assert('Superadmin válido pero ruta desconocida bajo el import → null (fallthrough, no un 404 propio)', unmatchedRes === null);

    const otherRouteRes = await handleGuideImportRequests(new Request('https://api.visualtastes.com/guide/admin/pois', { method: 'GET' }), env);
    assert('Rutas fuera de /guide/admin/import/ → null inmediato, ni siquiera comprueba auth', otherRouteRes === null);
}

// =============================================================================
// Modo restaurante ("Importar de Google" en Restaurantes por zona)
// =============================================================================

// Forma real de una respuesta de Place Details (New) para un restaurante, con lo que
// pide RESTAURANT_DETAILS_FIELD_MASK. `reviews` y `openNow` NO se piden, pero se ponen
// a propósito: si un día llegaran, no deben acabar guardados.
const RESTAURANT_PLACE = {
    id: 'ChIJrestaurantFixture0001',
    displayName: { text: 'Casa Marinera', languageCode: 'es' },
    formattedAddress: 'Paseo Marítimo, 8, 29630 Benalmádena, Málaga, España',
    shortFormattedAddress: 'Paseo Marítimo, 8, Benalmádena',
    location: { latitude: 36.5951, longitude: -4.5165 },
    types: ['seafood_restaurant', 'restaurant', 'food', 'point_of_interest', 'establishment'],
    primaryType: 'seafood_restaurant',
    primaryTypeDisplayName: { text: 'Restaurante de mariscos', languageCode: 'es' },
    googleMapsUri: 'https://maps.google.com/?cid=123456789',
    websiteUri: 'https://casamarinera.example',
    internationalPhoneNumber: '+34 952 12 34 56',
    nationalPhoneNumber: '952 12 34 56',
    regularOpeningHours: {
        openNow: true,
        periods: [{ open: { day: 1, hour: 13, minute: 0 }, close: { day: 1, hour: 23, minute: 30 } }],
        weekdayDescriptions: ['lunes: 13:00–23:30', 'martes: 13:00–23:30'],
    },
    regularSecondaryOpeningHours: [{ secondaryHoursType: 'KITCHEN', openNow: false, periods: [], weekdayDescriptions: [] }],
    rating: 4.6,
    userRatingCount: 1287,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    businessStatus: 'OPERATIONAL',
    editorialSummary: { text: 'Marisco fresco frente al mar.', languageCode: 'es' },
    dineIn: true, takeout: true, delivery: false, reservable: true, outdoorSeating: true,
    servesLunch: true, servesDinner: true, servesWine: true, allowsDogs: true,
    paymentOptions: { acceptsCreditCards: true },
    addressComponents: [{ longText: 'Benalmádena', shortText: 'Benalmádena', types: ['locality'] }],
    photos: [{ name: 'places/ChIJrestaurantFixture0001/photos/AbC', widthPx: 4000, authorAttributions: [{ displayName: 'Ana' }] }],
    reviews: [{ text: { text: 'Genial' } }],
    _vt: { fieldMask: 'restaurant', fetched_at: '2026-09-20T10:00:00.000Z' },
};

console.log('\n--- Modo restaurante: cuisineFromGoogle ---');
{
    const cuisine = (text) => cuisineFromGoogle({ primaryTypeDisplayName: { text } });
    assert('"Restaurante italiano" → "Italiano"', cuisine('Restaurante italiano') === 'Italiano');
    assert('"Restaurante de mariscos" → "Mariscos"', cuisine('Restaurante de mariscos') === 'Mariscos');
    assert('"Restaurante del mar" → "Mar"', cuisine('Restaurante del mar') === 'Mar');
    assert('"Restaurante de la costa" → "Costa"', cuisine('Restaurante de la costa') === 'Costa');
    assert('"Restaurante de comida rápida" conserva el resto → "Comida rápida"', cuisine('Restaurante de comida rápida') === 'Comida rápida');
    assert('Espacios dobles y el prefijo en mayúsculas no importan', cuisine('  RESTAURANTE  vegano ') === 'Vegano', cuisine('  RESTAURANTE  vegano '));
    assert('Sólo "Restaurante" no es una cocina → null (no ensucia el filtro)', cuisine('Restaurante') === null && cuisine('restaurante') === null);
    assert('Un tipo que ya es una cocina se respeta ("Cafetería")', cuisine('Cafetería') === 'Cafetería');
    assert('"Bar de tapas" NO se toca (no empieza por "Restaurante")', cuisine('Bar de tapas') === 'Bar de tapas');
    assert('Sin primaryTypeDisplayName / sin place → null, sin lanzar', cuisineFromGoogle({}) === null && cuisineFromGoogle(undefined) === null);
}

console.log('\n--- Modo restaurante: isFoodPlace ---');
{
    assert('primaryType restaurant → comida', isFoodPlace({ primaryType: 'restaurant' }));
    assert('Un tipo *_restaurant en types → comida', isFoodPlace({ types: ['thai_restaurant', 'point_of_interest'] }));
    assert('Cafetería y bar cuentan', isFoodPlace({ primaryType: 'cafe' }) && isFoodPlace({ primaryType: 'bar' }));
    assert('Un hotel CON restaurante (types incluye restaurant) → comida', isFoodPlace({ primaryType: 'lodging', types: ['lodging', 'restaurant'] }));
    assert('Un museo NO es comida', !isFoodPlace({ primaryType: 'museum', types: ['museum', 'tourist_attraction'] }));
    assert('Sin datos → false, sin lanzar', !isFoodPlace({}) && !isFoodPlace(undefined));
}

console.log('\n--- Modo restaurante: placeToRaw (qué se guarda de Google) ---');
{
    const raw = JSON.parse(placeToRaw(RESTAURANT_PLACE));
    assert('No guarda las fotos (los nombres caducan y los ToS no lo permiten)', !('photos' in raw));
    assert('No guarda reseñas', !('reviews' in raw));
    assert('Sin `openNow` en ningún nivel (es "ahora mismo" y envejece al guardarlo)', !JSON.stringify(raw).includes('openNow'));
    assert('Conserva los atributos de servicio', raw.dineIn === true && raw.reservable === true && raw.servesWine === true && raw.allowsDogs === true && raw.delivery === false);
    assert('Conserva los horarios por periodos y los secundarios', raw.regularOpeningHours.periods.length === 1 && raw.regularSecondaryOpeningHours[0].secondaryHoursType === 'KITCHEN');
    assert('Conserva pagos y componentes de dirección', raw.paymentOptions.acceptsCreditCards === true && raw.addressComponents[0].types[0] === 'locality');
    assert('Conserva la trazabilidad _vt (máscara y fecha)', raw._vt.fieldMask === 'restaurant' && raw._vt.fetched_at === '2026-09-20T10:00:00.000Z');
    assert('No muta el objeto original (la caché KV lo comparte)', 'photos' in RESTAURANT_PLACE && RESTAURANT_PLACE.regularOpeningHours.openNow === true);
    assert('placeToRaw(undefined) → "{}", sin lanzar', placeToRaw(undefined) === '{}');
}

console.log('\n--- Modo restaurante: mapPlaceToRestaurant ---');
{
    const m = mapPlaceToRestaurant(RESTAURANT_PLACE);
    assert('Siempre categoría "Restaurantes"', m.category === 'Restaurantes');
    assert('Tipo de cocina normalizado', m.subcategory === 'Mariscos');
    assert('Conserva el mapeo de POI (nombre, dirección, coords, mapa, web, teléfono)',
        m.name_es === 'Casa Marinera' && m.address === 'Paseo Marítimo, 8, Benalmádena' && m.latitude === 36.5951 &&
        m.google_maps_url === 'https://maps.google.com/?cid=123456789' && m.website_url === 'https://casamarinera.example' &&
        m.phone === '+34 952 12 34 56' && m.google_place_id === 'ChIJrestaurantFixture0001' && m.source === 'google_places');
    assert('google_types es el JSON de place.types', JSON.stringify(JSON.parse(m.google_types)) === JSON.stringify(RESTAURANT_PLACE.types));
    assert('primaryType, businessStatus y priceLevel en crudo', m.google_primary_type === 'seafood_restaurant' && m.business_status === 'OPERATIONAL' && m.price_level === 'PRICE_LEVEL_MODERATE');
    assert('price_display sigue siendo el "€€" ya formateado', m.price_display === '€€');
    assert('google_raw es el JSON limpio', JSON.parse(m.google_raw).dineIn === true && !('photos' in JSON.parse(m.google_raw)));
    assert('Marca el sitio como comida (aviso del diálogo)', m._isFood === true);

    const hotel = mapPlaceToRestaurant({ id: 'ChIJhotelFixture00000001', displayName: { text: 'Hotel Sol' }, primaryType: 'lodging', types: ['lodging'] });
    assert('Aunque Google diga "hotel", en este modo sigue siendo "Restaurantes"', hotel.category === 'Restaurantes');
    assert('…y sin datos de Google no revienta: cocina/estado/precio null', hotel.subcategory === null && hotel.business_status === null && hotel.price_level === null);

    assert('El modo POI NO cambia: mapPlaceToPoi sigue sin metadatos de restaurante',
        !('google_raw' in mapPlaceToPoi(RESTAURANT_PLACE)) && !('subcategory' in mapPlaceToPoi(RESTAURANT_PLACE)));
}

console.log('\n--- Modo restaurante: avisos ---');
{
    const w = (over) => restaurantWarnings(mapPlaceToRestaurant({ ...RESTAURANT_PLACE, ...over }));
    assert('Restaurante en activo → sin avisos', w({}).length === 0);
    assert('Cerrado definitivamente → permanently_closed', w({ businessStatus: 'CLOSED_PERMANENTLY' }).includes('permanently_closed'));
    assert('Cerrado temporalmente → temporarily_closed (y no permanently_)', w({ businessStatus: 'CLOSED_TEMPORARILY' }).join() === 'temporarily_closed');
    assert('Un museo pegado por error → not_food', w({ primaryType: 'museum', types: ['museum'] }).includes('not_food'));
}

console.log('\n--- Modo restaurante: buildFieldDiff ---');
{
    const mapped = mapPlaceToRestaurant(RESTAURANT_PLACE);
    const keys = (d) => d.map(f => f.key);
    const diffRest = buildFieldDiff(null, mapped, 'restaurant');
    assert('El diff de restaurante incluye "Tipo de cocina" justo tras la categoría',
        keys(diffRest).indexOf('subcategory') === keys(diffRest).indexOf('category') + 1, keys(diffRest).join(','));
    assert('…con el valor de Google y premarcado si no había uno', diffRest.find(f => f.key === 'subcategory').googleValue === 'Mariscos' && diffRest.find(f => f.key === 'subcategory').defaultChecked === true);
    const diffOwn = buildFieldDiff({ subcategory: 'Marisquería de la casa', category: 'Restaurantes' }, mapped, 'restaurant');
    assert('Si el admin ya escribió su cocina, NO se premarca para pisarla', diffOwn.find(f => f.key === 'subcategory').defaultChecked === false);
    assert('El diff de POI no incluye la cocina (comportamiento previo intacto)', !keys(buildFieldDiff(null, mapped)).includes('subcategory'));
    assert('Sin el 3er argumento es modo POI', keys(buildFieldDiff(null, mapped)).join() === keys(buildFieldDiff(null, mapped, 'poi')).join());
}

console.log('\n--- Modo restaurante: máscara de campos ---');
{
    const fields = RESTAURANT_DETAILS_FIELD_MASK.split(',');
    assert('Sin espacios ni campos vacíos', fields.every(f => f && f === f.trim()));
    assert('Sin duplicados', new Set(fields).size === fields.length);
    assert('Incluye la máscara básica entera (id, displayName, editorialSummary, fotos para el preview…)',
        ['id', 'displayName', 'location', 'primaryTypeDisplayName', 'editorialSummary', 'photos.name'].every(f => fields.includes(f)));
    assert('Pide los atributos de servicio y los horarios por periodos',
        ['dineIn', 'takeout', 'delivery', 'reservable', 'outdoorSeating', 'servesWine', 'allowsDogs', 'regularOpeningHours.periods', 'nationalPhoneNumber', 'priceRange'].every(f => fields.includes(f)));
    assert('NO pide reseñas ni resúmenes generados (terceros / IA, atribución obligatoria)',
        !['reviews', 'reviewSummary', 'generativeSummary', 'neighborhoodSummary', 'routingSummaries'].some(f => fields.includes(f)));
    assert('NO pide datos dinámicos ("abierto ahora"): ni currentOpeningHours ni regularOpeningHours entero',
        !fields.includes('currentOpeningHours') && !fields.includes('regularOpeningHours') && !fields.includes('regularOpeningHours.openNow'));
}

console.log('\n--- Modo restaurante: fetchPlaceDetails ---');
{
    const makeKv = () => {
        const store = new Map();
        return { store, get: async (k) => (store.has(k) ? JSON.parse(store.get(k)) : null), put: async (k, v) => { store.set(k, v); } };
    };
    const okPlace = () => new Response(JSON.stringify({ id: 'ChIJfixture', displayName: { text: 'X' } }), { status: 200 });

    {   // ampliada: manda la máscara larga y cachea con clave propia
        const kv = makeKv(); const calls = [];
        mockFetch(async (url, opts) => { calls.push(opts.headers['X-Goog-FieldMask']); return okPlace(); });
        const env = { GOOGLE_PLACES_API_KEY: 'k', GUIDE_CACHE: kv };
        const place = await fetchPlaceDetails(env, 'ChIJfixture', { extended: true });
        assert('Ampliada: manda RESTAURANT_DETAILS_FIELD_MASK', calls.length === 1 && calls[0] === RESTAURANT_DETAILS_FIELD_MASK);
        assert('Ampliada: anota la máscara y la fecha en _vt', place._vt?.fieldMask === 'restaurant' && !Number.isNaN(Date.parse(place._vt.fetched_at)));
        assert('Ampliada: se cachea bajo la clave ":rest"', kv.store.has('gplace:ChIJfixture:es:rest') && !kv.store.has('gplace:ChIJfixture:es'));
        await fetchPlaceDetails(env, 'ChIJfixture', { extended: true });
        assert('Segunda petición igual → caché, sin llamar a Google', calls.length === 1);
        await fetchPlaceDetails(env, 'ChIJfixture');
        assert('La básica NO reutiliza la ampliada (le faltarían campos): nueva llamada y clave distinta',
            calls.length === 2 && calls[1] !== RESTAURANT_DETAILS_FIELD_MASK && kv.store.has('gplace:ChIJfixture:es'));
        assert('La básica no pide atributos de restaurante', !calls[1].includes('servesWine') && !calls[1].includes('reservable'));
        restoreFetch();
    }
    {   // Google rechaza la máscara ampliada → se reintenta con la básica
        let n = 0; const masks = [];
        mockFetch(async (url, opts) => {
            n++; const mask = opts.headers['X-Goog-FieldMask']; masks.push(mask);
            return mask.includes('servesWine')
                ? new Response('{"error":{"status":"INVALID_ARGUMENT"}}', { status: 400 })
                : okPlace();
        });
        const place = await fetchPlaceDetails({ GOOGLE_PLACES_API_KEY: 'k' }, 'ChIJdegraded', { extended: true });
        assert('Un 400 con la ampliada → segundo intento con la básica (el import sigue funcionando)', n === 2 && !masks[1].includes('servesWine'));
        assert('…y lo deja anotado: _vt.fieldMask = "basic"', place._vt.fieldMask === 'basic');
        restoreFetch();
    }
    {   // otros errores NO se reintentan
        let n = 0;
        mockFetch(async () => { n++; return new Response('{"error":{"status":"PERMISSION_DENIED"}}', { status: 403 }); });
        let err = null;
        try { await fetchPlaceDetails({ GOOGLE_PLACES_API_KEY: 'k' }, 'ChIJdenied', { extended: true }); } catch (e) { err = e; }
        assert('Un 403 NO se reintenta (sería gastar otra llamada de pago sin motivo)', n === 1);
        assert('…y se propaga con su status', err?.status === 403, String(err?.message));
        restoreFetch();
    }
    {   // un 400 en modo básico tampoco se reintenta
        let n = 0;
        mockFetch(async () => { n++; return new Response('{}', { status: 400 }); });
        let err = null;
        try { await fetchPlaceDetails({ GOOGLE_PLACES_API_KEY: 'k' }, 'ChIJbasic400'); } catch (e) { err = e; }
        assert('Un 400 en modo básico no tiene a dónde degradar: 1 llamada y error', n === 1 && err?.status === 400);
        restoreFetch();
    }
}

console.log('\n--- Modo restaurante: vista previa completa (Google simulado) ---');
{
    const JWT_SECRET = 'secreto-de-prueba-import-restaurantes-no-real';
    const adminToken = await signTestJWT({ userId: 'u_admin', is_superadmin: true }, JWT_SECRET);
    const makeEnv = (clientRestaurants = []) => {
        const base = makeDbEnv([], clientRestaurants);
        return {
            JWT_SECRET,
            GOOGLE_PLACES_API_KEY: 'k',
            DB: {
                prepare(sql) {
                    if (sql.replace(/\s+/g, ' ').trim().startsWith('SELECT id, latitude, longitude FROM guide_zones')) {
                        return { bind: () => ({ first: async () => ({ id: 'z1', latitude: 36.6, longitude: -4.5 }) }) };
                    }
                    return base.DB.prepare(sql);
                },
            },
        };
    };
    const preview = (env, body) => handleGuideImportRequests(new Request('https://api.visualtastes.com/guide/admin/import/places/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ zone_id: 'z1', ...body }),
    }), env);
    const googleReturns = (place) => mockFetch(async (url) => (
        String(url).includes('/media')
            ? new Response(JSON.stringify({ photoUri: 'https://lh3.example/preview.jpg' }), { status: 200 })
            : new Response(JSON.stringify(place), { status: 200 })
    ));

    googleReturns(RESTAURANT_PLACE);
    {
        const res = await preview(makeEnv(), { urls: ['ChIJrestaurantFixture0001'], mode: 'restaurant' });
        const row = (await res.json()).results[0];
        assert('Restaurante nuevo → status "new"', res.status === 200 && row.status === 'new', row.status);
        assert('Devuelve import_meta con los metadatos de Google', row.import_meta?.google_primary_type === 'seafood_restaurant' && row.import_meta?.business_status === 'OPERATIONAL' && row.import_meta?.price_level === 'PRICE_LEVEL_MODERATE');
        assert('…y el JSON crudo LIMPIO (sin fotos)', JSON.parse(row.import_meta.google_raw).dineIn === true && !('photos' in JSON.parse(row.import_meta.google_raw)));
        assert('Sin avisos para un restaurante en activo', Array.isArray(row.warnings) && row.warnings.length === 0);
        const cat = row.fields.find(f => f.key === 'category'), sub = row.fields.find(f => f.key === 'subcategory');
        assert('El diff propone categoría "Restaurantes" y cocina "Mariscos", premarcadas', cat?.googleValue === 'Restaurantes' && cat.defaultChecked && sub?.googleValue === 'Mariscos' && sub.defaultChecked);
        assert('La foto de preview sigue llegando (sólo para identificar el sitio)', row.photo_preview_url === 'https://lh3.example/preview.jpg');
        assert('import_meta NO está dentro de fields (no es algo que se elija campo a campo)', !row.fields.some(f => f.key === 'google_raw'));
    }
    {
        const res = await preview(makeEnv(), { urls: ['ChIJrestaurantFixture0001'] });
        const row = (await res.json()).results[0];
        assert('Sin "mode" (modo POI de siempre): import_meta null, sin avisos y sin cocina en el diff',
            row.import_meta === null && row.warnings.length === 0 && !row.fields.some(f => f.key === 'subcategory'));
    }
    {
        const res = await preview(makeEnv([{ id: 'rest_cliente', name: 'Casa Marinera' }]), { urls: ['ChIJrestaurantFixture0001'], mode: 'restaurant' });
        const row = (await res.json()).results[0];
        assert('Si ya es cliente de VisualTaste lo avisa (el diálogo lo deja en "Descartar")', row.client_restaurant?.restaurantId === 'rest_cliente', JSON.stringify(row.client_restaurant));
    }
    googleReturns({ ...RESTAURANT_PLACE, businessStatus: 'CLOSED_PERMANENTLY' });
    {
        const row = (await (await preview(makeEnv(), { urls: ['ChIJrestaurantFixture0001'], mode: 'restaurant' })).json()).results[0];
        assert('Cerrado definitivamente → aviso permanently_closed', row.warnings.includes('permanently_closed'));
    }
    {
        const res = await preview(makeEnv(), { urls: ['x'], mode: 'bogus' });
        assert('Un mode desconocido → 400 (no se ignora en silencio)', res.status === 400);
    }
    restoreFetch();
}

// =============================================================================
// Restaurantes de Google en la guía del huésped (workerGuide.js)
// =============================================================================

const { module: guideModule, cleanup: cleanupGuide } = await loadWorkerModule('workerGuide.js');
const { mapPoiToRestaurant, mapClientRestaurant, mergeRestaurants, safeHttpUrl } = guideModule;

// Fila del catálogo de la zona (el SELECT de handleGetGuidebook) de un restaurante importado.
const POI_ROW = {
    id: 'poi_marinera', name: 'Casa Marinera', description: 'Marisco fresco frente al mar.',
    category: 'Restaurantes', service_subcategory: 'Mariscos',
    is_featured: 0, is_promoted: 0, is_bookable: 0,
    address: 'Paseo Marítimo, 8, Benalmádena', phone: '+34 952 12 34 56', website_url: 'https://casamarinera.example',
    booking_url: 'https://www.thefork.es/restaurante/casa-marinera', google_maps_url: 'https://maps.google.com/?cid=123',
    cover_image_url: 'https://cdn.example/portada.jpg',
    action_type: null, action_data: null, action_prefilled_message: null,
    secondary_action_type: null, secondary_action_data: null, secondary_action_prefilled_message: null,
    action_is_affiliate: 0, affiliate_code: null,
};
const CTA_CTX = { apartmentId: 'apt_1', apartmentName: 'Paloma Park', surface: 'guide', subId: 'paloma-park-guide' };
const map = (over = {}, gallery = []) => mapPoiToRestaurant({ ...POI_ROW, ...over }, gallery, CTA_CTX);

console.log('\n--- Guía: mapPoiToRestaurant (restaurante de Google → forma pública) ---');
{
    const r = map();
    assert('Sin slug: no es cliente de VisualTaste, así que no habrá carta en vídeo', r.slug === null);
    assert('Misma forma pública que un cliente (id, nombre, cocina, dirección, descripción, mapa)',
        r.id === 'poi_marinera' && r.name === 'Casa Marinera' && r.cuisine_type === 'Mariscos' &&
        r.address === 'Paseo Marítimo, 8, Benalmádena' && r.description === 'Marisco fresco frente al mar.' &&
        r.maps_url === 'https://maps.google.com/?cid=123' && r.city === null && r.country === null);
    assert('is_featured → tier "featured"; si no, "basic"', map({ is_featured: 1 }).tier === 'featured' && r.tier === 'basic');
    assert('is_promoted viaja como booleano', map({ is_promoted: 1 }).is_promoted === true && r.is_promoted === false);
    assert('Reserva: su teléfono + el enlace de reservas (booking_url)',
        JSON.stringify(r.reservation) === JSON.stringify({ phones: ['+34 952 12 34 56'], whatsapp: null, url: 'https://www.thefork.es/restaurante/casa-marinera' }), JSON.stringify(r.reservation));
    assert('Sin teléfono, ni enlace, ni acción → reservation null (la guía no pinta "Reservar")',
        map({ phone: null, booking_url: null }).reservation === null);
    assert('Nombre vacío → cae al id (nunca una tarjeta sin título)', map({ name: null }).name === 'poi_marinera');
    assert('No filtra campos internos (promotion_rank, action_*, affiliate_code)',
        !['promotion_rank', 'action_type', 'action_data', 'affiliate_code', 'is_bookable'].some(k => k in r));
}
{
    const wa = map({ action_type: 'WHATSAPP', action_data: '+34600111222' });
    assert('Acción WHATSAPP del host → canal WhatsApp de la reserva', wa.reservation.whatsapp === '+34600111222' && wa.reservation.phones.length === 1);
    const ph = map({ action_type: 'PHONE', action_data: '+34 999 88 77 66' });
    assert('Acción PHONE → teléfono extra, el suyo primero', JSON.stringify(ph.reservation.phones) === JSON.stringify(['+34 999 88 77 66', '+34 952 12 34 56']));
    const url = map({ action_type: 'URL', action_data: 'https://reservas.example/casa' });
    assert('Acción URL manda sobre booking_url', url.reservation.url === 'https://reservas.example/casa');
    const both = map({ action_type: 'URL', action_data: 'https://reservas.example/casa', secondary_action_type: 'WHATSAPP', secondary_action_data: '+34600111222' });
    assert('CTA secundario manda sobre el principal (misma regla que las experiencias)', both.reservation.whatsapp === '+34600111222' && both.reservation.url === 'https://www.thefork.es/restaurante/casa-marinera', JSON.stringify(both.reservation));
    const aff = map({ action_type: 'URL', action_data: 'https://aff.example/r?sub={{sub_id}}', action_is_affiliate: 1 });
    assert('Los marcadores del enlace se resuelven ({{sub_id}} → piso-superficie)', aff.reservation.url === 'https://aff.example/r?sub=paloma-park-guide', aff.reservation.url);
}
{
    assert('booking_url con javascript: → sin enlace de reserva (XSS almacenado)', map({ booking_url: 'javascript:alert(1)' }).reservation.url === null);
    assert('google_maps_url con javascript: → maps_url null', map({ google_maps_url: 'javascript:alert(1)' }).maps_url === null);
    const evil = map({ action_type: 'URL', action_data: 'javascript:alert(1)', booking_url: null });
    assert('Acción URL con javascript: no llega como enlace (el teléfono sigue siendo un canal válido)', evil.reservation.url === null && evil.reservation.phones.length === 1);
    assert('…y sin teléfono ni nada más, no queda ningún canal', map({ action_type: 'URL', action_data: 'javascript:alert(1)', booking_url: null, phone: null }).reservation === null);
}

console.log('\n--- Guía: portada de un restaurante de Google ---');
{
    const img = (id, role) => ({ id, url: `https://cdn.example/${id}.jpg`, type: 'image', role });
    assert('Sin galería → la portada suelta (cover_image_url)', map({}, []).cover_image === 'https://cdn.example/portada.jpg');
    assert('Con galería → la PRIMARY_IMAGE, aunque no sea la primera',
        map({}, [img('a', 'GALLERY_IMAGE'), img('b', 'PRIMARY_IMAGE')]).cover_image === 'https://cdn.example/b.jpg');
    assert('Sin PRIMARY_IMAGE → la primera imagen', map({}, [img('a', 'GALLERY_IMAGE'), img('c', 'GALLERY_IMAGE')]).cover_image === 'https://cdn.example/a.jpg');
    assert('Una galería sólo de vídeo NO sirve de foto (nada de .mp4 en un <img>) → cae a la portada suelta',
        map({}, [{ id: 'v', url: 'https://cdn.example/v.mp4', type: 'video', role: 'PRIMARY_VIDEO' }]).cover_image === 'https://cdn.example/portada.jpg');
    assert('Sin ninguna foto → null (la guía pinta el placeholder)', map({ cover_image_url: null }, []).cover_image === null);
}

console.log('\n--- Guía: mapClientRestaurant (mover el bloque no cambia el JSON de los clientes) ---');
{
    const c = mapClientRestaurant({
        id: 'rest_1', name: 'Waw Cafe', slug: 'wawcafe', cuisine_type: 'Cafetería', tier: 'basic', is_promoted: 0,
        cover_image: 'restaurants/rest_1/dishes/d/thumbnails/m.png', address: 'Calle Falsa 123', city: 'Málaga', country: 'España',
        phone: '+34 600 000 000', website: 'https://wawcafe.com/', description: 'Café de especialidad',
        whatsapp_number: '+34600000000', reservation_phone: null, reservation_url: null, accepts_reservations: 1, google_maps_url: null,
    }, 'https://media.example');
    assert('Conserva slug y la URL completa de la portada', c.slug === 'wawcafe' && c.cover_image === 'https://media.example/media/restaurants/rest_1/dishes/d/thumbnails/m.png');
    assert('Conserva ciudad, país y descripción', c.city === 'Málaga' && c.country === 'España' && c.description === 'Café de especialidad');
    assert('Su teléfono y su WhatsApp siguen saliendo como canales de reserva', c.reservation.phones[0] === '+34 600 000 000' && c.reservation.whatsapp === '+34600000000');
    assert('accepts_reservations = 0 → sin reserva, aunque tenga teléfono',
        mapClientRestaurant({ id: 'r', name: 'x', slug: 'x', phone: '+34 952 111 222', accepts_reservations: 0 }, 'https://m').reservation === null);
    assert('is_promoted 0/1 → booleano; sin cocina → undefined→null-safe', c.is_promoted === false);
}

console.log('\n--- Guía: mergeRestaurants (orden de la lista mezclada) ---');
{
    const e = (id, { promoted = false, promotionRank = null, featured = false, source = 0, position = 0 } = {}) =>
        ({ rank: { promoted, promotionRank, featured, source, position }, item: { id } });
    const ids = (...lists) => mergeRestaurants(...lists).map(i => i.id).join(',');

    assert('A igualdad, los clientes van ANTES que los de Google, y cada origen conserva su orden',
        ids([e('c1', { position: 0 }), e('c2', { position: 1 })], [e('g1', { source: 1, position: 0 }), e('g2', { source: 1, position: 1 })]) === 'c1,c2,g1,g2');
    assert('…aunque los de Google se pasen primero (no depende del orden de los argumentos)',
        ids([e('g1', { source: 1 })], [e('c1')]) === 'c1,g1');
    assert('Un destacado de Google va por delante de un cliente básico',
        ids([e('c1')], [e('g1', { source: 1, featured: true })]) === 'g1,c1');
    assert('Una promoción de pago vigente manda sobre todo, sea de quien sea',
        ids([e('c1', { featured: true })], [e('g1', { source: 1, promoted: true, promotionRank: 5 })]) === 'g1,c1');
    assert('Entre promociones vigentes, rank ascendente',
        ids([e('c1', { promoted: true, promotionRank: 9 })], [e('g1', { source: 1, promoted: true, promotionRank: 2 })]) === 'g1,c1');
    assert('Una promoción CADUCADA con el rank todavía escrito no se cuela por delante',
        ids([e('c1')], [e('g1', { source: 1, promoted: false, promotionRank: 1 })]) === 'c1,g1');
    assert('Sólo devuelve los items: `rank` (lo que alguien ha pagado) nunca sale en el JSON',
        mergeRestaurants([e('c1')]).every(item => Object.keys(item).join() === 'id'));
    assert('Listas vacías → []', mergeRestaurants([], []).length === 0 && mergeRestaurants().length === 0);
    const c = [e('c1')]; const g = [e('g1', { source: 1 })];
    mergeRestaurants(c, g);
    assert('No muta las listas de entrada', c.length === 1 && g.length === 1 && c[0].item.id === 'c1');
}

console.log('\n--- Guía: safeHttpUrl ---');
{
    assert('Sólo http(s): descarta javascript:, data:, tel: y protocolo relativo',
        ['javascript:alert(1)', 'data:text/html,x', 'tel:+34600000000', '//evil.example/x', '', null, undefined].every(v => safeHttpUrl(v) === null));
    assert('Acepta http y https y recorta espacios', safeHttpUrl('  https://maps.google.com/?cid=1 ') === 'https://maps.google.com/?cid=1' && safeHttpUrl('http://a.example/b') === 'http://a.example/b');
}

cleanup();
cleanupGuide();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
