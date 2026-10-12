// Test del alcance de los bloques de guía (/guide/admin/apartments/:aptId/info/:infoId/...).
// Ejecutar:  npm run test:guide-info-scope
//
// Estas rutas llevan DOS ids: el apartamento y el bloque. checkAptAccess() sólo
// mira el primero, y hasta oct-2026 nadie comprobaba que el bloque fuera de ese
// apartamento. Con acceso al piso A bastaba poner A en la ruta y el id de un
// bloque del piso B (de otra agencia) para:
//
//   - leer sus textos en todos los idiomas (incluido el código de la puerta),
//   - borrarle las traducciones y los ficheros de sus fotos en R2,
//   - subirle fotos, o crear, cambiar y borrar sus pasos.
//
// Lo que se afirma aquí, ruta por ruta: un bloque ajeno contesta 404 y no deja
// NINGÚN rastro (ni una escritura en D1, ni en R2, ni una lectura de sus datos).
// Y, para que el test no pase «porque todo da 404», que las mismas rutas con el
// bloque propio siguen funcionando.
//
// No se testea D1 de verdad: env.DB es un modelo mínimo en memoria (qué bloque
// es de qué piso, qué foto y qué paso de qué bloque) que anota lo que se le pide.

import { loadWorkerModule } from './_load.mjs';

const { module: guideAdmin, cleanup } = await loadWorkerModule('workerGuideAdmin.js');
const { handleGuideAdminRequests } = guideAdmin;

const JWT_SECRET = 'test-secret-para-el-alcance-de-los-bloques';

// El piso A es de la agencia del usuario; el B, de otra.
const APARTMENTS = { apt_a: { agency_id: 'ag_a', slug: 'piso-a' }, apt_b: { agency_id: 'ag_b', slug: 'piso-b' } };
const INFOS = { info_a: 'apt_a', info_b: 'apt_b' };
const MEDIA = { med_a: 'info_a', med_b: 'info_b' };
const STEPS = { step_a: 'info_a', step_b: 'info_b' };

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
 * env de mentira. Anota:
 *  - `writes`: cada INSERT/UPDATE/DELETE (suelto o en batch), con sus argumentos
 *  - `reads`: cada SELECT, con sus argumentos
 *  - `r2`: claves escritas y borradas
 */
function makeEnv() {
    const writes = [];
    const reads = [];
    const r2 = { put: [], deleted: [] };
    const norm = (sql) => sql.replace(/\s+/g, ' ').trim();
    const isWrite = (s) => /^(INSERT|UPDATE|DELETE)\b/i.test(s);

    /** Fila de una consulta de pertenencia: sólo si TODOS los ids que trae cuadran entre sí. */
    const owned = (s, args) => {
        const apt = args.find(a => a in APARTMENTS);
        const info = args.find(a => a in INFOS);
        const media = args.find(a => a in MEDIA);
        const step = args.find(a => a in STEPS);
        if (s.includes('FROM guide_apartment_media')) {
            if (!media || MEDIA[media] !== info) return null;
            if (apt && INFOS[info] !== apt) return null;
            return { r2_key: `guide/apartments/${INFOS[info]}/info/${info}/${media}.webp`, media_type: 'image' };
        }
        if (s.includes('FROM guide_info_steps')) {
            return step && STEPS[step] === info ? { id: step } : null;
        }
        if (s.includes('FROM guide_apartment_info')) {
            return info && apt && INFOS[info] === apt ? { id: info } : null;
        }
        return null;
    };

    const env = {
        JWT_SECRET,
        writes, reads, r2,
        DB: {
            prepare(sql) {
                const s = norm(sql);
                const make = (args) => ({
                    sql: s,
                    args,
                    async first() {
                        reads.push({ sql: s, args });
                        if (s.includes('FROM guide_apartments WHERE id')) return APARTMENTS[args[0]] || null;
                        return owned(s, args);
                    },
                    async all() {
                        reads.push({ sql: s, args });
                        if (s.includes('FROM guide_agency_staff')) return { results: [{ agency_id: 'ag_a' }] };
                        if (s.includes('FROM translations')) {
                            return { results: [{ language_code: 'es', field: 'content', value: `texto de ${args[0]}` }] };
                        }
                        if (s.includes('r2_key')) {
                            return { results: Object.keys(MEDIA).filter(m => MEDIA[m] === args[0]).map(m => ({ r2_key: `foto-de-${m}` })) };
                        }
                        return { results: [] };
                    },
                    async run() {
                        (isWrite(s) ? writes : reads).push({ sql: s, args });
                        return { success: true };
                    },
                });
                return { ...make([]), bind: (...args) => make(args) };
            },
            async batch(stmts) {
                for (const st of stmts) writes.push({ sql: st.sql, args: st.args });
                return stmts.map(() => ({ success: true }));
            },
        },
        R2_BUCKET: {
            async put(key) { r2.put.push(key); },
            async delete(keys) { r2.deleted.push(...(Array.isArray(keys) ? keys : [keys])); },
        },
        GUIDE_CACHE: {
            async get() { return null; },
            async put() {},
        },
    };
    return env;
}

