# SECRETS.md — inventario y rotación

Qué secretos existen, qué rompe cada uno al rotarlo y cómo se rota.

**Este fichero no contiene ningún valor y nunca debe contenerlo.** Los valores
viven en dos sitios: tu gestor de contraseñas (fuente de verdad) y la bóveda
local (copia de conveniencia, ver abajo).

---

## 1. Inventario

Los secretos del worker son de **solo escritura**: Cloudflare no te los devuelve.
Puedes listar los nombres, nunca los valores:

```bash
npx wrangler secret list
```

| Nombre | Dónde vive | Para qué | ¿Secreto de verdad? |
|---|---|---|---|
| `JWT_SECRET` | Worker `visualtasteworker` | Firma y verifica los JWT de sesión (HMAC-SHA256). Lo leen `worker.js`, `workerAuthentication.js`, `workerGuideAdmin.js`, `workerSections.js`, `workerTvScreen.js`. | **Sí.** Quien lo tenga puede fabricar un token de superadmin. |
| `VAPID_PRIVATE_KEY` | Worker `visualtasteworker` | Firma las notificaciones Web Push (`workerMarketing.js`). | **Sí.** |
| `VAPID_PUBLIC_KEY` | Worker + `VITE_VAPID_PUBLIC_KEY` en Pages `visualtaste` | Identifica al emisor de push ante el navegador. | **No.** Es pública por diseño: viaja en el bundle del cliente. Está en Secrets solo por comodidad. |
| `RESEND_API_KEY` | Worker `visualtasteworker` | Envía los emails de invitación/reseteo de contraseña (`workerEmail.js`). **Opcional**: sin él, los enlaces se muestran en el panel para copiar a mano en vez de enviarse por email. | **Sí**, si se configura. |
| `GOOGLE_PLACES_API_KEY` | Worker `visualtasteworker` | Importador de POIs desde Google Maps (`workerGuideImport.js`, `/guide/admin/import/places/preview`, superadmin). **Opcional**: sin él, el importador responde 503 `google_places_not_configured`; el alta manual de POIs sigue funcionando igual. En la consola de Google Cloud, restringir la key a la Places API (New) únicamente. | **Sí**, si se configura — una key sin restringir permite gastar en cualquier API de Google Cloud del proyecto. |

`EMAIL_FROM` (opcional, no es secreto — puede ir en `[vars]` de `wrangler.toml`) es la dirección remitente de esos correos. Sin configurar, cae en `onboarding@resend.dev` (el dominio de pruebas de Resend, con límites de envío).

`wrangler.toml` no define ninguna variable en `[vars]` salvo `PLATFORM_WHATSAPP`
(no es secreto), y los bindings (`DB`, `R2_BUCKET`, `GUIDE_CACHE`, `RATE_LIMIT_KV`,
`AI`) se resuelven por plataforma, sin credenciales. Los cuatro secretos de
arriba son, a fecha de esta revisión, todos los que existen.

### Estado del historial de git

Auditado: el único literal que existió en el repo fue el placeholder
`YOUR_SECRET_KEY_HERE_CHANGE_IN_PRODUCTION`. **Nunca se commiteó un valor real**,
y ningún `.env` ha estado trackeado. No hay que reescribir el historial.

Aun así conviene rotar `JWT_SECRET` al menos una vez: como los secretos no se
pueden leer, no hay forma de comprobar que el valor en producción no sea ese
mismo placeholder.

---

## 2. Bóveda local

```
%USERPROFILE%\.visualtaste\secrets.env    ← valores
%USERPROFILE%\.visualtaste\rotation.log   ← qué se rotó y cuándo (sin valores)
```

Está **fuera del repo** a propósito: ningún `git add -A` puede alcanzarla.

⚠️ En Windows el fichero se guarda sin permisos POSIX (`chmod 600` no aplica).
Su protección es la ACL del perfil de usuario, que es razonable para una
máquina de trabajo personal — pero no es un almacén cifrado. **El gestor de
contraseñas es la fuente de verdad; esto es solo una red de seguridad.**

---

## 3. Rotar

```bash
node scripts/rotate-secret.mjs jwt
```

```bash
node scripts/rotate-secret.mjs vapid
```

Añade `--dry-run` para generar y ver el valor sin subirlo a Cloudflare.

El script genera con CSPRNG, guarda en la bóveda, sube a Cloudflare vía stdin
(el valor no pasa por `argv`, así que no queda en el historial del shell ni en
la lista de procesos) y lo imprime una vez para que lo copies al gestor.

### Radio de impacto

**`JWT_SECRET`** — todos los tokens de sesión emitidos dejan de validar al
instante. Todo el mundo vuelve a hacer login. No hay nada más que tocar: ni
rebuild, ni redeploy, ni migración. Los datos no se ven afectados.

**`VAPID`** — las suscripciones push existentes quedan huérfanas: están atadas
al `applicationServerKey` antiguo y el navegador rechazará los envíos nuevos.
Pasos adicionales, que el script te recuerda al terminar:

1. Actualizar `VITE_VAPID_PUBLIC_KEY` en Pages → `visualtaste` → Variables.
2. Actualizar el valor por defecto en
   [`apps/client/src/providers/TrackingAndPushProvider.tsx`](apps/client/src/providers/TrackingAndPushProvider.tsx)
   (hay una clave hardcodeada como fallback).
3. Invalidar los tokens muertos:
   ```bash
   npx wrangler d1 execute restaurant-menu-saas --remote --command "UPDATE notification_tokens SET is_active = 0"
   ```
4. Rebuild y deploy de `apps/client`.

### Verificar después de rotar

```bash
npx wrangler secret list
```

Luego entra en admin.visualtastes.com: si te pide login otra vez y entras bien,
la rotación de `JWT_SECRET` ha funcionado de punta a punta.

---

## 4. Rotación sin cortar sesiones (para cuando haya clientes)

Hoy da igual — rotar expulsa a nueve usuarios internos. Cuando haya clientes de
verdad, echar a todo el mundo a la vez no es aceptable, y el mecanismo actual no
lo permite evitar: un solo `JWT_SECRET` significa corte duro.

El patrón para entonces es **verificación con dos claves**: añadir un
`JWT_SECRET_PREVIOUS`, hacer que `verifyJWT` acepte cualquiera de las dos y que
`generateJWT` firme siempre con la nueva. Se deja la anterior viva mientras dure
el token más largo (hoy 7 días) y luego se retira. Requiere tocar `verifyJWT` en
`workerAuthentication.js`.

Queda mucho más simple si antes se implementa la Fase 2 del plan de auth
(access tokens de 15 min + refresh revocable): la ventana de solape baja de 7
días a 15 minutos.

---

## 5. Cadencia

| Cuándo | Qué |
|---|---|
| Ahora | Rotar `JWT_SECRET` (no se puede verificar que no sea el placeholder). |
| Ahora | Rotar VAPID: solo hay 6 tokens de prueba, nunca será más barato. |
| Cada 12 meses | Rotación preventiva de `JWT_SECRET`. |
| Al salir alguien con acceso al dashboard de Cloudflare | Rotar todo, inmediatamente. |
| Ante sospecha de filtración | Rotar todo + revisar `security_audit_log` (pendiente, Fase 5). |
