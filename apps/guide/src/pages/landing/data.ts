// Contenido de la landing y de sus páginas de venta: todo el copy en un solo sitio.
//
// Reglas que conviene no romper (oct-2026, ver el Design artifact «Landing guía — ideas TouchStay»):
//  - Solo se afirma lo que la guía hace hoy en producción.
//  - La competencia NUNCA se nombra (decisión de Francisco): «guía internacional A / B», sin país. Cada dato suyo
//    lleva su fuente y su fecha en la letra pequeña, y la tabla solo tiene filas en las que no perdemos.
//  - Precio: 50 €/mes sin IVA hasta 30 pisos, pago anual, sin cuota de alta ni permanencia; más de 30, a consultar.
//    La app de la tele es gratis; el aparato, un extra opcional (nunca «tele incluida»).

export const PHONE_DISPLAY = '633 74 70 33';
export const PHONE_TEL = 'tel:+34633747033';
export const WHATSAPP_NUMBER = '34633747033';
export const EMAIL = 'info@visualtastes.com';
export const MAILTO = `mailto:${EMAIL}?subject=Demo%20VisualTaste%20Gu%C3%ADa`;
export const SITE = 'https://guide.visualtastes.com';

export interface QA {
  q: string;
  a: string;
}

export interface PageMeta {
  path: string;
  title: string;
  description: string;
  /** Nombre corto para las migas y el JSON-LD. */
  name: string;
}

export const PAGES = {
  home: {
    path: '/',
    name: 'Inicio',
    title: 'Guía digital para apartamentos turísticos | VisualTaste Guía',
    description:
      'Guía digital con QR para apartamentos turísticos: WiFi, normas, mapa, restaurantes, tienda de extras y un conserje con IA en 13 idiomas. 50 € al mes hasta 30 pisos, todo incluido.',
  },
  gestoras: {
    path: '/para/gestoras-de-apartamentos',
    name: 'Para gestoras',
    title: 'Guía digital para gestoras de apartamentos turísticos | VisualTaste',
    description:
      'Una guía por piso sin escribir cien: lo de la zona se escribe una vez y vale para todos tus pisos. Tu marca, 13 idiomas y conserje con IA. 50 € al mes hasta 30 pisos.',
  },
  conserje: {
    path: '/funciones/conserje-ia',
    name: 'Conserje con IA',
    title: 'Conserje con IA para apartamentos turísticos | VisualTaste',
    description:
      'Un conserje con IA dentro de la guía que contesta a tus huéspedes a cualquier hora y en su idioma, solo con lo que tú has cargado. Si no lo sabe, lo dice.',
  },
  libro: {
    path: '/guias/libro-de-bienvenida-digital',
    name: 'Libro de bienvenida digital',
    title: 'Libro de bienvenida digital: qué debe llevar (lista) | VisualTaste',
    description:
      'Qué es un libro de bienvenida digital para Airbnb, Booking y alquiler vacacional, y las doce cosas que tu huésped va a buscar en él, en el orden en que las busca.',
  },
  comparar: {
    path: '/comparar/guias-digitales',
    name: 'Comparar guías digitales',
    title: 'Comparar guías digitales para alojamientos | VisualTaste',
    description:
      'Qué hace cada opción para el libro de bienvenida de tu alojamiento, papel, PDF o guía digital, y también lo que VisualTaste no hace.',
  },
} satisfies Record<string, PageMeta>;

export type PageKey = keyof typeof PAGES;

// ---------- portada ----------

export const FEATURES: ReadonlyArray<{ title: string; text: string; to?: string; href?: string; cta?: string; dark?: boolean }> = [
  { title: 'La casa', text: 'WiFi con botón de copiar, código de entrada, normas, teléfonos útiles y la salida explicada paso a paso.', to: PAGES.libro.path },
  { title: 'Conserje con IA', text: 'Contesta a cualquier hora, en el idioma del huésped y solo con lo que tú has cargado. Si no lo sabe, lo dice y remite a ti.', to: PAGES.conserje.path },
  { title: 'Lugares', text: 'Playas, rutas y planes de la zona en un mapa, con lo que se tarda en llegar desde el piso. Los traemos de Google Maps.' },
  { title: 'Dónde comer', text: 'Tus restaurantes de confianza, por tipo de cocina, para reservar por teléfono o WhatsApp. Los que usan VisualTaste abren su carta en vídeo.' },
  { title: 'Tienda de extras', text: 'Productos y experiencias que ofreces durante la estancia. El pedido te llega por WhatsApp.' },
  { title: '13 idiomas', text: 'Escribes en español y se traduce solo. Lo que corrijas a mano no se pisa. El árabe se lee de derecha a izquierda.' },
  { title: 'Panel de visitas', text: 'Cuántos abren la guía, qué secciones miran y en qué idioma. Anónimo: sin cuentas ni perfiles de huésped.' },
  { title: 'VisualTaste TV', text: 'La misma guía, en la tele del salón: bienvenida, WiFi y los alrededores. Se maneja con el mando.', href: 'https://tv.visualtastes.com', cta: 'Conocer la TV', dark: true },
];

