import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react() as any],
  esbuild: {
    // ✅ Elimina todos los console.* y debugger en el build de producción.
    // En dev (npm run dev:client) se mantienen para depurar.
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
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
