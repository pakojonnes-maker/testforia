// Test del borrado de apartamentos (DELETE /guide/admin/apartments/:id).
// Ejecutar:  npm run test:apartment-delete
//
// Es la operación más destructiva del guidebook: se lleva por delante la guía
// entera de una propiedad y no hay papelera. Lo que se cubre aquí es
// exactamente lo que duele si se rompe en silencio:
//
//   - Las dos puertas: superadmin (un staff de la agencia dueña NO puede) y la
//     frase de confirmación exacta. Y que un fallo en cualquiera de las dos no
//     ejecute NADA contra la base.
//   - El invariante de alcance: el batch NUNCA toca tablas compartidas
//     (guide_pois, guide_poi_media, restaurants, guide_zone_restaurants,
//     guide_zones, guide_agencies, los catálogos globales). Un POI vive en la
//     zona y lo comparten todos los pisos: borrarlo desde aquí vaciaría el mapa
//     de los apartamentos vecinos. Sólo se borra la fila de enlace.
//   - Que la limpieza de R2 se ciñe al prefijo del apartamento y que la caché
//     KV se bumpea (si no, la guía pública seguiría sirviéndose desde caché con
//     X-Cache: HIT después de borrarla — ver CLAUDE.md §3).
//
// No se testea D1 de verdad: env.DB va mockeado y se afirma sobre el SQL que
// se le pasa. Las sentencias reales se validaron aparte contra SQLite.

import { loadWorkerModule } from './_load.mjs';

const { module: guideAdmin, cleanup } = await loadWorkerModule('workerGuideAdmin.js');
const { handleGuideAdminRequests } = guideAdmin;

const JWT_SECRET = 'test-secret-para-borrado-de-apartamentos';
const APT_ID = 'apt_test_1';

// --- Utilidades -------------------------------------------------------------

/** Firma un JWT HS256 igual que generateJWT() en workerAuthentication.js. */
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

/**
 * env de mentira. Registra:
 *  - `batched`: el SQL de cada sentencia que entró en env.DB.batch()
 *  - `singles`: el SQL de las consultas sueltas (SELECT previos, audit log)
 *  - `r2`: prefijos listados y claves borradas
 *  - `kv`: escrituras en GUIDE_CACHE
 */
