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
      '@aios/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@aios/finance': path.resolve(__dirname, '../finance/src'),
      '@aios/health': path.resolve(__dirname, '../health/src'),
      '@aios/career': path.resolve(__dirname, '../career/src'),
    },
  },
  optimizeDeps: {
    include: [
      'dayjs',
      'styled-components',
      'framer-motion',
      '@dnd-kit/core',
    ],
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    proxy: {
      // 127.0.0.1 (not "localhost") — Node resolves localhost to IPv6 ::1 first,
      // but the backend binds IPv4, so localhost proxying intermittently ECONNREFUSEDs.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
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
