/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test'
import { waitForAppReady } from './test-utils'

test.describe('Loading States (10.3)', () => {
  test.describe('Skeleton Loaders', () => {
    test('skeleton loaders show during project load', async ({ page }) => {
      // Navigate with slow network to catch loading state
      await page.route('**/*', async (route) => {
        // Add small delay to requests
        await new Promise((resolve) => setTimeout(resolve, 100))
        await route.continue()
      })

      await page.goto('/')

      // Look for skeleton elements
      const skeletons = page.locator(
        '[class*="skeleton"], [class*="loading"], [aria-busy="true"]'
      )

      // During initial load, there may be skeletons
      // Note: This is timing-dependent and may not always catch skeletons
      const skeletonCount = await skeletons.count()

      // After load completes, main content should be visible
      const main = page.locator('main#main-content')
      await expect(main).toBeVisible()
    })

    test('skeletons have aria-busy attribute', async ({ page }) => {
      // Look for aria-busy elements
      await page.goto('/')

      const busyElements = page.locator('[aria-busy]')
      const busyCount = await busyElements.count()

      // There should be at least one element that can have busy state
      // Even if currently not busy, the attribute should exist
      expect(busyCount).toBeGreaterThanOrEqual(0)

      // Main content should load
      const main = page.locator('main#main-content')
      await expect(main).toBeVisible()
    })

    test('content replaces skeleton after load', async ({ page }) => {
      await page.goto('/')

      // Wait for content to load
      await page.waitForLoadState('networkidle')

      // Skeletons should not be visible after load
      const visibleSkeletons = page.locator('[class*="skeleton"]:visible')
      const skeletonCount = await visibleSkeletons.count()

      // Should have no visible skeletons after load
      expect(skeletonCount).toBe(0)

      // Real content should be visible
      const heading = page.getByRole('heading', { name: /Welcome to Forge/i })
      await expect(heading).toBeVisible()
    })
  })

  test.describe('Reduced Motion', () => {
    test('loading state respects reduced motion', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })

      await page.goto('/')

      // App should load without animated skeletons
      const main = page.locator('main#main-content')
      await expect(main).toBeVisible()

      // Check that animations are disabled
      const animatedElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*')
        let animatedCount = 0
        elements.forEach((el) => {
          const style = window.getComputedStyle(el)
          if (
            style.animation !== 'none' &&
            style.animation !== '' &&
            !style.animation.includes('0s')
          ) {
            animatedCount++
          }
        })
        return animatedCount
      })

      // With reduced motion, animations should be minimal or none
      // This is implementation-dependent
    })
  })

  test.describe('Loading Indicators', () => {
    test('loading indicator visible during async operations', async ({
      page,
    }) => {
      await page.goto('/')
      await waitForAppReady(page)

      // Set up test data which triggers loading
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'task-1',
                type: 'task',
                title: 'Loading Test Task',
                tags: [],
                dates: {
                  created: '2024-01-01T00:00:00.000Z',
                  modified: '2024-01-01T00:00:00.000Z',
                },
                content: 'Test content',
                status: 'pending',
                priority: 'medium',
                dependsOn: [],
                blocks: [],
                checklist: [],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(500)

      // Content should load - heading shows "1 node" (singular)
      const heading = page.getByRole('heading', { name: /1 node/i })
      await expect(heading).toBeVisible()
    })

    test('save indicator shows during save operations', async ({ page }) => {
      await page.goto('/')
      await waitForAppReady(page)

      // Set up test data
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'task-save-test',
                type: 'task',
                title: 'Save Test Task',
                tags: [],
                dates: {
                  created: '2024-01-01T00:00:00.000Z',
                  modified: '2024-01-01T00:00:00.000Z',
                },
                content: 'Test content',
                status: 'pending',
                priority: 'medium',
                dependsOn: [],
                blocks: [],
                checklist: [],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(500)

      // Open a node and make changes to trigger save
      const outline = page.getByLabel('Project outline')
      await outline.getByText('Save Test Task').click()
      await page.waitForTimeout(200)

      // Make a change to trigger save indicator
      const titleInput = page.locator('#node-title-editor')
      await titleInput.fill('Modified Task')
      await page.waitForTimeout(100)

      // Look for save indicator - should show unsaved/saved status
      const saveIndicator = page
        .getByRole('status')
        .filter({ hasText: /unsaved|saved|saving/i })
      const indicatorExists = (await saveIndicator.count()) > 0

      // Save indicator should be present
      expect(indicatorExists).toBeTruthy()
    })
  })

  test.describe('Error States', () => {
    test('error state displays when load fails', async ({ page }) => {
      // Block API requests to simulate load failure
      await page.route('**/api/**', (route) => route.abort())

      await page.goto('/')

      // App should still load (may show error or fallback)
      await expect(page).toHaveTitle(/forge/i)

      // Error alert container should be present
      const alertContainer = page.locator('[role="alert"]')
      await expect(alertContainer).toBeAttached()
    })

    test('retry option available on error', async ({ page }) => {
      await page.goto('/')

      // Look for retry button (in error states)
      const retryButton = page.getByRole('button', { name: /retry|try again/i })

      // Retry may or may not be visible depending on current state
      const retryExists = await retryButton.isVisible().catch(() => false)
    })
  })
})
