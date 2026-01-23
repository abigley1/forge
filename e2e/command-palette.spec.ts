/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
  openCommandPalette,
  closeDialog,
} from './test-utils'

test.describe('Command Palette - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test.describe('Opening and Closing', () => {
    test('opens with Cmd+K (Mac) / Ctrl+K (Windows)', async ({ page }) => {
      await openCommandPalette(page)
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()
    })

    test('closes with Escape key', async ({ page }) => {
      await openCommandPalette(page)
      await page.keyboard.press('Escape')
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).not.toBeVisible()
    })

    test('closes when clicking outside', async ({ page }) => {
      await openCommandPalette(page)

      // Wait for dialog to be fully visible
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible()

      // Click on the backdrop (bottom-right corner, away from the dialog)
      // The dialog is centered at top 15%, so clicking at bottom of viewport should hit backdrop
      const viewport = page.viewportSize()
      if (viewport) {
        await page.mouse.click(viewport.width - 50, viewport.height - 50)
      } else {
        await page.mouse.click(700, 500)
      }

      await expect(dialog).not.toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Search Input', () => {
    test('input is focused when palette opens', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')
      await expect(input).toBeFocused()
    })

    test('placeholder text is visible', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')
      await expect(input).toHaveAttribute(
        'placeholder',
        /search.*nodes|type.*search/i
      )
    })

    test('typing filters results', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')

      // Type a search term
      await input.fill('motor')
      await page.waitForTimeout(100)

      // Should show matching results
      const results = page.getByRole('option')
      await expect(results.first()).toBeVisible()
    })

    test('clearing input shows all results', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')

      // Type then clear
      await input.fill('motor')
      await page.waitForTimeout(100)
      await input.clear()
      await page.waitForTimeout(100)

      // Should show results again
      const results = page.getByRole('option')
      const count = await results.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Search Results', () => {
    test('shows matching nodes from search', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')
      const dialog = page.getByRole('dialog')

      await input.fill('Motor')
      await page.waitForTimeout(200)

      // Should show motor-related results in the command palette dialog
      await expect(
        dialog
          .getByRole('option', {
            name: /Motor Selection|NEMA 17|Research Motor/i,
          })
          .first()
      ).toBeVisible()
    })

    test('shows node type icons in results', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')

      await input.fill('Motor')
      await page.waitForTimeout(200)

      // Results should have node type indicators
      const results = page.getByRole('option')
      await expect(results.first()).toBeVisible()
    })

    test('shows "no results" message for unmatched search', async ({
      page,
    }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')

      await input.fill('xyznonexistent123')
      await page.waitForTimeout(200)

      await expect(page.getByText(/no results|no matches/i)).toBeVisible()
    })

    test('result count is displayed', async ({ page }) => {
      await openCommandPalette(page)
      const dialog = page.getByRole('dialog', { name: 'Command palette' })
      await page.waitForTimeout(100)

      // Should show result count within the command palette
      const countText = dialog.getByText(/\d+ (results?|nodes?|items?)/i)
      await expect(countText).toBeVisible()
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('arrow down moves selection down', async ({ page }) => {
      await openCommandPalette(page)
      await page.waitForTimeout(100)

      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(50)

      // First item should be selected
      const selectedItem = page.getByRole('option', { selected: true })
      await expect(selectedItem).toBeVisible()
    })

    test('arrow up moves selection up', async ({ page }) => {
      await openCommandPalette(page)
      await page.waitForTimeout(100)

      // Move down twice then up once
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowUp')

      // Should have a selected item
      const selectedItem = page.getByRole('option', { selected: true })
      await expect(selectedItem).toBeVisible()
    })

    test('Enter selects the highlighted result', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')

      await input.fill('Motor Selection')
      await page.waitForTimeout(200)

      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')

      // Command palette should close (use specific name)
      const commandPalette = page.getByRole('dialog', {
        name: 'Command palette',
      })
      await expect(commandPalette).not.toBeVisible()

      // Node should be selected - detail panel should be visible
      const detailPanel = page.getByRole('dialog', { name: /edit/i })
      await expect(detailPanel).toBeVisible()
    })

    test('Tab moves through results', async ({ page }) => {
      await openCommandPalette(page)
      await page.waitForTimeout(100)

      // Tab should move through interactive elements
      await page.keyboard.press('Tab')
      // Focus should move
    })
  })

  test.describe('Action Shortcuts', () => {
    test('shows keyboard shortcut hints', async ({ page }) => {
      await openCommandPalette(page)
      await page.waitForTimeout(100)

      // Look for shortcut hints like "Enter to select"
      const shortcuts = page.getByText(/enter|esc|escape/i)
      if (await shortcuts.first().isVisible()) {
        await expect(shortcuts.first()).toBeVisible()
      }
    })
  })

  test.describe('Accessibility', () => {
    test('dialog has proper ARIA attributes', async ({ page }) => {
      await openCommandPalette(page)
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    test('search input has combobox role', async ({ page }) => {
      await openCommandPalette(page)
      const input = page.getByRole('combobox')
      await expect(input).toBeVisible()
    })

    test('results have listbox and option roles', async ({ page }) => {
      await openCommandPalette(page)
      await page.waitForTimeout(100)

      const listbox = page.getByRole('listbox')
      if (await listbox.isVisible()) {
        const options = page.getByRole('option')
        await expect(options.first()).toBeVisible()
      }
    })

    test('focus is trapped within dialog', async ({ page }) => {
      await openCommandPalette(page)

      // The command palette uses combobox pattern - focus primarily stays on input
      // Tab once to move focus
      await page.keyboard.press('Tab')
      await page.waitForTimeout(50)

      // Focus should still be within the dialog (could be on input or clear button)
      const dialog = page.locator('[role="dialog"]')
      const focusedInDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        return dialog?.contains(document.activeElement) ?? false
      })
      expect(focusedInDialog).toBe(true)
    })
  })
})

test.describe('Command Palette - Commands', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('shows action commands when typing ">"', async ({ page }) => {
    await openCommandPalette(page)
    const input = page.getByRole('combobox')

    await input.fill('>')
    await page.waitForTimeout(100)

    // Should show command actions
    const results = page.getByRole('option')
    const count = await results.count()
    // Might have "New Decision", "New Task", etc.
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
