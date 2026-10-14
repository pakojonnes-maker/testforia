// Tabla de rutas contra el router REAL (worker.js entero, con sus 28 módulos).
// Ejecutar:  npm run test:routes
//
// Los demás tests prueban cada módulo por separado, y por eso no vieron los fallos que más han costado:
// todos eran de CABLEADO, no de lógica.
//   - la reserva pública y la valoración de la carta daban 401: su ruta no estaba en PUBLIC_ROUTES;
//   - cualquier sesión cambiaba la configuración de reservas o de delivery de otro restaurante: la ruta
//     lleva el restaurante fuera de /restaurants/ y ninguna capa de workerAuthz.js la veía;
//   - /guide/admin/tv/* daba 404: su handler iba después del de /guide/admin/.
//
// Aquí cada fila es una petición a `worker.fetch` y lo que el ROUTER tiene que decidir con ella:
//   PUBLICAS      sin sesión → pasa (cualquier cosa menos el 401 del router)
//   PROTEGIDAS    sin sesión → 401
//   ENTRE_TENANTS con la sesión del dueño de A → 403 sobre B, y pasa sobre A
//   ORDEN         con sesión → contesta SU handler, no el 404 de otro que iba antes
//
// **Endpoint nuevo = fila nueva.** El test falla si una entrada de PUBLIC_ROUTES, de TENANT_PATH_ROUTES o
// de RESOURCE_ROUTES no tiene fila: así no se puede abrir una ruta (o añadir un recurso) sin decidirlo aquí.
//
// Lo que NO prueba: lo que hace cada handler por dentro. D1 es un doble que solo sabe de quién es cada
// restaurante; todo lo demás contesta vacío, así que un handler puede acabar en 404 o 500 y la fila pasa.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkerModule } from './_load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { module: workerMod, cleanup } = await loadWorkerModule('worker.js');
const worker = workerMod.default;

let pass = 0, fail = 0;
function check(label, ok, detail = '') {
    ok ? pass++ : fail++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${!ok && detail ? `  → ${detail}` : ''}`);
}

// --- Entorno -----------------------------------------------------------------

const JWT_SECRET = 'secreto-de-prueba-no-usado-en-ningun-sitio-real';
const API = 'https://api.test';

// Dos restaurantes. El usuario de las pruebas es dueño de A y no pinta nada en B.
const RESTAURANTS = [
    { id: 'rest_A', slug: 'casa-a', staff: { user_a: 'owner' } },
    { id: 'rest_B', slug: 'casa-b', staff: {} },
];
// Un recurso hijo es de A o de B según termine su id: dish_A, camp_B…
const ownerOf = (id) => RESTAURANTS.find((r) => String(id).endsWith(r.id.slice(-2)))?.id ?? null;

function answer(sql, args) {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes('SELECT token_version FROM users')) return { token_version: 0 };
    // workerAuthz.getRestaurantAccess: (userId, idOSlug, idOSlug)
    if (s.includes('FROM restaurants r') && s.includes('restaurant_staff rs')) {
        const r = RESTAURANTS.find((x) => x.id === args[1] || x.slug === args[1]);
        return r ? { restaurant_id: r.id, role: r.staff[args[0]] ?? null } : null;
    }
    // workerAuthz.RESOURCE_ROUTES: «SELECT [d.]restaurant_id FROM <tabla> … WHERE <x>.id = ?»
    if (/^SELECT (d\.)?restaurant_id FROM /.test(s) && args.length === 1) {
        const owner = ownerOf(args[0]);
        return owner ? { restaurant_id: owner } : null;
    }
    return null;
}

function makeEnv() {
    const stmt = (sql, args = []) => ({
        sql, args,
        bind: (...a) => stmt(sql, a),
        first: async () => answer(sql, args),
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 0 } }),
        raw: async () => [],
    });
    const kv = { get: async () => null, put: async () => {}, delete: async () => {}, list: async () => ({ keys: [] }) };
    return {
        JWT_SECRET,
        DB: { prepare: (sql) => stmt(sql), batch: async (list) => list.map(() => ({ results: [], meta: { changes: 0 } })) },
        GUIDE_CACHE: kv,
        RATE_LIMIT_KV: kv,
        R2_BUCKET: { get: async () => null, head: async () => null, put: async () => ({}), delete: async () => {}, list: async () => ({ objects: [] }) },
        AI: { run: async () => ({ response: '' }) },
    };
}

const ctx = { waitUntil: (p) => { Promise.resolve(p).catch(() => {}); }, passThroughOnException() {} };

// Ningún handler debe salir a internet desde un test.
globalThis.fetch = async (url) => { throw new Error(`fetch a ${url} bloqueado en el test`); };

// --- Sesiones ----------------------------------------------------------------

const enc = new TextEncoder();
const b64url = (input) => {
    const bytes = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function signJwt(payload, secret = JWT_SECRET) {
    const now = Math.floor(Date.now() / 1000);
    const input = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ tv: 0, iat: now, exp: now + 600, ...payload }))}`;
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return `${input}.${b64url(await crypto.subtle.sign('HMAC', key, enc.encode(input)))}`;
}

