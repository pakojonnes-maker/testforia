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
├── worker*.js (21 módulos) ← se importan y bundlean dentro de worker.js
├── wrangler.toml          ← config del worker desplegado (visualtasteworker)
├── migrations/            ← migraciones SQL de D1 (numeradas 0001..0054 + sueltas)
├── apps/
│   ├── admin/   ← Panel de gestión (React 18 + Tailwind + MUI)
│   ├── client/  ← Carta digital "Gravy" (React 19 + Emotion, NO Tailwind)
│   └── guide/   ← Guidebook (React 19 + Tailwind v4 + Leaflet)
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
y el único que se despliega. Importa ~21 archivos `worker*.js` como ES modules (líneas
1-20) y Wrangler los empaqueta juntos en `visualtasteworker` al hacer `wrangler deploy`.
No despliegues archivos sueltos con `--name` (aunque `DEPLOYMENT.md` lo sugiera; ver §7).

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
| `workerReels.js` | Reels + Loyalty (`handleReelsRequests`, `handleLoyaltyRequests`). |
| `workerMedia.js` | Servir/subir media desde R2. |
| `workerMarketing.js` | Campañas, leads, magic links, push. |
| `workerReservations.js` | Reservas. |
| `workerDelivery.js` | Delivery/takeout. |
| `workerLanding.js` / `workerLandingAdmin.js` | Landing builder (público / admin). |
| `workerGuide.js` | Guidebook público (`GET /guide/:slug`). |
| `workerGuideAdmin.js` | Admin del guidebook (`/guide/admin/*`). El más grande (~63KB). |
| `workerGuideTracking.js` | Tracking del guidebook (`/guide/track/*`). |
| `workerGuideAI.js` | Asistente IA del guidebook (`/guide/ai/*`, usa binding `AI`). |

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
- Esquema de referencia: **`BDschemaFinal.sql`** (raíz). Consúltalo antes de proponer SQL.
- Migraciones en `migrations/` (numeradas + algunas sueltas). Al añadir columnas para una
  feature, propón la migración SQL de inmediato (comportamiento esperado del proyecto).
- Ejecutar migración: `npx wrangler d1 execute restaurant-menu-saas --file=migrations/XXXX.sql`
  (añade `--remote` para producción; sin flag es local).

---

## 4. Frontend — tres apps con reglas DISTINTAS

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
- Componentes recientes (sin commitear aún): `BottomNavBar`, `ChatIASection`, `Header`,
  `MapModal`. Tema en `apps/guide/src/theme/` y `apps/admin/src/theme/guideTheme.ts`.
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

# --- Build ---
npm run build:admin    # → apps/admin/dist
npm run build:client   # → apps/client/dist
npm run build:guide    # → apps/guide/dist

# --- Backend (Worker) ---
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

## 7. Avisos / documentación

- **`DEPLOYMENT.md` y `DEPLOYMENT-AUTH.md`** fueron actualizados (jul 2026) para reflejar
  la arquitectura real (worker único, 3 apps Pages, auth por `env`). Ya son fiables.
- **`packages/api` depende de `axios`** aunque las rules dicen "usa fetch". Es el cliente
  API compartido; no lo cambies sin querer. En apps nuevas, fetch nativo.
- La raíz tiene MUCHOS archivos de trabajo (`.sql`, `.zip`, `.txt`, dumps, `scratch.js`,
  builds antiguos). No son fuente de verdad de arquitectura; el código vivo está en
  `worker*.js`, `apps/*` y `migrations/`.
- Otros archivos de conocimiento útiles: `Analisis_Funcionalidades.md`,
  `KNOWLEDGE_FUNCIONALIDADES.md`, `ANALISIS_SISTEMA_FRANQUICIAS.md`,
  `ANALISIS_BD_IMPORTACION.md`, `context_for_claude.md`.

---

## 8. Cómo trabajar en este repo (resumen operativo)

1. **Identifica el área** antes de escribir: ¿admin (Tailwind+MUI), client (Emotion),
   guide (Tailwind v4) o worker (JS/SQL)? Las reglas de estilo NO se mezclan.
2. **Backend**: SQL crudo parametrizado, valida input, try/catch, `{success:false,...}`
   en errores, verifica el esquema en `BDschemaFinal.sql`, y si falta una columna propón
   la migración en `migrations/`.
3. **Frontend**: TypeScript estricto (sin `any`), tipa props y respuestas de API,
   respeta el stack de cada app.
4. **i18n**: `es` es la fuente; 13 idiomas activos; respeta el mapeo de banderas.
5. Antes de dar algo por hecho, ejecuta el build/typecheck correspondiente.
