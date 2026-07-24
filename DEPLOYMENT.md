# Guía de Despliegue — VisualTaste

> Actualizado (julio 2026) para reflejar la arquitectura real desplegada en Cloudflare.
> Fuente de verdad ampliada: `CLAUDE.md` (raíz).

El proyecto es un monorepo (npm workspaces) con **3 apps frontend** en Cloudflare Pages
y **un único Worker** de backend.

---

## 🏗️ Estructura

| Parte | Ubicación | Dónde se despliega |
|---|---|---|
| Backend (API) | `worker.js` + módulos `worker*.js` | Cloudflare Workers → `visualtasteworker` |
| Carta digital "Gravy" | `apps/client` | Cloudflare Pages → `visualtaste` |
| Panel admin | `apps/admin` | Cloudflare Pages → `visualtasteadmin` |
| Guidebook | `apps/guide` | Cloudflare Pages → `visualtastes-guide` |

Cuenta Cloudflare: `bcdb1b118c735428df024b1b2e300eb3`.

---

## ⚙️ Backend (Cloudflare Workers) — UN worker único

`worker.js` es el enrutador central (entrypoint). Importa ~21 módulos `worker*.js` como
ES modules; Wrangler los **empaqueta juntos** en un solo Worker al desplegar. **No** se
despliega cada archivo por separado.

```bash
# Desplegar el backend completo (bundlea worker.js + todos los módulos)
npx wrangler deploy

# Desarrollo local del worker
npx wrangler dev

# Logs en vivo
npx wrangler tail visualtasteworker
```

Config en `wrangler.toml`: bindings `DB` (D1 `restaurant-menu-saas`), `R2_BUCKET`
(R2 `mediabucket`), `GUIDE_CACHE` (KV) y `AI` (Workers AI).

Secretos (no hardcodear en el código):
```bash
npx wrangler secret put JWT_SECRET
```

Migraciones D1:
```bash
npx wrangler d1 execute restaurant-menu-saas --file=migrations/XXXX.sql            # local
npx wrangler d1 execute restaurant-menu-saas --remote --file=migrations/XXXX.sql   # producción
```

Ver detalles de autenticación en `DEPLOYMENT-AUTH.md`.

---

## 🚀 Frontend (Cloudflare Pages) — 3 proyectos

Los tres proyectos ya existen en Cloudflare Pages (rama `main`). Build de cada app:

| App | Build command | Output dir | Proyecto Pages | Dominios |
|---|---|---|---|---|
| client | `npm run build:client` | `apps/client/dist` | `visualtaste` | visualtastes.com, www, menu.visualtastes.com |
| admin | `npm run build:admin` | `apps/admin/dist` | `visualtasteadmin` | admin.visualtastes.com |
| guide | `npm run build:guide` | `apps/guide/dist` | `visualtastes-guide` | guide.visualtastes.com |

### Deploy manual con Wrangler
```bash
npm run build:client && npx wrangler pages deploy apps/client/dist --project-name=visualtaste
npm run build:admin  && npx wrangler pages deploy apps/admin/dist  --project-name=visualtasteadmin
npm run build:guide  && npx wrangler pages deploy apps/guide/dist  --project-name=visualtastes-guide
```

### Si se configura build automático desde Git
- **Framework preset:** Vite
- **Root directory:** `/` (raíz — necesario para que el build acceda a los workspaces
  compartidos como `@visualtaste/api`)
- **Build command / Output dir:** los de la tabla de arriba

### Variables de entorno (Pages → Settings → Environment variables)
| Variable | Descripción | Valor |
|---|---|---|
| `VITE_API_URL` | URL del backend (Worker) | URL de `visualtasteworker` |
| `NODE_VERSION` | (opcional) versión de Node | p. ej. `18.17.0` |

---

## 📝 Notas
- **Monorepo:** deja siempre el Root Directory en `/` y usa los comandos `npm run build:*`.
- Los tres frontends consumen el mismo backend vía `VITE_API_URL`.
