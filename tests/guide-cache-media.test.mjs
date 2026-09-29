// Test de las protecciones del free tier en guide/TV y del streaming de vídeo.
// Ejecutar:  npm run test:guide-cache-media
//
//   1. Un ?lang= inventado no puede fabricar claves de caché (cada una costaba
//      una carga completa en D1 y una escritura de KV; el cupo son 1.000/día).
//   2. Un put que lanza (cupo de KV agotado) no rompe la respuesta.
//   3. Range sobre /media/* devuelve 206 con los bytes pedidos. El código previo
//      llamaba a .slice() sobre un ReadableStream, fallaba en silencio y
//      devolvía el archivo entero con un 200.

import { loadWorkerModule } from './_load.mjs';

const { module: guide, cleanup: c1 } = await loadWorkerModule('workerGuide.js');
const { module: cache, cleanup: c2 } = await loadWorkerModule('workerGuideCache.js');
const { module: media, cleanup: c3 } = await loadWorkerModule('workerMedia.js');
const { module: ai, cleanup: c4 } = await loadWorkerModule('workerGuideAI.js');
const { module: tv, cleanup: c5 } = await loadWorkerModule('workerTvScreen.js');
const { module: tracking, cleanup: c6 } = await loadWorkerModule('workerGuideTracking.js');

let failures = 0;
function check(name, ok, detail = '') {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  → ' + detail}`);
    if (!ok) failures++;
}

// --- 1. lang ---------------------------------------------------------------
check('resolveGuideLang respeta un idioma activo', guide.resolveGuideLang('ko') === 'ko');
check('resolveGuideLang cae a es con basura', guide.resolveGuideLang('a1') === 'es');
check('resolveGuideLang cae a es con obsoleto (nl)', guide.resolveGuideLang('nl') === 'es');
check('resolveGuideLang cae a es sin valor', guide.resolveGuideLang(undefined) === 'es');

for (const [label, fn] of [
    ['guía', (env, l) => guide.handleGetGuidebook(env, 'piso', l, 'https://x', 'guide')],
    ['TV', (env, l) => guide.handleGetGuidebook(env, 'piso', l, 'https://x', 'tv')],
]) {
    const keys = [];
    const env = {
        GUIDE_CACHE: { get: async (k) => { keys.push(k); return null; }, put: async () => {} },
        DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
    };
    await fn(env, 'zz-inventado');
    const dataKey = keys.find(k => k.startsWith('guide:'));
    check(`${label}: ?lang inventado usa la clave de es`, !!dataKey && dataKey.includes(':es:'), String(dataKey));
}

// --- 2. put que lanza -----------------------------------------------------------
{
    const env = { GUIDE_CACHE: { put: async () => { throw new Error('KV put() limit exceeded for the day.'); } } };
    let threw = false;
    try { await cache.putGuideCache(env, 'k', 'v'); } catch { threw = true; }
    check('putGuideCache traga el error de cupo de KV', !threw);
    let stored = null;
    await cache.putGuideCache({ GUIDE_CACHE: { put: async (k, v, o) => { stored = { k, v, o }; } } }, 'k', 'v');
    check('putGuideCache escribe con TTL de 24 h', stored?.o?.expirationTtl === 86400);
}

// --- 3. Range en /media -----------------------------------------------------------
const BYTES = new Uint8Array(1000).map((_, i) => i % 251);
const r2 = {
    async head(key) { return key === 'v.mp4' ? { size: BYTES.length } : null; },
    async get(key, opts) {
        if (key !== 'v.mp4') return null;
        const base = { size: BYTES.length, etag: 'e', httpMetadata: { contentType: 'video/mp4' } };
        const r = opts?.range;
        if (!r) return { ...base, body: new Blob([BYTES]).stream() };
        let offset, length;
        if ('suffix' in r) { length = Math.min(r.suffix, BYTES.length); offset = BYTES.length - length; }
        else {
            offset = r.offset ?? 0;
            if (offset >= BYTES.length) throw new Error('range not satisfiable');
            length = Math.min(r.length ?? BYTES.length - offset, BYTES.length - offset);
        }
        return { ...base, range: { offset, length }, body: new Blob([BYTES.slice(offset, offset + length)]).stream() };
    },
};
const call = (range) => media.handleMediaRequests(
    new Request('https://w.dev/media/v.mp4', { headers: range ? { Range: range } : {} }), { R2_BUCKET: r2 });
const bytesOf = async (res) => new Uint8Array(await res.arrayBuffer());

