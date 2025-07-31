import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    // Исправляем MIME типы для модулей
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    // Добавляем правильную обработку модулей
    fs: {
      strict: false
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'gsap',
            'zustand'
          ]
        }
      }
    }
  },
  define: {
    // Fixes potential issues with some dependencies
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'gsap', 'zustand']
  },
  // Добавляем правильные MIME типы для разработки
  esbuild: {
    loader: 'tsx',
    include: ['src/**/*.tsx', 'src/**/*.ts']
  }
}) 