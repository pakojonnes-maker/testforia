# VisualTaste — Datos, privacidad, analítica y atribución entre Guide, TV y Menú

> Documento de conocimiento para NotebookLM (4 de octubre de 2026). Es transversal: explica
> cómo se mide en los tres productos, cómo se conecta una guía con una carta y por qué el
> modelo de privacidad es como es. Fuentes: `workerVisitorHash.js`, `workerGuideTracking.js`,
> `workerTracking.js`, `workerTvScreen.js`, `apps/guide/src/lib/consent.ts` y las migraciones
> 0068, 0090 y 0101.

## 1. La lección que lo cambió todo

Entre el **6 de agosto y el 5 de septiembre de 2026**, la analítica de la guía estuvo detrás
de un banner de consentimiento *opt-in*. Resultado real en producción: **1 sesión y 1
visitante único en 30 días para toda una agencia**, con el panel a cero. Además, «Rechazar»
era definitivo e invisible: el banner no volvía a salir en ese dispositivo.

En la carta pasó lo mismo con un aviso de privacidad que solo estaba en español: **16
sesiones en 30 días entre las 4 cartas** en producción (medido el 3 de octubre de 2026). Y de
esas sesiones dependía también el contador de me gusta de cada plato.

**Decisión**: la medición es **anónima por defecto y sin banner**. Lo único que necesita
permiso (reconocer a la misma persona otro día) se pide aparte y no bloquea nada.
**No se vuelve a atar la analítica al consentimiento.**

## 2. La identidad anónima: el hash del día (`workerVisitorHash.js`)

```
visitor_day_hash = SHA-256( salt_del_día || IP || User-Agent ), truncado a 128 bits
```

- Se calcula **en el servidor**. **No se escribe nada en el móvil**: ni cookie, ni
  localStorage, ni huella del dispositivo. Como no se accede al terminal, no aplica el art. 22.2
  de la LSSI y no hace falta banner.
- El **salt es aleatorio**, vive en KV (`analytics:salt:YYYY-MM-DD`) y caduca a las 48 h (el día
  entero más el desfase entre la medianoche UTC y la local).
- **Es deliberado que el salt no se derive de un secreto estable.** Si fuera recalculable,
  VisualTaste podría reconstruir el hash de ayer para una IP y enlazar a la misma persona a lo
  largo de los días: sería un rastreador disfrazado. Al ser aleatorio y caducar, el vínculo
  desaparece de verdad y ni la propia empresa puede deshacerlo. **No se debe «optimizar» a un
  salt fijo.**
- **Consecuencia asumida**: con el hash no se puede reconocer al mismo visitante en días
  distintos. La recurrencia («ha vuelto 3 días») solo existe para quien dio su permiso.
- El mismo móvil tiene **el mismo hash el mismo día en `guide.` y en `menu.`**, y eso es lo
  que permite la atribución del mismo día (§5).
- `device_fingerprint` (la huella antigua) **ya no se escribe**: era la señal legalmente más
  problemática y la que peor funcionaba. La columna se conserva por el histórico.

**Regla para contar únicos** en cualquier estadística:
`COALESCE(visitor_id, visitor_day_hash, device_fingerprint, id)`.

## 3. Lo que sí pide permiso

| Producto | Qué se guarda en el móvil | Para qué | Dónde se activa |
|---|---|---|---|
| Guía | `vt_guide_visitor_id` (UUID, 12 meses) | Saber si el huésped vuelve otro día | `/legal` (icono de privacidad de la cabecera). Desactivado por defecto y no se pregunta |
| Guía y TV | Cookie `vt_guide_ref` (30 días, `.visualtastes.com`) | Atribuir una cena días después al apartamento | Igual; **se escribe al tocar un restaurante**, no al abrir la guía |
| Carta | id de visitante de 12 meses | Recurrencia y heredar la atribución de la guía (`guide_returning`) | Pregunta de la bienvenida de la carta, «¿Te reconocemos…?», con Sí y No al mismo nivel; cambiable en Privacidad |

Lo que **no** pide permiso porque es funcional y no sale del móvil: el idioma elegido, los me
gusta y los alérgenos que el comensal evita en la carta. También el id efímero que solo vive
en memoria y se usa para el límite de peticiones del chat o para un pedido de la tienda.

## 4. Qué se mide en cada producto

### Guía
| Tabla | Qué guarda |
|---|---|
| `guide_sessions` | Una por visita a la guía de un apartamento: dispositivo, sistema, navegador, país, ciudad, idioma, `visitor_day_hash`, `visitor_id` (si hay permiso), `visit_count` (por días distintos) y duración |
| `guide_section_views` | Pestañas vistas (Casa, Lugares, Comer, Tienda, Conserje) |
| `guide_affiliate_intents` | Clics con intención: restaurante (`click_menu`, reservar, cómo llegar…), experiencia y producto |
| `guide_store_orders` + `guide_store_order_items` | Pedidos de la tienda, registrados **antes** de abrir WhatsApp, con el precio recalculado en el servidor |
| `guide_commission_ledger` | Comisiones devengadas de la agencia (estado, importe), con su resumen por estado |

Reglas: una sesión por apartamento y visita (cambiar de idioma no abre otra), y la sesión se
cierra al ocultar o cerrar la página. El panel de la agencia enseña «personas en el
apartamento hoy» con la zona horaria del navegador, porque en UTC se vaciaba entre las 00:00 y
las 02:00 de Madrid.

### TV
`guide_tv_events`: `impression` (una por sesión de TV), `screen_view`, `wifi_reveal`,
`poi_select`, `menu_qr_shown` y `booking_qr_shown`, con pantalla, idioma, `target_id` y
`tv_session_id` (sesión = uso de la pantalla, cerrada tras 30 min sin mando). Nada que
identifique a quien mira. La «última señal» de cada TV (`last_seen_at`) sirve para saber si
está en línea.

