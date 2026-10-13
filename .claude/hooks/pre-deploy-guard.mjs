#!/usr/bin/env node
/**
 * Guardarraíl de despliegue — CLAUDE.md §7.
 *
 * `wrangler deploy` bundlea lo que hay EN DISCO, no lo commiteado. Con varias
 * sesiones de Claude Code sobre esta misma carpeta, desplegar con el working
 * tree sucio publica trabajo a medias de otra sesión (pasó el 2026-07-25).
 *
 * Este hook PreToolUse (matcher: Bash) intercepta:
 *   - wrangler deploy / wrangler pages deploy
 *   - wrangler d1 execute --remote  (escribe en la D1 de producción)
 *   - wrangler kv key put|delete --remote
 *
 * y devuelve:
 *   - "deny" si el working tree del checkout desde el que corre el comando está sucio, con la
 *     lista de ficheros, o si no se puede saber cuál es (bloque ÁRBOL, más abajo).
 *   - "deny" si es un despliegue y los tests no pasan (bloque TESTS, más abajo).
 *   - "ask"  si está limpio pero la operación escribe en producción (D1/KV).
 *   - nada (flujo normal de permisos) en cualquier otro caso.
 *
 * Escotilla de escape explícita: prefijar el comando con
 * `VT_ALLOW_DIRTY_DEPLOY=1` desactiva el bloqueo para ESE comando.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const OVERRIDE = 'VT_ALLOW_DIRTY_DEPLOY=1';

// Un comando puede venir encadenado: `cd x && npx wrangler deploy`. El paréntesis o la llave con que
// abre un grupo (`(cd x && npx wrangler deploy)`) no forma parte del comando: con él delante, el
// segmento se quedaba sin clasificar.
const splitSegments = (cmd) =>
  cmd
    .split(/&&|\|\||;|\n|(?<!\|)\|(?!\|)/)
    .map((s) => s.trim().replace(/^[({]\s*/, ''))
    .filter(Boolean);

const stripRunner = (seg) =>
  seg.replace(/^(npx\s+(--yes\s+|-y\s+)?|pnpm\s+dlx\s+|bunx\s+|yarn\s+)/, '').trim();

// `VAR=x VAR2=y npx wrangler …`: las asignaciones de entorno iniciales no cambian qué comando es.
// Sin quitarlas, CUALQUIER variable delante (no solo el override) dejaba el comando sin clasificar
// y el hook no miraba nada.
const stripEnv = (seg) => seg.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, '');

const classify = (seg) => {
  const s = stripRunner(stripEnv(seg));
  if (!/^wrangler\b/.test(s)) return null;
  if (/^wrangler\s+(deploy|pages\s+deploy)\b/.test(s)) return 'deploy';
  if (/^wrangler\s+d1\s+execute\b/.test(s) && /--remote\b/.test(s)) return 'remote-write';
  if (/^wrangler\s+kv\b/.test(s) && /--remote\b/.test(s) && /\b(put|delete)\b/.test(s))
    return 'remote-write';
  return null;
};

// ---------------------------------------------------------------------------
// tv.visualtastes.com = landing + app de la TV en UN solo despliegue (proyecto visualtaste-tv).
// `pages deploy` sustituye el sitio ENTERO: subir apps/tv/dist (o apps/tv-landing/dist) suelto a
// ese proyecto borra la otra mitad. Hay que combinarlas con scripts/build-tv-site.mjs y subir
// dist-tv-site. Esta guarda NO se salta con VT_ALLOW_DIRTY_DEPLOY (es otro problema);
// VT_ALLOW_TV_ALONE=1 sí.
// ---------------------------------------------------------------------------
const TV_SITE_PROJECT = 'visualtaste-tv';
const TV_ALONE_OVERRIDE = 'VT_ALLOW_TV_ALONE=1';

