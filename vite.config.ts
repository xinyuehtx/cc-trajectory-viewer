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
    cssMinify: 'esbuild',
    // Obfuscate + shrink: terser mangles names, drops dead code and console/debug
    // calls, and runs multiple compress passes for a smaller shipped bundle.
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 3,
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: { toplevel: true },
      format: { comments: false },
    },
    rollupOptions: {
      output: {
        // Split the heaviest third-party code into its own long-cacheable chunks.
        manualChunks: {
          vendor: ['react', 'react-dom'],
          highlight: ['highlight.js/lib/common'],
          markdown: ['marked', 'dompurify'],
        },
      },
    },
  },
})
