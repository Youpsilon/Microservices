import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/menu': {
        target: 'http://localhost:3002', // Menu service directly (supports GET + PATCH)
        changeOrigin: true,
      },
      '/api/orders': {
        target: 'http://localhost:3003', // Order service directly (supports GET, PATCH etc)
        changeOrigin: true,
      },
      '/api/cart': {
        target: 'http://localhost:3003', 
        changeOrigin: true,
      },
      '/api/kitchen': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/api/deliveries': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
      '/api/couriers': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
});