const normPath = (p) =>
  p.replace(/^["']|["']$/g, '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');

/** Carpeta, si el comando sube SOLO la TV o SOLO la landing a visualtaste-tv; si no, null. */
const soloTvDeploy = (command) => {
  let cwd = '';
  for (const raw of splitSegments(command)) {
    const cd = raw.match(/^cd\s+(\S+)/);
    if (cd) {
      cwd = normPath(cd[1]);
      continue;
    }
    // `VAR=x VAR2=y npx wrangler …`: se ignoran las asignaciones de entorno iniciales.
    const s = stripRunner(raw.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, ''));
    const m = s.match(/^wrangler\s+pages\s+deploy\s+("[^"]+"|'[^']+'|\S+)/);
    if (!m) continue;
    const project = (s.match(/--project-name[=\s]+["']?([^\s"']+)/) || [])[1];
    if (project !== TV_SITE_PROJECT) continue;
    const dir = normPath(m[1]);
    const full = normPath(cwd ? `${cwd}/${dir}` : dir);
    if (/(^|\/)apps\/tv(-landing)?\/dist$/.test(full)) return full;
  }
  return null;
};

// ---------------------------------------------------------------------------
// ÁRBOL: de qué checkout responde el comando. El arnés lanza este hook desde ${CLAUDE_PROJECT_DIR}
// —el checkout principal— aunque la sesión trabaje en un worktree de .claude/worktrees/, así que
// process.cwd() NO es donde corre el comando. Mirar ahí bloqueaba un worktree limpio por el trabajo a
// medias de otra sesión en el principal y, peor, dejaba pasar un worktree sucio si el principal estaba
// limpio (visto el 2026-10-12; los dos casos están en tests/pre-deploy-guard.test.mjs).
// Se parte del cwd de la sesión (payload.cwd) y se siguen los `cd` y el `--cwd` del comando. Un
// `pages deploy <carpeta>` responde además del checkout de esa carpeta. Y si no se puede saber dónde
// corre (`cd "$DIR"`, `cd -`, `popd`), se bloquea: no se adivina.
// ---------------------------------------------------------------------------
const PATH_ARG = `("[^"]+"|'[^']+'|\\S+)`;

// Git Bash escribe C:\x como /c/x; Node no lo entiende.
const fromShellPath = (p) => p.replace(/^["']|["']$/g, '').replace(/^\/([a-zA-Z])\//, '$1:/');

// Una ruta con variables, sustituciones o comodines solo la sabe resolver el shell. Tampoco se
// puede seguir, en Windows, una ruta propia de Git Bash (/tmp/…, /home/…): Node la pondría en C:\.
const isLiteralPath = (p) =>
  !/[$`*?]/.test(p) && !/^[~-]/.test(p) && !(process.platform === 'win32' && /^\/(?!\/)/.test(p));

/** A dónde lleva `arg` desde `from`; null si no se puede saber (`from` null = ya no se sabía). */
const goTo = (from, arg) => {
  const dir = fromShellPath(arg);
  if (!isLiteralPath(dir)) return null;
  if (isAbsolute(dir)) return dir;
  return from === null ? null : resolve(from, dir);
};

/**
 * Lee el comando: qué grupos de tests pide, desde qué carpeta despliega (ahí se lanzan) y de qué
 * carpetas hay que encontrar limpio el checkout. `lost` si algún comando vigilado corre en una
 * carpeta que no se puede saber.
 */
const readCommand = (command, startCwd) => {
  const groups = new Set();
  const dirs = new Set();
  let cwd = startCwd; // null = en este punto del comando ya no se sabe
  let deployCwd = startCwd;
  let lost = false;
  for (const seg of splitSegments(command)) {
    if (/^(cd|pushd|popd)\b/.test(seg)) {
      const arg = seg.match(new RegExp(`^(?:cd|pushd)\\s+${PATH_ARG}`));
      cwd = arg ? goTo(cwd, arg[1]) : null;
      continue;
    }
    const kind = classify(seg);
    if (!kind) continue;
    const s = stripRunner(stripEnv(seg));
    // `wrangler --cwd <dir>` corre como si se hubiera lanzado desde ahí.
    const flag = s.match(new RegExp(`\\s--cwd[=\\s]+${PATH_ARG}`));
    const here = flag ? goTo(cwd, flag[1]) : cwd;
    // `pages deploy <carpeta>` sube ESA carpeta, sea del checkout que sea.
    const pages = /^wrangler\s+pages\s+deploy\b/.test(s);
    const upload = pages ? s.match(new RegExp(`^wrangler\\s+pages\\s+deploy\\s+(?!-)${PATH_ARG}`)) : null;
    const uploadDir = upload ? goTo(here, upload[1]) : here;
    if (here === null || uploadDir === null) {
      lost = true;
      continue;
    }
    dirs.add(here);
    dirs.add(uploadDir);
    if (kind !== 'deploy' || /--dry-run\b/.test(s)) continue;
    groups.add(pages ? 'frontend' : 'worker');
    deployCwd = here;
  }
  return { groups: [...groups], cwd: deployCwd, dirs: [...dirs], lost };
};

/** El checkout que contiene `dir` y lo que tiene sin commitear; null si ahí no hay git. */
const checkoutOf = (dir) => {
  // La carpeta puede no existir todavía (un dist sin compilar): vale la primera que exista hacia arriba.
  let at = dir;
  while (!existsSync(at)) {
    const up = dirname(at);
    if (up === at) return null;
    at = up;
  }
  try {
    if (!statSync(at).isDirectory()) at = dirname(at);
    const git = (args) =>
      execFileSync('git', args, { encoding: 'utf8', cwd: at, stdio: ['ignore', 'pipe', 'ignore'] });
    return {
      root: git(['rev-parse', '--show-toplevel']).trim(),
      dirty: git(['status', '--porcelain']).split('\n').map((l) => l.trimEnd()).filter(Boolean),
    };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// TESTS antes de desplegar. Los tests existían desde julio, pero dependían de que alguien se
// acordara de lanzarlos: aquí se lanzan solos y un fallo bloquea la publicación.
//   - `wrangler deploy`        → grupo «worker»   (tests/*.test.mjs, Node puro: corre hasta en un
//                                                  worktree sin node_modules)
//   - `wrangler pages deploy`  → grupo «frontend» (paridad entre copias + los check-*.mjs de las apps;
//                                                  necesita esbuild, que está donde se ha compilado)
// Se ejecutan en el checkout DESDE EL QUE se despliega: si el comando empieza por `cd <worktree>`,
// allí. Un `--dry-run` no publica nada y no los lanza. tests/run.mjs tarda unos 7 s.
// ---------------------------------------------------------------------------
const TESTS_TIMEOUT_MS = 120_000; // por debajo del `timeout` del hook en .claude/settings.json

/** Lanza tests/run.mjs. Devuelve null si pasa (o si ese checkout no lo tiene) y el motivo si no. */
const runTests = (group, cwd) => {
  let root;
  try {
    root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null; // sin git no sabemos dónde están
  }
  const runner = join(root, 'tests', 'run.mjs');
  if (!existsSync(runner)) return null; // un worktree de un commit anterior a los tests
  const res = spawnSync(process.execPath, [runner, group], {
    cwd: root,
    encoding: 'utf8',
    timeout: TESTS_TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (res.status === 0) return null;
  if (res.error?.code === 'ETIMEDOUT') return `Los tests no han terminado en ${TESTS_TIMEOUT_MS / 1000} s.`;
  const out = `${res.stdout || ''}${res.stderr || ''}`.trim() || String(res.error || 'sin salida');
  return out.length > 3500 ? `${out.slice(0, 3500)}\n…` : out;
};

const emit = (permissionDecision, permissionDecisionReason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        permissionDecisionReason,
      },
    })
  );
  process.exit(0);
};

const readStdin = async () => {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const main = async () => {
  let payload;
  try {
    payload = JSON.parse(await readStdin());
  } catch {
    process.exit(0); // sin payload legible no bloqueamos nada
  }

  if (payload?.tool_name !== 'Bash') process.exit(0);
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string' || !command.trim()) process.exit(0);

  if (!command.includes(TV_ALONE_OVERRIDE)) {
    let solo = null;
    try {
      solo = soloTvDeploy(command);
    } catch {
      solo = null; // esta guarda nunca debe romper un comando por un fallo propio
    }
    if (solo) {
      emit(
        'deny',
        [
          `BLOQUEADO por .claude/hooks/pre-deploy-guard.mjs: despliegue suelto en ${TV_SITE_PROJECT}.`,
          ``,
          `El proyecto ${TV_SITE_PROJECT} sirve la landing Y la app de la TV desde UN solo despliegue`,
          `(tv.visualtastes.com). Subir ${solo} solo sustituye el sitio entero y borra la otra mitad.`,
          ``,
          `Qué hacer: combínalas y sube el resultado.`,
          `  node scripts/build-tv-site.mjs      (usa apps/tv/dist y apps/tv-landing/dist; --shell <carpeta> para otra copia de la TV)`,
          `  npx wrangler pages deploy dist-tv-site --project-name=${TV_SITE_PROJECT} --branch main`,
          `Solo si de verdad quieres subir una sola (p. ej. restaurar producción tal como estaba): prefija el comando con ${TV_ALONE_OVERRIDE}`,
        ].join('\n')
      );
    }
  }

  const kinds = splitSegments(command).map(classify).filter(Boolean);
  if (kinds.length === 0) process.exit(0);

  // Override explícito del usuario: no se mira el árbol, pero los tests se lanzan igual.
  const overridden = command.includes(OVERRIDE);

  // Dónde corre el comando: se parte del cwd de la sesión, no del de este proceso (bloque ÁRBOL).
  const startCwd = typeof payload?.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
  let plan;
  try {
    plan = readCommand(command, startCwd);
  } catch {
    // Un fallo al leer el comando no debe impedir desplegar, pero tampoco dejar de mirar: los dos sitios.
    plan = { groups: [], cwd: startCwd, dirs: [startCwd, process.cwd()], lost: false };
  }

  // Sin saber dónde corre no hay árbol que mirar ni sitio donde lanzar los tests. El override asume
  // un árbol sucio, no saltarse los tests: solo vale aquí para lo que no es un despliegue.
  if (plan.lost && (!overridden || kinds.includes('deploy'))) {
    emit(
      'deny',
      [
        `BLOQUEADO por .claude/hooks/pre-deploy-guard.mjs (CLAUDE.md §7).`,
        ``,
        `No se puede saber desde qué carpeta corre este comando (un \`cd\` con variables, \`cd -\`,`,
        `\`popd\`…), así que tampoco si su working tree está limpio ni dónde lanzar los tests.`,
        ``,
        `Qué hacer: escribe la ruta tal cual, p. ej.  cd "C:/ruta/al/checkout" && npx wrangler …`,
      ].join('\n')
    );
  }

  // Dos carpetas del mismo checkout se miran una vez.
  const checkouts = new Map();
  for (const dir of plan.dirs) {
    const found = checkoutOf(dir);
    if (found) checkouts.set(found.root.toLowerCase(), found);
  }
  if (checkouts.size === 0 && !plan.lost) process.exit(0); // sin git no hay nada que comprobar

  const dirty = overridden ? [] : [...checkouts.values()].filter((c) => c.dirty.length > 0);

  if (dirty.length > 0) {
    const lists = dirty.map((c) => {
      const more = c.dirty.length > 25 ? `\n…y ${c.dirty.length - 25} más` : '';
      return `${c.root} — ${c.dirty.length} cambio(s) sin commitear:\n${c.dirty.slice(0, 25).join('\n')}${more}`;
    });
    emit(
      'deny',
      [
        `BLOQUEADO por .claude/hooks/pre-deploy-guard.mjs (CLAUDE.md §7).`,
        ``,
        `El checkout desde el que corre este comando tiene cambios sin commitear, y el comando`,
        `publica el estado del DISCO, no el de git. Si parte de esos cambios son de`,
        `otra sesión de Claude Code sobre esta misma carpeta, se irían a producción`,
        `a medias.`,
        ``,
        lists.join('\n\n'),
        ``,
        `Qué hacer: revisa la lista. Commitea lo que SÍ va a producción (y las`,
        `migraciones D1 que necesite, en el mismo lote). Si hay cambios que no`,
        `puedes atribuir a esta tarea, pregunta al usuario antes de seguir.`,
        `Override deliberado: prefija el comando con ${OVERRIDE}`,
      ].join('\n')
    );
  }

  // El árbol ya está limpio (o el usuario ha asumido que no lo esté): ahora, los tests.
  if (kinds.includes('deploy')) {
    for (const group of plan.groups) {
      const failure = runTests(group, plan.cwd);
      if (failure) {
        emit(
          'deny',
          [
            `BLOQUEADO por .claude/hooks/pre-deploy-guard.mjs: los tests (${group}) no pasan.`,
            ``,
            failure,
            ``,
            `Qué hacer: arregla lo que falla y vuelve a desplegar. Para repetirlos: npm ${
              group === 'worker' ? 'test' : 'run test:frontend'
            }`,
            `No hay variable para saltárselos: si el fallo es del propio test, se arregla el test.`,
          ].join('\n')
        );
      }
    }
  }

  if (!overridden && kinds.includes('remote-write')) {
    emit(
      'ask',
      `Escribe directamente en la D1/KV de PRODUCCIÓN (--remote). El working tree (${[...checkouts.values()]
        .map((c) => c.root)
        .join(', ')}) está limpio; confirma que la migración es la correcta y que está commiteada.`
    );
  }

  // Tree limpio + deploy: seguimos con el flujo normal de permisos.
  process.exit(0);
};

main();
