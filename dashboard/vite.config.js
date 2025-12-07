import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages でデプロイする際のベースパス
  base: '/company-video-gallery/dashboard/',
  build: {
    outDir: 'dist',
  }
})
