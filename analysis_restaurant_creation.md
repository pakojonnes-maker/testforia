# Análisis y Propuesta: Automatización de Creación de Restaurantes

## 1. Análisis de la Situación Actual

La arquitectura actual, aunque robusta y escalable, presenta una alta complejidad relacional que hace que la creación manual de un nuevo restaurante sea propensa a errores y muy lenta.

### Complejidad de Datos (Base de Datos)
Para dar de alta un restaurante "completo" y funcional, se requieren inserciones coordinadas en al menos **12 tablas diferentes**:

1.  **Core**: `restaurants`, `accounts`, `users`, `restaurant_staff`.
2.  **Configuración Visual**: `themes`, `reel_templates`, `reel_template_configs`.
3.  **Contenido del Menú**: `menus` -> `sections` -> `section_dishes` -> `dishes`.
4.  **Detalles Operativos**: `restaurant_details` (horarios, ubicación, redes).
5.  **Internacionalización**: `restaurant_languages`, `translations` (crítico: cada texto necesita su entrada).
6.  **Landing Page**: `restaurant_landing_sections`.
7.  **Acceso**: `qr_codes`.

### Puntos de Dolor (Pain Points)
*   **Gestión de IDs**: Generar UUIDs manualmente y mantener la integridad referencial (Foreign Keys) entre tantas tablas es inviable manualmente.
*   **Traducciones**: Crear un plato requiere crear el registro del plato Y sus entradas correspondientes en la tabla `translations` para cada idioma habilitado.
*   **Media (R2)**: La estructura de carpetas en R2 (`restaurants/{id}/dishes/{id}/...`) requiere que los IDs de base de datos existan antes de subir archivos.
*   **Configuración Repetitiva**: Muchos restaurantes comparten configuraciones base (horarios, temas, estructuras de landing) que se reescriben desde cero.

---

## 2. Solución Propuesta: "Sistema de Plantillas y Clonado"

La estrategia más eficiente es pasar de un modelo de "Creación desde Cero" a un modelo de **"Clonado y Personalización"**.

### A. Concepto de "Restaurante Maestro" (Master Templates)
Crearemos restaurantes "ficticios" en la base de datos que sirvan como plantillas perfectas.
*   *Ejemplo*: "Plantilla Italiana", "Plantilla Sushi", "Plantilla Fast Food".
*   Estos tendrán ya configurados: Estructura de menú típica, Tema visual acorde, Landing page estándar, Textos base traducidos.

### B. Herramienta de Clonado (Deep Copy Worker)
Desarrollar un endpoint administrativo (`POST /admin/restaurants/clone`) que acepte un `source_restaurant_id` (la plantilla) y los datos del nuevo restaurante.

**Flujo de Automatización:**
1.  **Copia Recursiva**: El script copiará el restaurante y descenderá por la jerarquía:
    *   Duplica `themes` y `configs`.
    *   Duplica `menus`, `sections` y `dishes` (generando nuevos IDs).
    *   **Crucial**: Duplica automáticamente todas las filas de `translations` asociadas a los IDs originales, reasignándolas a los nuevos IDs.
2.  **Reemplazo de Variables**: Buscar/Reemplazar el nombre del restaurante en los textos copiados.
3.  **Inicialización de R2**: (Opcional) Copiar assets genéricos de la plantilla a la carpeta del nuevo restaurante en R2.

### C. Importador Masivo (JSON/CSV)
Para el menú específico (que siempre cambia), definir un formato estándar JSON simplificado que el sistema pueda "ingestar".

**Estructura JSON Propuesta:**
```json
{
  "sections": [
    {
      "name": {"es": "Entrantes", "en": "Starters"},
      "icon": "salad",
      "dishes": [
        {
          "name": {"es": "Ensalada César", "en": "Caesar Salad"},
          "price": 12.50,
          "description": {"es": "Lechuga romana...", "en": "Romaine lettuce..."},
          "image_ref": "caesar.jpg" // Referencia a un archivo en un zip subido
        }
      ]
    }
  ]
}
```

---

## 3. Plan de Implementación Técnica

### Fase 1: Script de Clonado (Backend)
Crear una función `cloneRestaurant(sourceId, newOwnerData, env)` en un nuevo worker o en `workerRestaurants.js`.
*   **Reto**: Mantener las relaciones FK. Se necesita un mapa en memoria `oldId -> newId` durante el proceso de copiado para re-enlazar secciones con menús y platos con secciones.

### Fase 2: Interfaz de "Wizard" de Creación (Frontend)
En el admin, reemplazar el formulario actual por un asistente:
1.  **Paso 1**: Elegir Plantilla (Visualización previa del estilo y estructura).
2.  **Paso 2**: Datos Básicos (Nombre, Slug, Dueño).
3.  **Paso 3**: (Background) El sistema clona todo en 5 segundos.
4.  **Paso 4**: El usuario aterriza en el panel de control con todo pre-rellenado, solo tiene que editar precios y nombres.

### Fase 3: Automatización de Media (Media Matcher)
Una herramienta donde subes una carpeta de imágenes con nombres estandarizados (ej. `ensalada-cesar.jpg`) y el sistema intenta emparejarlas con los platos basándose en similitud de nombres o un CSV de mapeo.

---

## Recomendación Inmediata
Empezar por la **Fase 1 (Script de Clonado)**. Es la que aporta mayor valor inmediato con menor esfuerzo de UI. Permite configurar manualmente 1 restaurante perfecto y luego instanciar 50 nuevos en minutos.
