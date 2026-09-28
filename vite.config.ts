import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@': path.resolve(__dirname, './src/app'),
    },
  },
  build: {
    // Recharts 2.x bundles victory-vendor, so the isolated chart chunk is
    // legitimately ~550 kB. Anything else over this size is real bloat.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Recharts pulls in a large dependency tree (d3-shape, d3-scale,
        // victory-vendor). Keep it in its own chunk so the app shell stays
        // small and the chart code caches independently.
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
})
