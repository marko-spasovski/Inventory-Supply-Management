import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

// Remote MF URLs are env-overridable so the same shell builds for two layouts:
//  - local dev: each MF on its own localhost port (defaults below)
//  - OpenShift single-host: all MFs served by one nginx under /mf/<name>/,
//    so the remotes become same-origin relative paths (set via VITE_*_MF_URL).
const env = process.env;
const remote = (key: string, fallback: string) => env[key] || fallback;

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        authMf:        remote('VITE_AUTH_MF_URL',       'http://localhost:3001/assets/remoteEntry.js'),
        warehousesMf:  remote('VITE_WAREHOUSES_MF_URL', 'http://localhost:3002/assets/remoteEntry.js'),
        inventoryMf:   remote('VITE_INVENTORY_MF_URL',  'http://localhost:3003/assets/remoteEntry.js'),
        ordersMf:      remote('VITE_ORDERS_MF_URL',     'http://localhost:3004/assets/remoteEntry.js'),
        companiesMf:   remote('VITE_COMPANIES_MF_URL',  'http://localhost:3005/assets/remoteEntry.js'),
        fleetMf:       remote('VITE_FLEET_MF_URL',      'http://localhost:3006/assets/remoteEntry.js'),
        productsMf:    remote('VITE_PRODUCTS_MF_URL',   'http://localhost:3007/assets/remoteEntry.js'),
      },
      shared: {
        react:            { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom':      { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.28.0' },
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      // Forward API calls to the Spring web gateway
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    target: 'esnext',
    minify: false,
  },
});
