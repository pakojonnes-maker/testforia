// Carga un módulo worker*.js como ESM desde un test.
//
// El repo no puede declarar "type": "module" (hay scripts CJS sueltos en la
// raíz: check_config.js, generate_hash*.js, temp_hash.js), así que Node
// interpretaría los worker*.js como CommonJS y fallaría al leer sus exports.
// Wrangler sí los bundlea como ESM.
//
// Solución: copiar el módulo y sus dependencias locales a un directorio
// temporal con extensión .mjs, reescribiendo los especificadores relativos.
// Se copia desde el fuente en cada ejecución, así que nunca queda desfasado.

import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_IMPORT = /(['"])\.\/(worker[A-Za-z]+)\.js\1/g;

/**
 * @param {string} entry - nombre del módulo, p.ej. 'workerAuthentication.js'
 * @returns {Promise<{module: object, cleanup: () => void}>}
 */
export async function loadWorkerModule(entry) {
    const dir = mkdtempSync(join(tmpdir(), 'vt-test-'));
    const seen = new Set();

    const copy = (name) => {
        if (seen.has(name)) return;
        seen.add(name);
        const src = readFileSync(join(REPO_ROOT, name), 'utf8');
        const deps = [...src.matchAll(LOCAL_IMPORT)].map((m) => `${m[2]}.js`);
        writeFileSync(
            join(dir, name.replace(/\.js$/, '.mjs')),
            src.replace(LOCAL_IMPORT, (_, q, mod) => `${q}./${mod}.mjs${q}`)
        );
        deps.forEach(copy);
    };

    copy(entry);

    const url = pathToFileURL(join(dir, entry.replace(/\.js$/, '.mjs'))).href;
    const module = await import(url);
    return { module, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
