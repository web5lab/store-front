import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    /* Same-origin in development: no CORS, and /uploads images just work. */
    proxy: {
      '/api': 'http://localhost:5050',
      '/uploads': 'http://localhost:5050',
    },
  },
})
