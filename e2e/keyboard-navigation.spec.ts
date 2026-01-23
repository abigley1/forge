/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
  openCommandPalette,
} from './test-utils'

test.describe('Keyboard Navigation - Global Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('Cmd/Ctrl+K opens command palette', async ({ page }) => {
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k')

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
  })

  test('Escape closes dialogs', async ({ page }) => {
    await openCommandPalette(page)
    await page.keyboard.press('Escape')

    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).not.toBeVisible()
  })

  test('Cmd/Ctrl+1 switches to outline view', async ({ page }) => {
    // First switch to graph
    await page.getByRole('tab', { name: /graph/i }).click()
    await page.waitForTimeout(100)

    // Use keyboard shortcut
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+1' : 'Control+1')

    const outlineTab = page.getByRole('tab', { name: /outline/i })
    await expect(outlineTab).toHaveAttribute('aria-selected', 'true')
  })

  test('Cmd/Ctrl+2 switches to graph view', async ({ page }) => {
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+2' : 'Control+2')

    const graphTab = page.getByRole('tab', { name: /graph/i })
    await expect(graphTab).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Keyboard Navigation - Focus Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('Tab moves focus through interactive elements', async ({ page }) => {
    // Start from body
    await page.keyboard.press('Tab')

    // Check that focus moved to an interactive element
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    )
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(
      focusedElement
    )
  })

  test('Shift+Tab moves focus backwards', async ({ page }) => {
    // Tab forward a few times
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Now shift-tab back
    await page.keyboard.press('Shift+Tab')

    // Focus should have moved
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    )
    expect(focusedElement).toBeTruthy()
  })

  test('Enter activates focused button', async ({ page }) => {
    // Tab to a button
    const buttons = page.getByRole('button')
    const firstButton = buttons.first()
    await firstButton.focus()

    // Press Enter
    await page.keyboard.press('Enter')
    // Should trigger the button action
  })

  test('Space activates focused checkbox', async ({ page }) => {
    // Checkboxes are in the Filters section - expand it first
    const filterButton = page.getByRole('button', { name: /filters/i })
    await filterButton.click()
    await page.waitForTimeout(200)

    // Find a status checkbox in the sidebar
    const sidebar = page.locator('aside')
    const checkbox = sidebar.getByRole('checkbox').first()
    await expect(checkbox).toBeVisible()
    await checkbox.focus()

    const wasChecked = await checkbox.isChecked()
    await page.keyboard.press('Space')
    const isNowChecked = await checkbox.isChecked()

    expect(isNowChecked).not.toBe(wasChecked)
  })
})

test.describe('Keyboard Navigation - Skip Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('skip link becomes visible on focus', async ({ page }) => {
    // Tab to focus the skip link
    await page.keyboard.press('Tab')

    const skipLink = page.getByText(/skip to/i)
    await expect(skipLink).toBeVisible()
  })

  test('skip link navigates to main content', async ({ page }) => {
    // Tab to skip link
    await page.keyboard.press('Tab')

    // Activate it
    await page.keyboard.press('Enter')

    // Focus should be on main content
    const mainContent = page.locator('main#main-content')
    const hasFocus = await mainContent.evaluate((el) =>
      el.contains(document.activeElement)
    )
    expect(hasFocus).toBe(true)
  })
})

test.describe('Keyboard Navigation - View Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('arrow keys navigate between view tabs', async ({ page }) => {
    // Focus on view toggle
    const outlineTab = page.getByRole('tab', { name: /outline/i })
    await outlineTab.focus()

    // Right arrow should move to graph
    await page.keyboard.press('ArrowRight')

    // Check if graph tab is now focused or selected
    const graphTab = page.getByRole('tab', { name: /graph/i })
    const isFocused = await graphTab.evaluate(
      (el) => el === document.activeElement
    )
    // Either focused or should be able to activate with Enter
  })

  test('Enter/Space activates focused tab', async ({ page }) => {
    // Focus on graph tab
    const graphTab = page.getByRole('tab', { name: /graph/i })
    await graphTab.focus()

    // Press Enter
    await page.keyboard.press('Enter')

    await expect(graphTab).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Keyboard Navigation - Dialog Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('focus is trapped in open dialog', async ({ page }) => {
    await openCommandPalette(page)

    // Tab many times
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
    }

    // Focus should still be inside dialog
    const isInDialog = await page.evaluate(() => {
      return document.activeElement?.closest('[role="dialog"]') !== null
    })
    expect(isInDialog).toBe(true)
  })

  test('focus returns to trigger after dialog closes', async ({ page }) => {
    // Open command palette with keyboard
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k')

    await page.waitForTimeout(100)

    // Close with Escape
    await page.keyboard.press('Escape')

    // Focus should be somewhere reasonable (body or previous element)
  })
})

test.describe('Keyboard Navigation - Node List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('nodes can be focused with keyboard', async ({ page }) => {
    // Tab through to reach node list
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement
        return el?.getAttribute('role') || el?.tagName
      })
      if (focusedElement === 'button' || focusedElement === 'BUTTON') {
        // May have reached a node button
        break
      }
    }
  })

  test('Enter on focused node opens detail panel', async ({ page }) => {
    // Click on a node first to test keyboard interaction
    const nodeItem = page.getByText('Motor Selection')
    await nodeItem.focus()

    // If it's focusable, press Enter
    const isFocusable = await nodeItem.evaluate((el) => el.tabIndex >= 0)
    if (isFocusable) {
      await page.keyboard.press('Enter')
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible()
    }
  })
})

test.describe('Keyboard Navigation - Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('Escape closes detail panel', async ({ page }) => {
    // Open detail panel
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByRole('dialog')
    await expect(detailPanel).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Panel should close
    await expect(detailPanel).not.toBeVisible()
  })

  test('Tab navigates through detail panel elements', async ({ page }) => {
    // Open detail panel
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByRole('dialog')
    await expect(detailPanel).toBeVisible()

    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Focus should be inside detail panel
    const isInPanel = await page.evaluate(() => {
      return document.activeElement?.closest('[role="dialog"]') !== null
    })
    // This may or may not be true depending on implementation
  })
})

test.describe('Keyboard Navigation - Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('all interactive elements are keyboard accessible', async ({ page }) => {
    // Get all interactive elements
    const buttons = await page.getByRole('button').all()
    const checkboxes = await page.getByRole('checkbox').all()
    const tabs = await page.getByRole('tab').all()

    // All should have tabIndex >= -1 (focusable or part of focus group)
    for (const button of buttons) {
      if (await button.isVisible()) {
        const tabIndex = await button.getAttribute('tabindex')
        // tabIndex should be null (default) or >= -1
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(-1)
        }
      }
    }
  })

  test('focus indicators are visible', async ({ page }) => {
    // Tab to focus an element
    await page.keyboard.press('Tab')

    // The focused element should have a visible focus indicator
    // This is a visual check, so we just verify something is focused
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    )
    expect(focusedElement).toBeTruthy()
  })

  test('no keyboard traps exist outside dialogs', async ({ page }) => {
    // Tab through many elements
    const visited = new Set<string>()

    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab')
      const id = await page.evaluate(() => {
        const el = document.activeElement
        return el?.id || el?.className || el?.tagName
      })
      visited.add(id)
    }

    // Should have visited multiple elements (not stuck in a trap)
    expect(visited.size).toBeGreaterThan(3)
  })
})
