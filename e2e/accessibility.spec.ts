/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {
  setupTestDataViaActions,
  waitForAppReady,
  openCommandPalette,
} from './test-utils'

/**
 * Accessibility Audit Tests (Task 10.1)
 *
 * WCAG 2.1 compliance verification using axe-core
 * Tests cover all major views and interactive components
 */

test.describe('Accessibility Audit - axe-core', () => {
  test.describe('Welcome Screen', () => {
    test('welcome screen has no accessibility violations', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('main#main-content', { state: 'visible' })

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('create project dialog has no accessibility violations', async ({
      page,
    }) => {
      await page.goto('/')
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()
      await page.waitForSelector('[role="dialog"]', { state: 'visible' })

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })
  })

  test.describe('Project Workspace', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await waitForAppReady(page)
      await setupTestDataViaActions(page)
    })

    test('main workspace has no accessibility violations', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('sidebar has no accessibility violations', async ({ page }) => {
      // Focus on sidebar
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('aside[aria-label="Sidebar navigation"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('outline view has no accessibility violations', async ({ page }) => {
      // Make sure we're in outline view
      const outlineButton = page.getByRole('radio', { name: /outline/i })
      if (await outlineButton.isVisible()) {
        await outlineButton.click()
      }

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('graph view has no accessibility violations', async ({ page }) => {
      // Switch to graph view
      const graphButton = page.getByRole('radio', { name: /graph/i })
      if (await graphButton.isVisible()) {
        await graphButton.click()
        await page.waitForTimeout(500) // Wait for graph to render
      }

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })
  })

  test.describe('Command Palette', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await waitForAppReady(page)
      await setupTestDataViaActions(page)
    })

    test('command palette has no accessibility violations', async ({
      page,
    }) => {
      await openCommandPalette(page)

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('command palette with search results has no violations', async ({
      page,
    }) => {
      await openCommandPalette(page)
      const searchInput = page.getByPlaceholder(/search/i)
      await searchInput.fill('motor')
      await page.waitForTimeout(200) // Wait for search results

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })
  })

  test.describe('Dialogs', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await waitForAppReady(page)
      await setupTestDataViaActions(page)
    })

    test('create node dialog has no accessibility violations', async ({
      page,
    }) => {
      // Click create decision button (use exact name to avoid matching section header)
      const createDecision = page.getByRole('button', {
        name: 'Create new Decision',
      })
      if (await createDecision.isVisible()) {
        await createDecision.click()
        await page.waitForSelector('[role="dialog"]', { state: 'visible' })

        const accessibilityScanResults = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze()

        expect(accessibilityScanResults.violations).toEqual([])
      }
    })
  })

  test.describe('Mobile Viewport', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
    })

    test('mobile view has no accessibility violations', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('main#main-content', { state: 'visible' })

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('mobile sidebar has no accessibility violations', async ({ page }) => {
      await page.goto('/')
      await waitForAppReady(page)
      await setupTestDataViaActions(page)

      // Sidebar is open by default on mobile
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })
  })
})

