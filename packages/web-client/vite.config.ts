import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const MENU_SERVICE_URL = process.env.MENU_SERVICE_URL || 'http://localhost:3002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
const KITCHEN_SERVICE_URL = process.env.KITCHEN_SERVICE_URL || 'http://localhost:3004';
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://localhost:3005';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/auth': {
        target: AUTH_SERVICE_URL,
        changeOrigin: true,
      },
      '/api/users': {
        target: AUTH_SERVICE_URL,
        changeOrigin: true,
      },
      '/api/menu': {
        target: MENU_SERVICE_URL, // Menu service directly (supports GET + PATCH)
        changeOrigin: true,
      },
      '/api/orders': {
        target: ORDER_SERVICE_URL, // Order service directly (supports GET, PATCH etc)
        changeOrigin: true,
      },
      '/api/cart': {
        target: ORDER_SERVICE_URL, 
        changeOrigin: true,
      },
      '/api/kitchen': {
        target: KITCHEN_SERVICE_URL,
        changeOrigin: true,
      },
      '/api/deliveries': {
        target: DELIVERY_SERVICE_URL,
        changeOrigin: true,
      },
      '/api/couriers': {
        target: DELIVERY_SERVICE_URL,
        changeOrigin: true,
      },
    },
  },
});
