import { defineConfig } from 'vitest/config';

// When running pnpm test, vitest automatically sets NODE_ENV=test

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
