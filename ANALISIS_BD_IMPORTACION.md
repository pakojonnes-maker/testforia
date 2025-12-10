# Análisis de Base de Datos para Importación de Restaurantes

Este documento analiza la estructura de la base de datos (`BDschemaFinal.sql`) y define los campos necesarios para dar de alta un nuevo restaurante completo, incluyendo menús, platos, alérgenos, configuración y **Landing Page**.

## 1. Estructura General

El alta de un restaurante implica poblar las siguientes tablas principales:

1.  **`restaurants`**: Datos base (nombre, slug, contacto).
2.  **`restaurant_details`**: Información extendida (horarios, redes sociales, ubicación).
3.  **`restaurant_translations`**: Textos descriptivos (descripción corta/larga, tipo cocina).
4.  **`landing_seo`**: Configuración SEO (título, descripción).
5.  **`restaurant_landing_sections`**: Configuración de textos para la Landing Page (Hero, About, etc.).
6.  **`menus`**: Cartas disponibles.
7.  **`sections`**: Categorías dentro de un menú.
8.  **`dishes`**: Platos individuales.
9.  **`section_dishes`**: Relación orden.
10. **`dish_allergens`**: Alérgenos.

---

## 2. Archivos de Importación (Templates)

### Archivo 1: `plantilla_1_restaurante.csv` (Maestro)
Contiene TODA la información del establecimiento, configuración visual, textos de landing, SEO y redes sociales.

**Datos Básicos:**
| Campo CSV | Tabla BD | Columna | Descripción |
| :--- | :--- | :--- | :--- |
| `name` | `restaurants` | `name` | Nombre comercial. |
| `slug` | `restaurants` | `slug` | ID en URL (ej. `mi-restaurante`). |
| `email` | `restaurants` | `email` | Email contacto. |
| `phone` | `restaurants` | `phone` | Teléfono. |
| `address` | `restaurants` | `address` | Dirección. |
| `city` | `restaurants` | `city` | Ciudad. |
| `country` | `restaurants` | `country` | País. |
| `website` | `restaurants` | `website` | Web externa. |

**Diseño y Detalles:**
| Campo CSV | Tabla BD | Columna | Descripción |
| :--- | :--- | :--- | :--- |
| `primary_color` | `themes` | `primary_color` | Color principal Hex. |
| `secondary_color` | `themes` | `secondary_color` | Color secundario Hex. |
| `opening_hours` | `restaurant_details` | `opening_hours` | Horarios (texto). |
| `short_description` | `restaurant_translations` | `short_description` | Descripción breve. |
| `long_description` | `restaurant_translations` | `long_description` | Historia/Descripción completa. |
| `cuisine_type` | `restaurant_translations` | `cuisine_type` | Tipo de cocina (ej. Mediterránea). |

**SEO y Landing Page:**
| Campo CSV | Tabla BD | Columna | Descripción |
| :--- | :--- | :--- | :--- |
| `seo_title` | `landing_seo` | `seo_title` | Título para Google. |
| `seo_description` | `landing_seo` | `seo_description` | Descripción para Google. |
| `landing_hero_title` | `restaurant_landing_sections` | `config_data` (JSON) | Título principal de la Landing. |
| `landing_hero_subtitle` | `restaurant_landing_sections` | `config_data` (JSON) | Subtítulo de la Landing. |
| `landing_about_title` | `restaurant_landing_sections` | `config_data` (JSON) | Título sección "Sobre Nosotros". |
| `landing_about_text` | `restaurant_landing_sections` | `config_data` (JSON) | Texto sección "Sobre Nosotros". |

**Redes Sociales y Contacto Extra:**
| Campo CSV | Tabla BD | Columna | Descripción |
| :--- | :--- | :--- | :--- |
| `instagram_url` | `restaurant_details` | `instagram_url` | Link Instagram. |
| `facebook_url` | `restaurant_details` | `facebook_url` | Link Facebook. |
| `tiktok_url` | `restaurant_details` | `tiktok_url` | Link TikTok. |
| `tripadvisor_url` | `restaurant_details` | `tripadvisor_url` | Link TripAdvisor. |
| `google_maps_url` | `restaurant_details` | `google_maps_url` | Link Google Maps. |
| `whatsapp_number` | `restaurant_details` | `whatsapp_number` | Número WhatsApp (con prefijo). |
| `reservation_url` | `restaurant_details` | `reservation_url` | Link reservas externas. |

### Archivo 2: `plantilla_2_estructura.csv`
Define los menús y sus secciones.

| Campo CSV | Descripción |
| :--- | :--- |
| `menu_name` | Nombre del menú (ej. "Carta Principal"). |
| `is_default` | `SI` / `NO`. |
| `section_name` | Nombre de la sección (ej. "Entrantes"). |
| `section_order` | Orden (1, 2, 3...). |
| `section_icon` | Icono del sistema. |

### Archivo 3: `plantilla_3_platos.csv`
Inventario de platos.

| Campo CSV | Descripción |
| :--- | :--- |
| `section_name` | Debe coincidir con archivo 2. |
| `name` | Nombre del plato. |
| `description` | Ingredientes/Preparación. |
| `price` | Precio (ej. 12.50). |
| `allergens` | Lista separada por comas (Gluten, Lácteos, etc.). |
| `calories` | Kcal. |
| `is_vegetarian` | `SI`/`NO`. |
| `is_vegan` | `SI`/`NO`. |
| `is_gluten_free` | `SI`/`NO`. |
| `image_url` | Nombre archivo foto. |

---

## 3. Notas de Implementación

El script de importación deberá:
1.  Leer `plantilla_1` y crear el registro en `restaurants`.
2.  Crear registros asociados en `restaurant_details`, `restaurant_translations`, `landing_seo`.
3.  Generar el JSON para `restaurant_landing_sections` usando los campos `landing_*`.
    *   Ejemplo: Crear sección 'hero' con `config_data = { "title": landing_hero_title, "subtitle": landing_hero_subtitle }`.
4.  Procesar `plantilla_2` para crear menús y secciones.
5.  Procesar `plantilla_3` para crear platos y asignarlos.
