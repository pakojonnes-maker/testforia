# CLAUDE.md — VisualTaste

Guía de contexto para Claude Code. Léela entera antes de tocar código. Está escrita
a partir de un análisis real del repo + la infraestructura Cloudflare (julio 2026).

---

## 1. Qué es VisualTaste

SaaS premium para restaurantes. Una carta digital tipo "Reels/TikTok" + panel de
administración + backend en el edge de Cloudflare. Módulos principales del producto
(ver `KNOWLEDGE_FUNCIONALIDADES.md` para el detalle de negocio):

- **Carta digital en vídeo** (experiencia inmersiva, multilingüe, alérgenos, PWA).
- **Marketing y captación**: campañas "rasca y gana", leads, magic links, push (VAPID).
- **Analytics/tracking** privacy-first (hash rotativo con salt diario).
- **Reservas** integradas (slots dinámicos, waitlist, magic link de autogestión).
- **Delivery & takeout** (carrito, zonas de envío, estados de pedido).
- **Landing page builder** automático (SEO, sitemaps).
- **Guidebook** (guías turísticas/de apartamento con IA, mapas Leaflet). Área más
  activa ahora mismo.
- Admin multi-rol + sistema de franquicias (ver `ANALISIS_SISTEMA_FRANQUICIAS.md`).

---

## 2. Arquitectura general

Monorepo con **npm workspaces** (`apps/*`, `packages/*`). Frontend en Cloudflare
**Pages**, backend en un único Cloudflare **Worker**.

```
Repo raíz
├── worker.js              ← ENTRYPOINT único del backend (router central)
├── worker*.js (28 módulos) ← se importan y bundlean dentro de worker.js
├── wrangler.toml          ← config del worker desplegado (visualtasteworker)
├── migrations/            ← migraciones SQL de D1 (numeradas 0001..0079 + sueltas)
├── tests/                 ← tests de seguridad del worker (node, sin framework)
├── scripts/               ← utilidades operativas (rotate-secret.mjs)
├── apps/
│   ├── admin/   ← Panel de gestión (React 18 + Tailwind + MUI)
│   ├── client/  ← Carta digital "Gravy" (React 19 + Emotion, NO Tailwind)
│   ├── guide/   ← Guidebook (React 19 + Tailwind v4 + Leaflet)
│   └── tv/      ← VisualTaste TV (React 19 + Tailwind v4, 10-foot UI + mando)
└── packages/
    ├── api/     ← @visualtaste/api (cliente API compartido, build con tsup)
    └── ui/      ← componentes UI compartidos
```

### Infraestructura Cloudflare (cuenta franciscotortosaestudios@gmail.com)
- **Account ID:** `bcdb1b118c735428df024b1b2e300eb3`
- **Worker:** `visualtasteworker` (desde `worker.js`). Es el **único** worker desplegado.
- **D1:** `restaurant-menu-saas` (`7e8d1efe-2a54-4849-9a06-4c47152392bd`), binding `DB`.
- **R2:** `mediabucket`, binding `R2_BUCKET` (imágenes/vídeos de menús).
- **KV:** `GUIDE_CACHE` (`89c3875...`), caché del guidebook (TTL ~15 min).
- **Workers AI:** binding `AI` (asistente del guidebook).
- **Pages (4 proyectos, rama `main`):**
  | Proyecto | Build dir | Dominios |
  |---|---|---|
  | `visualtaste` | `apps/client/dist` | visualtastes.com, www, menu.visualtastes.com |
  | `visualtasteadmin` | `apps/admin/dist` | admin.visualtastes.com |
  | `visualtastes-guide` | `apps/guide/dist` | guide.visualtastes.com |
  | `visualtaste-tv` | `apps/tv/dist` | visualtaste-tv.pages.dev (dominio `tv.visualtastes.com` pendiente de añadir a mano desde el dashboard) |

  **`apps/tv` (VisualTaste TV)**: pantalla de bienvenida para TVs de alojamientos
  (WiFi, guía, alrededores). En producción real (Android TV vía APK) el shell debe
  ir **empaquetado dentro del APK** (assets locales, sin red en el arranque) — el
  Pages/dominio de arriba es el canal de demo/testing y la fuente del build a copiar
  al APK, NO de dónde la TV descarga el shell en caliente en cada encendido (el WiFi
  de un apartamento turístico es poco fiable justo al arrancar). Solo los DATOS
  (`/guide/tv/config/:pairingCode`) deben ir siempre por red.

