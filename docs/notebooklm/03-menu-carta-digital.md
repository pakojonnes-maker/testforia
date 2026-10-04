# VisualTaste Menú — La carta digital en vídeo («Carta Mediterránea»)

> Documento de conocimiento para NotebookLM (4 de octubre de 2026). Fuentes: `apps/client`
> (sobre todo `src/carta/`), `workerReels.js`, `workerTracking.js`, `workerGuideCache.js` y las
> migraciones 0099, 0101, 0102 y 0103. Nombre interno de la app: **Gravy**.

## 1. Qué es

La carta digital de VisualTaste es la **carta del restaurante en formato vídeo vertical**,
como Reels o TikTok: cada plato ocupa la pantalla entera con su vídeo o su foto, y se pasa al
siguiente deslizando el dedo. El comensal la abre **escaneando el QR de su mesa**, sin
instalar nada, en `menu.visualtastes.com/<slug-del-restaurante>`.

Objetivos de producto:
- **Vender por los ojos**: el plato entra por la vista (más ventas por impulso).
- **Multilingüe de verdad**: 13 idiomas, y el árabe de derecha a izquierda.
- **Alérgenos claros**, con un aviso personal de lo que el comensal evita.
- **Puerta a los demás módulos** del restaurante: reservas, pedido para llevar o a domicilio,
  tarjeta de sellos, oferta de bienvenida, avisos push, valoración y redes.
- **Ser el destino de la guía y de la TV**: cuando un huésped llega desde Guide o desde la
  TV, la visita se atribuye al apartamento (ver el documento 04).

Un mismo build (`apps/client`) sirve **dos dominios**:
- `menu.visualtastes.com/<slug>` → **la carta**.
- `visualtastes.com/<slug>` → la **landing web** del restaurante (constructor de landings). La
  raíz `visualtastes.com/` es la portada comercial.
- Otras rutas: `/reserve/<slug>` (reservar), `/legal/privacy`, `/legal/aviso`, el canje de
  ofertas con enlace mágico (`/r/<token>` o `/<slug>/oferta/<token>`) y `/r/<slug>` (formato
  antiguo de carta). Una ruta más profunda, como `/<slug>/dish/123`, se reduce a la carta: ya
  no hay páginas por plato.

## 2. La experiencia del comensal

### 2.1 Arranque
- La carta se pide **ya en el idioma del comensal**: el que eligió antes en ese móvil o, si
  no, el del navegador. Antes siempre se pedía en español y luego se descargaba otra vez entera.
- Si el idioma no está entre los de esa carta, se usa el español. El español siempre está a
  mano porque es lo que lee el camarero.
- **Rendimiento**: el arranque **no carga MUI, framer-motion ni axios**. Antes eran unos
  235 KB comprimidos antes de pedir la carta. Tras el build, `index.html` solo debe precargar
  `vendor-react`. Las fuentes (Playfair + Montserrat) van empaquetadas; la tipografía árabe solo
  se descarga si alguien elige árabe.
- **Medios optimizados** (migración 0103): fotos recomprimidas a WebP de 1.600 px como mucho
  (p. ej., PNG de 7 MB que pasan a 72–87 KB) y vídeos con el índice delante, para que empiecen
  a reproducirse antes. El admin aplica la misma optimización al subir (`lib/mediaPrep.ts`).

### 2.2 Bienvenida
- Una hoja de bienvenida («Bienvenidos a… / Ver la carta / Más idiomas») tapa el tercio de
  abajo; el texto del plato espera a que se cierre.
- La misma bienvenida pregunta **«¿Te reconocemos la próxima vez que vengas?»**, con **Sí y No
  al mismo nivel**. Explica que se guarda un número aleatorio en el móvil durante 12 meses
  para que el restaurante sepa que has vuelto, sin tu nombre y sin publicidad. Si el comensal
  cierra sin contestar, no hay id y se le vuelve a preguntar en la siguiente visita. Se cambia
  en Privacidad.
- La **oferta de bienvenida** (campaña de marketing del admin) no aparece encima de la
  bienvenida: espera a que el comensal haya pasado de plato o lleve 8 s mirando, y nunca
  encima de otro diálogo.

### 2.3 El feed (pantalla `reel`)
- **Un solo feed vertical con todos los platos**: al acabar una sección empieza la siguiente.
- Se navega arrastrando, con la rueda, con las flechas del teclado o **deslizando en horizontal
  para cambiar de sección**.
- Solo se montan el plato en pantalla y sus dos vecinos (precarga ligera).
- **Doble toque = me gusta** (corazón).
- **Vídeo vertical a pantalla completa**. Lo apaisado (casi todo lo que suben hoy los
  restaurantes) se ve entero en el tercio superior, sobre un fondo desenfocado de sí mismo,
  para que el plato no quede recortado ni tapado por el texto. Si un medio no carga, se prueba
  el siguiente.
