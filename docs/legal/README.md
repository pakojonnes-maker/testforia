# Documentación legal — VisualTaste

Estado a **3 de agosto de 2026**. Escrito a partir de una revisión del código real, no de
una plantilla genérica.

> **Qué es y qué no es esto.** Son borradores de trabajo redactados junto al código que
> describen, para que un abogado colegiado los revise y firme. No son un dictamen ni
> sustituyen asesoramiento profesional. Lo que sí garantizan es que **describen lo que el
> software hace de verdad** — que es justo donde fallan las plantillas descargadas.

---

## Documentos

| Documento | Para qué | Estado |
|---|---|---|
| [encargo-de-tratamiento.md](encargo-de-tratamiento.md) | Art. 28 RGPD. Se firma con **cada** restaurante y **cada** agencia. | Plantilla, faltan datos identificativos |
| [condiciones-de-servicio-b2b.md](condiciones-de-servicio-b2b.md) | Contrato de servicio con el cliente. Incluye la cláusula de alérgenos y precios. | Plantilla, faltan datos comerciales |
| [registro-actividades-tratamiento.md](registro-actividades-tratamiento.md) | Art. 30 RGPD. Documento interno, no se publica. | Redactado, con lista de deudas al final |

Los textos de cara al usuario final **viven en el código**, no aquí:

- Menú: `apps/client/src/components/legal/PrivacyContent.tsx` y `LegalNoticeContent.tsx`,
  servidos en `/legal/privacy` y `/legal/aviso`.
- Guide: `apps/guide/src/pages/LegalPage.tsx`, servido en `/legal?lang=xx`.

## Antes de publicar nada: rellenar la identidad

Los dos ficheros de identidad tienen huecos marcados que se pintan en pantalla con un
aviso rojo hasta que se completen:

- `apps/client/src/legal/identity.ts`
- `apps/guide/src/lib/legalIdentity.ts`

Faltan **razón social, NIF y domicilio**. Son obligatorios por el art. 10 LSSI y el art.
13.1.a RGPD. Los dos ficheros deben mantenerse iguales.

También hay que **crear el buzón `privacidad@visualtastes.com`**: la política anterior
apuntaba a `legal@visualtaste.app`, un dominio distinto del real, o sea una dirección que
rebota. Un canal de derechos que no funciona incumple el art. 12.2.

## Lo que ya está resuelto en código

- Consentimiento **opt-in real** en las dos apps. Antes el menú abría sesión y enviaba
  `consentAnalytics: true` antes de que el banner apareciera siquiera, y el guide no
  preguntaba nada.
- Puerta de consentimiento **en el origen** (`apps/guide/src/lib/consent.ts` aplicada desde
  `lib/api.ts`), para que ningún punto de llamada nuevo pueda saltársela.
- Rechazar **borra** el identificador y la cookie de atribución ya escritos.
- Retirar el consentimiento es tan fácil como darlo (art. 7.3), desde `/legal`.
- Aviso permanente de interacción con IA (art. 50.1 del Reglamento UE 2024/1689, aplicable
  desde el 2 de agosto de 2026).
- Divulgación de colaboraciones comerciales donde se listan restaurantes y experiencias.
- Capa informativa en el formulario de pedidos y en el de reservas, con la casilla de
  marketing separada de la base contractual.

## Lo que sigue pendiente

Por orden de urgencia:

1. **Rellenar la identidad legal** y crear el buzón de privacidad. Sin esto, los textos no
   se pueden publicar.
2. **Firmar el encargo de tratamiento** con los clientes actuales.
3. **Purga automática a 12 meses**. La política promete ese plazo y no hay ningún proceso
   que lo ejecute. Prometer un plazo y no cumplirlo es peor que no prometerlo.
4. **Supresión real** en `/track/privacy/forget`: hoy pone `visitor_id` a NULL solo en
   `sessions`, y deja intactos `tracking_events`, `guide_sessions` y
   `guide_affiliate_intents`.
5. **Proteger `/guide/:slug`**. Es ruta pública y sirve el **código de la puerta** y la
   clave del WiFi: cualquiera con la URL abre el portal. Un token firmado con caducidad al
   fin de la estancia lo resuelve. No es RGPD, es responsabilidad civil.
6. **Traducir la página legal del guide** a los 11 idiomas que hoy caen a inglés. El árabe
   ya renderiza en RTL, pero con texto inglés.
7. **`location_hint` en D1** (`wrangler.toml`) si se quiere poder afirmar que los datos
   residen en la UE.
8. **Google Places**: los términos de Maps Platform prohíben almacenar contenido de Places
   más de 30 días salvo el `place_id`. Hoy se guarda de forma permanente en `guide_pois`.
   Es un problema contractual con Google, no legal: el riesgo es que corten la API.
9. **Accesibilidad (Ley 11/2023 / Directiva UE 2019/882)**, aplicable desde el 28 de junio
   de 2025 a servicios de comercio electrónico. Probablemente ampara la exención de
   microempresa, pero no cubre a los clientes que sean quienes prestan el comercio
   electrónico, y decae al crecer. Objetivo: EN 301 549 / WCAG 2.1 AA + declaración de
   accesibilidad.
