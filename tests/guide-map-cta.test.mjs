// Test del botón de reserva en el mapa de la guía (workerGuide.js: ctaFields, fillApartmentTokens).
// Ejecutar:  node tests/guide-map-cta.test.mjs
//
// Lo que no se puede romper:
//   - una experiencia reservable con coordenadas lleva en `pois` (el mapa) EXACTAMENTE el mismo botón que en
//     `experiences` (la Tienda), con el partner y la campaña del piso ya resueltos; un lugar normal, ninguno;
//   - «Explorar» otra ciudad se cachea por zona, no por piso: la misma entrada de KV sirve a dos pisos y a
//     cada uno le sale su sub_id, sin que en KV quede el slug de ninguno.
// Usa un D1 de verdad (tests/_d1.mjs).

import { loadWorkerModule } from './_load.mjs';
import { openD1, loadSchema, seed } from './_d1.mjs';

const ORIGIN = 'https://visualtasteworker.example.workers.dev';

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

const LINK = 'https://www.getyourguide.com/x-l1/ticket-t1/?partner_id={{affiliate_code}}&utm_medium=online_publisher&cmp={{sub_id}}&mkt_cmp=true';

console.log('\n--- fillApartmentTokens ---');
{
    const { module: guide, cleanup } = await loadWorkerModule('workerGuide.js');
    const json = JSON.stringify({
        url: 'https://ej.com/?cmp=%7B%7Bsub_id%7D%7D&a=%7B%7Bapartment_id%7D%7D&n=%7B%7Bapartment_name%7D%7D',
        msg: 'Hola, estoy en {{apartment_name}}',
    });
    const out = JSON.parse(guide.fillApartmentTokens(json, { id: 'apt 1', slug: 'piso-uno', name: 'Casa "Sol" & Mar' }));
    assert('El sub_id de una URL es el del piso, de la guía', out.url.includes('cmp=piso-uno-guide'), out.url);
    assert('El id y el nombre van codificados dentro de la URL',
        out.url.includes('a=apt%201') && out.url.includes(`n=${encodeURIComponent('Casa "Sol" & Mar')}`), out.url);
    assert('En el mensaje el nombre va tal cual, y el JSON sigue siendo válido', out.msg === 'Hola, estoy en Casa "Sol" & Mar', out.msg);
    cleanup();
}

