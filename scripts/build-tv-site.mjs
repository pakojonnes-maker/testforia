#!/usr/bin/env node
/**
 * Combina la landing y la app de la TV en UN solo despliegue de Pages: el proyecto
 * `visualtaste-tv`, el que tiene el dominio tv.visualtastes.com.
 *
 * Por qué: un `wrangler pages deploy` sustituye el sitio ENTERO. Como tv.visualtastes.com enseña
 * la landing en la raíz y la app de la TV en `/<slug>` y `/#<código>`, las dos tienen que viajar
 * juntas; subir solo una borra la otra (el hook pre-deploy-guard lo impide).
 *
 * Uso:
 *   node scripts/build-tv-site.mjs [--shell <dir>] [--landing <dir>] [--out <dir>]
 *     --shell    build de la app de la TV  (por defecto apps/tv/dist)
 *     --landing  build de la landing       (por defecto apps/tv-landing/dist)
 *     --out      carpeta a desplegar       (por defecto dist-tv-site, ignorada por git)
 *
 * Resultado:
 *   index.html, img/, og.jpg, robots.txt, _headers…   ← la landing
 *   tv-shell/index.html                               ← el index.html de la app de la TV
 *   assets/                                           ← las dos apps mezcladas (nombres con hash)
 *
 * Después:
 *   npx wrangler pages deploy dist-tv-site --project-name=visualtaste-tv --branch main
 *
 * OJO con `--shell`: apps/tv/dist sale de compilar la copia de trabajo, que puede llevar trabajo
 * a medias de otra sesión. Para publicar solo lo que ya está en producción, pásale una copia de
 * lo que sirve hoy la app de la TV.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return path.resolve(ROOT, i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback)
}
const shellDir = arg('shell', 'apps/tv/dist')
const landingDir = arg('landing', 'apps/tv-landing/dist')
const outDir = arg('out', 'dist-tv-site')

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1) }
const rel = (p) => path.relative(ROOT, p) || '.'

function walk(dir, base = dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue // .DS_Store, manifiestos de copia…: nunca se despliegan
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full, base))
    else files.push(path.relative(base, full).split(path.sep).join('/'))
  }
  return files
}

// ---------- entradas ----------
if (!fs.existsSync(path.join(shellDir, 'index.html')))
  fail(`No hay index.html en ${rel(shellDir)}: compila la app de la TV (npm run build:tv) o pasa --shell <carpeta>.`)
if (!fs.existsSync(path.join(landingDir, 'index.html')))
  fail(`No hay index.html en ${rel(landingDir)}: compila la landing (npm run build:tv-landing).`)

const shellHtml = fs.readFileSync(path.join(shellDir, 'index.html'), 'utf8')
const landingHtml = fs.readFileSync(path.join(landingDir, 'index.html'), 'utf8')

if (!shellHtml.includes('id="root"'))
  fail(`${rel(shellDir)}/index.html no tiene #root: no parece la app de la TV.`)
if (landingHtml.includes('id="root"'))
  fail(`${rel(landingDir)}/index.html tiene #root: parece la app de la TV, no la landing (¿--shell y --landing al revés?).`)
if (/(?:src|href)="\.\//.test(shellHtml))
  fail(`${rel(shellDir)} está compilada para el APK (rutas ./assets): no funciona en /<slug>. Usa npm run build:tv, sin build:apk.`)

// Ficheros que cambiarían el comportamiento de TODO el sitio: si aparecen hay que decidir a mano.
for (const [dir, name] of [[shellDir, 'la app de la TV'], [landingDir, 'la landing']]) {
  for (const special of ['404.html', '_redirects', '_worker.js', '_routes.json'])
    if (fs.existsSync(path.join(dir, special)))
      fail(`${name} trae ${special}. Sin 404.html Pages contesta a cualquier ruta con index.html (fallback de SPA), y la landing depende de eso para recibir /<slug>. Revísalo antes de combinar.`)
}
if (fs.existsSync(path.join(shellDir, '_headers')))
  fail(`la app de la TV trae _headers y la landing también: hay que fusionarlos a mano (o mover las reglas a una sola).`)

// ---------- combinar ----------
fs.rmSync(outDir, { recursive: true, force: true })
fs.cpSync(landingDir, outDir, { recursive: true })

let copied = 0
let deduped = 0
for (const file of walk(shellDir)) {
  if (file === 'index.html') continue
  const dest = path.join(outDir, file)
  const bytes = fs.readFileSync(path.join(shellDir, file))
  if (fs.existsSync(dest)) {
    if (fs.readFileSync(dest).equals(bytes)) { deduped++; continue } // mismo fichero (p. ej. las fuentes de @fontsource)
    fail(`Colisión en ${file}: la landing y la app de la TV traen ficheros distintos con el mismo nombre.`)
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, bytes)
  copied++
}
fs.mkdirSync(path.join(outDir, 'tv-shell'), { recursive: true })
fs.writeFileSync(path.join(outDir, 'tv-shell', 'index.html'), shellHtml)

// ---------- comprobaciones del resultado ----------
const out = new Set(walk(outDir))
if (out.has('404.html')) fail('El resultado tiene 404.html.')
const missing = [...shellHtml.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1].slice(1)).filter((f) => !out.has(f))
if (missing.length) fail(`El index.html de la app de la TV referencia ficheros que no están en el resultado: ${missing.join(', ')}`)

const kb = Math.round([...out].reduce((n, f) => n + fs.statSync(path.join(outDir, f)).size, 0) / 1024)
console.log(`✓ ${rel(outDir)}: ${out.size} ficheros, ${kb} KB`)
console.log(`  landing  ← ${rel(landingDir)}`)
console.log(`  app TV   ← ${rel(shellDir)}  (${copied} ficheros añadidos, ${deduped} idénticos a los de la landing)`)
console.log(`\nSiguiente paso:\n  npx wrangler pages deploy ${rel(outDir)} --project-name=visualtaste-tv --branch main`)
