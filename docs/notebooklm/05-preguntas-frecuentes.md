# VisualTaste — Preguntas frecuentes sobre Guide, TV y Menú

> Documento de conocimiento para NotebookLM (4 de octubre de 2026). Preguntas y respuestas
> cortas, pensadas para consultas rápidas. El detalle está en los documentos 00 a 04.

## Producto

**¿Qué diferencia hay entre Guide, TV y Menú?**
Guide es la guía del apartamento en el móvil del huésped. TV es esa misma guía en la tele del
salón, manejada con el mando. Menú es la carta en vídeo de un restaurante, en el móvil del
comensal. Guide y TV comparten los mismos datos; Menú es el destino de los restaurantes que
recomiendan las otras dos.

**¿Hay que instalar alguna app?**
No. La guía y la carta se abren en el navegador. La TV, en producción, va en un APK de Android
TV que instala el anfitrión una sola vez; el huésped no instala nada.

**¿En qué idiomas está?**
En 13: español, inglés, francés, alemán, italiano, portugués, catalán, árabe (de derecha a
izquierda), ruso, ucraniano, chino, japonés y coreano. Si falta una traducción, sale en español.

**¿Qué ve el huésped en la guía?**
Cinco pestañas: Casa (WiFi, código de entrada, horas, normas, teléfonos), Lugares (mapa de la
zona), Comer (restaurantes), Tienda (productos y experiencias) y Conserje (chat de IA).

**¿Qué ve en la TV?**
Un inicio con el WiFi y su QR siempre a la vista, el código de la puerta y la hora de salida,
y cuatro capítulos: Guías rápidas, Dónde comer, Qué hacer y Tienda. Cada recomendación tiene un
QR que lleva la acción (la carta, una reserva o un pedido) al móvil. Tras 90 s sin tocar el
mando pasa a modo reposo.

**¿Qué ve el comensal en la carta?**
Un feed vertical de vídeos de los platos, con me gusta, alérgenos, una lista «Tu selección»
para enseñar al camarero y, en «La casa», reservas, pedido para llevar, tarjeta de sellos,
ofertas, avisos y valoración.

**¿La carta permite pedir y pagar en la mesa?**
No. «Tu selección» no envía nada: es una lista para enseñarla al camarero, que la ve en
español. El pedido a domicilio o para llevar sí se envía, por WhatsApp, al restaurante.

**¿Cómo se pide en la tienda de la guía?**
El huésped añade productos a un carrito ligero y pulsa pedir. El pedido se registra en el
servidor (con el precio recalculado allí) y se abre WhatsApp con el mensaje hacia el
anfitrión o hacia VisualTaste, según de quién sea el producto.

**¿El conserje de IA se puede inventar cosas?**
Responde solo con los datos cargados en la guía de ese apartamento. Si no lo sabe, lo dice y
remite al anfitrión. Si no hay restaurantes cargados, el contexto le prohíbe inventarse uno.
Tiene límites de uso por minuto y un presupuesto diario.

## Gestión (agencia o anfitrión)

**¿Cómo se da de alta un apartamento?**
En el admin (Apartamentos): a mano, desde una URL de la web del alojamiento o de su PMS
(lectura del JSON-LD `VacationRental`) o en masa desde un Excel o CSV. Los lugares de la zona
se importan desde Google Maps (superadmin). Booking.com no se puede importar.

**¿Hay que traducir la guía a mano?**
Los títulos de los bloques salen de un catálogo global ya traducido. El texto propio del
anfitrión se puede traducir con el traductor automático (Workers AI), que rellena los idiomas
que faltan sin pisar lo que ya está escrito. Las demos para agencias usan una plantilla ya
escrita en los 13 idiomas.

**¿Puede un piso esconder un sitio o un producto de su zona o de su agencia?**
Sí. Por defecto el piso ve todo el catálogo de su zona y de su agencia, y puede ocultar o
reordenar elementos concretos (`guide_apartment_items`). No es una lista de inclusión.

**¿Cómo se personaliza el aspecto?**
En la guía, con 3 colores y 3 tipografías de la agencia (página Diseño). El sistema corrige el
contraste para que todo se lea. En la carta, con los 5 «Colores Reels» del restaurante. En la
TV, con los mismos colores de la agencia y las imágenes de las teselas, que se pueden sustituir.

**¿Cómo se empareja una TV?**
Admin → Pantalla TV → crear dispositivo. Sale un código de 6 caracteres y un QR con
`tv.visualtastes.com/#<código>`. La TV queda vinculada a ese apartamento.