{
    const res = await call('bytes=100-199');
    const body = await bytesOf(res);
    check('bytes=100-199 → 206', res.status === 206, res.status);
    check('  Content-Range correcto', res.headers.get('Content-Range') === 'bytes 100-199/1000', res.headers.get('Content-Range'));
    check('  100 bytes exactos y los correctos', body.length === 100 && body[0] === BYTES[100] && body[99] === BYTES[199]);
}
{
    const res = await call('bytes=900-');
    const body = await bytesOf(res);
    check('bytes=900- → 206 hasta el final', res.status === 206 && body.length === 100 && res.headers.get('Content-Range') === 'bytes 900-999/1000', `${res.status} ${res.headers.get('Content-Range')}`);
}
{
    const res = await call('bytes=-50');
    const body = await bytesOf(res);
    check('bytes=-50 → últimos 50', res.status === 206 && body.length === 50 && res.headers.get('Content-Range') === 'bytes 950-999/1000', `${res.status} ${res.headers.get('Content-Range')}`);
}
{
    const res = await call('bytes=0-99999');
    const body = await bytesOf(res);
    check('rango que se pasa del final se recorta', res.status === 206 && body.length === 1000 && res.headers.get('Content-Range') === 'bytes 0-999/1000', `${res.status} ${res.headers.get('Content-Range')}`);
}
{
    const res = await call('bytes=5000-');
    check('offset fuera del archivo → 416', res.status === 416 && res.headers.get('Content-Range') === 'bytes */1000', `${res.status}`);
}
{
    const res = await call(null);
    const body = await bytesOf(res);
    check('sin Range → 200 completo con Content-Length', res.status === 200 && body.length === 1000 && res.headers.get('Content-Length') === '1000');
}
{
    const res = await media.handleMediaRequests(new Request('https://w.dev/media/nada.mp4'), { R2_BUCKET: r2 });
    check('inexistente → 404', res.status === 404, res.status);
}

// --- 4. Versión compuesta: cada edición cuesta UNA escritura ---------------------
{
    const store = new Map();
    let puts = 0, dbReads = 0;
    const apts = {
        'a-1': { zone_slug: 'costa', agency_id: 'ag1' },
        'a-2': { zone_slug: 'costa', agency_id: 'ag2' },
        'b-1': { zone_slug: 'norte', agency_id: 'ag1' },
    };
    const env = {
        GUIDE_CACHE: { get: async (k) => store.get(k) ?? null, put: async (k, v) => { puts++; store.set(k, v); } },
        DB: { prepare: (sql) => ({ bind: (...a) => ({
            first: async () => {
                dbReads++;
                if (sql.includes('FROM guide_apartments a JOIN guide_zones')) return apts[a[0]] ?? null;
                if (sql.includes('SELECT slug FROM guide_zones')) return { slug: a[0] === 'z-costa' ? 'costa' : 'norte' };
                return null;
            },
        }) }) },
    };
    const v = async (slug) => cache.getGuideVersion(env, slug);
    const before = { a1: await v('a-1'), a2: await v('a-2'), b1: await v('b-1') };
    check('versión inicial compuesta 0.0.0.0', before.a1 === '0.0.0.0', before.a1);

    await new Promise(r => setTimeout(r, 2)); // Date.now() distinto en cada bump
    puts = 0;
    await cache.touchZoneGuideVersions(env, 'z-costa');
    check('editar un POI de la zona = 1 escritura de KV', puts === 1, String(puts));
    check('  cambia la guía de TODOS los pisos de la zona', (await v('a-1')) !== before.a1 && (await v('a-2')) !== before.a2);
    check('  NO cambia la de otra zona', (await v('b-1')) === before.b1);

    await new Promise(r => setTimeout(r, 2));
    const mid = { a1: await v('a-1'), a2: await v('a-2'), b1: await v('b-1') };
    puts = 0;
    await cache.touchAgencyGuideVersions(env, 'ag1');
    check('editar la tienda de una agencia = 1 escritura', puts === 1, String(puts));
    check('  cambian sus pisos (a-1, b-1) y no los de otra agencia (a-2)',
        (await v('a-1')) !== mid.a1 && (await v('b-1')) !== mid.b1 && (await v('a-2')) === mid.a2);

    await new Promise(r => setTimeout(r, 2));
    const mid2 = { a1: await v('a-1'), a2: await v('a-2'), b1: await v('b-1') };
    puts = 0;
    await cache.touchAllGuideVersions(env);
    check('editar la tienda de plataforma = 1 escritura', puts === 1, String(puts));
    check('  cambian todas', (await v('a-1')) !== mid2.a1 && (await v('a-2')) !== mid2.a2 && (await v('b-1')) !== mid2.b1);

    await new Promise(r => setTimeout(r, 2));
    const mid3 = { a2: await v('a-2') };
    await cache.touchGuideVersion(env, 'a-1');
    check('editar un piso solo invalida ese piso', (await v('a-2')) === mid3.a2);

    dbReads = 0;
    await v('a-1'); await v('a-1'); await v('a-2');
    check('la zona/agencia de un piso se memoriza (sin D1 en la ruta caliente)', dbReads === 0, String(dbReads));
    check('piso inexistente → versión simple, sin romper', (await v('no-existe')) === '0');
}

