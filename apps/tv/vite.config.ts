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
//   · El APK necesita base relativa './'. Servido desde
//     file:///android_asset/index.html, un src="/assets/..." resuelve a
//     file:///assets/... — la raiz del sistema de ficheros, no la carpeta de la
//     app. Ni el JS ni el CSS cargan: pantalla negra, sin ningun error visible.
//
// Por eso el build del APK va por su propio script (`npm run build:apk`), que
// pasa --base=./ por CLI. Se hace con la bandera y no con una variable de
// entorno porque este repo se desarrolla en Windows y `VAR=x vite build` no
// funciona en cmd/PowerShell.
export default defineConfig({
  plugins: [react() as any, tailwindcss()],
  server: {
    port: 5176,
    host: true,
  },
})
