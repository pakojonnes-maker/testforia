# VisualTaste Guide — El guidebook digital del apartamento turístico

> Documento de conocimiento para NotebookLM (4 de octubre de 2026). Fuentes: `apps/guide`,
> `workerGuide*.js`, `workerVisitorHash.js`, `workerAiBudget.js`, `apps/admin/src/pages/guide`
> y las migraciones 0050–0100. Es la parte del producto en la que más se está trabajando ahora.

## 1. Qué es y qué problema resuelve

Guide es la **guía digital de un alojamiento turístico**: una web que el huésped abre en su
móvil escaneando un QR o desde un enlace en la confirmación de la reserva. No hay que
instalar nada. Sale en el idioma del móvil (13 idiomas) y con los colores y tipografías de
la agencia que gestiona el piso.

Su promesa comercial (landing de `guide.visualtastes.com`) es responder a las cuatro
preguntas que todo huésped hace, normalmente a las once de la noche:

1. «¿Cuál es la clave del WiFi?» → es lo primero que ve, con un botón para copiarla.
2. «¿Cuál es el código de la puerta?» → en grande, y con cómo recogerlo si hace falta.
3. «¿A qué hora es la salida?» → la hora y cómo se hace, paso a paso.
4. «¿Dónde cenamos hoy?» → los restaurantes de confianza del anfitrión, a un toque.

Y, además, es un **canal de ingresos**: experiencias con enlace de afiliado, productos de
tienda que se piden por WhatsApp y recomendaciones de restaurantes cuya visita se puede
atribuir y cobrar.

El onboarding de la agencia tiene tres pasos: rellenar la guía en el panel (o importar el
piso desde su web o desde un Excel, y los lugares desde Google Maps), imprimir el QR del
piso y dejar que el huésped lo escanee.

## 2. Rutas de la app (`apps/guide`)

| Ruta | Qué es |
|---|---|
| `/` | Landing comercial (venta del producto a agencias). Se prerenderiza en el build para que los bots de IA, que no ejecutan JS, lean el HTML y el JSON-LD. |
| `/legal` | Privacidad, aviso legal y el panel para activar o desactivar el «recuerdo entre visitas». El idioma llega por `?lang=`. |
| `/:slug` | La guía de un apartamento concreto. |

La pestaña activa se guarda en la URL (`?t=discover`, `?t=restaurants`…). Así el botón
«atrás» del móvil vuelve a la pestaña anterior en vez de sacar al huésped de la guía, y un
enlace compartido abre la misma pestaña.

**El slug no se puede adivinar** (migración 0089). Antes se derivaba solo del nombre del piso
(`atico-balcon-europa`), que está publicado en Airbnb y Booking, y la guía es pública e
incluye la clave del WiFi y el código de la puerta. Ahora lleva un sufijo aleatorio de 8
caracteres hexadecimales (unos 4.300 millones de combinaciones). Además, `public/_headers`
marca todas las guías como `noindex`: solo la landing se indexa.

## 3. Las cinco pestañas

La barra inferior tiene cinco pestañas, solo texto y sin iconos. Se puede pasar de una a
otra deslizando el dedo en horizontal, salvo en el mapa, los carruseles y los campos de texto.

| Clave interna | Barra inferior (es) | Título largo | Contenido |
|---|---|---|---|
| `info` | **Casa** | Casa | Bienvenida, bloques de la casa, teléfonos, destacados, tienda |
| `discover` | **Lugares** | Ubicaciones | Mapa a pantalla completa con los POIs de la zona |
| `restaurants` | **Comer** | Restaurantes | Restaurantes recomendados, filtro por cocina |
| `services` | **Tienda** | Tienda | Productos con carrito por WhatsApp + experiencias |
| `chat` | **Conserje** | Chat IA | Asistente de IA que responde con los datos de la guía |

### 3.1 Casa (`info`)
- **Cabecera de bienvenida** (`WelcomeHero`): foto de portada del piso, nombre, dirección,
  logo de la agencia y selector de idioma.
