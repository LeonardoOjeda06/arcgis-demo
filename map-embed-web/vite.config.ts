import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  preview: { port: 5173, strictPort: true },
  build: {
    sourcemap: false, // no publicar el código fuente en producción
    chunkSizeWarningLimit: 4000, // @arcgis/core es grande por naturaleza
  },
});
