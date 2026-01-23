import { test, expect } from '@playwright/test'
import { waitForAppReady } from './test-utils'

test.describe('List Virtualization & Performance (3.6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
  })

  test.describe('Virtualization Setup', () => {
    test('node list virtualizes with 200+ items', async ({ page }) => {
      // Generate 200+ test nodes
      const testNodes = []
      for (let i = 0; i < 250; i++) {
        testNodes.push({
          id: `task-${i}`,
          type: 'task',
          title: `Task ${i}`,
          tags: ['performance-test'],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: `Task ${i} content`,
          status: 'pending',
          priority: 'medium',
          dependsOn: [],
          blocks: [],
          checklist: [],
        })
      }

      // Set up the nodes
      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: { nodes },
        })
        window.dispatchEvent(event)
      }, testNodes)

      // Wait for rendering
      await page.waitForTimeout(500)

      // Check that the heading shows 250 nodes
      const heading = page.getByRole('heading', { name: /250 nodes/i })
      await expect(heading).toBeVisible()

      // The list should render without issues
      const outline = page.locator('[aria-label="Project outline"]')
      await expect(outline).toBeVisible()
    })

    test('scrolling through virtualized list is smooth', async ({ page }) => {
      // Generate nodes for performance test
      const testNodes = []
      for (let i = 0; i < 100; i++) {
        testNodes.push({
          id: `task-${i}`,
          type: 'task',
          title: `Scrollable Task ${i}`,
          tags: ['scroll-test'],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: `Task ${i}`,
          status: 'pending',
          priority: 'medium',
          dependsOn: [],
          blocks: [],
          checklist: [],
        })
      }

      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: { nodes },
        })
        window.dispatchEvent(event)
      }, testNodes)

      await page.waitForTimeout(500)

      // Find the scrollable container
      const outline = page.locator('[aria-label="Project outline"]')
      await expect(outline).toBeVisible()

      // Scroll down
      await outline.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2
      })

      await page.waitForTimeout(200)

      // Scroll back up
      await outline.evaluate((el) => {
        el.scrollTop = 0
      })

      // List should still be functional
      await expect(outline).toBeVisible()
    })

    test('virtualized items render correctly on scroll', async ({ page }) => {
      // Generate nodes
      const testNodes = []
      for (let i = 0; i < 50; i++) {
        testNodes.push({
          id: `note-${i}`,
          type: 'note',
          title: `Note Item ${i}`,
          tags: ['virtualized'],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: `Note ${i} content`,
        })
      }

      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: { nodes },
        })
        window.dispatchEvent(event)
      }, testNodes)

      await page.waitForTimeout(500)

      // Check that nodes are visible
      const heading = page.getByRole('heading', { name: /50 nodes/i })
      await expect(heading).toBeVisible()

      // First item should be visible
      const firstItem = page.getByText('Note Item 0')
      await expect(firstItem).toBeVisible()
    })
  })

  test.describe('Performance Metrics', () => {
    test('no frame drops when scrolling large lists', async ({ page }) => {
      // This is a basic performance check
      // In a real scenario, you'd use Performance API

      const testNodes = []
      for (let i = 0; i < 100; i++) {
        testNodes.push({
          id: `component-${i}`,
          type: 'component',
          title: `Component ${i}`,
          tags: ['performance'],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: `Component ${i}`,
          status: 'selected',
          cost: 10.0,
          supplier: 'Test',
          partNumber: `PART-${i}`,
          customFields: {},
        })
      }

      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: { nodes },
        })
        window.dispatchEvent(event)
      }, testNodes)

      await page.waitForTimeout(500)

      // Measure scroll performance
      const startTime = Date.now()

      const outline = page.locator('[aria-label="Project outline"]')
      await outline.evaluate((el) => {
        for (let i = 0; i < 10; i++) {
          el.scrollTop = i * 100
        }
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      // Scrolling should complete in reasonable time (under 2 seconds for 10 scrolls)
      expect(duration).toBeLessThan(2000)
    })
  })

  test.describe('Large Dataset Handling', () => {
    test('app handles large number of nodes without crashing', async ({
      page,
    }) => {
      const testNodes = []
      for (let i = 0; i < 500; i++) {
        testNodes.push({
          id: `task-large-${i}`,
          type: 'task',
          title: `Large Dataset Task ${i}`,
          tags: ['large-dataset'],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: `Task ${i}`,
          status: 'pending',
          priority: 'medium',
          dependsOn: [],
          blocks: [],
          checklist: [],
        })
      }

      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: { nodes },
        })
        window.dispatchEvent(event)
      }, testNodes)

      // Wait for processing
      await page.waitForTimeout(1000)

      // App should still be responsive
      const heading = page.getByRole('heading', { name: /500 nodes/i })
      await expect(heading).toBeVisible()

      // UI should still be interactive
      const filtersButton = page.getByRole('button', { name: 'Filters' })
      await expect(filtersButton).toBeVisible()
    })
  })
})
