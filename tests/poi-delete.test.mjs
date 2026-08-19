// Test del borrado de POIs / experiencias (DELETE /guide/admin/pois/:id).
// Ejecutar:  npm run test:poi-delete
//
// Un POI no es de nadie en particular: vive en la ZONA y lo comparten todos los
// apartamentos de esa zona. Eso hace que los dos fallos posibles sean opuestos y
// los dos malos:
//
//   - Pasarse: borrar cosas compartidas (otros POIs, apartamentos, la zona, los
//     clics a restaurantes) porque el WHERE se quedó corto.
//   - Quedarse corto: dejar huérfanos. Es lo que hacía el código anterior — el
//     DELETE ni existía, el admin caía a is_active=FALSE y el POI se quedaba
//     "borrado" en pantalla con sus 24 traducciones, sus fotos en R2 y sus
//     filas de guide_apartment_pois intactas.
//
// Se cubren los dos lados, más el caso de las comisiones: si hay dinero
// registrado contra ese POI el borrado se rechaza en vez de reescribir la
// contabilidad de una agencia por detrás.

import { loadWorkerModule } from './_load.mjs';

const { module: guideAdmin, cleanup } = await loadWorkerModule('workerGuideAdmin.js');
const { handleGuideAdminRequests } = guideAdmin;

const JWT_SECRET = 'test-secret-para-borrado-de-pois';
const POI_ID = 'poi_test_1';

// --- Utilidades -------------------------------------------------------------

async function signTestJWT(payload, secret) {
    const b64url = (data) => {
        const base64 = typeof data === 'string'
            ? btoa(data)
            : btoa(String.fromCharCode(...new Uint8Array(data)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }));
    const signingInput = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
    return `${signingInput}.${b64url(sig)}`;
}

function makeEnv({ poiExists = true, commissions = 0 } = {}) {
    const batched = [];
    const singles = [];
    const r2 = { listedPrefixes: [], deleted: [] };
    const kv = [];
    const norm = (sql) => sql.replace(/\s+/g, ' ').trim();

    return {
        JWT_SECRET,
        batched, singles, r2, kv,
        DB: {
            prepare(sql) {
                const s = norm(sql);
                return {
                    bind(...args) {
                        return {
                            sql: s,
                            args,
                            async first() {
                                singles.push(s);
                                if (s.includes('FROM guide_pois WHERE id')) {
                                    return poiExists
                                        ? { id: POI_ID, zone_id: 'zone_1', category: 'beach', poi_type: 'sight' }
                                        : null;
                                }
                                if (s.includes('AS apartments')) {
                                    return {
                                        apartments: 3, media: 2, translations: 24,
                                        coupons: 1, clicks: 15, tv_events: 4, commissions,
                                    };
                                }
                                return null;
                            },
                            async all() {
                                singles.push(s);
                                if (s.includes('FROM guide_agency_staff')) return { results: [{ agency_id: 'ag_1' }] };
                                if (s.includes('FROM guide_poi_media')) {
                                    return { results: [{ r2_key: `guide/pois/${POI_ID}/foto.jpg` }] };
                                }
                                if (s.includes('JOIN guide_apartments')) {
                                    return { results: [{ id: 'apt_1', name: 'Piso Carabeo' }] };
                                }
                                // touchZoneGuideVersions pide los slugs de la zona
                                if (s.includes('FROM guide_apartments WHERE zone_id')) {
                                    return { results: [{ slug: 'piso-carabeo' }, { slug: 'atico-burriana' }] };
                                }
                                return { results: [] };
                            },
                            async run() { singles.push(s); return { success: true }; },
                        };
                    },
                };
            },
            async batch(stmts) {
                for (const st of stmts) batched.push(st.sql);
                return stmts.map(() => ({ success: true }));
            },
        },
        R2_BUCKET: {
            async list({ prefix }) {
                r2.listedPrefixes.push(prefix);
                return { objects: [{ key: `${prefix}portada.jpg` }], truncated: false };
            },
            async delete(keys) { r2.deleted.push(...(Array.isArray(keys) ? keys : [keys])); },
        },
        GUIDE_CACHE: {
            async get() { return null; },
            async put(key, value) { kv.push({ key, value }); },
        },
    };
}

