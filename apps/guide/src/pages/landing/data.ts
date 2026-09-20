// Contenido de la landing: todo el copy en un solo sitio.
//
// Sin precios, cifras ni testimonios inventados (el modelo de precios no está decidido y la página es
// pública), y solo se afirma lo que la guía hace hoy en producción.

export const MAILTO = 'mailto:info@visualtastes.com?subject=Demo%20VisualTaste%20Gu%C3%ADa';

export const NAV_LINKS: ReadonlyArray<readonly [href: string, label: string]> = [
  ['#guia', 'La guía'],
  ['#como-funciona', 'Cómo funciona'],
  ['#idiomas', 'Idiomas'],
  ['#preguntas', 'Preguntas'],
];

// ---------- el móvil de la demo del héroe ----------

export type TabId = 'casa' | 'lugares' | 'comer' | 'tienda' | 'conserje';

export const TABS: ReadonlyArray<{ id: TabId; label: string; desc: string }> = [
  { id: 'casa', label: 'Casa', desc: 'WiFi, código de entrada, hora de salida y las normas, a un toque desde el primer segundo.' },
  { id: 'lugares', label: 'Lugares', desc: 'Un mapa con lo mejor de la zona y lo que se tarda en llegar desde el alojamiento.' },
  { id: 'comer', label: 'Comer', desc: 'Tus restaurantes de confianza, a un toque.' },
  { id: 'tienda', label: 'Tienda', desc: 'Los productos y experiencias que ofreces. El pedido te llega por WhatsApp.' },
  { id: 'conserje', label: 'Conserje', desc: 'Responde con lo que has cargado y, si no lo sabe, lo dice y remite al anfitrión.' },
];

/** Colores de marca de la demo. Los valores viven en el CSS (.g.b-*); aquí solo el nombre y el color de la muestra. */
export const BRANDS: ReadonlyArray<{ id: string; name: string; swatch: string }> = [
  { id: 'terracota', name: 'Terracota', swatch: '#E07A5F' },
  { id: 'mar', name: 'Mar', swatch: '#34C2C9' },
  { id: 'oliva', name: 'Oliva', swatch: '#A8B56F' },
  { id: 'buganvilla', name: 'Buganvilla', swatch: '#E0679B' },
  { id: 'arena', name: 'Arena', swatch: '#B99F62' },
];

// ---------- secciones ----------

export const QUESTIONS: ReadonlyArray<{ n: string; q: string; a: string }> = [
  { n: '01', q: '«¿Cuál es la clave del WiFi?»', a: 'Es lo primero que ven, con un botón para copiarla.' },
  { n: '02', q: '«¿Cuál era el código de la puerta?»', a: 'En grande, y con cómo recogerlo si hace falta.' },
  { n: '03', q: '«¿A qué hora es la salida?»', a: 'La hora, y cómo se hace, explicado paso a paso.' },
  { n: '04', q: '«¿Dónde cenamos hoy?»', a: 'Tus restaurantes de confianza, a un toque.' },
];

export const STEPS: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: 'Cuéntalo una vez',
    text: 'Rellena la guía en el panel: WiFi, normas, entrada y salida, y tus recomendaciones. Si tu alojamiento está en Airbnb, traemos los datos del anuncio, y los lugares de la zona desde Google Maps.',
  },
  {
    title: 'Imprime el QR',
    text: 'Cada alojamiento tiene el suyo, con tu marca. Ponlo en la entrada o envíalo con la confirmación de la reserva.',
  },
  {
    title: 'El huésped escanea',
    text: 'Se abre en el navegador de su móvil, en su idioma. Tú ves qué mira, sin saber quién es.',
  },
];

export const LANGS: ReadonlyArray<{ code: string; name: string; greeting: string; dir: 'ltr' | 'rtl' }> = [
  { code: 'es', name: 'Español', greeting: 'Bienvenidos', dir: 'ltr' },
  { code: 'en', name: 'English', greeting: 'Welcome', dir: 'ltr' },
  { code: 'fr', name: 'Français', greeting: 'Bienvenue', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', greeting: 'Willkommen', dir: 'ltr' },
  { code: 'it', name: 'Italiano', greeting: 'Benvenuti', dir: 'ltr' },
  { code: 'pt', name: 'Português', greeting: 'Bem-vindos', dir: 'ltr' },
  { code: 'ca', name: 'Català', greeting: 'Benvinguts', dir: 'ltr' },
  { code: 'ar', name: 'العربية', greeting: 'أهلاً وسهلاً', dir: 'rtl' },
  { code: 'ru', name: 'Русский', greeting: 'Добро пожаловать', dir: 'ltr' },
  { code: 'uk', name: 'Українська', greeting: 'Ласкаво просимо', dir: 'ltr' },
  { code: 'zh', name: '中文', greeting: '欢迎光临', dir: 'ltr' },
  { code: 'ja', name: '日本語', greeting: 'ようこそ', dir: 'ltr' },
  { code: 'ko', name: '한국어', greeting: '환영합니다', dir: 'ltr' },
];

/** Filas de la ilustración del panel. Los porcentajes son de mentira y la página lo dice. */
export const DASH_ROWS: ReadonlyArray<{ label: string; pct: number }> = [
  { label: 'Guía abierta', pct: 92 },
  { label: 'Secciones vistas', pct: 74 },
  { label: 'Cartas de restaurante abiertas', pct: 58 },
  { label: 'Experiencias consultadas', pct: 46 },
  { label: 'Productos de la tienda', pct: 31 },
];
export const DASH_BARS: ReadonlyArray<number> = [38, 52, 44, 66, 74, 96, 84];

export const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: '¿Tienen que instalar una app los huéspedes?',
    a: 'No. La guía se abre en el navegador del móvil al escanear el QR, sin pasar por ninguna tienda de aplicaciones.',
  },
  {
    q: '¿Cuánto se tarda en montarla?',
    a: 'Tú revisas y ajustas lo que importamos: los datos del anuncio, si está en Airbnb, y los lugares de tu zona desde Google Maps.',
  },
  { q: '¿Puedo poner mi marca?', a: 'Sí. La guía lleva el logo y el color de tu agencia, y puedes elegir la tipografía.' },
  { q: '¿Y si cambio el WiFi o una norma?', a: 'Lo cambias una vez en el panel y la guía se actualiza. El QR impreso sigue valiendo.' },
  {
    q: '¿Qué datos se guardan?',
    a: 'La guía no pide datos ni tiene cuentas de huésped. Las visitas se miden de forma anónima: qué sección se abre y en qué idioma.',
  },
  { q: '¿Cuánto cuesta?', a: 'Depende de cuántos alojamientos gestiones. Cuéntanos tu caso en la demo y te lo decimos.' },
];
