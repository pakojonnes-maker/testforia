#!/usr/bin/env node
// scripts/demo-seed/seed.mjs
// =============================================================================
// Genera el SQL de una demo a partir de su ficha JSON.
//
//   node scripts/demo-seed/seed.mjs the-host-edition
//
// NO aplica nada: deja tres ficheros en out/ e imprime los comandos que hay que
// ejecutar. Es deliberado. El hook .claude/hooks/pre-deploy-guard.mjs vigila los
// comandos de Bash que escriben en producción (CLAUDE.md §7); si este script
// lanzara wrangler como proceso hijo, pasaría por debajo del guardarraíl sin que
// nadie lo hubiera decidido. Generar y aplicar son dos pasos a propósito.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './lib/build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const KV_NAMESPACE_ID = '89c387501e00410b9d4f0d80dc563bf2'; // GUIDE_CACHE (wrangler.toml)

const key = process.argv[2];
if (!key) {
    console.error('Uso: node scripts/demo-seed/seed.mjs <clave-de-la-demo>');
    console.error('Fichas disponibles en scripts/demo-seed/demos/');
    process.exit(1);
}

let demo;
try {
    demo = JSON.parse(readFileSync(join(HERE, 'demos', `${key}.json`), 'utf8'));
} catch (err) {
    console.error(`No se pudo leer demos/${key}.json: ${err.message}`);
    process.exit(1);
}

let result;
try {
    result = build(demo);
} catch (err) {
    console.error(`\n  Error construyendo la demo: ${err.message}\n`);
    process.exit(1);
}

const outDir = join(HERE, 'out');
mkdirSync(outDir, { recursive: true });
const seedPath = join(outDir, `${key}.seed.sql`);
const downPath = join(outDir, `${key}.teardown.sql`);
const assetsPath = join(outDir, `${key}.assets.ps1`);
writeFileSync(seedPath, result.seed);
writeFileSync(downPath, result.teardown);
writeFileSync(assetsPath, result.assetsScript);

const rel = (p) => p.replace(/\\/g, '/').split('/scripts/').pop().replace(/^/, 'scripts/');

console.log(`
  ${demo.agency.name} — ${demo.apartment.name}
  ${'─'.repeat(60)}
  Agencia       ${result.agencyId}
  Apartamento   ${result.aptId}
  Zona          ${demo.apartment.zone_id}  (reutilizada, no se crea nada en ella)
  Imágenes      ${result.assets.length} ficheros esperados en assets/${key}/

  Generado:
    ${rel(seedPath)}
    ${rel(downPath)}
    ${rel(assetsPath)}
`);

if (result.warnings.length > 0) {
    console.log(`  Traducciones incompletas (${result.warnings.length}):`);
    for (const w of result.warnings.slice(0, 12)) console.log(`    · ${w}`);
    if (result.warnings.length > 12) console.log(`    · … y ${result.warnings.length - 12} más`);
    console.log('');
}

console.log(`  SIGUIENTE PASO — primero en local, para verlo antes de tocar producción:

    npx wrangler d1 execute restaurant-menu-saas --file=${rel(seedPath)}

  Y cuando esté bien, a producción (commitea antes: CLAUDE.md §7):

    npx wrangler d1 execute restaurant-menu-saas --remote --file=${rel(seedPath)}

  La última consulta del fichero imprime el slug. Con él, invalida la caché KV
  (desplegar NO la invalida — CLAUDE.md §3):

    npx wrangler kv key put --namespace-id=${KV_NAMESPACE_ID} "ver:apt:<slug>" "$(date +%s%3N)" --remote

  Imágenes (opcional; sin ellas las tarjetas salen con placeholder gris):

    powershell -ExecutionPolicy Bypass -File ${rel(assetsPath)}

  PARA BORRARLO TODO después de la reunión:

    npx wrangler d1 execute restaurant-menu-saas --remote --file=${rel(downPath)}
`);