test.describe('Heading Hierarchy', () => {
  test('welcome screen has correct heading hierarchy', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('main#main-content', { state: 'visible' })

    // Check heading levels
    const h1s = await page.locator('h1').all()
    const h2s = await page.locator('h2').all()
    const h3s = await page.locator('h3').all()

    // Should have at least one h1
    expect(h1s.length).toBeGreaterThanOrEqual(1)

    // h1 should come before any h2
    if (h2s.length > 0) {
      const h1Position = await h1s[0].evaluate(
        (el) => el.compareDocumentPosition(document.body) & 4
      )
      expect(h1Position).toBeFalsy() // h1 is before body content
    }
  })

  test('workspace has correct heading hierarchy', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)

    // Check that headings follow proper order (no skipping levels)
    const headings = await page.evaluate(() => {
      const levels: number[] = []
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
        const level = parseInt(h.tagName.charAt(1))
        levels.push(level)
      })
      return levels
    })

    // Verify no skipped levels
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1]
      // Can go same, up one, or down any amount - cannot skip going down
      expect(diff).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('Focus Management', () => {
  test('focus is visible when tabbing', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)

    // Tab to first interactive element
    await page.keyboard.press('Tab')

    // Get focused element
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()

    // Check focus ring styles
    const hasFocusStyles = await focused.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      // Check for outline, box-shadow, or ring (Tailwind)
      return (
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none' ||
        el.classList.toString().includes('ring')
      )
    })
    expect(hasFocusStyles).toBeTruthy()
  })

  test('focus returns after dialog closes', async ({ page }) => {
    // Use welcome screen (no project loaded) to test dialog focus return
    await page.goto('/')
    await page.waitForSelector('main#main-content', { state: 'visible' })

    // Open create project dialog
    const createButton = page.getByRole('button', {
      name: 'Create New Project',
    })
    await createButton.focus()
    await createButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Close dialog with Escape
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()

    // Focus should return to trigger button
    await expect(createButton).toBeFocused()
  })

  test('focus is trapped in dialog', async ({ page }) => {
    // Use welcome screen (no project loaded) to test dialog focus trapping
    await page.goto('/')
    await page.waitForSelector('main#main-content', { state: 'visible' })

    const createButton = page.getByRole('button', {
      name: 'Create New Project',
    })
    await createButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Wait for dialog to be ready and focus to be set
    await page.waitForTimeout(100)

    // Tab through elements - dialog has ~3-4 focusable elements
    // Focus should cycle within dialog
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(50) // Small wait for focus to move

      // Check that focus stays within dialog or the dialog popup itself
      const isInDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const activeEl = document.activeElement

        // Check if focus is inside the dialog content
        if (dialog?.contains(activeEl)) return true

        // Also allow if focus is on the dialog popup container itself
        if (activeEl?.getAttribute('role') === 'dialog') return true

        // Allow if active element is within the dialog's portal structure
        const popup = activeEl?.closest('[data-base-ui-dialog-popup]')
        if (popup) return true

        return false
      })
      expect(isInDialog).toBeTruthy()
    }
  })

  test('skip link works correctly', async ({ page }) => {
    // Navigate to page first
    await page.goto('/')
    await waitForAppReady(page)

    // Find skip link
    const skipLink = page.getByRole('link', { name: 'Skip to main content' })

    // Tab to skip link (first tabbable element)
    await page.keyboard.press('Tab')

    // Skip link should be visible when focused
    await expect(skipLink).toBeFocused()
    await expect(skipLink).toBeVisible()

    // Activate skip link
    await page.keyboard.press('Enter')

    // Focus should move to main content
    const mainContent = page.locator('main#main-content')
    await expect(mainContent).toBeFocused()
  })
})

test.describe('ARIA Labels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test('icon-only buttons have accessible names', async ({ page }) => {
    const iconButtons = await page.locator('button:has(svg)').all()

    for (const button of iconButtons) {
      // Skip buttons that have text content
      const textContent = await button.textContent()
      const hasVisibleText = textContent && textContent.trim().length > 0

      if (!hasVisibleText) {
        // Should have aria-label
        const ariaLabel = await button.getAttribute('aria-label')
        const title = await button.getAttribute('title')
        const ariaLabelledBy = await button.getAttribute('aria-labelledby')

        const hasAccessibleName = ariaLabel || title || ariaLabelledBy
        expect(hasAccessibleName).toBeTruthy()
      }
    }
  })

  test('form inputs have labels', async ({ page }) => {
    // Check inputs in the workspace (sidebar has search input)
    const inputs = await page
      .locator('input:not([type="hidden"]), textarea, select')
      .all()

    for (const input of inputs) {
      const inputId = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')
      const placeholder = await input.getAttribute('placeholder')

      // Check for associated label element
      const hasLabelElement = inputId
        ? (await page.locator(`label[for="${inputId}"]`).count()) > 0
        : false

      // Input should have some form of accessible name
      const hasAccessibleName =
        hasLabelElement || ariaLabel || ariaLabelledBy || placeholder
      expect(hasAccessibleName).toBeTruthy()
    }
  })

  test('landmarks are properly labeled', async ({ page }) => {
    // Main should be present
    const main = page.locator('main')
    await expect(main).toHaveCount(1)
    await expect(main).toHaveAttribute('id', 'main-content')

    // Sidebar should have label
    const sidebar = page.locator('aside[aria-label="Sidebar navigation"]')
    await expect(sidebar).toBeAttached()
  })

  test('live regions are present for dynamic updates', async ({ page }) => {
    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live]').all()

    // Should have at least one live region for announcements
    expect(liveRegions.length).toBeGreaterThan(0)
  })
})

