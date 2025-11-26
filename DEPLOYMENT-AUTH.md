# VisualTaste - Guía de Despliegue del Sistema de Autenticación (Zero-Dependency)

## 📋 Descripción General

Este documento describe cómo desplegar y configurar el sistema de autenticación segura para VisualTaste.
**Actualización**: Se ha eliminado la dependencia de `bcryptjs`. Ahora usa **Web Crypto API** nativa, por lo que no requiere `npm install` ni pasos de compilación complejos. ¡Es copiar y pegar!

## 🔧 Archivos Creados

1. **`workerAuth.js`** - Worker de autenticación (Zero-Dependency)
2. **`workerDashboard.js`** - Actualizado con verificación JWT
3. **`create-admin-user.sql`** - Script SQL para crear el primer usuario administrador

## 📦 Pasos de Despliegue

### 1. Configurar el Worker de Autenticación

#### 1.1. Cambiar el JWT Secret

⚠️ **CRÍTICO**: Antes de desplegar, debes cambiar el `JWT_SECRET` en **ambos archivos**:

**En `workerAuth.js` (línea 12):**
```javascript
const JWT_SECRET = 'YOUR_SECRET_KEY_HERE_CHANGE_IN_PRODUCTION'; // ⚠️ CAMBIAR ESTO
```

**En `workerDashboard.js` (línea 17):**
```javascript
const JWT_SECRET = 'YOUR_SECRET_KEY_HERE_CHANGE_IN_PRODUCTION'; // ⚠️ CAMBIAR ESTO
```

#### 1.2. Desplegar a Cloudflare Workers

Como ya no hay dependencias externas, es muy fácil:

Opción A: **Crear un nuevo Worker en Cloudflare Dashboard**
1. Ve a tu Cloudflare Dashboard
2. Workers & Pages → Create Worker
3. Llámalo `visualtaste-auth`
4. Copia y pega el contenido de `workerAuth.js`
5. Guarda y despliega

Opción B: **Usar Wrangler CLI**
```bash
# Crear wrangler.toml
cat > wrangler.toml << EOF
name = "visualtaste-auth"
main = "workerAuth.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "visualtaste"
database_id = "YOUR_D1_DATABASE_ID"
EOF

# Desplegar
npx wrangler deploy
```

### 2. Actualizar Worker Dashboard

El `workerDashboard.js` ya fue actualizado con verificación JWT. Despliégalo:

```bash
# Si usas Wrangler
npx wrangler deploy --name visualtaste-dashboard

# O copia el código actualizado en tu Cloudflare Dashboard
```

### 3. Crear el Usuario Administrador

#### 3.1. Generar el Hash de Contraseña

Como usamos un sistema seguro con "Salt" aleatorio, necesitas generar el hash tú mismo para la contraseña inicial.

1. Abre la consola de tu navegador (F12 → Console).
2. Pega este código y presiona Enter:

```javascript
async function generateHash(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  
  const buf2hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
  console.log(`${buf2hex(salt)}:${buf2hex(hash)}`);
}
generateHash('admin123');
```

3. Copia la cadena que aparece (algo como `a1b2...:d4e5...`).

#### 3.2. Editar el Script SQL

Abre `create-admin-user.sql` y:
1. Reemplaza el valor de `password_hash` con la cadena que copiaste.
2. Reemplaza `'your_restaurant_id_here'` con el ID real de tu restaurante.

#### 3.3. Ejecutar el Script

**Opción A: Usando Wrangler**
```bash
npx wrangler d1 execute visualtaste --file=create-admin-user.sql
```

**Opción B: Cloudflare Dashboard**
1. Ve a D1 Databases → visualtaste
2. Console
3. Pega el contenido de `create-admin-user.sql` (editado)
4. Ejecuta

### 4. Configurar el Frontend

Actualiza la URL del API en `apps/admin/.env`:

```env
VITE_API_URL=https://visualtaste-auth.tu-cuenta.workers.dev
```

## 🧪 Probar el Sistema

1. Ve a `http://localhost:5173/login`
2. Usa `admin@visualtaste.com` / `admin123`
3. Deberías entrar al dashboard.

## 🐛 Solución de Problemas

### Error: "Credenciales inválidas"

1. Asegúrate de haber generado el hash correctamente en el paso 3.1.
2. Verifica que copiaste TODA la cadena `salt:hash`.

### Error: "No autorizado"

1. Verifica que el `JWT_SECRET` sea idéntico en `workerAuth.js` y `workerDashboard.js`.
