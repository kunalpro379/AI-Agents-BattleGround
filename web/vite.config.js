import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/backend-check': {
        target: 'https://kunaldp379-aiagentsarena.hf.space/',
        changeOrigin: true,
        rewrite: () => '/',
      },
      '/api': {
        target: 'https://kunaldp379-aiagentsarena.hf.space/',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
