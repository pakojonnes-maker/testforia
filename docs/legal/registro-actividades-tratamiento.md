# Registro de Actividades de Tratamiento

**Artículo 30 del RGPD**

> **Sí te aplica.** La excepción del art. 30.5 para organizaciones de menos de 250
> empleados **no vale aquí**, porque decae cuando el tratamiento no es ocasional — y el
> tuyo es continuo y automatizado. Es un documento interno: no se publica, pero hay que
> poder enseñárselo a la AEPD el día que lo pidan.
>
> Rellena lo marcado con `[[ ]]` y revísalo cada vez que añadas una funcionalidad que trate
> datos nuevos.

**Responsable:** `[[RAZÓN SOCIAL]]`, NIF `[[NIF]]`, `[[DOMICILIO]]`
**Contacto en materia de protección de datos:** privacidad@visualtastes.com
**Delegado de Protección de Datos:** no designado. `[[Revisar: el art. 37 lo exige si hay
observación habitual y sistemática de interesados a gran escala. Con el volumen actual no
se alcanza ese umbral, pero conviene reevaluarlo al crecer.]]`
**Última revisión:** 2026-08-03

---

## A. Tratamientos en los que VisualTaste es RESPONSABLE

### A.1 Analítica de uso de la plataforma

| Campo | Contenido |
|---|---|
| Finalidad | Medir el uso de la carta digital y de la guía para mejorar el producto y ofrecer estadísticas a los clientes. |
| Base jurídica | Consentimiento del interesado (art. 6.1.a). |
| Categorías de interesados | Visitantes de las cartas digitales y huéspedes de los alojamientos. |
| Categorías de datos | Identificador aleatorio de visitante, eventos de navegación (platos vistos, duración, secciones, favoritos, valoraciones y su comentario), tipo de dispositivo, sistema operativo, navegador, idioma, país y ciudad aproximados, origen de la visita. |
| Categorías especiales | Ninguna solicitada. |
| Destinatarios | Cloudflare (alojamiento). El cliente ve únicamente datos agregados de su propio establecimiento. |
| Transferencias internacionales | Cloudflare (EE. UU.) — Cláusulas Contractuales Tipo. |
| Plazo de supresión | 12 meses desde la última actividad del visitante. ⚠️ **Pendiente de automatizar**: hoy no hay ningún proceso que ejecute esta purga. |
| Medidas de seguridad | Ver Anexo I del contrato de encargo. IP no almacenada en claro (sal rotativa de 24 h). |

### A.2 Gestión de usuarios del panel de administración

| Campo | Contenido |
|---|---|
| Finalidad | Alta, autenticación y control de acceso del personal de los clientes al panel. |
| Base jurídica | Ejecución del contrato de servicio (art. 6.1.b). |
| Categorías de interesados | Empleados y responsables de los establecimientos clientes. |
| Categorías de datos | Nombre, email, rol, contraseña derivada (PBKDF2), registros de acceso e IP. |
| Destinatarios | Cloudflare; Resend (correos de invitación y recuperación). |
| Transferencias internacionales | EE. UU. — Cláusulas Contractuales Tipo. |
| Plazo de supresión | Duración de la relación contractual + 6 años (art. 30 Código de Comercio). |
| Medidas de seguridad | Contraseñas derivadas con PBKDF2, JWT firmado, control de acceso por rol y ámbito, registro de eventos de seguridad, limitación de intentos de acceso. |

### A.3 Asistente de inteligencia artificial de la guía

| Campo | Contenido |
|---|---|
| Finalidad | Responder consultas del huésped sobre el alojamiento y la zona. |
| Base jurídica | Solicitud del servicio por el interesado (art. 6.1.b) e interés legítimo en prevenir el abuso (art. 6.1.f) para el control de frecuencia. |
| Categorías de interesados | Huéspedes de los alojamientos. |
| Categorías de datos | Texto libre introducido por el huésped y las últimas respuestas del asistente, para dar continuidad a la conversación. |
| Categorías especiales | No solicitadas. Se advierte expresamente al huésped de que no las introduzca. |
| Destinatarios | Cloudflare Workers AI. |
| Transferencias internacionales | EE. UU. — Cláusulas Contractuales Tipo. |
| Plazo de supresión | No se almacena historial: el contenido se procesa en el momento y no se persiste en la base de datos. |
| Obligaciones adicionales | Art. 50.1 del Reglamento (UE) 2024/1689 (AI Act): informar de la interacción con una IA. Cumplido mediante aviso permanente en la interfaz del chat. |

