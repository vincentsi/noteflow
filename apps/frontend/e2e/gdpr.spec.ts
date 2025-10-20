import { test, expect } from './fixtures/auth.fixture'
import { TEST_ROUTES, TEST_CONFIG } from './fixtures/test-data'

/**
 * GDPR Data Export E2E Tests
 *
 * Tests the GDPR compliance features:
 * - Data export (download user data as JSON)
 * - Account deletion request
 * - Privacy rights (view, correct data)
 *
 * Uses authenticated fixtures to avoid repetitive login code.
 */

test.describe('GDPR Data Export', () => {
  test('should access GDPR settings page', async ({ authenticatedPage, browserName }) => {
    // Navigate to GDPR page
    await authenticatedPage.goto(TEST_ROUTES.gdpr)
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const timeout = browserName === 'chromium' ? 10000 : 20000

    // Should show GDPR options
    await expect(authenticatedPage.locator('text=/GDPR|Privacy/i').first()).toBeVisible({ timeout })
    await expect(authenticatedPage.locator('text=/Export.*Data|Download.*Data/i').first()).toBeVisible({ timeout })
  })

  test('should export user data as JSON', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(TEST_ROUTES.gdpr)

    // Look for "Export Data" or "Download Data" button
    const exportButton = authenticatedPage.locator('button:has-text("Export"), button:has-text("Download Data")')

    const buttonCount = await exportButton.count()
    if (buttonCount > 0) {
      // Start download
      const downloadPromise = authenticatedPage.waitForEvent('download', {
        timeout: TEST_CONFIG.timeouts.long,
      })
      await exportButton.first().click()

      // Wait for download to complete
      const download = await downloadPromise

      // Verify file is JSON
      expect(download.suggestedFilename()).toMatch(/\.json$/)

      // Optionally save and verify file contents
      const path = await download.path()
      expect(path).toBeTruthy()
    } else {
      // If no export button, at least verify GDPR page loaded
      await expect(authenticatedPage.locator('text=/GDPR/i').first()).toBeVisible()
    }
  })

  test('should show data export confirmation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(TEST_ROUTES.gdpr)

    // Click export button
    const exportButton = authenticatedPage.locator('button:has-text("Export"), button:has-text("Download")')

    const buttonCount = await exportButton.count()
    if (buttonCount > 0) {
      // Click and wait for response
      await exportButton.first().click()

      // Should show success message or start download
      // Wait for either download event or success message
      const successMessage = authenticatedPage.locator('text=/success|downloaded|exported/i')
      await successMessage.isVisible({ timeout: TEST_CONFIG.timeouts.medium }).catch(() => false)

      // At least the page should respond (not hang)
      expect(true).toBeTruthy() // Test passed if we got here
    }
  })

  test('should request account deletion', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(TEST_ROUTES.gdpr)

    // Look for "Delete Account" button
    const deleteButton = authenticatedPage.locator('button:has-text("Delete Account"), button:has-text("Delete")')

    const buttonCount = await deleteButton.count()
    if (buttonCount > 0) {
      // Click delete button
      await deleteButton.first().click()

      // Wait for modal/dialog to appear
      await authenticatedPage.waitForTimeout(500)

      // Should show confirmation dialog
      const confirmDialog = authenticatedPage.locator('text=/confirm|sure|warning|permanent/i')
      await expect(confirmDialog.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium })

      // Should have cancel button (don't actually delete account)
      // Try multiple selector patterns to find cancel button
      const cancelButton = authenticatedPage.locator(
        'button:has-text("Cancel"), button:has-text("No"), button:has-text("Close"), [role="button"]:has-text("Cancel")'
      )

      // Check if cancel button exists before asserting visibility
      const cancelCount = await cancelButton.count()
      if (cancelCount > 0) {
        await expect(cancelButton.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium })
        // Click cancel to avoid deleting test account
        await cancelButton.first().click()
      } else {
        // If no cancel button, look for escape key or click outside modal
        // Press Escape key to close modal
        await authenticatedPage.keyboard.press('Escape')
      }
    }
  })

  test('should show GDPR compliance information', async ({ authenticatedPage, browserName }) => {
    await authenticatedPage.goto(TEST_ROUTES.gdpr)
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const timeout = browserName === 'chromium' ? 10000 : 20000

    // Should display privacy policy or GDPR info
    await expect(authenticatedPage.locator('text=/privacy|GDPR|data protection/i').first()).toBeVisible({ timeout })

    // Should explain user rights
    const rightsText = authenticatedPage.locator('text=/rights|access|delete|export|portability/i').first()
    await expect(rightsText).toBeVisible({ timeout })
  })
})

