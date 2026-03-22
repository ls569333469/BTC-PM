import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ─── Python Backend Migration ───────────────────────────────────────────
// Proxy changed from Express :3001 → FastAPI :8000
// Removed Surf proxy (/proxy/*) — all data sources direct from Python
const BACKEND_PORT = 8000

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      // /api/* → FastAPI (all routes: chanlun, backtest, polymarket, cron)
      '/api': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
      },
      // /ws/* → FastAPI WebSocket
      '/ws': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      // React core
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      // Data fetching
      '@tanstack/react-query',
      '@tanstack/query-core',
      // Charts
      'echarts',
      'echarts-for-react',
      'echarts/core',
      'echarts/charts',
      'echarts/components',
      'echarts/renderers',
      // UI primitives (Radix)
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      // UI components
      'sonner',
      'cmdk',
      // Utilities
      'lucide-react',
      'next-themes',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'date-fns',
      'zod',
    ],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
