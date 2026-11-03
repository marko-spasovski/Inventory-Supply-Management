import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'inventory-mf',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App' },
      shared: { react: { singleton: true, requiredVersion: '^18.3.1' }, 'react-dom': { singleton: true, requiredVersion: '^18.3.1' }, 'react-router-dom': { singleton: true, requiredVersion: '^6.28.0' } },
    }),
  ],
  server: { port: 3003, proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') } } },
  build: { target: 'esnext', minify: false },
});
