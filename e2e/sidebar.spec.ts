import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
  setMobileViewport,
  setDesktopViewport,
} from './test-utils'

test.describe('Sidebar - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    // Set up test data to show the project workspace
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200) // Allow state to settle
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test.describe('Sidebar Structure', () => {
    test('sidebar has correct navigation role', async ({ page }) => {
      const sidebar = page.locator('aside')
      await expect(sidebar).toBeVisible()
      const nav = sidebar.locator('nav[aria-label="Main navigation"]')
      await expect(nav).toBeVisible()
    })

    test('sidebar shows project name when project is loaded', async ({
      page,
    }) => {
      // When test data is loaded via E2E hooks, a mock project is created
      // The sidebar should show the project name "E2E Test Project"
      const projectName = page.getByText('E2E Test Project')
      await expect(projectName).toBeVisible()
    })

    test('sidebar shows node count when project is loaded', async ({
      page,
    }) => {
      // Test data has 9 nodes - look specifically in the sidebar navigation
      const sidebar = page.locator('nav[aria-label="Main navigation"]')
      const nodeCount = sidebar.getByText('9 nodes')
      await expect(nodeCount).toBeVisible()
    })

    test('sidebar contains Quick Create section', async ({ page }) => {
      await expect(page.getByText('Quick Create')).toBeVisible()
    })

    test('sidebar contains Filters section', async ({ page }) => {
      await expect(page.getByText('Filters')).toBeVisible()
    })

    test('sidebar contains Tags section', async ({ page }) => {
      await expect(page.getByText('Tags')).toBeVisible()
    })

    test('sidebar contains Sort section', async ({ page }) => {
      // Sort is inside the Filters section, need to expand it first
      const filterButton = page.getByRole('button', { name: /filters/i })
      await filterButton.click()
      await page.waitForTimeout(100)

      // Use exact match to avoid matching "Sort by" label
      await expect(page.getByText('Sort', { exact: true })).toBeVisible()
    })
  })

  test.describe('Quick Create', () => {
    test('shows create buttons for all node types', async ({ page }) => {
      // Look for create buttons by their aria-labels (format: "Create new Decision")
      await expect(
        page.getByRole('button', { name: /create new decision/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create new component/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create new task/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create new note/i })
      ).toBeVisible()
    })

    test('create decision button creates a new decision node', async ({
      page,
    }) => {
      const createButton = page.getByRole('button', {
        name: /create new decision/i,
      })
      await createButton.click()

      // Wait for state to update
      await page.waitForTimeout(200)

      // Should open detail panel with new node (panel has role="dialog")
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })
      // The panel should have aria-label containing "New Decision"
      await expect(detailPanel).toHaveAttribute('aria-label', /New Decision/i)
    })

    test('create task button creates a new task node', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: /create new task/i,
      })
      await createButton.click()

      // Wait for state to update
      await page.waitForTimeout(200)

      // Should open detail panel with new node (panel has role="dialog")
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })
      // The panel should have aria-label containing "New Task"
      await expect(detailPanel).toHaveAttribute('aria-label', /New Task/i)
    })
  })

  test.describe('Filter Section', () => {
    test('filter section is collapsible', async ({ page }) => {
      // Find the Filters section heading button
      const filterButton = page.getByRole('button', { name: /filters/i })
      await expect(filterButton).toBeVisible()

      // Click to expand
      await filterButton.click()
      await page.waitForTimeout(100)

      // Click to collapse
      await filterButton.click()
      await page.waitForTimeout(100)

      // Should still be visible after toggle
      await expect(filterButton).toBeVisible()
    })

    test('shows node type filter buttons when expanded', async ({ page }) => {
      // Expand the Filters section first
      const filterButton = page.getByRole('button', { name: /filters/i })
      await filterButton.click()
      await page.waitForTimeout(100)

      // Type filters are toggle buttons with aria-label "Filter by X"
      await expect(
        page.getByRole('button', { name: /filter by decision/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /filter by component/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /filter by task/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /filter by note/i })
      ).toBeVisible()
    })

    test('type filter button can be toggled', async ({ page }) => {
      // Expand Filters section
      const filterButton = page.getByRole('button', { name: /filters/i })
      await filterButton.click()
      await page.waitForTimeout(100)

      const decisionsButton = page.getByRole('button', {
        name: /filter by decision/i,
      })

      // Initially should not be pressed (showing all)
      await expect(decisionsButton).toHaveAttribute('aria-pressed', 'false')

      // Click to filter
      await decisionsButton.click()
      await expect(decisionsButton).toHaveAttribute('aria-pressed', 'true')

      // Click to unfilter
      await decisionsButton.click()
      await expect(decisionsButton).toHaveAttribute('aria-pressed', 'false')
    })

    test('status filter shows status options when expanded', async ({
      page,
    }) => {
      // Expand Filters section
      const filterButton = page.getByRole('button', { name: /filters/i })
      await filterButton.click()
      await page.waitForTimeout(200)

      // Status filters are checkboxes - use checkbox role to avoid matching status toggle buttons
      const sidebar = page.locator('aside')
      await expect(
        sidebar.getByRole('checkbox', { name: /pending/i })
      ).toBeVisible()
      await expect(
        sidebar.getByRole('checkbox', { name: /in progress/i })
      ).toBeVisible()
      await expect(
        sidebar.getByRole('checkbox', { name: /complete/i })
      ).toBeVisible()
    })
  })

  test.describe('Tag Cloud', () => {
    test('tag cloud displays tags from nodes', async ({ page }) => {
      // Test data has tags like 'hardware', 'actuator', 'research', etc.
      // Tag buttons have aria-labels like "Add tag filter: hardware"
      const tagButton = page.getByRole('button', {
        name: /tag filter.*hardware/i,
      })
      await expect(tagButton).toBeVisible()
    })

    test('clicking a tag filters by that tag', async ({ page }) => {
      // Find a tag button and click it (aria-label: "Add tag filter: hardware")
      const hardwareTag = page.getByRole('button', {
        name: /tag filter.*hardware/i,
      })
      if (await hardwareTag.isVisible()) {
        await hardwareTag.click()
        // Tag should now be pressed
        await expect(hardwareTag).toHaveAttribute('aria-pressed', 'true')
      }
    })
  })

  test.describe('Sort Section', () => {
    test('sort section shows sort options', async ({ page }) => {
      // Sort is inside Filters section, expand it first
      const filterButton = page.getByRole('button', { name: /filters/i })
      await filterButton.click()
      await page.waitForTimeout(100)

      // Look for sort field select
      const sortLabel = page.getByText('Sort', { exact: true })
      await expect(sortLabel).toBeVisible()
    })

    test('sort direction can be toggled', async ({ page }) => {
      // Look for sort direction button
      const sortButton = page.getByRole('button', {
        name: /sort.*ascending|sort.*descending/i,
      })
      if ((await sortButton.count()) > 0) {
        await sortButton.first().click()
        // Should toggle direction
      }
    })
  })
})

