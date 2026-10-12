// Lanza las suites de test del repo y resume el resultado. Sin framework.
//
//   node tests/run.mjs             worker: tests/*.test.mjs (Node puro, corre sin node_modules)   → npm test
//   node tests/run.mjs frontend    tests/frontend/*.test.mjs + los check-*.mjs de las apps        → npm run test:frontend
//   node tests/run.mjs all         las dos cosas                                                  → npm run test:all
//
// Las suites se DESCUBREN por carpeta: un tests/loquesea.test.mjs nuevo entra solo. Antes `npm test` era
// una cadena de `&&` a la que había que acordarse de añadir cada suite.
//
// Lo usa .claude/hooks/pre-deploy-guard.mjs antes de cada despliegue: si esto sale con código 1, no se publica.
// Por eso van en paralelo (el hook tiene un tiempo límite) y por eso la salida de las que pasan se resume en
// una línea y solo se enseña entera la de las que fallan.

import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const inDir = (dir) => (existsSync(join(ROOT, dir)) ? readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => join(dir, f)) : []);

const GROUPS = {
    worker: () => inDir('tests'),
    // Necesitan esbuild: solo tienen sentido donde se ha instalado y compilado un frontend.
    frontend: () => [
        ...inDir(join('tests', 'frontend')),
        join('apps', 'guide', 'scripts', 'check-theme.mjs'),
        join('apps', 'guide', 'scripts', 'check-lib.mjs'),
        join('apps', 'client', 'scripts', 'check-worker.mjs'),
    ],
};
GROUPS.all = () => [...GROUPS.worker(), ...GROUPS.frontend()];

const group = process.argv[2] || 'worker';
if (!GROUPS[group]) {
    console.error(`Grupo desconocido «${group}». Vale: ${Object.keys(GROUPS).join(', ')}.`);
    process.exit(2);
}
const suites = GROUPS[group]();

function runSuite(file) {
    return new Promise((resolve) => {
        const started = Date.now();
        const child = spawn(process.execPath, [join(ROOT, file)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.on('data', (d) => { output += d; });
        child.stderr.on('data', (d) => { output += d; });
        child.on('error', (error) => resolve({ file, code: 1, output: String(error), ms: Date.now() - started }));
        child.on('close', (code) => resolve({ file, code: code ?? 1, output, ms: Date.now() - started }));
    });
}

// Cola con tantos procesos a la vez como núcleos: varias suites derivan PBKDF2 con 600.000 iteraciones.
const results = [];
const queue = [...suites];
const workers = Array.from({ length: Math.min(queue.length, Math.max(2, availableParallelism())) }, async () => {
    while (queue.length) results.push(await runSuite(queue.shift()));
});
const started = Date.now();
await Promise.all(workers);

const name = (file) => relative(ROOT, join(ROOT, file)).replace(/\\/g, '/');
/** «48 ok, 0 fail» de las suites del worker, o las marcas de los check-*.mjs de las apps. */
const summary = (output) => {
    const totals = output.match(/(\d+) ok, (\d+) fail/);
    if (totals) return `${totals[1]} ok${totals[2] !== '0' ? `, ${totals[2]} FALLAN` : ''}`;
    const marks = (output.match(/^\s*(✔|ok)\s/gm) || []).length;
    return marks ? `${marks} ok` : '';
};

results.sort((a, b) => suites.indexOf(a.file) - suites.indexOf(b.file));
const failed = results.filter((r) => r.code !== 0);

for (const r of failed) {
    console.log(`\n━━━ FALLA ${name(r.file)} ━━━`);
    // Lo que falla, y el final de la salida por si reventó antes de llegar a contar.
    const lines = r.output.trimEnd().split('\n');
    const bad = lines.filter((l) => /FAIL|✗|✘|Error/.test(l));
    console.log((bad.length ? bad : lines.slice(-25)).slice(0, 40).join('\n'));
}

console.log('');
for (const r of results) {
    console.log(`${r.code === 0 ? '  ok  ' : ' FAIL '} ${name(r.file).padEnd(46)} ${summary(r.output).padEnd(18)} ${(r.ms / 1000).toFixed(1)} s`);
}
console.log(
    failed.length
        ? `\n${failed.length} de ${results.length} suites FALLAN (${group}). Para ver una entera: node ${name(failed[0].file)}`
        : `\n${results.length} suites en verde (${group}) en ${((Date.now() - started) / 1000).toFixed(1)} s`
);
process.exit(failed.length ? 1 : 0);