export const JOURNEY: ReadonlyArray<{ k: string; title: string; items: ReadonlyArray<readonly [string, string]> }> = [
  {
    k: 'Antes de llegar',
    title: 'Llega sabiendo cómo entrar',
    items: [
      ['El enlace va con la reserva', 'Lo pegas en el mensaje de confirmación de Airbnb, Booking o el tuyo. Sin descargas.'],
      ['Cómo llegar y cómo entrar', 'Dirección, código de la puerta y dónde recoger las llaves, en grande.'],
      ['En su idioma desde el primer toque', 'La guía se abre en el idioma de su móvil y cambia con un toque.'],
    ],
  },
  {
    k: 'Durante la estancia',
    title: 'Lo resuelve sin escribirte',
    items: [
      ['El WiFi, lo primero', 'Red y contraseña con un botón para copiarla.'],
      ['Un conserje a las once de la noche', 'Pregunta lo que quiera; contesta con lo que tú has escrito.'],
      ['Dónde comer y qué hacer', 'Tus recomendaciones en un mapa, con la distancia desde el piso.'],
      ['Extras cuando los necesita', 'Un pedido de la tienda llega a tu WhatsApp.'],
      ['Y en la tele, si la hay', 'VisualTaste TV le da la bienvenida al encenderla.'],
    ],
  },
  {
    k: 'Al irse',
    title: 'Sale sin dudas, y tú aprendes',
    items: [
      ['La salida, paso a paso', 'Hora, llaves, basura y lo que haga falta dejar hecho.'],
      ['Teléfonos por si algo falla', 'Los tuyos y los de urgencias de la zona.'],
      ['Tú ves qué se usó', 'El panel te dice qué miraron, sin saber quién.'],
    ],
  },
];

export const CONNECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['Airbnb', 'Importa los datos del anuncio para no empezar de cero.'],
  ['Google Maps', 'Lugares y restaurantes de la zona, con su ficha.'],
  ['WhatsApp', 'Pedidos de la tienda y reservas de restaurante, a tu número.'],
  ['Carta VisualTaste', 'Los restaurantes con nuestra carta abren su carta en vídeo.'],
  ['VisualTaste TV', 'Lo que cambias en la guía sale también en la tele.'],
];

/** Precio al mes con 30 pisos. A y B son las dos guías internacionales de la tabla (nunca se nombran). */
export const PRICE_BARS: ReadonlyArray<{ name: string; price: string; pct: number; us?: boolean }> = [
  { name: 'VisualTaste', price: '50 €', pct: 40.8, us: true },
  { name: 'Guía internacional A', price: '117,08 €', pct: 95.6 },
  { name: 'Guía internacional B', price: '122,50 €', pct: 100 },
];

export interface CompareCell {
  t: string;
  s?: string;
  no?: boolean;
}

