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

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
