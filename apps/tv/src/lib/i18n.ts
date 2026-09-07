/**
 * Copy de interfaz para la pantalla TV — solo las claves que hacen falta hoy.
 *
 * El resto de la app sigue en español fijo (no hay un sistema de i18n general
 * aquí todavía). Estas SÍ llevan traducción porque reutilizan texto que ya
 * existe en otra parte de la plataforma, en vez de inventarlo:
 *  - `quick_guides` y `store_title` son los mismos strings que
 *    `apps/guide/src/lib/i18n.ts`.
 *  - `rules` es el mismo `name` (13 idiomas) que la categoría 'rules' del
 *    catálogo de `migrations/0083_guide_info_categories.sql`.
 */

const TV_STRINGS = {
  rules: {
    es: 'Normas de la casa', en: 'House Rules', fr: 'Règlement intérieur', de: 'Hausordnung',
    it: 'Regole della casa', pt: 'Regras da casa', ca: 'Normes de la casa', ar: 'قواعد المنزل',
    ru: 'Правила дома', uk: 'Правила дому', zh: '房屋守则', ja: 'ハウスルール', ko: '하우스 룰',
  },
  quick_guides: {
    es: 'Guías Rápidas', en: 'Quick Guides', fr: 'Guides rapides', de: 'Kurzanleitungen',
    it: 'Guide rapide', pt: 'Guias rápidos', ca: 'Guies ràpides', ar: 'أدلة سريعة',
    ru: 'Краткие инструкции', uk: 'Короткі інструкції', zh: '快速指南', ja: 'クイックガイド', ko: '빠른 안내',
  },
  store_title: {
    es: 'Tienda', en: 'Store', fr: 'Boutique', de: 'Shop', it: 'Negozio', pt: 'Loja',
    ca: 'Botiga', ar: 'المتجر', ru: 'Магазин', uk: 'Магазин', zh: '商店', ja: 'ストア', ko: '스토어',
  },
} as const satisfies Record<string, Record<string, string>>

export type TvStringKey = keyof typeof TV_STRINGS

export function getTvString(key: TvStringKey, lang: string): string {
  const entry = TV_STRINGS[key]
  return entry[lang as keyof typeof entry] || entry.es
}
