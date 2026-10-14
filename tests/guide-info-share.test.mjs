// Test de los bloques de guía compartidos entre pisos (migración 0112).
// Ejecutar:  node tests/guide-info-share.test.mjs
//
// Lo que no se puede romper:
//   - un bloque compartido sale en la guía de cada piso, en la posición que tiene en ESE piso, y editarlo
//     una vez lo cambia en todos (y la caché se invalida con una sola escritura de agencia);
//   - solo se comparte entre pisos de la misma agencia, y otra agencia no lee ni toca nada;
//   - quitarlo del piso de origen o borrar ese piso no lo hace desaparecer de los demás: pasa a otro piso
//     con sus traducciones y sus fotos (que no se borran de R2);
//   - borrarlo lo quita de todos.
// Usa un D1 de verdad (tests/_d1.mjs): esquema de producción + la migración 0112.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadWorkerModule } from './_load.mjs';
import { openD1, loadSchema, seed, splitSql, ROOT } from './_d1.mjs';

const JWT_SECRET = 'test-secret-de-los-bloques-compartidos';
const ORIGIN = 'https://visualtasteworker.example.workers.dev';

let pass = 0, fail = 0;
function assert(label, condition, detail = '') {
    condition ? pass++ : fail++;
    console.log(`${condition ? '  ok  ' : ' FAIL '} ${label}${detail ? '  — ' + detail : ''}`);
}

