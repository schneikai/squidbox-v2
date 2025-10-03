import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // I use Wallaby.js for running test it was more simple to setup if
    // I just import the setup file directly inside the tests.
    // I could also not figure out how to configure vitest globals so 
    // they also work in Wallaby.js.
    // globals: true,
    // setupFiles: ['./test/setup.ts'],
  },
});
