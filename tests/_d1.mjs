// Un D1 de verdad para los tests: el mismo motor (workerd + SQLite) que corre en producción, en memoria.
//
// Los dobles de D1 que usan las demás suites contestan lo que el test les dice: un SELECT a una columna
// que no existe «funciona». Aquí el SQL lo ejecuta SQLite, con el esquema de BDschemaFinal.sql.
//
// No añade dependencias: usa el Miniflare que trae wrangler, que ya hace falta para desplegar. Se busca
// primero en el repo y luego en la instalación global, así que funciona también en un worktree recién
// creado, sin node_modules. Si no está en ningún sitio, openD1() devuelve null y la suite lo dice.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = process.env.VT_TEST_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');

/** Carpetas desde las que se puede resolver un paquete: el repo y los node_modules globales de npm. */
function requireRoots() {
    const roots = [join(ROOT, 'package.json')];
    const globals = [];
    if (process.env.APPDATA) globals.push(join(process.env.APPDATA, 'npm', 'node_modules'));
    try {
        globals.push(execFileSync('npm', ['root', '-g'], { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim());
    } catch { /* sin npm en el PATH: nos quedamos con lo que haya */ }
    for (const g of globals) if (g && existsSync(g)) roots.push(join(g, 'package.json'));
    return roots;
}

/** Un `require` anclado en el paquete que contiene Miniflare (el propio repo, o wrangler), o null. */
function miniflareRequire() {
    for (const root of requireRoots()) {
        const req = createRequire(root);
        for (const via of [null, 'wrangler/package.json']) {
            try {
                const from = via ? createRequire(req.resolve(via)) : req;
                from.resolve('miniflare');
                return from;
            } catch { /* siguiente */ }
        }
    }
    return null;
}

/**
 * Arranca un D1 vacío en memoria.
 * @returns {Promise<{db: D1Database, version: string, dispose: () => Promise<void>} | null>}
 */
export async function openD1() {
    const req = miniflareRequire();
    if (!req) return null;
    const { Miniflare } = await import(pathToFileURL(req.resolve('miniflare')).href);
    const mf = new Miniflare({
        modules: true,
        script: 'export default { fetch() { return new Response(null, { status: 204 }); } }',
        d1Databases: { DB: 'vt-test' },
    });
    const db = await mf.getD1Database('DB');
    return { db, version: req('miniflare/package.json').version, dispose: () => mf.dispose() };
}

/** Parte un volcado en sentencias. El esquema no tiene triggers, así que «;» al final de línea basta. */
export function splitSql(text) {
    return text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .filter((line) => !/^\s*--/.test(line))
        .join('\n')
        .split(/;\s*\n/)
        .map((s) => s.trim().replace(/;$/, ''))
        .filter((s) => s && !/^PRAGMA\b/i.test(s));
}

/** Carga BDschemaFinal.sql (el esquema exportado de producción). Devuelve cuántas tablas ha creado. */
export async function loadSchema(db, file = join(ROOT, 'BDschemaFinal.sql')) {
    const statements = splitSql(readFileSync(file, 'utf8'));
    await db.batch(statements.map((s) => db.prepare(s)));
    const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all();
    return results.length;
}

/** El SQL sin cadenas ni comentarios: para contar parámetros sin que un «?» dentro de un texto engañe. */
function stripLiterals(sql) {
    return sql
        .replace(/--[^\n]*/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/'(?:[^']|'')*'/g, "''")
        .replace(/"(?:[^"]|"")*"/g, '""');
}

/** Cuántos valores hay que pasar a .bind(): el mayor ?N si van numerados, o el número de «?» sueltos. */
export function countParams(sql) {
    const bare = stripLiterals(sql);
    const numbered = [...bare.matchAll(/\?(\d+)/g)].map((m) => Number(m[1]));
    const anonymous = (bare.match(/\?(?!\d)/g) || []).length;
    return Math.max(anonymous + (numbered.length ? Math.max(...numbered) : 0), 0);
}

/**
 * Compila una sentencia contra el esquema SIN ejecutarla (EXPLAIN): valida sintaxis, tablas y columnas.
 * @returns {Promise<string|null>} el error de SQLite, o null si compila
 */
export async function compileError(db, sql) {
    try {
        await db.prepare(`EXPLAIN ${sql}`).bind(...Array(countParams(sql)).fill(null)).all();
        return null;
    } catch (error) {
        return String(error.message).replace(/^D1_ERROR:\s*/, '').replace(/:\s*SQLITE_ERROR$/, '');
    }
}

/**
 * ¿Es un error del SQL (lo que busca esta suite) y no de los datos? Una restricción NOT NULL o UNIQUE
 * que salta con datos de prueba no dice nada del código; una columna que no existe, sí.
 */
export const isSqlError = (message) =>
    /no such (table|column|function|index)|has no column named|syntax error|near "|ambiguous column|compound SELECT|incomplete input|misuse of|values for \d+ columns|wrong number of arguments|Wrong number of parameter bindings|unrecognized token|datatype mismatch/i.test(message);

/**
 * Inserta una fila rellenando lo que el esquema exige y el test no ha dicho: así las semillas de los tests
 * no se rompen cada vez que una migración añade una columna NOT NULL.
 */
export async function seed(db, table, row) {
    const { results: columns } = await db.prepare(`PRAGMA table_info("${table}")`).all();
    const values = { ...row };
    for (const col of columns) {
        if (col.name in values || !col.notnull || col.dflt_value !== null || col.pk) continue;
        values[col.name] = /INT|REAL|NUM|BOOL|FLOAT|DOUBLE/i.test(col.type) ? 0 : `test-${col.name}`;
    }
    const names = Object.keys(values);
    await db.prepare(`INSERT INTO "${table}" (${names.map((n) => `"${n}"`).join(', ')}) VALUES (${names.map(() => '?').join(', ')})`)
        .bind(...names.map((n) => values[n])).run();
}
