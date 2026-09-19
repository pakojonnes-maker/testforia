import { defineConfig } from 'vite'

// Landing de VisualTaste TV (tv.visualtastes.com). Estática: sin API, así que
// no toca workerCors.js. Dev port 5177 (client 5173, admin 5174, guide 5175, tv 5176).
//
// `base` se queda en '/': se sirve desde la raíz de su propio proyecto de Pages.
// (A diferencia de apps/tv, no hay APK que necesite rutas relativas.)
export default defineConfig({
  server: { port: 5177, strictPort: true },
  preview: { port: 5177, strictPort: true },
})
