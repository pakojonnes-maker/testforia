import { defineConfig, type Plugin } from 'vite'

// Landing de VisualTaste TV (tv.visualtastes.com). Estática: sin API, así que
// no toca workerCors.js. Dev port 5177 (client 5173, admin 5174, guide 5175, tv 5176).
//
// `base` se queda en '/': se sirve desde la raíz de su propio proyecto de Pages.
// (A diferencia de apps/tv, no hay APK que necesite rutas relativas.)
export default defineConfig({
  plugins: [structuredData()],
  server: { port: 5177, strictPort: true },
  preview: { port: 5177, strictPort: true },
})

/**
 * Datos estructurados (JSON-LD) para buscadores e IA. Las preguntas frecuentes se leen del propio index.html
 * (.faq-q / .faq-a), así el JSON-LD no puede desfasarse del texto visible, que es lo que Google exige.
 * La organización lleva el mismo @id que en visualtastes.com y guide.visualtastes.com: es una sola entidad.
 */
function structuredData(): Plugin {
  const text = (s: string) =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  return {
    name: 'vt-structured-data',
    transformIndexHtml(html) {
      const questions = [...html.matchAll(/class="faq-q">([\s\S]*?)<\/h3>\s*<p class="faq-a">([\s\S]*?)<\/p>/g)].map(
        ([, q, a]) => ({ '@type': 'Question', name: text(q), acceptedAnswer: { '@type': 'Answer', text: text(a) } }),
      )
      if (questions.length === 0) throw new Error('vt-structured-data: no hay ninguna .faq-q/.faq-a en index.html')

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
            '@id': 'https://tv.visualtastes.com/#website',
            url: 'https://tv.visualtastes.com/',
            name: 'VisualTaste TV',
            inLanguage: 'es',
            publisher: { '@id': 'https://visualtastes.com/#organization' },
          },
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://tv.visualtastes.com/#app',
            name: 'VisualTaste TV',
            url: 'https://tv.visualtastes.com/',
            image: 'https://tv.visualtastes.com/og.jpg',
            applicationCategory: 'BusinessApplication',
            applicationSubCategory: 'Pantalla de bienvenida para la televisión de alojamientos turísticos',
            operatingSystem: 'Android TV',
            inLanguage: ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'ar', 'ru', 'uk', 'zh', 'ja', 'ko'],
            description:
              'Pantalla de bienvenida para la tele de apartamentos turísticos, casas vacacionales y alojamientos: el WiFi con un QR, el código de entrada, la hora de salida, restaurantes y lo mejor de los alrededores, en 13 idiomas y manejada con el mando. Se actualiza desde el mismo panel que la guía digital VisualTaste Guía.',
            featureList: [
              'WiFi con código QR en la pantalla de inicio',
              'Código de entrada y horas de entrada y salida',
              'Restaurantes recomendados con la carta en el móvil por QR',
              'Lugares de interés de los alrededores',
              '13 idiomas, árabe incluido',
              'Se maneja con el mando, sin que el huésped instale nada',
              'Estadísticas anónimas de uso de la pantalla',
            ],
            publisher: { '@id': 'https://visualtastes.com/#organization' },
          },
          { '@type': 'FAQPage', '@id': 'https://tv.visualtastes.com/#faq', mainEntity: questions },
        ],
      }
      // `<` escapado: el JSON va dentro de un <script> y ninguna cadena debe poder cerrarlo.
      const json = JSON.stringify(ld).replace(/</g, '\\u003c')
      return [{ tag: 'script', attrs: { type: 'application/ld+json' }, children: json, injectTo: 'head' }]
    },
  }
}
