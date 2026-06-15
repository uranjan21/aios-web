import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'highcharts',
      'highcharts-react-official',
      'dayjs',
      'antd',
      'styled-components',
      'framer-motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
    ],
  },
  server: {
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
})