function request(token, method, path, body) {
    const headers = { Authorization: `Bearer ${token}` };
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    return new Request(`https://api.test/guide/admin/${path}`, { method, headers, body: payload });
}

function photo() {
    const form = new FormData();
    form.append('file', new File([new Uint8Array([1, 2, 3])], 'foto.webp', { type: 'image/webp' }));
    return form;
}

/** Lecturas que sacan DATOS de un bloque (no las de pertenencia): textos, pasos, fotos. */
const dataReads = (env) => env.reads.filter(r =>
    /FROM translations|SELECT \* FROM guide_info_steps|SELECT r2_key FROM guide_apartment_media WHERE apartment_info_id/.test(r.sql));

// --- Runner mínimo ----------------------------------------------------------

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
    if (cond) { pass++; console.log(`  ok   ${name}${extra ? `  — ${extra}` : ''}`); }
    else { fail++; console.log(`  FAIL ${name}${extra ? `  — ${extra}` : ''}`); }
}
function section(title) { console.log(`\n--- ${title} ---`); }

const agencyToken = await signTestJWT({ userId: 'u_agency', is_superadmin: false }, JWT_SECRET);
const superToken = await signTestJWT({ userId: 'u_super', is_superadmin: true }, JWT_SECRET);

// Cada ruta que lleva un bloque: [nombre, método, sufijo tras /info/<bloque>, cuerpo].
// `own` es el sufijo cuando el recurso de dentro (foto, paso) es del propio bloque.
const ROUTES = [
    { name: 'leer sus textos', method: 'GET', tail: '/translations' },
    { name: 'borrar el bloque', method: 'DELETE', tail: '' },
    { name: 'subirle una foto', method: 'POST', tail: '/media', body: photo },
    { name: 'recolocar una foto', method: 'PUT', tail: m => `/media/${m.media}`, body: () => ({ after_block: 1 }) },
    { name: 'borrarle una foto', method: 'DELETE', tail: m => `/media/${m.media}` },
    { name: 'listar sus pasos', method: 'GET', tail: '/steps' },
    { name: 'crearle un paso', method: 'POST', tail: '/steps', body: () => ({ step_number: 1, title_es: 'Paso', content_es: 'Texto' }) },
    { name: 'reordenar sus pasos', method: 'PUT', tail: m => '/steps/reorder', body: m => ({ items: [{ id: m.step, step_number: 2 }] }) },
    { name: 'cambiarle un paso', method: 'PUT', tail: m => `/steps/${m.step}`, body: () => ({ step_number: 3, title_es: 'Otro' }) },
    { name: 'borrarle un paso', method: 'DELETE', tail: m => `/steps/${m.step}` },
];
const A = { info: 'info_a', media: 'med_a', step: 'step_a' };
const B = { info: 'info_b', media: 'med_b', step: 'step_b' };
const tailOf = (route, ids) => (typeof route.tail === 'function' ? route.tail(ids) : route.tail);
const call = async (token, apt, ids, route, env) => {
    const res = await handleGuideAdminRequests(
        request(token, route.method, `apartments/${apt}/info/${ids.info}${tailOf(route, ids)}`, route.body?.(ids)), env);
    return res;
};

// --- 1. El ataque: mi piso en la ruta, el bloque de otro --------------------