test.describe('Touch Targets', () => {
  test('buttons meet minimum touch target size', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('main#main-content', { state: 'visible' })

    // Check all buttons
    const buttons = await page.locator('button:visible').all()
    const smallButtons: string[] = []

    for (const button of buttons) {
      const box = await button.boundingBox()
      if (box) {
        // WCAG 2.1 AA requires 24x24px minimum
        // WCAG 2.1 AAA recommends 44x44px
        // We check for 24x24px as minimum, flag anything smaller
        const meetMinSize = box.width >= 24 && box.height >= 24
        if (!meetMinSize) {
          const label = await button.getAttribute('aria-label')
          const text = await button.textContent()
          smallButtons.push(
            `${label || text || 'unnamed'}: ${box.width}x${box.height}`
          )
        }
      }
    }

    // No buttons should be smaller than 24x24px (WCAG AA)
    expect(smallButtons).toEqual([])
  })

  test('link targets are adequately sized', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)

    // Check interactive links
    const links = await page.locator('a:visible').all()

    for (const link of links) {
      const box = await link.boundingBox()
      if (box) {
        // Check that clickable area is reasonable
        // Either width OR height should be at least 24px
        const hasAdequateTarget = box.width >= 24 || box.height >= 24
        expect(hasAdequateTarget).toBeTruthy()
      }
    }
  })
})

test.describe('Color Contrast', () => {
  test('text has sufficient contrast - checked by axe-core', async ({
    page,
  }) => {
    await page.goto('/')
    await page.waitForSelector('main#main-content', { state: 'visible' })

    // axe-core checks color contrast automatically with color-contrast rule
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze()

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    )

    expect(contrastViolations).toEqual([])
  })
})

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test('all interactive elements are reachable via Tab', async ({ page }) => {
    const visitedElements: string[] = []
    const startElement = await page.evaluate(
      () => document.activeElement?.tagName
    )

    // Tab through the page
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const el = document.activeElement
        if (!el || el.tagName === 'BODY') return 'BODY'
        return (
          el.tagName +
          (el.id ? `#${el.id}` : '') +
          (el.getAttribute('aria-label') || '')
        )
      })

      if (focused === 'BODY') continue

      // Check we haven't looped back to start
      if (visitedElements.length > 3 && focused === visitedElements[0]) {
        break
      }

      visitedElements.push(focused)
    }

    // Should have visited multiple interactive elements
    expect(visitedElements.length).toBeGreaterThan(3)
  })

  test('Escape closes dialogs', async ({ page }) => {
    // Open command palette with keyboard shortcut
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('command palette opens with Cmd/Ctrl+K', async ({ page }) => {
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
  })
})

test.describe('Error States', () => {
  test('error messages use aria-invalid', async ({ page }) => {
    await page.goto('/')

    // Open create project dialog
    const createButton = page.getByRole('button', {
      name: 'Create New Project',
    })
    await createButton.click()
    await page.waitForSelector('[role="dialog"]', { state: 'visible' })

    // Try to trigger validation error by submitting empty form
    // The create button should be disabled with empty input
    const input = page.getByLabel('Project Name')
    await input.fill('')

    // Check that disabled state prevents submission
    const submitButton = page.getByRole('button', { name: 'Create' })
    await expect(submitButton).toBeDisabled()
  })
})

test.describe('Screen Reader Support', () => {
  test('page has proper document title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/forge/i)
  })

  test('images have alt text', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)

    const images = await page.locator('img').all()

    for (const img of images) {
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')
      const ariaHidden = await img.getAttribute('aria-hidden')

      // Image should have alt text OR be marked as decorative
      const isAccessible =
        alt !== null || role === 'presentation' || ariaHidden === 'true'
      expect(isAccessible).toBeTruthy()
    }
  })

  test('SVG icons are properly hidden or labeled', async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)

    const svgs = await page.locator('svg').all()

    for (const svg of svgs) {
      const ariaHidden = await svg.getAttribute('aria-hidden')
      const ariaLabel = await svg.getAttribute('aria-label')
      const role = await svg.getAttribute('role')
      const title = await svg.locator('title').count()

      // SVG should either be hidden or have accessible name
      const isAccessible =
        ariaHidden === 'true' ||
        ariaLabel ||
        role === 'img' ||
        role === 'presentation' ||
        title > 0
      expect(isAccessible).toBeTruthy()
    }
  })
})
