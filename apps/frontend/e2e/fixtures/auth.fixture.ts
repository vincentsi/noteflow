import { test as base, Page } from '@playwright/test'
import { TEST_USERS, TEST_ROUTES, TEST_CONFIG } from './test-data'

/**
 * Playwright Fixtures for Authentication
 *
 * Provides reusable authenticated page contexts to avoid repetitive login code.
 *
 * Usage:
 * ```typescript
 * import { test } from './fixtures/auth.fixture'
 *
 * test('should access dashboard', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/dashboard')
 *   await expect(authenticatedPage).toHaveURL(/\/dashboard/)
 * })
 * ```
 *
 * @see https://playwright.dev/docs/test-fixtures
 */

type AuthFixtures = {
  /**
   * Page with authenticated user (existing user)
   * Already logged in and ready to use
   */
  authenticatedPage: Page

  /**
   * Page with free tier user logged in
   */
  freeUserPage: Page

  /**
   * Page with PRO tier user logged in
   */
  proUserPage: Page

  /**
   * Page with STARTER tier user logged in
   */
  starterUserPage: Page
}

/**
 * Login helper function
 * Logs in a user and waits for dashboard redirect
 */
async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto(TEST_ROUTES.login)
  await page.fill('input[name="email"], input[type="email"]', email)
  await page.fill('input[name="password"], input[type="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL(TEST_ROUTES.dashboard, {
    timeout: TEST_CONFIG.timeouts.long,
  })

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle')
}

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  /**
   * Authenticated page with existing user
   */
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.existing.email, TEST_USERS.existing.password)
    await use(page)
  },

  /**
   * Authenticated page with free tier user
   */
  freeUserPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.free.email, TEST_USERS.free.password)
    await use(page)
  },

  /**
   * Authenticated page with PRO tier user
   */
  proUserPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.pro.email, TEST_USERS.pro.password)
    await use(page)
  },

  /**
   * Authenticated page with STARTER tier user
   */
  starterUserPage: async ({ page }, use) => {
    await loginAs(page, TEST_USERS.starter.email, TEST_USERS.starter.password)
    await use(page)
  },
})

export { expect } from '@playwright/test'