---

## 3. Backend (Cloudflare Workers) — cómo funciona de verdad

**Patrón de módulos, NO workers independientes.** `worker.js` es el enrutador central
y el único que se despliega. Importa 24 archivos `worker*.js` como ES modules (líneas
1-25 — hay 28 módulos en disco; los 4 restantes los importan otros módulos, no el
router) y Wrangler los empaqueta juntos en `visualtasteworker` al hacer `wrangler deploy`.
No despliegues archivos sueltos con `--name` (aunque `DEPLOYMENT.md` lo sugiera; ver §8).

⚠️ Ese mismo bundleo-de-todo-el-directorio es lo que hace peligroso desplegar con
cambios sin commitear de otra sesión en curso dando vueltas por el repo. Antes de
`wrangler deploy`, lee **§7 (Git y despliegues)**.

### Flujo de una request en `worker.js`
1. Preflight CORS (`OPTIONS` → 204).
2. `isPublicRoute()` contra la lista `PUBLIC_ROUTES` (regex). Si no es pública →
   `authenticateRequest()` verifica JWT (`Bearer` + `verifyJWT(token, env.JWT_SECRET)`).
   Sin auth válida → 401.
3. Dispatch en cascada: se llama a cada `handleXxxRequests(request, env)` en orden;
   el primero que devuelve una respuesta "gana". Muchos usan `request.clone()` porque
   varios handlers pueden intentar leer el body.
4. CORS se reinyecta con `addCorsHeaders()` (excepto media binaria, que gestiona el suyo).

### Módulos worker principales
| Archivo | Dominio |
|---|---|
| `workerAuthentication.js` | Login, JWT (`verifyJWT`), hashing de contraseñas (`hashPassword`, PBKDF2). **Módulo de auth vigente** (no `workerAuth.js`). |
| `workerCrypto.js` | Cripto de **Web Push (VAPID)** (`WebPushCrypto`) — NO de contraseñas. |
| `workerDashboard.js` | Endpoints del dashboard admin. |
| `workerAnalytics.js` | Agregación de métricas. |
| `workerTracking.js` | Ingesta de eventos. **Contiene la lógica de privacidad (hash rotativo).** |
| `workerRestaurants.js` / `workerMenus.js` / `workerSections.js` / `workerDishes.js` | CRUD de la carta. |
| `workerAllergens.js` | Alérgenos. |
| `workerReels.js` | Reels (`handleReelsRequests`). |
| `workerLoyalty.js` | Loyalty (`handleLoyaltyRequests`). Módulo propio, **no** vive en `workerReels.js`. |
| `workerMedia.js` | Servir/subir media desde R2. |
| `workerMarketing.js` | Campañas, leads, magic links, push. |
| `workerReservations.js` | Reservas. |
| `workerDelivery.js` | Delivery/takeout. |
| `workerLanding.js` / `workerLandingAdmin.js` | Landing builder (público / admin). |
| `workerGuide.js` | Guidebook público (`GET /guide/:slug`). |
| `workerGuideAdmin.js` | Admin del guidebook (`/guide/admin/*`). El más grande (~76KB). |
| `workerGuideTracking.js` | Tracking del guidebook (`/guide/track/*`). |
| `workerGuideAI.js` | Asistente IA del guidebook (`/guide/ai/*`, usa binding `AI`). |
| `workerGuideCache.js` | Versionado de la caché KV del guide/carta (`getGuideVersion`, `touchGuideVersion`, `touchZoneGuideVersions`, `*MenuVersion`). Ver el aviso de caché más abajo. |
| `workerTvScreen.js` | VisualTaste TV: `/guide/tv/config/:pairingCode`, `/guide/tv/track`, `/guide/admin/tv/*`. **Debe registrarse en `worker.js` ANTES del bloque `/guide/admin/`** o ese handler devuelve 404 duro. |
| `workerAuthz.js` | Autorización multi-tenant: `checkRestaurantScope`, `getRestaurantAccess`, `requireRole`, `ROLE_RANK`. Todo endpoint nuevo con `:slug`/`restaurantId` pasa por aquí. |
| `workerAudit.js` | Log de eventos de seguridad (`logSecurityEvent`, `getClientIp`). |
| `workerCors.js` | `ALLOWED_ORIGINS` + `getCorsHeaders`. **Origen nuevo (puerto de dev, dominio) se añade aquí**, o el navegador bloquea aunque curl funcione. |
| `workerEmail.js` | Emails de invitación/reseteo vía Resend (`RESEND_API_KEY`, opcional). |

