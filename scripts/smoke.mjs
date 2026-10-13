#!/usr/bin/env node
// Humo tras un despliegue: pide a PRODUCCIÓN un puñado de URLs reales y comprueba el CONTENIDO.
//
//   node scripts/smoke.mjs                  todo
//   node scripts/smoke.mjs worker guide     solo lo que acabas de desplegar (worker, guide, client, admin, tv)
//
// Los tests (npm test) usan un D1 de mentira y no ven producción. Esto es lo contrario: no sabe nada del
// código, solo mira lo que recibe un huésped. Caza lo que un 200 OK no dice: que la guía sale sin
// apartamento, que la portada pide un .js que no existe, que la mitad de tv.visualtastes.com ha
// desaparecido, que una guía con el WiFi ha quedado indexable, que el admin ya no puede hablar con la API.
//
// SOLO LEE. Todo son GET a rutas públicas, sin sesión. A propósito NO se pide:
//   - /guide/tv/config/<código real>: apunta la tele como «vista ahora» en el panel de flota;
//   - ningún POST (login, tracking, pedidos): gastan del cupo de KV o ensucian la analítica.
//
// Los slugs de las guías llevan un sufijo aleatorio porque la guía enseña el WiFi, y el repo es público:
// no se escriben aquí. Van en scripts/smoke.targets.json (ignorado por git; copia el .example). Sin ese
// fichero se salta lo que necesita un slug y lo dice: «saltado» no es «bien».

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://visualtasteworker.franciscotortosaestudios.workers.dev';
const SITES = {
    guide: 'https://guide.visualtastes.com',
    admin: 'https://admin.visualtastes.com',
    menu: 'https://menu.visualtastes.com',
    central: 'https://visualtastes.com',
    www: 'https://www.visualtastes.com',
    tv: 'https://tv.visualtastes.com',
};
// Los orígenes desde los que un navegador llama a la API: si falta uno en workerCors.js, esa app deja de
// cargar datos aunque curl siga funcionando.
const ORIGINS = [SITES.guide, SITES.admin, SITES.menu, SITES.central, SITES.tv];

const TARGETS_FILE = join(dirname(fileURLToPath(import.meta.url)), 'smoke.targets.json');
const targets = existsSync(TARGETS_FILE) ? JSON.parse(readFileSync(TARGETS_FILE, 'utf8')) : {};

const GROUPS = ['worker', 'guide', 'client', 'admin', 'tv'];
const asked = process.argv.slice(2);
const unknown = asked.filter((g) => !GROUPS.includes(g));
if (unknown.length) {
    console.error(`No conozco «${unknown.join(', ')}». Vale: ${GROUPS.join(', ')}.`);
    process.exit(2);
}
const wanted = asked.length ? asked : GROUPS;

