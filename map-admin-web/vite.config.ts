import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true }, // 5173 es del iframe
  preview: { port: 5174, strictPort: true },
  build: { sourcemap: false },
});
