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
  }
}) 