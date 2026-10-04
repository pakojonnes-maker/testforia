# VisualTaste TV — La pantalla de bienvenida del alojamiento

> Documento de conocimiento para NotebookLM (4 de octubre de 2026). Fuentes: `apps/tv`,
> `apps/tv-landing`, `workerTvScreen.js`, `scripts/build-tv-site.mjs`,
> `apps/admin/src/pages/guide/GuideTvPage.tsx` y `tvHealth.ts`, y las migraciones 0056, 0092 y 0093.

## 1. Qué es

VisualTaste TV convierte **la televisión del salón en la recepción del alojamiento**. Al
encenderla, el huésped ve el WiFi con un QR para conectarse sin teclear, el código de la
puerta, la hora de salida y lo mejor de los alrededores (dónde comer, qué hacer y la tienda
del anfitrión), en su idioma.

Es **la misma guía** que la del móvil (Guide), contada para verse a tres metros: la TV
pide exactamente los mismos datos que `GET /guide/:slug`. Si el anfitrión ya usa la guía
digital, la TV la aprovecha tal cual y todo lo que cambie en el panel se refleja en la pantalla.

Mensajes de venta (landing `tv.visualtastes.com`):
- «La bienvenida empieza en la tele.»
- «13 idiomas, árabe incluido · 0 apps que instalar · 1 sola guía, en el móvil y en la tele.»
- Responde a las cuatro preguntas de siempre: la clave del WiFi, la hora de salida, el código
  de la puerta y dónde cenar.
- Tres pasos: **contarlo una vez** en el panel, **emparejar** la pantalla con un código y
  **recibir** (no hay que volver a tocar la tele).
- «Mide la pantalla, no a tus huéspedes»: cada evento guarda solo qué se abrió, en qué
  pantalla y en qué idioma.
- Hoy funciona en televisores con **Android TV** (Philips, TCL…).

## 2. Cómo se instala y cómo arranca

- **En producción** la app va **empaquetada dentro de un APK** de Android TV (un envoltorio
  WebView con los ficheros locales: `npm run build:apk` compila con rutas relativas). Así el
  shell arranca **sin red**. El WiFi de un apartamento turístico es poco fiable justo al
  encender (portal cautivo, DNS lento), y una hoja de estilos remota bloqueaba el pintado: la
  tele se quedaba en blanco. Por eso las fuentes van autoalojadas y nada se descarga al arrancar.
- **Solo los datos van por red**: `GET /guide/tv/config/:pairingCode`.
- `tv.visualtastes.com` es el canal de **demo y pruebas**, y la fuente del build que se copia al APK.

### Tres formas de identificar la pantalla (`useGuidebook.ts`)
1. **Código de emparejamiento en el hash**: `tv.visualtastes.com/#H7K4P2`. Es una TV real:
   pide `/guide/tv/config/:code`, actualiza su «última señal» y **sí** envía analítica.
2. **Slug en la ruta**: `tv.visualtastes.com/<slug-del-piso>`. Es el **modo demo o vista
   previa**: pide `/guide/:slug` (como la guía del móvil) y **no** envía analítica porque no hay
   ninguna TV real que medir.
3. **Sin nada**: datos ficticios de demostración, con el aviso «datos de demostración».

### Robustez de red
- **Refresco cada 30 minutos**: una TV se enciende una vez y se queda semanas encendida; sin
  esto enseñaría para siempre lo que descargó el día del montaje.
- **Reintentos con espera exponencial** (con techo) y reintento inmediato al volver la red.
- **Nunca se degrada a la demo si ya hubo datos reales**: un corte de WiFi a las 3 de la
  mañana no puede convertir la tele de un huésped en el piso de demostración con un WiFi falso.

### El emparejamiento
- El anfitrión entra en **admin → Pantalla TV**, elige el apartamento y crea un dispositivo:
  `POST /guide/admin/tv/devices` genera un **código de 6 caracteres** sin los caracteres que
  se confunden en pantalla (sin O/0 ni I/1).
- El admin enseña un **QR** con `tv.visualtastes.com/#<código>`. La TV queda vinculada a ese
  apartamento.
- Una TV se puede **desactivar** sin perder su código (`PATCH /guide/admin/tv/devices/:id`).

## 3. La interfaz «Mirador» (la actual)

