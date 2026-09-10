---
name: demo
description: Montar (o borrar) una demo del guidebook para enseñársela a una agencia — agencia demo + un apartamento con 14 bloques de guía, tienda, modal y TV, en los 13 idiomas, a partir de una ficha JSON. Úsalo cuando pidan "monta una demo para X", "prepara el guidebook de este piso para enseñarlo", o haya que borrar una demo ya enseñada.
---

# Montar una demo para una agencia

El sembrador vive en `scripts/demo-seed/`. Su `README.md` tiene el detalle; esto es el
ritual, en orden, con las trampas que ya han mordido una vez.

**La regla que lo gobierna todo:** una demo no crea contenido compartido. Reutiliza los
POIs y los restaurantes que ya existen en una zona. Si no, cada agencia que dice que no
deja un rastro de POIs muertos en la base que nadie se acuerda de borrar.

## 1. Sacar los datos del alojamiento

Si te dan una URL, **Booking.com no se puede leer con `fetch`**: devuelve un 202 con un
desafío anti-bot de AWS WAF. `workerGuideApartmentLink.js` ya lo detecta y lo dice por
escrito, y el repo no se lo salta. Airbnb y las webs propias/PMS sí publican JSON-LD y
las lee el importador del admin ("Importar desde URL").

Para una ficha de Booking, ábrela con el navegador (`mcp__Claude_Browser__navigate` +
`get_page_text`) y saca a mano: nombre, dirección, tipo, capacidad, dormitorios, camas,
baños, m², horas de entrada/salida, nota y nº de comentarios, número de licencia y
servicios. Todo lo operativo —wifi, código de puerta, teléfonos— se **inventa**: la guía
enseña la clave del wifi en pantalla, así que ahí nunca va una real.

## 2. Elegir la zona de contenido

La zona decide qué sale en "Explorar" y en "Comer". Comprueba **qué hay de verdad** antes
de prometer nada:

```bash
npx wrangler d1 execute restaurant-menu-saas --remote --json --command="SELECT z.id, z.name, (SELECT COUNT(*) FROM guide_pois p WHERE p.zone_id=z.id AND p.is_active=1) AS pois, (SELECT COUNT(*) FROM guide_zone_restaurants r WHERE r.zone_id=z.id AND r.is_active=1) AS rest FROM guide_zones z ORDER BY pois DESC"
```

Si el piso está en otra provincia que la zona elegida, **se nota**: la cabecera de
Explorar dirá el nombre de la zona. El mapa no delata nada (encuadra sobre los POIs,
nunca sobre el piso), pero la etiqueta sí. Decisión del usuario, no la tomes tú: pregunta
si prefiere dirección real con entorno prestado, o trasladar el piso a la zona.

## 3. La ficha

Copia `scripts/demo-seed/demos/the-host-edition.json` y cambia lo tuyo. Cada campo lleva
un `_algo` al lado explicando qué es. Lo único que cambia entre demos son esos valores:
las guías, los productos y el modal ya están escritos en los 13 idiomas en
`lib/content/` y se rellenan con `{{tokens}}`.

Si añades texto nuevo a `lib/content/`, va **en los 13**. `seed.mjs` avisa de lo que
falte y sigue adelante.

## 4. Generar

```bash
node scripts/demo-seed/seed.mjs <clave>
```

Deja en `out/` el `.seed.sql`, el `.teardown.sql` y un `.assets.ps1`. **No aplica nada**:
si este script lanzara `wrangler` como proceso hijo, pasaría por debajo del hook
`pre-deploy-guard` sin que nadie lo hubiera decidido (CLAUDE.md §7).

## 5. Probar en local antes de tocar producción

```bash
npx wrangler d1 execute restaurant-menu-saas --file=scripts/demo-seed/out/<clave>.seed.sql
```

Levanta `worker` y `guide` de `.claude/launch.json` y abre el slug que imprime la última
consulta del fichero. Comprueba **al menos un idioma no latino** (ja, ar, ko): es donde
se ve si una traducción se quedó a medias.

⚠️ La D1 local **no es un espejo de producción**. Es un fixture con esquemas divergentes
en algunas tablas (ver "Problemas conocidos" abajo). Que algo funcione en local no
prueba que funcione en remoto, y al revés.

## 6. A producción

Commitea primero (CLAUDE.md §7 — el hook lo va a comprobar igual):

```bash
npx wrangler d1 execute restaurant-menu-saas --remote --file=scripts/demo-seed/out/<clave>.seed.sql
```

Si el apartamento **ya existía** (re-siembra), invalida la caché KV con el slug real, o
la guía pública seguirá sirviendo el JSON viejo con `X-Cache: HIT`:

```bash
npx wrangler kv key put --namespace-id=89c387501e00410b9d4f0d80dc563bf2 "ver:apt:<slug>" "$(date +%s%3N)" --remote
```

En un apartamento nuevo no hace falta: la clave incluye el slug y falla en frío.

Verifica contra la respuesta real, no contra el 200 OK:

```bash
curl -s "https://visualtasteworker.franciscotortosaestudios.workers.dev/guide/<slug>?lang=fr" | head -c 400
```

## 7. Imágenes

Sin ellas la demo funciona pero la portada es un arco gris, que es lo primero que ve la
agencia. Deja los ficheros en `scripts/demo-seed/assets/<clave>/` con los nombres que
dice la ficha y ejecuta el `.ps1` generado, que avisa uno por uno de los que falten.

## 8. Borrarla después de la reunión

```bash
npx wrangler d1 execute restaurant-menu-saas --remote --file=scripts/demo-seed/out/<clave>.teardown.sql
```

La última consulta imprime tres contadores; los tres tienen que salir a `0`. Después, R2
(el SQL no puede borrar objetos):

```bash
npx wrangler r2 object delete mediabucket/guide/apartments/<aptId> --recursive --remote
npx wrangler r2 object delete mediabucket/guide/agencies/<agencyId> --recursive --remote
```

El teardown es un **espejo de `deleteApartment()`** en `workerGuideAdmin.js` (~línea
840). Si allí se añade una tabla, hay que añadirla también en `lib/build.mjs`, o el
borrado empezará a dejar restos en silencio.

## Trampas que ya han mordido

- **`guide_info_steps` no llega al huésped.** `workerGuide.js` no devuelve `steps`. Un
  bloque con `is_sequential = 1` enseña su `content` y nada más. Por eso las guías del
  sembrador llevan los pasos numerados dentro del `content`, separados por saltos de
  línea. No montes una demo apoyándote en la tabla de pasos.
- **Nada de markdown.** `InfoSection`/`GuideDetailModal` pintan texto plano; un
  `**negrita**` sale con los asteriscos.
- **`cta_label` no hace falta traducirlo.** `CTAButton.tsx` cae al i18n del frontend, que
  ya está en los 13 idiomas.
- **No traduzcas con `POST /guide/admin/translate`.** Cada demo crea ids nuevos, así que
  la IA se pagaría en cada demo, gastando del mismo cupo diario que el chatbot del
  huésped. La plantilla de `lib/content/` es gratis y determinista.
- **El slug no está en git y es deliberado** (migración 0089). Se genera dentro del
  `INSERT` y queda fuera del `ON CONFLICT DO UPDATE`, así que re-sembrar no invalida los
  QR ya impresos. Para saberlo, pregúntaselo a la base.
