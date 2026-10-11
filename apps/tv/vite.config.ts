import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Guidebook TV app — 10-foot UI for smart TVs (Android TV / Fire TV first).
// Dev port 5176 (client 5173, admin 5174, guide 5175, tv 5176).
//
// `base` NO se fija aquí a proposito, y no es un descuido — es que los dos
// destinos necesitan valores CONTRARIOS:
//
//   · Pages (demo/QA) necesita base absoluta '/'. La app se sirve tambien en
//     tv.visualtastes.com/<slug> porque useGuidebook lee el slug del pathname;
//     con base relativa, ese mismo HTML pediria /<slug>/assets/... y daria 404.
//
//   · El APK usa base relativa './'. Hoy el envoltorio (apps/tv/android) sirve
//     los ficheros bajo https://tv.visualtastes.com/ y ahí '/' también valdría,
//     pero './' sigue funcionando si alguna vez se abre desde
//     file:///android_asset/, donde un src="/assets/..." resolvería a la raíz
//     del sistema de ficheros: pantalla negra, sin ningún error visible.
//
// Por eso el build del APK va por su propio script (`npm run build:apk`), que
// pasa --base=./ por CLI y escribe en `dist-apk/`, NO en `dist/`: dist/ es lo
// que scripts/build-tv-site.mjs sube a tv.visualtastes.com, y un build con base
// relativa allí rompería las URLs /<slug>. Se hace con banderas y no con una
// variable de entorno porque este repo se desarrolla en Windows y
// `VAR=x vite build` no funciona en cmd/PowerShell.
//
// El JS de entrada se llama `tv-<hash>.js`, no `index-<hash>.js`: en
// tv.visualtastes.com la landing y esta app comparten /assets, y así se sabe de
// quién es cada uno. Además, oct-2026: el borde de Cloudflare guardó un año
// (/assets/* es `immutable`) el index.html de reserva bajo la URL de un
// `index-<hash>.js` pedido antes de desplegarlo. Ese nombre no debe volver a salir.
export default defineConfig({
  plugins: [react() as any, tailwindcss()],
  build: {
    rollupOptions: {
      output: { entryFileNames: 'assets/tv-[hash].js' },
    },
  },
  server: {
    port: 5176,
    host: true,
  },
})
