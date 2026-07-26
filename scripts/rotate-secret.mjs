#!/usr/bin/env node
// ===========================================================================
// Rotación de secretos del worker
// ===========================================================================
//   node scripts/rotate-secret.mjs jwt      → nuevo JWT_SECRET
//   node scripts/rotate-secret.mjs vapid    → nuevo par VAPID
//   node scripts/rotate-secret.mjs jwt --dry-run   → genera y muestra, sin subir
//
// Qué hace:
//   1. Genera el secreto con CSPRNG.
//   2. Lo guarda en la bóveda local (fuera del repo, ver VAULT_DIR).
//   3. Lo sube a Cloudflare con `wrangler secret put`.
//   4. Lo imprime UNA vez para que lo copies a tu gestor de contraseñas.
//
// El gestor de contraseñas es la fuente de verdad. La bóveda local es una copia
// de conveniencia en texto plano: sirve para no quedarte tirado, no para
// custodiar. Si pierdes ambos, no pasa nada grave: se vuelve a rotar.
// ===========================================================================

import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const VAULT_DIR = join(homedir(), '.visualtaste');
const VAULT_FILE = join(VAULT_DIR, 'secrets.env');
const LOG_FILE = join(VAULT_DIR, 'rotation.log');

const WORKER = 'visualtasteworker';

