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
        // ✅ Separa vendors pesados del bundle principal para que el navegador
        // los cachee de forma independiente entre despliegues.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-motion': ['framer-motion'],
          'vendor-swiper': ['swiper'],
        },
      },
    },
  },
}))
