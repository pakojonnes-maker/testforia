/**
 * Los 13 idiomas activos del producto (ver CLAUDE.md §5). `es` es la fuente,
 * `en` el fallback. El mapeo de banderas NO es idioma→país directo: hay cuatro
 * casos fijados por el proyecto (zh→cn, ko→kr, uk→ua, ar→ae) que hay que
 * respetar, y el catalán no tiene bandera en el estándar Unicode, así que se
 * pinta con una insignia de texto en lugar de colgarle la de otro país.
 *
 * Bandera = IMAGEN (flag-icons), no emoji. Un emoji de bandera es una pareja
 * de "regional indicator symbols" que el sistema tiene que saber componer —
 * ni Windows/Chromium ni bastantes WebView de TV Android lo hacen: en vez de
 * la bandera pintan las dos letras del código sueltas, que es exactamente el
 * síntoma que esto corrige. Con SVG el resultado es el mismo en cualquier
 * plataforma, no depende de qué fuente de emoji tenga el dispositivo.
 */

import flagEs from 'flag-icons/flags/4x3/es.svg'
import flagGb from 'flag-icons/flags/4x3/gb.svg'
import flagFr from 'flag-icons/flags/4x3/fr.svg'
import flagDe from 'flag-icons/flags/4x3/de.svg'
import flagIt from 'flag-icons/flags/4x3/it.svg'
import flagPt from 'flag-icons/flags/4x3/pt.svg'
import flagAe from 'flag-icons/flags/4x3/ae.svg'
import flagRu from 'flag-icons/flags/4x3/ru.svg'
import flagUa from 'flag-icons/flags/4x3/ua.svg'
import flagCn from 'flag-icons/flags/4x3/cn.svg'
import flagJp from 'flag-icons/flags/4x3/jp.svg'
import flagKr from 'flag-icons/flags/4x3/kr.svg'

export interface LanguageOption {
  code: string
  /** Nombre en su propio idioma: es lo que reconoce el huésped, no "Alemán". */
  native: string
  /** URL de la bandera (SVG), o null cuando no existe una honesta (catalán). */
  flag: string | null
  rtl?: boolean
}

const CATALOG: Record<string, LanguageOption> = {
  es: { code: 'es', native: 'Español', flag: flagEs },
  en: { code: 'en', native: 'English', flag: flagGb },
  fr: { code: 'fr', native: 'Français', flag: flagFr },
  de: { code: 'de', native: 'Deutsch', flag: flagDe },
  it: { code: 'it', native: 'Italiano', flag: flagIt },
  pt: { code: 'pt', native: 'Português', flag: flagPt },
  ca: { code: 'ca', native: 'Català', flag: null },
  ar: { code: 'ar', native: 'العربية', flag: flagAe, rtl: true },
  ru: { code: 'ru', native: 'Русский', flag: flagRu },
  uk: { code: 'uk', native: 'Українська', flag: flagUa },
  zh: { code: 'zh', native: '中文', flag: flagCn },
  ja: { code: 'ja', native: '日本語', flag: flagJp },
  ko: { code: 'ko', native: '한국어', flag: flagKr },
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