Desde el 21 de septiembre de 2026 hay **dos interfaces en el mismo paquete**:
- **«Mirador»** (`src/mir/`, diseño «TV Mediterránea»), la que ve el huésped.
- **La clásica** (`App.tsx` + `screens/`), un mosaico de fotos, accesible con `?diseno=clasico`
  y guardada en la etiqueta git `tv-antes-del-rediseno` por si hay que volver atrás. Tocar
  `screens/HomeScreen.tsx` no cambia nada de lo que se ve.
- Las dos comparten `lib/`: datos, mando, textos y analítica.

### Principios de Mirador
- **Lienzo fijo de 1920×1080**, escalado a la pantalla real sin deformarse. El lienzo es la
  **zona segura**: nada se recorta. Si la pantalla no es 16:9, el fondo (muro, arcos,
  carruseles) se estira hasta el borde (el «sangrado», con `--bleed-x/--bleed-y`) en vez de
  dejar un marco liso.
- **La letra escala con la pantalla**, sin ajustes por pulgadas, y no baja de 26 px del lienzo.
- **Luz del día**: el color se gradúa con la hora local —**mañana** (7:00–12:00), **tarde**
  (12:00–19:30), **atardecer** (19:30–21:30) y **noche**—, sin animación.
- **10-foot UI**: se maneja **solo con el mando** (flechas, OK y Atrás). Navegación espacial
  propia (`lib/spatialNav.tsx`). Todo lo interactivo tiene foco visible. «Atrás» =
  Backspace/Escape; el botón atrás de Android llega mediante el puente `window.vtTvBack()`,
  que devuelve `false` en el inicio para que el sistema actúe.
- **Lo táctil va al móvil con un QR**: la TV nunca intenta que el huésped navegue una web.
- **Sin iconos ni emoji**: el medio de transporte se dice con palabras («15 min a pie»), no con 🚶.

### Pantallas
| Ruta | Pantalla | Qué hace |
|---|---|---|
| `home` | **Inicio** | Un muro encalado con un gran arco abierto a la costa. A la izquierda, el saludo, un **índice tipográfico numerado** (01 Guías rápidas, 02 Dónde comer, 03 Qué hacer, 04 Tienda; el foco arranca en «Qué hacer») y la **placa del WiFi con su QR, siempre visible**. Sobre el arco, una repisa con el **código de la puerta** y la **hora de salida**. La foto del arco cambia según la fila enfocada (fundido de 900 ms). El foco recorre una sola columna vertical (idioma ↕ filas ↕ placa). |
| `wifi` | **WiFi** | Para quien no puede escanear y tiene que teclear: red y clave enormes en tipografía monoespaciada, para que I/l/1 y O/0 no se confundan. |
| `info` | **Guías rápidas** | Lista de apartados de la casa a la izquierda y hoja de lectura a la derecha, en una sola pantalla: recorrer la lista con el mando **es** leer. El código de entrada va en una caja fija encima. Si el texto no cabe, la hoja se enfoca y se desplaza con las flechas. |
| `collection` | **Colección** (comer / hacer / tienda) | Fila de «Destacados» y debajo una fila por categoría. Tarjetas en arco con el rótulo debajo, sobre la pared. Al volver de una ficha, el foco cae en la tarjeta de la que se salió. |
| `detail` | **Ficha** | Foto en arco a página completa (si hay varias fotos reales, rotan cada 6 s), nombre, datos y **un QR que lleva la acción al móvil**. Ni web ni horarios (desde octubre de 2026): una URL no se puede abrir en la tele y el horario suele estar desfasado. |
| `language` | **Idioma** | Azulejos con el nombre de cada idioma **en su propio idioma**, sin banderas («un idioma no es un país»). Cambiar de idioma vuelve a pedir los datos ya traducidos al backend. |
| (superpuesto) | **Reposo** | Tras **90 s sin tocar el mando** la tele pasa a ser un cuadro que rota cada 12 s entre la hora, el WiFi y una recomendación destacada con su QR. Cualquier tecla lo quita sin activar nada. Además protege la pantalla de quemarse. `?reposo=<s>` cambia el tiempo (0 lo desactiva). |

### Qué hace cada QR de una ficha (`lib/collections.ts`)
Los tres orígenes de contenido se normalizan a una sola forma; lo que cambia es la **acción**:
- **Restaurante** → QR a su **carta en vídeo** en el móvil
  (`menu.visualtastes.com/<slug>?ref=tv&apt=<apartamento>`, evento `menu_qr_shown`). Así la
  visita a la carta queda atribuida al apartamento y a la TV como origen.
