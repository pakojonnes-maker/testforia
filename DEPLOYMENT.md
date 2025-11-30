# Guía de Despliegue en Cloudflare Pages

Esta guía detalla los pasos para desplegar las aplicaciones frontend (`admin` y `client`) en Cloudflare Pages.

## 🏗️ Estructura del Proyecto

El proyecto es un monorepo con dos aplicaciones principales:
- **Admin**: Panel de administración (`apps/admin`)
- **Client**: Carta digital/Reels (`apps/client`)

Cada una debe desplegarse como un proyecto independiente en Cloudflare Pages.

## 🚀 Despliegue del Frontend (Cloudflare Pages)

### 1. Requisitos Previos
- Cuenta en Cloudflare.
- Repositorio conectado a GitHub/GitLab.

### 2. Configuración para Admin (`apps/admin`)

Crea un nuevo proyecto en Cloudflare Pages y conéctalo a tu repositorio.

| Configuración | Valor |
|--------------|-------|
| **Nombre del Proyecto** | `visualtaste-admin` (o similar) |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build:admin` |
| **Build Output Directory** | `apps/admin/dist` |
| **Root Directory** | `/` (Dejar vacío o poner raíz) |

#### Variables de Entorno (Environment Variables)
Configura estas variables en la sección **Settings > Environment variables**:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL de tu backend (Workers) | `https://visualtaste-auth.tu-cuenta.workers.dev` |

---

### 3. Configuración para Client (`apps/client`)

Crea otro proyecto en Cloudflare Pages para la aplicación cliente.

| Configuración | Valor |
|--------------|-------|
| **Nombre del Proyecto** | `visualtaste-client` (o similar) |
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build:client` |
| **Build Output Directory** | `apps/client/dist` |
| **Root Directory** | `/` (Dejar vacío o poner raíz) |

#### Variables de Entorno (Environment Variables)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL de tu backend (Workers) | `https://visualtaste-auth.tu-cuenta.workers.dev` |

---

### 📝 Notas Importantes

1. **Monorepo**: Es crucial dejar el **Root Directory** en la raíz (`/`) y usar los comandos `npm run build:admin` y `npm run build:client`. Esto permite que el proceso de build acceda a las dependencias compartidas en el monorepo (como `@visualtaste/api`).
2. **Node Version**: Cloudflare Pages usa una versión reciente de Node.js por defecto. Si necesitas una específica, puedes añadir la variable de entorno `NODE_VERSION` (ej. `18.17.0`).

## ⚙️ Despliegue del Backend (Cloudflare Workers)

El backend consta de varios Workers que se despliegan individualmente o mediante `wrangler`.

Para detalles específicos sobre la autenticación y configuración de la base de datos, consulta el archivo:
👉 [DEPLOYMENT-AUTH.md](./DEPLOYMENT-AUTH.md)

### Comandos Rápidos (si usas Wrangler)

```bash
# Desplegar Worker de Autenticación
npx wrangler deploy workerAuth.js --name visualtaste-auth

# Desplegar Worker de Tracking
npx wrangler deploy workerTracking.js --name visualtaste-tracking

# Desplegar otros workers según sea necesario...
```

Asegúrate de que la variable `VITE_API_URL` en tus proyectos de Pages apunte a la URL de tu worker principal (o al worker que actúe como gateway/router si tienes uno unificado).
