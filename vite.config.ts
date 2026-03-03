import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',

  plugins: [
    react(),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },

  optimizeDeps: {
    include: ['@clerk/react', '@clerk/shared'],
    force: true,
  },

  build: {
    outDir: 'dist',
    commonjsOptions: {
      include: [/@clerk\/shared/, /@clerk\/react/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Clerk chunk — keep all clerk packages together to avoid ESM split issues
          if (id.includes('node_modules/@clerk/')) {
            return 'clerk'
          }

          // Vendor chunk — React core and state management
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/zustand/')
          ) {
            return 'vendor'
          }

          // Admin chunk — only loaded when visiting /admin
          if (id.includes('/src/admin/')) {
            return 'admin'
          }

          // Detail pages chunk — lazy-loaded on first detail page open
          if (id.includes('/src/components/details/')) {
            return 'detail-pages'
          }
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('API proxy error — is vercel dev running on port 3000?', err.message);
          });
        },
      },
    },
  },
})