- **Experiencia** → QR a **WhatsApp, teléfono o web** según el CTA ya resuelto por el worker
  (evento `booking_qr_shown`).
- **Lugar sin reserva** (playa, mirador) → cuenta como `poi_select`. Desde octubre de 2026 los
  lugares viven dentro de «Qué hacer», detrás de las experiencias reservables (perdieron su tesela).
- **Producto de la tienda** → botón explícito «Pedir»: crea el pedido en
  `POST /guide/store/orders` (queda registrado en D1) y **solo entonces** aparece el QR de
  WhatsApp. No se genera un pedido por cada producto que alguien mira de pasada. Si un
  producto está agotado, no se puede pedir.
- **Publicidad visible**: si el enlace es de afiliado o la posición está pagada, la ficha lo
  avisa (Directiva 2005/29/CE). Antes solo lo avisaba la guía del móvil.

### Imágenes de las teselas
- Ranuras: `eat`, `do`, `store`, `info`, `lang`, `stay`, `wifi` y `background` (fondo).
- Las de **serie van dentro del APK** (`apps/tv/src/assets/tiles`), así que la pantalla tiene
  su aspecto final aunque no haya red.
- El anfitrión puede **sustituir** cualquiera desde admin → Pantalla TV → Imágenes de la
  pantalla (`PUT /guide/admin/tv/tiles`; con `imageUrl: null` se restaura la de serie). Solo
  se guardan las excepciones (tabla `guide_tv_tile_images`, migraciones 0092 y 0093). Si la
  foto del anfitrión no carga, se usa la de serie.

### Textos e idiomas
- Todo texto visible sale de `src/lib/i18n.ts` (`getTvString`). El tipo **exige los 13
  idiomas**, porque hasta septiembre de 2026 la TV salía medio en español con el huésped en coreano.
- Árabe en RTL. Los nombres latinos dentro de frases RTL van aislados.

### Trampas técnicas conocidas
- `AnimatePresence mode="wait"` de framer-motion se atasca con React 19 + StrictMode. Se usa
  `motion.div` con `key` y solo fundido de entrada.
- StrictMode solo en desarrollo: en el procesador de un stick de TV, duplicar montajes cuesta de verdad.
- Las clases genéricas de `index.css` (p. ej. `.rail`) se cuelan en Mirador.
- La hora de entrada y salida sale primero de las columnas del apartamento y, si no hay, del
  texto libre. **Nunca se inventa un guion**.

## 4. Backend de la TV (`workerTvScreen.js`)

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `GET /guide/tv/config/:pairingCode?lang=` | Público | Resuelve el código → apartamento, actualiza `last_seen_at` y devuelve **el mismo JSON que `/guide/:slug`** (superficie `tv`, con su propia entrada de caché y el sub-id de afiliado `<slug>-tv`), más las imágenes de teselas sustituidas |
| `POST /guide/tv/track` | Público | Registra un evento de analítica (y también actualiza la última señal) |
| `POST /guide/admin/tv/devices` | Admin | Emparejar una TV nueva (genera el código) |
| `GET /guide/admin/tv/devices?apartment_id=` | Admin | TVs de un apartamento |
| `GET /guide/admin/tv/fleet` | Admin | **Toda la flota** visible para el usuario, con su última señal |
| `GET /guide/admin/tv/stats/:apartment_id` | Admin | KPIs para el anfitrión |
| `PATCH /guide/admin/tv/devices/:id` | Admin | Activar o desactivar |
| `GET/PUT /guide/admin/tv/tiles` | Admin | Imágenes de las teselas |

- **Orden en `worker.js`**: este módulo debe registrarse **antes** que el bloque
  `/guide/admin/` del guidebook, o esas rutas devuelven un 404.
- **Tablas**: `guide_tv_devices` (código, etiqueta, activo, emparejada el, última señal),
  `guide_tv_events` (tipo, pantalla, idioma, `target_id`, `tv_session_id`) y `guide_tv_tile_images`.

### Analítica de la TV
- Eventos válidos: `impression`, `screen_view`, `wifi_reveal`, `poi_select`, `menu_qr_shown`
  y `booking_qr_shown`.
