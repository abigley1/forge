/**
 * E2E Tests for Link Paste Auto-Import UI (Task 15.2)
 *
 * Tests the UI for pasting supplier links to auto-import component data.
 * The Import from Link feature is in the Component edit panel (ComponentFields).
 */

import { test, expect } from '@playwright/test'
import { waitForAppReady, setupTestDataViaActions } from './test-utils'

/**
 * Helper to select a component node and open its edit panel
 */
async function selectComponentNode(page: import('@playwright/test').Page) {
  // Click on a component node in the list (NEMA 17 Stepper Motor from test data)
  const componentNode = page.getByText('NEMA 17 Stepper Motor')
  await componentNode.click()
  await page.waitForTimeout(300)

  // Wait for the edit panel to appear (look for Supplier field which is component-specific)
  await page.waitForSelector('#component-supplier', {
    state: 'visible',
    timeout: 3000,
  })
}

/**
 * Helper to create a new component via Quick Create
 */
async function createNewComponent(page: import('@playwright/test').Page) {
  // Click the Component button in the Quick Create section
  const createButton = page.getByRole('button', {
    name: 'Create new Component',
  })
  await createButton.click()
  await page.waitForTimeout(300)

  // Wait for the component to be created and edit panel to appear
  await page.waitForSelector('text=/New Component/i', {
    state: 'visible',
    timeout: 3000,
  })
}

/**
 * Helper to select a task node (non-Component)
 */
async function selectTaskNode(page: import('@playwright/test').Page) {
  // Click on a task node in the list
  const taskNode = page.getByText('Research Motor Options')
  await taskNode.click()
  await page.waitForTimeout(300)

  // Wait for the edit panel to appear (look for Priority field which is task-specific)
  await page.waitForSelector('text=/Priority|Status/i', {
    state: 'visible',
    timeout: 3000,
  })
}

test.describe('Link Paste Auto-Import UI (15.2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  // ===========================================================================
  // Import from Link Button
  // ===========================================================================

  test.describe('Import from Link Button', () => {
    test('component edit panel shows "Import from Link" button', async ({
      page,
    }) => {
      await selectComponentNode(page)

      // Look for Import from Link button in the edit panel
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await expect(importButton).toBeVisible()
    })

    test('"Import from Link" button not shown for non-Component types', async ({
      page,
    }) => {
      await selectTaskNode(page)

      // Import from Link should not be visible for tasks
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await expect(importButton).not.toBeVisible()
    })

    test('clicking "Import from Link" shows URL input field', async ({
      page,
    }) => {
      await selectComponentNode(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // URL input should appear
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await expect(urlInput).toBeVisible()
    })
  })

  // ===========================================================================
  // URL Input and Validation
  // ===========================================================================

  test.describe('URL Input and Validation', () => {
    test('shows error for unsupported URL', async ({ page }) => {
      await selectComponentNode(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // Enter unsupported URL
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await urlInput.fill('https://www.randomsite.com/product/123')

      // Click import button
      const submitButton = page.getByRole('button', { name: /^import$/i })
      await submitButton.click()
      await page.waitForTimeout(300)

      // Should show error message
      const errorMessage = page.getByText(/unsupported/i)
      await expect(errorMessage).toBeVisible()
    })

    test('shows error for invalid URL format', async ({ page }) => {
      await selectComponentNode(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // Enter invalid URL
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await urlInput.fill('not-a-valid-url')

      // Click import button
      const submitButton = page.getByRole('button', { name: /^import$/i })
      await submitButton.click()
      await page.waitForTimeout(300)

      // Should show error message
      const errorMessage = page.getByText(/invalid/i)
      await expect(errorMessage).toBeVisible()
    })

    test('accepts valid Amazon URL and populates fields', async ({ page }) => {
      await createNewComponent(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // Enter valid Amazon URL
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await urlInput.fill('https://www.amazon.com/dp/B08N5WRWNW')

      // Click import button
      const submitButton = page.getByRole('button', { name: /^import$/i })
      await submitButton.click()
      await page.waitForTimeout(500)

      // Import form should close on success
      await expect(urlInput).not.toBeVisible()

      // Supplier field should be populated with "Amazon"
      const supplierInput = page.locator('#component-supplier')
      await expect(supplierInput).toHaveValue('Amazon')

      // Part number field should be populated with the ASIN
      const partNumberInput = page.locator('#component-part-number')
      await expect(partNumberInput).toHaveValue('B08N5WRWNW')
    })
  })

  // ===========================================================================
  // Cancel Flow
  // ===========================================================================

  test.describe('Cancel Flow', () => {
    test('X button hides import form', async ({ page }) => {
      await selectComponentNode(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // URL input should be visible
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await expect(urlInput).toBeVisible()

      // Click the X/cancel button
      const cancelButton = page.getByRole('button', { name: /cancel import/i })
      await cancelButton.click()
      await page.waitForTimeout(200)

      // URL input should be hidden, Import from Link button should be visible again
      await expect(urlInput).not.toBeVisible()
      await expect(importButton).toBeVisible()
    })
  })

  // ===========================================================================
  // Supported Suppliers Display
  // ===========================================================================

  test.describe('Supported Suppliers Display', () => {
    test('shows list of supported suppliers', async ({ page }) => {
      await selectComponentNode(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // Should show supported suppliers hint
      const suppliersHint = page.getByText(/supported.*amazon/i)
      await expect(suppliersHint).toBeVisible()
    })
  })

  // ===========================================================================
  // Keyboard Accessibility
  // ===========================================================================

  test.describe('Keyboard Accessibility', () => {
    test('Enter key in URL input triggers import', async ({ page }) => {
      await createNewComponent(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // Enter URL and press Enter
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await urlInput.fill('https://www.amazon.com/dp/B08N5WRWNW')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(500)

      // Import should complete and form should close
      await expect(urlInput).not.toBeVisible()

      // Supplier should be populated
      const supplierInput = page.locator('#component-supplier')
      await expect(supplierInput).toHaveValue('Amazon')
    })
  })

  // ===========================================================================
  // Multiple Suppliers
  // ===========================================================================

  test.describe('Multiple Suppliers', () => {
    test('accepts DigiKey URL', async ({ page }) => {
      await createNewComponent(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // Enter valid DigiKey URL
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await urlInput.fill(
        'https://www.digikey.com/en/products/detail/texas-instruments/LM7805CT-NOPB/3440'
      )

      // Click import button
      const submitButton = page.getByRole('button', { name: /^import$/i })
      await submitButton.click()
      await page.waitForTimeout(500)

      // Supplier should be DigiKey
      const supplierInput = page.locator('#component-supplier')
      await expect(supplierInput).toHaveValue('DigiKey')

      // Part number should be extracted
      const partNumberInput = page.locator('#component-part-number')
      await expect(partNumberInput).toHaveValue('LM7805CT-NOPB')
    })

    test('accepts Mouser URL', async ({ page }) => {
      await createNewComponent(page)

      // Click Import from Link
      const importButton = page.getByRole('button', {
        name: /import from link/i,
      })
      await importButton.click()
      await page.waitForTimeout(200)

      // Enter valid Mouser URL
      const urlInput = page.getByPlaceholder(/paste.*url/i)
      await urlInput.fill(
        'https://www.mouser.com/ProductDetail/Texas-Instruments/LM7805CT-NOPB'
      )

      // Click import button
      const submitButton = page.getByRole('button', { name: /^import$/i })
      await submitButton.click()
      await page.waitForTimeout(500)

      // Supplier should be Mouser
      const supplierInput = page.locator('#component-supplier')
      await expect(supplierInput).toHaveValue('Mouser')
    })
  })
})