### A.4 Comunicaciones comerciales y notificaciones push

| Campo | Contenido |
|---|---|
| Finalidad | Envío de ofertas y novedades a quienes lo han solicitado. |
| Base jurídica | Consentimiento (art. 6.1.a RGPD y art. 21 LSSI). |
| Categorías de interesados | Visitantes que activan las notificaciones o marcan la casilla de marketing. |
| Categorías de datos | Identificador técnico de suscripción push, tipo de dispositivo, identificador de visitante; email cuando se facilita en una reserva. |
| Plazo de supresión | Hasta la baja o la caducidad de la suscripción. |
| Medidas | Mecanismo de baja en cada envío. ⚠️ **Pendiente de verificar** que existe en las notificaciones push, no solo en el email. |

---

## B. Tratamientos en los que VisualTaste es ENCARGADO (art. 30.2)

Realizados por cuenta de cada restaurante o agencia con contrato de encargo firmado.

### B.1 Reservas

- **Responsable:** el establecimiento cliente.
- **Datos:** nombre, teléfono, email, número de comensales, fecha y hora, peticiones especiales.
- **Finalidad:** gestionar la reserva y contactar al cliente ante incidencias.
- **Destinatarios:** Cloudflare; Resend si el establecimiento activa avisos por email.
- **Plazo:** el que fije el responsable; por defecto 24 meses.

### B.2 Pedidos a domicilio y para recoger

- **Responsable:** el establecimiento cliente.
- **Datos:** nombre, teléfono, dirección postal, contenido del pedido, método de pago elegido, notas (que pueden contener alergias).
- **Finalidad:** preparación, entrega y facturación.
- **Destinatarios:** Cloudflare; Meta si el pedido se remite por WhatsApp.
- **Plazo:** el aplicable a la obligación fiscal y contable correspondiente.

### B.3 Programa de fidelización

- **Responsable:** el establecimiento cliente.
- **Datos:** identificador de visitante y sellos acumulados.
- **Plazo:** mientras el interesado participe en el programa.

### B.4 Pedidos de la Tienda de la guía

- **Responsable:** el anfitrión o la agencia, salvo en los productos de tipo `platform`,
  **en los que el vendedor es VisualTaste** y por tanto actúa como responsable.
- **Datos:** productos pedidos, identificador de sesión y de visitante.
- **Destinatarios:** Meta (WhatsApp), al que se dirige la conversación de pedido.

---

## Pendientes conocidos

Esto es deliberadamente una lista de deudas, no un adorno: un registro que finge estar
completo es peor que uno que dice la verdad.

1. **Purga automática a 12 meses** de sesiones y eventos: no existe ningún proceso. Se
   promete el plazo en la política de privacidad, así que hay que implementarlo.
2. **Supresión real en `/track/privacy/forget`**: hoy pone `visitor_id` a NULL solo en
   `sessions`; no toca `tracking_events`, `guide_sessions` ni `guide_affiliate_intents`.
3. **Ubicación de los datos**: `wrangler.toml` no fija `location_hint` en D1, así que no se
   puede afirmar dónde residen. Fijarlo si se quiere sostener "datos en la UE".
4. **DPA con Cloudflare, Resend y Google**: verificar que están aceptados y guardar copia.
5. **Política de copias de seguridad**: sin documentar (Anexo I del encargo).
6. **Baja en notificaciones push**: verificar que existe un mecanismo accesible.
7. **User-Agent completo** almacenado en `guide_affiliate_intents`: valorar si es
   necesario o si basta con el tipo de dispositivo ya derivado.
