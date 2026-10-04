# VisualTaste — Visión general del ecosistema (Guide, TV y Menú)

> Documento de conocimiento para NotebookLM. Escrito el 4 de octubre de 2026 a partir del
> código del repositorio (monorepo `testforia`) y de su documentación interna (`CLAUDE.md`,
> comentarios del código y cabeceras de las migraciones SQL). Describe el estado real del
> producto en esa fecha, no un plan.

## 1. Qué es VisualTaste en una frase

VisualTaste es un SaaS para el sector turístico y de restauración del Mediterráneo, y en
concreto de la Costa del Sol. Tiene tres productos de cara al público que comparten un
mismo backend:

| Producto | Para quién | Dónde se ve | Dominio |
|---|---|---|---|
| **Guide** (guidebook digital) | El huésped de un apartamento turístico | En su móvil, en el navegador, sin app | `guide.visualtastes.com/<slug>` |
| **VisualTaste TV** | El huésped, desde el sofá | En la televisión del alojamiento (Android TV) | `tv.visualtastes.com` |
| **Menú / Carta digital** ("Gravy", «Carta Mediterránea») | El comensal de un restaurante | En su móvil, al escanear el QR de la mesa | `menu.visualtastes.com/<slug>` |

Las tres se gestionan desde el mismo **panel de administración** (`admin.visualtastes.com`),
que tiene una parte para restaurantes (platos, reservas, delivery, marketing, fidelidad…) y
otra para el guidebook (agencias, apartamentos, zonas, POIs, tienda, TV, conversiones).

## 2. Cómo encajan las tres piezas (el "ecosistema")

La idea de negocio es una cadena de recomendación de pago y medible:

1. Una **agencia** (property manager) o anfitrión gestiona uno o varios **apartamentos turísticos**.
2. Cada apartamento tiene una **guía** en el móvil y, si quiere, una **pantalla de TV**
   emparejada. Las dos enseñan lo mismo (la TV reutiliza exactamente los datos de la guía).
3. En la guía y en la TV el huésped ve **restaurantes recomendados**. Si el restaurante es
   cliente de VisualTaste, tiene **carta en vídeo** y la guía enlaza a ella (en la TV, con un QR).
4. Cuando el huésped abre la carta desde la guía, o escanea el QR físico de la mesa el
   mismo día, el sistema **atribuye esa visita al apartamento**. Es la prueba de que la
   recomendación trajo un cliente, y sirve para negociar comisiones o colocación de pago
   con el restaurante.
5. Además, la guía y la TV venden **experiencias** (excursiones, actividades, a menudo con
   enlace de afiliado) y **productos de tienda** (late checkout, cesta de bienvenida,
   productos locales), cuyos pedidos llegan por WhatsApp y quedan registrados.

```
   Agencia / anfitrión ──(admin)──► Apartamento ──► Guía (móvil) ─┐
                                        │                         ├─► Restaurante ──► Carta en vídeo
                                        └──► TV (salón) ──QR──────┘        ▲
                                                                           │
                                   QR físico de la mesa (mismo día) ───────┘  ⇒ atribución
```

## 3. Arquitectura técnica común

- **Monorepo** con npm workspaces: `apps/*` (frontends) y `packages/*` (cliente API y UI compartidos).
- **Frontend** en Cloudflare **Pages** (un proyecto por app).
- **Backend**: un **único** Cloudflare **Worker** (`visualtasteworker`) cuyo punto de entrada
  es `worker.js`. Los demás `worker*.js` son módulos que se importan y se empaquetan juntos;
  no son workers independientes.
- **Base de datos**: Cloudflare **D1** (SQLite), base `restaurant-menu-saas`. SQL crudo y
  parametrizado, sin ORM. Más de 100 migraciones numeradas en `migrations/`.
- **Ficheros**: Cloudflare **R2** (bucket `mediabucket`) para fotos y vídeos, servidos por el
  worker en `/media/...`.
- **Caché**: Cloudflare **KV** (`GUIDE_CACHE`) para las respuestas de la guía y de la carta,
  con claves versionadas.
- **IA**: **Workers AI** (modelo Gemma 4 26B) para el conserje de la guía y el traductor automático.

### Cómo procesa el worker una petición
1. Responde al preflight CORS (`OPTIONS` → 204).
2. Comprueba si la ruta es pública (`PUBLIC_ROUTES`). Si no lo es, exige un JWT `Bearer`.
3. Prueba cada módulo (`handleXxxRequests`) en orden, y el primero que devuelve respuesta
   "gana". Por ejemplo, el módulo de TV debe registrarse **antes** que el admin del guidebook,
   porque si no `/guide/admin/` devuelve un 404.
4. Añade las cabeceras CORS (solo los orígenes permitidos de `workerCors.js`).

### Proyectos de Pages y dominios
| Proyecto Pages | Qué sirve | Dominios |
|---|---|---|
| `visualtaste` | `apps/client` (carta + web de restaurantes) | visualtastes.com, www, menu.visualtastes.com |
| `visualtasteadmin` | `apps/admin` | admin.visualtastes.com |
| `visualtastes-guide` | `apps/guide` | guide.visualtastes.com |
| `visualtaste-tv` | landing de venta de la TV **+** app de la TV, combinadas | tv.visualtastes.com |

## 4. Stack de cada app (no son intercambiables)

