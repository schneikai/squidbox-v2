import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
    // Global setup file that truncates database before each test
    setupFiles: ['./tests/setup.ts'],
    // Set NODE_ENV to test to reduce logger verbosity during tests
    env: {
      NODE_ENV: 'test',
    },
  },
});