### Reglas backend (de `.cursorrules` / `.antigravityrules`)
- **Sin ORM.** SQL crudo con `env.DB.prepare(...).bind(...)`. Nunca Prisma/Drizzle/TypeORM.
- **Siempre parametrizado** (`.bind()`) — previene SQL injection.
- **D1 es estricto**: maneja `null`/`undefined` explícitamente antes de insertar.
- **Minimiza lecturas D1**: `SELECT campos` específicos, no `SELECT *`.
- Respuestas de error estructuradas: `{ success: false, error/message: string }`.
- Envuelve las operaciones D1 en try/catch. Valida el JSON de entrada antes de procesar.
- **Secrets vía `env`**, nunca hardcodeados. `JWT_SECRET` sale de `env.JWT_SECRET`
  (configúralo con `wrangler secret put JWT_SECRET`, no en el código).
- Runtime edge: Web Standards, evita Node built-ins salvo que Workers los soporte.

### Base de datos
- Esquema de referencia: **`BDschemaFinal.sql`** (raíz). ⚠️ **Se desfasa en horas, no en
  meses** (otra sesión aplica una migración `--remote` y el archivo ya miente). Es un
  punto de partida, NO la verdad. Si vas a proponer SQL no trivial, regenera primero:
  `npx wrangler d1 export restaurant-menu-saas --remote --no-data --output BDschemaFinal.sql`
  — ese comando **sobrescribe la cabecera del archivo**, hay que volver a pegarla a mano.
- **No hay ledger de migraciones**: nada registra qué `migrations/*.sql` se ha aplicado a
  qué base (local vs remoto). Los comentarios de una migración sobre "esto ya existe" NO
  son fiables (`0055` decía haber sembrado datos que nunca llegaron a producción).
  Comprueba el estado real con un `SELECT` antes de fiarte.
- Migraciones en `migrations/` (numeradas hasta `0079` + algunas sueltas). Al añadir
  columnas para una feature, propón la migración SQL de inmediato (comportamiento
  esperado del proyecto).
- Ejecutar migración: `npx wrangler d1 execute restaurant-menu-saas --file=migrations/XXXX.sql`
  (añade `--remote` para producción; sin flag es local).
- SQLite en D1 revienta con `UNION ALL` de ~8+ términos (`too many terms in compound
  SELECT`); para contar filas de muchas tablas usa subconsultas escalares en un `SELECT`.

### ⚠️ Caché KV del guidebook — la trampa recurrente
`GET /guide/:slug` (y por tanto `/guide/tv/config/:code`) se sirve de KV con clave
versionada `guide:{slug}:{lang}:v{version}`. **Desplegar el worker NO invalida esa
caché**: la versión solo cambia al editar contenido desde el admin (`touchGuideVersion`).
Si cambias la **forma** del JSON (añadir un campo como `apartment.wifi`), producción
seguirá sirviendo el JSON viejo con `X-Cache: HIT` hasta que la caducidad expire.
Tras un deploy que cambie la forma de la respuesta, bumpea la versión a mano:

```bash
npx wrangler kv key put --namespace-id=89c387501e00410b9d4f0d80dc563bf2 "ver:apt:<slug>" "$(date +%s%3N)" --remote
```

Corolario al verificar: una respuesta con datos viejos justo después de una migración
puede ser caché, no un fallo de la migración.

---

## 4. Frontend — cuatro apps con reglas DISTINTAS

⚠️ **Regla crítica de separación por app.** El styling NO es intercambiable:

### `apps/admin` — Panel de administración
- **React 18** + Vite 4 + **TypeScript**.
- **Styling: Tailwind CSS + Material UI (MUI)**. `@mui/x-data-grid` para tablas.
- Estado servidor: **React Query** (`@tanstack/react-query` v4). Estado global: **Zustand**.
- Formularios: **react-hook-form + zod** (`@hookform/resolvers`).
- Charts: `chart.js` + `react-chartjs-2`. Drag&drop: `@dnd-kit`. Iconos: `@mui/icons-material`.
- QR: `qr-code-styling` (config, no imágenes estáticas). Fechas: `date-fns`.
- Usa `@visualtaste/api` (workspace). Build: `tsc && vite build` (typecheck bloqueante).

