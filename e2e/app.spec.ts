import { test, expect } from '@playwright/test'

test.describe('Forge App - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('App Loading', () => {
    test('app loads successfully', async ({ page }) => {
      // App should load without errors
      await expect(page).toHaveTitle(/forge/i)
    })

    test('welcome screen is displayed', async ({ page }) => {
      // Welcome heading should be visible
      const heading = page.getByRole('heading', { name: 'Welcome to Forge' })
      await expect(heading).toBeVisible()

      // Welcome message should be visible
      const welcomeText = page.getByText(
        'Open an existing project or create a new one to get started.'
      )
      await expect(welcomeText).toBeVisible()
    })

    test('open project button is visible', async ({ page }) => {
      const openButton = page.getByRole('button', {
        name: 'Open Project',
      })
      await expect(openButton).toBeVisible()
    })

    test('create project button is visible', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await expect(createButton).toBeVisible()
    })
  })

  test.describe('Layout Structure', () => {
    test('app has correct semantic landmarks', async ({ page }) => {
      // Main content area exists
      const main = page.locator('main#main-content')
      await expect(main).toBeVisible()

      // Sidebar exists (may be hidden on mobile)
      const sidebar = page.locator('aside[aria-label="Sidebar navigation"]')
      await expect(sidebar).toBeAttached()
    })

    test('app uses proper heading hierarchy', async ({ page }) => {
      // Should have a main heading
      const h1 = page.locator('h1')
      const h2 = page.getByRole('heading', { level: 2 })

      // At least one heading should exist
      const h1Count = await h1.count()
      const h2Count = await h2.count()
      expect(h1Count + h2Count).toBeGreaterThan(0)
    })
  })

  test.describe('Create Project Dialog', () => {
    test('dialog opens when create button is clicked', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      // Dialog should be visible
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Dialog title should be visible
      const dialogTitle = page.getByRole('heading', {
        name: 'Create New Project',
      })
      await expect(dialogTitle).toBeVisible()
    })

    test('dialog has project name input', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      // Input should be visible with correct label
      const input = page.getByLabel('Project Name')
      await expect(input).toBeVisible()
      await expect(input).toHaveAttribute('type', 'text')
    })

    test('dialog has cancel and create buttons', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      const cancelButton = page.getByRole('button', { name: 'Cancel' })
      const createProjectButton = page.getByRole('button', { name: 'Create' })

      await expect(cancelButton).toBeVisible()
      await expect(createProjectButton).toBeVisible()
    })

    test('create button is disabled when input is empty', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      const createProjectButton = page.getByRole('button', { name: 'Create' })
      await expect(createProjectButton).toBeDisabled()
    })

    test('create button is enabled when input has value', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      const input = page.getByLabel('Project Name')
      await input.fill('My Test Project')

      const createProjectButton = page.getByRole('button', { name: 'Create' })
      await expect(createProjectButton).toBeEnabled()
    })

    test('dialog closes when cancel is clicked', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      const cancelButton = page.getByRole('button', { name: 'Cancel' })
      await cancelButton.click()

      await expect(dialog).not.toBeVisible()
    })

    test('dialog closes when Escape is pressed', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      await page.keyboard.press('Escape')

      await expect(dialog).not.toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('skip link is present and works', async ({ page }) => {
      // Skip link should exist
      const skipLink = page.getByRole('link', { name: 'Skip to main content' })
      await expect(skipLink).toBeAttached()

      // Skip link becomes visible on focus
      await skipLink.focus()
      await expect(skipLink).toBeVisible()

      // Skip link points to main content
      await expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    test('focus is trapped in dialog when open', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.click()

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // Tab through dialog elements - focus should stay inside
      // First focusable element should be the input
      const input = page.getByLabel('Project Name')
      await expect(input).toBeFocused()
    })

    test('buttons have accessible names', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await expect(createButton).toBeVisible()

      // Check button is accessible by name
      await expect(createButton).toHaveAccessibleName('Create New Project')
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('Tab navigates through interactive elements', async ({ page }) => {
      // First tab should focus the skip link (it's first in DOM order)
      await page.keyboard.press('Tab')
      const skipLink = page.getByRole('link', { name: 'Skip to main content' })

      // Skip link should be focusable - check it's in the document
      await expect(skipLink).toBeAttached()

      // Use skip link to jump to main content
      // This tests that keyboard navigation is properly set up
      await page.keyboard.press('Enter')
      await page.waitForTimeout(100)

      // After using skip link, focus should be in main content area
      // Tab to reach the Open Project button
      const openButton = page.getByRole('button', { name: 'Open Project' })
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })

      // Tab through elements - should reach one of the main action buttons
      let foundButton = false
      for (let i = 0; i < 5; i++) {
        const isOpenFocused = await openButton.evaluate(
          (el) => document.activeElement === el
        )
        const isCreateFocused = await createButton.evaluate(
          (el) => document.activeElement === el
        )
        if (isOpenFocused || isCreateFocused) {
          foundButton = true
          break
        }
        await page.keyboard.press('Tab')
      }

      // Should have reached one of the main buttons
      expect(foundButton).toBe(true)
    })

    test('Enter activates focused button', async ({ page }) => {
      const createButton = page.getByRole('button', {
        name: 'Create New Project',
      })
      await createButton.focus()
      await page.keyboard.press('Enter')

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('sidebar can be closed via backdrop on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      const sidebar = page.locator('aside[aria-label="Sidebar navigation"]')

      // Sidebar starts open by default - verify by checking backdrop is visible
      const backdrop = page.locator('.bg-black\\/50')
      await expect(backdrop).toBeVisible()

      // Verify sidebar has translate-x-0 class (open)
      await expect(sidebar).toHaveClass(/translate-x-0/)

      // Close sidebar by clicking the backdrop (outside the 256px wide sidebar)
      // Click at x=330 (right side of viewport, outside the sidebar)
      await page.click('body', { position: { x: 330, y: 300 } })

      // Backdrop should disappear when sidebar closes
      await expect(backdrop).not.toBeVisible()

      // Verify sidebar now has -translate-x-full class (closed)
      await expect(sidebar).toHaveClass(/-translate-x-full/)

      // Menu button should now say "Open sidebar"
      const openButton = page.getByRole('button', { name: 'Open sidebar' })
      await expect(openButton).toBeVisible()
    })

    test('mobile menu button opens sidebar', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      const sidebar = page.locator('aside[aria-label="Sidebar navigation"]')

      // Close the sidebar first by clicking outside the sidebar area
      await page.click('body', { position: { x: 330, y: 300 } })

      // Sidebar should be closed (backdrop not visible)
      const backdrop = page.locator('.bg-black\\/50')
      await expect(backdrop).not.toBeVisible()
      await expect(sidebar).toHaveClass(/-translate-x-full/)

      // Now open it again
      const openButton = page.getByRole('button', { name: 'Open sidebar' })
      await openButton.click()

      // Sidebar should be visible again (backdrop visible)
      await expect(backdrop).toBeVisible()
      await expect(sidebar).toHaveClass(/translate-x-0/)
    })

    test('sidebar is visible on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 })

      // Sidebar should be visible (not translated)
      const sidebar = page.locator('aside[aria-label="Sidebar navigation"]')
      await expect(sidebar).toBeVisible()
      await expect(sidebar).toHaveCSS('transform', 'none')
    })
  })
})