- **Bloques de información** (`InfoSection`): un mosaico de teselas, una por bloque (WiFi,
  check-in, check-out, código de entrada, lavadora, aire acondicionado, normas, basura…).
  Cada bloque es una fila de `guide_apartment_info` con su texto traducido.
  - El **título** sale del **catálogo global de categorías** (migración 0083: 58 categorías en
    9 grupos —llegada, conectividad, confort, electrodomésticos, casa, exterior, seguridad,
    alrededores, hotel— más «otro»), traducido una sola vez para toda la plataforma. El
    anfitrión solo escribe el texto, que es lo que de verdad cambia de un piso a otro. Si
    quiere, puede poner un título propio (`use_custom_title`).
  - **Foto**: la del propio bloque (`guide_apartment_media`) o, si no hay, la foto de stock
    de la categoría. Sin foto, la tesela usa color y numeral.
  - El texto es **plano**: se parte en párrafos y títulos numerados, sin markdown.
  - El bloque de **código de entrada** abre una hoja propia (`EntryCodeModal`) con el código
    en grande, dónde recogerlo (`pickup_instructions`) y un botón «Cómo llegar» si el punto
    de recogida tiene coordenadas propias.
- **Teléfonos** (`PhonesModal`, migración 0084): agencia primero, luego policía, bomberos,
  ambulancia y otros. Al crear un piso se siembran unos teléfonos por defecto.
- **Carrusel de destacados** (`FeaturedCarousel`): restaurantes, experiencias y productos
  marcados como destacados o promocionados.
- **Escaparate de producto** (`ProductBillboard`): productos de la tienda.
- **Modal de bienvenida** (`WelcomeModal`, migración 0077): una hoja que sube desde abajo, una
  vez por carga de página, con foto, título, texto y una acción opcional. Es solo
  informativo (desde la migración 0057 ya no capta leads).

### 3.2 Lugares (`discover`) — el mapa «tipo Airbnb»
- Mapa **Leaflet** a pantalla completa, una barra de búsqueda flotante y una **hoja inferior
  de tres alturas** (asomando, media y completa).
- Las chinchetas van numeradas y el número coincide con la fila de la lista.
- **Filtros**: interruptores gratis/de pago (los dos activos por defecto) y chips de
  categoría, ocultos hasta pulsar «Filtros». Orden canónico de las categorías: playas,
  cultura, naturaleza, actividades, restaurantes, compras, otro.
- **Distintivo de acceso** (`AccessBadge`): `free`, `paid` o `mixed`, para que un museo de
  pago no parezca igual que una cala gratuita.
- **Selector de ciudad**: las ciudades hermanas de la misma región (Costa del Sol), cada una
  con su número de POIs. La ciudad del piso viene en la respuesta principal, con el orden y
  lo oculto por el anfitrión; otra ciudad se pide a `GET /guide/:slug/explore?zone=` (el
  catálogo completo de esa zona) y se guarda en memoria para no volver a pedirla.
- **Distancias**: en la zona del piso se usa el tiempo y el medio que ha escrito el
  anfitrión o la importación («15 min a pie»). En otra zona, la distancia en línea recta
  desde el piso (haversine), sin icono de medio de transporte para no aparentar una precisión
  que no tiene.
- Los restaurantes importados de Google no salen en el mapa: tienen su propia pestaña.

### 3.3 Comer (`restaurants`)
- Columna de tarjetas: foto en arco (o la inicial), tipo de cocina, nombre y acciones.
- **Chips por tipo de cocina**: solo aparecen si filtrar sirve de algo, y «Marisco» y
  «marisco » cuentan como la misma categoría.
- **Dos orígenes de restaurante**, fusionados en una sola lista:
  1. **Clientes de VisualTaste** (`restaurants` + `guide_zone_restaurants`): tienen slug y
     botón **«Ver carta en vídeo»**, que abre `menu.visualtastes.com/<slug>?ref=guide&apt=…&gsid=…`.
  2. **Restaurantes traídos de Google** (migración 0095): filas de `guide_pois` con
     categoría «Restaurantes». No tienen carta, pero sí «Reservar» y «Cómo llegar».
- **«Reservar»** solo sale si hay algún canal (teléfonos sin duplicados, WhatsApp, URL de
  reserva comprobada como http(s)). El worker lo limpia (`buildReservation`).
- **«Cómo llegar»** abre Google Maps con el enlace exacto si existe o, si no, con la dirección
  en texto.
