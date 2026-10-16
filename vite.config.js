import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona en https://<user>.github.io/<repo>/ sin configurar el nombre del repo
export default defineConfig({
  base: './',
  plugins: [react()],
});
