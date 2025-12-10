import { useLanguage } from '../contexts/LanguageContext';

/**
 * Obtiene la traducción de un campo de una entidad con fallback.
 * 
 * @param translations - Objeto de traducciones en formato { [field]: { [lang]: value } }
 * @param field - Campo a traducir (ej: 'name', 'description')
 * @param language - Código de idioma actual
 * @param fallbackLanguage - Idioma de fallback (por defecto 'es')
 * @returns Texto traducido o cadena vacía
 * 
 * @example
 * const dish = {
 *   translations: {
 *     name: { es: 'Paella', en: 'Paella', fr: 'Paëlla' },
 *     description: { es: 'Arroz con mariscos', en: 'Rice with seafood' }
 *   }
 * };
 * 
 * getTranslation(dish.translations, 'name', 'fr') // 'Paëlla'
 * getTranslation(dish.translations, 'description', 'fr', 'es') // 'Arroz con mariscos' (fallback)
 */
export function getTranslation(
    translations: Record<string, Record<string, string>> | undefined,
    field: string,
    language: string,
    fallbackLanguage: string = 'es'
): string {
    if (!translations || !field) return '';

    // 1. Intenta el idioma solicitado
    if (translations[field]?.[language]) {
        return translations[field][language];
    }

    // 2. Fallback al idioma por defecto
    if (translations[field]?.[fallbackLanguage]) {
        return translations[field][fallbackLanguage];
    }

    // 3. Fallback a cualquier idioma disponible
    const firstAvailable = Object.values(translations[field] || {})[0];
    if (firstAvailable) {
        return firstAvailable;
    }

    // 4. Sin traducciones disponibles
    return '';
}

/**
 * Hook para usar traducciones con el idioma actual del contexto
 * 
 * @returns Objeto con función t() y currentLanguage
 * 
 * @example
 * function DishCard({ dish }) {
 *   const { t } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <h3>{t(dish.translations, 'name')}</h3>
 *       <p>{t(dish.translations, 'description')}</p>
 *     </div>
 *   );
 * }
 */
export function useTranslation() {
    const { currentLanguage } = useLanguage();

    return {
        t: (translations: any, field: string) =>
            getTranslation(translations, field, currentLanguage),
        currentLanguage
    };
}

/**
 * Obtiene string de UI traducido para la landing page
 * 
 * @param ui - Mapa de strings de UI del backend
 * @param key - Clave del string (ej: 'contact_visit_us')
 * @param fallback - Texto de fallback si no existe la traducción
 * @returns Texto traducido o fallback
 * 
 * @example
 * function ContactSection({ ui }) {
 *   return (
 *     <button>{getUIString(ui, 'contact_subscribe', 'SUBSCRIBE')}</button>
 *   );
 * }
 */
export function getUIString(
    ui: Record<string, string> | undefined,
    key: string,
    fallback: string = ''
): string {
    return ui?.[key] || fallback;
}

/**
 * Helper para obtener traducciones de restaurante en landing
 * 
 * @param translations - Objeto de traducciones del restaurante por idioma
 * @param field - Campo a traducir
 * @param currentLanguage - Idioma actual
 * @param fallbackLanguage - Idioma de fallback
 * @returns Texto traducido
 * 
 * @example
 * const restaurantData = {
 *   translations: {
 *     es: { short_description: 'Cocina mediterránea' },
 *     en: { short_description: 'Mediterranean cuisine' }
 *   }
 * };
 * 
 * getLandingTranslation(restaurantData.translations, 'short_description', 'en')
 * // 'Mediterranean cuisine'
 */
export function getLandingTranslation(
    translations: Record<string, Record<string, string>> | undefined,
    field: string,
    currentLanguage: string,
    fallbackLanguage: string = 'es'
): string {
    if (!translations) return '';

    // 1. Intenta idioma actual
    if (translations[currentLanguage]?.[field]) {
        return translations[currentLanguage][field];
    }

    // 2. Fallback a idioma por defecto
    if (translations[fallbackLanguage]?.[field]) {
        return translations[fallbackLanguage][field];
    }

    // 3. Fallback vacío
    return '';
}

/**
 * Helper para obtener textos de configuración con soporte multilingüe
 * 
 * Jerarquía de fallback:
 * 1. config_override en idioma actual (multilingüe)
 * 2. config_override en cualquier idioma (legacy)
 * 3. UI string del idioma actual
 * 4. Hardcoded fallback
 * 
 * @param config - Objeto config de la sección
 * @param field - Campo a obtener (ej: 'title_override', 'subtitle_override')
 * @param currentLanguage - Idioma actual del usuario
 * @param uiKey - Clave del UI string de fallback
 * @param ui - Mapa de UI strings
 * @param hardcodedFallback - Fallback final hardcoded
 * @returns Texto traducido
 * 
 * @example
 * // config_data puede ser:
 * // Opción 1 (multilingüe): { "title_override": { "en": "Welcome", "es": "Bienvenidos" } }
 * // Opción 2 (legacy): { "title_override": "Welcome" }
 * 
 * const title = getConfigText(
 *   config,
 *   'title_override',
 *   'en',
 *   'hero_fallback_title',
 *   ui,
 *   'Delightful Experience'
 * );
 */
export function getConfigText(
    config: any,
    field: string,
    currentLanguage: string,
    uiKey: string,
    ui: Record<string, string> | undefined,
    hardcodedFallback: string = ''
): string {
    if (!config) {
        // Sin config, ir directo a UI string
        return getUIString(ui, uiKey, hardcodedFallback);
    }

    const value = config[field];

    // Si no existe el field en config
    if (!value) {
        return getUIString(ui, uiKey, hardcodedFallback);
    }

    // 1. Prioridad: Override multilingüe del restaurante
    if (typeof value === 'object' && !Array.isArray(value)) {
        // Es un objeto { en: "...", es: "...", fr: "..." }
        if (value[currentLanguage]) {
            return value[currentLanguage];
        }

        // Fallback a español si existe
        if (value['es']) {
            return value['es'];
        }

        // Fallback a inglés si existe
        if (value['en']) {
            return value['en'];
        }

        // Fallback a cualquier idioma disponible
        const firstAvailable = Object.values(value).find(v => typeof v === 'string');
        if (firstAvailable) {
            return firstAvailable as string;
        }
    }

    // 2. Override legacy (string directo) - Para compatibilidad
    if (typeof value === 'string') {
        return value;
    }

    // 3. Fallback a UI string
    return getUIString(ui, uiKey, hardcodedFallback);
}
