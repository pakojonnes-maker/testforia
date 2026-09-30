#!/usr/bin/env node
/**
 * Mete el HTML de la landing (ruta /) y sus datos estructurados en dist/index.html. Corre al final de
 * `npm run build`, después de `vite build`.
 *
 * Por qué: la guía es una SPA y los rastreadores de las IA no ejecutan JavaScript. Sin esto, ChatGPT,
 * Perplexity o Claude ven guide.visualtastes.com como un <div id="root"></div> vacío.
 *
 * Cómo, sin tocar la guía del huésped:
 *  - dist/index.html sigue siendo el único HTML: Pages lo sirve para /, /legal y /<slug>.
 *  - El marcado va dentro de #root, en un .vt-pre que ninguna persona llega a ver: la regla de index.html lo
 *    oculta con CSS (los extractores de texto no aplican CSS) y React lo sustituye al montar, en cualquier ruta.
 *  - Las <img> van sin src (data-src): el huésped que abre /<slug> no se baja las fotos de la landing oculta.
 *  - Las rutas que no son / llevan X-Robots-Tag: noindex (public/_headers), y el script en línea de index.html
 *    les quita el canonical y el JSON-LD.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const GUIDE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(GUIDE, 'dist')
const TMP = path.join(GUIDE, 'dist-prerender')

const fail = (msg) => {
  console.error(`\n✗ prerender: ${msg}\n`)
  process.exit(1)
}

const indexPath = path.join(DIST, 'index.html')
if (!fs.existsSync(indexPath)) fail('no hay dist/index.html: ejecuta antes vite build.')
let html = fs.readFileSync(indexPath, 'utf8')
if (!html.includes('<div id="root"></div>')) fail('dist/index.html no tiene <div id="root"></div> vacío (¿ya estaba prerenderizado?).')
if (!html.includes('<!--vt:ld-->')) fail('dist/index.html no tiene el marcador <!--vt:ld--> para el JSON-LD.')

// ---------- compilar y renderizar ----------
await build({
  root: GUIDE,
  configFile: path.join(GUIDE, 'vite.config.ts'),
  logLevel: 'warn',
  build: { ssr: 'src/prerender.tsx', outDir: TMP, emptyOutDir: true },
  // Todo dentro del paquete: react-router-dom está en la raíz del monorepo y, externo, arrastraría el React de la
  // raíz (el del admin) en vez del 19 de la guía ("Objects are not valid as a React child"). Y las hojas de
  // @fontsource que importa la landing harían a Node importar un .css.
  ssr: { noExternal: true },
  resolve: { dedupe: ['react', 'react-dom'] },
})

let markup
let faq
try {
  const entry = fs.readdirSync(TMP).find((f) => /^prerender\.m?js$/.test(f))
  if (!entry) fail(`el build SSR no dejó prerender.js en ${TMP}`)
  const mod = await import(pathToFileURL(path.join(TMP, entry)).href)
  markup = mod.renderLanding()
  faq = mod.FAQ
} finally {
  fs.rmSync(TMP, { recursive: true, force: true })
}

const words = markup.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
if (words < 300) fail(`el HTML de la landing solo tiene ${words} palabras: algo ha fallado al renderizar.`)

// Ninguna imagen de la landing se descarga mientras está oculta: Chrome baja las <img> con display:none aunque
// lleven loading="lazy" (comprobado: el huésped de /<slug> se bajaba las seis fotos). Sin src no hay descarga, y al
// rastreador le basta con el alt.
markup = markup.replace(/(<img\b[^>]*?\s)(src|srcset)=/g, '$1data-$2=')
if (/<img\b[^>]*\s(src|srcset)=/.test(markup)) fail('queda alguna <img> con src en el HTML de la landing.')

// ---------- datos estructurados ----------
// La organización es la misma entidad en visualtastes.com, guide. y tv.: mismo @id en los tres sitios.
const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://visualtastes.com/#organization',
      name: 'VisualTaste',
      url: 'https://visualtastes.com/',
      logo: 'https://visualtastes.com/logo.png',
      email: 'info@visualtastes.com',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://guide.visualtastes.com/#website',
      url: 'https://guide.visualtastes.com/',
      name: 'VisualTaste Guía',
      inLanguage: 'es',
      publisher: { '@id': 'https://visualtastes.com/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://guide.visualtastes.com/#app',
      name: 'VisualTaste Guía',
      alternateName: 'VisualTaste Guide',
      url: 'https://guide.visualtastes.com/',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Guía digital para alojamientos turísticos',
      operatingSystem: 'Web',
      inLanguage: ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'],
      description:
        'Guía digital con QR para apartamentos turísticos, casas vacacionales y alojamientos: WiFi, normas, mapa de la zona, restaurantes, tienda de extras y un conserje con IA, traducida a 13 idiomas y sin que el huésped instale nada.',
      featureList: [
        'WiFi, código de entrada, hora de salida y normas de la casa',
        'Mapa con lugares de interés y tiempo hasta el alojamiento',
        'Restaurantes recomendados',
        'Tienda de productos y experiencias con pedido por WhatsApp',
        'Conserje con IA que responde con la información del alojamiento',
        'Traducción a 13 idiomas, árabe incluido',
        'Estadísticas anónimas de uso de la guía',
      ],
      publisher: { '@id': 'https://visualtastes.com/#organization' },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://guide.visualtastes.com/#faq',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
}
// `<` escapado: el JSON va dentro de un <script> y ninguna cadena debe poder cerrarlo.
const ldTag = `<script type="application/ld+json" id="vt-ld">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`

html = html
  .replace('<!--vt:ld-->', ldTag)
  .replace('<div id="root"></div>', `<div id="root"><div class="vt-pre">${markup}</div></div>`)
fs.writeFileSync(indexPath, html)

console.log(`✓ prerender: landing en dist/index.html (${words} palabras, ${Math.round(html.length / 1024)} KB)`)
