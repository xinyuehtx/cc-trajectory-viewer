import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base: './'` keeps all asset URLs relative, so the same build works both when
// served from a GitHub Pages project path (/cc-trajectory-viewer/) and when the
// CLI serves it from http://localhost:<port>/.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
})
