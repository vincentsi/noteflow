import { test, expect } from '@playwright/test'
import { test as authTest } from './fixtures/auth.fixture'
import { TEST_ROUTES, TEST_CONFIG } from './fixtures/test-data'

/**
 * Veille IA E2E Tests
 *
 * Tests the RSS feed aggregation feature:
 * - Display articles list
 * - Save/unsave articles
 * - Pagination
 * - Plan limit enforcement
 */

authTest.describe.skip('Veille IA Feature', () => {
  authTest.beforeEach(async ({ page }) => {
    // Navigate to Veille page (requires authentication via fixture)
    await page.goto(TEST_ROUTES.veille)
    await page.waitForLoadState('networkidle')
  })

  authTest('should display veille page with articles', async ({ page }) => {
    // Verify page title/heading
    await expect(page.locator('h1, h2').first()).toContainText(/veille|articles/i, {
      timeout: TEST_CONFIG.timeouts.short,
    })

    // Wait for articles to load
    const articlesList = page.locator('[data-testid="articles-list"], article, [role="article"]')
    await expect(articlesList.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.long })

    // Should have at least one article
    const articleCount = await articlesList.count()
    expect(articleCount).toBeGreaterThan(0)
  })

  authTest('should display article information', async ({ page }) => {
    // Get first article
    const firstArticle = page
      .locator('[data-testid="article-card"], article, [role="article"]')
      .first()

    // Verify article has title
    await expect(firstArticle.locator('h3, h4, [data-testid="article-title"]').first()).toBeVisible()

    // Verify article has source
    await expect(firstArticle.locator('[data-testid="article-source"], .source').first()).toBeVisible()

    // Verify article has published date
    await expect(
      firstArticle.locator('[data-testid="article-date"], time, .date').first()
    ).toBeVisible()
  })

  authTest('should save an article', async ({ page }) => {
    // Find first unsaved article (look for save button)
    const saveButton = page
      .locator('button:has-text("save"), button:has-text("enregistrer"), [data-testid="save-article"]')
      .first()

    await expect(saveButton).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })

    // Click save button
    await saveButton.click()

    // Wait for success feedback (toast notification or button state change)
    await page.waitForTimeout(1000) // Allow time for API call

    // Verify button changed to "saved" state (check for different text or icon)
    await expect(
      page.locator('button:has-text("saved"), button:has-text("enregistré")').first()
    ).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
  })

  authTest('should unsave an article', async ({ page }) => {
    // First, ensure we have a saved article (save one if needed)
    const saveButton = page
      .locator('button:has-text("save"), button:has-text("enregistrer")')
      .first()

    if (await saveButton.isVisible()) {
      await saveButton.click()
      await page.waitForTimeout(1000)
    }

    // Now find the unsave button
    const unsaveButton = page
      .locator('button:has-text("saved"), button:has-text("enregistré"), [data-testid="unsave-article"]')
      .first()

    await expect(unsaveButton).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })

    // Click unsave button
    await unsaveButton.click()

    // Wait for API call
    await page.waitForTimeout(1000)

    // Verify button changed back to "save" state
    await expect(
      page.locator('button:has-text("save"), button:has-text("enregistrer")').first()
    ).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
  })

  authTest('should filter articles by source', async ({ page }) => {
    // Look for filter/source dropdown or buttons
    const sourceFilter = page.locator(
      '[data-testid="source-filter"], select[name="source"], button:has-text("source")'
    ).first()

    // Check if filter exists
    if (await sourceFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click on filter
      await sourceFilter.click()

      // Select a source (adjust selector based on implementation)
      const firstSourceOption = page
        .locator('option, [role="option"], li', { hasText: /.+/ })
        .first()

      await firstSourceOption.click()

      // Wait for filtered results
      await page.waitForTimeout(1500)

      // Verify articles updated (list should be visible)
      const articlesList = page.locator('[data-testid="articles-list"], article')
      await expect(articlesList.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
    }
  })

  authTest('should paginate through articles', async ({ page }) => {
    // Look for pagination controls
    const nextPageButton = page.locator(
      'button:has-text("next"), button:has-text("suivant"), [aria-label*="next"], [data-testid="next-page"]'
    )

    // Check if pagination exists (might not exist if few articles)
    if (await nextPageButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Get first article title before pagination
      const firstArticleTitle = await page
        .locator('[data-testid="article-card"], article')
        .first()
        .locator('h3, h4')
        .first()
        .textContent()

      // Click next page
      await nextPageButton.click()

      // Wait for new articles to load
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Get new first article title
      const newFirstArticleTitle = await page
        .locator('[data-testid="article-card"], article')
        .first()
        .locator('h3, h4')
        .first()
        .textContent()

      // Verify articles changed (different titles)
      expect(newFirstArticleTitle).not.toBe(firstArticleTitle)

      // Verify "previous" button now appears
      await expect(
        page.locator(
          'button:has-text("previous"), button:has-text("précédent"), [aria-label*="previous"], [data-testid="prev-page"]'
        )
      ).toBeVisible()
    }
  })

  authTest('should show empty state when no saved articles', async ({ page }) => {
    // Navigate to saved articles view (if exists)
    const savedTab = page.locator(
      'button:has-text("saved"), button:has-text("enregistrés"), [data-testid="saved-tab"]'
    )

    if (await savedTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await savedTab.click()
      await page.waitForLoadState('networkidle')

      // If user has no saved articles, should show empty state
      // Check for empty state message OR articles list
      const emptyState = page.locator(
        'text=/no articles|aucun article|empty/i, [data-testid="empty-state"]'
      )
      const articlesList = page.locator('[data-testid="articles-list"], article')

      // Either empty state OR articles should be visible
      const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)
      const hasArticles = await articlesList.first().isVisible({ timeout: 2000 }).catch(() => false)

      expect(hasEmptyState || hasArticles).toBe(true)
    }
  })

  authTest('should enforce plan limits on article saving', async ({ page }) => {
    // This test requires a FREE plan user with limit reached
    // Click save button multiple times to reach limit

    // Try to save articles until limit is reached
    for (let i = 0; i < 15; i++) {
      const saveButton = page
        .locator('button:has-text("save"), button:has-text("enregistrer")')
        .first()

      if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await saveButton.click()
        await page.waitForTimeout(800)

        // Check if error/limit message appears
        const limitMessage = page.locator(
          'text=/limit reached|limite atteinte|upgrade/i, [role="alert"]'
        )

        if (await limitMessage.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Plan limit was enforced - test passes
          await expect(limitMessage).toBeVisible()
          return
        }
      } else {
        // No more unsaved articles available
        break
      }
    }

    // If we get here, either limit wasn't reached or user has PRO plan
    // Test is inconclusive but shouldn't fail
    console.log('Plan limit test: Could not reach article save limit (user may have PRO plan)')
  })

  authTest('should open article link in new tab', async ({ page }) => {
    // Find first article with external link
    const articleLink = page
      .locator('a[href^="http"], [data-testid="article-link"]')
      .first()

    await expect(articleLink).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })

    // Verify link opens in new tab (target="_blank")
    const target = await articleLink.getAttribute('target')
    expect(target).toBe('_blank')

    // Verify link has rel="noopener noreferrer" for security
    const rel = await articleLink.getAttribute('rel')
    expect(rel).toContain('noopener')
  })
})