/** Firma un JWT HS256 igual que generateJWT() en workerAuthentication.js. */
async function signTestJWT(payload, secret) {
    const b64url = (data) => {
        const base64 = typeof data === 'string' ? btoa(data) : btoa(String.fromCharCode(...new Uint8Array(data)));
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
    return `${header}.${body}.${b64url(sig)}`;
}

const d1 = await openD1();
if (!d1) {
    console.log('  --   saltado: no hay Miniflare (ni en el repo ni en el wrangler global). SIN PROBAR, no «bien».');
    process.exit(0);
}
const { db, dispose } = d1;
await loadSchema(db);
// Idempotente (IF NOT EXISTS): sirve antes y después de regenerar BDschemaFinal.sql.
await db.batch(splitSql(readFileSync(join(ROOT, 'migrations/0112_guide_info_shares.sql'), 'utf8')).map(s => db.prepare(s)));

// --- Datos -------------------------------------------------------------------
await seed(db, 'languages', { code: 'es', name: 'Español', native_name: 'Español', is_active: 1 });
await seed(db, 'languages', { code: 'en', name: 'English', native_name: 'English', is_active: 1 });
await seed(db, 'users', { id: 'u_a', email: 'a@test', password_hash: 'x' });
await seed(db, 'users', { id: 'u_b', email: 'b@test', password_hash: 'x' });
await seed(db, 'guide_zones', { id: 'z1', name: 'Zona', slug: 'zona', is_active: 1 });
await seed(db, 'guide_agencies', { id: 'ag1', name: 'Edificio Sol', slug: 'ag1', is_active: 1 });
await seed(db, 'guide_agencies', { id: 'ag2', name: 'Otra agencia', slug: 'ag2', is_active: 1 });
await seed(db, 'guide_agency_staff', { agency_id: 'ag1', user_id: 'u_a', role: 'admin', is_active: 1 });
await seed(db, 'guide_agency_staff', { agency_id: 'ag2', user_id: 'u_b', role: 'admin', is_active: 1 });
for (const [id, agency] of [['apt_a', 'ag1'], ['apt_b', 'ag1'], ['apt_c', 'ag1'], ['apt_x', 'ag2']]) {
    await seed(db, 'guide_apartments', { id, agency_id: agency, zone_id: 'z1', name: `Piso ${id.slice(-1).toUpperCase()}`, slug: `piso-${id.slice(-1)}`, is_active: 1 });
}
// El bloque del edificio, en el piso A (3.º de su guía), con texto, una foto y un paso con foto.
const INFO = 'info_apt_a_building_access';
await seed(db, 'guide_apartment_info', { id: INFO, apartment_id: 'apt_a', info_key: 'building_access', order_index: 3, use_custom_title: 1 });
await seed(db, 'translations', { entity_id: INFO, entity_type: 'apartment_info', language_code: 'es', field: 'title', value: 'Acceso al edificio' });
await seed(db, 'translations', { entity_id: INFO, entity_type: 'apartment_info', language_code: 'es', field: 'content', value: 'Portal con código 1234.' });
await seed(db, 'translations', { entity_id: INFO, entity_type: 'apartment_info', language_code: 'en', field: 'content', value: 'Door code 1234.' });
const PHOTO = 'guide/apartments/apt_a/info/portal.webp';
const STEP_PHOTO = 'guide/apartments/apt_a/info/paso.webp';
await seed(db, 'guide_apartment_media', { id: 'med_1', apartment_info_id: INFO, r2_key: PHOTO, media_type: 'image', order_index: 0 });
await seed(db, 'guide_info_steps', { id: 'step_1', apartment_info_id: INFO, step_number: 1 });
await seed(db, 'guide_info_step_media', { id: 'smed_1', step_id: 'step_1', r2_key: STEP_PHOTO, media_type: 'image' });
// B ya tiene dos bloques suyos, uno con la MISMA clave (para el traspaso).
await seed(db, 'guide_apartment_info', { id: 'info_apt_b_wifi', apartment_id: 'apt_b', info_key: 'wifi', order_index: 0 });
await seed(db, 'guide_apartment_info', { id: 'info_apt_b_building_access', apartment_id: 'apt_b', info_key: 'building_access', order_index: 1 });

// --- Entorno -----------------------------------------------------------------
const kvStore = new Map();
const kvPuts = [];
const r2Objects = new Set([PHOTO, STEP_PHOTO, 'guide/apartments/apt_a/cover.webp']);
const env = {
    DB: db,
    JWT_SECRET,
    GUIDE_CACHE: {
        async get(k) { return kvStore.get(k)?.value ?? null; },
        async getWithMetadata(k) { const e = kvStore.get(k); return { value: e?.value ?? null, metadata: e?.metadata ?? null }; },
        async put(k, value, opts = {}) { kvPuts.push(k); kvStore.set(k, { value, metadata: opts.metadata ?? null }); },
    },
    R2_BUCKET: {
        async list({ prefix }) { return { objects: [...r2Objects].filter(k => k.startsWith(prefix)).map(key => ({ key })), truncated: false }; },
        async delete(keys) { for (const k of [].concat(keys)) r2Objects.delete(k); },
        async put(k) { r2Objects.add(k); },
    },
};

const { module: admin, cleanup: cleanupAdmin } = await loadWorkerModule('workerGuideAdmin.js');
const { module: guide, cleanup: cleanupGuide } = await loadWorkerModule('workerGuide.js');

const tokenA = await signTestJWT({ userId: 'u_a', is_superadmin: false }, JWT_SECRET);
const tokenOther = await signTestJWT({ userId: 'u_b', is_superadmin: false }, JWT_SECRET);
const tokenSuper = await signTestJWT({ userId: 'u_super', is_superadmin: true }, JWT_SECRET);

async function call(token, method, path, body) {
    const headers = { Authorization: `Bearer ${token}` };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await admin.handleGuideAdminRequests(new Request(`${ORIGIN}/guide/admin/${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    }), env);
    return { status: res.status, data: await res.json() };
}
const adminBlocks = async (apt) => (await call(tokenA, 'GET', `apartments/${apt}/info?lang=es`)).data.info || [];
const guideBlocks = async (slug, lang = 'es') => (await (await guide.handleGetGuidebook(env, slug, lang, ORIGIN)).json()).apartment?.info || [];
const shareRows = async () => (await db.prepare('SELECT apartment_id, order_index FROM guide_info_shares WHERE info_id = ? ORDER BY apartment_id').bind(INFO).all()).results;
const ownerOf = async (id) => (await db.prepare('SELECT apartment_id, info_key, order_index FROM guide_apartment_info WHERE id = ?').bind(id).first());

console.log('\n--- Compartir un bloque ---');
{
    const lib = await call(tokenA, 'GET', 'apartments/apt_b/info-library');
    assert('La biblioteca de B ofrece el bloque de A', lib.data.blocks?.some(b => b.id === INFO && b.owner_apartment_id === 'apt_a'),
        JSON.stringify(lib.data.blocks?.map(b => b.id)));
    assert('...con su título y extracto en español', lib.data.blocks?.find(b => b.id === INFO)?.resolved_title === 'Acceso al edificio');
    assert('...y no ofrece los bloques que B ya tiene', !lib.data.blocks?.some(b => b.owner_apartment_id === 'apt_b'));

    const put = await call(tokenA, 'PUT', `apartments/apt_a/info/${INFO}/shares`, { apartment_ids: ['apt_a', 'apt_b', 'apt_c'] });
    assert('Compartir con B y C responde 200', put.status === 200 && put.data.owner_apartment_id === 'apt_a', JSON.stringify(put.data));
    const rows = await shareRows();
    assert('Entra al final de la guía de cada piso (B tenía 0 y 1; C, nada)',
        JSON.stringify(rows) === JSON.stringify([{ apartment_id: 'apt_b', order_index: 2 }, { apartment_id: 'apt_c', order_index: 0 }]), JSON.stringify(rows));
    assert('La caché se invalida con UNA escritura de agencia', kvPuts.includes('ver:agency:ag1') && !kvPuts.some(k => k.startsWith('ver:apt:')), JSON.stringify(kvPuts));

    const shares = await call(tokenA, 'GET', `apartments/apt_a/info/${INFO}/shares`);
    const inc = Object.fromEntries((shares.data.apartments || []).map(a => [a.id, a.included]));
    assert('La lista de pisos marca A, B y C, y no enseña los de otra agencia',
        inc.apt_a && inc.apt_b && inc.apt_c && !('apt_x' in inc), JSON.stringify(shares.data.apartments));

    const inB = (await adminBlocks('apt_b')).find(b => b.id === INFO);
    assert('El admin de B lo lista, con su piso de origen y en cuántos pisos más sale',
        inB?.owner_apartment_id === 'apt_a' && inB?.share_count === 2 && inB?.order_index === 2, JSON.stringify(inB));
    const cov = await call(tokenA, 'GET', 'apartments/apt_b/info/coverage');
    assert('La cobertura de idiomas de B lo cuenta', cov.data.total === 3 && cov.data.by_lang?.en === 1, JSON.stringify(cov.data));

    const gB = await guideBlocks('piso-b');
    assert('La guía pública de B lo enseña, en su sitio (3.º)', gB[2]?.id === INFO && gB[2]?.content === 'Portal con código 1234.', JSON.stringify(gB.map(b => b.id)));
    const gCen = await guideBlocks('piso-c', 'en');
    assert('...y la de C, en inglés', gCen[0]?.content === 'Door code 1234.', JSON.stringify(gCen));
    assert('...y la de A sigue teniéndolo', (await guideBlocks('piso-a')).some(b => b.id === INFO));
}

console.log('\n--- Editar una vez, cambia en todos ---');
{
    kvPuts.length = 0;
    // El admin edita desde B con la ruta del piso de origen y SIN order_index.
    const save = await call(tokenA, 'POST', 'apartments/apt_a/info', {
        info_key: 'building_access', use_custom_title: true,
        translations: { es: { title: 'Acceso al edificio', content: 'Portal con código 9876.' } },
    });
    assert('Guardar responde 200 con el mismo id', save.status === 200 && save.data.infoId === INFO, JSON.stringify(save.data));
    assert('No le cambia la posición en A', (await ownerOf(INFO)).order_index === 3);
    const [gA, gB, gC] = [await guideBlocks('piso-a'), await guideBlocks('piso-b'), await guideBlocks('piso-c')];
    assert('El texto nuevo sale en A, B y C',
        [gA, gB, gC].every(g => g.find(b => b.id === INFO)?.content === 'Portal con código 9876.'));
    assert('...con una sola escritura de versión, la de la agencia', JSON.stringify(kvPuts.filter(k => k.startsWith('ver:'))) === '["ver:agency:ag1"]', JSON.stringify(kvPuts));

    const reorder = await call(tokenA, 'PUT', 'apartments/apt_b/info/reorder', { items: [{ id: INFO, order_index: 0 }, { id: 'info_apt_b_wifi', order_index: 1 }] });
    assert('Reordenar en B mueve el bloque solo en B', reorder.status === 200
        && (await guideBlocks('piso-b'))[0]?.id === INFO && (await ownerOf(INFO)).order_index === 3);
}

console.log('\n--- Otra agencia no ve ni toca nada ---');
{
    const before = JSON.stringify(await shareRows());
    const cross = await call(tokenA, 'PUT', `apartments/apt_a/info/${INFO}/shares`, { apartment_ids: ['apt_a', 'apt_x'] });
    assert('Compartir con un piso de otra agencia: 403 y nada cambia', cross.status === 403 && JSON.stringify(await shareRows()) === before, JSON.stringify(cross));
    const read = await call(tokenOther, 'GET', 'apartments/apt_b/info?lang=es');
    assert('Otra agencia no puede leer los bloques de B (antes de oct-2026, sí)', read.status === 403 && !read.data.info, JSON.stringify(read));
    const shares = await call(tokenOther, 'GET', `apartments/apt_a/info/${INFO}/shares`);
    const set = await call(tokenOther, 'PUT', `apartments/apt_a/info/${INFO}/shares`, { apartment_ids: ['apt_x'] });
    assert('...ni ver ni cambiar dónde se comparte', shares.status === 403 && set.status === 403 && JSON.stringify(await shareRows()) === before);
    const lib = await call(tokenOther, 'GET', 'apartments/apt_x/info-library');
    assert('Su biblioteca no ofrece bloques de ag1', lib.status === 200 && lib.data.blocks?.length === 0, JSON.stringify(lib.data));
    const empty = await call(tokenA, 'PUT', `apartments/apt_a/info/${INFO}/shares`, { apartment_ids: [] });
    assert('Una lista vacía se rechaza (eso es borrar)', empty.status === 400 && JSON.stringify(await shareRows()) === before);
}

console.log('\n--- Quitarlo del piso de origen ---');
{
    const put = await call(tokenA, 'PUT', `apartments/apt_a/info/${INFO}/shares`, { apartment_ids: ['apt_b', 'apt_c'] });
    const owner = await ownerOf(INFO);
    assert('Pasa a B, que ya lo tenía', put.status === 200 && put.data.owner_apartment_id === 'apt_b' && owner.apartment_id === 'apt_b', JSON.stringify(put.data));
    assert('...con la posición que tenía en B y la clave con sufijo (B ya usaba building_access)',
        owner.order_index === 0 && owner.info_key === 'building_access_2', JSON.stringify(owner));
    assert('Solo queda compartido con C', JSON.stringify((await shareRows()).map(r => r.apartment_id)) === '["apt_c"]');
    assert('A ya no lo enseña; B y C sí, con el mismo texto',
        !(await guideBlocks('piso-a')).some(b => b.id === INFO)
        && (await guideBlocks('piso-b')).find(b => b.id === INFO)?.content === 'Portal con código 9876.'
        && (await guideBlocks('piso-c')).some(b => b.id === INFO));
    // Editar tras el traspaso: el id ya no es info_${piso}_${clave} y aun así las traducciones van a su fila.
    await call(tokenA, 'POST', 'apartments/apt_b/info', { info_key: 'building_access_2', use_custom_title: true, translations: { es: { content: 'Código nuevo 5555.' } } });
    const bulk = await call(tokenA, 'POST', 'apartments/apt_c/info/bulk-translations', { building_access_2: { en: { content: 'New code 5555.' } } });
    assert('Editar y traducir (también desde C) escriben en el bloque traspasado',
        (await guideBlocks('piso-c')).find(b => b.id === INFO)?.content === 'Código nuevo 5555.'
        && (await guideBlocks('piso-c', 'en')).find(b => b.id === INFO)?.content === 'New code 5555.', JSON.stringify(bulk.data));
    const orphans = await db.prepare(`SELECT COUNT(*) AS n FROM translations WHERE entity_type = 'apartment_info' AND entity_id NOT IN (SELECT id FROM guide_apartment_info)`).first();
    assert('...sin dejar traducciones huérfanas', orphans.n === 0, `${orphans.n} huérfanas`);
}

console.log('\n--- Borrar el piso de origen ---');
{
    const del = await call(tokenSuper, 'DELETE', 'apartments/apt_b', { confirm: 'borrar apartamento' });
    const owner = await ownerOf(INFO);
    assert('Borrar B (el origen) responde 200', del.status === 200, JSON.stringify(del.data));
    assert('El bloque pasa a C y deja de estar compartido', owner?.apartment_id === 'apt_c' && (await shareRows()).length === 0, JSON.stringify(owner));
    const gC = (await guideBlocks('piso-c')).find(b => b.id === INFO);
    assert('C lo sigue enseñando, con su texto y su foto', gC?.content === 'Código nuevo 5555.' && JSON.stringify(gC).includes('portal.webp'), JSON.stringify(gC));
    assert('Las fotos del bloque (y la de su paso) siguen en R2; lo demás de A/B se borra',
        r2Objects.has(PHOTO) && r2Objects.has(STEP_PHOTO), JSON.stringify([...r2Objects]));
    const step = await db.prepare('SELECT COUNT(*) AS n FROM guide_info_steps WHERE apartment_info_id = ?').bind(INFO).first();
    assert('...y su paso sigue en la BD', step.n === 1);
    const ownB = await db.prepare(`SELECT COUNT(*) AS n FROM guide_apartment_info WHERE apartment_id = 'apt_b'`).first();
    assert('Los bloques propios de B sí se borran', ownB.n === 0);
}

console.log('\n--- Borrar un bloque compartido ---');
{
    await call(tokenA, 'PUT', `apartments/apt_c/info/${INFO}/shares`, { apartment_ids: ['apt_c', 'apt_a'] });
    assert('Se vuelve a compartir con A', (await guideBlocks('piso-a')).some(b => b.id === INFO));
    const del = await call(tokenA, 'DELETE', `apartments/apt_c/info/${INFO}`);
    assert('Borrarlo lo quita de todos los pisos', del.status === 200
        && !(await guideBlocks('piso-a')).some(b => b.id === INFO) && !(await guideBlocks('piso-c')).some(b => b.id === INFO)
        && (await shareRows()).length === 0);
}

cleanupAdmin();
cleanupGuide();
await dispose();
console.log(`\n${pass} ok, ${fail} FALLAN`);
if (fail > 0) process.exit(1);
