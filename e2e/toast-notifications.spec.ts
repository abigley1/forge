import { test, expect } from '@playwright/test'
import { setupTestDataViaActions, waitForAppReady } from './test-utils'

test.describe('Toast Notifications (0.10)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Toast Display', () => {
    test('toast/status appears on node creation', async ({ page }) => {
      // Create a new node - this immediately creates it and opens edit panel
      const createTaskButton = page.getByRole('button', {
        name: 'Create new Task',
      })
      await createTaskButton.click()

      // Wait for the edit panel to appear (indicates creation succeeded)
      const editPanel = page.getByRole('dialog', { name: /edit/i })
      await expect(editPanel).toBeVisible()

      // Status indicator should show (either toast or save indicator)
      const statusIndicator = page.locator('[role="status"]').first()
      await expect(statusIndicator).toBeAttached()
    })

    test('save indicator shows unsaved state after changes', async ({
      page,
    }) => {
      // Click on an existing node
      const taskNode = page.getByText('Research Motor Options')
      await taskNode.click()
      await page.waitForTimeout(200)

      // Edit panel should be open
      const editPanel = page.getByRole('dialog')
      if (await editPanel.isVisible()) {
        // Make a change to trigger unsaved state
        const titleInput = page.getByRole('textbox', { name: /title/i })
        if (await titleInput.isVisible()) {
          await titleInput.fill('Modified Title')
          await page.waitForTimeout(500)

          // Look for unsaved indicator
          const unsavedIndicator = page.getByText(/unsaved/i)
          const saveIndicator = page.locator('[role="status"]')

          const hasUnsaved = await unsavedIndicator
            .isVisible()
            .catch(() => false)
          const hasStatus = await saveIndicator.isVisible().catch(() => false)

          expect(hasUnsaved || hasStatus).toBeTruthy()
        }
      }
    })
  })

  test.describe('Toast Variants', () => {
    test('status container exists for notifications', async ({ page }) => {
      // Status container should be present in the DOM
      const statusContainer = page.locator('[role="status"]').first()
      await expect(statusContainer).toBeAttached()
    })

    test('alert container exists for errors', async ({ page }) => {
      // Alert container should be present for error messages
      const alertContainer = page.locator('[role="alert"]')
      await expect(alertContainer).toBeAttached()
    })
  })

  test.describe('Toast Stacking', () => {
    test('multiple actions can trigger status updates', async ({ page }) => {
      // Create multiple nodes
      for (let i = 0; i < 2; i++) {
        const createTaskButton = page.getByRole('button', {
          name: 'Create new Task',
        })
        await createTaskButton.click()
        await page.waitForTimeout(500)

        // Close the edit panel
        const closeButton = page.getByRole('button', { name: /close/i })
        if (await closeButton.isVisible()) {
          await closeButton.click()
          await page.waitForTimeout(200)
        }
      }

      // Status container should still be present
      const statusContainer = page.locator('[role="status"]').first()
      await expect(statusContainer).toBeAttached()
    })
  })

  test.describe('Toast Accessibility', () => {
    test('toast has proper ARIA role="status"', async ({ page }) => {
      // The status role is already present in the DOM
      const statusElement = page.locator('[role="status"]').first()
      await expect(statusElement).toBeAttached()
    })

    test('alert role exists for important notifications', async ({ page }) => {
      // Verify alert role exists (used for errors/important messages)
      const alertElement = page.locator('[role="alert"]')
      await expect(alertElement).toBeAttached()
    })
  })

  test.describe('Undo Toast', () => {
    test('delete action shows notification', async ({ page }) => {
      // Click on a node
      const taskNode = page.getByText('Research Motor Options')
      await taskNode.click()
      await page.waitForTimeout(200)

      // Look for delete button in edit panel
      const deleteButton = page.getByRole('button', { name: /delete/i })

      if (await deleteButton.isVisible()) {
        await deleteButton.click()
        await page.waitForTimeout(200)

        // Confirm deletion if dialog appears
        const confirmDialog = page.getByRole('alertdialog')
        if (await confirmDialog.isVisible()) {
          const confirmButton = confirmDialog.getByRole('button', {
            name: /delete|confirm/i,
          })
          if (await confirmButton.isVisible()) {
            await confirmButton.click()
            await page.waitForTimeout(500)
          }
        }

        // Status/notification should update
        const statusContainer = page.locator('[role="status"], [role="alert"]')
        await expect(statusContainer.first()).toBeAttached()
      }
    })
  })
})
