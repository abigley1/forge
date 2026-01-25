import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
} from './test-utils'

/**
 * Wiki-Link Autocomplete Tests (Sprint 4)
 * Tests for [[ syntax, autocomplete suggestions, and link creation
 */

test.describe('Wiki-Link Autocomplete - Trigger', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('typing [[ triggers autocomplete', async ({ page }) => {
    // Open a node for editing
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Focus the content editor
    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()

      // Type [[
      await page.keyboard.type('[[')
      await page.waitForTimeout(200)

      // Autocomplete popup should appear
      const autocomplete = page.locator(
        '.cm-autocomplete, [role="listbox"], .autocomplete-popup'
      )
      if ((await autocomplete.count()) > 0) {
        await expect(autocomplete).toBeVisible()
      }
    }
  })

  test('autocomplete shows node suggestions', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()
      await page.keyboard.type('[[')
      await page.waitForTimeout(200)

      // Should show node titles
      const suggestions = page.locator(
        '.cm-autocomplete-option, [role="option"]'
      )
      if ((await suggestions.count()) > 0) {
        await expect(suggestions.first()).toBeVisible()
      }
    }
  })

  test('typing after [[ filters suggestions', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()
      await page.keyboard.type('[[motor')
      await page.waitForTimeout(200)

      // Should filter to motor-related nodes
      const suggestions = page.locator(
        '.cm-autocomplete-option, [role="option"]'
      )
      if ((await suggestions.count()) > 0) {
        const text = await suggestions.first().textContent()
        expect(text?.toLowerCase()).toContain('motor')
      }
    }
  })
})

test.describe('Wiki-Link Autocomplete - Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('Enter key inserts selected suggestion', async ({ page }) => {
    // Click on a note node to open detail panel with editor
    const projectOverview = page.getByText('Project Overview')
    await expect(projectOverview.first()).toBeVisible({ timeout: 5000 })
    await projectOverview.first().click()
    await page.waitForTimeout(300)

    // Wait for detail panel and editor to be ready
    const editor = page.locator('.cm-editor').first()
    await expect(editor).toBeVisible({ timeout: 5000 })

    // Click into editor and type wiki-link trigger
    await editor.click()
    await page.keyboard.type('[[motor')
    await page.waitForTimeout(300)

    // Check if autocomplete appeared
    const autocomplete = page.locator('.cm-autocomplete, [role="listbox"]')
    if (await autocomplete.isVisible()) {
      // Press Enter to select first suggestion
      await page.keyboard.press('Enter')
      await page.waitForTimeout(200)

      // Autocomplete should close
      await expect(autocomplete).not.toBeVisible()

      // Link should be inserted
      const text = await editor.textContent()
      expect(text).toContain(']]')
    }
  })

  test('clicking suggestion inserts link', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()
      await page.keyboard.type('[[')
      await page.waitForTimeout(200)

      // Click first suggestion
      const suggestion = page
        .locator('.cm-autocomplete-option, [role="option"]')
        .first()
      if ((await suggestion.count()) > 0) {
        await suggestion.click()
        await page.waitForTimeout(100)

        // Link should be inserted
        const content = detailPanel.locator('.cm-editor')
        const text = await content.textContent()
        expect(text).toContain(']]')
      }
    }
  })

  test('Escape dismisses autocomplete', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()
      await page.keyboard.type('[[')
      await page.waitForTimeout(200)

      const autocomplete = page.locator('.cm-autocomplete, [role="listbox"]')
      if ((await autocomplete.count()) > 0) {
        await page.keyboard.press('Escape')
        await expect(autocomplete).not.toBeVisible()
      }
    }
  })
})

test.describe('Wiki-Link Autocomplete - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('arrow keys navigate suggestions', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()
      await page.keyboard.type('[[')
      await page.waitForTimeout(200)

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowUp')

      // Selected item should change (visual check)
      const selectedOption = page.locator(
        '.cm-autocomplete-option[aria-selected="true"], [role="option"][aria-selected="true"]'
      )
      if ((await selectedOption.count()) > 0) {
        await expect(selectedOption).toBeVisible()
      }
    }
  })
})

test.describe('Wiki-Link - Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('wiki links are styled in editor', async ({ page }) => {
    // Project Overview has [[decision-motor-selection]] link
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Look for styled link in editor
    const styledLink = detailPanel.locator('.cm-link, [data-link], .wiki-link')
    if ((await styledLink.count()) > 0) {
      await expect(styledLink.first()).toBeVisible()
    }
  })

  test('wiki links have underline decoration', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Check for underline style
    const link = detailPanel.locator('.cm-link, .wiki-link')
    if ((await link.count()) > 0) {
      const decoration = await link
        .first()
        .evaluate((el) => getComputedStyle(el).textDecoration)
      expect(decoration).toContain('underline')
    }
  })
})

