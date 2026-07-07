import { defineConfig } from 'vitest/config'

// Pure-logic tests run in Node; no React plugin needed. Kept separate from
// vite.config.ts so `tsc -b` (which only type-checks vite.config.ts) never sees
// vitest's bundled Vite types.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
