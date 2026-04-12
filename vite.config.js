import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isBeta  = mode === 'beta'
  const isPages = mode === 'pages'
  const isAlpha = mode === 'alpha'

  return {
    // GitHub Pages lives under `/<repo-name>/`.
    // Alpha (cPanel) and production both use root `/`.
    base: isPages ? '/PEPTQ_STABLE/' : (isBeta ? './' : '/'),
    plugins: [react()],
    build: {
      // alpha → outputs directly into the PEPTQ ALPHA folder for cPanel upload
      outDir: isBeta
        ? 'BETA_WEBSITE_ONLY_FOLDER'
        : isAlpha
          ? '../PEPTQ ALPHA'
          : 'dist',
      emptyOutDir: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app-[hash].js',
          chunkFileNames: 'assets/chunk-[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')
            if (!normalizedId.includes('/node_modules/')) return

            if (normalizedId.includes('/react-router-dom/')) return 'routing'
            if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) return 'core'
            if (normalizedId.includes('/jspdf/')) return 'documents'
            if (normalizedId.includes('/html2canvas/')) return 'capture'
            if (normalizedId.includes('/lucide-react/') || normalizedId.includes('/framer-motion/')) return 'interface'
            return 'shared'
          },
        },
      },
    },
  }
})
