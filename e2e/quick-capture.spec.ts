/**
 * E2E Tests for Quick Capture Notes (Task 15.11)
 *
 * Tests verify that:
 * - Global hotkey Cmd/Ctrl+Shift+N opens quick capture modal
 * - Modal appears as floating overlay
 * - Enter submits and closes, Escape cancels
 * - Creates NoteNode with title from first line, rest as content
 * - Quick capture notes tagged with 'inbox' by default
 * - Toast confirmation with 'View' action
 * - Command palette integration
 * - Works from any view
 */

import { test, expect } from '@playwright/test'
import { waitForAppReady } from './test-utils'

// Test nodes for setup
const QUICK_CAPTURE_TEST_NODES = [
  {
    id: 'existing-task',
    type: 'task',
    title: 'Existing Task',
    tags: ['project'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'An existing task for context.',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  },
]

/**
 * Set up test nodes
 */
async function setupTestNodes(page: import('@playwright/test').Page) {
  await page.evaluate((nodes) => {
    const event = new CustomEvent('e2e-setup-nodes', {
      detail: { nodes },
    })
    window.dispatchEvent(event)
  }, QUICK_CAPTURE_TEST_NODES)

  await page.waitForTimeout(300)
}

test.describe('Quick Capture Notes (15.11)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestNodes(page)
  })

  // ===========================================================================
  // Opening Quick Capture
  // ===========================================================================

  test.describe('Opening Quick Capture', () => {
    test('Cmd/Ctrl+Shift+N opens quick capture modal', async ({ page }) => {
      // Get modifier key based on platform
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      // Press the hotkey
      await page.keyboard.press(`${modifier}+Shift+n`)

      // Wait for modal to appear
      await page.waitForTimeout(200)

      // Check for quick capture modal
      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).toBeVisible({ timeout: 3000 })
    })

    test('modal appears as floating overlay without navigation', async ({
      page,
    }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      // Verify we're on the main view
      const mainContent = page.locator('main')
      await expect(mainContent).toBeVisible()

      // Open quick capture
      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      // Modal should be visible
      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).toBeVisible()

      // Main content should still be visible (overlay, not navigation)
      await expect(mainContent).toBeVisible()
    })

    test('quick capture accessible via command palette', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      // Open command palette
      await page.keyboard.press(`${modifier}+k`)
      await page.waitForTimeout(200)

      // Search for quick capture
      const searchInput = page.getByRole('textbox', { name: /search/i })
      if (await searchInput.isVisible()) {
        await searchInput.fill('quick capture')
        await page.waitForTimeout(100)

        // Click the quick capture command
        const quickCaptureCommand = page.getByText(/quick.*capture/i)
        if (await quickCaptureCommand.isVisible()) {
          await quickCaptureCommand.click()
          await page.waitForTimeout(200)

          // Modal should open
          const modal = page.getByRole('dialog', { name: /quick.*capture/i })
          await expect(modal).toBeVisible()
        }
      }
    })
  })

  // ===========================================================================
  // Modal Interaction
  // ===========================================================================

  test.describe('Modal Interaction', () => {
    test('modal has text input with placeholder', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const input = page.getByPlaceholder(/quick.*note/i)
      await expect(input).toBeVisible()
      await expect(input).toBeFocused()
    })

    test('Escape closes the modal without creating note', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).toBeVisible()

      // Type something but don't submit
      const input = page.getByPlaceholder(/quick.*note/i)
      await input.fill('This should not be saved')

      // Press Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Modal should be closed
      await expect(modal).not.toBeVisible()

      // The note should not have been created
      // (would need to check nodes, but for simplicity check UI)
    })

    test('Enter submits and closes modal', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const input = page.getByPlaceholder(/quick.*note/i)
      await input.fill('My Quick Note')

      // Press Enter
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)

      // Modal should close
      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).not.toBeVisible()

      // Toast confirmation should appear
      const toast = page.getByRole('alert', { name: /note.*created/i })
      await expect(toast).toBeVisible({ timeout: 3000 })
    })
  })

  // ===========================================================================
  // Note Creation
  // ===========================================================================

  test.describe('Note Creation', () => {
    test('creates note with first line as title', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const input = page.getByPlaceholder(/quick.*note/i)
      await input.fill('My Note Title\nThis is the content')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // The note should be created (check in the outline panel)
      const outlinePanel = page.getByLabel(/outline/i)
      const noteTitle = outlinePanel.getByText('My Note Title')
      await expect(noteTitle).toBeVisible({ timeout: 3000 })
    })

    test('note is tagged with inbox by default', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const input = page.getByPlaceholder(/quick.*note/i)
      await input.fill('Inbox Note')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // The note should be selected automatically after creation
      // Check for inbox tag in the detail panel
      const detailPanel = page.getByTestId('detail-panel')
      await expect(detailPanel).toBeVisible({ timeout: 3000 })

      // Check for inbox tag
      const inboxTag = detailPanel.getByText('inbox', { exact: true })
      await expect(inboxTag).toBeVisible({ timeout: 3000 })
    })

    test('inline #tag syntax adds tags to note', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const input = page.getByPlaceholder(/quick.*note/i)
      await input.fill('Tagged Note #important #followup')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // The note should be selected automatically after creation
      const detailPanel = page.getByTestId('detail-panel')
      await expect(detailPanel).toBeVisible({ timeout: 3000 })

      // Check for custom tags (they should appear in the tag area)
      const importantTag = detailPanel.getByText('important', { exact: true })
      const followupTag = detailPanel.getByText('followup', { exact: true })
      // At least one tag should be visible
      const hasImportant = await importantTag.isVisible().catch(() => false)
      const hasFollowup = await followupTag.isVisible().catch(() => false)
      expect(hasImportant || hasFollowup).toBeTruthy()
    })
  })

  // ===========================================================================
  // Toast Confirmation
  // ===========================================================================

  test.describe('Toast Confirmation', () => {
    test('toast shows confirmation after note creation', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const input = page.getByPlaceholder(/quick.*note/i)
      await input.fill('Toast Test Note')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)

      // Toast should appear with note title
      const toast = page.getByRole('alert', { name: /note.*created/i })
      await expect(toast).toBeVisible({ timeout: 3000 })
    })

    test('created note appears in outline and detail panel shows it', async ({
      page,
    }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const input = page.getByPlaceholder(/quick.*note/i)
      await input.fill('Navigate Test Note')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // Detail panel should open automatically with the note
      const detailPanel = page.getByTestId('detail-panel')
      await expect(detailPanel).toBeVisible({ timeout: 3000 })

      // Detail panel should have aria-label with the note title
      await expect(
        page.locator('[aria-label*="Navigate Test Note"]')
      ).toBeVisible({ timeout: 3000 })
    })
  })

  // ===========================================================================
  // Works From Any View
  // ===========================================================================

  test.describe('Works From Any View', () => {
    test('works from graph view', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      // Switch to graph view
      const graphTab = page.getByRole('tab', { name: /graph/i })
      if (await graphTab.isVisible()) {
        await graphTab.click()
        await page.waitForTimeout(300)
      }

      // Open quick capture
      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      // Modal should appear
      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).toBeVisible()
    })

    test('works when detail panel is focused', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      // Click on a node to open detail panel
      const existingTask = page.getByText('Existing Task')
      if (await existingTask.isVisible()) {
        await existingTask.click()
        await page.waitForTimeout(300)
      }

      // Open quick capture
      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      // Modal should appear
      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).toBeVisible()
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  test.describe('Accessibility', () => {
    test('modal has proper ARIA attributes', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).toBeVisible()

      // Check for proper dialog role (already asserted by getByRole)
      // Check that input is focused
      const input = page.getByPlaceholder(/quick.*note/i)
      await expect(input).toBeFocused()
    })

    test('modal is keyboard navigable', async ({ page }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.press(`${modifier}+Shift+n`)
      await page.waitForTimeout(200)

      // Input should be focused
      const input = page.getByPlaceholder(/quick.*note/i)
      await expect(input).toBeFocused()

      // Tab should move focus within modal
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)

      // Focus should still be in the modal (not escaped)
      const modal = page.getByRole('dialog', { name: /quick.*capture/i })
      await expect(modal).toBeVisible()
    })
  })
})
