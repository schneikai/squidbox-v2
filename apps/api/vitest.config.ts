import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/globalSetup.ts'],
    setupFiles: ['./tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
    },
    // Disable parallel execution to avoid database conflicts
    // Tests share the same database and use global cleanup, so concurrent
    // execution would cause unique constraint violations and data conflicts
    // TODO: Investigate test parallelization with isolated test databases
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Run tests sequentially to ensure clean database state between tests
    sequence: {
      concurrent: false,
    },
    testTimeout: 10000,
  },
});