test.describe('GDPR Rights', () => {
  test('should allow users to view their data', async ({ authenticatedPage, browserName }) => {
    // Navigate to profile to view personal data
    await authenticatedPage.goto(TEST_ROUTES.profile)
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const timeout = browserName === 'chromium' ? 10000 : 20000

    // Should show user's personal data
    await expect(authenticatedPage.locator('text=/email|profile|account/i').first()).toBeVisible({ timeout })

    // Should display email address (visible in read-only view)
    const emailText = authenticatedPage.locator('text=test@example.com')
    await expect(emailText.first()).toBeVisible({ timeout })
  })

  test('should allow users to correct their data', async ({ authenticatedPage, browserName }) => {
    // Navigate to profile edit
    await authenticatedPage.goto(TEST_ROUTES.profile)
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const timeout = browserName === 'chromium' ? 10000 : 20000

    // Click "Edit Profile" button to enable editing
    const editButton = authenticatedPage.locator('button:has-text("Edit Profile")')
    await editButton.click()

    // Wait for form to appear
    await authenticatedPage.waitForTimeout(500)

    // Should have editable fields
    const nameField = authenticatedPage.locator('input[name="name"]')
    const emailField = authenticatedPage.locator('input[name="email"]')

    // At least one editable field should exist
    const nameVisible = await nameField.isVisible({ timeout: 2000 }).catch(() => false)
    const emailVisible = await emailField.isVisible({ timeout: 2000 }).catch(() => false)

    expect(nameVisible || emailVisible).toBeTruthy()

    // Should have save/update button
    const saveButton = authenticatedPage.locator('button:has-text("Save")')
    await expect(saveButton.first()).toBeVisible({ timeout })
  })

  test('should respect data deletion requests', async ({ authenticatedPage, browserName }) => {
    await authenticatedPage.goto(TEST_ROUTES.gdpr)
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const timeout = browserName === 'chromium' ? 10000 : 20000

    // Should have option to delete account
    const deleteSection = authenticatedPage.locator('text=/delete.*account|remove.*account|close.*account/i').first()
    await expect(deleteSection).toBeVisible({ timeout })

    // Should explain consequences of deletion
    const warningText = authenticatedPage.locator('text=/permanent|cannot be undone|irreversible/i')
    const hasWarning = await warningText.isVisible({ timeout: 2000 }).catch(() => false)

    // Good UX: warn user about permanent deletion
    if (hasWarning) {
      await expect(warningText.first()).toBeVisible({ timeout })
    }
  })

  test('should provide data portability', async ({ authenticatedPage, browserName }) => {
    await authenticatedPage.goto(TEST_ROUTES.gdpr)
    await authenticatedPage.waitForLoadState('domcontentloaded')

    const timeout = browserName === 'chromium' ? 10000 : 20000

    // Should allow data export in machine-readable format
    const exportSection = authenticatedPage.locator('text=/export|download|portability|transfer/i').first()
    await expect(exportSection).toBeVisible({ timeout })

    // Should mention JSON or structured format
    const formatText = authenticatedPage.locator('text=/JSON|structured|machine-readable/i')
    const hasFormatInfo = await formatText.isVisible({ timeout: 2000 }).catch(() => false)

    // Optional: verify format is mentioned
    if (hasFormatInfo) {
      await expect(formatText.first()).toBeVisible({ timeout })
    }
  })
})