const OWNER_A = await signJwt({ userId: 'user_a', email: 'a@example.com', is_superadmin: false });
const SUPERADMIN = await signJwt({ userId: 'user_root', email: 'root@example.com', is_superadmin: true });
const FORGED = await signJwt({ userId: 'user_a', is_superadmin: true }, 'otro-secreto');
const EXPIRED = await signJwt({ userId: 'user_a', exp: Math.floor(Date.now() / 1000) - 60 });

// --- Petición ----------------------------------------------------------------

/** La ruta de una fila, sin el «#A/#B» que distingue dos cuerpos para la misma ruta. */
const pathOf = (row) => row.split(' ')[1].split('#')[0];

/** «METHOD /ruta» → Response del router. El ruido de consola de los handlers se calla. */
async function send(row, { token, origin } = {}) {
    const method = row.split(' ')[0];
    const path = pathOf(row);
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (origin) headers.Origin = origin;
    let body;
    if (!['GET', 'HEAD', 'DELETE'].includes(method)) {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(BODIES[row] ?? {});
    }
    const saved = { log: console.log, error: console.error, warn: console.warn };
    console.log = console.error = console.warn = () => {};
    try {
        return await worker.fetch(new Request(API + path, { method, headers, body }), makeEnv(), ctx);
    } catch (error) {
        // El router tiene su propio try/catch: si algo llega hasta aquí, que se vea en la fila.
        return new Response(null, { status: 599, statusText: String(error.message).replace(/[^\x20-\x7e]/g, '?') });
    } finally {
        Object.assign(console, saved);
    }
}

// Cuerpos de las pocas filas en las que el restaurante viaja en el body.
const BODIES = {
    'POST /dishes#A': { restaurant_id: 'rest_A' },
    'POST /dishes#B': { restaurant_id: 'rest_B' },
    'POST /api/notifications/send#A': { restaurantId: 'rest_A' },
    'POST /api/notifications/send#B': { restaurantId: 'rest_B' },
};

// =============================================================================
// 1. PÚBLICAS — lo que llama la carta, la guía o la tele sin sesión
// =============================================================================
const PUBLICAS = [
    // Acceso
    'POST /auth/login',
    'POST /auth/mfa/verify',
    'POST /auth/google',
    'GET /auth/google/config',
    'GET /auth/invitations/tok123',
    'POST /auth/invitations/tok123/accept',
    // Carta
    'POST /track/session/start',
    'GET /allergens',
    'GET /media/platos/foto.jpg',
    'HEAD /media/platos/foto.jpg',
    'GET /restaurants/casa-a/reels',
    'POST /restaurants/casa-a/rating',
    'GET /restaurants/casa-a/landing',
    'GET /restaurants/casa-a/sections',
    'GET /restaurants/casa-a/menus',
    'GET /menus',
    'GET /sections',
    // Reservas del comensal
    'GET /reservations/config/rest_A',
    'GET /reservations/availability',
    'GET /reservations/availability/calendar',
    'POST /reservations',
    'POST /reservations/waitlist',
    'GET /reservations/by-token/tok-123',
    'POST /reservations/cancel-by-token',
    // Delivery del comensal
    'GET /delivery/config/rest_A',
    'GET /delivery/available/rest_A',
    'GET /delivery/translations/rest_A',
    'POST /delivery/orders',
    // Ofertas, sellos y avisos
    'GET /api/r/abc123',
    'POST /api/r/abc123/redeem',
    'GET /api/loyalty/card',
    'POST /api/loyalty/stamp',
    'POST /api/notifications/subscribe',
    'GET /api/restaurants/casa-a/notifications/subscribers',
    'GET /system/icons',
    // Guía y tele
    'GET /guide/mi-piso-1a2b3c4d',
    'GET /guide/mi-piso-1a2b3c4d/explore',
    'POST /guide/track/session',
    'POST /guide/ai/chat',
    'POST /guide/store/orders',
    'GET /guide/tv/config/ABC123',
    'POST /guide/tv/track',
];

