# Contexto del Proyecto: VisualTaste (SaaS para Restaurantes)

## Resumen del Proyecto
Este es un proyecto SaaS (Software as a Service) diseñado para gestionar menús de restaurantes, guías, pedidos, marketing y funcionalidades relacionadas. 

## Stack Tecnológico Principal
- **Cloudflare Workers**: El backend está dividido en múltiples archivos "worker" (`worker*.js`) que manejan diferentes dominios (Analytics, Authentication, Dishes, Guide, Landing, Marketing, etc.). El punto de entrada principal es `worker.js`.
- **Cloudflare D1**: Base de datos relacional (SQLite).
- **Cloudflare R2**: Almacenamiento de objetos para medios (imágenes de menús, etc.).
- **Cloudflare KV**: Caché para guías y payloads.
- **Workers AI**: Utilizado para asistentes de IA dentro de la aplicación.
- **Estructura Monorepo**: El código frontend parece estar dividido en las carpetas `apps/` y `packages/` (o compilado en archivos zip como `client-dist.zip`, `admin-dist.zip`).

## Archivos de Conocimiento Importantes
El proyecto ya cuenta con una excelente base de documentación que DEBES leer para entender el modelo de negocio y las funcionalidades:
1. `Analisis_Funcionalidades.md` - Detalle de las características principales.
2. `ANALISIS_SISTEMA_FRANQUICIAS.md` - Lógica de franquicias y multi-restaurante.
3. `KNOWLEDGE_FUNCIONALIDADES.md` / `KNOWLEDGE_IDIOMAS.md` - Contexto sobre el dominio de la aplicación y el sistema de internacionalización.
4. `DEPLOYMENT.md` y `DEPLOYMENT-AUTH.md` - Instrucciones de despliegue y autenticación.
5. Archivos SQL (`BDschemaFinal.sql`, `BDwithData.sql`) - Esquema de la base de datos y datos de prueba.

## Estado Actual y Trabajo Reciente
Recientemente hemos estado trabajando en:
- Integración de componentes del Frontend para la funcionalidad de la Guía ("Guide Frontend Components").
- Múltiples migraciones de traducciones, limpieza de idiomas y correcciones en la base de datos (archivos `.sql` como `fix_translations.sql`, `populate_catalan.sql`, etc.).
- Workers segmentados por dominio, por ejemplo, `workerGuide.js`, `workerGuideAdmin.js`, etc.

## Instrucciones para el Asistente
- Trata este proyecto como un backend basado en Cloudflare Workers altamente modularizado.
- Siempre verifica el esquema de la base de datos en `BDschemaFinal.sql` antes de proponer cambios que involucren consultas SQL.
- Ten en cuenta el sistema de caché (KV) y almacenamiento multimedia (R2).
