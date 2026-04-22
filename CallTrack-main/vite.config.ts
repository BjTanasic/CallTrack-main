import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/CallTrack-main/',
  publicDir: 'public-clean',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
