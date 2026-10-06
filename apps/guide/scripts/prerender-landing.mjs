#!/usr/bin/env node
/**
 * Mete el HTML de la landing y de cada página de venta, con sus datos estructurados, en dist/: la landing en
 * dist/index.html y las demás en dist/<ruta>.html (Pages sirve dist/para/x.html en /para/x). La lista de páginas
 * sale de src/prerender.tsx. Corre al final de `npm run build`, después de `vite build`.
 *
 * Por qué: la guía es una SPA y los rastreadores de las IA no ejecutan JavaScript. Sin esto, ChatGPT,
 * Perplexity o Claude ven guide.visualtastes.com como un <div id="root"></div> vacío.
 *
 * Cómo, sin tocar la guía del huésped:
 *  - dist/index.html lo sirve Pages para /, /legal y /<slug> (no hay 404.html): por eso su <title> y su descripción
 *    los vuelve a poner el script en línea fuera de las páginas de venta, y su Open Graph se queda el genérico.
 *  - El marcado va dentro de #root, en un .vt-pre que ninguna persona llega a ver: la regla de index.html lo
 *    oculta con CSS (los extractores de texto no aplican CSS) y React lo sustituye al montar, en cualquier ruta.
 *  - Las <img> van sin src (data-src): el huésped que abre /<slug> no se baja las fotos de la landing oculta.
 *  - Las rutas que no son páginas de venta llevan X-Robots-Tag: noindex (public/_headers), y el script en línea de
 *    index.html les quita el canonical y el JSON-LD.
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

let pages
try {
  const entry = fs.readdirSync(TMP).find((f) => /^prerender\.m?js$/.test(f))
  if (!entry) fail(`el build SSR no dejó prerender.js en ${TMP}`)
  const mod = await import(pathToFileURL(path.join(TMP, entry)).href)
  pages = mod.PRERENDER_PAGES.map((p) => ({ ...p, markup: p.html() }))
} finally {
  fs.rmSync(TMP, { recursive: true, force: true })
}

const SITE = 'https://guide.visualtastes.com'
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const swap = (doc, re, value, what) => {
  if (!re.test(doc)) fail(`dist/index.html no tiene ${what}.`)
  return doc.replace(re, value)
}

// ---------- datos estructurados ----------
// La organización es la misma entidad en visualtastes.com, guide. y tv.: mismo @id en los tres sitios.
const ORG = {
  '@type': 'Organization',
  '@id': 'https://visualtastes.com/#organization',
  name: 'VisualTaste',
  url: 'https://visualtastes.com/',
  logo: 'https://visualtastes.com/logo.png',
  email: 'info@visualtastes.com',
  telephone: '+34 633 74 70 33',
  contactPoint: { '@type': 'ContactPoint', telephone: '+34 633 74 70 33', contactType: 'sales', availableLanguage: ['es', 'en'] },
}
const SITE_NODE = {
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  url: `${SITE}/`,
  name: 'VisualTaste Guía',
  inLanguage: 'es',
  publisher: { '@id': ORG['@id'] },
}
const APP = {
  '@type': 'SoftwareApplication',
  '@id': `${SITE}/#app`,
  name: 'VisualTaste Guía',
  alternateName: 'VisualTaste Guide',
  url: `${SITE}/`,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Guía digital para alojamientos turísticos',
  operatingSystem: 'Web',
  inLanguage: ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'],
  description:
    'Guía digital con QR para apartamentos turísticos, casas vacacionales y alojamientos: WiFi, normas, mapa de la zona, restaurantes, tienda de extras y un conserje con IA, traducida a 13 idiomas y sin que el huésped instale nada.',
  featureList: [
    'WiFi, código de entrada, hora de salida y normas de la casa',
    'Mapa con lugares de interés y tiempo hasta el alojamiento',
    'Restaurantes recomendados, con reserva por teléfono o WhatsApp',
    'Tienda de productos y experiencias con pedido por WhatsApp',
    'Conserje con IA que responde con la información del alojamiento',
    'Traducción a 13 idiomas, árabe incluido',
    'Estadísticas anónimas de uso de la guía',
    'App gratuita para la tele del salón (VisualTaste TV)',
  ],
  offers: {
    '@type': 'Offer',
    price: '600',
    priceCurrency: 'EUR',
    description: 'Hasta 30 alojamientos, todo incluido, pago anual. Precio sin IVA. Más de 30 alojamientos, a consultar.',
    priceSpecification: { '@type': 'UnitPriceSpecification', price: '50', priceCurrency: 'EUR', unitText: 'mes', valueAddedTaxIncluded: false },
  },
  publisher: { '@id': ORG['@id'] },
}

function ldFor(p) {
  const url = p.path === '/' ? `${SITE}/` : `${SITE}${p.path}`
  const graph = [ORG, SITE_NODE]
  if (p.path === '/') graph.push(APP)
  else
    graph.push(
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: p.title,
        description: p.description,
        inLanguage: 'es',
        isPartOf: { '@id': SITE_NODE['@id'] },
        about: { '@id': APP['@id'] },
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: p.name, item: url },
        ],
      },
    )
  if (p.faq.length)
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: p.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    })
  // `<` escapado: el JSON va dentro de un <script> y ninguna cadena debe poder cerrarlo.
  return `<script type="application/ld+json" id="vt-ld">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\u003c')}</script>`
}

// ---------- un HTML por página ----------
for (const p of pages) {
  let markup = p.markup
  const words = markup.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length
  if (words < 300) fail(`el HTML de ${p.path} solo tiene ${words} palabras: algo ha fallado al renderizar.`)

  // Ninguna imagen se descarga mientras el HTML está oculto: Chrome baja las <img> con display:none aunque lleven
  // loading="lazy" (comprobado: el huésped de /<slug> se bajaba las seis fotos). Sin src no hay descarga, y al
  // rastreador le basta con el alt.
  markup = markup.replace(/(<img\b[^>]*?\s)(src|srcset)=/g, '$1data-$2=')
  if (/<img\b[^>]*\s(src|srcset)=/.test(markup)) fail(`queda alguna <img> con src en el HTML de ${p.path}.`)

  const url = p.path === '/' ? `${SITE}/` : `${SITE}${p.path}`
  let doc = html
  doc = swap(doc, /<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`, '<title>')
  doc = swap(doc, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(p.description)}" />`, 'meta description')
  doc = swap(doc, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical')
  // dist/index.html también es la guía de cada huésped: su Open Graph (lo que enseña WhatsApp) se queda el genérico.
  if (p.path !== '/') {
    doc = swap(doc, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(p.title)}" />`, 'og:title')
    doc = swap(doc, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(p.description)}" />`, 'og:description')
  }
  doc = doc
    .replace('<!--vt:ld-->', ldFor(p))
    .replace('<div id="root"></div>', `<div id="root"><div class="vt-pre">${markup}</div></div>`)

  const out = path.join(DIST, p.file)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, doc)
  console.log(`✓ prerender: ${p.path} → dist/${p.file} (${words} palabras, ${Math.round(doc.length / 1024)} KB)`)
}
