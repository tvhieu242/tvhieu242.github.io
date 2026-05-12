import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/iterable-api': {
        target: 'https://api.iterable.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iterable-api/, '/api'),
      },
    },
  },
});
