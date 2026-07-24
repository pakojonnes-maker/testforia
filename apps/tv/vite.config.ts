import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Guidebook TV app — 10-foot UI for smart TVs (Android TV / Fire TV first).
// Dev port 5176 (client 5173, admin 5174, guide 5175, tv 5176).
export default defineConfig({
  plugins: [react() as any, tailwindcss()],
  server: {
    port: 5176,
    host: true,
  },
})
