// Test del guardarraíl de despliegue (.claude/hooks/pre-deploy-guard.mjs).
// Ejecutar:  node tests/pre-deploy-guard.test.mjs   (entra solo en `npm test`)
//
// Lo que tiene que seguir siendo verdad:
//
//   - El árbol que se mira es el del checkout DESDE EL QUE corre el comando. El arnés lanza el hook
//     desde el checkout principal aunque la sesión trabaje en un worktree de .claude/worktrees/:
//     hasta oct-2026 se miraba ahí, así que un worktree limpio quedaba bloqueado por el trabajo a
//     medias de otra sesión y uno sucio pasaba si el principal estaba limpio.
//   - `pages deploy <carpeta>` responde también del checkout de la carpeta que sube.
//   - Si el comando no deja saber dónde corre (`cd "$DIR"`), se bloquea: no se adivina.
//
// Monta un repo desechable con un worktree enlazado. Ningún caso corre en el repo de verdad: el hook
// lanzaría esta misma suite antes de «desplegar» y no acabaría nunca.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'hooks', 'pre-deploy-guard.mjs');

let pass = 0;
let fail = 0;
function ok(name, cond) {
    if (cond) { pass += 1; console.log(`  ok   ${name}`); }
    else { fail += 1; console.log(`  FAIL ${name}`); }
}

const git = (cwd, ...args) =>
    execFileSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.com', ...args], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });

// realpath nativo: en Windows la carpeta temporal puede venir con el nombre corto (FRANCI~1).
const base = realpathSync.native(mkdtempSync(join(tmpdir(), 'vt-guard-')));
const MAIN = join(base, 'principal');
const WT = join(MAIN, '.claude', 'worktrees', 'sesion');

mkdirSync(MAIN);
git(MAIN, 'init', '-q', '-b', 'main');
writeFileSync(join(MAIN, '.gitignore'), '.claude/worktrees/\n');
writeFileSync(join(MAIN, 'worker.js'), '// worker\n');
git(MAIN, 'add', '.');
git(MAIN, 'commit', '-q', '-m', 'init');
git(MAIN, 'worktree', 'add', '-q', '-b', 'sesion', WT);

const sh = (p) => p.replace(/\\/g, '/');
const LEFT_MAIN = 'a-medias-principal.txt';
const LEFT_WT = 'a-medias-sesion.txt';
/** Deja cada checkout sucio (un fichero sin commitear) o limpio. */
const state = ({ main, wt }) => {
    for (const [dir, file, dirty] of [[MAIN, LEFT_MAIN, main], [WT, LEFT_WT, wt]]) {
        if (dirty) writeFileSync(join(dir, file), 'x');
        else rmSync(join(dir, file), { force: true });
    }
};

/** Lanza el hook como el arnés: el proceso en `hookCwd` y el cwd de la sesión dentro del payload. */
const guard = (command, { hookCwd = MAIN, sessionCwd = WT } = {}) => {
    const payload = { tool_name: 'Bash', tool_input: { command } };
    if (sessionCwd) payload.cwd = sessionCwd;
    const res = spawnSync(process.execPath, [HOOK], { cwd: hookCwd, input: JSON.stringify(payload), encoding: 'utf8' });
    const out = (res.stdout || '').trim();
    if (!out) return { decision: 'pass', reason: '' };
    const h = JSON.parse(out).hookSpecificOutput;
    return { decision: h.permissionDecision, reason: h.permissionDecisionReason };
};

const PAGES = 'npx wrangler pages deploy dist --project-name=guia --branch main';
const D1 = 'npx wrangler d1 execute db --remote --command="SELECT 1"';
const inWt = (cmd) => `cd "${sh(WT)}" && ${cmd}`;