- **Portada del restaurante**: la foto de un plato, siempre una imagen, nunca un vídeo. Se
  prefiere una subida real de entre 20 KB y 1,5 MB, el plato destacado y un desempate estable.
- Va acompañada de una **divulgación comercial** (aviso de publicidad).

### 3.4 Tienda (`services`)
- **Productos** en una rejilla de dos columnas, con un **carrito ligero** que solo vive en
  memoria (es un pedido de la estancia, no un carrito de e-commerce).
- Tres ámbitos de producto (migración 0080 y posteriores):
  - `host`: solo de este piso (late checkout, limpieza extra…).
  - `agency`: catálogo de la agencia, sale en **todas** sus propiedades. Las excepciones se
    ocultan o recolocan por piso, sin duplicar el producto.
  - `platform`: catálogo de VisualTaste (aceite, queso, productos locales), visible en
    todas las guías; solo lo edita el superadmin.
- **Pedido**: `POST /guide/store/orders`. El pedido **se guarda en D1 antes de abrir
  WhatsApp**, con el precio recalculado en el servidor (nunca se confía en el precio que
  manda el móvil) y el nombre del producto congelado en español. Si el carrito mezcla
  productos del anfitrión y de la plataforma, se parte en varios pedidos, uno por número de
  WhatsApp. Límites: 10 líneas, 20 unidades por producto y 8 pedidos por hora por visitante.
- Debajo, las **experiencias** de la zona (`is_bookable`): tarjeta con precio, duración, a
  qué distancia está y un botón cuyo canal (URL, WhatsApp, teléfono o cupón) ya viene
  resuelto del worker.

### 3.5 Conserje (`chat`) — asistente de IA
- Endpoint público `POST /guide/ai/chat`, respuesta en streaming (SSE).
- Modelo: **Gemma 4 26B A4B** en Workers AI, **con el razonamiento desactivado**
  (`enable_thinking: false`). En una batería de 12 preguntas en 10 idiomas (29-sep-2026)
  acertó las 12, a unas 38 neuronas por mensaje, frente a 10 de 12 y unas 59 neuronas de
  Llama 3.1 8B.
- **Contexto**: se construye a partir del **mismo JSON** que ve el huésped (`GET /guide/:slug`,
  normalmente desde KV): propiedad, dirección, check-in y check-out, WiFi, contactos, nota de
  bienvenida, bloques de la casa (hasta 10.000 caracteres), tienda (12), experiencias (10) y
  restaurantes (12). Por eso no recomienda nada que el piso haya ocultado y sabe la clave del WiFi.
- **Tarjetas de recomendación**: el modelo cierra su respuesta con un marcador oculto
  `<!--RECS:tipo:id,…-->` (hasta 3). El frontend lo convierte en tarjetas con su botón real y
  solo enseña una tarjeta si su nombre aparece en el texto (los modelos a veces copian mal la
  referencia).
- **Saludo inicial**: es una plantilla, no IA. Sale al instante, no gasta cupo y es impersonal
  a propósito, porque en muchos idiomas un «querido huésped» marca género.
- **Guardarraíles**:
  - Mensajes de 800 caracteres como mucho e historial de 10 mensajes.
  - Del historial solo pasan los roles `user`/`assistant`. Antes se podía colar un mensaje
    `system` y reescribir las instrucciones.
  - El contenido del anfitrión va dentro de `<guide_data>` y se limpia de etiquetas.
  - Límite por minuto: 20 peticiones por IP y 6 por visitante (binding `ratelimits`, no KV).
  - **Presupuesto diario en neuronas reales** (`workerAiBudget.js`, tabla `ai_usage_daily`):
    tope total de 9.000 al día, el chat como mucho 4.000 (unos 100 mensajes) y 1.200 por
    piso. El traductor usa lo que el chat no gasta, menos una reserva de 1.500 para el chat.
  - Si no hay restaurantes cargados, el contexto lo dice («never make up a restaurant name»)
    para que el modelo no se invente uno.

## 4. Tema visual de cada agencia

- La agencia elige en el admin (página **Diseño**) **tres colores** (primario, secundario,
  acento) y **tres tipografías** (titulares, cuerpo, etiquetas). Las opciones de color y fuente
  salen de `apps/admin/src/lib/guideDesign.ts`.