### `apps/client` — Carta digital "Gravy"
- **React 19** + Vite 7 + TypeScript.
- **Styling: Emotion (`@emotion/react`, `@emotion/styled`) + CSS vanilla. NUNCA Tailwind aquí.**
- Animaciones: **framer-motion** (intensivo). Carruseles/reels: **swiper**.
- Estética: mobile-first, glassmorphism, gradientes, "premium". Nada de HTML "bare bones".
- Build: `tsc -b && vite build`.

### `apps/guide` — Guidebook
- **React 19** + Vite 7 + TypeScript.
- **Styling: Tailwind CSS v4** (`@tailwindcss/vite`, `tailwind.config.js`).
- Mapas: **Leaflet + react-leaflet**. Dev port fijo: **5175**.
- Tema en `apps/guide/src/theme/` y `apps/admin/src/theme/guideTheme.ts`.
- `InfoSection.tsx` renderiza `apartment_info.content` como **texto plano**
  (`whitespace-pre-wrap`, sin parser de markdown): un `**negrita**` en la BD sale con
  los asteriscos literales.
- Build: `tsc -b && vite build`.

### `apps/tv` — VisualTaste TV
- **React 19** + Vite + Tailwind v4. Dev port **5176** (`npm run dev:tv`).
- **10-foot UI**: se navega con **mando**, no con ratón ni táctil. Navegación espacial
  propia en `src/lib/spatialNav.tsx` (no Norigin). Todo elemento interactivo debe ser
  alcanzable con las flechas y tener foco visible; "Volver" = Backspace/Escape.
- Lo táctil se delega al móvil vía QR (`qr-code-styling`), no se navega en la TV.
- **Gotcha**: `AnimatePresence mode="wait"` se atasca con React 19 + StrictMode (la
  pantalla cambia pero el contenido no monta). Usar `motion.div` con `key` y solo
  fade-in, sin `exit`.
- Datos siempre por red (`/guide/tv/config/:pairingCode`); el shell va empaquetado en
  el APK. Nunca asumas red disponible en el arranque.
- Build: `tsc -b && vite build`.

### Reglas frontend comunes (de las rules existentes)
- **TypeScript estricto**: interfaces para props y respuestas de API. Evita `any`.
- `useMemo`/`useCallback` para cálculos caros y estabilidad de referencias.
- Virtualiza/pagina listas >50 ítems. `React.lazy` + `Suspense` para rutas.
- Componentes funcionales (arrow), uno por archivo, named exports.
- Fetch nativo, no axios, en frontend. Preferir `date-fns` sobre moment.

---

## 5. Idiomas / i18n — 13 idiomas ACTIVOS

Fuente de verdad: **español (`es`)**. Fallback: inglés (`en`). Resto:
`fr, de, it, pt, ca, ar, ru, uk, zh, ja, ko`.

- **Arabe (`ar`)**: RTL. Catalán (`ca`): traducción manual.
- **Mapeo de banderas en frontend**: `zh→cn`, `ko→kr`, `uk→ua`, `ar→ae`. Respétalo.
- **Idiomas OBSOLETOS (eliminados, no usar):** `nl, sv, pl, tr, hi, bn`.
- Detalle: `KNOWLEDGE_IDIOMAS.md`. Hay muchos `.sql` de traducciones en la raíz/migrations.

---

## 6. Comandos