// --- 5. Chat IA: apartamento + global en un solo documento diario -------------------
{
    let gets = 0, puts = 0;
    const store = new Map();
    const kv = { get: async (k) => { gets++; return store.has(k) ? JSON.parse(store.get(k)) : null; },
                 put: async (k, v) => { puts++; store.set(k, v); } };
    const env = { RATE_LIMIT_KV: kv };
    const r1 = await ai.hitDailyAiBudget(env, 'apt1');
    check('mensaje permitido = 1 lectura + 1 escritura (antes eran 2+2)', r1 === 'ok' && gets === 1 && puts === 1, `${r1} g${gets} p${puts}`);

    const key = [...store.keys()][0];
    store.set(key, JSON.stringify({ total: 10, apts: { apt1: 300 } }));
    check('apartamento en su tope → apartment', (await ai.hitDailyAiBudget(env, 'apt1')) === 'apartment');
    check('otro apartamento sigue pudiendo', (await ai.hitDailyAiBudget(env, 'apt2')) === 'ok');
    store.set(key, JSON.stringify({ total: 2000, apts: {} }));
    check('presupuesto global agotado → global', (await ai.hitDailyAiBudget(env, 'apt3')) === 'global');
    const broken = { RATE_LIMIT_KV: { get: async () => { throw new Error('boom'); }, put: async () => {} } };
    check('KV caído → se deja pasar (el techo de neuronas sigue)', (await ai.hitDailyAiBudget(broken, 'apt1')) === 'ok');
    check('sin binding → ok', (await ai.hitDailyAiBudget({}, 'apt1')) === 'ok');
}

// --- 6. Latido de la TV: no reescribe en cada evento -----------------------------------
{
    const calls = [];
    const env = { DB: { prepare: (sql) => ({ bind: (...a) => ({ run: async () => { calls.push({ sql, a }); return {}; } }) }) } };
    const now = '2026-09-29T12:00:00.000Z';
    await tv.touchDeviceSeen(env, 'dev1', now);
    const { sql, a } = calls[0];
    check('UPDATE condicionado a last_seen_at antiguo', /last_seen_at IS NULL OR last_seen_at < \?/.test(sql), sql);
    check('  umbral = hace 10 min (el admin da "en línea" hasta 15)', a[2] === '2026-09-29T11:50:00.000Z', a[2]);
}

// --- 7. section-view: un solo INSERT ... SELECT -----------------------------------------
{
    const stmts = [];
    const mk = (changes) => ({ DB: { prepare: (sql) => ({ bind: (...a) => ({
        run: async () => { stmts.push({ sql, a }); return { meta: { changes } }; },
        first: async () => { stmts.push({ sql, a }); return null; },
    }) }) } });
    const post = (body) => new Request('https://w.dev/guide/track/section-view', { method: 'POST', body: JSON.stringify(body) });
    const ok1 = await tracking.handleGuideTracking(post({ apartmentId: 'apt1', sessionId: 's1', section: 'info' }), mk(1), {});
    check('section-view válido → 200', ok1.status === 200, ok1.status);
    check('  una sola consulta a D1', stmts.length === 1 && /INSERT INTO guide_section_views[\s\S]*SELECT[\s\S]*FROM guide_apartments/.test(stmts[0].sql), String(stmts.length));
    const nf = await tracking.handleGuideTracking(post({ apartmentId: 'nope', section: 'info' }), mk(0), {});
    check('apartamento inexistente → 404', nf.status === 404, nf.status);
    const chat = await tracking.handleGuideTracking(post({ apartmentId: 'apt1', section: 'chat' }), mk(1), {});
    check('sección "chat" → 400 (el front ya no la manda)', chat.status === 400, chat.status);
}

c1(); c2(); c3(); c4(); c5(); c6();
if (failures) { console.error(`\n${failures} fallo(s)`); process.exit(1); }
console.log('\nOK');
