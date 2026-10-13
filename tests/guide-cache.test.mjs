// Test de la caché KV de las guías (workerGuideCache.js).
// Ejecutar:  node tests/guide-cache.test.mjs
//
// Dos cosas que no se pueden romper a la vez:
//   1. Editar algo que comparten muchas guías (un POI de la zona, el diseño de la agencia, un producto
//      de la plataforma) cuesta UNA escritura de KV, haya 3 pisos o 300. Antes costaba una por piso, y
//      el plan Free da 1.000 al día para toda la cuenta.
//   2. Aun así, ninguna guía afectada vuelve a servirse de caché, y ninguna de las demás deja de hacerlo.

import { loadWorkerModule } from './_load.mjs';

const { module: cache, cleanup } = await loadWorkerModule('workerGuideCache.js');
const {
    touchGuideVersion, touchZoneGuideVersions, touchAgencyGuideVersions, touchAllGuideVersions,
    getGuideVersion, getZoneExploreVersion, readGuideScope, readGuidePayload, writeGuidePayload,
} = cache;

/** KV de mentira con metadatos, y un D1 que delata cualquier consulta: los touch* ya no deben hacer ninguna. */
function makeEnv() {
    const store = new Map();
    const state = { writes: [], queries: [] };
    let tick = 1_700_000_000_000;
    const realNow = Date.now;
    // Dos touch en el mismo milisegundo escribirían la misma versión y el test no vería el cambio.
    Date.now = () => ++tick;
    return {
        state,
        restore() { Date.now = realNow; },
        env: {
            GUIDE_CACHE: {
                async get(key) { return store.get(key)?.value ?? null; },
                async getWithMetadata(key) {
                    const entry = store.get(key);
                    return { value: entry?.value ?? null, metadata: entry?.metadata ?? null };
                },
                async put(key, value, opts = {}) {
                    state.writes.push(key);
                    store.set(key, { value, metadata: opts.metadata ?? null });
                },
            },
            DB: {
                prepare(sql) {
                    state.queries.push(sql);
                    // 50 pisos: si alguien vuelve a recorrerlos para escribir una clave por cada uno, se ve.
                    const results = Array.from({ length: 50 }, (_, i) => ({ slug: `piso-${i}` }));
                    return { bind: () => ({ first: async () => ({ slug: 'zona' }), all: async () => ({ results }) }) };
                },
            },
        },
    };
}

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

/** Lo que hace handleGetGuidebook en un fallo de caché: marca compartida → contenido → guardar. */
async function cacheGuide(env, slug, zoneId, agencyId, body = `{"guia":"${slug}"}`) {
    const key = `guide:${slug}:es:v${await getGuideVersion(env, slug)}`;
    const scope = await readGuideScope(env, zoneId, agencyId);
    await writeGuidePayload(env, key, body, scope);
    return key;
}
const cached = async (env, slug) => readGuidePayload(env, `guide:${slug}:es:v${await getGuideVersion(env, slug)}`);

console.log('\n--- Una escritura por edición, haya los pisos que haya ---');
{
    const { env, state, restore } = makeEnv();
    await touchZoneGuideVersions(env, 'zone_1');
    assert('Editar un POI de la zona: 1 escritura', state.writes.length === 1 && state.writes[0] === 'ver:zone:zone_1', state.writes.join(','));
    state.writes.length = 0;
    await touchAgencyGuideVersions(env, 'agency_1');
    assert('Cambiar el diseño de la agencia: 1 escritura', state.writes.length === 1 && state.writes[0] === 'ver:agency:agency_1', state.writes.join(','));
    state.writes.length = 0;
    await touchAllGuideVersions(env);
    assert('Editar un producto de la plataforma: 1 escritura', state.writes.length === 1 && state.writes[0] === 'ver:all', state.writes.join(','));
    assert('Ninguna recorre los pisos en D1', state.queries.length === 0, `${state.queries.length} consultas`);
    await touchZoneGuideVersions(env, null);
    await touchAgencyGuideVersions(env, undefined);
    assert('Sin id no se escribe nada', state.writes.length === 1);
    restore();
}