export const COMPARE: ReadonlyArray<{ row: string; us: CompareCell; a: CompareCell; b: CompareCell }> = [
  {
    row: 'Precio al mes con 30 pisos, pago anual',
    us: { t: '50 €', s: '1,67 € por piso' },
    a: { t: '117,08 €', s: 'en su plan con chat IA, pagando el año' },
    b: { t: '122,50 €', s: '49 € por piso al año, tarifa de lista' },
  },
  { row: 'Conserje con IA, incluido en el precio', us: { t: 'Sí, sin pagar más' }, a: { t: 'Solo en el plan de arriba' }, b: { t: 'Sí' } },
  { row: 'Estadísticas, incluidas en el precio', us: { t: 'Sí, anónimas' }, a: { t: 'Solo en el plan de arriba' }, b: { t: 'Sí' } },
  { row: 'Tienda de extras', us: { t: 'Gratis', s: 'el pedido te llega por WhatsApp' }, a: { t: 'Cobro por Stripe, con su comisión' }, b: { t: '9,90 € al mes aparte' } },
  { row: 'QR para imprimir', us: { t: 'Gratis, uno por piso' }, a: { t: 'Plantillas gratis' }, b: { t: 'Carteles desde 7,90 €' } },
  { row: 'App para la tele del salón', us: { t: 'Gratis la app; el aparato, opcional si tu tele no la admite' }, a: { t: 'No', no: true }, b: { t: 'No', no: true } },
  { row: 'Carta en vídeo de los restaurantes', us: { t: 'Sí' }, a: { t: 'No', no: true }, b: { t: 'No', no: true } },
  { row: 'Empresa y atención', us: { t: 'En España, en español' }, a: { t: 'Fuera de España' }, b: { t: 'Fuera de España' } },
];

export const COMPARE_SOURCES =
  'Precios públicos de sus webs. A: calculadora en euros, pago anual, 4 de octubre de 2026 (pagando mes a mes, 151,40 €; su web no dice si lleva IVA). B: tarifa de lista sin IVA, 5 de octubre de 2026. Nuestro precio, sin IVA.';

export const FAQ_TOPICS: ReadonlyArray<{ id: string; label: string; items: ReadonlyArray<QA> }> = [
  {
    id: 'general',
    label: 'General',
    items: [
      { q: '¿Qué es una guía digital para apartamentos turísticos?', a: 'Es el libro de bienvenida del piso, pero en el móvil del huésped: WiFi, normas, cómo entrar y salir, recomendaciones de la zona y un conserje que contesta dudas. Se abre con un QR o un enlace, sin instalar nada.' },
      { q: '¿Qué diferencia hay con un libro de bienvenida en PDF?', a: 'Un PDF no se actualiza solo, no se traduce, no responde preguntas y no te dice si alguien lo ha leído. La guía hace las cuatro cosas, y el QR impreso sigue valiendo aunque cambies el contenido.' },
      { q: '¿Funciona con Airbnb, Booking y Vrbo?', a: 'Sí. La guía es un enlace: lo pegas en el mensaje de la reserva de cualquier plataforma. Desde Airbnb, además, podemos importar los datos del anuncio para montarla.' },
      { q: '¿Tienen que instalar una app los huéspedes?', a: 'No. Se abre en el navegador del móvil al escanear el QR o tocar el enlace.' },
    ],
  },
  {
    id: 'conserje',
    label: 'Conserje IA',
    items: [
      { q: '¿Qué preguntas puede responder el conserje?', a: 'Las que se contestan con lo que has cargado en la guía: WiFi, horarios, normas, aparcamiento, restaurantes, planes de la zona, la tienda.' },
      { q: '¿Qué pasa si el conserje no sabe la respuesta?', a: 'Lo dice, y remite al huésped a tu teléfono. No se inventa datos del piso.' },
      { q: '¿El conserje contesta a cualquier hora?', a: 'Sí, a cualquier hora y en el idioma del huésped.' },
    ],
  },
  {
    id: 'idiomas',
    label: 'Idiomas',
    items: [
      { q: '¿En qué idiomas está la guía?', a: 'En 13: español, inglés, francés, alemán, italiano, portugués, catalán, árabe, ruso, ucraniano, chino, japonés y coreano.' },
      { q: '¿Tengo que traducir la guía yo?', a: 'No. Escribes en español y la guía se traduce sola. Si corriges una traducción a mano, no se vuelve a pisar.' },
    ],
  },
  {
    id: 'montaje',
    label: 'Montaje',
    items: [
      { q: '¿Cuánto se tarda en montar la primera guía?', a: 'Si el piso está en Airbnb, importamos los datos del anuncio y los lugares de la zona desde Google Maps. Te queda revisar y completar lo que solo sabes tú: el código, las normas, tus restaurantes.' },
      { q: '¿Puedo poner mi marca en la guía?', a: 'Sí: el logo, el color de tu agencia y la tipografía.' },
      { q: '¿Y si cambio el WiFi o una norma?', a: 'Lo cambias una vez en el panel y la guía se actualiza. El QR impreso sigue valiendo.' },
      { q: '¿Cómo comparto la guía con mis huéspedes?', a: 'Con el QR en la entrada del piso, o con el enlace en el mensaje de confirmación de la reserva.' },
    ],
  },
  {
    id: 'precio',
    label: 'Precio',
    items: [
      { q: '¿Cuánto cuesta VisualTaste Guía?', a: '50 € al mes hasta 30 pisos, con todo incluido: conserje con IA, estadísticas, tienda, 13 idiomas y la app de la tele. Se paga al año: 600 €, sin IVA. Con más de 30 pisos, a consultar.' },
      { q: '¿Por qué es más barata que las guías internacionales?', a: 'Porque cobramos una tarifa plana y no por piso. Con 30 pisos, las guías internacionales más usadas cobran entre 117 y 122 € al mes; nosotros, 50 €.' },
      { q: '¿Hay precio especial en la Costa del Sol?', a: 'Sí. VisualTaste nació aquí, y los pisos de la Costa del Sol tienen un precio de fundador más bajo. Pregúntanos el tuyo.' },
      { q: '¿Hay cuota de alta o permanencia?', a: 'No hay ni cuota de alta ni permanencia. El pago es anual, que simplifica la contabilidad: una factura al año.' },
      { q: '¿Y la tele?', a: 'La app de VisualTaste TV es gratis y va incluida. Si tu tele no la admite, te ofrecemos el aparato que la conecta, como extra opcional.' },
    ],
  },
  {
    id: 'privacidad',
    label: 'Privacidad',
    items: [
      { q: '¿Qué datos se guardan del huésped?', a: 'La guía no pide datos ni tiene cuentas de huésped. Las visitas se miden de forma anónima: qué sección se abre y en qué idioma.' },
      { q: '¿Necesito un banner de cookies para medir la guía?', a: 'No: la medición anónima no guarda nada en el móvil del huésped.' },
    ],
  },
];

