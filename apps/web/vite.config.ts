import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    port: 3001, // default port 4173
  },
  server: {
    port: 3001, // default port 5173
  },
})
