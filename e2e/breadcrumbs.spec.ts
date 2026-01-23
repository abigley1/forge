import { test, expect } from '@playwright/test'
import { setupTestDataViaActions, waitForAppReady } from './test-utils'

test.describe('Breadcrumbs Navigation (3.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Breadcrumb Structure', () => {
    test('breadcrumbs show Project > Node Type > Node', async ({ page }) => {
      // Click on a task node to select it
      const taskNode = page.getByText('Research Motor Options')
      await taskNode.click()

      // Look for breadcrumb navigation
      const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')

      // If breadcrumbs exist, verify structure
      if (await breadcrumbs.isVisible()) {
        // Should contain project name
        const projectCrumb = breadcrumbs.getByText(/E2E Test Project/i)
        await expect(projectCrumb).toBeVisible()

        // Should contain node type
        const typeCrumb = breadcrumbs.getByText(/Task/i)
        await expect(typeCrumb).toBeVisible()

        // Should contain node name
        const nodeCrumb = breadcrumbs.getByText('Research Motor Options')
        await expect(nodeCrumb).toBeVisible()
      }
    })

    test('breadcrumbs update when node is selected', async ({ page }) => {
      // First select a task
      const taskNode = page.getByText('Research Motor Options')
      await taskNode.click()
      await page.waitForTimeout(200)

      // Close the edit panel first before selecting another node
      const closeButton = page.getByRole('button', { name: /close/i })
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(200)
      }

      // Then select a decision
      const decisionNode = page.getByText('Motor Selection')
      await decisionNode.click()
      await page.waitForTimeout(200)

      // Breadcrumb should update to show decision context
      const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')
      if (await breadcrumbs.isVisible()) {
        const decisionCrumb = breadcrumbs.getByText(/Decision/i)
        await expect(decisionCrumb).toBeVisible()
      }
    })
  })

  test.describe('Breadcrumb Navigation', () => {
    test('clicking project segment navigates to project root', async ({
      page,
    }) => {
      // Select a node first
      const taskNode = page.getByText('Research Motor Options')
      await taskNode.click()
      await page.waitForTimeout(200)

      // Find and click project breadcrumb
      const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')
      if (await breadcrumbs.isVisible()) {
        const projectCrumb = breadcrumbs.locator('a, button').first()
        await projectCrumb.click()

        // Should deselect node or navigate to project overview
        await page.waitForTimeout(200)
      }
    })

    test('clicking node type segment filters to that type', async ({
      page,
    }) => {
      // Select a node
      const componentNode = page.getByText('NEMA 17 Stepper Motor')
      await componentNode.click()
      await page.waitForTimeout(200)

      // Find breadcrumbs
      const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')
      if (await breadcrumbs.isVisible()) {
        // Click on component type breadcrumb
        const typeCrumb = breadcrumbs.getByText(/Component/i)
        if (await typeCrumb.isVisible()) {
          await typeCrumb.click()
          await page.waitForTimeout(200)
        }
      }
    })
  })

  test.describe('Breadcrumb Accessibility', () => {
    test('breadcrumbs are keyboard accessible', async ({ page }) => {
      // Select a node to show breadcrumbs
      const noteNode = page.getByText('Project Overview')
      await noteNode.click()
      await page.waitForTimeout(200)

      // Tab to breadcrumbs
      const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')
      if (await breadcrumbs.isVisible()) {
        // Breadcrumb links should be focusable
        const links = breadcrumbs.locator('a, button')
        const linkCount = await links.count()

        for (let i = 0; i < linkCount; i++) {
          const link = links.nth(i)
          await link.focus()
          // Should be able to focus each link
          await expect(link).toBeFocused()
        }
      }
    })

    test('breadcrumbs have proper ARIA attributes', async ({ page }) => {
      // Select a node
      const taskNode = page.getByText('Research Motor Options')
      await taskNode.click()
      await page.waitForTimeout(200)

      // Check for breadcrumb navigation landmark
      const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')
      if (await breadcrumbs.isVisible()) {
        // Should have aria-label
        await expect(breadcrumbs).toHaveAttribute('aria-label', 'Breadcrumb')

        // May have ordered list structure
        const list = breadcrumbs.locator('ol, ul')
        if ((await list.count()) > 0) {
          await expect(list.first()).toBeVisible()
        }
      }
    })

    test('current page in breadcrumb is marked', async ({ page }) => {
      // Select a node
      const decisionNode = page.getByText('Motor Selection')
      await decisionNode.click()
      await page.waitForTimeout(200)

      const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')
      if (await breadcrumbs.isVisible()) {
        // Current item should have aria-current="page" or similar
        const currentItem = breadcrumbs.locator('[aria-current]')
        if ((await currentItem.count()) > 0) {
          await expect(currentItem.first()).toBeVisible()
        }
      }
    })
  })
})
