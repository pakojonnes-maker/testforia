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
 *   - "deny" si el working tree está sucio, con la lista de ficheros.
 *   - "ask"  si está limpio pero la operación escribe en producción (D1/KV).
 *   - nada (flujo normal de permisos) en cualquier otro caso.
 *
 * Escotilla de escape explícita: prefijar el comando con
 * `VT_ALLOW_DIRTY_DEPLOY=1` desactiva el bloqueo para ESE comando.
 */

import { execFileSync } from 'node:child_process';

const OVERRIDE = 'VT_ALLOW_DIRTY_DEPLOY=1';

// Un comando puede venir encadenado: `cd x && npx wrangler deploy`.
const splitSegments = (cmd) =>
  cmd
    .split(/&&|\|\||;|\n|(?<!\|)\|(?!\|)/)
    .map((s) => s.trim())
    .filter(Boolean);

const stripRunner = (seg) =>
  seg.replace(/^(npx\s+(--yes\s+|-y\s+)?|pnpm\s+dlx\s+|bunx\s+|yarn\s+)/, '').trim();

const classify = (seg) => {
  const s = stripRunner(seg);
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

  if (command.includes(OVERRIDE)) process.exit(0); // override explícito del usuario

  const kinds = splitSegments(command).map(classify).filter(Boolean);
  if (kinds.length === 0) process.exit(0);

  let status;
  try {
    status = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    process.exit(0); // sin git no hay nada que comprobar
  }

  const dirty = status.split('\n').map((l) => l.trimEnd()).filter(Boolean);

  if (dirty.length > 0) {
    const shown = dirty.slice(0, 25).join('\n');
    const more = dirty.length > 25 ? `\n…y ${dirty.length - 25} más` : '';
    emit(
      'deny',
      [
        `BLOQUEADO por .claude/hooks/pre-deploy-guard.mjs (CLAUDE.md §7).`,
        ``,
        `El working tree tiene ${dirty.length} cambio(s) sin commitear y este comando`,
        `publica el estado del DISCO, no el de git. Si parte de esos cambios son de`,
        `otra sesión de Claude Code sobre esta misma carpeta, se irían a producción`,
        `a medias.`,
        ``,
        shown + more,
        ``,
        `Qué hacer: revisa la lista. Commitea lo que SÍ va a producción (y las`,
        `migraciones D1 que necesite, en el mismo lote). Si hay cambios que no`,
        `puedes atribuir a esta tarea, pregunta al usuario antes de seguir.`,
        `Override deliberado: prefija el comando con ${OVERRIDE}`,
      ].join('\n')
    );
  }

  if (kinds.includes('remote-write')) {
    emit(
      'ask',
      'Escribe directamente en la D1/KV de PRODUCCIÓN (--remote). El working tree está limpio; confirma que la migración es la correcta y que está commiteada.'
    );
  }

  // Tree limpio + deploy: seguimos con el flujo normal de permisos.
  process.exit(0);
};

main();