/** Todas las preguntas de la portada, para el JSON-LD (FAQPage). */
export const FAQ: ReadonlyArray<QA> = FAQ_TOPICS.flatMap((t) => t.items);

// ---------- gestoras ----------

export const GESTORAS_PAINS: ReadonlyArray<readonly [string, string]> = [
  ['«¿Cuál es el WiFi?», a las once de la noche', 'Es lo primero que ve el huésped, con un botón para copiar la clave.'],
  ['Un PDF por piso, y ninguno al día', 'Lo cambias en el panel y el QR impreso sigue valiendo.'],
  ['Huéspedes de doce países, la guía en español', 'Se traduce sola a 13 idiomas, árabe incluido.'],
  ['No sabes si alguien la lee', 'El panel te dice qué se abre en cada piso, de forma anónima.'],
];

export const GESTORAS_LAYERS: ReadonlyArray<readonly [string, string]> = [
  ['Tu agencia', 'Logo, color y tipografía. Se aplica a todas las guías, y a la tele si la tienes.'],
  ['Cada zona', 'Playas, rutas, planes y restaurantes. Los traemos de Google Maps y valen para todos los pisos de la zona.'],
  ['Cada piso', 'WiFi, código de entrada, aparcamiento, normas y salida. Si está en Airbnb, importamos los datos del anuncio.'],
];

/** Colores de la muestra de marca: oscuros a propósito, para que el blanco encima pase de 4,5:1. */
export const BRANDS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: 'Terracota', hex: '#A94726' },
  { name: 'Mar', hex: '#0E6F86' },
  { name: 'Oliva', hex: '#5E6B2C' },
  { name: 'Buganvilla', hex: '#A8336A' },
  { name: 'Arena', hex: '#7A6431' },
];

export const GESTORAS_FAQ: ReadonlyArray<QA> = [
  { q: '¿Lo de la zona hay que escribirlo en cada piso?', a: 'No. Playas, planes y restaurantes se escriben una vez por zona y salen en todos los pisos de esa zona.' },
  { q: '¿Puedo poner la marca de mi agencia?', a: 'Sí: logo, color y tipografía, en todas las guías y en la tele.' },
  { q: '¿Os conectáis con mi programa de gestión?', a: 'Todavía no (Icnea, AvaiBook, Guesty…). La guía es un enlace por piso: va en el mensaje de confirmación que ya mandas.' },
  { q: '¿Me montáis vosotros las guías?', a: 'A las 10 primeras gestoras del programa fundador, sí: la primera guía la montamos nosotros, y es gratis hasta el 31 de mayo de 2027.' },
  { q: '¿Puedo vender extras a huéspedes que reservaron por Airbnb?', a: 'Airbnb no deja cobrar fuera de su plataforma lo que debería ir en el anuncio. Te contamos en la demo qué tiene sentido poner en la tienda y qué no.' },
  { q: '¿Cuánto cuesta con más de 30 pisos?', a: 'A consultar. Cuéntanos cuántos pisos gestionas y te lo decimos en la demo, con todo incluido igual que en el tramo de 50 €.' },
];