- `src/theme/` convierte esos tres colores en las variables CSS `--g-*` (`--g-fill`,
  `--g-text`, `--g-mark`, `--g-second`, `--g-accent`, `--g-ff-head/body/label`…) y **corrige el
  contraste lo mínimo**: si un terracota no se lee ni con blanco ni con tinta, lo oscurece o
  aclara lo justo. Hay un test (`npm run test:theme`).
- Solo son fijos el papel, la tinta y la arena. Nunca hay un color de marca escrito a mano en
  el CSS.
- En árabe se invierte la maquetación (`dir="rtl"`) y los números del anfitrión van aislados
  (`<bdi>`) para que no se desordenen.

## 5. El backend de la guía

### 5.1 Endpoints públicos (sin login)
| Método y ruta | Módulo | Qué hace |
|---|---|---|
| `GET /guide/:slug?lang=xx` | `workerGuide.js` | La guía completa del apartamento (un solo JSON) |
| `GET /guide/:slug/explore?zone=&lang=` | `workerGuide.js` | POIs de otra ciudad de la región |
| `POST /guide/track/session/start` · `/session/end` · `/intent` · `/section-view` | `workerGuideTracking.js` | Analítica |
| `POST /guide/ai/chat` | `workerGuideAI.js` | Conserje de IA (SSE) |
| `POST /guide/store/orders` | `workerGuideStore.js` | Registrar un pedido de la tienda y devolver el enlace de WhatsApp |

### 5.2 Forma del JSON de `GET /guide/:slug`
```
{ success, apartment: { id, name, slug, address, cover_image_url, latitude, longitude,
                        checkin_time, checkout_time, wifi: { ssid, password, security },
                        info: [...bloques], phones: [...] },
  zone: { id, name, slug, region, country, latitude, longitude, cover_image_url, description },
  cities: [...ciudades hermanas con poi_count e is_home],
  agency: { id, name, logo_url, primary/secondary/accent_color, headline/body/label_font },
  pois: [...lugares con coordenadas],
  restaurants: [...clientes VisualTaste + traídos de Google],
  experiences: [...reservables, CTA ya resuelto],
  store_items: [...host + agency + platform],
  welcome_modal: {...} | null,
  meta: { lang, available_langs } }
```

Detalles importantes de cómo se construye:
- Se resuelve en **una sola pasada en paralelo**: zona, agencia, bloques de info, catálogo de
  la zona, restaurantes, modal de bienvenida, tienda, teléfonos y ciudades hermanas.
- **Lugares y experiencias son la misma tabla** (`guide_pois`, migración 0059) y salen en la
  misma consulta. `pois` es lo que tiene coordenadas (para el mapa) y `experiences` es lo
  reservable, tenga coordenadas o no. Una fila puede estar en las dos listas.
- **Visibilidad por piso** (migración 0094): por defecto el piso ve **todo** el catálogo de su
  zona. `guide_apartment_items` solo puede **ocultar** (`is_hidden`) o **recolocar**
  (`order_override`), nunca es una lista de inclusión. El modelo anterior era «todo o nada»:
  con añadir un solo sitio se excluían todos los demás.
- **Orden de todas las listas** (migración 0091), en tres niveles:
  1. **Promoción de pago vigente** (`promotion_rank` dentro de `promoted_from`/`promoted_until`).
  2. **Destacado editorial** (`is_featured`).
  3. **Orden manual** (primero el override del piso y luego el orden global de la zona), con
     un desempate final por id para que el orden sea estable. Antes los restaurantes se
     ordenaban con `RANDOM()` y ese «azar» se quedaba congelado en la caché.
- **CTA de una experiencia** (migración 0091): hay dos ranuras, la principal (normalmente un
  enlace de afiliado) y la secundaria. **Si la secundaria está rellena, manda.** El worker la
  resuelve, sustituye los marcadores (`{{apartment_name}}`, sub-id de afiliado
  `<slug>-guide` o `<slug>-tv`) y marca `cta_source: 'affiliate' | 'direct'` para avisar de
  la publicidad.
- **WiFi**: columnas propias `wifi_ssid`/`wifi_password` (migración 0079) o, si no hay, se lee
  del texto libre del bloque WiFi («Red: X / Contraseña: Y» en cualquier idioma). `security`
  vale `nopass` si no hay contraseña, porque declarar WPA sin clave rompía el autoconectado
  del QR de la TV.
