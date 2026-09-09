// scripts/demo-seed/lib/sql.mjs — helpers de generación de SQL para el sembrador de demos.
// =============================================================================
// Todo lo que sale de aquí es SQL en texto plano que se aplica con
// `wrangler d1 execute`. NO se ejecuta wrangler desde Node a propósito: el hook
// .claude/hooks/pre-deploy-guard.mjs vigila los comandos de Bash, y un script
// que lanzase wrangler como proceso hijo pasaría por debajo de ese guardarraíl
// sin que nadie lo hubiera decidido. El sembrador genera; el humano aplica.
// =============================================================================

export const ACTIVE_LANGUAGES = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'];
export const SOURCE_LANG = 'es';

/** Literal SQL. `null`/`undefined` -> NULL; números tal cual; el resto, texto escapado. */
export function lit(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
    if (typeof value === 'boolean') return value ? '1' : '0';
    return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Sustituye {{token}} por su valor. Los tokens son idénticos en los 13 idiomas
 * (por eso las traducciones se escriben UNA vez y valen para cualquier demo
 * futura: lo único que cambia entre demos son estos valores).
 *
 * Un token sin valor es un error duro y no un hueco silencioso: un "{{host_name}}"
 * literal en la guía de un cliente potencial es exactamente el detalle que
 * arruina una demo.
 */
export function fill(text, vars, where) {
    return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const value = vars[key];
        if (value === undefined || value === null || value === '') {
            throw new Error(`Token {{${key}}} sin valor (en ${where}). Añádelo al JSON de la demo.`);
        }
        return String(value);
    });
}

/**
 * Filas de `translations` para una entidad. `fieldsByLang` es
 * { field: { es: '...', en: '...' } } — se emite una fila por idioma activo que
 * tenga texto, y se avisa (no se rompe) si a un campo le faltan idiomas: es
 * preferible una demo con 11 idiomas a un script que no genera nada.
 *
 * ⚠️ BORRAR-Y-REINSERTAR EN VEZ DE `ON CONFLICT`, y no es por gusto:
 * la D1 local y la de producción NO tienen el mismo esquema en `translations`.
 *   local      -> CREATE TABLE translations (id TEXT PRIMARY KEY, entity_id, ...)
 *                 sin ninguna restricción única sobre la tupla.
 *   producción -> única sobre (entity_id, entity_type, field, language_code),
 *                 que es contra la que trabaja saveTranslations() en
 *                 workerGuideAdmin.js.
 * Cualquier `ON CONFLICT(...)` que funcione en una revienta en la otra con
 * "ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint".
 * El DELETE previo no depende de ningún índice y vale para las dos.
 *
 * Es seguro porque el sembrador es dueño de TODAS las traducciones de las
 * entidades que crea (bloques de info, productos y modal de ESTE apartamento):
 * borrar por entidad no se lleva nada de nadie más. Sobre entidades
 * compartidas —POIs, zonas, categorías— no se escribe nunca.
 */
export function translationRows(entityId, entityType, fieldsByLang, vars, warnings) {
    const values = [];
    for (const [field, byLang] of Object.entries(fieldsByLang)) {
        if (!byLang) continue;
        const missing = ACTIVE_LANGUAGES.filter(l => !byLang[l]?.trim?.());
        if (missing.length > 0) {
            warnings.push(`${entityType}/${entityId}.${field}: faltan ${missing.join(',')}`);
        }
        for (const lang of ACTIVE_LANGUAGES) {
            const raw = byLang[lang];
            if (!raw || !String(raw).trim()) continue;
            const value = fill(raw, vars, `${entityType}/${entityId}.${field}.${lang}`);
            values.push(`  (${lit(entityId)}, ${lit(entityType)}, ${lit(lang)}, ${lit(field)}, ${lit(value)})`);
        }
    }
    if (values.length === 0) return [];
    return [
        `DELETE FROM translations WHERE entity_id = ${lit(entityId)} AND entity_type = ${lit(entityType)};`,
        `INSERT INTO translations (entity_id, entity_type, language_code, field, value) VALUES`,
        values.join(',\n') + ';',
    ];
}

/** Cabecera de sección, para que el .sql generado se pueda leer y auditar a ojo. */
export function section(title) {
    return `\n-- ${'-'.repeat(74)}\n-- ${title}\n-- ${'-'.repeat(74)}`;
}
