import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/shell/src'),
      '@ct/shared': path.resolve(__dirname, './packages/shared/src'),
      '@ct/finance': path.resolve(__dirname, './apps/finance/src'),
      '@ct/health': path.resolve(__dirname, './apps/health/src'),
      '@ct/career': path.resolve(__dirname, './apps/career/src'),
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