function makeEnv({ apartmentExists = true } = {}) {
    const batched = [];
    const singles = [];
    const r2 = { listedPrefixes: [], deleted: [] };
    const kv = [];

    const norm = (sql) => sql.replace(/\s+/g, ' ').trim();

    const env = {
        JWT_SECRET,
        batched, singles, r2, kv,
        DB: {
            prepare(sql) {
                const s = norm(sql);
                return {
                    bind(...args) {
                        const stmt = {
                            sql: s,
                            args,
                            async first() {
                                singles.push(s);
                                if (s.includes('FROM guide_apartments WHERE id')) {
                                    return apartmentExists
                                        ? { id: APT_ID, slug: 'piso-test', name: 'Piso Test', agency_id: 'ag_1' }
                                        : null;
                                }
                                if (s.includes('AS info_blocks')) {
                                    return {
                                        info_blocks: 9, phones: 7, poi_links: 10,
                                        store_items: 2, store_orders: 4, tv_devices: 1, sessions: 120,
                                    };
                                }
                                return null;
                            },
                            async all() {
                                singles.push(s);
                                if (s.includes('FROM guide_agency_staff')) {
                                    return { results: [{ agency_id: 'ag_1' }] };
                                }
                                if (s.includes('r2_key')) {
                                    return { results: [{ r2_key: `guide/apartments/${APT_ID}/info/i1/foto.jpg` }] };
                                }
                                return { results: [] };
                            },
                            async run() {
                                singles.push(s);
                                return { success: true };
                            },
                        };
                        return stmt;
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
            async delete(keys) {
                r2.deleted.push(...(Array.isArray(keys) ? keys : [keys]));
            },
        },
        GUIDE_CACHE: {
            async get() { return null; },
            async put(key, value) { kv.push({ key, value }); },
        },
    };
    return env;
}

async function deleteRequest(token, body) {
    return new Request(`https://api.test/guide/admin/apartments/${APT_ID}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
}

// --- Runner mínimo ----------------------------------------------------------

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
    if (cond) { pass++; console.log(`  ok   ${name}${extra ? `  — ${extra}` : ''}`); }
    else { fail++; console.log(`  FAIL ${name}${extra ? `  — ${extra}` : ''}`); }
}
function section(title) { console.log(`\n--- ${title} ---`); }

const superToken = await signTestJWT({ userId: 'u_super', is_superadmin: true }, JWT_SECRET);
const agencyToken = await signTestJWT({ userId: 'u_agency', is_superadmin: false }, JWT_SECRET);

// --- 1. Autorización --------------------------------------------------------

section('Quién puede borrar');
{
    const env = makeEnv();
    const res = await handleGuideAdminRequests(await deleteRequest(agencyToken, { confirm: 'borrar apartamento' }), env);
    const body = await res.json();
    ok('Staff de la agencia dueña → 403', res.status === 403, body.error);
    ok('403 no ejecuta ningún DELETE', env.batched.length === 0);
}
{
    const env = makeEnv();
    const req = new Request(`https://api.test/guide/admin/apartments/${APT_ID}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'borrar apartamento' }),
    });
    const res = await handleGuideAdminRequests(req, env);
    ok('Sin cabecera Authorization → 401', res.status === 401);
    ok('401 no ejecuta ningún DELETE', env.batched.length === 0);
}

// --- 2. Frase de confirmación ----------------------------------------------

section('Confirmación escrita');
for (const [label, body] of [
    ['sin body', undefined],
    ['body vacío', {}],
    ['frase equivocada', { confirm: 'borrar' }],
    ['sólo el nombre del piso', { confirm: 'Piso Test' }],
    ['frase incompleta', { confirm: 'borrar apartamentos' }],
]) {
    const env = makeEnv();
    const res = await handleGuideAdminRequests(await deleteRequest(superToken, body), env);
    ok(`Confirmación ${label} → 400`, res.status === 400);
    ok(`Confirmación ${label} no ejecuta ningún DELETE`, env.batched.length === 0);
}
for (const variante of ['borrar apartamento', 'BORRAR APARTAMENTO', '  Borrar   Apartamento  ']) {
    const env = makeEnv();
    const res = await handleGuideAdminRequests(await deleteRequest(superToken, { confirm: variante }), env);
    ok(`Confirmación válida (${JSON.stringify(variante)}) → 200`, res.status === 200);
}

// --- 3. Apartamento inexistente --------------------------------------------

section('Apartamento inexistente');
{
    const env = makeEnv({ apartmentExists: false });
    const res = await handleGuideAdminRequests(await deleteRequest(superToken, { confirm: 'borrar apartamento' }), env);
    ok('404 si no existe', res.status === 404);
    ok('404 no ejecuta ningún DELETE', env.batched.length === 0);
}

// --- 4. Alcance del borrado -------------------------------------------------

section('Qué se borra y qué NO');
{
    const env = makeEnv();
    const res = await handleGuideAdminRequests(await deleteRequest(superToken, { confirm: 'borrar apartamento' }), env);
    const body = await res.json();
    ok('Borrado correcto → 200', res.status === 200 && body.success === true);

    const sql = env.batched.join('\n');
    const escrituras = env.batched.filter(s => /^(DELETE|UPDATE)\b/i.test(s));
    ok('Todas las sentencias del batch son DELETE/UPDATE', escrituras.length === env.batched.length,
        `${escrituras.length}/${env.batched.length}`);

    // Lo compartido: ni se menciona como objetivo de escritura.
    const INTOCABLES = [
        'guide_pois', 'guide_poi_media', 'guide_zone_restaurants', 'restaurants',
        'guide_zones', 'guide_agencies', 'guide_agency_staff', 'users',
        'guide_info_categories', 'guide_phone_categories', 'guide_coupons',
    ];
    for (const tabla of INTOCABLES) {
        const tocada = env.batched.some(s => new RegExp(`^(DELETE FROM|UPDATE) ${tabla}\\b`, 'i').test(s));
        ok(`NO se escribe en ${tabla}`, !tocada);
    }
    // guide_pois puede aparecer como substring de guide_apartment_pois; el
    // check de arriba usa ^ + \b justo para no confundirlos. Se comprueba
    // además que el enlace SÍ se borra.
    ok('SÍ se borra el enlace guide_apartment_pois',
        env.batched.some(s => /^DELETE FROM guide_apartment_pois WHERE apartment_id/i.test(s)));

    // Lo propio del apartamento.
    const OBLIGATORIAS = [
        'guide_apartment_info', 'guide_apartment_media', 'guide_info_steps', 'guide_info_step_media',
        'guide_apartment_phones', 'guide_welcome_modals', 'guide_store_items', 'guide_store_orders',
        'guide_store_order_items', 'guide_tv_devices', 'guide_tv_events', 'guide_sessions',
        'guide_section_views', 'guide_affiliate_intents', 'guide_apartments',
    ];
    for (const tabla of OBLIGATORIAS) {
        ok(`SÍ se borra de ${tabla}`, env.batched.some(s => new RegExp(`^DELETE FROM ${tabla}\\b`, 'i').test(s)));
    }

    // translations: sólo las 4 entidades propias del piso, ninguna compartida.
    const trStmts = env.batched.filter(s => /^DELETE FROM translations\b/i.test(s));
    ok('Se limpian 4 tipos de translations', trStmts.length === 4, String(trStmts.length));
    for (const tipo of ['apartment_info', 'guide_step', 'welcome_modal', 'store_item']) {
        ok(`translations de '${tipo}'`, trStmts.some(s => s.includes(`entity_type = '${tipo}'`)));
    }
    for (const tipo of ['poi', 'zone', 'restaurant', 'info_category', 'phone_category']) {
        ok(`NO se tocan translations de '${tipo}'`, !trStmts.some(s => s.includes(`entity_type = '${tipo}'`)));
    }

    // El ledger de comisiones se conserva: sólo se desengancha el intent.
    const ledger = env.batched.filter(s => s.includes('guide_commission_ledger'));
    ok('guide_commission_ledger sólo se actualiza, no se borra',
        ledger.length === 1 && /^UPDATE guide_commission_ledger SET intent_id = NULL/i.test(ledger[0]));

    // Los items del catálogo platform llevan apartment_id NULL: el WHERE los excluye.
    const storeItems = env.batched.find(s => /^DELETE FROM guide_store_items\b/i.test(s));
    ok('guide_store_items filtra por apartment_id (deja intacto el catálogo platform)',
        /WHERE apartment_id = \?1$/.test(storeItems), storeItems);

    // El apartamento va el último: si algo revienta antes, la fila padre sigue ahí.
    ok('guide_apartments es la última sentencia',
        /^DELETE FROM guide_apartments\b/i.test(env.batched[env.batched.length - 1]));

    // Todo el batch va parametrizado por el id del apartamento.
    ok('Ninguna sentencia interpola el id a mano', !sql.includes(APT_ID));
}

// --- 5. R2 y caché KV -------------------------------------------------------

section('Media en R2 y caché KV');
{
    const env = makeEnv();
    const res = await handleGuideAdminRequests(await deleteRequest(superToken, { confirm: 'borrar apartamento' }), env);
    const body = await res.json();

    ok('Sólo se lista el prefijo del apartamento',
        env.r2.listedPrefixes.length === 1 && env.r2.listedPrefixes[0] === `guide/apartments/${APT_ID}/`,
        env.r2.listedPrefixes.join(','));
    ok('Todas las claves borradas cuelgan de ese prefijo',
        env.r2.deleted.length > 0 && env.r2.deleted.every(k => k.startsWith(`guide/apartments/${APT_ID}/`)),
        env.r2.deleted.join(','));
    ok('El r2_key de la fila en BD también se borra',
        env.r2.deleted.includes(`guide/apartments/${APT_ID}/info/i1/foto.jpg`));

    ok('Se bumpea ver:apt:{slug} (no se borra la clave)',
        env.kv.length === 1 && env.kv[0].key === 'ver:apt:piso-test' && Number(env.kv[0].value) > 0,
        JSON.stringify(env.kv));

    ok('La respuesta informa de lo borrado',
        body.deleted?.info_blocks === 9 && body.deleted?.poi_links === 10 && body.deleted?.media_files === 2,
        JSON.stringify(body.deleted));

    ok('Queda registrado en security_audit_log',
        env.singles.some(s => s.includes('INSERT INTO security_audit_log')));
}

// --- 6. R2 caído no revierte el borrado ------------------------------------

section('R2 caído');
{
    const env = makeEnv();
    env.R2_BUCKET.list = async () => { throw new Error('R2 down'); };
    const res = await handleGuideAdminRequests(await deleteRequest(superToken, { confirm: 'borrar apartamento' }), env);
    const body = await res.json();
    ok('Sigue devolviendo 200 (la BD ya está limpia)', res.status === 200 && body.success === true);
    ok('Avisa de los ficheros huérfanos', typeof body.warning === 'string' && body.warning.includes('R2'));
    ok('La caché se bumpea igualmente', env.kv.length === 1);
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail > 0 ? 1 : 0);