console.log('\n--- La guía afectada deja de servirse de caché; las demás, no ---');
{
    const { env, restore } = makeEnv();
    // Dos pisos en la zona 1 (agencias distintas) y uno en la zona 2 con la agencia del primero.
    await cacheGuide(env, 'piso-a', 'zone_1', 'agency_1');
    await cacheGuide(env, 'piso-b', 'zone_1', 'agency_2');
    await cacheGuide(env, 'piso-c', 'zone_2', 'agency_1');
    const hits = async () => [await cached(env, 'piso-a'), await cached(env, 'piso-b'), await cached(env, 'piso-c')].map(Boolean).join(',');

    assert('Recién guardadas, las tres salen de caché', (await hits()) === 'true,true,true', await hits());

    await touchZoneGuideVersions(env, 'zone_1');
    assert('Tras editar la zona 1 caen sus dos pisos y el de la zona 2 sigue', (await hits()) === 'false,false,true', await hits());

    await cacheGuide(env, 'piso-a', 'zone_1', 'agency_1');
    await cacheGuide(env, 'piso-b', 'zone_1', 'agency_2');
    await touchAgencyGuideVersions(env, 'agency_1');
    assert('Tras cambiar la agencia 1 caen sus dos pisos y el de la otra agencia sigue', (await hits()) === 'false,true,false', await hits());

    await cacheGuide(env, 'piso-a', 'zone_1', 'agency_1');
    await cacheGuide(env, 'piso-c', 'zone_2', 'agency_1');
    await touchAllGuideVersions(env);
    assert('Tras un cambio de plataforma caen todas', (await hits()) === 'false,false,false', await hits());

    await cacheGuide(env, 'piso-a', 'zone_1', 'agency_1');
    await touchGuideVersion(env, 'piso-a');
    assert('Editar el propio piso sigue cambiando su clave', (await cached(env, 'piso-a')) === null);
    restore();
}

console.log('\n--- Lo que no debe darse por bueno ---');
{
    const { env, restore } = makeEnv();

    // Una entrada de antes de este esquema no lleva metadatos: no se sabe con qué versiones se generó.
    await env.GUIDE_CACHE.put('guide:viejo:es:v0', '{"guia":"vieja"}');
    assert('Una entrada sin metadatos no vale', (await readGuidePayload(env, 'guide:viejo:es:v0')) === null);
    assert('Una clave que no existe no vale', (await readGuidePayload(env, 'guide:nadie:es:v0')) === null);

    // La carrera que justifica leer la marca ANTES que el contenido: el admin guarda un POI mientras la
    // guía se está generando. La entrada se guarda con la marca anterior y la siguiente lectura la descarta.
    const key = 'guide:piso-d:es:v0';
    const scope = await readGuideScope(env, 'zone_3', 'agency_3');
    await touchZoneGuideVersions(env, 'zone_3');
    await writeGuidePayload(env, key, '{"guia":"a medias"}', scope);
    assert('Un cambio que entra a mitad de generar la guía no queda cacheado como fresco', (await readGuidePayload(env, key)) === null);

    const body = '{"guia":"entera"}';
    await writeGuidePayload(env, key, body, await readGuideScope(env, 'zone_3', 'agency_3'));
    assert('El JSON se devuelve tal cual se guardó', (await readGuidePayload(env, key)) === body);

    // Un piso sin zona o sin agencia sigue dependiendo de la versión de plataforma.
    await writeGuidePayload(env, 'guide:suelto:es:v0', body, await readGuideScope(env, null, null));
    assert('Un piso sin zona ni agencia se cachea', (await readGuidePayload(env, 'guide:suelto:es:v0')) === body);
    await touchAllGuideVersions(env);
    assert('...y cae con un cambio de plataforma', (await readGuidePayload(env, 'guide:suelto:es:v0')) === null);

    assert('Explorar lee la misma clave que escribe la zona', (await getZoneExploreVersion(env, 'zone_3')) !== '0'
        && (await getZoneExploreVersion(env, 'zone_sin_tocar')) === '0');
    restore();
}

cleanup();
console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