// =============================================================================
// 2. PROTEGIDAS — sin sesión, 401. Muchas son vecinas de una pública: mismo
//    prefijo y otro método, o un tramo más.
// =============================================================================
const PROTEGIDAS = [
    // Lo que no existe tampoco se abre: la lista es de permitidos, no de prohibidos.
    'GET /',
    'GET /ruta-que-no-existe',
    // Sesión
    'GET /auth/me',
    'POST /auth/logout',
    'POST /auth/change-password',
    'POST /auth/invitations',
    // Restaurante
    'GET /restaurants',
    'GET /restaurants/casa-a',
    'PUT /restaurants/casa-a',
    'GET /restaurants/casa-a/staff',
    'DELETE /restaurants/casa-a/rating',
    'POST /restaurants/casa-a/sections',
    'PUT /restaurants/casa-a/landing',
    'GET /analytics?restaurant_id=rest_A',
    // Estuvieron en PUBLIC_ROUTES hasta oct-2026 sin que ningún handler las atendiera: reservas y delivery
    // del comensal van por /reservations y /delivery. Si alguien crea un endpoint con esta forma, nace cerrado.
    'GET /restaurants/casa-a/reservations',
    'GET /restaurants/casa-a/reservation-config',
    'POST /restaurants/casa-a/reservations',
    'GET /restaurants/casa-a/delivery/config',
    'POST /restaurants/casa-a/delivery/orders',
    // Carta: leer es público, escribir no
    'POST /menus',
    'PUT /menus/menu_A',
    'POST /sections',
    'PUT /sections/sec_A',
    'POST /dishes',
    'PUT /dishes/dish_A',
    'DELETE /dishes/dish_A',
    'POST /media/upload',
    'DELETE /media/media_A',
    'POST /allergens',
    // Reservas: crear y consultar disponibilidad es público, gestionar no
    'PUT /reservations/config/rest_A',
    'GET /reservations',
    'PATCH /reservations/res_A',
    'DELETE /reservations/res_A',
    // Delivery
    'PUT /delivery/config/rest_A',
    'PUT /delivery/settings/rest_A',
    'PUT /delivery/translations/rest_A',
    'GET /delivery/orders/rest_A',
    'PATCH /delivery/orders/ord_A/status',
    // Marketing y sellos
    'GET /api/campaigns',
    'PUT /api/campaigns/camp_A',
    'POST /api/notifications/send',
    'GET /api/loyalty/cards/card_A',
    'PUT /admin/landing/sections/ls_A',
    // Guía: el piso es público, su administración no
    'PUT /guide/mi-piso-1a2b3c4d',
    'DELETE /guide/mi-piso-1a2b3c4d',
    'GET /guide/admin/agencies',
    'GET /guide/admin/apartments',
    'DELETE /guide/admin/apartments/apt_1',
    'PUT /guide/admin/apartments/apt_1/info/info_1/media/med_1',
    // Bloques compartidos entre pisos (0112); entre agencias, tests/guide-info-share.test.mjs
    'GET /guide/admin/apartments/apt_1/info',
    'GET /guide/admin/apartments/apt_1/info/info_1/shares',
    'PUT /guide/admin/apartments/apt_1/info/info_1/shares',
    'GET /guide/admin/apartments/apt_1/info-library',
    'POST /guide/admin/translate',
    'POST /guide/admin/import/places/preview',
    'POST /guide/admin/import/apartments/preview',
    'POST /guide/admin/import/apartments/from-url',
    'GET /guide/admin/qr/overview',
    'PUT /guide/admin/qr/design',
    'GET /guide/admin/tv/devices',
    'POST /guide/admin/tv/devices',
    'GET /guide/admin/tv/fleet',
    'GET /guide/admin/explore',
    // …y lo público de la guía solo lo es con su método
    'GET /guide/ai/chat',
    'GET /guide/store/orders',
    'PUT /guide/tv/config/ABC123',
    'GET /guide/tv/track',
];

