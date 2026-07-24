import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  optimizeDeps: {
    include: ['chart.js', 'react-chartjs-2']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    force: true // Fuerza la reoptimización de dependencias
  },
  build: {
    rollupOptions: {
      output: {
        // ✅ Separa vendors pesados del bundle principal para que el navegador
        // los cachee de forma independiente entre despliegues.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@mui/x-data-grid'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
})

