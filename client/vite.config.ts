import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Ensure public/assets exists
if (!fs.existsSync(path.resolve(__dirname, './public'))) {
  fs.mkdirSync(path.resolve(__dirname, './public'));
}
if (!fs.existsSync(path.resolve(__dirname, './public/assets'))) {
  fs.mkdirSync(path.resolve(__dirname, './public/assets'));
}

export default defineConfig({
  base: './', // 🟢 THIS is the magic line for GameMonetize
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    hmr: {
      clientPort: 3000
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Proxying request:', req.method, req.url);
          });
        }
      }
    },
    cors: false
  },
  publicDir: path.resolve(__dirname, '../public'),
});