```bash
# --- Dev (desde la raíz) ---
npm run dev:admin      # panel admin
npm run dev:client     # carta digital
npm run dev:guide      # guidebook (puerto 5175)
npm run dev:tv         # VisualTaste TV (puerto 5176)

# --- Build ---
npm run build:admin    # → apps/admin/dist
npm run build:client   # → apps/client/dist
npm run build:guide    # → apps/guide/dist
npm run build:tv       # → apps/tv/dist

# --- Tests (worker, node puro, sin framework) ---
npm test               # las 3 suites
npm run test:authz     # scoping multi-tenant (workerAuthz.js)
npm run test:auth      # login/JWT (workerAuthentication.js)
npm run test:security  # sesiones, MFA, invitaciones
# Si tocas auth/authz/sesiones, ejecútalos ANTES de desplegar.

# --- Backend (Worker) ---
# Antes de esto: git status, y commit de lo que vayas a desplegar (ver §7).
npx wrangler deploy                 # bundlea worker.js + módulos → visualtasteworker
npx wrangler dev                    # worker en local
npx wrangler tail visualtasteworker # logs en vivo
npx wrangler secret put JWT_SECRET  # setear secreto

# --- D1 ---
npx wrangler d1 execute restaurant-menu-saas --file=migrations/XXXX.sql            # local
npx wrangler d1 execute restaurant-menu-saas --remote --file=migrations/XXXX.sql   # producción
npx wrangler d1 execute restaurant-menu-saas --remote --command="SELECT ..."       # query rápida

# --- Deploy frontend (Pages) ---
npx wrangler pages deploy apps/client/dist --project-name=visualtaste
npx wrangler pages deploy apps/admin/dist  --project-name=visualtasteadmin
npx wrangler pages deploy apps/guide/dist  --project-name=visualtastes-guide
npx wrangler pages deploy apps/tv/dist     --project-name=visualtaste-tv
```

Puertos de dev previstos (según CORS de `worker.js`): client `5173`, admin `5174`,
guide `5175`, tv `5176`. admin/client no fijan `port` en su `vite.config` → puede que
necesites `-- --port 5174` para el admin y evitar colisión con el 5173.

El frontend habla con el backend vía `VITE_API_URL` (URL del worker). Configurada en
Pages → Settings → Environment variables.

---

## 7. Git y despliegues: regla de oro (commit/push SIEMPRE junto al deploy)

**El problema real (pasó en julio 2026, no es hipotético):** es normal tener varias
sesiones de Claude Code a la vez sobre esta misma carpeta. `wrangler deploy` no bundlea
lo commiteado — bundlea **lo que hay en disco**, venga de la sesión que venga. Ya pasó:
un deploy de caché KV se llevó por delante un endurecimiento de login a medias de otra
conversación. Salió bien por suerte, no por diseño.

**Regla:** antes de `wrangler deploy`, `wrangler pages deploy`, o cualquier
migración D1 con `--remote`, commitea (y si puedes, pushea) primero.

**Esta regla ya no depende de que alguien la lea: está automatizada.**
`.claude/hooks/pre-deploy-guard.mjs` (hook `PreToolUse` sobre Bash, declarado en
`.claude/settings.json`) intercepta `wrangler deploy`, `wrangler pages deploy`,
`wrangler d1 execute --remote` y `wrangler kv ... --remote`:
- **Working tree sucio → bloquea** el comando y lista los ficheros pendientes.
- **Tree limpio + escritura en producción (`--remote`) → pide confirmación.**
- Tree limpio + deploy → sigue el flujo de permisos normal.

Si el bloqueo es un falso positivo y quieres desplegar igual, prefija el comando con
`VT_ALLOW_DIRTY_DEPLOY=1` — es deliberado que sea explícito y quede en el historial.
Si el hook te bloquea, **la respuesta correcta casi siempre es commitear, no usar el
override**.

1. `git status` antes de tocar nada — mira TODO lo que hay, no solo lo tuyo. Si hay
   cambios que no reconoces (de otra sesión), **para y pregunta** en vez de
   desplegar por encima. No asumas que "no es mío" significa "no importa": ese
   código va a producción igual.
2. Commitea lo que vayas a desplegar, con mensajes que expliquen el qué y el
   porqué (mirar `git log` para el tono: descriptivo, en inglés, sin prefijos
   forzados tipo Conventional Commits salvo `chore:`/`docs:` cuando encaje).
3. Si el deploy depende de una migración D1 nueva, esa migración va en el
   **mismo commit** (o el mismo lote de commits) que el código que la necesita.
   Un worker desplegado que referencia una columna que solo existe en una
   migración sin commitear es una mina para la siguiente sesión.
4. Justo después de un deploy que sale bien, `git push`. No lo dejes "para
   luego" — así es como se llega a una sesión con 30 archivos sin commitear
   repartidos entre 6 features distintas (pasó, hubo que reconstruir la
   historia a mano agrupando por tema después de varias sesiones en paralelo).
5. Si estás a mitad de una feature y no vas a desplegar todavía, no pasa nada —
   pero no ejecutes `wrangler deploy`/`pages deploy` sin haber commiteado al
   menos lo que SÍ vas a mandar a producción en ese momento.