- Distintivos: Destacado, Nuevo, Vegetariano, Vegano, Sin gluten. Precio vigente con el
  anterior tachado si hay descuento. **Media ración** si existe.

### 2.4 Las demás pantallas (`View`)
| Vista | Qué es |
|---|---|
| `ficha` | Ficha del plato: arco grande, descripción, ingredientes, alérgenos, ración y cantidad, «Añadir» |
| `carta` | **La carta en lista**, para quien prefiere leer de un vistazo |
| `sel` | **Tu selección**: lo que el comensal ha ido añadiendo, con el total. «No se envía nada: enséñasela al camarero para pedir.» |
| `camarero` | **Para el camarero**: la selección **siempre en español** (es lo que lee el personal), con el nombre en el idioma del comensal debajo y las cifras latinas también en árabe |
| `casa` | **La casa**: el índice de servicios del restaurante (ver abajo) |
| `idioma` | Selector de idioma; al cambiar, se vuelve al mismo plato |
| `alergenos` | **¿Qué evitas?**: el comensal marca lo que no puede comer y se le avisa en cada plato que lo lleve. Incluye «Alérgenos de esta carta» y el recordatorio «si tienes una alergia grave, confírmalo siempre con el camarero» |
| `avisos` | Activar o desactivar las **notificaciones push** (VAPID). En iPhone primero hay que añadir la carta a la pantalla de inicio |

El botón «atrás» del móvil recorre las pantallas. Los **me gusta**, los **alérgenos que
evita** y el **idioma** se guardan solo en el móvil (`usePrefs.ts`). Son preferencias
funcionales que pide el propio comensal y no salen del dispositivo, así que no dependen del
consentimiento. Hay una lista de «Lo que más gusta», con los me gusta de quienes han comido allí.

### 2.5 «La casa»: los módulos del restaurante
Cada acción aparece **solo si el restaurante la tiene activa**:
- **Reservar mesa** → `/reserve/<slug>` (motor de reservas propio: franjas, capacidad, lista de
  espera y enlace mágico para cambiar o cancelar).
- **Pedir para llevar o a domicilio** → diálogo de delivery: zonas, envío gratis a partir de un
  importe, pedido mínimo, horario propio, efectivo o tarjeta, aviso de privacidad y de
  alérgenos. El pedido **se envía por WhatsApp** al restaurante (siempre en español) o se llama.
- **Tarjeta de sellos** (fidelidad): un sello por visita, que el camarero confirma con un **PIN
  de 4 dígitos**; al completarla, el premio se canjea con un enlace mágico.
- **Oferta de bienvenida** (campaña de marketing).
- **Avisos** (push).
- **Valóranos**: estrellas; con nota alta se invita a dejar una reseña en Google y con nota baja
  se pregunta «¿en qué podemos mejorar?». Solo sale si aún no hay valoración o fue ≥ 4.
- **Nuestra web**, **WhatsApp** e **Instagram**.
- Los diálogos heredados (delivery, sellos, oferta, valoración e instrucciones para el iPhone)
  son **MUI** y viven en `carta/LegacyLayer.tsx`, que **se descarga la primera vez que se abre
  uno**. Desde la migración 0102 salen en el idioma del comensal; antes salían siempre en español.
- Nota: el antiguo «rasca y gana» y la captación de leads **se eliminaron** (migración 0057). La
  bienvenida ya es solo informativa y la fidelidad se rehízo con tarjeta de sellos.

## 3. Diseño y marca

- **Estilos**: Emotion + CSS propio (`carta.css`, todo bajo `.cm`). **Nunca Tailwind.**
- **Colores**: **solo** los 5 de «Colores Reels» del admin, que en `src/carta/theme.ts` se
  convierten en una paleta con contraste garantizado:
  - Primario → marca: botones, precios, corazón marcado.
  - Secundario → «hondo»: fondo del plato sin vídeo y de las miniaturas vacías.
  - Acento → marcas sobre el vídeo: pestaña activa, «Destacado», aviso de alérgeno.
  - Fondo → tinta (velos del vídeo y texto de las hojas).
  - Texto → papel (hojas, fichas, carta en lista).
  - Tinta y papel se separan al menos 7:1; el texto de un botón llega a 4,5:1. Si la marca se
    confunde con el velo del vídeo, el botón pasa al color de acento.
- La vista previa del admin usa una **copia** del tema (`apps/admin/src/theme/cartaTheme.ts`):
  si se cambia una, hay que cambiar la otra.
- **Iconos**: solo los de alérgenos (SVG que manda el servidor, con la inicial si no cargan) y el corazón.
- Arcos, papel, tinta, Playfair Display + Montserrat: la misma familia visual que la guía y la TV.

## 4. Textos e idiomas

- Los textos de la interfaz viven en D1: `localization_strings`, contexto `reels`, claves
  `carta_*` (migraciones 0099 y 0102), en los 13 idiomas. El español de respaldo está en
  `src/carta/strings.ts`, por si una clave aún no ha llegado.
