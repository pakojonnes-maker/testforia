/**
 * Lo que dice el inicio de la tele en cada idioma.
 *
 * Es una COPIA de las claves del inicio «Mirador» en apps/tv/src/lib/i18n.ts
 * (se copia y no se importa por lo mismo que lib/theme.ts: apps/tv es una app
 * aparte). El español está además en index.html, que es lo que se pinta antes
 * de que llegue el script; el tipo exige los 13 idiomas, igual que en la tele.
 *
 * `door` no existe en la tele: allí es el título que el anfitrión da a su
 * bloque, y llega traducido del servidor. Va corto a propósito: la ficha de la
 * repisa corta con puntos suspensivos lo que pase de ~15 letras.
 */

export const TV_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'] as const
export type TvLang = (typeof TV_LANGS)[number]

type Translations = Record<TvLang, string>

export const TV_STRINGS = {
  welcome: {
    es: 'Bienvenidos', en: 'Welcome', fr: 'Bienvenue', de: 'Willkommen', it: 'Benvenuti',
    pt: 'Bem-vindos', ca: 'Benvinguts', ar: 'أهلاً بكم', ru: 'Добро пожаловать',
    uk: 'Ласкаво просимо', zh: '欢迎', ja: 'ようこそ', ko: '환영합니다',
  },
  quick_guides: {
    es: 'Guías rápidas', en: 'Quick guides', fr: 'Guides rapides', de: 'Kurzanleitungen',
    it: 'Guide rapide', pt: 'Guias rápidos', ca: 'Guies ràpides', ar: 'أدلة سريعة',
    ru: 'Краткие инструкции', uk: 'Короткі інструкції', zh: '快速指南', ja: 'クイックガイド', ko: '빠른 안내',
  },
  where_to_eat: {
    es: 'Dónde comer', en: 'Where to eat', fr: 'Où manger', de: 'Essen gehen',
    it: 'Dove mangiare', pt: 'Onde comer', ca: 'On menjar', ar: 'أين تأكل',
    ru: 'Где поесть', uk: 'Де поїсти', zh: '美食推荐', ja: 'グルメ', ko: '주변 맛집',
  },
  things_to_do: {
    es: 'Qué hacer', en: 'Things to do', fr: 'Que faire', de: 'Unternehmungen',
    it: 'Cosa fare', pt: 'O que fazer', ca: 'Què fer', ar: 'ماذا تفعل',
    ru: 'Чем заняться', uk: 'Чим зайнятися', zh: '玩乐', ja: '観光・体験', ko: '즐길 거리',
  },
  store_title: {
    es: 'Tienda', en: 'Store', fr: 'Boutique', de: 'Shop', it: 'Negozio', pt: 'Loja',
    ca: 'Botiga', ar: 'المتجر', ru: 'Магазин', uk: 'Магазин', zh: '商店', ja: 'ストア', ko: '스토어',
  },
  language: {
    es: 'Idioma', en: 'Language', fr: 'Langue', de: 'Sprache', it: 'Lingua', pt: 'Idioma',
    ca: 'Idioma', ar: 'اللغة', ru: 'Язык', uk: 'Мова', zh: '语言', ja: '言語', ko: '언어',
  },
  wifi_title: {
    es: 'WiFi de la casa', en: 'House WiFi', fr: 'WiFi du logement', de: 'WLAN der Unterkunft',
    it: 'Wi-Fi della casa', pt: 'Wi-Fi da casa', ca: 'WiFi de la casa', ar: 'واي فاي المنزل',
    ru: 'Домашний Wi-Fi', uk: 'Домашній Wi-Fi', zh: '住宿 WiFi', ja: '宿のWi-Fi', ko: '숙소 와이파이',
  },
  wifi_network: {
    es: 'Red', en: 'Network', fr: 'Réseau', de: 'WLAN', it: 'Rete', pt: 'Rede', ca: 'Xarxa',
    ar: 'الشبكة', ru: 'Сеть', uk: 'Мережа', zh: '网络', ja: 'SSID', ko: '네트워크',
  },
  wifi_key: {
    es: 'Clave', en: 'Key', fr: 'Clé', de: 'Code', it: 'Chiave', pt: 'Senha', ca: 'Clau',
    ar: 'كلمة المرور', ru: 'Пароль', uk: 'Пароль', zh: '密码', ja: 'パスワード', ko: '비밀번호',
  },
  checkout: {
    es: 'Salida', en: 'Check-out', fr: 'Départ', de: 'Abreise', it: 'Partenza', pt: 'Saída',
    ca: 'Sortida', ar: 'المغادرة', ru: 'Выезд', uk: 'Виїзд', zh: '退房', ja: 'チェックアウト', ko: '체크아웃',
  },
  door: {
    es: 'Código puerta', en: 'Door code', fr: "Code d'entrée", de: 'Türcode',
    it: 'Codice porta', pt: 'Código da porta', ca: "Codi d'entrada", ar: 'رمز الدخول',
    ru: 'Код от двери', uk: 'Код від дверей', zh: '门锁密码', ja: '入室コード', ko: '출입 코드',
  },
} satisfies Record<string, Translations>

export type TvStringKey = keyof typeof TV_STRINGS

export function isTvLang(code: string): code is TvLang {
  return (TV_LANGS as readonly string[]).includes(code)
}

export function isTvStringKey(key: string): key is TvStringKey {
  return Object.prototype.hasOwnProperty.call(TV_STRINGS, key)
}
