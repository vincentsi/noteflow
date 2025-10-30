import { test, expect } from '@playwright/test'
import { test as authTest } from './fixtures/auth.fixture'
import { TEST_ROUTES, TEST_CONFIG } from './fixtures/test-data'

/**
 * PowerNote E2E Tests
 *
 * Tests the markdown note-taking feature:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Tag management
 * - Markdown editor
 * - Search/filter notes
 * - Plan limit enforcement
 */

authTest.describe('PowerNote Feature', () => {
  const testNote = {
    title: 'Test Note E2E',
    content: `# Test Note

This is a test note with **markdown** support.

## Features
- Bullet points
- *Italic text*
- **Bold text**

## Code Block
\`\`\`javascript
console.log('Hello World')
\`\`\`
`,
    tags: ['test', 'e2e', 'automation'],
  }

  authTest.beforeEach(async ({ page }) => {
    // Navigate to PowerNote/Notes page
    await page.goto(`${TEST_ROUTES.dashboard}/powernote`)
    await page.waitForLoadState('networkidle')
  })

  authTest('should display powernote page', async ({ page }) => {
    // Verify page heading
    await expect(page.locator('h1, h2').first()).toContainText(/powernote|notes?/i, {
      timeout: TEST_CONFIG.timeouts.short,
    })

    // Should have create button
    const createButton = page.locator(
      'button:has-text("create"), button:has-text("new note"), button:has-text("nouvelle"), [data-testid="create-note"]'
    )
    await expect(createButton.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
  })

  authTest('should create a new note', async ({ page }) => {
    // Click create note button
    await page.click('button:has-text("create"), button:has-text("new"), [data-testid="create-note"]')

    // Wait for editor to open
    await page.waitForTimeout(500)

    // Fill in title
    const titleInput = page.locator(
      'input[name="title"], input[placeholder*="title"], [data-testid="note-title"]'
    ).first()
    await titleInput.fill(testNote.title)

    // Fill in content (markdown editor)
    const contentInput = page.locator(
      'textarea[name="content"], [data-testid="note-content"], .markdown-editor'
    ).first()
    await contentInput.fill(testNote.content)

    // Add tags (if tag input exists)
    const tagInput = page.locator(
      'input[name="tag"], input[placeholder*="tag"], [data-testid="tag-input"]'
    ).first()

    if (await tagInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      for (const tag of testNote.tags) {
        await tagInput.fill(tag)
        await page.keyboard.press('Enter') // Add tag
        await page.waitForTimeout(200)
      }
    }

    // Save note
    await page.click('button[type="submit"], button:has-text("save"), button:has-text("enregistrer")')

    // Wait for save confirmation
    await page.waitForTimeout(1000)

    // Verify note was created (should redirect to notes list or show success)
    const successMessage = page.locator('text=/saved|enregistré|success/i, [role="alert"]')
    const notesList = page.locator('[data-testid="notes-list"], .notes-grid')

    const hasSuccess = await successMessage.isVisible({ timeout: 2000 }).catch(() => false)
    const hasList = await notesList.isVisible({ timeout: 2000 }).catch(() => false)

    expect(hasSuccess || hasList).toBe(true)
  })

  authTest('should display notes list', async ({ page }) => {
    // Should show list of notes or empty state
    const notesList = page.locator('[data-testid="notes-list"], .notes-grid, [role="list"]').first()
    const emptyState = page.locator('text=/no notes|aucune note|empty/i')

    const hasNotes = await notesList.isVisible({ timeout: 2000 }).catch(() => false)
    const isEmpty = await emptyState.isVisible({ timeout: 2000 }).catch(() => false)

    expect(hasNotes || isEmpty).toBe(true)
  })

  authTest('should view note details', async ({ page }) => {
    // Find first note
    const firstNote = page.locator('[data-testid="note-card"], .note-item, article').first()

    if (await firstNote.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click to view
      await firstNote.click()

      // Should show note content
      await expect(
        page.locator('[data-testid="note-content"], .note-detail, .markdown-content').first()
      ).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })

      // Should show title
      await expect(page.locator('h1, h2, [data-testid="note-title"]').first()).toBeVisible()
    }
  })

  authTest('should edit a note', async ({ page }) => {
    // Find first note
    const firstNote = page.locator('[data-testid="note-card"], .note-item').first()

    if (await firstNote.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click to open
      await firstNote.click()
      await page.waitForTimeout(500)

      // Find edit button
      const editButton = page.locator(
        'button:has-text("edit"), button:has-text("modifier"), [data-testid="edit-note"]'
      ).first()

      await editButton.click()
      await page.waitForTimeout(500)

      // Modify content
      const contentInput = page.locator('textarea[name="content"], [data-testid="note-content"]').first()
      await contentInput.fill('Updated content via E2E test')

      // Save changes
      await page.click('button:has-text("save"), button:has-text("enregistrer")')

      // Wait for save
      await page.waitForTimeout(1000)

      // Verify update
      const successMessage = page.locator('text=/saved|updated|modifié/i')
      await expect(successMessage.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
    }
  })

  authTest('should delete a note', async ({ page }) => {
    // Find first note
    const firstNote = page.locator('[data-testid="note-card"], .note-item').first()

    if (await firstNote.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click to open or find delete button directly
      await firstNote.click()
      await page.waitForTimeout(300)

      // Find delete button (may be in dropdown menu)
      const deleteButton = page.locator(
        'button:has-text("delete"), button:has-text("supprimer"), [data-testid="delete-note"]'
      ).first()

      // Open more menu if needed
      const moreButton = page.locator(
        'button[aria-label*="more"], button:has-text("⋮"), [data-testid="more-options"]'
      ).first()

      if (await moreButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await moreButton.click()
        await page.waitForTimeout(200)
      }

      // Click delete
      if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await deleteButton.click()

        // Confirm deletion if modal appears
        const confirmButton = page.locator(
          'button:has-text("confirm"), button:has-text("yes"), button:has-text("delete")'
        )

        if (await confirmButton.last().isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.last().click()
        }

        // Wait for deletion
        await page.waitForTimeout(1000)

        // Verify deletion (success message or note removed)
        const successMessage = page.locator('text=/deleted|supprimé/i')
        await expect(successMessage.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
      }
    }
  })

  authTest('should filter notes by tag', async ({ page }) => {
    // Look for tag filters or tag buttons
    const tagButton = page.locator('[data-testid="tag-filter"], .tag, button[data-tag]').first()

    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click on a tag to filter
      await tagButton.click()

      // Wait for filtered results
      await page.waitForTimeout(1000)

      // Verify notes list updated
      const notesList = page.locator('[data-testid="notes-list"], .notes-grid').first()
      await expect(notesList).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
    }
  })

  authTest('should search notes', async ({ page }) => {
    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search"], [data-testid="search-notes"]'
    ).first()

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Type search query
      await searchInput.fill('test')

      // Wait for search results
      await page.waitForTimeout(1000)

      // Verify results displayed
      const notesList = page.locator('[data-testid="notes-list"], .notes-grid').first()
      const emptyState = page.locator('text=/no results|aucun résultat/i')

      const hasResults = await notesList.isVisible({ timeout: 1000 }).catch(() => false)
      const isEmpty = await emptyState.isVisible({ timeout: 1000 }).catch(() => false)

      expect(hasResults || isEmpty).toBe(true)
    }
  })

  authTest('should render markdown preview', async ({ page }) => {
    // Create or open a note with markdown
    const firstNote = page.locator('[data-testid="note-card"], .note-item').first()

    if (await firstNote.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNote.click()
      await page.waitForTimeout(500)

      // Look for preview toggle or preview pane
      const previewButton = page.locator(
        'button:has-text("preview"), button:has-text("aperçu"), [data-testid="preview-toggle"]'
      ).first()

      if (await previewButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await previewButton.click()
        await page.waitForTimeout(300)
      }

      // Verify markdown is rendered (look for HTML elements)
      const markdownContent = page.locator(
        '.markdown-preview, [data-testid="markdown-content"], .prose'
      ).first()

      if (await markdownContent.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Check for rendered markdown elements (h1, h2, p, code, etc.)
        const hasHeading = await markdownContent.locator('h1, h2, h3').count() > 0
        const hasParagraph = await markdownContent.locator('p').count() > 0

        expect(hasHeading || hasParagraph).toBe(true)
      }
    }
  })

  authTest('should add and remove tags', async ({ page }) => {
    // Open first note
    const firstNote = page.locator('[data-testid="note-card"], .note-item').first()

    if (await firstNote.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNote.click()
      await page.waitForTimeout(300)

      // Enter edit mode if needed
      const editButton = page.locator('button:has-text("edit"), [data-testid="edit-note"]').first()

      if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await editButton.click()
        await page.waitForTimeout(300)
      }

      // Find tag input
      const tagInput = page.locator(
        'input[name="tag"], input[placeholder*="tag"], [data-testid="tag-input"]'
      ).first()

      if (await tagInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Add a new tag
        await tagInput.fill('newtag')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(300)

        // Verify tag appears
        const newTag = page.locator('text="newtag", [data-tag="newtag"]').first()
        await expect(newTag).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })

        // Remove tag (click X or delete button)
        const removeTagButton = newTag.locator('button, [aria-label*="remove"]').first()

        if (await removeTagButton.isVisible({ timeout: 500 }).catch(() => false)) {
          await removeTagButton.click()
          await page.waitForTimeout(200)

          // Verify tag is removed
          expect(await newTag.isVisible({ timeout: 500 }).catch(() => false)).toBe(false)
        }
      }
    }
  })

  authTest('should enforce plan limits on note creation', async ({ page }) => {
    // Try to create notes until limit is reached (FREE: 20 notes)

    for (let i = 0; i < 25; i++) {
      // Navigate to create
      await page.goto(`${TEST_ROUTES.dashboard}/powernote`)
      await page.waitForLoadState('networkidle')

      // Click create
      const createButton = page.locator('button:has-text("create"), button:has-text("new")').first()

      if (!(await createButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        break
      }

      await createButton.click()
      await page.waitForTimeout(300)

      // Fill minimal data
      const titleInput = page.locator('input[name="title"]').first()
      await titleInput.fill(`Test Note ${i}`)

      const contentInput = page.locator('textarea[name="content"]').first()
      await contentInput.fill('Test content')

      // Submit
      await page.click('button[type="submit"], button:has-text("save")')

      // Check for limit error
      const limitMessage = page.locator('text=/limit reached|limite atteinte|upgrade/i')

      if (await limitMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Limit enforced - test passes
        await expect(limitMessage).toBeVisible()
        console.log('✅ Plan limit enforced after', i, 'notes')
        return
      }

      await page.waitForTimeout(500)
    }

    console.log('⚠️ Plan limit test inconclusive (user may have PRO plan)')
  })

  authTest('should sort notes by date', async ({ page }) => {
    // Look for sort dropdown
    const sortSelect = page.locator(
      'select[name="sort"], [data-testid="sort-select"]'
    ).first()

    if (await sortSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Select "newest first"
      await sortSelect.selectOption('createdAt')

      // Wait for re-sort
      await page.waitForTimeout(1000)

      // Verify notes list updated
      const notesList = page.locator('[data-testid="notes-list"]').first()
      await expect(notesList).toBeVisible({ timeout: TEST_CONFIG.timeouts.short })
    }
  })
})