// =============================================================================
// 3. ENTRE TENANTS — la sesión del dueño de A no toca B. `%` es el restaurante
//    (o el recurso que cuelga de él) y se prueba con los dos.
//    `capa` dice qué parte de workerAuthz.js la protege; el test exige una fila
//    por cada entrada de TENANT_PATH_ROUTES y de RESOURCE_ROUTES.
// =============================================================================
const ENTRE_TENANTS = [
    { row: 'PUT /restaurants/rest_%', capa: 'ruta' },
    { row: 'GET /restaurants/rest_%/staff', capa: 'ruta' },
    { row: 'POST /api/restaurants/rest_%/notifications/send', capa: 'ruta' },
    // El restaurante en la ruta, pero no detrás de /restaurants/ (TENANT_PATH_ROUTES)
    { row: 'PUT /reservations/config/rest_%', capa: 'tenant-path' },
    { row: 'PUT /delivery/config/rest_%', capa: 'tenant-path' },
    { row: 'PUT /delivery/settings/rest_%', capa: 'tenant-path' },
    { row: 'PUT /delivery/translations/rest_%', capa: 'tenant-path' },
    { row: 'GET /delivery/orders/rest_%', capa: 'tenant-path' },
    // Recursos hijos (RESOURCE_ROUTES)
    { row: 'PUT /dishes/dish_%', capa: 'dish' },
    { row: 'PUT /menus/menu_%', capa: 'menu' },
    { row: 'PUT /sections/sec_%', capa: 'section' },
    { row: 'DELETE /media/media_%', capa: 'media' },
    { row: 'PATCH /reservations/res_%', capa: 'reservation' },
    { row: 'PUT /api/campaigns/camp_%', capa: 'campaign' },
    { row: 'PUT /admin/landing/sections/ls_%', capa: 'landing-section' },
    { row: 'PATCH /delivery/orders/ord_%/status', capa: 'delivery-order' },
    { row: 'GET /api/loyalty/cards/card_%', capa: 'loyalty-card' },
    // El restaurante en la query o en el body
    { row: 'GET /analytics?restaurant_id=rest_%', capa: 'query' },
    { row: 'GET /api/campaigns?restaurantId=rest_%', capa: 'query' },
    { row: 'POST /dishes#%', capa: 'body' },
    { row: 'POST /api/notifications/send#%', capa: 'body' },
];

// =============================================================================
// 4. ORDEN — rutas de /guide/admin/* que tiene que atender un handler anterior
//    al genérico (ese contesta 404 a lo que no conoce, no deja pasar).
// =============================================================================
const ORDEN = [
    'GET /guide/admin/tv/devices',
    'GET /guide/admin/tv/fleet',
    'GET /guide/admin/qr/overview',
    'POST /guide/admin/translate',
    'POST /guide/admin/import/places/preview',
    'POST /guide/admin/import/apartments/from-url',
];

// --- Ejecución ---------------------------------------------------------------

// Entre paréntesis, lo que contestó el worker: con un D1 vacío casi todo es 400 o 404, y está bien.
const passed = (res) => ![401, 403, 599].includes(res.status);

// Entradas de PUBLIC_ROUTES a las que no contesta ningún handler (acaban en el 404 final del router).
// Son huecos abiertos en la lista que salta la autenticación: si mañana alguien crea un endpoint de gestión
// con esa forma, nace público. Hubo cuatro hasta oct-2026; la lista tiene que seguir vacía.
const PUBLICAS_SIN_HANDLER = [];

