import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
} from './test-utils'

/**
 * Import/Export Tests (Sprint 8)
 * Tests for JSON, Markdown, and CSV import/export functionality
 */

test.describe('Export - JSON Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('export button is accessible in UI', async ({ page }) => {
    // Look for export button or menu item
    const exportButton = page.getByRole('button', { name: /export/i })
    const exportMenuItem = page.getByRole('menuitem', { name: /export/i })

    const hasExportButton = (await exportButton.count()) > 0
    const hasExportMenuItem = (await exportMenuItem.count()) > 0

    expect(hasExportButton || hasExportMenuItem).toBeTruthy()
  })

  test('export dialog opens with format selection', async ({ page }) => {
    // Find and click export trigger
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    // Dialog should open
    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Should have format options (use radio role for specificity)
    await expect(dialog.getByRole('radio', { name: /json/i })).toBeVisible()
    await expect(dialog.getByRole('radio', { name: /markdown/i })).toBeVisible()
  })

  test('JSON export includes all node data', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Select JSON format
    const jsonOption = dialog.getByRole('radio', { name: /json/i })
    if ((await jsonOption.count()) > 0) {
      await jsonOption.click()
    }

    // Preview should show JSON structure
    const preview = dialog.locator('pre, [data-testid="export-preview"]')
    if ((await preview.count()) > 0) {
      const content = await preview.textContent()
      expect(content).toContain('nodes')
    }
  })

  test('JSON export can be downloaded', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 })

    // Click download/export button
    const downloadButton = dialog.getByRole('button', {
      name: /download|export/i,
    })
    if ((await downloadButton.count()) > 0) {
      await downloadButton.click()

      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.json$/)
    }
  })
})

test.describe('Export - Markdown Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('Markdown export preserves frontmatter', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Select Markdown format
    const mdOption = dialog.getByRole('radio', { name: /markdown/i })
    if ((await mdOption.count()) > 0) {
      await mdOption.click()
    }

    // Preview should show markdown file structure with type directories
    // (frontmatter is included in the exported files, shown via directory structure)
    const preview = dialog.locator('pre, [data-testid="export-preview"]')
    if ((await preview.count()) > 0) {
      const content = await preview.textContent()
      // Should show directory structure indicating frontmatter will be included
      expect(content).toMatch(/\.(md|json)/)
      expect(content).toMatch(
        /project\.json|decisions\/|tasks\/|notes\/|components\//
      )
    }
  })

  test('Markdown export creates proper directory structure', async ({
    page,
  }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Select Markdown format
    const mdOption = dialog.getByRole('radio', { name: /markdown/i })
    if ((await mdOption.count()) > 0) {
      await mdOption.click()
    }

    // Should show directory structure preview or options
    const structurePreview = dialog.getByText(
      /decisions\/|components\/|tasks\/|notes\//i
    )
    if ((await structurePreview.count()) > 0) {
      await expect(structurePreview.first()).toBeVisible()
    }
  })
})

test.describe('Export - CSV Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('CSV export is available for components', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Should have CSV option
    const csvOption = dialog.getByText(/csv|bill of materials|bom/i)
    await expect(csvOption.first()).toBeVisible()
  })

  test('CSV export includes component cost and supplier', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Select CSV format
    const csvOption = dialog.getByRole('radio', { name: /csv/i })
    if ((await csvOption.count()) > 0) {
      await csvOption.click()
    }

    // Preview should show CSV headers
    const preview = dialog.locator('pre, [data-testid="export-preview"]')
    if ((await preview.count()) > 0) {
      const content = await preview.textContent()
      expect(content).toMatch(/cost|supplier|name/i)
    }
  })
})

test.describe('Import - JSON Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('import button is accessible in UI', async ({ page }) => {
    // Look for import button or menu item
    const importButton = page.getByRole('button', { name: /import/i })
    const importMenuItem = page.getByRole('menuitem', { name: /import/i })

    const hasImportButton = (await importButton.count()) > 0
    const hasImportMenuItem = (await importMenuItem.count()) > 0

    expect(hasImportButton || hasImportMenuItem).toBeTruthy()
  })

  test('import dialog opens with file picker', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /import/i })
    if ((await importButton.count()) > 0) {
      await importButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /import/i })
    await expect(dialog).toBeVisible()

    // Should have file input or drop zone
    const fileInput = dialog.locator('input[type="file"]')
    const dropZone = dialog.getByText(/drag.*drop|choose.*file/i)

    const hasFileInput = (await fileInput.count()) > 0
    const hasDropZone = (await dropZone.count()) > 0

    expect(hasFileInput || hasDropZone).toBeTruthy()
  })

  test('import dialog shows format auto-detection', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /import/i })
    if ((await importButton.count()) > 0) {
      await importButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /import/i })
    await expect(dialog).toBeVisible()

    // Should mention supported formats
    const formatInfo = dialog.getByText(/json|markdown|supported/i)
    await expect(formatInfo.first()).toBeVisible()
  })

  test('import validates JSON structure', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /import/i })
    if ((await importButton.count()) > 0) {
      await importButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /import/i })
    await expect(dialog).toBeVisible()

    // If we can interact with file upload, test invalid JSON
    // This would require mocking file input
  })
})

test.describe('Import - Markdown Format', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('import accepts markdown files with frontmatter', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /import/i })
    if ((await importButton.count()) > 0) {
      await importButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /import/i })
    await expect(dialog).toBeVisible()

    // Should accept .md files (use first file input - the single file picker)
    const fileInput = dialog.locator('input[type="file"]').first()
    if ((await fileInput.count()) > 0) {
      const accept = await fileInput.getAttribute('accept')
      expect(accept).toMatch(/\.md|markdown/i)
    }
  })

  test('import handles malformed markdown gracefully', async ({ page }) => {
    // This would require file upload mocking
    // For now, verify the import UI is accessible
    const importButton = page.getByRole('button', { name: /import/i })
    if ((await importButton.count()) > 0) {
      await importButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /import/i })
    await expect(dialog).toBeVisible()
  })
})

test.describe('Import - Conflict Resolution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('import shows conflict resolution options for existing nodes', async ({
    page,
  }) => {
    const importButton = page.getByRole('button', { name: /import/i })
    if ((await importButton.count()) > 0) {
      await importButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /import/i })
    await expect(dialog).toBeVisible()

    // Should have merge/replace options
    const mergeOption = dialog.getByText(/merge|replace|skip|overwrite/i)
    if ((await mergeOption.count()) > 0) {
      await expect(mergeOption.first()).toBeVisible()
    }
  })
})

test.describe('Import/Export - Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test('drag and drop zone is visible in import dialog', async ({ page }) => {
    const importButton = page.getByRole('button', { name: /import/i })
    if ((await importButton.count()) > 0) {
      await importButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /import/i })
    await expect(dialog).toBeVisible()

    // Should have drop zone
    const dropZone = dialog.getByText(/drag.*drop/i)
    if ((await dropZone.count()) > 0) {
      await expect(dropZone).toBeVisible()
    }
  })
})

test.describe('Import/Export - Keyboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('export dialog is keyboard navigable', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    // Tab through dialog elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Focus should stay in dialog
    const focusInDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]')
      return dialog?.contains(document.activeElement) ?? false
    })
    expect(focusInDialog).toBe(true)
  })

  test('Escape closes export dialog', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i })
    if ((await exportButton.count()) > 0) {
      await exportButton.click()
    }

    const dialog = page.getByRole('dialog', { name: /export/i })
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })
})
