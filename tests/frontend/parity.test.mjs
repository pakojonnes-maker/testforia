// Paridad entre copias: lo que el repo tiene escrito dos o tres veces a propósito tiene que seguir igual.
// Ejecutar:  npm run test:parity
//
// Las apps no se importan entre sí (cada una es un despliegue y un stack distintos), así que varias
// reglas están copiadas a mano con un comentario «si cambias una, cambia la otra». Ese comentario no
// avisa a nadie: la portada de tv.visualtastes.com estuvo tres semanas enseñando la tele anterior.
// Este test da la misma entrada a cada copia y exige la misma salida.
//
//   1. Texto de las guías   apps/guide/src/lib/text.ts · apps/tv/src/lib/text.ts · apps/admin/src/lib/guideText.ts
//                           Una foto intercalada va «tras el apartado N»: las tres tienen que contar igual.
//   2. Tema de la carta     apps/client/src/carta/theme.ts · apps/admin/src/theme/cartaTheme.ts (vista previa)
//   3. Tele de la landing   apps/tv-landing/src/lib/{theme,tv-strings}.ts y public/img ↔ apps/tv (Mirador)
//   4. Precios              apps/client/src/central/main.ts manda; central/index.html, la landing de la
//                           guía (data.ts) y la de la tele dicen lo mismo.
//
// Necesita esbuild (viene con Vite): va en tests/frontend/ y no en `npm test`, que corre sin node_modules.

import { build } from 'esbuild';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// VT_TEST_ROOT: para probar el propio test contra una copia rota a propósito.
const ROOT = process.env.VT_TEST_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const at = (...parts) => join(ROOT, ...parts);
const read = (...parts) => readFileSync(at(...parts), 'utf8');

