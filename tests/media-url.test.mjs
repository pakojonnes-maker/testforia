// Test del dominio propio de media (workerMediaUrl.js) y de dónde se aplica.
// Ejecutar:  node tests/media-url.test.mjs
//
// Lo que no se puede romper: con MEDIA_BASE_URL vacío (como está en wrangler.toml hasta que el dominio
// exista) las respuestas son BYTE A BYTE las de siempre; con él puesto, las fotos y vídeos de la guía,
// la tele y «explorar» salen del dominio nuevo, tanto recién generadas como de caché, y lo que hay en KV
// no lo lleva dentro (vaciar la variable lo deshace sin invalidar nada).
//
// La segunda mitad usa un D1 de verdad (tests/_d1.mjs): es el único test que ejecuta handleGetGuidebook
// entero, así que también vigila que la guía siga saliendo MISS → HIT con la caché por zona y agencia.

import { loadWorkerModule } from './_load.mjs';
import { openD1, loadSchema, seed } from './_d1.mjs';

const ORIGIN = 'https://visualtasteworker.example.workers.dev';
const MEDIA = 'https://media.example.com';

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

console.log('\n--- publicMediaUrls ---');
{
    const { module: media, cleanup } = await loadWorkerModule('workerMediaUrl.js');
    const { publicMediaUrls } = media;
    const json = JSON.stringify({
        foto: `${ORIGIN}/media/guide/pois/p1/a b.jpg`,
        video: `${ORIGIN}/media/restaurants/r1/dishes/d1/clip.mp4`,
        icono: `${ORIGIN}/media/System/allergens/allergen_celery.svg`,
        ajena: 'https://otro.example.com/media/x.jpg',
        api: `${ORIGIN}/guide/piso`,
        texto: `mira ${ORIGIN}/media/guide/a.jpg y ${ORIGIN}/media/guide/b.jpg`,
    });

    assert('Sin la variable: el texto no cambia', publicMediaUrls({}, ORIGIN, json) === json);
    assert('Con la variable vacía: tampoco', publicMediaUrls({ MEDIA_BASE_URL: '  ' }, ORIGIN, json) === json);

    const out = JSON.parse(publicMediaUrls({ MEDIA_BASE_URL: MEDIA }, ORIGIN, json));
    assert('Una foto pasa al dominio de media, sin el /media/ delante', out.foto === `${MEDIA}/guide/pois/p1/a b.jpg`, out.foto);
    assert('Un vídeo también', out.video === `${MEDIA}/restaurants/r1/dishes/d1/clip.mp4`, out.video);
    assert('Lo de System/ se queda en el worker', out.icono === `${ORIGIN}/media/System/allergens/allergen_celery.svg`, out.icono);
    assert('Una URL de otro servidor no se toca', out.ajena === 'https://otro.example.com/media/x.jpg');
    assert('Las rutas de la API no se tocan', out.api === `${ORIGIN}/guide/piso`);
    assert('Se cambian todas las apariciones, no la primera', out.texto === `mira ${MEDIA}/guide/a.jpg y ${MEDIA}/guide/b.jpg`, out.texto);

    const twice = publicMediaUrls({ MEDIA_BASE_URL: MEDIA }, ORIGIN, publicMediaUrls({ MEDIA_BASE_URL: MEDIA }, ORIGIN, json));
    assert('Pasarlo dos veces da lo mismo', twice === publicMediaUrls({ MEDIA_BASE_URL: MEDIA }, ORIGIN, json));
    assert('Una barra final en la variable no duplica barras',
        JSON.parse(publicMediaUrls({ MEDIA_BASE_URL: `${MEDIA}/` }, ORIGIN, json)).foto === `${MEDIA}/guide/pois/p1/a b.jpg`);

    const warn = console.warn;
    console.warn = () => {};
    for (const bad of ['media.example.com', 'http://media.example.com', `${MEDIA}/carpeta`, 'https://media.example.com?x=1', 'javascript:alert(1)']) {
        assert(`Un valor que no es un origen https se ignora: ${bad}`, publicMediaUrls({ MEDIA_BASE_URL: bad }, ORIGIN, json) === json);
    }
    console.warn = warn;
    assert('Sin origen o sin texto devuelve lo que recibió',
        publicMediaUrls({ MEDIA_BASE_URL: MEDIA }, '', json) === json && publicMediaUrls({ MEDIA_BASE_URL: MEDIA }, ORIGIN, null) === null);
    cleanup();
}

