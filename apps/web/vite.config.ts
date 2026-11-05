import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { offlineGame } from './pwa-plugin';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react(), offlineGame()],
  resolve: {
    alias: {
      '@skyhoof/game-core': fileURLToPath(
        new URL('../../packages/game-core/src/index.ts', import.meta.url),
      ),
      '@skyhoof/catalog': fileURLToPath(
        new URL('../../packages/catalog/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks: {
          three: ['three'],
          scene: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});
