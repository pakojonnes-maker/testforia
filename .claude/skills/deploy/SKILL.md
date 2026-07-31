---
name: deploy
description: Ritual completo de despliegue de VisualTaste a producción (worker visualtasteworker y/o los 4 proyectos Pages). Úsalo siempre que haya que publicar algo — cubre el orden migración→código, el commit obligatorio previo, el bump de caché KV y la verificación con datos reales. Se dispara con "despliega", "sube a producción", "publica el worker/admin/guide/tv".
---

# Despliegue de VisualTaste

Orden no negociable: **comprobar → probar → commitear → migrar → desplegar → invalidar
caché → verificar → push**. Saltarse un paso es cómo se rompió producción en julio 2026.

## 0. Qué se va a desplegar

| Objetivo | Comando | Qué publica |
|---|---|---|
| worker | `npx wrangler deploy` | `worker.js` + **los 28 módulos**, estén acabados o no |
| client | `npx wrangler pages deploy apps/client/dist --project-name=visualtaste` | carta digital |
| admin | `npx wrangler pages deploy apps/admin/dist --project-name=visualtasteadmin` | panel |
| guide | `npx wrangler pages deploy apps/guide/dist --project-name=visualtastes-guide` | guidebook |
| tv | `npx wrangler pages deploy apps/tv/dist --project-name=visualtaste-tv` | TV (demo/fuente del APK) |

Si el usuario no lo ha dicho, **pregúntale cuál** antes de tocar nada. "Despliega" no
significa "despliega todo".

## 1. `git status` — mirar TODO, no solo lo tuyo

```bash
git status --short
```

`wrangler deploy` publica **lo que hay en disco**, venga de la sesión que venga. Si hay
cambios que no puedes atribuir a esta tarea, **para y pregunta al usuario**, citando los
ficheros. No los despliegues en silencio. (El hook `pre-deploy-guard` bloqueará el
comando de todas formas, pero la conversación tiene que pasar antes, no después.)

## 2. Probar antes de commitear

- App tocada → `npm run build:<app>` (el `tsc` es bloqueante, un error de tipos aquí es
  un despliegue roto).
- Worker de auth/authz/sesiones tocado → `npm test`.
- Worker en general → al menos `npx wrangler deploy --dry-run` para que falle el bundle
  aquí y no en producción.

## 3. Commitear

Mensajes descriptivos **en inglés**, sin prefijos forzados (`chore:`/`docs:` cuando
encaje). Mira `git log` para el tono. La migración D1 que necesite el código va en el
**mismo commit o lote** — nunca código desplegado que dependa de una migración sin
commitear.

## 4. Migración ANTES que código

Si el deploy depende de columnas/tablas nuevas: aplica la migración a remoto **primero**
(ver la skill `/migracion`) y después despliega el worker. Al revés, el endpoint devuelve
500 hasta que alguien se dé cuenta.

## 5. Desplegar

El comando de la tabla del paso 0. Si el hook bloquea, la respuesta correcta es
commitear, no `VT_ALLOW_DIRTY_DEPLOY=1`.

## 6. Invalidar la caché KV si cambió la FORMA de la respuesta del guide

Desplegar **no** invalida `guide:{slug}:{lang}:v{version}`. Si añadiste/cambiaste campos
de `GET /guide/:slug` (o de `/guide/tv/config/:code`), bumpea la versión de cada slug
afectado:

```bash
npx wrangler kv key put --namespace-id=89c387501e00410b9d4f0d80dc563bf2 "ver:apt:<slug>" "$(date +%s%3N)" --remote
```

Slugs reales hoy: `paloma-park-benalmadena`, `piso-playa-burriana-2b`,
`atico-balcon-europa`.

## 7. Verificar con datos reales

Un 200 OK no prueba nada. Comprueba **contenido**: que el campo nuevo aparece, que el
idioma correcto se sirve, que no es un `X-Cache: HIT` del JSON viejo. Para el admin y
la TV, míralo en el navegador (preview tools), no solo con curl.

## 8. `git push`

Inmediatamente después de un deploy correcto. No lo dejes "para luego": así es como se
acumulan 30 ficheros sin commitear repartidos entre 6 features.

## 9. Si aplicaste una migración remota

Regenera el esquema de referencia y **vuelve a pegar la cabecera** (el export la borra):

```bash
npx wrangler d1 export restaurant-menu-saas --remote --no-data --output BDschemaFinal.sql
```

Commitea también eso.