try {
    // ── El caso real: sesión en un worktree, el hook lanzado desde el principal ──────────────────
    state({ main: true, wt: false });
    ok('worktree limpio + principal sucio: el deploy pasa', guard(inWt(PAGES)).decision === 'pass');
    ok('worktree limpio + principal sucio: la escritura remota solo pide confirmación', guard(inWt(D1)).decision === 'ask');

    state({ main: false, wt: true });
    let r = guard(inWt(PAGES));
    ok('worktree sucio + principal limpio: el deploy se bloquea', r.decision === 'deny' && r.reason.includes(LEFT_WT));
    ok('worktree sucio + principal limpio: la escritura remota se bloquea', guard(inWt(D1)).decision === 'deny');

    state({ main: false, wt: false });
    ok('los dos limpios: el deploy pasa', guard(inWt(PAGES)).decision === 'pass');
    ok('los dos limpios: la escritura remota pide confirmación', guard(inWt(D1)).decision === 'ask');

    state({ main: true, wt: true });
    r = guard(inWt(PAGES));
    ok('los dos sucios: bloquea por lo del worktree, no por lo del principal',
        r.decision === 'deny' && r.reason.includes(LEFT_WT) && !r.reason.includes(LEFT_MAIN));
    ok('los dos sucios: la escritura remota se bloquea', guard(inWt(D1)).decision === 'deny');
    ok('el mensaje dice qué checkout es', sh(r.reason).toLowerCase().includes(sh(WT).toLowerCase()));

    // ── Sin `cd`: manda el cwd de la sesión (payload.cwd), no el del proceso del hook ────────────
    state({ main: true, wt: false });
    ok('sin cd, sesión en el worktree limpio: pasa aunque el principal esté sucio', guard(PAGES).decision === 'pass');
    state({ main: false, wt: true });
    ok('sin cd, sesión en el worktree sucio: se bloquea aunque el principal esté limpio', guard(PAGES).decision === 'deny');
    state({ main: true, wt: false });
    ok('sin cd y sin cwd en el payload: se mira donde corre el hook, como antes',
        guard(PAGES, { sessionCwd: null }).decision === 'deny');

    // ── El comando se va a otro checkout ─────────────────────────────────────────────────────────
    state({ main: true, wt: false });
    r = guard(`cd "${sh(MAIN)}" && npx wrangler deploy`);
    ok('cd al principal sucio desde un worktree limpio: se bloquea', r.decision === 'deny' && r.reason.includes(LEFT_MAIN));
    ok('pages deploy de una carpeta del principal sucio: se bloquea',
        guard(inWt(`npx wrangler pages deploy "${sh(MAIN)}/dist" --project-name=guia`)).decision === 'deny');
    state({ main: false, wt: true });
    ok('cd relativo al worktree sucio: se bloquea',
        guard('cd .claude/worktrees/sesion && npx wrangler deploy', { sessionCwd: MAIN }).decision === 'deny');
    ok('wrangler --cwd al worktree sucio: se bloquea',
        guard(`npx wrangler deploy --cwd "${sh(WT)}"`, { sessionCwd: MAIN }).decision === 'deny');
    ok('subshell con cd al worktree sucio: se bloquea',
        guard(`(cd "${sh(WT)}" && npx wrangler deploy)`, { sessionCwd: MAIN }).decision === 'deny');
    ok('variable de entorno delante: se sigue bloqueando',
        guard(inWt('CLOUDFLARE_ACCOUNT_ID=x npx wrangler deploy')).decision === 'deny');
    if (process.platform === 'win32') {
        const gitBash = sh(WT).replace(/^([A-Za-z]):\//, (_, d) => `/${d.toLowerCase()}/`);
        ok('ruta al estilo de Git Bash (/c/…) al worktree sucio: se bloquea',
            guard(`cd "${gitBash}" && npx wrangler deploy`, { sessionCwd: MAIN }).decision === 'deny');
        ok('ruta que solo existe en Git Bash (/tmp/…): se bloquea, no se adivina',
            guard('cd /tmp/otro-checkout && npx wrangler deploy', { sessionCwd: MAIN }).decision === 'deny');
    }

    // ── No se puede saber dónde corre ────────────────────────────────────────────────────────────
    state({ main: false, wt: false });
    r = guard('cd "$DIR" && npx wrangler deploy');
    ok('cd con una variable: se bloquea aunque todo esté limpio', r.decision === 'deny' && /desde qué carpeta/.test(r.reason));
    ok('cd con una variable y después un cd absoluto: ya se sabe, pasa',
        guard(`cd "$DIR" && cd "${sh(WT)}" && npx wrangler deploy`).decision === 'pass');
    ok('un cd raro DESPUÉS del deploy no cuenta', guard(`${inWt('npx wrangler deploy')} && cd "$DIR"`).decision === 'pass');
    // El override asume un árbol sucio, no saltarse los tests: sin saber dónde lanzarlos, un deploy no pasa.
    ok('cd con una variable + override: un deploy se sigue bloqueando',
        guard('cd "$DIR" && VT_ALLOW_DIRTY_DEPLOY=1 npx wrangler deploy').decision === 'deny');
    ok('cd con una variable + override: una escritura remota pasa',
        guard(`cd "$DIR" && VT_ALLOW_DIRTY_DEPLOY=1 ${D1}`).decision === 'pass');

    // ── Lo que no cambia ─────────────────────────────────────────────────────────────────────────
    state({ main: true, wt: true });
    ok('el override salta el árbol y la confirmación', guard(inWt(`VT_ALLOW_DIRTY_DEPLOY=1 ${D1}`)).decision === 'pass');
    ok('un comando que no es de wrangler no se toca', guard(inWt('npm run build')).decision === 'pass');
    ok('un d1 execute local no se toca', guard(inWt('npx wrangler d1 execute db --command="SELECT 1"')).decision === 'pass');
    ok('la TV suelta se bloquea por su propia guarda',
        guard(inWt('VT_ALLOW_DIRTY_DEPLOY=1 npx wrangler pages deploy apps/tv/dist --project-name=visualtaste-tv')).decision === 'deny');
} finally {
    rmSync(base, { recursive: true, force: true, maxRetries: 3 });
}

console.log(`\n${pass} ok, ${fail} fail\n`);
process.exit(fail > 0 ? 1 : 0);
