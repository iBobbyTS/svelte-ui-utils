import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // .agent-work holds task archives whose copied test files reference
    // source trees that no longer exist; they are material, not tests.
    exclude: ['**/node_modules/**', '**/dist/**', '.agent-work/**']
  }
});
