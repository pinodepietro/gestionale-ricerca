// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // necessario per girare dentro Docker
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