console.log('\n--- Públicas: sin sesión no las para el router ---');
const sinHandler = [];
for (const row of PUBLICAS) {
    const res = await send(row);
    check(`${row}  (${res.status})`, res.status !== 401 && res.status !== 599, res.statusText);
    if (res.status === 404 && (await res.text()).includes('Endpoint no encontrado')) sinHandler.push(row);
}
check(
    'Toda ruta pública la atiende algún handler',
    JSON.stringify(sinHandler) === JSON.stringify(PUBLICAS_SIN_HANDLER),
    `acaban en el 404 del router: ${sinHandler.join('  ') || 'ninguna (vacía PUBLICAS_SIN_HANDLER)'}`
);

console.log('\n--- Protegidas: sin sesión, 401 ---');
for (const row of PROTEGIDAS) {
    const res = await send(row);
    check(row, res.status === 401, `status ${res.status}`);
}

console.log('\n--- Una sesión que no vale es como no tener ninguna ---');
for (const [name, token] of [['firmada con otro secreto', FORGED], ['caducada', EXPIRED], ['basura', 'no.es.un-jwt']]) {
    const res = await send('GET /guide/admin/apartments', { token });
    check(`${name} → 401`, res.status === 401, `status ${res.status}`);
}

console.log('\n--- Entre restaurantes: el dueño de A no toca B ---');
for (const { row } of ENTRE_TENANTS) {
    const other = await send(row.replace('%', 'B'), { token: OWNER_A });
    check(`${row.replace('%', 'B')} → 403`, other.status === 403, `status ${other.status}`);
    const own = await send(row.replace('%', 'A'), { token: OWNER_A });
    check(`${row.replace('%', 'A')} → pasa  (${own.status})`, passed(own), own.statusText);
}
{
    const res = await send('PUT /restaurants/no-existe', { token: OWNER_A });
    check('Un restaurante que no existe → 403, igual que uno ajeno (no se puede ir probando ids)', res.status === 403, `status ${res.status}`);
    const root = await send('PUT /restaurants/rest_B', { token: SUPERADMIN });
    check(`El superadmin sí entra en B  (${root.status})`, passed(root), root.statusText);
}

console.log('\n--- Orden de los handlers de /guide/admin/* ---');
for (const row of ORDEN) {
    const res = await send(row, { token: SUPERADMIN });
    check(`${row} → contesta su handler, no un 404  (${res.status})`, passed(res) && res.status !== 404, res.statusText);
}

console.log('\n--- CORS y buscadores ---');
{
    const { ALLOWED_ORIGINS } = (await loadWorkerModuleOnce('workerCors.js'));
    for (const origin of ['https://admin.visualtastes.com', 'https://menu.visualtastes.com', 'https://guide.visualtastes.com', 'https://tv.visualtastes.com', 'https://visualtastes.com']) {
        const res = await send('GET /allergens', { origin });
        check(`${origin} recibe su origen`, res.headers.get('Access-Control-Allow-Origin') === origin, res.headers.get('Access-Control-Allow-Origin'));
    }
    const evil = await send('GET /allergens', { origin: 'https://visualtastes.com.evil.example' });
    check('Un origen ajeno NO recibe el suyo', evil.headers.get('Access-Control-Allow-Origin') !== 'https://visualtastes.com.evil.example');
    const denied = await send('GET /guide/admin/apartments', { origin: 'https://admin.visualtastes.com' });
    check('El 401 también lleva CORS (si no, el admin ve un error de red y no el 401)', denied.headers.get('Access-Control-Allow-Origin') === 'https://admin.visualtastes.com');
    const preflight = await send('OPTIONS /guide/admin/apartments', { origin: 'https://admin.visualtastes.com' });
    check('El preflight contesta 204 sin pedir sesión', preflight.status === 204, `status ${preflight.status}`);
    check('Ningún origen de producción con http://', ALLOWED_ORIGINS.every((o) => o.startsWith('https://') || /^http:\/\/([\w-]+\.)?localhost:\d+$/.test(o)));
    const guide = await send('GET /guide/mi-piso-1a2b3c4d');
    check('La guía (lleva el WiFi) sale con noindex', (guide.headers.get('X-Robots-Tag') || '').includes('noindex'), guide.headers.get('X-Robots-Tag'));
}