// ---------- conserje ----------

export const CHAT_DEMO: ReadonlyArray<{ label: string; q: string; a: string; card?: readonly [string, string] }> = [
  { label: 'Aparcamiento', q: '¿Hay sitio para aparcar?', a: 'Sí: tienes la plaza 14 del garaje. El mando está en el cajón de la entrada.' },
  {
    label: 'Cenar hoy',
    q: 'Where can we have dinner tonight near the flat?',
    a: 'Your host recommends La Mar Salada, 6 minutes on foot. Andalusian food and fresh fish.',
    card: ['La Mar Salada', 'Andalusian · 6 min on foot · Book by phone or WhatsApp'],
  },
  { label: 'Salida', q: '¿A qué hora hay que dejar el piso?', a: 'A las 11:00. Deja las llaves en el cajetín del portal y la basura en el contenedor de la esquina.' },
  { label: 'Fiesta', q: '¿Podemos hacer una fiesta el sábado?', a: 'No lo pone la guía, así que mejor pregúntaselo a tu anfitrión. Te dejo su teléfono.' },
];

export const CONSERJE_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['La casa', 'WiFi, horas de entrada y salida, normas, aparcamiento.'],
  ['Teléfonos', 'Los tuyos y los útiles de la zona.'],
  ['Restaurantes', 'Los que recomiendas, con su tarjeta para reservar.'],
  ['Lugares', 'Playas, rutas y planes de la zona.'],
  ['Tienda', 'Tus extras, para que los encuentre al preguntar.'],
  ['Tus textos', 'Todo lo que escribas en la guía.'],
];

export const CONSERJE_YES: ReadonlyArray<string> = [
  'Contesta en el idioma del huésped, en cualquiera de los 13.',
  'Recomienda tus restaurantes y planes, con su tarjeta.',
  'Responde a cualquier hora, también de madrugada.',
  'Remite a tu teléfono cuando no tiene la respuesta.',
  'Se entera solo cuando cambias algo en la guía.',
];

export const CONSERJE_NO: ReadonlyArray<string> = [
  'Inventarse un código de puerta o una hora que no has puesto.',
  'Hablar en tu nombre por WhatsApp o por el correo.',
  'Reservar ni cobrar: eso sigue pasando por ti.',
  'Pedir al huésped que se registre o deje sus datos.',
];

export const CONSERJE_STEPS: ReadonlyArray<readonly [string, string]> = [
  ['Rellena la guía', 'Lo que ya ibas a poner: WiFi, normas, salida y recomendaciones.'],
  ['El conserje la lee', 'Viene activado en cada guía. No hay que escribir preguntas y respuestas aparte.'],
  ['Cambias algo, y lo sabe', 'Si cambia el WiFi o la hora de salida, contesta con el dato nuevo.'],
];

export const CONSERJE_FAQ: ReadonlyArray<QA> = [
  { q: '¿Qué preguntas puede responder el conserje con IA?', a: 'Las que se contestan con la guía del piso: WiFi, horarios, normas, aparcamiento, restaurantes, planes de la zona y la tienda.' },
  { q: '¿Puedo cambiar lo que contesta?', a: 'Sí: contesta con lo que hay en la guía, así que basta con cambiar la guía.' },
  { q: '¿En qué idiomas contesta?', a: 'En los 13 de la guía, árabe incluido.' },
  { q: '¿Está disponible las 24 horas?', a: 'Sí, a cualquier hora del día y de la noche.' },
  { q: '¿Qué pasa si no sabe la respuesta?', a: 'Lo dice y le da al huésped tu teléfono.' },
  { q: '¿Cómo reduce los mensajes que recibo?', a: 'Las preguntas de siempre (WiFi, salida, aparcamiento, dónde cenar) las contesta él, a la hora que sea.' },
  { q: '¿En qué se diferencia de ChatGPT?', a: 'ChatGPT no conoce tu piso. El conserje solo sabe lo que hay en tu guía y recomienda tus sitios, no los primeros que encuentre.' },
  { q: '¿Cuál es el mejor chatbot para apartamentos turísticos?', a: 'El que contesta con los datos de tu piso, en el idioma del huésped, y admite cuándo no lo sabe. Pídenos una demo y pruébalo con uno de tus pisos.' },
  { q: '¿El conserje cuesta aparte?', a: 'No. Va incluido en el precio: 50 € al mes hasta 30 pisos.' },
];