- **URLs de media absolutas**: las fotos se sirven desde el worker (`/media/<clave R2>`) y los
  frontends están en otro dominio.

### 5.3 Caché KV versionada (la trampa recurrente)
- La clave de caché es `guide:{slug}:{lang}:v{versión}` (con `:tv:` delante de la versión para
  la superficie de la TV, porque los enlaces de afiliado llevan otro sub-id).
- La versión es `ver:apt:{slug}` en KV. **Cada edición en el admin la sube**
  (`touchGuideVersion`), y editar un POI o restaurante de la zona sube la de todos los pisos de
  esa zona (`touchZoneGuideVersions`). Así se gasta una escritura en KV por edición, y no 13
  borrados (uno por idioma), algo que con el límite de 1.000 escrituras al día era insostenible.
- **Desplegar el worker no invalida la caché.** Si cambia la *forma* del JSON, producción
  sigue sirviendo el viejo (`X-Cache: HIT`) hasta que caduque o hasta que alguien suba la
  versión a mano.
- La TV vuelve a pedir los datos cada 30 minutos; casi todas esas peticiones se sirven desde KV.

### 5.4 Endpoints de administración (`/guide/admin/*`, con JWT)
Autorización: el **superadmin** ve todo; el **personal de una agencia**
(`guide_agency_staff`) solo ve sus agencias. Las zonas, los POIs y las experiencias son de
superadmin, porque son contenido compartido.

- **Agencias**: listar, ver, crear (superadmin) y editar (colores, fuentes, logo).
- **Apartamentos**: crear, editar y borrar (superadmin, con confirmación y borrado en cascada).
  Bloques de info (crear y editar, reordenar, cobertura de traducción por idioma, importar
  traducciones en bloque, fotos y vídeos), teléfonos y orden y visibilidad del catálogo
  (`orderable`, `item-order`).
- **Catálogos globales**: categorías de info (con imagen por defecto) y de teléfono.
- **Zonas, POIs y experiencias** (superadmin), incluido «qué arrastra este POI» antes de
  borrarlo (pisos que lo usan, medios, clics).
- **Restaurantes por zona**: vincular y desvincular clientes de VisualTaste y buscar restaurantes.
- **Tienda**: catálogo con los tres ámbitos, mover un producto entre ámbitos, baja lógica y fotos.
- **Estadísticas**: panel, dispositivos, conversiones, experiencias, sesiones y detalle de una
  sesión, tienda y comisiones (`guide_commission_ledger`, con su resumen por estado).
- **Traducción automática**: `POST /guide/admin/translate` (superadmin, ver §6).
- **Importadores** (todos de solo lectura: devuelven una vista previa y la escritura real la
  hacen los endpoints normales, para que nunca se salten la autorización ni la invalidación de
  caché):
  - `import/places/preview`: POIs o restaurantes **desde Google Maps** (Places API New). Cruza
    con lo que ya existe (mismo `google_place_id`, «probable duplicado» por cercanía y nombre,
    «ya es cliente VisualTaste») y devuelve las diferencias campo a campo. El presupuesto se
    queda por debajo de las 1.000 llamadas gratuitas al mes del SKU más caro.
  - `import/apartments/preview`: alta masiva de pisos **desde Excel o CSV**. La plantilla se
    genera en el admin con las zonas y categorías reales y se procesa en el navegador. Lotes de
    40 filas, con geocodificación por Google.
  - `import/apartments/from-url`: alta de un piso **desde una URL**. Lee el JSON-LD
    `VacationRental` de la web del alojamiento o de su PMS (Lodgify, Guesty, Hostaway…), que
    Google exige para listarlo, con OpenGraph de respaldo. También acepta una URL de Google Maps
    o una dirección en texto. **Booking.com no se puede importar** (tiene un muro anti-bots y,
    a propósito, no se esquiva).

### 5.5 Pantallas del admin del guidebook (menú lateral)
Dashboard · Apartamentos · Pantalla TV · Diseño · Tienda (catálogo) · Imágenes de categorías ·
Restaurantes por zona · Conversión Restaurantes (esta última solo para superadmin).

