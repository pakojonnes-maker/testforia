# VisualTaste — Autenticación (Zero-Dependency)

> Actualizado (julio 2026) al estado real del código. Fuente de verdad ampliada: `CLAUDE.md`.

## 📋 Resumen

Autenticación por **JWT (HS256, expiración 7 días)** con hashing de contraseñas mediante
**Web Crypto API nativa (PBKDF2)** — sin `bcryptjs` ni dependencias externas.

## 🔧 Archivos relevantes (código vigente)

| Archivo | Rol |
|---|---|
| `workerAuthentication.js` | Módulo de auth: `handleAuthRequests`, `verifyJWT`, `hashPassword`, `generateSecurePassword`. |
| `worker.js` | Enrutador central: aplica auth a las rutas no públicas (`authenticateRequest` → `verifyJWT(token, env.JWT_SECRET)`). |
| `workerCrypto.js` | Cripto de **Web Push (VAPID)**, NO de contraseñas. |
| `create-admin-user.sql` | Script para crear el primer usuario admin. |

> Nota: ya **no** existe `workerAuth.js` ni `workerDashboard.js` con auth propia; la
> verificación JWT está centralizada en `worker.js` + `workerAuthentication.js`.

## 🔑 JWT_SECRET — vía entorno, NO hardcodeado

El secreto se lee de `env.JWT_SECRET` en todos los módulos que verifican JWT
(`worker.js`, `workerAuthentication.js`, `workerGuideAdmin.js`, `workerSections.js`).
Configúralo como secreto de Cloudflare:

```bash
npx wrangler secret put JWT_SECRET
```

⚠️ Nunca escribas el secreto en el código ni un fallback por defecto. Si falta, la auth
debe fallar.

## 📦 Despliegue

El backend es un worker único; no se despliega auth por separado:

```bash
npx wrangler deploy   # bundlea worker.js + workerAuthentication.js + resto de módulos
```

## 👤 Crear el usuario administrador

1. **Generar el hash de la contraseña** (PBKDF2, formato `salt:hash`). En la consola del
   navegador (F12 → Console):

   ```javascript
   async function generateHash(password) {
     const encoder = new TextEncoder();
     const salt = crypto.getRandomValues(new Uint8Array(16));
     const keyMaterial = await crypto.subtle.importKey(
       'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
     );
     const hash = await crypto.subtle.deriveBits(
       { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
       keyMaterial, 256
     );
     const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
     console.log(`${hex(salt)}:${hex(hash)}`);
   }
   generateHash('TU_PASSWORD');
   ```

   (Debe coincidir con el algoritmo de `hashPassword` en `workerAuthentication.js`; si ese
   módulo cambia los parámetros, ajusta este snippet.)

2. **Editar `create-admin-user.sql`**: pon el `password_hash` generado y el `restaurant_id` real.

3. **Ejecutar**:
   ```bash
   npx wrangler d1 execute restaurant-menu-saas --remote --file=create-admin-user.sql
   ```

## 🧪 Probar
1. Frontend admin → `/login`.
2. Endpoint: `POST /auth/login` (ruta pública en `worker.js`).
3. Con token válido, las rutas protegidas responden; sin él, 401 `{ success: false, message: 'No autorizado' }`.

## 🐛 Problemas comunes
- **"Credenciales inválidas"**: hash mal generado o incompleto (falta la parte `salt:` o `:hash`).
- **"No autorizado" (401)**: `JWT_SECRET` no configurado en el entorno del worker, o token ausente/expirado (>7 días).
