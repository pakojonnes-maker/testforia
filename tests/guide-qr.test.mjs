// Test de «QR para enmarcar» (workerGuideQr.js) y del origen de la sesión (?o=marco).
// Ejecutar:  npm run test:guide-qr
//
// Lo que tiene que seguir siendo verdad:
//
//   - Una agencia solo ve y guarda LO SUYO. El agency_id viaja en la query o en el cuerpo,
//     no en la ruta, así que ninguna capa genérica lo protege: lo hace este módulo.
//   - Las láminas son de la plataforma: solo un superadmin las cambia.
//   - Guardar el diseño NO escribe en KV. updateAgency sube la versión de caché de cada piso
//     (una escritura por piso, con 1.000 al día para toda la cuenta) y aquí no cambia nada
//     de lo que ve el huésped.
//   - Sustituir una lámina usa una clave R2 NUEVA: /media/ se cachea 24 h.
//   - El origen de la sesión es una lista cerrada, y si la columna aún no existe (worker
//     desplegado antes que la migración 0105) la sesión se abre igual.

import { loadWorkerModule } from './_load.mjs';

const { module: guideQr, cleanup: cleanupQr } = await loadWorkerModule('workerGuideQr.js');
const { module: tracking, cleanup: cleanupTracking } = await loadWorkerModule('workerGuideTracking.js');
const { handleGuideQrRequests } = guideQr;
const { handleGuideTracking } = tracking;

const JWT_SECRET = 'test-secret-para-qr-enmarcar';

let pass = 0;
let fail = 0;
function ok(name, cond) {
    if (cond) { pass += 1; console.log(`  ok   ${name}`); }
    else { fail += 1; console.log(`  FAIL ${name}`); }
}

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

function makeEnv({ staffAgencies = ['ag_1'], entrySourceColumn = true } = {}) {
    const calls = { runs: [], batches: [], r2: [], kvPuts: 0 };
    const norm = (sql) => sql.replace(/\s+/g, ' ').trim();

    const rowsFor = (sql) => {
        if (sql.includes('FROM guide_agencies WHERE id')) {
            return [{
                id: 'ag_1', name: 'Agencia Uno', slug: 'agencia-uno', logo_url: null,
                primary_color: '#0038ae', secondary_color: null, accent_color: null,
                qr_design: '{"version":1,"frame":{"shape":"etiqueta"}}',
            }];
        }
        if (sql.includes('FROM guide_apartments a')) {
            return [{ id: 'apt_1', name: 'Piso Carabeo', slug: 'piso-carabeo-1a2b', zone_id: 'zone_nerja', zone_name: 'Nerja', frame_sessions: 4, frame_sessions_30d: 3, frame_visitors_30d: 2 }];
        }
        if (sql.includes('FROM guide_qr_posters WHERE is_active = 1')) {
            // Dos activas en la misma zona (no debería pasar, pero no hay UNIQUE): gana la más reciente.
            return [
                { id: 'qrp_new', zone_id: 'zone_nerja', name: 'Nueva', r2_key: 'guide/qr-posters/nerja-new.png', width: 3584, height: 4800, qr_x: 0.5, qr_y: 0.56, modified_at: '2026-10-10' },
                { id: 'qrp_old', zone_id: 'zone_nerja', name: 'Vieja', r2_key: 'guide/qr-posters/poster-vintage-nerja.png', width: 896, height: 1200, qr_x: 0.5, qr_y: 0.56, modified_at: '2026-10-01' },
            ];
        }
        if (sql.includes('FROM guide_zones WHERE is_active')) {
            return [{ id: 'zone_nerja', name: 'Nerja', slug: 'nerja' }];
        }
        return [];
    };

    const statement = (rawSql, args = []) => {
        const sql = norm(rawSql);
        return {
            sql,
            args,
            bind(...bound) { return statement(rawSql, bound); },
            async first() {
                if (sql.includes('FROM guide_zones WHERE id')) {
                    return args[0] === 'zone_malaga' ? { id: 'zone_malaga', name: 'Málaga', slug: 'malaga' } : null;
                }
                if (sql.includes('FROM guide_qr_posters WHERE id')) {
                    return args[0] === 'qrp_malaga'
                        ? { id: 'qrp_malaga', zone_id: 'zone_malaga', name: 'Póster', r2_key: 'guide/qr-posters/poster-vintage-malaga.png', width: 896, height: 1200, qr_x: 0.5, qr_y: 0.545 }
                        : null;
                }
                if (sql.includes('FROM guide_apartments WHERE id')) {
                    return { id: 'apt_1', zone_id: 'zone_nerja' };
                }
                return null;
            },
            async all() {
                if (sql.includes('FROM guide_agency_staff')) {
                    return { results: staffAgencies.map((agency_id) => ({ agency_id })) };
                }
                return { results: rowsFor(sql) };
            },
            async run() {
                if (sql.includes('SET entry_source') && !entrySourceColumn) {
                    throw new Error('no such column: entry_source');
                }
                calls.runs.push({ sql, args });
                return { meta: { changes: args[args.length - 1] === 'ag_inexistente' ? 0 : 1 } };
            },
        };
    };

    return {
        JWT_SECRET,
        calls,
        DB: {
            prepare: (sql) => statement(sql),
            async batch(statements) {
                calls.batches.push(statements.map((s) => ({ sql: s.sql, args: s.args })));
                return statements.map((s) => ({ results: rowsFor(s.sql) }));
            },
        },
        R2_BUCKET: {
            async put(key, _body, options) { calls.r2.push({ key, options }); },
        },
        GUIDE_CACHE: {
            async get() { return null; },
            async put() { calls.kvPuts += 1; },
        },
    };
}

