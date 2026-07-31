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