console.log('\n--- La guía, la tele y «explorar», contra un D1 de verdad ---');
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

    await seed(db, 'guide_agencies', { id: 'ag1', name: 'Agencia', slug: 'ag1', is_active: 1, logo_url: `${ORIGIN}/media/guide/agencies/ag1/logo.png` });
    await seed(db, 'guide_zones', { id: 'z1', name: 'Zona Uno', slug: 'zona-uno', region: 'Costa', is_active: 1, cover_image_url: `${ORIGIN}/media/guide/zones/z1/portada.jpg` });
    await seed(db, 'guide_zones', { id: 'z2', name: 'Zona Dos', slug: 'zona-dos', region: 'Costa', is_active: 1, cover_image_url: `${ORIGIN}/media/guide/zones/z2/portada.jpg` });
    await seed(db, 'guide_apartments', {
        id: 'apt1', name: 'Piso Uno', slug: 'piso-uno', zone_id: 'z1', agency_id: 'ag1', is_active: 1,
        cover_image_url: `${ORIGIN}/media/guide/apartments/apt1/portada.jpg`,
    });
    await seed(db, 'guide_tv_devices', { id: 'tv1', apartment_id: 'apt1', pairing_code: 'ABC234', is_active: 1 });
    await seed(db, 'guide_tv_tile_images', { apartment_id: 'apt1', slot: 'store', image_url: `${ORIGIN}/media/guide/apartments/apt1/tv/tienda.jpg` });

    const { module: guide, cleanup: c1 } = await loadWorkerModule('workerGuide.js');
    const { module: tv, cleanup: c2 } = await loadWorkerModule('workerTvScreen.js');

    const getGuide = async () => {
        const res = await guide.handleGetGuidebook(env, 'piso-uno', 'es', ORIGIN);
        return { status: res.status, hit: res.headers.get('X-Cache') === 'HIT', cache: res.headers.get('X-Cache'), text: await res.text() };
    };
    const count = (text, needle) => text.split(needle).length - 1;

    // 1. Sin la variable: nada cambia.
    const before = await getGuide();
    assert('Sin la variable la guía sale con sus URLs de siempre',
        before.status === 200 && !before.hit && count(before.text, `${ORIGIN}/media/guide/`) >= 2 && !before.text.includes(MEDIA),
        `${before.status}, ${count(before.text, `${ORIGIN}/media/guide/`)} URLs`);
    const beforeHit = await getGuide();
    assert('...y de caché sale idéntica', beforeHit.hit && beforeHit.text === before.text);
    // scripts/smoke.mjs exige la cabecera en las dos: sin MISS, el humo fallaba tras cada invalidación.
    assert('La cabecera X-Cache dice MISS y luego HIT', before.cache === 'MISS' && beforeHit.cache === 'HIT', `${before.cache} → ${beforeHit.cache}`);

    // 2. Con la variable: mismas claves, otro dominio; en HIT y en MISS.
    env.MEDIA_BASE_URL = MEDIA;
    const onHit = await getGuide();
    assert('Con la variable, la guía YA cacheada sale con el dominio de media',
        onHit.hit && count(onHit.text, `${ORIGIN}/media/`) === 0 && count(onHit.text, `${MEDIA}/guide/`) === count(before.text, `${ORIGIN}/media/guide/`),
        `${count(onHit.text, `${MEDIA}/guide/`)} URLs`);
    assert('...y es la misma guía, con solo eso cambiado', onHit.text === before.text.split(`${ORIGIN}/media/`).join(`${MEDIA}/`));
    assert('La portada del piso es una de ellas', JSON.parse(onHit.text).apartment?.cover_image_url === `${MEDIA}/guide/apartments/apt1/portada.jpg`,
        String(JSON.parse(onHit.text).apartment?.cover_image_url));

    store.clear();
    const onMiss = await getGuide();
    assert('Recién generada sale igual', !onMiss.hit && onMiss.text === onHit.text);
    const cachedRaw = [...store.entries()].find(([k]) => k.startsWith('guide:piso-uno:'))?.[1].value || '';
    assert('Lo guardado en KV no lleva el dominio de media', cachedRaw.length > 0 && !cachedRaw.includes(MEDIA) && cachedRaw.includes(`${ORIGIN}/media/guide/`));

    // 3. Quitar la variable lo deshace sin tocar la caché.
    env.MEDIA_BASE_URL = '';
    const back = await getGuide();
    assert('Vaciar la variable devuelve las URLs del worker, desde la misma caché', back.hit && back.text === before.text);

    // 4. La tele: la guía con superficie propia + las teselas, que se añaden fuera de la caché.
    env.MEDIA_BASE_URL = MEDIA;
    const tvRes = await tv.handleTvScreenRequests(new Request(`${ORIGIN}/guide/tv/config/ABC234?lang=es`), env);
    const tvText = tvRes ? await tvRes.text() : '';
    assert('La tele recibe su configuración', tvRes?.status === 200, `status ${tvRes?.status}`);
    assert('...con la tesela reescrita', (() => { try { return JSON.parse(tvText).tv?.tiles?.store === `${MEDIA}/guide/apartments/apt1/tv/tienda.jpg`; } catch { return false; } })(),
        tvText.slice(tvText.indexOf('"tv"'), tvText.indexOf('"tv"') + 120));
    assert('...y sin ninguna URL de media del worker', count(tvText, `${ORIGIN}/media/`) === 0);

    // 5. Explorar otra ciudad.
    const explore = async () => {
        const res = await guide.handleGetExplore(env, 'piso-uno', 'zona-dos', 'es', ORIGIN);
        return { status: res.status, hit: res.headers.get('X-Cache') === 'HIT', text: await res.text() };
    };
    const ex1 = await explore(), ex2 = await explore();
    assert('Explorar: MISS y luego HIT, las dos con el mismo texto', ex1.status === 200 && !ex1.hit && ex2.hit && ex1.text === ex2.text, `${ex1.status} ${ex1.hit} → ${ex2.hit}`);
    assert('...y sin ninguna URL de media del worker', count(ex1.text, `${ORIGIN}/media/`) === 0);

    // 6. La carta: el vídeo de un plato se construye con el origen; el logo viene guardado con él.
    await seed(db, 'restaurants', { id: 'r1', name: 'Casa Ana', slug: 'casa-ana', is_active: 1, logo_url: `${ORIGIN}/media/restaurants/r1/logo.png` });
    await seed(db, 'menus', { id: 'm1', restaurant_id: 'r1', name: 'Carta', is_active: 1, is_default: 1 });
    await seed(db, 'sections', { id: 's1', restaurant_id: 'r1', menu_id: 'm1', order_index: 0, is_visible: 1 });
    await seed(db, 'dishes', { id: 'd1', restaurant_id: 'r1', status: 'active' });
    await seed(db, 'section_dishes', { section_id: 's1', dish_id: 'd1', order_index: 0 });
    await seed(db, 'dish_media', { id: 'media_1', dish_id: 'd1', media_type: 'video', r2_key: 'restaurants/r1/dishes/d1/clip.mp4', role: 'PRIMARY_VIDEO' });

    const { module: reels, cleanup: c3 } = await loadWorkerModule('workerReels.js');
    const log = console.log;
    const carta = async () => {
        console.log = () => {}; // el handler narra cada paso
        try {
            const res = await reels.handleReelsRequests(new Request(`${ORIGIN}/restaurants/casa-ana/reels?lang=es`), env);
            return { status: res.status, headers: res.headers, body: await res.json() };
        } finally { console.log = log; }
    };
    const video = (r) => r.body.sections?.[0]?.dishes?.[0]?.media?.[0]?.url;

    env.MEDIA_BASE_URL = '';
    const cartaOff = await carta();
    assert('La carta, sin la variable: vídeo y logo por el worker',
        cartaOff.status === 200 && video(cartaOff) === `${ORIGIN}/media/restaurants/r1/dishes/d1/clip.mp4` && cartaOff.body.restaurant.logo_url === `${ORIGIN}/media/restaurants/r1/logo.png`,
        `${cartaOff.status} ${video(cartaOff)}`);
    env.MEDIA_BASE_URL = MEDIA;
    const cartaOn = await carta();
    assert('Con la variable (y la carta ya en caché): los dos por el dominio de media',
        video(cartaOn) === `${MEDIA}/restaurants/r1/dishes/d1/clip.mp4` && cartaOn.body.restaurant.logo_url === `${MEDIA}/restaurants/r1/logo.png`,
        `${video(cartaOn)} · ${cartaOn.body.restaurant.logo_url}`);
    assert('...con las cabeceras de siempre',
        cartaOn.headers.get('Cache-Control') === cartaOff.headers.get('Cache-Control') && cartaOn.headers.get('Access-Control-Allow-Origin') === '*'
        && cartaOn.headers.get('Content-Type') === 'application/json');

    c1(); c2(); c3();
    await dispose();
}

console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