- **Sesión de TV** = un uso de la pantalla por un huésped, no un arranque de la app. Se abre
  una nueva tras **30 min sin interacción**. La `impression` se emite **una sola vez por
  sesión** (antes se contaba una por cada carga de config, así que «impresiones» medía
  arranques y cambios de idioma).
- `wifi_reveal` se cuenta cuando el foco se posa en la placa del WiFi del inicio (un acto
  deliberado), una vez por visita al inicio. Si solo contara al abrir la pantalla de WiFi, el
  KPI caería a cero, porque el QR ya está a la vista.
- **KPIs del panel** (últimos 7 días, etc.): pantalla mostrada, secciones abiertas, WiFi
  consultado, recomendaciones vistas y QR de carta y de reserva mostrados. También salen el
  pivote diario, las sesiones totales, los eventos por sesión y los lugares más
  seleccionados (con su nombre).
- No se guarda nada que identifique a quien mira.

### Estado de la flota (`tvHealth.ts`, admin)
- La única fuente es `last_seen_at`. Una TV encendida vuelve a pedir su config cada 30 min.
- **En línea**: señal hace menos de **45 min**.
- **Perdida**: más de **3 días** sin señal (desenchufada, sin WiFi o sin la app).
- Entre medias, apagada o intermitente. El servidor no puede distinguir «apagada» de
  «desinstalada»; solo sabe cuánto lleva callada.
- El resumen ordena primero lo que hay que revisar.

## 5. `tv.visualtastes.com`: landing + app en el mismo dominio

- Un **único despliegue de Pages** (`visualtaste-tv`) sirve **dos apps**:
  - La **landing de venta** (`apps/tv-landing`: HTML + TypeScript sin framework, CSS propio,
    indexable y ligera) en la raíz.
  - La **app de la TV** en `/<slug>` (demo) y `/#<código>` (TV emparejada), en la misma URL.
- `src/tv-app.ts` decide **en el navegador** (el hash no llega al servidor): si la URL es de
  una pantalla, **sustituye el documento** por el `index.html` de la TV, que el build combinado
  deja en `/tv-shell/`, sin cambiar la URL.
- El sitio **no debe tener `404.html`**: sin él, Pages responde a cualquier ruta con
  `index.html`, que es como los slugs llegan a la landing.
- **Se despliega siempre combinado**: `node scripts/build-tv-site.mjs` → `dist-tv-site` →
  `wrangler pages deploy dist-tv-site --project-name=visualtaste-tv`. Subir una sola de las dos
  apps borraría la otra; un hook (`pre-deploy-guard`) lo bloquea.
- La landing **no hace ninguna petición a terceros** desde el código (fuentes autoalojadas, sin
  analítica externa), en coherencia con la privacidad del producto. Ojo: el borde de
  Cloudflare inyecta su beacon de Web Analytics en el dominio real.
- `apps/tv-landing/public/img/` es una **copia** de las teselas de la TV y `src/lib/theme.ts`
  copia el `buildTheme` de la TV: no se importan, para no acoplarse a una app con cambios en curso.
- El proyecto `visualtaste-tv-landing.pages.dev` ya no se usa; si alguien entra por ahí con un
  enlace de pantalla, se le reenvía a `visualtaste-tv.pages.dev`.

## 6. Historia y decisiones
- **Oct 2026**: la Ficha deja de enseñar web y horario; los lugares pasan a «Qué hacer»; la
  pantalla se llena hasta el borde (sangrado); el admin enseña el estado de todas las TVs de un vistazo.
- **Sep 2026**: rediseño «Mirador» (lienzo fijo, luz del día, reposo, guías en lista + hoja,
  selector de idioma sin banderas); textos obligatorios en 13 idiomas; teselas de serie dentro del APK.
- **Error histórico**: la TV comparaba `action_type === 'whatsapp'` en minúsculas contra el
  `'WHATSAPP'` del backend y **no enseñaba nunca un QR de reserva**. Desde entonces el CTA lo
  resuelve el servidor y el tipo es una unión cerrada (`'URL' | 'WHATSAPP' | 'PHONE' | 'COUPON'`).
- **Error histórico**: «Tu estancia» salía con un guion porque las horas de entrada y salida
  existían en la base de datos pero nunca se devolvían; la TV las adivinaba con una expresión
  regular sobre el texto libre.