const superToken = await signTestJWT({ userId: 'u_super', is_superadmin: true }, JWT_SECRET);
const agencyToken = await signTestJWT({ userId: 'u_staff', is_superadmin: false }, JWT_SECRET);

const call = (env, path, { token = agencyToken, method = 'GET', body, form } = {}) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const init = { method, headers };
    if (form) init.body = form;
    else if (body !== undefined) { init.body = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
    return handleGuideQrRequests(new Request(`https://api.test${path}`, init), env);
};

const posterForm = ({ type = 'image/png', zone = 'zone_malaga' } = {}) => {
    const form = new FormData();
    form.append('file', new File([new Uint8Array([1, 2, 3])], 'lamina grande.PNG', { type }));
    form.append('zone_id', zone);
    form.append('width', '3584');
    form.append('height', '4800');
    return form;
};

console.log('\nQR para enmarcar: alcance por agencia\n');
{
    ok('Una ruta que no es suya devuelve null (cascada de worker.js)',
        await handleGuideQrRequests(new Request('https://api.test/guide/admin/agencies'), makeEnv()) === null);
    ok('Sin token → 401', (await call(makeEnv(), '/guide/admin/qr/overview?agency_id=ag_1', { token: null })).status === 401);
    ok('Usuario sin ninguna agencia → 403',
        (await call(makeEnv({ staffAgencies: [] }), '/guide/admin/qr/overview?agency_id=ag_1')).status === 403);
}
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/overview?agency_id=ag_2');
    ok('Agencia ajena → 403', res.status === 403);
    ok('…y sin haber leído nada de ella', env.calls.batches.length === 0);
}
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/overview?agency_id=ag_1');
    const body = await res.json();
    ok('Su agencia → 200', res.status === 200 && body.success === true);
    ok('El diseño llega ya como objeto', body.agency?.qr_design?.frame?.shape === 'etiqueta');
    ok('Trae los pisos con sus entradas por el marco', body.apartments?.[0]?.frame_sessions_30d === 3);
    ok('Una sola lámina por zona, la más reciente', body.posters?.length === 1 && body.posters[0].id === 'qrp_new');
    ok('La lámina lleva URL de /media/', body.posters?.[0]?.url === 'https://api.test/media/guide/qr-posters/nerja-new.png');
    ok('…y no expone la clave R2', !('r2_key' in (body.posters?.[0] || {})));
    ok('El personal de agencia no gestiona láminas', body.can_manage_posters === false);
    const sql = env.calls.batches[0].map((s) => s.sql).join(' ');
    ok('Los únicos respetan el COALESCE de la analítica',
        sql.includes('COALESCE(s.visitor_id, s.visitor_day_hash, s.device_fingerprint, s.id)'));
}
{
    const body = await (await call(makeEnv(), '/guide/admin/qr/overview?agency_id=ag_1', { token: superToken })).json();
    ok('El superadmin sí gestiona láminas', body.can_manage_posters === true);
}

console.log('\nQR para enmarcar: guardar el diseño\n');
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/design', { method: 'PUT', body: { agency_id: 'ag_2', design: { version: 1 } } });
    ok('Diseño de una agencia ajena → 403', res.status === 403);
    ok('…sin escribir nada', env.calls.runs.length === 0);
}
{
    const env = makeEnv();
    const design = { version: 1, qr: { dots: 'rounded' }, frame: { shape: 'etiqueta' }, texts: { top: 'ESCANEA' }, print: { size: '15x20' }, colado: '<script>' };
    const res = await call(env, '/guide/admin/qr/design', { method: 'PUT', body: { agency_id: 'ag_1', design } });
    const stored = JSON.parse(env.calls.runs[0]?.args?.[0] || '{}');
    ok('Su diseño → 200', res.status === 200);
    ok('Guarda las claves del editor', stored.frame?.shape === 'etiqueta' && stored.qr?.dots === 'rounded');
    ok('…y descarta las que no conoce', !('colado' in stored));
    ok('Escribe solo en guide_agencies', env.calls.runs.length === 1 && env.calls.runs[0].sql.startsWith('UPDATE guide_agencies SET qr_design'));
    ok('No toca la caché KV de la guía', env.calls.kvPuts === 0);
}
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/design', { method: 'PUT', body: { agency_id: 'ag_1', design: null } });
    ok('design: null vuelve al diseño por defecto', res.status === 200 && env.calls.runs[0]?.args?.[0] === null);
}
{
    const big = { version: 1, texts: { top: 'x'.repeat(9000) } };
    ok('Un diseño enorme → 400',
        (await call(makeEnv(), '/guide/admin/qr/design', { method: 'PUT', body: { agency_id: 'ag_1', design: big } })).status === 400);
    ok('Un diseño que no es objeto → 400',
        (await call(makeEnv(), '/guide/admin/qr/design', { method: 'PUT', body: { agency_id: 'ag_1', design: ['a'] } })).status === 400);
    ok('Agencia que no existe → 404',
        (await call(makeEnv(), '/guide/admin/qr/design', { token: superToken, method: 'PUT', body: { agency_id: 'ag_inexistente', design: { version: 1 } } })).status === 404);
}

