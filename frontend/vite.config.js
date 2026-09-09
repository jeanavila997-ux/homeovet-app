import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' permite abrir o build em qualquer caminho (GitHub Pages / file://)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
