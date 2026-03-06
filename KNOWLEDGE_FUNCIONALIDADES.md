# Análisis Exhaustivo de Funcionalidades: VisualTaste

He realizado un escaneo profundo de todo el *front-end* y *back-end* (workers). Aquí tienes todo el arsenal tecnológico que tienes construido, desglosado para que la agencia entienda el "monstruo" de retención que tienen entre manos.

---

## 🏎️ 1. Módulo Core: Carta Digital en Video (El "Ferrari")
Es el centro de la experiencia del comensal. No es un menú, es un motor de ventas por impulso.

*   **Experiencia inmersiva (Tipo TikTok/Reels):** Videos en pantalla completa, *swipe* vertical u horizontal, que hacen que el plato entre por los ojos.
*   **Soporte Multilingüe Avanzado:** Traducción automática o manual de *toda* la carta, categorías, descripciones y menús de la UI, con soporte de emojis y banderas. (El idioma se autoselecciona o lo elige el cliente).
*   **Gestión de Alérgenos e Ingredientes:** Totalmente integrado para cumplir con normativas visualmente (iconografía clara en cada video).
*   **Modificadores y Opciones de Plato:** Extras, raciones, puntos de carne, etc. Todo configurable para *upselling*.
*   **Branding Dinámico (Global Styling & Themes):** Colores primarios, secundarios, fuentes, logos y estilos de la interfaz 100% customizables para adaptarse a la marca del restaurante desde el panel de control.
*   **Instalación PWA (App Nativa sin App Store):** Los comensales pueden "instalar" la carta del restaurante en su pantalla de inicio como una app real.

## 🧲 2. Módulo de Marketing y Captación (La máquina de hacer dinero para la Agencia)
Esto es lo que la agencia va a utilizar para justificar sus *fees* y demostrar ROI.

*   **Campañas "Rasca y Gana" (Gamificación):**
    *   Los clientes rascan una tarjeta digital en su móvil para ganar premios (ej. un postre gratis).
    *   Tú controlas la *probabilidad* matemática de ganar y el *stock* máximo de premios.
    *   Ideal para incentivar el consumo de platos específicos o captar emails.
*   **Captación de Leads (Welcome Modals):** Pop-ups al entrar a la carta para pedir teléfono o email a cambio de un incentivo.
*   **Magic Links y Retención en WhatsApp:** Los premios y ofertas generan un enlace seguro de un solo uso que expira. El cliente se lo puede enviar directamente por WhatsApp para canjearlo después (asegura que guarden el contacto).
*   **Notificaciones Push (Tecnología VAPID):**
    *   Permite enviar alertas directamente al teléfono del comensal (ej: "Hoy 2x1 en cervezas").
    *   Mucho más barato y efectivo que el SMS/Email.
    *   Soporta texto, imágenes, iconos y links directos a platos.
*   **Gestión Multicampaña (Eventos):** Posibilidad de correr campañas simultáneas para Navidad, San Valentín, etc., con fechas de caducidad automáticas.

## 📊 3. Módulo de Analytics y Trazabilidad (El arma del ROI)
La agencia usará esto para demostrar qué videos generan más dinero publicando en redes.

*   **Estadísticas de Tráfico y Sesiones:** Vistas totales, visitantes únicos, tiempo medio de sesión.
*   **Profundidad y Retención Visual:** Qué platos se ven durante más segundos (Average Dwell Time) y profundidad de *scroll* en cada categoría.
*   **Recurrencia (Nuevos vs. Recurrentes):** Rastreo por *cookies/visitor_id* para saber qué porcentaje de comensales vuelven al restaurante tras ver sus campañas.
*   **Atribución por Código QR Físico:** El sistema sabe exactamente si el cliente escaneó el QR de la Mesa 4, de la barra, o de la puerta gracias a ID's únicos por código.
*   **Métricas de "Conversión" de Platos:**
    *   Favoritos agregados (Likes).
    *   Clics en "Llamar al camarero", "Reservar mesa", o "Cómo llegar".
    *   Platos añadidos al carrito (si *Delivery* está activo).
*   **Mapas de Calor Tecnológicos:** Analítica desglosada por Dispositivo, Navegador, Sistema Operativo, Ciudad, País e Idiomas.

## 📅 4. Módulo de Reservas Integrado
Un motor completo para no depender de sistemas externos (tipo ElTenedor) y ahorrarse comisiones.

*   **Configuración de Fechas y Horarios:** Soporta días de cierre, vacaciones, y bloqueo con N días de antelación.
*   **Slots Dinámicos y Capacidad:** Cálculo matemático automático. Si la capacidad es 50 pax, las reservas que se solapan en tiempo restan disponibilidad al instante en base a la duración por mesa (ej: 90 min por reserva).
*   **Lista de Espera (Waitlist):** Si está lleno, el cliente entra en cola.
*   **Gestión Admin de Reservas:** Vista de calendario de admin para aprobar, cancelar, asignar mesas y dejar notas internas.
*   **Autogestión del Cliente:** Magic Link por correo mediante el cual el cliente puede modificar o cancelar su reserva sin llamar por teléfono.

## 🛵 5. Módulo de Delivery & Takeout (Pedidos online)
La agencia puede vender que montarán "su propio Glovo/UberEats" libre de tarifas abusivas.

*   **Gestión de Carrito de Compras (Cart Sessions):** Trazabilidad de carritos creados, mostrados, convertidos, abandonados, valor monetario promedio y total.
*   **Zonas y Costes de Envío:** Soporta envíos gratuitos a partir de un umbral monetario y pedidos mínimos.
*   **Horarios de Delivery Independientes:** El local puede estar cerrado pero la cocina de *delivery* gestionando sus propios horarios.
*   **Flujo del Pedido (Admin Console):** El estado cambia en tiempo real: Pendiente -> Confirmado -> En preparación -> Entregado.
*   **Pagos e Índices:** Opción de pago en efectivo/puerta (card flag in settings). Los pedidos pueden llegar directo a un WhatsApp configurado del restaurante.

## 🖥️ 6. Módulo Web / Landing Page Builder Automático
Para el restaurante que no tiene web o la tiene obsoleta.

*   **Creador de Landing Pages Interactivo:** El admin puede reordenar módulos, activar y desactivar secciones visuales.
*   **Secciones Integradas:** Galería de platos, Formulario de contacto, Mapa de Google interactivo, Sección de Menús Destacados, y Redes Sociales.
*   **Optimización SEO Dinámica:** Automáticamente genera `sitemaps` y `robots.txt` para posicionar en Google en base a la información registrada.

## 👥 7. Plataforma Admin / Backend Multi-Rol
*   **Perfiles de Usuarios (Staff):** Permite añadir camareros o gerentes con accesos limitados (ej. máximo 5 por restaurante).
*   **QRs de Staff (Afiliados/Loyalty):** Códigos QR únicos asigandos a determinados camareros para medir quién regala más promociones o atrae más leads, perfecto para comisiones internas.
*   **Logs Editoriales:** Un registro absoluto de todo lo que cambia en reservas y campañas (quién canceló, cuándo y por qué), a prueba de auditorías internas.
