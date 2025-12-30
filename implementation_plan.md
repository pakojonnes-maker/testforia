# Plan de Implementación: Analítica Privada + Cloudflare Analytics

## Objetivos
1.  **Analítica Interna (VisualTaste):** Convertir el sistema actual en "Privacy-First" (Sin Cookies/Consentimiento) mediante anonimización robusta en el servidor.
2.  **Cloudflare Analytics:** Integrar la medición de Cloudflare Web Analytics en el frontend para métricas de rendimiento y tráfico global.

## Backend Endpoints (API)
-   **GET /marketing/active**: Returns active campaigns (Welcome Modal, etc.) for a session.
-   **POST /marketing/interact**: Track views/clicks.
-   **POST /loyalty/scan** (Waiters QR):
    -   Starts session attributed to waiter.
    -   Returns the specific `scratch_win` campaign configured for the restaurant.
-   **POST /loyalty/play**:
    -   Logic to pick reward from `campaign_rewards`.
-   **POST /loyalty/claim**:
    -   Save contact to `campaign_claims`.
    -   Return Magic Link.
    -   **Response includes `google_review_url`**.

### Admin Backend (`workerMarketing.js`)
-   **GET /api/campaigns/:id/rewards**: List rewards.
-   **POST /api/campaigns/:id/rewards**: Create/Update reward.
-   **DELETE /api/rewards/:id**: Delete reward.
-   **GET /api/staff/qrs**: List staff QRs.
-   **POST /api/staff/assign-qr**: Create/Assign QR to staff.

### Admin Panel (New)

## 1. Cloudflare Web Analytics (Frontend)
Cloudflare Analytics es "privacy-first" por defecto y no usa cookies.
- **Acción:** Insertar el script JS ligero en el `index.html` del cliente.
- **Requisito:** Necesitamos el `token` de Cloudflare Web Analytics (Site Token).
- **Archivo:** `apps/client/index.html`

```html
<!-- Ejemplo de integración -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "TU_TOKEN_AQUI"}'></script>
```

## 2. Analítica Interna "Privacy Mode" (Backend)
Modificar `workerTracking.js` para contar usuarios únicos sin almacenar datos personales.

### A. Algoritmo de Hashing Diario
En lugar de guardar `user_id` o `device_id` persistentes, usaremos un hash irreversible rotatorio.

```javascript
// Pseudo-código para workerTracking.js
const dailySalt = await getDailySalt(env); // Rota cada 24h
const fingerprint = msg.headers.get('user-agent') + msg.headers.get('cf-connecting-ip');
const uniqueDayId = await crypto.subtle.digest('SHA-256', fingerprint + dailySalt);
// Resultado: Un ID único para hoy, imposible de rastrear mañana.
```

### B. Limpieza de Datos
- **IP:** Confirmar que NUNCA se guarda en BD.
- **Referer/UserAgent:** Guardar solo versiones simplificadas ("iPhone" en vez de "iPhone 13 Pro Max iOS 15.1...") para evitar "fingerprinting" único.

## 3. Frontend "Cookie-less" (`TrackingProvider`)
- [ ] Eliminar cualquier lógica que intente recuperar sesiones anteriores de `localStorage` (si existe).
- [ ] Asegurar que `WelcomeModal` solo guarde la preferencia de "cerrado" (permitido) y no IDs de rastreo.

## 4. Página Legal
- [ ] Actualizar `/legal/privacy` para declarar:
    - "Utilizamos Cloudflare Analytics para estadísticas agregadas (sin cookies)."
    - "Utilizamos métricas internas de mejora de producto totalmente anonimizadas."
    - "No realizamos seguimiento individual ni perfilado persistente."

## Pasos de Ejecución
1.  [ ] **Cliente:** Añadir script CF Analytics (solicitar token al usuario).
2.  [ ] **Backend:** Implementar lógica de `Daily Salt` + `Hash` en `workerTracking.js`.
3.  [ ] **Backend:** Modificar queries de SQL para usar este nuevo hash como `session_identifier` diario.
4.  [ ] **Legal:** Crear página simple de privacidad.
