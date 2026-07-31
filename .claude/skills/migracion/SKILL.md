---
name: migracion
description: Crear y aplicar una migración SQL de D1 en VisualTaste (base restaurant-menu-saas) siguiendo el procedimiento del repo — numeración, comprobar el esquema REAL antes de escribir, aplicar local y luego --remote, regenerar BDschemaFinal.sql y commitear junto al código que la necesita. Úsalo siempre que haya que añadir/cambiar tablas o columnas, o aplicar un .sql a producción.
---

# Migraciones D1 en VisualTaste

**No hay ledger de migraciones.** Nada registra qué fichero se ha aplicado a qué base.
Los comentarios dentro de una migración diciendo "esto ya existe" **no son fiables**
(`0055` afirmaba haber sembrado datos que nunca llegaron a producción). Todo lo que
sigue existe para compensar eso.

## 1. Comprobar el estado REAL antes de escribir nada

No te fíes de `BDschemaFinal.sql` ni de los comentarios de otras migraciones. Pregunta a
la base:

```bash
npx wrangler d1 execute restaurant-menu-saas --remote --json --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Para columnas de una tabla concreta: `PRAGMA table_info(<tabla>)`. Para saber si unos
datos existen de verdad, un `SELECT COUNT(*)` — no el comentario de nadie.

⚠️ SQLite en D1 falla con `UNION ALL` de ~8+ términos (`too many terms in compound
SELECT`). Para contar filas de muchas tablas, usa subconsultas escalares en un solo
`SELECT`.

## 2. Numerar

```bash
ls migrations | grep -E "^0[0-9]{3}" | sort | tail -1
```

Siguiente número, 4 dígitos, nombre descriptivo en snake_case:
`migrations/0080_lo_que_hace.sql`.

## 3. Escribir la migración

- Cabecera con **por qué** existe, no solo qué hace. Ese comentario es lo único que
  leerá la siguiente sesión.
- Idempotente donde se pueda (`CREATE TABLE IF NOT EXISTS`, `INSERT OR IGNORE`).
- D1 es estricto con `null`/`undefined`: sé explícito.
- Si añades datos de guidebook traducibles, recuerda los **13 idiomas activos** (`es` es
  la fuente; `en` el fallback) y el tipo de entidad correcto en `translations`.
- POIs y experiencias van **siempre** a `guide_pois` (discriminador `is_bookable`).
  `guide_experiences` está deprecada: no insertes ahí.

## 4. Aplicar: local primero, remoto después

```bash
npx wrangler d1 execute restaurant-menu-saas --file=migrations/0080_lo_que_hace.sql            # local
npx wrangler d1 execute restaurant-menu-saas --remote --file=migrations/0080_lo_que_hace.sql   # PRODUCCIÓN
```

El `--remote` pedirá confirmación (hook `pre-deploy-guard`) y **exige el working tree
limpio**. Es intencionado: una migración a medias en producción no tiene rollback.

Verifica el resultado con un `SELECT`, no con la ausencia de error.

## 5. Regenerar el esquema de referencia

```bash
npx wrangler d1 export restaurant-menu-saas --remote --no-data --output BDschemaFinal.sql
```

⚠️ El export **sobrescribe la cabecera del fichero entero**. Patrón obligatorio:
exportar → releer las primeras líneas → reinsertar a mano el bloque de cabecera (fecha,
motivo, nº de tablas) con `Edit` antes de dar la tarea por terminada.

## 6. Commitear junto al código

La migración y el código del worker que la necesita van en el **mismo commit o lote**.
Un worker desplegado que referencia una columna que solo existe en una migración sin
commitear es una mina para la siguiente sesión.

## 7. Si tocaste datos del guidebook: invalidar caché

`GET /guide/:slug` cachea en KV. Tras escribir datos nuevos, el endpoint público puede
servir datos viejos — no lo confundas con una migración fallida:

```bash
npx wrangler kv key put --namespace-id=89c387501e00410b9d4f0d80dc563bf2 "ver:apt:<slug>" "$(date +%s%3N)" --remote
```
