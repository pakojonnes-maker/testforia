# Sembrador de demos

Monta una agencia demo con un apartamento completo —14 bloques de guía, 6
productos de tienda, teléfonos, modal de bienvenida y pantalla de TV— en los 13
idiomas activos, a partir de una ficha JSON de unas 90 líneas. Y genera, en la
misma pasada, el SQL que lo borra todo sin dejar restos.

Existe porque enseñar el producto a una agencia nueva era rellenar el admin a
mano durante horas, y porque una demo a medio rellenar (tarjetas vacías,
idiomas sin traducir) vende peor que no enseñar nada.

```bash
node scripts/demo-seed/seed.mjs the-host-edition
```

No aplica nada: deja tres ficheros en `out/` e imprime los comandos. Ver
"Por qué no aplica solo" más abajo.

---

## Cómo montar una demo nueva

1. **Copia una ficha**: `demos/the-host-edition.json` → `demos/lo-que-sea.json`.
   Cambia agencia, apartamento y `vars`. Todo lo que hay ahí lleva un campo
   `_algo` al lado explicando qué es y por qué.
2. **Genera**: `node scripts/demo-seed/seed.mjs lo-que-sea`
3. **Pruébalo en local** antes de tocar producción:
   ```bash
   npx wrangler d1 execute restaurant-menu-saas --file=scripts/demo-seed/out/lo-que-sea.seed.sql
   ```
   Levanta `worker` y `guide` (`.claude/launch.json`) y abre el slug que
   imprime la última consulta del fichero.
4. **A producción**: el mismo comando con `--remote`. Commitea antes
   (CLAUDE.md §7 — el hook `pre-deploy-guard` lo va a comprobar de todas formas).
5. **Invalida la caché KV** con el slug real. Sin esto, si el apartamento ya
   existía, la guía pública sigue sirviendo el JSON viejo con `X-Cache: HIT`:
   ```bash
   npx wrangler kv key put --namespace-id=89c387501e00410b9d4f0d80dc563bf2 "ver:apt:<slug>" "$(date +%s%3N)" --remote
   ```
6. **Imágenes** (opcional): deja los ficheros en `assets/<clave>/` con los
   nombres que dice la ficha y ejecuta el `.ps1` generado. Sin ellas la demo
   funciona igual, pero las tarjetas salen con el placeholder gris.

## Cómo borrarla

```bash
npx wrangler d1 execute restaurant-menu-saas --remote --file=scripts/demo-seed/out/lo-que-sea.teardown.sql
```

La última consulta del teardown imprime tres contadores; los tres tienen que
salir a `0`. Después, los ficheros de R2 (el SQL no puede borrarlos):

```bash
npx wrangler r2 object delete mediabucket/guide/apartments/<aptId> --recursive --remote
npx wrangler r2 object delete mediabucket/guide/agencies/<agencyId> --recursive --remote
```

---

## Qué crea y qué no toca

**Crea** (todo cuelga del apartamento o de la agencia, y por eso se puede borrar
por completo): `guide_agencies`, `guide_apartments`, `guide_apartment_info` +
sus `guide_apartment_media`, `guide_apartment_phones`, `guide_store_items`
(`owner_type='host'`), `guide_welcome_modals`, `guide_tv_devices`,
`guide_tv_tile_images` y las filas de `translations` de todo eso.

**No toca nunca**: `guide_zones`, `guide_pois`, `guide_poi_media`,
`restaurants`, `guide_zone_restaurants`, los catálogos globales
(`guide_info_categories`, `guide_phone_categories`), los `guide_store_items`
con `owner_type='platform'` y las `translations` de todas esas entidades.

Ese es el punto: la demo **reutiliza** las experiencias y los restaurantes que
ya existen en la zona en lugar de duplicarlos. Al borrarla, la zona queda
exactamente como estaba. La contrapartida es que la pestaña "Explorar" enseña
la zona que le asignes, no la del piso — si el apartamento está en otra
provincia, se nota. Es una decisión consciente de la ficha, no un descuido.

El teardown es un espejo de `deleteApartment()` en `workerGuideAdmin.js`
(~línea 840). **Si allí se añade una tabla nueva, hay que añadirla aquí**, o el
borrado empezará a dejar restos en silencio.

## Idiomas

`lib/content/` tiene las guías, los productos y el modal escritos a mano en los
13 idiomas activos. Se escribieron **una vez** y valen para cualquier demo
futura: lo que cambia entre demos son los `{{tokens}}` (nombre del piso, wifi,
anfitrión, horarios), que son idénticos en los 13 idiomas.

Por eso no se usa `POST /guide/admin/translate` (Workers AI): cada demo crea
entidades con ids nuevos, así que traducir con IA se pagaría **en cada demo**,
gastando neuronas del mismo cupo diario que el chatbot del huésped
(`workerGuideTranslate.js` reserva 6.000 de 10.000). La plantilla es gratis,
instantánea y siempre da el mismo resultado.

`seed.mjs` avisa si a algún campo le falta algún idioma, y sigue: una demo con
11 idiomas es mejor que un script que no genera nada.

## Detalles que no son obvios

**Las 3 guías son texto numerado, no `guide_info_steps`.** La tabla existe y el
admin sabe escribirla, pero `workerGuide.js` —la respuesta pública de
`GET /guide/:slug`— no devuelve `steps`. `GuideDetailModal.tsx` tiene el render
de pasos preparado y nunca recibe datos. Hasta que eso se arregle, un bloque con
`is_sequential = 1` enseña su `content` y nada más, así que los pasos van dentro
del `content` con saltos de línea.

**El slug no está en git, a propósito.** Se genera dentro del `INSERT` con
`lower(hex(randomblob(4)))`, igual que la migración 0089, y queda fuera del
`ON CONFLICT DO UPDATE`: re-sembrar no invalida los QR ya impresos. Para
saberlo, mira la última consulta del `.sql` o pregúntaselo a la base.

**`translations` no usa `ON CONFLICT`, usa borrar-y-reinsertar.** La D1 local y
la de producción tienen esquemas distintos en esa tabla (local: `id TEXT
PRIMARY KEY` sin restricción única sobre la tupla; producción: única sobre
`(entity_id, entity_type, field, language_code)`). Cualquier `ON CONFLICT` que
funcione en una revienta en la otra. Ver el comentario en `lib/sql.mjs`.

**Por qué no aplica solo.** El hook `.claude/hooks/pre-deploy-guard.mjs` vigila
los comandos de Bash que escriben en producción. Un script de Node que lanzara
`wrangler` como proceso hijo pasaría por debajo de ese guardarraíl sin que nadie
lo hubiera decidido. Generar y aplicar son dos pasos a propósito.

## Estructura

```
demos/<clave>.json      La ficha de una demo. Es lo único que se toca por demo.
lib/content/guides.mjs  3 guías (llegada, piscina, salida) x 13 idiomas.
lib/content/info.mjs    11 bloques de información x 13 idiomas.
lib/content/store.mjs   6 productos + modal de bienvenida x 13 idiomas.
lib/build.mjs           Motor: ficha -> SQL de alta, SQL de borrado, manifiesto.
lib/sql.mjs             Escapado, interpolación de {{tokens}}, filas de traducción.
seed.mjs                CLI.
assets/<clave>/         Imágenes (no versionadas). Opcionales.
out/                    Lo generado. Versionado: es lo que de verdad se aplicó.
```
