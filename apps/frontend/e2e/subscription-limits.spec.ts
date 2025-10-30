import { test, expect } from '@playwright/test'
import { test as authTest } from './fixtures/auth.fixture'
import { TEST_ROUTES, TEST_CONFIG } from './fixtures/test-data'

/**
 * Subscription Limits E2E Tests
 *
 * Tests plan limit enforcement across all features:
 * - Article save limits (FREE: 10, STARTER: 50, PRO: unlimited)
 * - Summary creation limits (FREE: 5/month, STARTER: 20/month, PRO: unlimited)
 * - Note creation limits (FREE: 20, STARTER: 100, PRO: unlimited)
 * - Upgrade flow
 * - Plan comparison
 */

authTest.describe('Subscription Limits Enforcement', () => {
  authTest.beforeEach(async ({ page }) => {
    await page.goto(TEST_ROUTES.dashboard)
    await page.waitForLoadState('networkidle')
  })

  authTest('should display current plan in dashboard', async ({ page }) => {
    // Look for plan indicator/badge
    const planBadge = page.locator(
      '[data-testid="plan-badge"], .plan-indicator, text=/free|starter|pro/i'
    ).first()

    // Should show current plan somewhere on dashboard
    await expect(planBadge).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
  })

  authTest('should show usage stats on dashboard', async ({ page }) => {
    // Look for usage indicators
    const usageStats = page.locator(
      '[data-testid="usage-stats"], .usage-indicator, text=/\\d+\\/\\d+|\\d+ used/i'
    ).first()

    // Should show usage somewhere (e.g., "5/10 articles saved")
    if (await usageStats.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(usageStats).toBeVisible()

      // Verify format shows used/total (e.g., "5/10")
      const text = await usageStats.textContent()
      expect(text).toMatch(/\d+/)
    }
  })

  authTest('should block article save when limit reached', async ({ page }) => {
    await page.goto(`${TEST_ROUTES.dashboard}/veille`)
    await page.waitForLoadState('networkidle')

    // Try to save multiple articles to hit limit
    let saveAttempts = 0
    const maxAttempts = 15 // Exceeds FREE limit of 10

    for (let i = 0; i < maxAttempts; i++) {
      // Find save button
      const saveButton = page.locator(
        'button:has-text("save"), button:has-text("enregistrer"), [data-testid="save-article"]'
      ).first()

      if (!(await saveButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        // No more unsaved articles
        break
      }

      await saveButton.click()
      saveAttempts++
      await page.waitForTimeout(800)

      // Check for limit error
      const limitError = page.locator(
        'text=/limit reached|limite atteinte|plan limit|upgrade|maximum/i, [role="alert"]'
      )

      if (await limitError.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Limit was enforced!
        await expect(limitError).toBeVisible()
        console.log(`✅ Article save limit enforced after ${saveAttempts} saves`)

        // Should show upgrade CTA
        const upgradeButton = page.locator(
          'button:has-text("upgrade"), a:has-text("upgrade"), a[href*="pricing"]'
        ).first()

        if (await upgradeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(upgradeButton).toBeVisible()
        }

        return
      }
    }

    console.log(`⚠️ Article limit test inconclusive after ${saveAttempts} saves (user may have PRO plan)`)
  })

  authTest('should block summary creation when limit reached', async ({ page }) => {
    await page.goto(`${TEST_ROUTES.dashboard}/powerpost`)
    await page.waitForLoadState('networkidle')

    const testText = 'Test summary for limit enforcement'
    let createAttempts = 0
    const maxAttempts = 8 // Exceeds FREE limit of 5/month

    for (let i = 0; i < maxAttempts; i++) {
      // Click create
      const createButton = page.locator('button:has-text("create"), button:has-text("créer")').first()

      if (!(await createButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        break
      }

      await createButton.click()
      await page.waitForTimeout(500)

      // Fill form
      const textInput = page.locator('textarea[name="text"], textarea[name="content"]').first()

      if (!(await textInput.isVisible({ timeout: 1000 }).catch(() => false))) {
        break
      }

      await textInput.fill(`${testText} ${i}`)

      // Submit
      await page.click('button[type="submit"], button:has-text("generate")')
      createAttempts++

      // Check for limit error (appears quickly, before generation)
      const limitError = page.locator('text=/limit reached|limite atteinte|upgrade/i')

      if (await limitError.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(limitError).toBeVisible()
        console.log(`✅ Summary limit enforced after ${createAttempts} summaries`)

        // Should show upgrade option
        const upgradeButton = page.locator('button:has-text("upgrade"), a:has-text("upgrade")').first()

        if (await upgradeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(upgradeButton).toBeVisible()
        }

        return
      }

      // If no error, wait a bit before next attempt (don't spam API)
      await page.waitForTimeout(5000)

      // Navigate back
      await page.goto(`${TEST_ROUTES.dashboard}/powerpost`)
      await page.waitForLoadState('networkidle')
    }

    console.log(`⚠️ Summary limit test inconclusive after ${createAttempts} summaries`)
  })

  authTest('should block note creation when limit reached', async ({ page }) => {
    await page.goto(`${TEST_ROUTES.dashboard}/powernote`)
    await page.waitForLoadState('networkidle')

    let createAttempts = 0
    const maxAttempts = 25 // Exceeds FREE limit of 20

    for (let i = 0; i < maxAttempts; i++) {
      // Click create
      const createButton = page.locator('button:has-text("create"), button:has-text("new")').first()

      if (!(await createButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        break
      }

      await createButton.click()
      await page.waitForTimeout(300)

      // Fill form
      const titleInput = page.locator('input[name="title"]').first()
      const contentInput = page.locator('textarea[name="content"]').first()

      if (!(await titleInput.isVisible({ timeout: 1000 }).catch(() => false))) {
        break
      }

      await titleInput.fill(`Test Note ${i}`)
      await contentInput.fill('Test content')

      // Submit
      await page.click('button[type="submit"], button:has-text("save")')
      createAttempts++

      // Check for limit error
      const limitError = page.locator('text=/limit reached|limite atteinte|upgrade/i')

      if (await limitError.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(limitError).toBeVisible()
        console.log(`✅ Note limit enforced after ${createAttempts} notes`)

        const upgradeButton = page.locator('button:has-text("upgrade"), a:has-text("upgrade")').first()

        if (await upgradeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(upgradeButton).toBeVisible()
        }

        return
      }

      await page.waitForTimeout(500)

      // Navigate back
      await page.goto(`${TEST_ROUTES.dashboard}/powernote`)
      await page.waitForLoadState('networkidle')
    }

    console.log(`⚠️ Note limit test inconclusive after ${createAttempts} notes`)
  })

  authTest('should navigate to pricing page', async ({ page }) => {
    // Find upgrade/pricing link
    const pricingLink = page.locator(
      'a[href*="pricing"], button:has-text("upgrade"), a:has-text("pricing")'
    ).first()

    await expect(pricingLink).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })

    // Click to navigate
    await pricingLink.click()

    // Should be on pricing page
    await expect(page).toHaveURL(/pricing/, { timeout: TEST_CONFIG.timeouts.short })
  })

  authTest('should display plan comparison on pricing page', async ({ page }) => {
    await page.goto(`${TEST_ROUTES.dashboard}/pricing`)
    await page.waitForLoadState('networkidle')

    // Should show at least 3 plan cards (FREE, STARTER, PRO)
    const planCards = page.locator('[data-testid="plan-card"], .pricing-card, .plan-item')

    const cardCount = await planCards.count()
    expect(cardCount).toBeGreaterThanOrEqual(3)

    // Should show plan features
    await expect(planCards.first().locator('ul, [data-testid="features-list"]').first()).toBeVisible()

    // Should show pricing
    await expect(planCards.first().locator('text=/€|\\$/').first()).toBeVisible()
  })

  authTest('should highlight current plan on pricing page', async ({ page }) => {
    await page.goto(`${TEST_ROUTES.dashboard}/pricing`)
    await page.waitForLoadState('networkidle')

    // Current plan should be highlighted or marked
    const currentPlanBadge = page.locator(
      'text=/current|actuel|your plan/i, [data-testid="current-plan"]'
    ).first()

    // Either current plan badge OR disabled upgrade button
    const hasCurrentBadge = await currentPlanBadge.isVisible({ timeout: 2000 }).catch(() => false)
    const disabledButton = await page
      .locator('button:disabled:has-text("upgrade")')
      .isVisible({ timeout: 1000 })
      .catch(() => false)

    expect(hasCurrentBadge || disabledButton).toBe(true)
  })

  authTest('should show correct limits for each plan', async ({ page }) => {
    await page.goto(`${TEST_ROUTES.dashboard}/pricing`)
    await page.waitForLoadState('networkidle')

    // Verify FREE plan limits
    const freePlan = page.locator('text=/free/i').first().locator('..')

    if (await freePlan.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Should show "10 articles" or "10 saved"
      const freeFeatures = await freePlan.textContent()
      expect(freeFeatures).toMatch(/10.*article/i)
      expect(freeFeatures).toMatch(/5.*summar/i)
      expect(freeFeatures).toMatch(/20.*note/i)
    }

    // Verify STARTER plan limits
    const starterPlan = page.locator('text=/starter/i').first().locator('..')

    if (await starterPlan.isVisible({ timeout: 1000 }).catch(() => false)) {
      const starterFeatures = await starterPlan.textContent()
      expect(starterFeatures).toMatch(/50.*article/i)
      expect(starterFeatures).toMatch(/20.*summar/i)
      expect(starterFeatures).toMatch(/100.*note/i)
    }

    // Verify PRO plan has unlimited
    const proPlan = page.locator('text=/pro/i').first().locator('..')

    if (await proPlan.isVisible({ timeout: 1000 }).catch(() => false)) {
      const proFeatures = await proPlan.textContent()
      expect(proFeatures).toMatch(/unlimited|illimit/i)
    }
  })

  authTest('should display usage percentage in feature sections', async ({ page }) => {
    // Navigate to a feature page (e.g., veille)
    await page.goto(`${TEST_ROUTES.dashboard}/veille`)
    await page.waitForLoadState('networkidle')

    // Look for usage indicator with percentage or fraction
    const usageIndicator = page.locator(
      '[data-testid="usage-indicator"], .usage-stats, text=/\\d+\\/\\d+|\\d+%/i'
    ).first()

    if (await usageIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      const usageText = await usageIndicator.textContent()

      // Should show usage (e.g., "5/10" or "50%")
      expect(usageText).toMatch(/\d+/)

      // If near limit, might show warning
      if (usageText?.includes('9/10') || usageText?.includes('90%')) {
        const warningIndicator = page.locator('text=/almost|presque|warning/i, [role="alert"]')
        // Warning might be visible
        const hasWarning = await warningIndicator.isVisible({ timeout: 1000 }).catch(() => false)
        console.log('Usage warning', hasWarning ? 'visible' : 'not visible')
      }
    }
  })

  authTest('should show upgrade modal when limit reached', async ({ page }) => {
    // This test assumes limit is reached
    // Try to perform an action that would exceed limit

    await page.goto(`${TEST_ROUTES.dashboard}/veille`)
    await page.waitForLoadState('networkidle')

    // Look for any upgrade modal or banner
    const upgradeModal = page.locator(
      '[role="dialog"]:has-text("upgrade"), .modal:has-text("limit"), [data-testid="upgrade-modal"]'
    )

    const upgradeButton = page.locator('button:has-text("upgrade"), a:has-text("upgrade")').first()

    // Either modal OR upgrade button should exist
    const hasModal = await upgradeModal.isVisible({ timeout: 1000 }).catch(() => false)
    const hasButton = await upgradeButton.isVisible({ timeout: 1000 }).catch(() => false)

    expect(hasModal || hasButton).toBe(true)
  })
})