### Carta
`sessions` (con `visitor_day_hash` desde la migración 0101), `events` (vistas de plato, tiempo
de visionado, me gusta, carrito, delivery…), `qr_scans` (qué QR físico se escaneó), métricas
diarias por plato y por sección, `cart_sessions` y valoraciones.

## 5. Atribución guía → carta (el corazón del modelo de negocio)

Hay tres caminos, y **solo uno necesita permiso**:

1. **Clic dentro de la guía** → la URL de la carta lleva
   `?ref=guide&apt=<apartamento>&gsid=<sesión de guía>`. No se guarda nada → `referral_source = 'guide'`.
   Desde la **TV**, el QR del restaurante lleva `?ref=tv&apt=<apartamento>` (el huésped lo
   escanea con su móvil) → `referral_source = 'tv'`. La carta guarda tal cual el valor de `?ref=`.
2. **QR de la mesa el mismo día** → al abrir la sesión de la carta sin parámetros, el
   servidor busca una sesión de guía **de hoy** con el mismo `visitor_day_hash`. Si existe →
   `referral_source = 'guide_sameday'`. Se marca distinto de `guide` **a propósito**: es una
   inferencia, no un clic declarado, y quien revise las comisiones tiene derecho a distinguirlas.
   Tampoco se guarda nada.
3. **QR de la mesa otro día** → solo funciona con la cookie `vt_guide_ref` (30 días, con
   permiso) o, en la carta, con el visitante reconocido que hereda el apartamento de origen →
   `guide_returning`.

La sesión de la carta guarda `referral_source`, `referral_apartment_id` y `referral_session_id`.

### El embudo de conversión (solo para el superadmin)
`GuideConversionsPage` → **clic** (`guide_affiliate_intents`) → **aterrizado**
(`sessions.referral_apartment_id`) → **convertido** (además, `sessions.qr_code_id`: el
huésped escaneó de verdad el QR físico de la mesa del restaurante).

«Convertido» es **la única prueba de visita real** que existe hoy. Es la palanca para
negociar una comisión o una posición de pago con el restaurante, y por eso **no se comparte
ni con la agencia ni con el restaurante**. La agencia ve sus clics, que no deben leerse como
si fueran ventas.

## 6. Publicidad y monetización (cómo se gana dinero con la guía y la TV)

- **Promoción de pago** (`promotion_rank` + vigencia `promoted_from`/`promoted_until`): sube
  un restaurante, una experiencia o un producto al principio de su lista.
- **Destacado editorial** (`is_featured`, o `tier = 'featured'` en restaurantes): la
  recomendación sincera del anfitrión. Se mantiene separado de la promoción a propósito: son
  cosas que se facturan distinto y el huésped tiene derecho a saber qué es publicidad
  (Directiva 2005/29/CE, anexo I.11).
- **Afiliación**: el CTA principal de una experiencia suele ser un enlace de afiliado con
  sub-id legible `<slug-del-piso>-guide` o `<slug-del-piso>-tv` (para saber si vendió la guía o
  la TV; cada superficie tiene su propia entrada de caché). La guía y la TV avisan de que el
  enlace es retribuido (`cta_source: 'affiliate'`).
- **Tienda**: productos del anfitrión, de la agencia o de la plataforma; los pedidos de la
  plataforma van al WhatsApp de VisualTaste (`PLATFORM_WHATSAPP`).
- **Restaurantes**: los clientes de VisualTaste tienen carta en vídeo y pueden pagar por
  posición; la conversión medible es el argumento de venta.

## 7. Infraestructura y límites que condicionan el diseño

- Cuenta en **Cloudflare Workers Free** (verificado en septiembre de 2026):
  - **KV**: 1.000 escrituras al día **para toda la cuenta**. Por eso la caché usa claves
    versionadas (una escritura por edición), los límites por minuto usan el binding
    `[[ratelimits]]` y los contadores diarios viven en D1. Un `GUIDE_CACHE.put` sin `.catch`
    tumba la guía cuando KV se agota.
  - **Workers AI**: 10.000 neuronas al día; al agotarlas devuelve un error, nunca una factura.
    Presupuesto compartido entre el chat y el traductor en `ai_usage_daily`.
- **Caché KV versionada** en guía (`ver:apt:{slug}`), zona (`ver:zone:{slug}`) y carta
  (`ver:restaurant:{slug}`). Desplegar código no invalida la caché: si cambia la forma del
  JSON, hay que subir la versión a mano y comprobar `X-Cache: MISS`.
- **Autorización multi-tenant** (`workerAuthz.js`): todo endpoint con `:slug` o `restaurantId`
  comprueba que el usuario tiene acceso a ese restaurante. En el guidebook, el personal de una
  agencia solo ve los apartamentos de su agencia.
- **CORS**: solo los orígenes de `workerCors.js`.
- **Despliegue**: commit antes de desplegar; un hook bloquea `wrangler deploy` con el árbol de
  trabajo sucio, porque varias sesiones trabajan sobre el mismo directorio y `wrangler`
  empaqueta lo que hay en disco, no lo que hay en git.

## 8. Legal (documentos en `docs/legal/`)
- Condiciones de servicio B2B, encargo de tratamiento (VisualTaste trata los datos por cuenta
  de la agencia o del restaurante) y registro de actividades de tratamiento.
- La guía tiene una página `/legal` (privacidad + aviso legal, en español e inglés). La carta
  tiene `/legal/privacy` y `/legal/aviso` (art. 10 LSSI).
- En la guía, todo es `noindex` salvo la landing: las guías llevan el WiFi en claro.
