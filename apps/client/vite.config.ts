import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Datos estructurados (JSON-LD) de la landing central (central/index.html, la de visualtastes.com/). Solo actúa
 * sobre esa página: el index.html de la SPA lleva su propio JSON-LD a mano. Las preguntas se leen del propio HTML
 * (.faq-q / .faq-a), así el JSON-LD no puede desfasarse del texto visible, que es lo que Google exige.
 * La organización lleva el mismo @id que en guide. y tv.visualtastes.com: es una sola entidad con tres productos.
 */
function centralStructuredData(): Plugin {
  const text = (s: string) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()

  const unitPrice = (price: string) => ({
    '@type': 'UnitPriceSpecification',
    price,
    priceCurrency: 'EUR',
    unitText: 'por alojamiento y mes',
    valueAddedTaxIncluded: false,
  })
  const app = (name: string, url: string, os: string, price: string, description: string) => ({
    '@type': 'SoftwareApplication',
    name,
    url,
    applicationCategory: 'BusinessApplication',
    operatingSystem: os,
    description,
    publisher: { '@id': 'https://visualtastes.com/#organization' },
    offers: { '@type': 'Offer', price, priceCurrency: 'EUR', priceSpecification: unitPrice(price) },
  })
  const packageOffer = (price: string, min: number, max: number) => ({
    '@type': 'Offer',
    price,
    priceCurrency: 'EUR',
    eligibleQuantity: { '@type': 'QuantitativeValue', minValue: min, maxValue: max, unitText: 'alojamientos' },
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price,
      priceCurrency: 'EUR',
      unitText: 'al mes',
      valueAddedTaxIncluded: false,
    },
  })

  return {
    name: 'vt-central-structured-data',
    transformIndexHtml(html, ctx) {
      if (!ctx.path.replace(/\\/g, '/').endsWith('/central/index.html')) return
      const questions = [
        ...html.matchAll(
          /<details[^>]*>\s*<summary>\s*<span class="faq-q">([\s\S]*?)<\/span>[\s\S]*?<\/summary>\s*<p class="faq-a">([\s\S]*?)<\/p>/g,
        ),
      ].map(([, q, a]) => ({ '@type': 'Question', name: text(q), acceptedAnswer: { '@type': 'Answer', text: text(a) } }))
      if (questions.length === 0) throw new Error('vt-central-structured-data: no hay ninguna .faq-q/.faq-a en central/index.html')

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
            telephone: '+34633747033',
            areaServed: 'ES',
          },
          {
            '@type': 'WebSite',
            '@id': 'https://visualtastes.com/#website',
            url: 'https://visualtastes.com/',
            name: 'VisualTaste',
            inLanguage: 'es',
            publisher: { '@id': 'https://visualtastes.com/#organization' },
          },
          app(
            'VisualTaste Guía',
            'https://guide.visualtastes.com/',
            'Web',
            '3.00',
            'Guía digital del alojamiento para el móvil del huésped, en 13 idiomas: WiFi, normas, mapa de la zona, restaurantes y tienda de extras.',
          ),
          app(
            'VisualTaste Guía con conserje IA',
            'https://guide.visualtastes.com/funciones/conserje-ia',
            'Web',
            '4.00',
            'La guía digital con un conserje con IA que contesta a cualquier hora, en el idioma del huésped y solo con lo que el anfitrión ha cargado.',
          ),
          app(
            'VisualTaste TV',
            'https://tv.visualtastes.com/',
            'Android TV',
            '13.00',
            'Pantalla de bienvenida para la tele del alojamiento: WiFi con QR, hora de salida y alrededores, en 13 idiomas y manejada con el mando.',
          ),
          {
            '@type': 'Product',
            name: 'VisualTaste, paquete completo',
            description: 'Guía digital, conserje con IA y VisualTaste TV, con todo incluido, a un precio cerrado al mes.',
            brand: { '@id': 'https://visualtastes.com/#organization' },
            offers: [packageOffer('70.00', 1, 30), packageOffer('100.00', 31, 50)],
          },
          { '@type': 'FAQPage', '@id': 'https://visualtastes.com/#faq', mainEntity: questions },
        ],
      }
      // `<` escapado: el JSON va dentro de un <script> y ninguna cadena debe poder cerrarlo.
      const json = JSON.stringify(ld).replace(/</g, '\\u003c')
      return [{ tag: 'script', attrs: { type: 'application/ld+json' }, children: json, injectTo: 'head' }]
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react() as any, centralStructuredData()],
  esbuild: {
    // ✅ Elimina todos los console.* y debugger en el build de producción.
    // En dev (npm run dev:client) se mantienen para depurar.
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    // Con dos entradas, Rollup saca el polyfill de modulepreload a un chunk compartido y la carta lo precargaría
    // junto a vendor-react (su index.html solo debe precargar vendor-react). Solo servía a Safari ≤ 16 para que
    // entendiera <link rel="modulepreload">: sin él esos navegadores cargan igual, sin la precarga.
    modulePreload: { polyfill: false },
    rollupOptions: {
      // Dos entradas, un solo despliegue: la SPA de la carta (index.html) y la landing central de visualtastes.com
      // (central/index.html, sin React). public/_worker.js decide cuál sale en «/» según el host.
      input: { main: 'index.html', central: 'central/index.html' },
      output: {
        // Vendors pesados en su propio chunk, cacheables entre despliegues. MUI y
        // framer-motion solo los piden las páginas y los diálogos que los usan:
        // la carta arranca sin ellos (App.tsx, carta/LegacyLayer.tsx).
        // Función y no objeto: con la forma objeto, Rollup metía en vendor-mui lo que MUI comparte
        // con React (el runtime de JSX) y la entrada acababa precargando los 92 KB de MUI.
        manualChunks(id: string) {
          // El ayudante CommonJS de Rollup (sin ruta): con React, que lo carga todo el mundo. Los
          // envoltorios CommonJS de cada paquete llevan su ruta y caen abajo con su paquete.
          if (id.includes('commonjsHelpers')) return 'vendor-react';
          if (!id.includes('node_modules')) return undefined;
          if (/[\/]node_modules[\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\/]/.test(id)) return 'vendor-react';
          if (/[\/]node_modules[\/](@mui|@emotion|@popperjs|react-transition-group|stylis|hoist-non-react-statics|react-is|prop-types|@babel)[\/]/.test(id)) return 'vendor-mui';
          if (/[\/]node_modules[\/](framer-motion|motion-dom|motion-utils)[\/]/.test(id)) return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
}))