**¿Cómo sé si una TV está funcionando?**
Admin → Pantalla TV enseña el estado de toda la flota: en línea (señal hace menos de 45 min),
intermitente o perdida (más de 3 días sin señal). Una TV encendida da señal cada 30 minutos.

**He cambiado algo en el admin y no se ve. ¿Por qué?**
Las respuestas van en caché KV con una versión que el admin sube en cada edición, así que
normalmente se ve al momento. Si lo que cambió es la *forma* de los datos (un despliegue de
código), hay que subir la versión a mano (`ver:apt:<slug>` o `ver:restaurant:<slug>`). La TV
refresca sus datos cada 30 minutos.

**¿Cuánto tarda en llegar a la TV un cambio?**
Hasta 30 minutos (su intervalo de refresco), o al momento si se cambia de idioma o se reinicia la app.

## Analítica y privacidad

**¿Por qué no hay banner de cookies en la guía ni en la carta?**
Porque la medición no escribe nada en el móvil: la identidad de cada visita es un hash diario
calculado en el servidor con un salt aleatorio que caduca. Sin acceso al terminal no aplica el
art. 22.2 de la LSSI. Cuando hubo banner, la analítica se quedó prácticamente a cero.

**¿Se puede saber si un huésped vuelve otro día?**
Solo si dio su permiso (en `/legal` en la guía, o con el «Sí» de la bienvenida de la carta).
Sin permiso, cada día es un visitante nuevo, a propósito.

**¿Cómo sabe VisualTaste que un restaurante recibió un cliente gracias a la guía?**
Por tres caminos: el clic desde la guía o la TV (lleva el apartamento en la URL), el QR de la
mesa escaneado el mismo día (se cruza por el hash del día) o, con permiso, una cookie o id que
dura más. «Convertido» significa que, además, el comensal escaneó el QR físico de la mesa.

**¿Quién ve las conversiones?**
Solo el superadmin de VisualTaste. La agencia ve sus clics, no las conversiones, y el
restaurante tampoco las ve: son la base para negociar comisiones o posiciones de pago.

**¿Qué mide la TV?**
Las veces que se usa la pantalla, las secciones abiertas, las consultas del WiFi, las
recomendaciones vistas y los QR de carta y de reserva mostrados. Nada que identifique a quien mira.

**¿Cómo se distingue la publicidad de una recomendación?**
«Destacado» es la recomendación editorial del anfitrión. «Promocionado» es una posición de
pago con fechas de vigencia. Los enlaces de afiliado se marcan como retribuidos. La guía y la
TV lo avisan al huésped.

## Técnica

**¿Dónde está el código de cada cosa?**
- Guía: `apps/guide`; backend en `workerGuide.js`, `workerGuideAdmin.js`,
  `workerGuideTracking.js`, `workerGuideAI.js`, `workerGuideStore.js`,
  `workerGuideTranslate.js`, `workerGuideImport.js`, `workerGuideApartmentImport.js`,
  `workerGuideApartmentLink.js` y `workerGuideCache.js`.
- TV: `apps/tv` (interfaz en `src/mir/`), `apps/tv-landing` y `workerTvScreen.js`.
- Carta: `apps/client/src/carta`; backend en `workerReels.js` y `workerTracking.js`.
- Compartido: `workerVisitorHash.js` (identidad anónima), `workerAiBudget.js` (cupo de IA),
  `workerAuthz.js` (permisos) y `workerCors.js` (orígenes).

**¿Cuál es el endpoint principal de cada producto?**
Guía: `GET /guide/:slug?lang=`. TV: `GET /guide/tv/config/:pairingCode?lang=` (devuelve el
mismo JSON que la guía). Carta: `GET /restaurants/:slug/reels?lang=`.

**¿Por qué la TV no descarga la app desde internet cada vez?**
Porque el WiFi de un apartamento turístico falla justo al encender. El shell va dentro del APK
y solo los datos van por red, con reintentos y sin volver nunca a la demo si ya hubo datos reales.

**¿Por qué la URL de una guía tiene letras raras al final?**
Es un sufijo aleatorio de 8 caracteres para que la URL no se pueda adivinar a partir del
nombre del piso publicado en Airbnb: la guía es pública y lleva el WiFi y el código de la puerta.

**¿Qué modelo de IA se usa?**
Gemma 4 26B A4B en Cloudflare Workers AI, siempre con el razonamiento desactivado. Lo usan el
conserje de la guía (unas 38 neuronas por mensaje) y el traductor (unas 47 neuronas por POI a
12 idiomas). Comparten un presupuesto de 9.000 neuronas al día; el plan gratuito no puede
generar factura.