// ---------- libro de bienvenida ----------

export const CHECKLIST: ReadonlyArray<readonly [title: string, text: string, where: string]> = [
  ['Cómo llegar', 'Dirección exacta, portal y planta, y cómo llegar desde el aeropuerto.', 'Casa'],
  ['Cómo entrar', 'Código de la puerta o dónde recoger las llaves, y a partir de qué hora.', 'Casa'],
  ['El WiFi', 'Nombre de la red y contraseña, fáciles de copiar.', 'lo primero que se ve'],
  ['Normas de la casa', 'Ruido, fumar, mascotas, visitas. Pocas y claras.', 'Casa'],
  ['Cómo funciona la casa', 'Aire acondicionado, vitrocerámica, lavadora, agua caliente.', 'Casa'],
  ['Basura y reciclaje', 'Dónde están los contenedores y qué va en cada uno.', 'Casa'],
  ['Aparcamiento', 'Plaza, garaje o zona azul, y dónde está el mando.', 'Casa'],
  ['Teléfonos', 'El tuyo, urgencias, farmacia de guardia y un taxi.', 'Casa'],
  ['Dónde comer', 'Tus sitios de confianza, con el tipo de cocina y cómo reservar.', 'Comer'],
  ['Qué hacer', 'Playas, rutas y planes, con lo que se tarda en llegar.', 'Lugares, con mapa'],
  ['Extras', 'Traslados, cestas de bienvenida, excursiones.', 'Tienda'],
  ['La salida', 'Hora, dónde dejar las llaves y qué dejar hecho.', 'Casa, paso a paso'],
];

export const FORMATS: ReadonlyArray<{ row: string; paper: CompareCell; pdf: CompareCell; us: string }> = [
  { row: 'Cambiar el WiFi o una norma', paper: { t: 'Reimprimir' }, pdf: { t: 'Rehacer y reenviar' }, us: 'Se cambia una vez y vale el mismo QR' },
  { row: 'Idiomas', paper: { t: 'Los que imprimas' }, pdf: { t: 'Uno por archivo' }, us: '13, el huésped elige' },
  { row: 'Responde preguntas', paper: { t: 'No', no: true }, pdf: { t: 'No', no: true }, us: 'Sí, con el conserje' },
  { row: 'Mapa de la zona', paper: { t: 'No', no: true }, pdf: { t: 'Un enlace suelto' }, us: 'Sí, con distancias desde el piso' },
  { row: 'Saber si alguien lo lee', paper: { t: 'No', no: true }, pdf: { t: 'No', no: true }, us: 'Sí, de forma anónima' },
  { row: 'Lo encuentra antes de llegar', paper: { t: 'No', no: true }, pdf: { t: 'Si guarda el archivo' }, us: 'Sí, con el enlace de la reserva' },
];

export const LIBRO_STEPS: ReadonlyArray<readonly [string, string]> = [
  ['Importa', 'Si el piso está en Airbnb, traemos los datos del anuncio, y los lugares de la zona desde Google Maps.'],
  ['Completa', 'Lo que solo sabes tú: el código, la basura, tus restaurantes. Se traduce solo a 13 idiomas.'],
  ['Comparte', 'El QR en la entrada y el enlace en el mensaje de la reserva.'],
];

