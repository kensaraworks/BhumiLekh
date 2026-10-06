import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Allow the page to be served through an ngrok tunnel
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io'],
    // Forward API calls to FastAPI so only port 5173 needs to be tunnelled
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