let pass = 0, fail = 0, skipped = 0;
function check(label, ok, detail = '') {
    ok ? pass++ : fail++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${!ok && detail ? `  → ${detail}` : ''}`);
    return ok;
}
function skip(label) {
    skipped++;
    console.log(`  --   saltado: ${label}`);
}

/** GET que nunca lanza: un fallo de red es un resultado más (status 0). */
async function get(url, headers = {}) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'VisualTaste-smoke/1', ...headers }, redirect: 'manual', signal: AbortSignal.timeout(25000) });
        const body = await res.text();
        let json = null;
        try { json = JSON.parse(body); } catch { /* no es JSON */ }
        return { status: res.status, headers: res.headers, body, json };
    } catch (error) {
        return { status: 0, headers: new Headers(), body: '', json: null, error: error.message };
    }
}

const title = (html) => (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
const noindex = (res) => (res.headers.get('x-robots-tag') || '').toLowerCase().includes('noindex');

/**
 * Una página de Pages: contesta HTML, es la que tiene que ser (por su <title>), se indexa o no según toque,
 * y el JavaScript que pide existe de verdad.
 *
 * El .js se pide con una query: sin 404.html, Pages contesta index.html a lo que no existe y `_headers` lo
 * marca `immutable`, así que pedir la URL real de un fichero que falta dejaría ese HTML cacheado un año en
 * el borde bajo el nombre del .js (pasó con la TV, oct-2026). Con la query es otra clave de caché.
 */
async function page(name, url, { titleHas, indexable, script }) {
    const res = await get(url);
    const html = (res.headers.get('content-type') || '').includes('text/html');
    if (!check(`${name}: responde con HTML`, res.status === 200 && html, res.error || `status ${res.status}, ${res.headers.get('content-type')}`)) return null;
    check(`${name}: es la página que toca («${titleHas}»)`, title(res.body).includes(titleHas), `título: «${title(res.body)}»`);
    check(`${name}: ${indexable ? 'se puede indexar' : 'lleva noindex'}`, noindex(res) !== indexable, `X-Robots-Tag: ${res.headers.get('x-robots-tag') || '(ninguno)'}`);
    if (script) {
        const src = [...res.body.matchAll(/<script[^>]+src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]).find((s) => script.test(s));
        if (check(`${name}: el HTML pide su script (${script.source})`, Boolean(src), 'no hay ningún <script> con ese nombre')) {
            const js = await get(`${new URL(url).origin}${src}?smoke=${Date.now()}`);
            const isJs = (js.headers.get('content-type') || '').includes('javascript') && js.body.length > 1000 && !js.body.trimStart().startsWith('<');
            check(`${name}: ${src} existe y es JavaScript`, js.status === 200 && isJs, `status ${js.status}, ${js.headers.get('content-type')}, ${js.body.length} bytes`);
        }
    }
    return res;
}

// =============================================================================
const RUN = {
    async worker() {
        console.log('\n--- Worker (API) ---');
        const allergens = await get(`${API}/allergens`);
        check('GET /allergens: D1 contesta con los alérgenos', allergens.status === 200 && allergens.json?.success === true && allergens.json.allergens?.length >= 10,
            allergens.error || `status ${allergens.status}, ${allergens.json?.allergens?.length ?? 'sin'} alérgenos`);
        check('La API no se indexa', noindex(allergens), `X-Robots-Tag: ${allergens.headers.get('x-robots-tag')}`);

        const admin = await get(`${API}/guide/admin/apartments`);
        check('GET /guide/admin/apartments sin sesión: 401', admin.status === 401 && admin.json?.success === false, `status ${admin.status}`);

        // Un código que no existe: prueba que la ruta de la tele sigue cableada (antes del admin de la guía)
        // y que consulta D1, sin tocar el «visto por última vez» de ninguna tele real.
        const tv = await get(`${API}/guide/tv/config/SMOKE0`);
        check('GET /guide/tv/config/<código que no existe>: 404 con JSON, no un 500', tv.status === 404 && tv.json?.success === false, `status ${tv.status} ${tv.body.slice(0, 80)}`);

        for (const origin of ORIGINS) {
            const res = await get(`${API}/allergens`, { Origin: origin });
            check(`CORS: ${origin} puede llamar a la API`, res.headers.get('access-control-allow-origin') === origin, `Access-Control-Allow-Origin: ${res.headers.get('access-control-allow-origin')}`);
        }

        if (targets.guide) {
            const res = await get(`${API}/guide/${targets.guide}`);
            const g = res.json || {};
            if (check('GET /guide/<slug>: devuelve la guía', res.status === 200 && g.success === true, res.error || `status ${res.status}`)) {
                check('  con su apartamento y su agencia', Boolean(g.apartment?.name && g.agency?.name), `apartment: ${g.apartment?.name}, agency: ${g.agency?.name}`);
                check('  con contenido de la zona (sitios o restaurantes)', (g.pois?.length || 0) + (g.restaurants?.length || 0) > 0, `${g.pois?.length} sitios, ${g.restaurants?.length} restaurantes`);
                check('  en español por defecto, con más idiomas disponibles', g.meta?.lang === 'es' && g.meta?.available_langs?.length > 1, JSON.stringify(g.meta));
                check('  y dice si salió de caché (X-Cache)', /^(HIT|MISS)$/.test(res.headers.get('x-cache') || ''), `X-Cache: ${res.headers.get('x-cache')}`);
                const en = await get(`${API}/guide/${targets.guide}?lang=en`);
                check('GET /guide/<slug>?lang=en: sirve el inglés', en.json?.meta?.lang === 'en', `meta.lang: ${en.json?.meta?.lang}`);
                // Una imagen cualquiera de la guía, por donde la guía la entrega: el dominio propio del bucket
                // (MEDIA_BASE_URL, workerMediaUrl.js) o, con la variable vacía, /media/ del worker.
                const isImage = (r) => r?.status === 200 && (r.headers.get('content-type') || '').startsWith('image/');
                const photo = async (url) => {
                    const img = await fetch(url, { signal: AbortSignal.timeout(25000) }).catch(() => null);
                    await img?.body?.cancel();
                    return img;
                };
                const viaDomain = (res.body.match(/https:\/\/media\.visualtastes\.com\/[^"\\]+\.(?:webp|jpe?g|png)/i) || [])[0];
                const viaWorker = (res.body.match(/https?:[^"\\]+\/media\/(?!System\/)[^"\\]+\.(?:webp|jpe?g|png)/i) || [])[0];
                if (viaDomain || viaWorker) {
                    const img = await photo(viaDomain || viaWorker);
                    check(`  y una de sus fotos se descarga de R2 (${viaDomain ? 'media.visualtastes.com' : '/media/ del worker'})`, isImage(img), `status ${img?.status}, ${img?.headers.get('content-type')}`);
                    if (viaDomain) {
                        // La ruta del worker no puede morir aunque la guía ya no la use: el panel y los APK instalados tiran de ella.
                        const old = await photo(`${API}/media/${viaDomain.slice('https://media.visualtastes.com/'.length)}`);
                        check('  y /media/ del worker sigue sirviendo esa misma foto', isImage(old), `status ${old?.status}, ${old?.headers.get('content-type')}`);
                    }
                } else skip('la guía no trae ninguna foto que probar');
            }
        } else skip('GET /guide/<slug> (falta "guide" en scripts/smoke.targets.json)');

        if (targets.restaurant) {
            const res = await get(`${API}/restaurants/${targets.restaurant}/reels`);
            const c = res.json || {};
            if (check('GET /restaurants/<slug>/reels: devuelve la carta', res.status === 200 && c.success === true, res.error || `status ${res.status}`)) {
                check('  con su restaurante y sus secciones', Boolean(c.restaurant?.name) && c.sections?.length > 0, `${c.restaurant?.name}, ${c.sections?.length} secciones`);
                check('  con los textos de la interfaz', Object.keys(c.translations || {}).length > 10, `${Object.keys(c.translations || {}).length} cadenas`);
            }
        } else skip('GET /restaurants/<slug>/reels (falta "restaurant" en scripts/smoke.targets.json)');
    },

    async guide() {
        console.log('\n--- guide.visualtastes.com ---');
        const home = await page('Portada', `${SITES.guide}/`, { titleHas: 'VisualTaste Guía', indexable: true, script: /index-/ });
        if (home) check('Portada: lleva el contenido escrito en el HTML (para los bots de IA)', home.body.includes('application/ld+json') && home.body.length > 15000, `${home.body.length} bytes`);
        // Una página de venta de dos tramos: si su .html no se generó, Pages devuelve la portada.
        const para = await get(`${SITES.guide}/para/gestoras-de-apartamentos`);
        check('Página de venta /para/…: tiene su propio HTML, no el de la portada', para.status === 200 && home && title(para.body) !== title(home.body) && !noindex(para), `título: «${title(para.body)}», noindex: ${noindex(para)}`);
        const sitemap = await get(`${SITES.guide}/sitemap.xml`);
        check('sitemap.xml: lista las páginas de venta', sitemap.status === 200 && (sitemap.body.match(/<loc>/g) || []).length >= 5, `status ${sitemap.status}`);
        if (targets.guide) {
            const res = await get(`${SITES.guide}/${targets.guide}`);
            check('La guía de un piso (lleva el WiFi) sale con noindex', res.status === 200 && noindex(res), `status ${res.status}, X-Robots-Tag: ${res.headers.get('x-robots-tag') || '(ninguno)'}`);
        } else skip('noindex de la guía de un piso (falta "guide" en scripts/smoke.targets.json)');
    },

    async client() {
        console.log('\n--- visualtastes.com y menu.visualtastes.com ---');
        await page('Central (visualtastes.com)', `${SITES.central}/`, { titleHas: 'alquiler vacacional', indexable: true, script: /central-/ });
        await page('www.', `${SITES.www}/`, { titleHas: 'alquiler vacacional', indexable: false, script: /central-/ });
        await page('Landing de la carta (menu.)', `${SITES.menu}/`, { titleHas: 'Carta digital', indexable: true, script: /main-/ });
        const robots = await get(`${SITES.menu}/robots.txt`);
        check('menu./robots.txt: es un robots, no la SPA', robots.status === 200 && /user-agent/i.test(robots.body) && !robots.body.includes('<html'), robots.body.slice(0, 60));
        if (targets.restaurant) {
            const res = await get(`${SITES.menu}/${targets.restaurant}`);
            check('La carta de un restaurante abre y lleva noindex', res.status === 200 && res.body.includes('id="root"') && noindex(res), `status ${res.status}, X-Robots-Tag: ${res.headers.get('x-robots-tag') || '(ninguno)'}`);
        } else skip('la carta de un restaurante (falta "restaurant" en scripts/smoke.targets.json)');
    },

    async admin() {
        console.log('\n--- admin.visualtastes.com ---');
        await page('Panel', `${SITES.admin}/`, { titleHas: 'VisualTaste Admin', indexable: false, script: /index-/ });
    },

    async tv() {
        console.log('\n--- tv.visualtastes.com (landing + app de la tele en un solo despliegue) ---');
        await page('Landing', `${SITES.tv}/`, { titleHas: 'VisualTaste TV', indexable: true, script: /index-/ });
        // La otra mitad: subir la landing sola la borra, y los QR de emparejamiento dejan de abrir la tele.
        await page('App de la tele (/tv-shell/)', `${SITES.tv}/tv-shell/`, { titleHas: 'Pantalla de bienvenida', indexable: false, script: /tv-/ });
        const og = await fetch(`${SITES.tv}/og.jpg`, { signal: AbortSignal.timeout(25000) }).catch(() => null);
        check('og.jpg (la tele de la portada al compartir)', og?.status === 200 && (og.headers.get('content-type') || '').startsWith('image/'), `status ${og?.status}`);
        await og?.body?.cancel();
    },
};

const started = Date.now();
for (const group of GROUPS.filter((g) => wanted.includes(g))) await RUN[group]();

console.log(`\n${pass} ok, ${fail} fail${skipped ? `, ${skipped} saltadas` : ''}  (${((Date.now() - started) / 1000).toFixed(1)} s, ${wanted.join(' + ')})`);
if (skipped) console.log('Para no saltar nada: copia scripts/smoke.targets.example.json a scripts/smoke.targets.json y pon un slug real.');
process.exit(fail === 0 ? 0 : 1);
