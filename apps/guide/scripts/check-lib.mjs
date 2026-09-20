// scripts/check-lib.mjs — comprueba con textos REALES de producción las funciones puras de src/lib que
// interpretan lo que escriben los anfitriones: el WiFi («Red: X / Contraseña: Y», con o sin nota) y el
// texto plano de las guías (párrafos y títulos numerados).
//
//   npm run test:lib          (desde apps/guide)
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = await build({
  stdin: { contents: `export * from './wifi'; export * from './text';`, resolveDir: path.join(here, '..', 'src', 'lib'), sourcefile: 'check-entry.ts', loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent',
});
const L = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

let failures = 0;
const eq = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { failures++; console.log('  ✗', msg, '\n      obtenido:', JSON.stringify(a), '\n      esperado:', JSON.stringify(b)); }
  else console.log('  ✔', msg);
};

console.log('— WiFi (los tres formatos que hay hoy en producción)');
eq(L.parseWifi('Red: PalomaPark_5G\nContraseña: benalmadena2024#'),
  { rows: [{ label: 'Red', value: 'PalomaPark_5G' }, { label: 'Contraseña', value: 'benalmadena2024#' }], note: '', copyValue: 'benalmadena2024#' },
  'dos líneas: la contraseña es lo que se copia');
eq(L.parseWifi('Red: FincaAlboroto\nContraseña: alboroto2026\n\nCubre toda la casa y la zona de la piscina. Si un dispositivo pierde la señal, reinicia el router.'),
  { rows: [{ label: 'Red', value: 'FincaAlboroto' }, { label: 'Contraseña', value: 'alboroto2026' }], note: 'Cubre toda la casa y la zona de la piscina. Si un dispositivo pierde la señal, reinicia el router.', copyValue: 'alboroto2026' },
  'con nota tras la línea en blanco');
eq(L.parseWifi('Red: PisoPlaya2B / Contraseña: Burriana2024'),
  { rows: [{ label: 'Red', value: 'PisoPlaya2B' }, { label: 'Contraseña', value: 'Burriana2024' }], note: '', copyValue: 'Burriana2024' },
  'las dos parejas en una sola línea');
eq(L.parseWifi('Network: Casa5G\nPassword: a:b:c'), { rows: [{ label: 'Network', value: 'Casa5G' }, { label: 'Password', value: 'a:b:c' }], note: '', copyValue: 'a:b:c' }, 'idioma distinto y dos puntos dentro del valor');
eq(L.parseWifi('La clave está en la nevera'), { rows: [], note: 'La clave está en la nevera', copyValue: 'La clave está en la nevera' }, 'texto libre: se enseña tal cual y se copia entero');
eq(L.parseWifi('Red: Solo'), { rows: [{ label: 'Red', value: 'Solo' }], note: '', copyValue: 'Solo' }, 'una sola pareja: copia su valor');
eq(L.parseWifi('Red 2.4: A\nRed 5G: B\nContraseña: C'), { rows: [{ label: 'Red 2.4', value: 'A' }, { label: 'Red 5G', value: 'B' }, { label: 'Contraseña', value: 'C' }], note: '', copyValue: 'Red 2.4: A\nRed 5G: B\nContraseña: C' }, 'tres parejas: no se adivina cuál es la clave, se copia todo');
eq(L.parseWifi(''), { rows: [], note: '', copyValue: '' }, 'vacío');
eq(L.parseWifi(null), { rows: [], note: '', copyValue: '' }, 'null');
eq(L.parseWifi('Red: A\r\nContraseña: B\r\n'), { rows: [{ label: 'Red', value: 'A' }, { label: 'Contraseña', value: 'B' }], note: '', copyValue: 'B' }, 'saltos de línea de Windows');

console.log('— Texto de las guías');
eq(L.paragraphs('1. Antes de salir\nLa entrada es a partir de las 16:00.\n\n2. Cómo llegar\nGira a la derecha.\nSigue recto.'),
  [{ head: '1. Antes de salir', body: 'La entrada es a partir de las 16:00.' }, { head: '2. Cómo llegar', body: 'Gira a la derecha.\nSigue recto.' }], 'párrafos con título numerado');
eq(L.paragraphs('No se fuma dentro.\n\nMascotas bienvenidas avisando antes.'), [{ head: null, body: 'No se fuma dentro.' }, { head: null, body: 'Mascotas bienvenidas avisando antes.' }], 'párrafos sin título');
eq(L.paragraphs('1. Solo una línea numerada'), [{ head: null, body: '1. Solo una línea numerada' }], 'una línea numerada sola no es un título');
eq(L.paragraphs('  \n\n  '), [], 'solo espacios');
eq(L.paragraphs(undefined), [], 'undefined');

console.log('— Importes del pedido');
const nb = (s) => s.replace(/\u00a0|\u202f/g, ' ');
eq(nb(L.formatMoney(38, 'EUR', 'es')), '38 €', 'entero: sin decimales');
eq(nb(L.formatMoney(38.5, 'EUR', 'es')), '38,50 €', 'con decimales: dos, con la coma española');
eq(nb(L.formatMoney(38.5, 'EUR', 'en')), '€38.50', 'en inglés, el símbolo delante y el punto');
eq(L.formatMoney(12, 'ZZZZ', 'es'), '12.00 ZZZZ', 'moneda desconocida: no rompe');
eq(nb(L.formatMoney(9.9, '', 'de')), '9,90 €', 'sin moneda: euros');

console.log('— Tamaño del código');
eq([L.codeSize('4821'), L.codeSize('48291'), L.codeSize('482913'), L.codeSize('4829135'), L.codeSize('48291357'), L.codeSize('48 29')], ['', 's', 's', 'xs', 'xs', ''], '4 caben grandes; 5–6 medianas; 7–8 pequeñas');

console.log(failures === 0 ? '\n✔ lib: todo comprobado' : `\n✘ ${failures} comprobaciones fallan`);
process.exit(failures === 0 ? 0 : 1);
