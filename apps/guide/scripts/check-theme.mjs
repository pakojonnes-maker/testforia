// scripts/check-theme.mjs — comprueba, con colores y fuentes reales de agencias y con extremos, que el
// tema derivado de la BD (src/theme/*) siempre se lee: contraste WCAG de cada par texto/fondo y reglas de
// tipografía. Sin framework: compila el TypeScript con el esbuild que ya trae Vite y lo ejecuta.
//
//   npm run test:theme          (desde apps/guide)
import { build } from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, '..', 'src', 'theme', 'check-entry.ts');

const out = await build({
  stdin: {
    contents: `export * from './color'; export * from './fonts'; export * from './vars';`,
    resolveDir: path.join(here, '..', 'src', 'theme'),
    sourcefile: 'check-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const code = out.outputFiles[0].text;
const T = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗', msg); };
const ok = (cond, msg) => { if (!cond) fail(msg); };
const r2 = (n) => n.toFixed(2);

// ---------------------------------------------------------------- color
// Las tres agencias que hay hoy en producción (leídas de GET /guide/<slug>) + los valores del diseño
// + extremos que un administrador podría escribir.
const AGENCIES = {
  'Costa del Sol Apartments': { primary_color: '#1a4fd8', secondary_color: '#F7D08A', accent_color: '#E8734A' },
  'Renters Costa Sol': { primary_color: '#1a4fd8', secondary_color: '#C96D4B', accent_color: '#d4a853' },
  'The Host Edition': { primary_color: '#116dd0', secondary_color: '#F4F1EC', accent_color: '#9A8455' },
  'valores del diseño': { primary_color: '#C8613F', secondary_color: '#06415C', accent_color: '#F0B04B' },
  'sin configurar': {},
  'todo null': { primary_color: null, secondary_color: null, accent_color: null },
  'hex inválido': { primary_color: 'no-es-un-color', secondary_color: '#zzz', accent_color: '' },
  'hex corto': { primary_color: '#0af', secondary_color: '#fa0', accent_color: '#f0a' },
  'blanco': { primary_color: '#FFFFFF', secondary_color: '#FFFFFF', accent_color: '#FFFFFF' },
  'negro': { primary_color: '#000000', secondary_color: '#000000', accent_color: '#000000' },
  'amarillo puro': { primary_color: '#FFD500', secondary_color: '#FFD500', accent_color: '#FFD500' },
  'gris claro': { primary_color: '#DDDDDD', secondary_color: '#EEEEEE', accent_color: '#CCCCCC' },
  'verde saturado': { primary_color: '#00A650', secondary_color: '#00FF7F', accent_color: '#39FF14' },
  'terracota medio': { primary_color: '#B5651D', secondary_color: '#8B4513', accent_color: '#CD853F' },
  'solo primario': { primary_color: '#7B1FA2' },
};

console.log('— Color: contrastes derivados (mínimo 4,5 en texto; 3 en marcas)');
console.log('  ' + 'agencia'.padEnd(26) + 'botón'.padEnd(9) + 'texto/soft'.padEnd(12) + 'tesela 2ª'.padEnd(11) + 'precio'.padEnd(8) + 'total/oscuro'.padEnd(14) + 'marca');
for (const [name, colors] of Object.entries(AGENCIES)) {
  const t = T.deriveTheme(colors);
  const c = {
    fill: T.contrast(t.onFill, t.fill),
    textSoft: T.contrast(t.text, t.soft),
    textPaper: T.contrast(t.text, T.PAPER),
    second: T.contrast(t.onSecond, t.second),
    accent: T.contrast(t.onAccent, t.accent),
    ink: T.contrast(t.accentOnInk, T.INK),
    mark: T.contrast(t.accentMark, T.PAPER),
  };
  console.log('  ' + name.padEnd(26) + r2(c.fill).padEnd(9) + r2(c.textSoft).padEnd(12) + r2(c.second).padEnd(11) + r2(c.accent).padEnd(8) + r2(c.ink).padEnd(14) + r2(c.mark));
  ok(c.fill >= 4.5, `${name}: texto sobre el relleno de marca ${r2(c.fill)} < 4,5`);
  ok(c.textSoft >= 4.5, `${name}: texto de marca sobre el fondo suave ${r2(c.textSoft)} < 4,5`);
  ok(c.textPaper >= 4.5, `${name}: texto de marca sobre el papel ${r2(c.textPaper)} < 4,5`);
  ok(c.second >= 4.5, `${name}: texto sobre la tesela secundaria ${r2(c.second)} < 4,5`);
  ok(c.accent >= 4.5, `${name}: texto sobre el distintivo de acento ${r2(c.accent)} < 4,5`);
  ok(c.ink >= 4.5, `${name}: acento como texto sobre tinta ${r2(c.ink)} < 4,5`);
  ok(c.mark >= 3, `${name}: marca de acento sobre el papel ${r2(c.mark)} < 3`);
  for (const k of ['brand', 'fill', 'onFill', 'text', 'soft', 'second', 'onSecond', 'accent', 'onAccent', 'accentMark', 'accentOnInk']) {
    ok(/^#[0-9A-F]{6}$/.test(t[k]), `${name}: ${k} no es un #RRGGBB válido (${t[k]})`);
  }
}

// Un color que ya se lee no se toca: los primarios azules de producción salen tal cual.
const blue = T.deriveTheme({ primary_color: '#1a4fd8' });
ok(blue.fill === '#1A4FD8' && blue.onFill === '#FFFFFF', `el azul #1a4fd8 debería quedarse como está con texto blanco (${blue.fill}/${blue.onFill})`);
// Un amarillo claro se queda amarillo con texto de tinta, no se convierte en un ocre oscuro.
const yellow = T.deriveTheme({ primary_color: '#FFD500' });
ok(yellow.fill === '#FFD500' && yellow.onFill === T.INK, `el amarillo debería llevar texto de tinta (${yellow.fill}/${yellow.onFill})`);
// Sin secundario, se deriva del primario en vez de caer en un azul ajeno.
const noSecond = T.deriveTheme({ primary_color: '#7B1FA2' });
ok(noSecond.second !== T.deriveTheme({}).second, 'sin secundario, la tesela debería salir del primario y no del valor por defecto');

// ---------------------------------------------------------------- variables
console.log('— Variables CSS');
const vars = T.allVars({ primary_color: '#1a4fd8', secondary_color: '#F7D08A', accent_color: '#E8734A', headline_font: null, body_font: null, label_font: null });
for (const k of ['--g-brand', '--g-fill', '--g-on-fill', '--g-text', '--g-soft', '--g-second', '--g-on-second', '--g-accent', '--g-on-accent', '--g-accent-mark', '--g-accent-on-ink', '--g-ff-head', '--g-ff-body', '--g-ff-label', '--color-primary', '--brand-primary', '--font-headline-md']) {
  ok(typeof vars[k] === 'string' && vars[k].length > 0, `falta la variable ${k}`);
}
ok(vars['--g-brand'] === '#1A4FD8', `--g-brand debería ser el primario de la BD (${vars['--g-brand']})`);

// ---------------------------------------------------------------- tipografía
console.log('— Tipografía');
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);
const D = { headline: 'Playfair Display', body: 'Montserrat', label: 'Montserrat' };
eq(T.resolveFonts(null), D, 'sin agencia → las del diseño');
eq(T.resolveFonts({ headline_font: null, body_font: null, label_font: null }), D, 'todo null → las del diseño');
eq(T.resolveFonts({ headline_font: '', body_font: '  ', label_font: '' }), D, 'vacíos → las del diseño');
eq(T.resolveFonts({ headline_font: 'Newsreader', body_font: 'Inter', label_font: 'Archivo Narrow' }), D, 'el trío que guardaba el admin por defecto → las del diseño');
eq(T.resolveFonts({ headline_font: 'newsreader', body_font: 'INTER', label_font: 'archivo narrow' }), D, 'el trío, sin importar mayúsculas');
eq(T.resolveFonts({ headline_font: 'Playfair Display', body_font: 'Inter', label_font: 'Archivo Narrow' }), { headline: 'Playfair Display', body: 'Inter', label: 'Archivo Narrow' }, 'The Host Edition: cambió un rol → se respetan los tres');
eq(T.resolveFonts({ headline_font: 'Lora' }), { headline: 'Lora', body: 'Montserrat', label: 'Montserrat' }, 'solo un rol elegido → el resto, por defecto');
eq(T.resolveFonts({ headline_font: 'Newsreader', body_font: null, label_font: null }), { headline: 'Newsreader', body: 'Montserrat', label: 'Montserrat' }, 'Newsreader elegido solo → se respeta');

ok(T.googleFontsHref(['Playfair Display', 'Montserrat', 'Montserrat'], 'es') === null, 'las fuentes del diseño no deberían pedir nada a Google');
const lora = T.googleFontsHref(['Lora', 'Montserrat'], 'es');
ok(lora && lora.includes('family=Lora') && !lora.includes('Montserrat'), 'Lora sí se pide, Montserrat no');
const host = T.googleFontsHref(['Playfair Display', 'Inter', 'Archivo Narrow'], 'es');
ok(host && host.includes('family=Inter') && host.includes('family=Archivo+Narrow') && !host.includes('Playfair'), 'The Host Edition pide Inter y Archivo Narrow, no Playfair');
const ar = T.googleFontsHref(['Playfair Display', 'Montserrat', 'Montserrat'], 'ar');
ok(ar && ar.includes('Noto+Naskh+Arabic'), 'el árabe pide Noto Naskh Arabic');
ok(T.fontStack('headline', 'Playfair Display').startsWith('"Playfair Display Variable"'), 'la pila de Playfair empieza por la familia empaquetada');
ok(T.fontStack('body', 'Poppins').startsWith('"Poppins"'), 'una fuente pedida a Google va por su nombre');

// ---------------------------------------------------------------- guide.css
// Los valores de :root son los que se ven antes de que lleguen los datos: tienen que ser los que calcula el módulo.
console.log('— guide.css: valores por defecto de :root');
const css = fs.readFileSync(path.join(here, '..', 'src', 'styles', 'guide.css'), 'utf8');
const rootBlock = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const expected = { ...T.colorVars(T.deriveTheme({})), ...T.fontVars(null) };
for (const [name, value] of Object.entries(expected)) {
  const after = rootBlock.split('  ' + name + ':')[1];
  const found = after === undefined ? undefined : after.split(';')[0].trim();
  ok(found !== undefined, 'guide.css :root no define ' + name);
  if (found !== undefined) ok(found.toLowerCase() === value.toLowerCase(), name + ': guide.css dice «' + found.slice(0, 50) + '» pero el tema calcula «' + value.slice(0, 50) + '»');
}

console.log(failures === 0 ? '\n✔ tema y tipografía: todo comprobado' : `\n✘ ${failures} comprobaciones fallan`);
process.exit(failures === 0 ? 0 : 1);