let pass = 0, fail = 0;
function check(label, ok, detail = '') {
    ok ? pass++ : fail++;
    console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${!ok && detail ? `  → ${detail}` : ''}`);
}

/** Compila un módulo TypeScript de una app (con lo que importe) y lo carga. */
async function load(...parts) {
    const out = await build({ entryPoints: [at(...parts)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
    return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// =============================================================================
// 1. Texto de las guías: los «apartados» se cuentan igual en las tres apps
// =============================================================================
console.log('\n--- Texto de las guías: guía, tele y admin cuentan los mismos apartados ---');
{
    // Cada copia, con la función que cuenta sus apartados. Las de la tele y el admin nacen con las fotos
    // intercaladas (migración 0107): en un checkout anterior a ese commit no existen y se dice, no se falla.
    const COPIAS = {
        guía: [['apps', 'guide', 'src', 'lib', 'text.ts'], 'paragraphs'],
        tele: [['apps', 'tv', 'src', 'lib', 'text.ts'], 'textBlocks'],
        admin: [['apps', 'admin', 'src', 'lib', 'guideText.ts'], 'guideBlocks'],
    };
    const count = {};
    for (const [name, [parts, fn]] of Object.entries(COPIAS)) {
        if (!existsSync(at(...parts))) { console.log(`  --   saltado: ${parts.join('/')} no existe en este checkout`); continue; }
        const mod = await load(...parts);
        count[name] = (text) => mod[fn](text).length;
    }

    const TEXTOS = {
        'vacío': '',
        'null': null,
        'solo espacios y saltos': '  \n\n \n  ',
        'un párrafo': 'La entrada es a partir de las 16:00.',
        'dos párrafos': 'No se fuma dentro.\n\nMascotas bienvenidas avisando antes.',
        'títulos numerados': '1. Antes de salir\nCierra las ventanas.\n\n2. Cómo llegar\nGira a la derecha.\nSigue recto.',
        'título numerado sin cuerpo': '1. Llaves\n\n2. Basura\nLos contenedores están en la esquina.',
        'saltos de Windows': 'Uno.\r\n\r\nDos.\r\n\r\nTres.\r\n',
        'saltos de Mac antiguo': 'Uno.\r\rDos.',
        'tres líneas en blanco seguidas': 'Uno.\n\n\n\nDos.',
        'línea en blanco con espacios dentro': 'Uno.\n   \nDos.',
        'apartado que solo tiene espacios': 'Uno.\n\n   \n\nDos.',
        'blancos al principio y al final': '\n\n  Uno.\n\nDos.  \n\n\n',
        'título seguido de una línea en blanco con espacios': 'Uno.\n\n3. Piscina\n  \n\nDos.',
        'tabuladores entre apartados': 'Uno.\n\t\n\t\nDos.\n\n\tTres.',
        'guía larga': Array.from({ length: 14 }, (_, i) => `${i + 1}. Apartado ${i + 1}\nTexto del apartado ${i + 1}.\nSegunda línea.`).join('\n\n'),
    };
    if (Object.keys(count).length >= 2) {
        for (const [name, text] of Object.entries(TEXTOS)) {
            const n = Object.fromEntries(Object.entries(count).map(([copy, fn]) => [copy, fn(text)]));
            check(`${name}: ${Object.values(n)[0]}`, new Set(Object.values(n)).size === 1, JSON.stringify(n));
        }
    }
    if (count.admin) {
        const blocks = (await load(...COPIAS.admin[0])).guideBlocks(TEXTOS['guía larga']);
        check('El admin numera desde 1, que es lo que se guarda en after_block', same(blocks.map((b) => b.position), blocks.map((_, i) => i + 1)));
    }
}

// =============================================================================
// 2. Tema de la carta: la vista previa del admin pinta lo mismo que la carta
// =============================================================================
console.log('\n--- Tema de la carta: carta y vista previa del admin ---');
{
    const carta = await load('apps', 'client', 'src', 'carta', 'theme.ts');
    const admin = await load('apps', 'admin', 'src', 'theme', 'cartaTheme.ts');
    check('Exportan lo mismo', same(Object.keys(carta).sort(), Object.keys(admin).sort()), `${Object.keys(carta)} / ${Object.keys(admin)}`);

    const MARCAS = {
        'sin colores (los de por defecto)': null,
        'vacío': {},
        'oscura clásica': { primary_color: '#FF6B6B', secondary_color: '#4ECDC4', accent_color: '#FF8C42', text_color: '#FFFFFF', background_color: '#000000' },
        'clara': { primary_color: '#1D4ED8', secondary_color: '#F1F5F9', accent_color: '#F59E0B', text_color: '#0F172A', background_color: '#FFFFFF' },
        'texto y fondo al revés': { primary_color: '#B04E2B', text_color: '#000000', background_color: '#FFFFFF' },
        'todo blanco (sin contraste)': { primary_color: '#FFFFFF', secondary_color: '#FFFFFF', accent_color: '#FFFFFF', text_color: '#FFFFFF', background_color: '#FFFFFF' },
        'todo negro': { primary_color: '#000', secondary_color: '#000', accent_color: '#000', text_color: '#000', background_color: '#000' },
        'grises medios': { primary_color: '#808080', secondary_color: '#7F7F7F', accent_color: '#818181', text_color: '#777777', background_color: '#888888' },
        'con alfa y en minúsculas': { primary_color: '#e07a5fcc', accent_color: 'f2cc8f', background_color: '#3d405b80' },
        'camelCase del admin': { primaryColor: '#2A9D8F', secondaryColor: '#264653', accentColor: '#E9C46A', textColor: '#FFFFFF', backgroundColor: '#1B1B1B' },
        'valores que no son un color': { primary_color: 'rojo', secondary_color: '', accent_color: '#12', text_color: null, background_color: 'rgb(0,0,0)' },
    };
    for (const [name, branding] of Object.entries(MARCAS)) {
        const a = carta.buildCartaTheme(branding);
        const b = admin.buildCartaTheme(branding);
        check(`${name}: mismo tema`, same(a, b), `${JSON.stringify(a)} / ${JSON.stringify(b)}`);
        check(`${name}: mismas variables CSS`, same(carta.themeVars(a), admin.themeVars(b)));
    }
}

// =============================================================================
// 3. La tele de la portada de tv.visualtastes.com es una réplica de Mirador
// =============================================================================
console.log('\n--- Tele de la landing: réplica del inicio de Mirador ---');
{
    const mir = await load('apps', 'tv', 'src', 'mir', 'theme.ts');
    const landing = await load('apps', 'tv-landing', 'src', 'lib', 'theme.ts');
    for (const brand of ['#b04e2b', '#1d4ed8', '#e07a5f', '#0c2a37', '#f8f3e9', '#ffffff', '#000000', '#7f7f7f', '#f2cc8f', '#2a9d8f']) {
        const real = mir.buildMirTheme({ primary_color: brand }).vars;
        const copy = landing.themeVars(brand);
        const distintas = Object.keys(copy).filter((k) => copy[k] !== real[k]);
        check(`Marca ${brand}: mismas variables`, distintas.length === 0, distintas.map((k) => `${k}: landing ${copy[k]}, tele ${real[k]}`).join('; '));
    }

    const tvI18n = await load('apps', 'tv', 'src', 'lib', 'i18n.ts');
    const { TV_STRINGS, TV_LANGS } = await load('apps', 'tv-landing', 'src', 'lib', 'tv-strings.ts');
    check('La landing habla los 13 idiomas', TV_LANGS.length === 13, TV_LANGS.join(','));
    // `door` no existe en la tele: allí es el título que el anfitrión da a su bloque.
    for (const key of Object.keys(TV_STRINGS).filter((k) => k !== 'door')) {
        const distintos = TV_LANGS.filter((lang) => {
            try { return tvI18n.getTvString(key, lang) !== TV_STRINGS[key][lang]; } catch { return true; }
        });
        check(`Cadena «${key}» igual que en la tele`, distintos.length === 0, `distinta en: ${distintos.join(', ')}`);
    }

    const tiles = readdirSync(at('apps', 'tv', 'src', 'assets', 'tiles')).filter((f) => f.endsWith('.webp')).sort();
    const copies = readdirSync(at('apps', 'tv-landing', 'public', 'img')).filter((f) => f.endsWith('.webp')).sort();
    const faltan = tiles.filter((f) => !copies.includes(f));
    check(`Las ${tiles.length} teselas de la tele están en la landing`, tiles.length > 0 && faltan.length === 0, `faltan: ${faltan.join(', ')}`);
    for (const f of tiles.filter((x) => copies.includes(x))) {
        const equal = readFileSync(at('apps', 'tv', 'src', 'assets', 'tiles', f)).equals(readFileSync(at('apps', 'tv-landing', 'public', 'img', f)));
        check(`${f} es la misma imagen`, equal);
    }
}

// =============================================================================
// 4. Precios: la calculadora manda y las tres páginas de venta dicen lo mismo
// =============================================================================
console.log('\n--- Precios: los mismos en las tres páginas de venta ---');
{
    // PRICES no se exporta (main.ts arranca la página al importarse): se lee del fuente.
    const main = read('apps', 'client', 'src', 'central', 'main.ts');
    const block = main.slice(main.indexOf('const PRICES = {'), main.indexOf('} as const;'));
    const num = (name) => Number((block.match(new RegExp(`\\b${name}:\\s*(\\d+)`)) || [])[1]);
    const P = { guia: num('guia'), conserje: num('guiaConserje'), tv: num('tv') };
    const tiers = [...block.matchAll(/hasta:\s*(\d+),\s*euros:\s*(\d+)/g)].map((m) => ({ hasta: Number(m[1]), euros: Number(m[2]) }));
    const leido = [P.guia, P.conserje, P.tv].every((n) => n > 0) && tiers.length === 2;
    check(`Precios de la calculadora: guía ${P.guia} €, con conserje ${P.conserje} €, tele ${P.tv} €, paquete ${tiers.map((t) => `${t.euros} € hasta ${t.hasta}`).join(' y ')}`, leido, block);

    if (leido) {
        const [t1, t2] = tiers;
        const porPiso = (t1.euros / t1.hasta).toFixed(2).replace('.', ',');
        // El espacio duro (&nbsp; o U+00A0) entre la cifra y el € es cosa de cada página.
        const plain = (s) => s.replace(/&nbsp;|[  ]/g, ' ');
        const PAGINAS = {
            'central (visualtastes.com)': {
                text: plain(read('apps', 'client', 'central', 'index.html')),
                dice: [`${P.guia} € por piso al mes`, `${P.conserje} € por piso al mes`, `${P.tv} € por piso al mes`, `${t1.euros} € al mes`, `${t2.euros} € al mes`, `${porPiso} € por piso`],
            },
            'landing de la guía (data.ts)': {
                text: plain(read('apps', 'guide', 'src', 'pages', 'landing', 'data.ts')),
                dice: [`${P.guia} € por piso al mes`, `con el conserje con IA, ${P.conserje} €`, `${P.tv} € por piso al mes`, `${t1.euros} € al mes de 1 a ${t1.hasta} pisos y ${t2.euros} € de ${t1.hasta + 1} a ${t2.hasta}`, `${porPiso} € por piso`],
            },
            'landing de la tele': {
                text: plain(read('apps', 'tv-landing', 'index.html')),
                dice: [`${P.tv} € por piso al mes`, `${t1.euros} € al mes de 1 a ${t1.hasta} pisos y ${t2.euros} € de ${t1.hasta + 1} a ${t2.hasta}`],
            },
        };
        for (const [name, { text, dice }] of Object.entries(PAGINAS)) {
            const faltan = dice.filter((frase) => !text.includes(frase));
            check(`${name}: dice los precios de la calculadora`, faltan.length === 0, `no aparece: «${faltan.join('» · «')}»`);

            // Y al revés: ninguna página anuncia un precio propio que la calculadora no tenga.
            const sueltos = [...text.matchAll(/(?<![\d,.])(\d+) € por piso al mes/g)].map((m) => Number(m[1])).filter((n) => ![P.guia, P.conserje, P.tv].includes(n));
            check(`${name}: ningún otro «N € por piso al mes»`, sueltos.length === 0, [...new Set(sueltos)].join(', '));
            const paquetes = [...text.matchAll(/(?<![\d,.])(\d+) € al mes (?:de 1 a|hasta) (\d+) pisos/g)].filter((m) => !tiers.some((t) => t.euros === Number(m[1]) && t.hasta === Number(m[2])));
            check(`${name}: ningún otro precio de paquete`, paquetes.length === 0, paquetes.map((m) => m[0]).join(' · '));
        }
    }
}

console.log(`\n${pass} ok, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