function deleteRequest(token, body, path = `pois/${POI_ID}`) {
    return new Request(`https://api.test/guide/admin/${path}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
}

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
    if (cond) { pass++; console.log(`  ok   ${name}${extra ? `  — ${extra}` : ''}`); }
    else { fail++; console.log(`  FAIL ${name}${extra ? `  — ${extra}` : ''}`); }
}
function section(title) { console.log(`\n--- ${title} ---`); }

const superToken = await signTestJWT({ userId: 'u_super', is_superadmin: true }, JWT_SECRET);
const agencyToken = await signTestJWT({ userId: 'u_agency', is_superadmin: false }, JWT_SECRET);

// --- 1. Autorización y confirmación ----------------------------------------

section('Quién puede borrar y con qué frase');
{
    const env = makeEnv();
    const res = await handleGuideAdminRequests(deleteRequest(agencyToken, { confirm: 'borrar poi' }), env);
    ok('Usuario de agencia → 403', res.status === 403);
    ok('403 no ejecuta nada', env.batched.length === 0);
}
for (const [label, body] of [
    ['sin body', undefined],
    ['frase equivocada', { confirm: 'borrar' }],
    ['frase de apartamento', { confirm: 'borrar apartamento' }],
]) {
    const env = makeEnv();
    const res = await handleGuideAdminRequests(deleteRequest(superToken, body), env);
    ok(`Confirmación ${label} → 400`, res.status === 400);
    ok(`Confirmación ${label} no ejecuta nada`, env.batched.length === 0);
}
for (const frase of ['borrar poi', 'BORRAR POI', 'borrar experiencia', '  Borrar   Experiencia ']) {
    const env = makeEnv();
    const res = await handleGuideAdminRequests(deleteRequest(superToken, { confirm: frase }), env);
    ok(`Confirmación válida (${JSON.stringify(frase)}) → 200`, res.status === 200);
}
{
    const env = makeEnv({ poiExists: false });
    const res = await handleGuideAdminRequests(deleteRequest(superToken, { confirm: 'borrar poi' }), env);
    ok('POI inexistente → 404', res.status === 404);
    ok('404 no ejecuta nada', env.batched.length === 0);
}

// --- 2. Comisiones: bloquea en vez de borrar --------------------------------

section('POI con comisiones registradas');
{
    const env = makeEnv({ commissions: 2 });
    const res = await handleGuideAdminRequests(deleteRequest(superToken, { confirm: 'borrar poi' }), env);
    const body = await res.json();
    ok('Con comisiones → 409, no se borra', res.status === 409 && body.success === false);
    ok('No se ejecuta ninguna sentencia', env.batched.length === 0);
    ok('El mensaje sugiere archivar', /rch[ií]v/i.test(body.error), body.error);
    ok('No se toca R2', env.r2.deleted.length === 0);
    ok('No se toca la caché', env.kv.length === 0);
}

// --- 3. Alcance del borrado -------------------------------------------------

section('Qué se borra y qué NO');
{
    const env = makeEnv();
    const res = await handleGuideAdminRequests(deleteRequest(superToken, { confirm: 'borrar poi' }), env);
    const body = await res.json();
    ok('Borrado correcto → 200', res.status === 200 && body.success === true);

    // Lo que antes se quedaba huérfano.
    const OBLIGATORIAS = [
        ['translations', /^DELETE FROM translations WHERE entity_type = 'poi' AND entity_id = \?1$/],
        ['guide_poi_media', /^DELETE FROM guide_poi_media WHERE poi_id = \?1$/],
        ['guide_apartment_pois', /^DELETE FROM guide_apartment_pois WHERE poi_id = \?1$/],
        ['guide_coupons', /^DELETE FROM guide_coupons WHERE poi_id = \?1 OR experience_id = \?1$/],
        ['guide_pois', /^DELETE FROM guide_pois WHERE id = \?1$/],
    ];
    for (const [tabla, re] of OBLIGATORIAS) {
        ok(`SÍ se limpia ${tabla}`, env.batched.some(s => re.test(s)));
    }

    // Analítica sin FK: si se deja, apunta a un id que ya no existe.
    ok('SÍ se limpian los clics del POI (target_type experience)',
        env.batched.some(s => /^DELETE FROM guide_affiliate_intents WHERE target_type = 'experience' AND target_id = \?1$/.test(s)));
    ok('SÍ se limpian los eventos TV del POI',
        env.batched.some(s => /^DELETE FROM guide_tv_events WHERE event_type = 'poi_select' AND target_id = \?1$/.test(s)));

    // Y lo que NO puede tocarse jamás.
    const INTOCABLES = [
        'guide_apartments', 'guide_apartment_info', 'guide_zones', 'guide_agencies',
        'restaurants', 'guide_zone_restaurants', 'guide_sessions', 'guide_section_views',
        'guide_commission_ledger', 'guide_store_items', 'guide_info_categories',
    ];
    for (const tabla of INTOCABLES) {
        ok(`NO se escribe en ${tabla}`,
            !env.batched.some(s => new RegExp(`^(DELETE FROM|UPDATE) ${tabla}\\b`, 'i').test(s)));
    }

    // Los clics a restaurantes y a ítems de tienda comparten tabla con los del
    // POI: el filtro por target_type es lo único que los separa.
    const intents = env.batched.filter(s => s.includes('guide_affiliate_intents'));
    ok('Sólo una sentencia toca guide_affiliate_intents', intents.length === 1);
    ok('...y filtra por target_type = experience', intents[0].includes("target_type = 'experience'"));
    ok('...nunca borra clics de restaurant/product',
        !intents[0].includes("'restaurant'") && !intents[0].includes("'product'"));

    // Enlaces: sólo los de ESTE POI, no los del apartamento entero.
    const links = env.batched.filter(s => s.includes('guide_apartment_pois'));
    ok('guide_apartment_pois se filtra por poi_id, no por apartment_id',
        links.length === 1 && links[0].includes('WHERE poi_id') && !links[0].includes('apartment_id'));

    ok('guide_pois es la última sentencia',
        /^DELETE FROM guide_pois WHERE id/.test(env.batched[env.batched.length - 1]));
    ok('Ninguna sentencia interpola el id a mano', !env.batched.join('\n').includes(POI_ID));
}

// --- 4. R2 y caché de zona --------------------------------------------------

section('Media en R2 y caché KV de la zona');
{
    const env = makeEnv();
    const res = await handleGuideAdminRequests(deleteRequest(superToken, { confirm: 'borrar poi' }), env);
    const body = await res.json();

    ok('Sólo se lista el prefijo del POI',
        env.r2.listedPrefixes.length === 1 && env.r2.listedPrefixes[0] === `guide/pois/${POI_ID}/`,
        env.r2.listedPrefixes.join(','));
    ok('Todo lo borrado cuelga de ese prefijo',
        env.r2.deleted.length > 0 && env.r2.deleted.every(k => k.startsWith(`guide/pois/${POI_ID}/`)),
        env.r2.deleted.join(','));

    // Un POI es contenido de zona: se invalida la guía de TODOS los apartamentos
    // de esa zona, no la de uno.
    const claves = env.kv.map(k => k.key);
    ok('Se bumpea la versión de cada apartamento de la zona',
        claves.includes('ver:apt:piso-carabeo') && claves.includes('ver:apt:atico-burriana'),
        claves.join(','));

    ok('La respuesta informa de lo borrado',
        body.deleted?.translations === 24 && body.deleted?.apartments === 3 && body.deleted?.media_files === 2,
        JSON.stringify(body.deleted));
    ok('Queda registrado en security_audit_log',
        env.singles.some(s => s.includes('INSERT INTO security_audit_log')));
}
{
    const env = makeEnv();
    env.R2_BUCKET.list = async () => { throw new Error('R2 down'); };
    const res = await handleGuideAdminRequests(deleteRequest(superToken, { confirm: 'borrar poi' }), env);
    const body = await res.json();
    ok('R2 caído: sigue 200 y avisa', res.status === 200 && typeof body.warning === 'string');
}

// --- 5. La ruta de experiencias es la misma --------------------------------

section('experiences/:id comparte comportamiento');
{
    const env = makeEnv();
    const res = await handleGuideAdminRequests(
        deleteRequest(superToken, { confirm: 'borrar experiencia' }, `experiences/${POI_ID}`), env);
    ok('DELETE experiences/:id borra de verdad', res.status === 200);
    ok('...con el mismo alcance', env.batched.length === 7, String(env.batched.length));
    ok('...y ya no es un is_active = FALSE',
        !env.batched.some(s => /UPDATE guide_pois SET is_active/i.test(s)));
}

// --- 6. /usage: lo que ve el admin antes de confirmar ----------------------

section('GET pois/:id/usage');
{
    const env = makeEnv();
    const req = new Request(`https://api.test/guide/admin/pois/${POI_ID}/usage`, {
        headers: { Authorization: `Bearer ${superToken}` },
    });
    const res = await handleGuideAdminRequests(req, env);
    const body = await res.json();
    ok('Devuelve 200', res.status === 200);
    ok('Dice a cuántos apartamentos afecta', body.usage?.apartments === 3);
    ok('Y con qué nombres', body.usage?.apartment_names?.includes('Piso Carabeo'));
    ok('deletable=true sin comisiones', body.usage?.deletable === true);
    ok('Consultar el uso no borra nada', env.batched.length === 0);
}
{
    const env = makeEnv({ commissions: 5 });
    const req = new Request(`https://api.test/guide/admin/pois/${POI_ID}/usage`, {
        headers: { Authorization: `Bearer ${superToken}` },
    });
    const body = await (await handleGuideAdminRequests(req, env)).json();
    ok('deletable=false si hay comisiones', body.usage?.deletable === false);
}
{
    const env = makeEnv();
    const req = new Request(`https://api.test/guide/admin/pois/${POI_ID}/usage`, {
        headers: { Authorization: `Bearer ${agencyToken}` },
    });
    const res = await handleGuideAdminRequests(req, env);
    ok('Usuario de agencia no puede consultarlo → 403', res.status === 403);
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail > 0 ? 1 : 0);
