import { defineConfig } from '@playwright/test'

// End-to-end tests drive the real Electron app (built into out/ by `npm run e2e`)
// against a fresh temporary data folder per test.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/e2e'
})