console.log('\n--- La guía y «explorar», contra un D1 de verdad ---');
const d1 = await openD1();
if (!d1) {
    console.log('  --   saltado: no hay Miniflare (ni en el repo ni en el wrangler global). SIN PROBAR, no «bien».');
} else {
    const { db, dispose } = d1;
    await loadSchema(db);

    const store = new Map();
    const kv = {
        async get(key) { return store.get(key)?.value ?? null; },
        async getWithMetadata(key) { const e = store.get(key); return { value: e?.value ?? null, metadata: e?.metadata ?? null }; },
        async put(key, value, opts = {}) { store.set(key, { value, metadata: opts.metadata ?? null }); },
    };
    const env = { DB: db, GUIDE_CACHE: kv };

    await seed(db, 'languages', { code: 'es', name: 'Español', native_name: 'Español', is_active: 1 });
    await seed(db, 'guide_agencies', { id: 'ag1', name: 'Agencia', slug: 'ag1', is_active: 1 });
    await seed(db, 'guide_zones', { id: 'z1', name: 'Zona Uno', slug: 'zona-uno', region: 'Costa', is_active: 1 });
    await seed(db, 'guide_zones', { id: 'z2', name: 'Zona Dos', slug: 'zona-dos', region: 'Costa', is_active: 1 });
    await seed(db, 'guide_apartments', { id: 'apt1', name: 'Piso "Uno"', slug: 'piso-uno', zone_id: 'z1', agency_id: 'ag1', is_active: 1 });
    await seed(db, 'guide_apartments', { id: 'apt2', name: 'Piso Dos', slug: 'piso-dos', zone_id: 'z1', agency_id: 'ag1', is_active: 1 });

    const poi = (row) => seed(db, 'guide_pois', { is_active: 1, latitude: 36.6, longitude: -4.5, ...row });
    // En la zona del piso: una experiencia de afiliado con coordenadas y un lugar normal.
    await poi({ id: 'p_tel', zone_id: 'z1', category: 'Actividades', is_bookable: 1, action_type: 'URL', action_data: LINK,
        action_is_affiliate: 1, affiliate_network: 'getyourguide', affiliate_code: 'PARTNER1' });
    await poi({ id: 'p_playa', zone_id: 'z1', category: 'Playas', is_bookable: 0 });
    // En otra ciudad: una de afiliado y otra con el contacto directo (el secundario manda).
    await poi({ id: 'p_bio', zone_id: 'z2', category: 'Naturaleza', is_bookable: 1, action_type: 'URL', action_data: LINK,
        action_is_affiliate: 1, affiliate_network: 'getyourguide', affiliate_code: 'PARTNER1' });
    await poi({ id: 'p_kayak', zone_id: 'z2', category: 'Actividades', is_bookable: 1, action_type: 'URL', action_data: LINK,
        action_is_affiliate: 1, affiliate_code: 'PARTNER1',
        secondary_action_type: 'WHATSAPP', secondary_action_data: '+34600000000', secondary_action_prefilled_message: 'Hola, estoy en {{apartment_name}}' });
    await seed(db, 'translations', { entity_id: 'p_tel', entity_type: 'poi', language_code: 'es', field: 'cta_label', value: 'Comprar entradas' });
    await seed(db, 'translations', { entity_id: 'p_bio', entity_type: 'poi', language_code: 'es', field: 'cta_label', value: 'Comprar entradas' });

    const { module: guide, cleanup } = await loadWorkerModule('workerGuide.js');

    // 1. La guía del piso.
    const res = await guide.handleGetGuidebook(env, 'piso-uno', 'es', ORIGIN);
    const data = await res.json();
    const exp = data.experiences?.find(e => e.id === 'p_tel');
    const mapTel = data.pois?.find(p => p.id === 'p_tel');
    const mapPlaya = data.pois?.find(p => p.id === 'p_playa');
    const expected = 'https://www.getyourguide.com/x-l1/ticket-t1/?partner_id=PARTNER1&utm_medium=online_publisher&cmp=piso-uno-guide&mkt_cmp=true';
    assert('La experiencia lleva el enlace resuelto con el sub_id del piso', exp?.action_data === expected, exp?.action_data);
    assert('En el mapa, la misma reservable lleva el MISMO botón',
        mapTel && ['action_type', 'action_data', 'prefilled_message', 'cta_label', 'cta_source'].every(k => mapTel[k] === exp[k]),
        JSON.stringify(mapTel && { action_data: mapTel.action_data, cta_label: mapTel.cta_label, cta_source: mapTel.cta_source }));
    assert('...marcado como de afiliado y con su etiqueta', mapTel?.cta_source === 'affiliate' && mapTel?.cta_label === 'Comprar entradas');
    assert('Un lugar que no es reservable no lleva botón', mapPlaya && !('action_type' in mapPlaya) && !('action_data' in mapPlaya));

    const tvRes = await guide.handleGetGuidebook(env, 'piso-uno', 'es', ORIGIN, 'tv');
    const tvTel = (await tvRes.json()).pois?.find(p => p.id === 'p_tel');
    assert('En la tele la campaña es la de la tele', tvTel?.action_data?.includes('cmp=piso-uno-tv'), tvTel?.action_data);

    // 2. «Explorar» otra ciudad: una entrada de caché para todos los pisos.
    const explore = async (slug) => {
        const r = await guide.handleGetExplore(env, slug, 'zona-dos', 'es', ORIGIN);
        return { hit: r.headers.get('X-Cache') === 'HIT', data: await r.json() };
    };
    const one = await explore('piso-uno');
    const bio = one.data.pois?.find(p => p.id === 'p_bio');
    assert('Explorar (MISS): la reservable de otra ciudad lleva su botón con el sub_id del piso',
        !one.hit && bio?.action_data === expected && bio?.cta_source === 'affiliate' && bio?.cta_label === 'Comprar entradas', bio?.action_data);
    const kayak = one.data.pois?.find(p => p.id === 'p_kayak');
    assert('...y la que tiene contacto directo, el WhatsApp con el nombre del piso',
        kayak?.action_type === 'WHATSAPP' && kayak?.prefilled_message === 'Hola, estoy en Piso "Uno"' && kayak?.cta_source === 'direct',
        JSON.stringify(kayak && { t: kayak.action_type, m: kayak.prefilled_message }));

    const two = await explore('piso-dos');
    const bio2 = two.data.pois?.find(p => p.id === 'p_bio');
    assert('Otro piso sale de la MISMA caché con su propio sub_id', two.hit && bio2?.action_data?.includes('cmp=piso-dos-guide'), bio2?.action_data);
    const cached = [...store.entries()].find(([k]) => k.startsWith('explore:zona-dos:'))?.[1].value || '';
    assert('En KV no queda el slug de ningún piso, solo el marcador',
        cached.includes('%7B%7Bsub_id%7D%7D') && !cached.includes('piso-uno') && !cached.includes('piso-dos'));
    const again = await explore('piso-uno');
    assert('Y el primero, ya desde caché, sigue con el suyo',
        again.hit && again.data.pois?.find(p => p.id === 'p_bio')?.action_data === expected);

    cleanup();
    await dispose();
}

console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
