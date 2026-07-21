import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/shell/src'),
      '@aios/shared': path.resolve(__dirname, './packages/shared/src'),
      '@aios/finance': path.resolve(__dirname, './apps/finance/src'),
      '@aios/health': path.resolve(__dirname, './apps/health/src'),
      '@aios/career': path.resolve(__dirname, './apps/career/src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: [
      'apps/*/src/**/*.test.{ts,tsx}',
      'packages/*/src/**/*.test.{ts,tsx}',
    ],
  },
})