## 6. Traducción automática (`workerGuideTranslate.js`)
- Rellena la tabla `translations` en los 12 idiomas que faltan a partir del español, **sin
  pisar lo que ya está escrito**. Nació para los POIs importados de Google, que llegan solo en
  español.
- Es un endpoint aparte y no un paso dentro del guardado: si la IA falla, el POI se guarda
  igual, la traducción se puede reintentar sola y sirve para traducir de golpe lo que ya existía.
- Coste medido: unas **47 neuronas y 13 s por POI** a 12 idiomas, sin razonamiento. Con el
  razonamiento activado eran 432 neuronas y 270 s, y solo salían 6 idiomas porque el JSON
  quedaba cortado.
- La cuenta está en el plan gratuito: al agotar las 10.000 neuronas diarias, Workers AI
  devuelve un error. **No puede generar factura.**

## 7. Analítica de la guía (resumen; detalle en el documento 04)
- Tablas: `guide_sessions`, `guide_section_views`, `guide_affiliate_intents` (clics en
  restaurantes, experiencias y productos), `guide_store_orders`/`_items` y `guide_commission_ledger`.
- **Anónima por defecto y sin banner**: la sesión se identifica con `visitor_day_hash`
  (SHA-256 de un salt aleatorio del día, la IP y el User-Agent), calculado en el servidor.
- Una sesión por apartamento y visita (cambiar de idioma **no** abre otra; antes un mismo móvil
  sumaba 17 sesiones en 2 días).
- El panel de la agencia enseña sesiones, visitantes únicos, «personas en el apartamento hoy»
  (con la zona horaria del navegador), dispositivos, secciones vistas y clics. La
  **conversión real** (el clic acabó en una visita confirmada por el QR de la mesa) es una
  vista **solo para el superadmin**: es la palanca para negociar con el restaurante y no se
  comparte ni con la agencia ni con el restaurante.

## 8. Legal y consentimiento en la guía
- `apps/guide/src/lib/consent.ts` **ya no gobierna la analítica**. Solo controla el «recuerdo
  entre visitas»:
  - `vt_guide_visitor_id`: UUID de 12 meses, para saber si el huésped ha vuelto otro día.
  - Cookie `vt_guide_ref` (30 días, en `.visualtastes.com`): atribuye una cena de días después
    en la que el huésped escanea el QR de la mesa. **Se escribe al tocar un restaurante, no al
    abrir la guía.**
- Viene **desactivado** y no se pregunta en ninguna parte. Se activa en `/legal`, desde el icono
  de privacidad de la cabecera.
- `/legal` tiene el texto completo en español e inglés; los otros 11 idiomas caen al inglés.

## 9. Demos para agencias (`scripts/demo-seed/`)
- Una **ficha JSON de unas 90 líneas** genera una agencia demo con un piso completo: 14 bloques
  de guía, 6 productos de tienda, teléfonos, modal de bienvenida y TV emparejada, **en los 13
  idiomas** (el contenido es una plantilla escrita a mano con `{{tokens}}`, sin pasar por la IA).
- El script no aplica nada: genera `seed.sql`, `teardown.sql` y un script de subida de imágenes.
- Nunca escribe en lo compartido (zonas, POIs, restaurantes): **reutiliza** lo que ya hay en la zona.

## 10. Historia y lecciones (por qué el código es como es)
- **Ago–sep 2026, el banner de consentimiento**: la analítica estuvo un mes detrás de un banner.
  Resultado: 1 sesión y 1 visitante en 30 días para toda una agencia, y «Rechazar» era
  definitivo e invisible. Se sustituyó por el hash diario anónimo (migración 0090).
- **Datos «fantasma»**: varios campos se guardaban desde el admin pero nunca se devolvían
  (horas de check-in y check-out, `booking_url`, coordenadas de las experiencias). Hoy se
  devuelven y los comentarios del código lo explican.
- **Restaurantes en orden aleatorio congelado en la caché** → orden de tres niveles.
- **Visibilidad «todo o nada»** (`guide_apartment_pois`) → overrides que solo ocultan o
  recolocan (migración 0094).
- **Slugs adivinables con el WiFi dentro** → sufijo aleatorio (migración 0089).
- **Chat inyectable** a través del historial → filtrado de roles, límites y presupuesto.