// --- Cobertura: que la tabla no se quede atrás --------------------------------

console.log('\n--- La tabla cubre lo que hay en el código ---');
{
    // PUBLIC_ROUTES no se exporta: se lee del fuente. Si cambia de forma, este bloque falla en vez de
    // dar por buena una lista vacía.
    const src = readFileSync(join(ROOT, 'worker.js'), 'utf8');
    const block = src.slice(src.indexOf('const PUBLIC_ROUTES = ['), src.indexOf('function isPublicRoute'));
    const entries = [...block.matchAll(/\{\s*method:\s*'(\w+)',\s*pattern:\s*(\/.+\/)\s*\}/g)]
        .map((m) => ({ method: m[1], source: m[2], pattern: new RegExp(m[2].slice(1, -1)) }));
    const declared = (block.match(/\bmethod:/g) || []).length;
    check(`PUBLIC_ROUTES se lee entera (${entries.length} entradas)`, entries.length > 30 && entries.length === declared, `${entries.length} leídas de ${declared}`);

    const isPublic = (row) => entries.some((e) => (e.method === 'ALL' || e.method === row.split(' ')[0]) && e.pattern.test(pathOf(row).split('?')[0]));
    const sinFila = entries.filter((e) => !PUBLICAS.some((row) => (e.method === 'ALL' || e.method === row.split(' ')[0]) && e.pattern.test(pathOf(row))));
    check('Cada entrada de PUBLIC_ROUTES tiene su fila en PUBLICAS', sinFila.length === 0, sinFila.map((e) => `${e.method} ${e.source}`).join('  '));
    const coladas = PROTEGIDAS.filter(isPublic);
    check('Ninguna fila de PROTEGIDAS casa con PUBLIC_ROUTES', coladas.length === 0, coladas.join('  '));

    const authz = readFileSync(join(ROOT, 'workerAuthz.js'), 'utf8');
    const tenantBlock = authz.slice(authz.indexOf('const TENANT_PATH_ROUTES = ['), authz.indexOf('function extractTenantPathRef'));
    // Cada entrada es una función de una línea «(s) => …,» sobre los tramos de la ruta: se evalúa tal cual.
    const matchers = tenantBlock.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('(s) =>'))
        .map((l) => ({ source: l, match: new Function(`return ${l.replace(/,\s*$/, '')}`)() }));
    const tenantRows = ENTRE_TENANTS.filter((r) => r.capa === 'tenant-path')
        .map((r) => pathOf(r.row).replace('%', 'B').split('/').filter(Boolean));
    const sinFilaTenant = matchers.filter((m) => !tenantRows.some((segs) => m.match(segs)));
    check(`TENANT_PATH_ROUTES (${matchers.length}) tiene una fila por entrada`, matchers.length > 0 && sinFilaTenant.length === 0, sinFilaTenant.map((m) => m.source).join('  '));
    const sinEntrada = tenantRows.filter((segs) => !matchers.some((m) => m.match(segs)));
    check('Cada fila «tenant-path» la protege una entrada de TENANT_PATH_ROUTES', sinEntrada.length === 0, sinEntrada.map((x) => `/${x.join('/')}`).join('  '));

    const resourceBlock = authz.slice(authz.indexOf('const RESOURCE_ROUTES = ['), authz.indexOf('async function resolveResourceOwner'));
    const resources = [...resourceBlock.matchAll(/name:\s*'([\w-]+)'/g)].map((m) => m[1]);
    const capas = new Set(ENTRE_TENANTS.map((r) => r.capa));
    const sinProbar = resources.filter((name) => !capas.has(name));
    check(`RESOURCE_ROUTES (${resources.length}) tiene una fila por recurso`, resources.length > 0 && sinProbar.length === 0, sinProbar.join(', '));
}

async function loadWorkerModuleOnce(name) {
    const { module, cleanup: done } = await loadWorkerModule(name);
    done();
    return module;
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
