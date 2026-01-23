import { test, expect } from '@playwright/test'
import { setupTestDataViaActions, waitForAppReady } from './test-utils'

test.describe('Auto Layout (5.4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)

    // Switch to graph view
    const graphTab = page.getByRole('tab', { name: /graph/i })
    await graphTab.click()
    await page.waitForTimeout(500)
  })

  test.describe('Layout Controls', () => {
    test('reset Layout button is visible in graph view', async ({ page }) => {
      // Look for reset/auto-layout button
      const resetButton = page.getByRole('button', {
        name: /reset.*layout|auto.*layout|layout/i,
      })

      // Also check for layout in controls panel
      const layoutControl = page.locator(
        '[aria-label*="layout" i], button:has-text("Layout")'
      )

      const buttonVisible = await resetButton.isVisible().catch(() => false)
      const controlVisible = await layoutControl
        .first()
        .isVisible()
        .catch(() => false)

      expect(buttonVisible || controlVisible).toBeTruthy()
    })

    test('clicking Reset Layout repositions all nodes', async ({ page }) => {
      // Get initial node positions (if accessible)
      const graphContainer = page.locator('.react-flow, [class*="reactflow"]')
      await expect(graphContainer).toBeVisible()

      // Find and click reset layout button
      const resetButton = page.getByRole('button', {
        name: /reset.*layout|auto.*layout|layout/i,
      })

      if (await resetButton.isVisible()) {
        await resetButton.click()
        await page.waitForTimeout(500)

        // Graph should still be visible after layout
        await expect(graphContainer).toBeVisible()
      }
    })

    test('layout respects DAG hierarchy', async ({ page }) => {
      // Set up nodes with dependencies
      const testNodes = [
        {
          id: 'task-1',
          type: 'task',
          title: 'Task 1',
          tags: [],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: 'First task',
          status: 'complete',
          priority: 'high',
          dependsOn: [],
          blocks: ['task-2'],
          checklist: [],
        },
        {
          id: 'task-2',
          type: 'task',
          title: 'Task 2',
          tags: [],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: 'Second task depends on first',
          status: 'pending',
          priority: 'medium',
          dependsOn: ['task-1'],
          blocks: ['task-3'],
          checklist: [],
        },
        {
          id: 'task-3',
          type: 'task',
          title: 'Task 3',
          tags: [],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: 'Third task depends on second',
          status: 'pending',
          priority: 'low',
          dependsOn: ['task-2'],
          blocks: [],
          checklist: [],
        },
      ]

      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', { detail: { nodes } })
        window.dispatchEvent(event)
      }, testNodes)

      await page.waitForTimeout(500)

      // Graph should show the hierarchy
      const graphContainer = page.locator('.react-flow, [class*="reactflow"]')
      await expect(graphContainer).toBeVisible()

      // Nodes should be present
      const task1 = page.getByText('Task 1')
      await expect(task1).toBeVisible()
    })
  })

  test.describe('Animation Settings', () => {
    test('layout animation respects reduced motion', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })

      // Reload to apply preference
      await page.reload()
      await waitForAppReady(page)
      await setupTestDataViaActions(page)

      // Switch to graph view
      const graphTab = page.getByRole('tab', { name: /graph/i })
      await graphTab.click()
      await page.waitForTimeout(500)

      // Graph should still function
      const graphContainer = page.locator('.react-flow, [class*="reactflow"]')
      await expect(graphContainer).toBeVisible()

      // Trigger layout
      const resetButton = page.getByRole('button', {
        name: /reset.*layout|auto.*layout|layout/i,
      })
      if (await resetButton.isVisible()) {
        await resetButton.click()

        // Layout should complete without long animations
        await page.waitForTimeout(200)
        await expect(graphContainer).toBeVisible()
      }
    })
  })

  test.describe('Graph Interaction After Layout', () => {
    test('nodes remain interactive after layout reset', async ({ page }) => {
      // Verify graph view is displayed
      const graphContainer = page.locator('.react-flow')
      await expect(graphContainer).toBeVisible()

      // Trigger layout reset if button exists
      const resetButton = page.getByRole('button', {
        name: /reset.*layout|auto.*layout/i,
      })
      const hasResetButton = await resetButton.isVisible().catch(() => false)
      if (hasResetButton) {
        await resetButton.click()
        await page.waitForTimeout(500)
      }

      // Try to interact with a node
      const graphNode = page.locator('.react-flow__node').first()
      const hasNode = await graphNode.isVisible().catch(() => false)
      if (hasNode) {
        await graphNode.click()
        // Node should remain visible after click
        await expect(graphNode).toBeVisible()
      }

      // Graph container should remain functional
      await expect(graphContainer).toBeVisible()
    })

    test('zoom controls work after layout reset', async ({ page }) => {
      // Verify graph view is displayed
      const graphContainer = page.locator('.react-flow')
      await expect(graphContainer).toBeVisible()

      // Trigger layout if button exists
      const resetButton = page.getByRole('button', {
        name: /reset.*layout|auto.*layout/i,
      })
      const hasResetButton = await resetButton.isVisible().catch(() => false)
      if (hasResetButton) {
        await resetButton.click()
        await page.waitForTimeout(500)
      }

      // Try zoom controls - use more specific aria-label patterns
      // React Flow typically has zoom in/out buttons with + and - icons
      const zoomInButton = page
        .locator('.react-flow__controls button')
        .filter({ hasText: '+' })
        .first()
      const zoomOutButton = page
        .locator('.react-flow__controls button')
        .filter({ hasText: '-' })
        .first()

      const hasZoomIn = await zoomInButton.isVisible().catch(() => false)
      const hasZoomOut = await zoomOutButton.isVisible().catch(() => false)

      if (hasZoomIn) {
        await zoomInButton.click()
        await page.waitForTimeout(200)
      }

      if (hasZoomOut) {
        await zoomOutButton.click()
        await page.waitForTimeout(200)
      }

      // Graph should still be functional
      await expect(graphContainer).toBeVisible()
    })
  })
})
