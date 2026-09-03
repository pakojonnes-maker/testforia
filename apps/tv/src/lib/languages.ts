/**
 * Los 13 idiomas activos del producto (ver CLAUDE.md §5). `es` es la fuente,
 * `en` el fallback. El mapeo de banderas NO es idioma→país directo: hay cuatro
 * casos fijados por el proyecto (zh→cn, ko→kr, uk→ua, ar→ae) que hay que
 * respetar, y el catalán no tiene bandera en el estándar Unicode, así que se
 * pinta con una insignia de texto en lugar de colgarle la de otro país.
 */

export interface LanguageOption {
  code: string
  /** Nombre en su propio idioma: es lo que reconoce el huésped, no "Alemán". */
  native: string
  /** Emoji de bandera, o null cuando no existe una honesta para ese idioma. */
  flag: string | null
  rtl?: boolean
}

const CATALOG: Record<string, LanguageOption> = {
  es: { code: 'es', native: 'Español', flag: '🇪🇸' },
  en: { code: 'en', native: 'English', flag: '🇬🇧' },
  fr: { code: 'fr', native: 'Français', flag: '🇫🇷' },
  de: { code: 'de', native: 'Deutsch', flag: '🇩🇪' },
  it: { code: 'it', native: 'Italiano', flag: '🇮🇹' },
  pt: { code: 'pt', native: 'Português', flag: '🇵🇹' },
  ca: { code: 'ca', native: 'Català', flag: null },
  ar: { code: 'ar', native: 'العربية', flag: '🇦🇪', rtl: true },
  ru: { code: 'ru', native: 'Русский', flag: '🇷🇺' },
  uk: { code: 'uk', native: 'Українська', flag: '🇺🇦' },
  zh: { code: 'zh', native: '中文', flag: '🇨🇳' },
  ja: { code: 'ja', native: '日本語', flag: '🇯🇵' },
  ko: { code: 'ko', native: '한국어', flag: '🇰🇷' },
}

export const DEFAULT_LANG = 'es'

export function languageOption(code: string): LanguageOption {
  return CATALOG[code.toLowerCase()] || { code, native: code.toUpperCase(), flag: null }
}

/**
 * Ordena los idiomas disponibles poniendo primero los que el huésped medio de
 * la costa española reconoce, en vez de alfabéticamente: en una rejilla de TV
 * los primeros son los que se alcanzan sin cruzar la pantalla con el mando.
 */
const PRIORITY = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca']

export function orderedLanguages(available?: string[]): LanguageOption[] {
  const codes = (available && available.length ? available : [DEFAULT_LANG, 'en'])
    .map(c => c.toLowerCase())
  const unique = Array.from(new Set(codes))
  unique.sort((a, b) => {
    const ia = PRIORITY.indexOf(a)
    const ib = PRIORITY.indexOf(b)
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b)
  })
  return unique.map(languageOption)
}

export function isRtl(code: string): boolean {
  return languageOption(code).rtl === true
}