- El contenido (platos, secciones, descripciones, raciones) se traduce en la tabla
  `translations` desde el admin del restaurante.
- **Excepciones a propósito**: el WhatsApp del pedido y la pantalla «Para el camarero» van en
  español, porque los lee el restaurante.

## 5. Backend de la carta

### 5.1 `GET /restaurants/:slug/reels?lang=&menu_id=` (`workerReels.js`)
Devuelve todo lo que la carta necesita en un solo JSON:
- `restaurant` (nombre, logo, portada, web, Instagram, enlace de reseña de Google, `branding`).
- `menu`, `sections` con sus platos (medios, alérgenos, raciones, precios, distintivos).
- `languages` (idiomas activos de esa carta), `template`, `config`, `overrides` (los colores
  `reel_*`), `theme`.
- `marketing` (campaña de bienvenida), `loyaltyProgram`, `reservationsEnabled`,
  `deliveryEnabled`, `deliverySettings` (WhatsApp, teléfono, métodos de pago, envío, mínimo,
  horario, días cerrados).
- `translations` (los textos de la interfaz).
- **Datos de cada visitante, siempre frescos y nunca en caché**: su valoración anterior y su
  tarjeta de sellos. Cachearlos se los enseñaría a cualquier otro que abriera la misma carta.

### 5.2 Caché KV de la carta
- Clave: `menu:{slug}:{lang}:{menu_id|default}:v{versión}`, con un TTL de 24 h. La versión es
  `ver:restaurant:{slug}`.
- **Todo endpoint que guarde algo que aparece en esa respuesta debe llamar a
  `touchMenuVersion`** (platos, secciones, datos del restaurante, campañas, delivery, sellos y
  reservas lo hacen). Si no, el admin guarda y la carta sigue igual hasta 24 h.
- Tras cambiar textos o la forma del JSON hay que subir `ver:restaurant:<slug>` a mano.
- Si KV falla al escribir, la carta se sirve igual (el `put` lleva `.catch`).
- Las consultas que solo dependen del restaurante van en **un solo `DB.batch`** (antes eran
  siete consultas en serie en cada fallo de caché).

### 5.3 Tracking de la carta (`workerTracking.js`)
- `POST /track/session/start`, `/session/end`, `/session/identify` (el «Sí» de la bienvenida),
  `/track/events`, `GET /track/analytics/*` y `POST /track/privacy/forget` (derecho al olvido).
- Eventos: `viewdish` (vistas), `favorite` (suma o resta, nunca baja de 0), `rating`, `share`,
  `dish_view_duration` (tiempo mirando un plato), `section_time`, `scroll_depth`,
  `media_error`, eventos del carrito (`cart_created`, `cart_item_added/removed/quantity`,
  `cart_opened`, `cart_shown_to_staff`, `cart_abandoned`), `heartbeat`, `click_delivery`,
  `delivery_order_initiated` y `delivery_call_clicked`.
- **QR de la mesa**: el parámetro `?qr=` se valida contra `qr_codes` y se registra en
  `qr_scans`. Antes se guardaba a ciegas y la atribución por QR estaba siempre a 0.
- **Medición anónima** (migración 0101, octubre de 2026): toda sesión lleva
  `sessions.visitor_day_hash`, haya o no consentimiento. Antes no se abría ninguna sesión sin
  aceptar un aviso de privacidad que además solo estaba en español: **16 sesiones en 30 días
  entre las 4 cartas en producción**.

### 5.4 Atribución desde la guía y la TV
Al abrir la sesión de la carta se decide de dónde viene el comensal (detalle en el documento 04):
- `guide`: llegó haciendo clic en la guía (`?ref=guide&apt=…&gsid=…`). Desde el QR de la
  TV llega con `?ref=tv&apt=…`.
- `guide_sameday`: escaneó el QR de la mesa **el mismo día** en que abrió la guía (se cruza por
  el hash del día; es una inferencia, no un clic).
- `guide_returning`: un comensal reconocido (con su permiso) que ya llegó antes desde la guía
  conserva el apartamento de origen.

## 6. Panel del restaurante (`admin.visualtastes.com`)
Menú lateral del restaurante: Estadísticas · Platos · Web · Generador QR · Reservas ·
Delivery · Marketing · Lealtad · Usuarios · Configuración. Desde ahí se gestionan los platos y
sus medios, los colores «Reels», los QR con estilo (`qr-code-styling`), el personal (con
roles) y la analítica (platos más vistos, tiempo de visionado, embudo del carrito,
dispositivos e idiomas).

## 7. Historia
- **Oct 2026**: la carta clásica se borró (queda en la etiqueta git `carta-clasica`) y la
  «Carta Mediterránea» (`src/carta/`) pasa a ser la única. Medición anónima (0101), diálogos
  heredados traducidos (0102) y medios optimizados (0103).
- La carta original era «el Ferrari» del producto: el módulo con el que nació VisualTaste,
  antes de que existieran la guía y la TV.
