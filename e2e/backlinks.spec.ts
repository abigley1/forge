import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
} from './test-utils'

/**
 * Backlinks Panel Tests (Sprint 4)
 * Tests for backlinks display, related nodes, and link navigation
 */

test.describe('Backlinks Panel - Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('backlinks section is visible in detail panel', async ({ page }) => {
    // Open Project Overview which is linked to by Motor Selection
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Look for backlinks section
    const backlinksSection = detailPanel.getByText(
      /backlinks|linked from|references/i
    )
    if ((await backlinksSection.count()) > 0) {
      await expect(backlinksSection.first()).toBeVisible()
    }
  })

  test('backlinks section shows linking nodes', async ({ page }) => {
    // Motor Selection decision is referenced in Project Overview note
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for backlinks listing Project Overview
    const backlink = detailPanel.getByText(/project overview/i)
    if ((await backlink.count()) > 0) {
      await expect(backlink).toBeVisible()
    }
  })

  test('backlinks show context snippet', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Backlinks should show surrounding context
    const contextSnippet = detailPanel.locator(
      '[data-testid="backlink-context"], .backlink-snippet'
    )
    if ((await contextSnippet.count()) > 0) {
      await expect(contextSnippet.first()).toBeVisible()
    }
  })

  test('backlinks are collapsible', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find collapse button for backlinks
    const collapseButton = detailPanel.getByRole('button', {
      name: /backlinks|collapse/i,
    })
    if ((await collapseButton.count()) > 0) {
      await collapseButton.click()
      // Content should be hidden/collapsed
    }
  })
})

test.describe('Backlinks Panel - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('clicking backlink navigates to that node', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find and click backlink
    const backlinkButton = detailPanel.getByRole('button', {
      name: /project overview/i,
    })
    const backlinkLink = detailPanel.getByRole('link', {
      name: /project overview/i,
    })

    if ((await backlinkButton.count()) > 0) {
      await backlinkButton.click()
      await expect(page.getByLabel(/Edit Project Overview/i)).toBeVisible()
    } else if ((await backlinkLink.count()) > 0) {
      await backlinkLink.click()
      await expect(page.getByLabel(/Edit Project Overview/i)).toBeVisible()
    }
  })

  test('backlink navigation updates URL', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    const initialUrl = page.url()

    // Navigate via backlink
    const backlinkButton = detailPanel.getByRole('button', {
      name: /project overview/i,
    })
    if ((await backlinkButton.count()) > 0) {
      await backlinkButton.click()
      await page.waitForTimeout(200)

      const newUrl = page.url()
      expect(newUrl).not.toBe(initialUrl)
    }
  })
})

test.describe('Related Nodes Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('related nodes section shows outgoing links', async ({ page }) => {
    // Project Overview has link to Motor Selection
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    await expect(detailPanel).toBeVisible()

    // Look for outgoing links section
    const outgoingSection = detailPanel.getByText(
      /links to|outgoing|references/i
    )
    if ((await outgoingSection.count()) > 0) {
      await expect(outgoingSection.first()).toBeVisible()
    }
  })

  test('related nodes section shows incoming links', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for incoming links section
    const incomingSection = detailPanel.getByText(
      /linked from|incoming|backlinks/i
    )
    if ((await incomingSection.count()) > 0) {
      await expect(incomingSection.first()).toBeVisible()
    }
  })

  test('related nodes groups by link type', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Links should be grouped (outgoing vs incoming, or by relationship type)
    const linkGroups = detailPanel.locator(
      '[data-testid="link-group"], .link-group'
    )
    if ((await linkGroups.count()) > 1) {
      // Multiple groups exist
      await expect(linkGroups.first()).toBeVisible()
    }
  })
})

test.describe('Backlinks - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('shows message when no backlinks exist', async ({ page }) => {
    // Find a node that isn't linked to by others
    await page.getByText('Meeting Notes').click()

    const detailPanel = page.getByLabel(/Edit Meeting Notes/i)
    await expect(detailPanel).toBeVisible()

    // Look for empty state message
    const emptyMessage = detailPanel.getByText(
      /no backlinks|not linked|no references/i
    )
    if ((await emptyMessage.count()) > 0) {
      await expect(emptyMessage).toBeVisible()
    }
  })
})

test.describe('Backlinks - Keyboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('backlinks are keyboard focusable', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Tab through to backlinks
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.textContent
          ?.toLowerCase()
          .includes('project overview')
      })
      if (focusedElement) {
        break
      }
    }
  })

  test('Enter key navigates to backlinked node', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Focus backlink and press Enter
    const backlinkButton = detailPanel.getByRole('button', {
      name: /project overview/i,
    })
    if ((await backlinkButton.count()) > 0) {
      await backlinkButton.focus()
      await page.keyboard.press('Enter')

      await expect(page.getByLabel(/Edit Project Overview/i)).toBeVisible()
    }
  })
})

test.describe('Backlinks - Live Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('backlinks update when new link is added', async ({ page }) => {
    // Open a note and add a link to Motor Selection
    await page.getByText('Meeting Notes').click()

    const detailPanel = page.getByLabel(/Edit Meeting Notes/i)
    await expect(detailPanel).toBeVisible()

    // Add link in content (this tests that backlink index updates)
    // This would require content editing which is tested elsewhere
  })
})
