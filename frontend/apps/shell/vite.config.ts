import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Workspace packages are consumed straight from source — the shell compiles
    // everything into one SPA, so each alias points at the package's src/.
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ct/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@ct/finance': path.resolve(__dirname, '../finance/src'),
      '@ct/health': path.resolve(__dirname, '../health/src'),
      '@ct/career': path.resolve(__dirname, '../career/src'),
    },
  },
  optimizeDeps: {
    // `@dnd-kit/core` was listed here until 2026-08-17 with zero import sites
    // repo-wide (the drag-and-drop Kanban left with the Content area on
    // 2026-07-21), so every dev-server start paid to pre-bundle dead code.
    include: [
      'dayjs',
      'styled-components',
      'framer-motion',
    ],
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      // 127.0.0.1 (not "localhost") — Node resolves localhost to IPv6 ::1 first,
      // but the backend binds IPv4, so localhost proxying intermittently ECONNREFUSEDs.
      // VITE_PROXY_TARGET overrides it when the dev server runs in a container,
      // where 127.0.0.1 is the frontend container itself (set to http://backend:8000).
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: (process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:8000').replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          ui: ['styled-components', 'framer-motion', 'lucide-react'],
          charts: ['recharts'],
          utils: ['dayjs'],
        }
      }
    }
  }
})
