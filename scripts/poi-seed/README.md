# scripts/poi-seed — POIs del guidebook en lote

Mete (o corrige) muchos POIs de una zona de golpe, con los datos de Google Places y los
textos escritos a mano en los 13 idiomas. Pensado para cuando el diálogo «Importar de
Google» del admin se queda corto: allí cada POI llega con la sinopsis de Google en
español, sin precio fiable (Google casi nunca da `priceLevel` en monumentos, y así acabó
todo Benalmádena como «gratis») y pasa por el traductor de Workers AI.

**Por qué SQL y no los endpoints del admin:** cada `POST /guide/admin/pois` invalida la
caché KV de cada apartamento de la zona. Con la cuenta en Workers Free (1.000 escrituras de
KV al día para toda la cuenta) un lote de 100 POIs se comería media jornada de KV. Aquí la
caché se invalida una vez por zona. Y los textos no gastan neuronas: el cupo de Workers AI
se queda para el chat del huésped.

## Ficheros

- `data/<zona>.json` — la ficha: qué POIs hay y cómo se buscan en Google.
  - POI nuevo: `key`, `query` (o `place_id` fijo), `category`, `poi_type`, `access_type`
    (`free` | `paid` | `mixed`), `price_display` (solo cifras: «7 €», sin «desde»; se
    enseña tal cual en los 13 idiomas), `price_amount`, `max_km` opcional.
  - POI existente: `id`, `query` para traer sus coordenadas reales, `set` para fijar
    campos, `"google": false` para no tocar sus datos de Google, `deactivate: true` +
    `reason` para desactivarlo (suelta su `place_id`).
  - Zona nueva: `"create": true` en `zone`.
- `text/<zona>/<idioma>.json` — `{ "<key o id>": { name, description, short_tip } }` y
  `_zone` para el nombre y la descripción de la zona. Un campo que no aparece no se toca.
- `.cache/` (ignorado por git) — volcado de producción y respuestas de Google.
- `out/` (ignorado por git) — el SQL y la hoja de revisión de cada zona.

## Pasos

1. **Volcado de producción** (solo lectura; con el árbol sucio el hook exige
   `VT_ALLOW_DIRTY_DEPLOY=1`, que aquí está justificado porque nada escribe):
   ```bash
   npx wrangler d1 execute restaurant-menu-saas --remote --json --command="SELECT p.id, p.zone_id, p.category, p.subcategory, p.poi_type, p.access_type, p.price_display, p.price_amount, p.is_bookable, p.is_active, p.latitude, p.longitude, p.google_place_id, p.google_maps_url, p.address, p.website_url, p.opening_hours, p.source, p.order_index, (SELECT json_group_object(t.language_code || '.' || t.field, t.value) FROM translations t WHERE t.entity_id=p.id AND t.entity_type='poi') AS tr FROM guide_pois p WHERE p.zone_id IN (<zonas>) AND p.category<>'Restaurantes'" > scripts/poi-seed/.cache/existing.raw
   npx wrangler d1 execute restaurant-menu-saas --remote --json --command="SELECT id, google_place_id FROM guide_pois WHERE google_place_id IS NOT NULL" > scripts/poi-seed/.cache/pid.raw
   npx wrangler d1 execute restaurant-menu-saas --remote --json --command="SELECT slug, zone_id FROM guide_apartments" > scripts/poi-seed/.cache/apt.raw
   ```
   y pasarlos a `existing.json` (con `tr` ya parseado), `place_ids.json` y `apartments.json`.
2. **Google:** `node scripts/poi-seed/enrich.mjs [zona|all]`. La clave sale de
   `GOOGLE_PLACES_API_KEY` o de `.dev.vars`. Ojo: el proyecto de Google Cloud tiene un
   **tope diario** de Text Search y Place Details (~110 al día, salta un 429
   `RESOURCE_EXHAUSTED`); se reinicia a medianoche de California (09:00 en España).
   Lo resuelto queda en caché y no se vuelve a pagar.
3. **Build:** `node scripts/poi-seed/build.mjs [zona|all]`. Si hay errores no genera el SQL.
   Mirar `out/<zona>.review.md`: «el pin se mueve N m» casi siempre es la corrección de una
   coordenada inventada; «lejos» y «nombre distinto» hay que mirarlos a ojo.
4. **Probar el SQL** contra una D1 desechable con el esquema de producción (nunca contra la
   D1 local del proyecto): `wrangler d1 execute ... --local --persist-to <carpeta temporal>`
   con `BDschemaFinal.sql`, los 13 idiomas, las zonas y los POIs del volcado.
5. **Commit**, y luego aplicar: `npx wrangler d1 execute restaurant-menu-saas --remote --file=scripts/poi-seed/out/<zona>.sql`.
6. **Caché:** los comandos `wrangler kv key put ... "ver:zone:<zona>"` (y `ver:apt:*`,
   `ver:zonecatalog` si hay zona nueva) que imprime el build. Comprobar con
   `curl -sI https://<api>/guide/<slug>?lang=ja` que sale `X-Cache: MISS` y el texto nuevo.