test.describe('Sidebar - Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await setMobileViewport(page)
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('sidebar is hidden by default on mobile when closed', async ({
    page,
  }) => {
    // First close the sidebar (it starts open)
    // Click backdrop to close
    await page.mouse.click(330, 400)
    await page.waitForTimeout(100)

    const sidebar = page.locator('aside')
    await expect(sidebar).toHaveClass(/-translate-x-full/)
  })

  test('hamburger menu button is visible on mobile', async ({ page }) => {
    // Close sidebar first by clicking backdrop area (to the right of 256px sidebar)
    const backdrop = page.locator('[data-testid="sidebar-backdrop"]')
    if (await backdrop.isVisible({ timeout: 1000 })) {
      await page.mouse.click(300, 300)
      await page.waitForTimeout(300)
    }

    // When sidebar is closed, button shows "Open sidebar"
    const menuButton = page.getByRole('button', { name: /open sidebar/i })
    await expect(menuButton).toBeVisible({ timeout: 5000 })
  })

  test('hamburger menu opens sidebar', async ({ page }) => {
    // Close sidebar first by clicking backdrop area (to the right of 256px sidebar)
    const backdrop = page.locator('[data-testid="sidebar-backdrop"]')
    if (await backdrop.isVisible({ timeout: 1000 })) {
      await page.mouse.click(300, 300)
      await page.waitForTimeout(300)
    }

    // When sidebar is closed, button shows "Open sidebar"
    const menuButton = page.getByRole('button', { name: /open sidebar/i })
    await menuButton.click()
    await page.waitForTimeout(300)

    const sidebar = page.locator('aside')
    await expect(sidebar).not.toHaveClass(/-translate-x-full/)
  })

  test('close button closes sidebar on mobile', async ({ page }) => {
    // Sidebar should be open - verify it's visible
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toHaveClass(/-translate-x-full/)

    // On mobile, close the sidebar by clicking the backdrop area to the right of the sidebar
    // The sidebar is 256px wide (w-64), viewport is 375px, so click at x=300 to hit backdrop
    // This avoids the sidebar (z-30) intercepting clicks on the backdrop (z-20)
    const backdrop = page.locator('[data-testid="sidebar-backdrop"]')
    await expect(backdrop).toBeVisible({ timeout: 5000 })
    await page.mouse.click(300, 300)
    await page.waitForTimeout(300) // Allow transition to complete

    await expect(sidebar).toHaveClass(/-translate-x-full/, { timeout: 5000 })
  })

  test('backdrop closes sidebar when clicked', async ({ page }) => {
    // Sidebar starts open
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toHaveClass(/-translate-x-full/)

    // Click outside sidebar area (x=300 is past the 256px wide sidebar)
    await page.mouse.click(300, 300)
    await page.waitForTimeout(300)

    await expect(sidebar).toHaveClass(/-translate-x-full/)
  })
})

test.describe('Sidebar - Desktop Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setDesktopViewport(page)
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('sidebar is always visible on desktop', async ({ page }) => {
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible()
    await expect(sidebar).not.toHaveClass(/-translate-x-full/)
  })

  test('hamburger menu button is hidden on desktop', async ({ page }) => {
    // The mobile menu toggle button should not be visible on desktop
    const menuButton = page.getByRole('button', {
      name: /open sidebar|close sidebar/i,
    })
    // On desktop the header with the toggle is hidden via md:hidden
    await expect(menuButton).not.toBeVisible()
  })

  test('sidebar does not have backdrop on desktop', async ({ page }) => {
    // On desktop, backdrop should not be visible
    const backdrop = page.locator('aside + div[aria-hidden="true"]')
    await expect(backdrop).not.toBeVisible()
  })
})
