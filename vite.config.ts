import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['plotly.js-dist-min'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') return
            console.error('[proxy]', err.message)
          })
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