console.log('\nQR para enmarcar: láminas\n');
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/posters', { method: 'POST', form: posterForm() });
    ok('Personal de agencia no sube láminas → 403', res.status === 403);
    ok('…y no llega a R2', env.calls.r2.length === 0);
    ok('Ni las recoloca → 403',
        (await call(env, '/guide/admin/qr/posters/qrp_malaga', { method: 'PUT', body: { qr_y: 0.5 } })).status === 403);
}
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/posters', { token: superToken, method: 'POST', form: posterForm() });
    const body = await res.json();
    const key = env.calls.r2[0]?.key || '';
    ok('Superadmin sube la lámina → 200', res.status === 200 && body.success === true);
    ok('Clave nueva con el slug de la zona', /^guide\/qr-posters\/malaga-[a-z0-9]+\.png$/.test(key));
    ok('…que no es la clave de la lámina anterior', key !== 'guide/qr-posters/poster-vintage-malaga.png');
    ok('La extensión sale del tipo, no del nombre del archivo', key.endsWith('.png') && !key.includes('lamina'));
    ok('Guarda el tipo de contenido', env.calls.r2[0]?.options?.httpMetadata?.contentType === 'image/png');
    const batch = env.calls.batches[0] || [];
    ok('Desactiva la anterior de esa zona', batch[0]?.sql.includes('SET is_active = 0') && batch[0]?.args[0] === 'zone_malaga');
    ok('…e inserta la nueva con su tamaño', batch[1]?.sql.startsWith('INSERT INTO guide_qr_posters') && batch[1]?.args[4] === 3584);
    ok('Devuelve la URL de la nueva', body.poster?.url === `https://api.test/media/${key}`);
}
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/posters', { token: superToken, method: 'POST', form: posterForm({ type: 'image/svg+xml' }) });
    ok('Un SVG no es una lámina → 400', res.status === 400);
    ok('…y no llega a R2', env.calls.r2.length === 0);
    ok('Zona que no existe → 404',
        (await call(makeEnv(), '/guide/admin/qr/posters', { token: superToken, method: 'POST', form: posterForm({ zone: 'zone_nada' }) })).status === 404);
}
{
    const env = makeEnv();
    const res = await call(env, '/guide/admin/qr/posters/qrp_malaga', { token: superToken, method: 'PUT', body: { qr_x: 0.4, qr_y: 1.4 } });
    const body = await res.json();
    ok('Recolocar el hueco → 200', res.status === 200);
    ok('Un valor fuera de la lámina se recorta', body.poster?.qr_y === 0.85 && body.poster?.qr_x === 0.4);
    ok('Lámina que no existe → 404',
        (await call(makeEnv(), '/guide/admin/qr/posters/qrp_nada', { token: superToken, method: 'PUT', body: { qr_y: 0.5 } })).status === 404);
    ok('Ruta desconocida → 404', (await call(makeEnv(), '/guide/admin/qr/nada', { token: superToken })).status === 404);
}

console.log('\nOrigen de la sesión (?o=marco)\n');
const startSession = (env, source) => handleGuideTracking(new Request('https://api.test/guide/track/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'test', 'CF-Connecting-IP': '203.0.113.7' },
    body: JSON.stringify({ apartmentId: 'apt_1', language: 'en', source }),
}), env);
const sourceWrites = (env) => env.calls.runs.filter((r) => r.sql.includes('SET entry_source'));
{
    const env = makeEnv();
    const res = await startSession(env, 'marco');
    const body = await res.json();
    const writes = sourceWrites(env);
    ok('Con ?o=marco la sesión se abre', res.status === 200 && !!body.sessionId);
    ok('…y se anota el origen en ESA sesión', writes.length === 1 && writes[0].args[0] === 'marco' && writes[0].args[1] === body.sessionId);
}
{
    const env = makeEnv();
    await startSession(env, undefined);
    ok('Sin origen no hay escritura de más', sourceWrites(env).length === 0);
}
{
    const env = makeEnv();
    const res = await startSession(env, 'x"; DROP TABLE guide_sessions; --');
    ok('Un origen desconocido se ignora', res.status === 200 && sourceWrites(env).length === 0);
}
{
    const env = makeEnv({ entrySourceColumn: false });
    const res = await startSession(env, 'marco');
    const body = await res.json();
    ok('Sin la columna (worker antes que la migración) la sesión se abre igual', res.status === 200 && !!body.sessionId);
}

cleanupQr();
cleanupTracking();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail > 0 ? 1 : 0);