**Para cualquier sesión de Claude Code que lea esto:** si el usuario pide
desplegar, commitea (y haz push) los archivos relevantes como parte del mismo
turno antes de desplegar, salvo que el usuario diga explícitamente "solo
despliega, no commitees". Si al revisar `git status` aparecen cambios de otra
sesión que no puedes atribuir a la tarea actual, dilo explícitamente antes de
seguir — no lo despliegues en silencio.

*Recomendación a más largo plazo, si las colisiones entre sesiones paralelas se
vuelven frecuentes:* considerar una rama (o un `git worktree`) por sesión/feature
en vez de trabajar todas sobre `main` a la vez, con merge a `main` antes de
desplegar. Hoy no es así — todas las sesiones comparten working directory y
rama — así que la regla de "commit antes de deploy" de arriba es la mitigación
mínima mientras eso no cambie.

---

## 8. Avisos / documentación

- **`DEPLOYMENT.md` y `DEPLOYMENT-AUTH.md`** fueron actualizados (jul 2026) para reflejar
  la arquitectura real (worker único, auth por `env`). Ya son fiables — salvo que hablan
  de 3 proyectos Pages; son **4** (falta `visualtaste-tv`, ver §2).
- **`SECRETS.md`** (raíz) es el inventario de secretos: qué existe, qué rompe cada
  rotación y cómo se rota (`scripts/rotate-secret.mjs`). No contiene valores y nunca
  debe contenerlos.
- **`packages/api` depende de `axios`** aunque las rules dicen "usa fetch". Es el cliente
  API compartido; no lo cambies sin querer. En apps nuevas, fetch nativo.
- La raíz tiene MUCHOS archivos de trabajo (`.sql`, `.zip`, `.txt`, dumps, `scratch.js`,
  builds antiguos). No son fuente de verdad de arquitectura; el código vivo está en
  `worker*.js`, `apps/*` y `migrations/`.
- Otros archivos de conocimiento útiles: `Analisis_Funcionalidades.md`,
  `KNOWLEDGE_FUNCIONALIDADES.md`, `ANALISIS_SISTEMA_FRANQUICIAS.md`,
  `ANALISIS_BD_IMPORTACION.md`, `context_for_claude.md`. ⚠️ `.gitignore` ignora
  `ANALISIS_*.md` y `KNOWLEDGE_*.md` por patrón: solo 2 de ellos están versionados,
  el resto existe únicamente en esta máquina. No asumas que un clon los tendrá.
- **`.cursorrules` y `.antigravityrules`** son punteros a este archivo; Claude Code no
  los lee. Si cambias una norma, cámbiala **aquí**, no ahí.

---

## 9. Cómo trabajar en este repo (resumen operativo)

1. **Identifica el área** antes de escribir: ¿admin (Tailwind+MUI), client (Emotion),
   guide (Tailwind v4), tv (Tailwind v4 + mando) o worker (JS/SQL)? Las reglas de
   estilo NO se mezclan.
2. **Backend**: SQL crudo parametrizado, valida input, try/catch, `{success:false,...}`
   en errores, verifica el esquema (regenerándolo si hace falta, §3), y si falta una
   columna propón la migración en `migrations/`. Endpoint con `:slug`/`restaurantId` →
   pasa por `workerAuthz.js`. Origen nuevo → `workerCors.js`.
3. **Frontend**: TypeScript estricto (sin `any`), tipa props y respuestas de API,
   respeta el stack de cada app.
4. **i18n**: `es` es la fuente; 13 idiomas activos; respeta el mapeo de banderas.
5. Antes de dar algo por hecho, ejecuta el build/typecheck correspondiente. Si has
   tocado auth/authz/sesiones, además `npm test`.
6. **Antes de desplegar, commitea** (ver §7). No hay excepción cómoda para "es un
   cambio pequeño" — `wrangler deploy` bundlea todo el directorio, no solo lo tuyo.
   El hook `pre-deploy-guard` lo hace cumplir; no lo esquives con el override sin
   una razón que puedas explicar.
7. **Verifica contra la realidad, no contra el 200 OK**: caché KV (§3), datos reales
   en producción, y el idioma/RTL si tocaste i18n.
8. Rituales largos: `/deploy` y `/migracion` (en `.claude/skills/`) llevan el
   procedimiento completo escrito. Úsalos en vez de reconstruirlo de memoria.
