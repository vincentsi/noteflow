import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Test Configuration
 *
 * Tests the complete user flow from frontend to backend integration.
 * Runs against local development servers by default.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // Global setup to seed test data
  globalSetup: './e2e/global-setup.ts',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only (reduce retries to save time)
  retries: process.env.CI ? 1 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Reduce timeout in CI for faster feedback
  timeout: process.env.CI ? 30000 : 60000, // 30s in CI, 60s locally

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Increase default action timeout
    actionTimeout: 15000, // 15 seconds for clicks, fills, etc.
  },

  // Configure projects for major browsers
  // Only Chromium for optimal speed and reliability (99% of users)
  // Firefox/WebKit have timing issues and are not critical for production
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Optional: Uncomment to test Firefox/WebKit (slower, less reliable)
  // {
  //   name: 'firefox',
  //   use: { ...devices['Desktop Firefox'] },
  // },
  // {
  //   name: 'webkit',
  //   use: { ...devices['Desktop Safari'] },
  // },

  // Run your local dev server before starting the tests
  webServer: [
    {
      command: 'cd ../backend && npm run dev',
      url: 'http://localhost:3001/api/health',
      timeout: 90 * 1000, // Reduce from 120s to 90s
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      timeout: 90 * 1000, // Reduce from 120s to 90s
      reuseExistingServer: !process.env.CI,
    },
  ],
})