export const LIBRO_FAQ: ReadonlyArray<QA> = [
  { q: '¿Qué diferencia hay entre libro de bienvenida y manual de la casa?', a: 'Ninguna en la práctica: son dos nombres para lo mismo. «Manual de la casa» suele usarse para la parte de cómo funcionan los aparatos.' },
  { q: '¿Cómo le doy el libro de bienvenida al huésped?', a: 'Con un QR en la entrada y con el enlace en el mensaje de confirmación de la reserva, para que lo tenga antes de llegar.' },
  { q: '¿Sirve igual para Airbnb que para Booking?', a: 'Sí. Es un enlace: va en el mensaje de cualquier plataforma, o en el tuyo si la reserva es directa.' },
  { q: '¿Lo puedo tener en varios idiomas?', a: 'Con VisualTaste se traduce solo a 13 idiomas. En papel, tendrías que imprimir uno por idioma.' },
  { q: '¿Qué pongo en las normas de la casa?', a: 'Pocas y concretas: horario de silencio, fumar, mascotas, visitas, y qué pasa si se incumplen. Las mismas que en el anuncio.' },
];

// ---------- comparar ----------

export const FULL_COMPARE: ReadonlyArray<{ row: string; pdf: CompareCell; a: CompareCell; us: CompareCell & { plain?: boolean } }> = [
  { row: 'Precio por piso al mes', pdf: { t: 'Tu tiempo' }, a: { t: '2,50 a 3,50 € por piso en el plan básico; con chat IA y estadísticas, 117,08 € al mes con 30 pisos' }, us: { t: '50 € al mes sin IVA hasta 30 pisos, todo incluido, pago anual (1,67 € por piso con 30)' } },
  { row: 'Conserje con IA', pdf: { t: 'No', no: true }, a: { t: 'En planes superiores' }, us: { t: 'Incluido' } },
  { row: 'Estadísticas de uso', pdf: { t: 'No', no: true }, a: { t: 'En planes superiores' }, us: { t: 'Incluidas, anónimas' } },
  { row: 'Idiomas', pdf: { t: 'Los que traduzcas' }, a: { t: 'Traducción automática' }, us: { t: '13, árabe de derecha a izquierda' } },
  { row: 'Lugares de la zona', pdf: { t: 'Los escribes tú' }, a: { t: 'Se importan de Google' }, us: { t: 'Se importan de Google y se comparten entre los pisos de la zona' } },
  { row: 'La tele del salón', pdf: { t: 'No', no: true }, a: { t: 'No', no: true }, us: { t: 'Gratis la app; el aparato, opcional si tu tele no la admite' } },
  { row: 'Carta en vídeo de los restaurantes', pdf: { t: 'No', no: true }, a: { t: 'No', no: true }, us: { t: 'Los que usan la carta de VisualTaste' } },
  { row: 'Mensajes al huésped (programados, bidireccionales)', pdf: { t: 'No', no: true }, a: { t: 'Sí' }, us: { t: 'No: te escribe por tu canal de siempre', plain: true } },
  { row: 'Conexión con programas de gestión', pdf: { t: 'No', no: true }, a: { t: 'Más de 40' }, us: { t: 'Todavía no', plain: true } },
  { row: 'Petición de reseñas', pdf: { t: 'No', no: true }, a: { t: 'Sí' }, us: { t: 'No', plain: true } },
  { row: 'Registro de huéspedes', pdf: { t: 'No', no: true }, a: { t: 'En planes superiores' }, us: { t: 'No', plain: true } },
];

export const FULL_COMPARE_SOURCES =
  'A: precios públicos de su calculadora en euros, con facturación anual, para 10 a 50 pisos, consultados el 4 de octubre de 2026; su web no dice si lleva IVA. Los nuestros, sin IVA.';

export const NOT_FOR_US: ReadonlyArray<readonly [string, string]> = [
  ['Quieres automatizar los mensajes', 'Si buscas que la herramienta escriba al huésped antes de llegar y le conteste por ti, hoy no lo hacemos.'],
  ['Todo tiene que salir de tu programa de gestión', 'Si necesitas que las guías se creen solas desde Guesty o Icnea, todavía no nos conectamos.'],
  ['Necesitas el registro de viajeros', 'No pedimos el DNI ni el pasaporte del huésped: para eso hay herramientas específicas.'],
];

export const FOR_US: ReadonlyArray<readonly [string, string]> = [
  ['Gestionas pisos en el Mediterráneo', 'Con huéspedes de muchos países: 13 idiomas sin traducir nada a mano.'],
  ['Quieres el conserje sin subir de plan', 'El conserje con IA y las estadísticas van en el precio, sin planes de arriba.'],
  ['Tus pisos tienen tele', 'La misma guía en el móvil y en la pantalla del salón, desde un solo panel.'],
];