const [target, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');

if (!['jwt', 'vapid'].includes(target)) {
    console.error('Uso: node scripts/rotate-secret.mjs <jwt|vapid> [--dry-run]');
    process.exit(1);
}

// Diagnóstico: si esto se cuelga otra vez, estas líneas dicen desde qué
// sistema y carpeta se ha lanzado, que es lo primero que hay que saber para
// depurarlo — un cuelgue en Windows vs. WSL vs. una terminal distinta a la
// esperada tiene causas distintas.
console.log(`  Sistema: ${process.platform} · Node ${process.version} · carpeta: ${process.cwd()}`);

// --- Generación ------------------------------------------------------------

/** 512 bits de entropía, holgado para HMAC-SHA256. */
function generateJwtSecret() {
    return { JWT_SECRET: randomBytes(64).toString('base64url') };
}

/**
 * Par de claves VAPID (ECDSA P-256), en el formato que espera el Web Push API:
 * la pública como punto sin comprimir (0x04 || x || y) en base64url.
 */
function generateVapidKeys() {
    const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const pub = publicKey.export({ format: 'jwk' });
    const priv = privateKey.export({ format: 'jwk' });

    const x = Buffer.from(pub.x, 'base64url');
    const y = Buffer.from(pub.y, 'base64url');
    const uncompressed = Buffer.concat([Buffer.from([0x04]), x, y]);

    return {
        VAPID_PUBLIC_KEY: uncompressed.toString('base64url'),
        VAPID_PRIVATE_KEY: priv.d,
    };
}

const secrets = target === 'jwt' ? generateJwtSecret() : generateVapidKeys();

// --- Bóveda local ----------------------------------------------------------

function saveToVault(entries) {
    mkdirSync(VAULT_DIR, { recursive: true });

    let lines = existsSync(VAULT_FILE)
        ? readFileSync(VAULT_FILE, 'utf8').split(/\r?\n/).filter(Boolean)
        : ['# Secretos de VisualTaste (worker visualtasteworker).',
           '# Copia de conveniencia. La fuente de verdad es tu gestor de contraseñas.',
           '# Generado por scripts/rotate-secret.mjs — NO commitear.'];

    for (const [key, value] of Object.entries(entries)) {
        lines = lines.filter((l) => !l.startsWith(`${key}=`));
        lines.push(`${key}=${value}`);
    }

    writeFileSync(VAULT_FILE, lines.join('\n') + '\n', { mode: 0o600 });
    appendFileSync(
        LOG_FILE,
        `${new Date().toISOString()}  rotado: ${Object.keys(entries).join(', ')}\n`
    );
}

// --- Subida a Cloudflare ---------------------------------------------------

function pushToCloudflare(key, value) {
    // El valor va por stdin, nunca por argv: así no queda en el historial del
    // shell ni en la lista de procesos.
    //
    // No se usa execFileSync({input, stdio:'pipe'}) directamente: en Windows,
    // ese stdin pasa por cmd.exe -> npx.cmd -> node.exe -> wrangler, y esa
    // cadena de procesos anidados puede quedarse colgada sin entregar el
    // valor ni devolver el control (visto en la práctica: el comando se
    // queda parado justo después de "Creating the secret...").
    //
    // En su lugar: el valor se escribe a un fichero temporal y se redirige
    // con el propio shell (`type archivo | comando` en Windows, `cat` en
    // Unix) — es al sistema operativo, no a Node, a quien le toca mover los
    // bytes entre procesos, que es el patrón fiable de verdad.
    const tmpFile = join(tmpdir(), `vt-secret-${process.pid}-${Date.now()}.txt`);
    writeFileSync(tmpFile, value, 'utf8');
    try {
        const command = process.platform === 'win32'
            ? `type "${tmpFile}" | npx wrangler secret put ${key} --name ${WORKER}`
            : `cat "${tmpFile}" | npx wrangler secret put ${key} --name ${WORKER}`;
        try {
            execSync(command, { stdio: 'inherit', shell: true, timeout: 20000 });
        } catch (error) {
            // Con timeout, un cuelgue ya no es silencioso: se convierte en un
            // error claro en menos de 20s, con la causa más probable.
            if (error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT') {
                console.error(`\n  ⚠️  ${key} no se subió: la subida no respondió en 20 segundos.`);
                console.error('     Causas típicas: no hay sesión de wrangler (prueba "npx wrangler whoami"),');
                console.error('     o esta terminal no es la misma donde wrangler ya inició sesión antes.');
            } else {
                console.error(`\n  ⚠️  ${key} no se subió. Salida de wrangler arriba, si la hay.`);
            }
            throw error;
        }
    } finally {
        try { unlinkSync(tmpFile); } catch { /* si ya no está, mejor */ }
    }
}

// --- Ejecución -------------------------------------------------------------

saveToVault(secrets);
console.log(`\n  Guardado en la bóveda local: ${VAULT_FILE}\n`);

if (dryRun) {
    console.log('  --dry-run: NO se ha subido nada a Cloudflare.\n');
} else {
    for (const [key, value] of Object.entries(secrets)) {
        console.log(`  Subiendo ${key} a Cloudflare...`);
        pushToCloudflare(key, value);
    }
    console.log('');
}

console.log('  ─────────────────────────────────────────────────────────────');
console.log('  COPIA ESTO A TU GESTOR DE CONTRASEÑAS (no se volverá a mostrar):\n');
for (const [key, value] of Object.entries(secrets)) {
    console.log(`  ${key}`);
    console.log(`  ${value}\n`);
}
console.log('  ─────────────────────────────────────────────────────────────\n');

if (target === 'jwt') {
    console.log('  Efecto: todos los tokens de sesión existentes quedan inválidos.');
    console.log('  Todo el mundo tendrá que volver a hacer login. No hay más pasos.\n');
} else {
    console.log('  Efecto: las suscripciones push existentes dejan de recibir avisos.');
    console.log('  Pasos pendientes:');
    console.log('    1. Actualizar VITE_VAPID_PUBLIC_KEY en Pages → visualtaste → Variables.');
    console.log('    2. Actualizar el valor por defecto en');
    console.log('       apps/client/src/providers/TrackingAndPushProvider.tsx');
    console.log('    3. Limpiar los tokens muertos:');
    console.log('       npx wrangler d1 execute restaurant-menu-saas --remote \\');
    console.log('         --command "UPDATE notification_tokens SET is_active = 0"');
    console.log('    4. Rebuild + deploy de apps/client.\n');
}
