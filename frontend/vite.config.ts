import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@livekit') || id.includes('livekit-client')) return 'livekit';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('leaflet')) return 'maps';
          if (id.includes('motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        ws: true,
      },
      '/lp': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      },
    },
  },
});
