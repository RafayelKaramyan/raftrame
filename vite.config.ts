import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: '/raftrame/',
  plugins: [react()],
  server: { allowedHosts: ['terminal.local'] },
  build: { chunkSizeWarningLimit: 700 },
});