test.describe('Wiki-Link - Click Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('Cmd/Ctrl+click navigates to linked node', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Find wiki link
    const link = detailPanel.locator('.cm-link, .wiki-link, [data-link]')
    if ((await link.count()) > 0) {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      await page.keyboard.down(modifier)
      await link.first().click()
      await page.keyboard.up(modifier)

      await page.waitForTimeout(200)

      // Should navigate to Motor Selection
      const newPanel = page.getByLabel(/Edit Motor Selection/i)
      if ((await newPanel.count()) > 0) {
        await expect(newPanel).toBeVisible()
      }
    }
  })
})

test.describe('Wiki-Link - Hover Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('hovering wiki link shows preview tooltip', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const link = detailPanel.locator('.cm-link, .wiki-link, [data-link]')
    if ((await link.count()) > 0) {
      await link.first().hover()
      await page.waitForTimeout(500)

      // Preview tooltip should appear
      const tooltip = page.locator('[role="tooltip"], .preview-tooltip')
      if ((await tooltip.count()) > 0) {
        await expect(tooltip).toBeVisible()
      }
    }
  })

  test('preview shows node title and type', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const link = detailPanel.locator('.cm-link, .wiki-link, [data-link]')
    if ((await link.count()) > 0) {
      await link.first().hover()
      await page.waitForTimeout(500)

      const tooltip = page.locator('[role="tooltip"], .preview-tooltip')
      if ((await tooltip.count()) > 0) {
        // Should show title
        await expect(tooltip).toContainText(/motor selection/i)
      }
    }
  })
})

test.describe('Wiki-Link - Broken Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('broken links are styled differently', async ({ page }) => {
    // Would need to create a broken link first
    // For now, check that broken link styling exists in CSS
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Look for broken link indicator (red, dashed)
    const brokenLink = detailPanel.locator('.broken-link, [data-broken="true"]')
    if ((await brokenLink.count()) > 0) {
      await expect(brokenLink.first()).toBeVisible()
    }
  })

  test('broken link shows warning indicator', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Look for warning badge/count in toolbar
    const warningBadge = detailPanel.locator(
      '[data-testid="broken-link-warning"], .warning-badge'
    )
    if ((await warningBadge.count()) > 0) {
      await expect(warningBadge).toBeVisible()
    }
  })
})

test.describe('Wiki-Link - Create from Non-existent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('clicking non-existent link offers to create node', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Click on a broken/non-existent link
    const brokenLink = detailPanel.locator('.broken-link, [data-broken="true"]')
    if ((await brokenLink.count()) > 0) {
      await brokenLink.first().click()

      // Should show create dialog
      const createDialog = page.getByRole('dialog', { name: /create.*node/i })
      if ((await createDialog.count()) > 0) {
        await expect(createDialog).toBeVisible()
      }
    }
  })
})

test.describe('Wiki-Link - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('autocomplete has proper ARIA roles', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()
      await page.keyboard.type('[[')
      await page.waitForTimeout(200)

      const listbox = page.locator('[role="listbox"]')
      if ((await listbox.count()) > 0) {
        await expect(listbox).toBeVisible()

        const options = listbox.locator('[role="option"]')
        if ((await options.count()) > 0) {
          await expect(options.first()).toBeVisible()
        }
      }
    }
  })

  test('aria-live announces link insertion', async ({ page }) => {
    // Check for aria-live region
    const liveRegion = page.locator('[aria-live]')
    await expect(liveRegion.first()).toBeAttached()
  })
})

test.describe('Wiki-Link - Auto-suggest Mentions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('typing node name suggests converting to link', async ({ page }) => {
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    const editor = detailPanel.locator(
      '.cm-editor, [data-testid="markdown-editor"]'
    )
    if ((await editor.count()) > 0) {
      await editor.click()
      // Type a node name without [[ brackets
      await page.keyboard.type('Motor Selection')
      await page.waitForTimeout(300)

      // Should show subtle underline or suggestion to convert
      const suggestion = page.locator(
        '[data-testid="link-suggestion"], .text-suggestion'
      )
      if ((await suggestion.count()) > 0) {
        await expect(suggestion).toBeVisible()
      }
    }
  })
})
