import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: {
      '@skyhoof/game-core': fileURLToPath(
        new URL('./packages/game-core/src/index.ts', import.meta.url),
      ),
      '@skyhoof/catalog': fileURLToPath(
        new URL('./packages/catalog/src/index.ts', import.meta.url),
      ),
    },
  },
});