section('Con acceso al piso A, un bloque del piso B');
for (const route of ROUTES) {
    const env = makeEnv();
    const res = await call(agencyToken, 'apt_a', B, route, env);
    ok(`${route.name} → 404`, res.status === 404, `fue ${res.status}`);
    ok(`${route.name}: nada escrito en D1`, env.writes.length === 0, env.writes.map(w => w.sql.slice(0, 50)).join(' | '));
    ok(`${route.name}: nada tocado en R2`, env.r2.put.length === 0 && env.r2.deleted.length === 0,
        [...env.r2.put, ...env.r2.deleted].join(', '));
    ok(`${route.name}: ningún dato suyo leído`, dataReads(env).length === 0, dataReads(env).map(r => r.sql.slice(0, 50)).join(' | '));
}

// --- 2. El bloque es mío, pero la foto o el paso son de otro ----------------

section('Bloque propio, foto o paso de otro bloque');
for (const route of ROUTES.filter(r => typeof r.tail === 'function' && r.name !== 'reordenar sus pasos')) {
    const env = makeEnv();
    const mixed = { info: 'info_a', media: 'med_b', step: 'step_b' };
    const res = await call(agencyToken, 'apt_a', mixed, route, env);
    ok(`${route.name} → 404`, res.status === 404, `fue ${res.status}`);
    ok(`${route.name}: nada escrito`, env.writes.length === 0 && env.r2.deleted.length === 0,
        env.writes.map(w => w.sql.slice(0, 50)).join(' | '));
}
{
    // Reordenar no puede dar 404 por un id suelto de la lista (es un lote): lo que
    // importa es que la sentencia se ciña al bloque de la ruta.
    const env = makeEnv();
    const res = await call(agencyToken, 'apt_a', { info: 'info_a', step: 'step_b' }, ROUTES.find(r => r.name === 'reordenar sus pasos'), env);
    const scoped = env.writes.every(w => /apartment_info_id = \?/.test(w.sql) && w.args.includes('info_a'));
    ok('reordenar: cada UPDATE va filtrado por el bloque de la ruta', res.status === 200 && env.writes.length === 1 && scoped);
}

// --- 3. Ni siquiera un superadmin cruza piso y bloque -----------------------

section('Superadmin con piso y bloque que no casan');
for (const route of ROUTES) {
    const env = makeEnv();
    const res = await call(superToken, 'apt_a', B, route, env);
    ok(`${route.name} → 404 y sin escrituras`, res.status === 404 && env.writes.length === 0 && env.r2.put.length === 0 && env.r2.deleted.length === 0,
        `fue ${res.status}`);
}

// --- 4. El piso de otra agencia sigue cerrado -------------------------------

section('El piso B directamente');
for (const route of ROUTES) {
    const env = makeEnv();
    const res = await call(agencyToken, 'apt_b', B, route, env);
    ok(`${route.name} → 403`, res.status === 403 && env.writes.length === 0, `fue ${res.status}`);
}

// --- 5. Lo propio sigue funcionando -----------------------------------------

section('Con el bloque propio todo sigue igual');
for (const route of ROUTES) {
    const env = makeEnv();
    const res = await call(agencyToken, 'apt_a', A, route, env);
    const body = await res.json().catch(() => ({}));
    ok(`${route.name} → 200`, res.status === 200 && body.success === true, `fue ${res.status} ${body.error || ''}`);
    if (route.method !== 'GET') {
        ok(`${route.name}: escribe`, env.writes.length > 0 || env.r2.deleted.length > 0 || env.r2.put.length > 0);
    }
}
{
    const env = makeEnv();
    const res = await call(agencyToken, 'apt_a', A, ROUTES[0], env);
    const body = await res.json();
    ok('los textos que devuelve son los del bloque pedido', body.translations?.es?.content === 'texto de info_a');
}
{
    const env = makeEnv();
    await call(agencyToken, 'apt_a', A, ROUTES.find(r => r.name === 'subirle una foto'), env);
    ok('la foto se guarda bajo el bloque propio', env.r2.put.length === 1 && env.r2.put[0].startsWith('guide/apartments/apt_a/info/info_a/'), env.r2.put[0]);
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail ? 1 : 0);