| App | React | Estilos | Particularidades |
|---|---|---|---|
| `apps/guide` | 19 + Vite 7 | Hojas CSS propias (`.g-*`) + Tailwind v4 solo para maquetación | Leaflet para mapas; tema de color calculado desde la agencia; sin iconos ni emoji |
| `apps/tv` | 19 + Vite | CSS propio para «Mirador» (`.mir`) + Tailwind v4 en la interfaz clásica | Navegación con mando (espacial); lienzo fijo de 1920×1080; fuentes autoalojadas |
| `apps/tv-landing` | Sin framework (HTML + TS) | CSS propio | Página de venta indexable; decide si la URL es de una pantalla de TV |
| `apps/client` (carta) | 19 + Vite 7 | Emotion + CSS propio (`carta.css` bajo `.cm`), **nunca Tailwind** | Feed vertical de vídeos; MUI solo en diálogos heredados que se cargan bajo demanda |
| `apps/admin` | 18 (en ejecución, 19) | Tailwind + Material UI | React Query, Zustand, react-hook-form + zod |

## 5. Idiomas: 13 activos en las tres apps

Español (`es`, fuente de verdad y respaldo), inglés (`en`), francés, alemán, italiano,
portugués, catalán, **árabe (RTL)**, ruso, ucraniano, chino simplificado, japonés y coreano.
Idiomas eliminados y que ya no se usan: neerlandés, sueco, polaco, turco, hindi y bengalí.

- El contenido traducible vive en la tabla genérica `translations`
  (`entity_type`, `entity_id`, `field`, `language_code`, `value`). Si falta una
  traducción, se usa el español.
- Los textos de la interfaz: en la guía, `apps/guide/src/lib/i18n.ts`; en la TV,
  `apps/tv/src/lib/i18n.ts` (el tipo obliga a tener los 13 idiomas); en la carta, la
  tabla `localization_strings` (contexto `reels`) con el español de respaldo en `strings.ts`.
- En árabe la maquetación entera se invierte (`dir="rtl"`), no solo el texto.

## 6. Principios de diseño que se repiten en los tres productos

- **Privacidad por defecto.** La analítica es anónima (un hash diario que se calcula en el
  servidor y no escribe nada en el móvil), así que no hace falta banner de cookies. Lo que
  sí necesita permiso (reconocer al visitante otro día) se pide aparte. Ver el documento 04.
- **El servidor decide, el cliente pinta.** El orden de las listas, qué CTA se muestra en
  una experiencia o qué es publicidad se calcula en el worker; guía y TV solo lo pintan. Antes
  cada cliente decidía por su cuenta y llegaron a divergir: la TV no enseñaba ningún QR de
  reserva porque comparaba `'whatsapp'` en minúsculas con `'WHATSAPP'`.
- **Publicidad identificada.** Distingue lo "destacado" (recomendación editorial) de lo
  "promocionado" (posición pagada) y de los enlaces de afiliado, y avisa al huésped
  (Directiva 2005/29/CE, anexo I.11).
- **Contraste garantizado.** Los colores de marca de la agencia o del restaurante se corrigen
  lo mínimo necesario para que el texto se lea siempre (WCAG ≥ 4,5:1).
- **Sin iconos ni emoji** en la guía, la TV y la landing de la TV: es una decisión de diseño.
  Estética «mediterránea»: papel, tinta, arena, arcos, azulejo, Playfair Display + Montserrat.
- **Plan gratuito de Cloudflare.** La cuenta está en Workers Free, con límites duros: KV admite
  1.000 escrituras al día para toda la cuenta y Workers AI, 10.000 neuronas al día. Mucho del
  diseño (caché versionada, contadores en D1 y no en KV, presupuesto de IA) existe por eso.

## 7. Glosario rápido

- **Agencia**: el property manager dueño de uno o varios apartamentos (`guide_agencies`).
- **Apartamento**: el alojamiento con su guía (`guide_apartments`). Su URL pública es su *slug*.
- **Zona**: la ciudad o área donde está el apartamento (`guide_zones`), p. ej. Benalmádena o
  Nerja. Las zonas de una misma **región** (Costa del Sol) son "ciudades hermanas".
- **POI**: un lugar de interés de una zona (`guide_pois`): playa, museo, ruta… Si es
  `is_bookable`, es una **experiencia** reservable.
- **Bloque de info**: un apartado de la guía de la casa (WiFi, check-in, lavadora, normas…).
- **Categoría de info**: el catálogo global de tipos de bloque (58 categorías en 9 grupos), con
  nombre, icono y color traducidos una sola vez para toda la plataforma.
- **Tienda**: productos que vende el anfitrión, la agencia o la plataforma (`guide_store_items`).
- **Pairing code**: código de 6 caracteres que empareja una TV con un apartamento.
- **Mirador**: el diseño actual de la interfaz de la TV (desde septiembre de 2026).
- **Carta Mediterránea**: el diseño actual de la carta digital (`apps/client/src/carta`).
- **Gravy**: nombre interno de la app de la carta digital (`apps/client`).
- **Hash del día** (`visitor_day_hash`): la identidad anónima de un visitante durante un día.
- **Atribución**: saber que una visita a una carta vino de una guía (o de una TV).
- **Superadmin**: el administrador de VisualTaste; ve y edita todo. El personal de una
  agencia solo ve los apartamentos de su agencia.
