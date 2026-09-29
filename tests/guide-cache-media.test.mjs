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

c1(); c2(); c3();
if (failures) { console.error(`\n${failures} fallo(s)`); process.exit(1); }
console.log('\nOK');
