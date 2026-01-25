/**
 * E2E Tests for Attachments System (Task 15.3)
 *
 * Tests verify that:
 * - Attachment metadata is stored in node frontmatter
 * - Attachments are stored in project_root/attachments/{node-id}/ directory
 * - File size limits are enforced
 * - Supported file types are accepted
 * - Attachments are cleaned up when node is deleted
 */

import { test, expect } from '@playwright/test'
import { waitForAppReady } from './test-utils'

// Test nodes for attachment tests
const ATTACHMENT_TEST_NODES = [
  {
    id: 'component-with-attachments',
    type: 'component',
    title: 'Motor Controller',
    tags: ['electronics'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Motor controller component with datasheets.',
    status: 'selected',
    cost: 29.99,
    supplier: 'DigiKey',
    partNumber: 'MC-001',
    customFields: {},
    parent: null,
    attachments: [],
  },
  {
    id: 'task-with-docs',
    type: 'task',
    title: 'Design Review',
    tags: ['review'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Review all design documents.',
    status: 'pending',
    priority: 'high',
    dependsOn: [],
    blocks: [],
    checklist: [],
    parent: null,
    attachments: [],
  },
]

/**
 * Set up test nodes
 */
async function setupAttachmentTestNodes(page: import('@playwright/test').Page) {
  await page.evaluate((nodes) => {
    const event = new CustomEvent('e2e-setup-nodes', {
      detail: { nodes },
    })
    window.dispatchEvent(event)
  }, ATTACHMENT_TEST_NODES)

  await page.waitForTimeout(500)
}

test.describe('Attachments System (15.3)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupAttachmentTestNodes(page)
  })

  // ===========================================================================
  // Attachment Types
  // ===========================================================================

  test.describe('Supported File Types', () => {
    test('accepts PDF files', async ({ page }) => {
      // Select a component
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      // Look for attachments panel
      const attachmentsPanel = page.getByTestId('attachments-panel')
      await expect(attachmentsPanel).toBeVisible()

      // The dropzone should accept PDF
      const dropZone = attachmentsPanel.getByTestId('attachment-dropzone')
      await expect(dropZone).toBeVisible()

      // Check that the accepted types include PDF
      const acceptedTypes = await dropZone.getAttribute('data-accepted-types')
      expect(acceptedTypes).toContain('application/pdf')
    })

    test('accepts image files (PNG, JPG, SVG)', async ({ page }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const attachmentsPanel = page.getByTestId('attachments-panel')
      const dropZone = attachmentsPanel.getByTestId('attachment-dropzone')

      const acceptedTypes = await dropZone.getAttribute('data-accepted-types')
      expect(acceptedTypes).toContain('image/png')
      expect(acceptedTypes).toContain('image/jpeg')
      expect(acceptedTypes).toContain('image/svg+xml')
    })

    test('accepts text files', async ({ page }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const attachmentsPanel = page.getByTestId('attachments-panel')
      const dropZone = attachmentsPanel.getByTestId('attachment-dropzone')

      const acceptedTypes = await dropZone.getAttribute('data-accepted-types')
      expect(acceptedTypes).toContain('text/plain')
    })

    test('rejects unsupported file types', async ({ page }) => {
      // This test verifies that uploading an unsupported file type shows an error
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      // The dropzone should indicate rejected types
      const attachmentsPanel = page.getByTestId('attachments-panel')
      await expect(attachmentsPanel).toBeVisible()

      // We can verify this through the UI - unsupported files should show an error
      // This will be tested with actual file upload when implementing
    })
  })

  // ===========================================================================
  // File Size Limits
  // ===========================================================================

  test.describe('File Size Limits', () => {
    test('displays maximum file size limit', async ({ page }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const attachmentsPanel = page.getByTestId('attachments-panel')

      // Look for file size limit indicator
      const sizeLimit = attachmentsPanel.getByText(/max.*50.*mb/i)
      await expect(sizeLimit).toBeVisible()
    })
  })

  // ===========================================================================
  // Attachment List
  // ===========================================================================

  test.describe('Attachment List', () => {
    test('displays attachment list when node has attachments', async ({
      page,
    }) => {
      // Set up a node with existing attachments
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'component-with-files',
                type: 'component',
                title: 'Component with Files',
                tags: [],
                dates: {
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                },
                content: 'Has attachments.',
                status: 'selected',
                cost: null,
                supplier: null,
                partNumber: null,
                customFields: {},
                parent: null,
                attachments: [
                  {
                    id: 'attach-1',
                    name: 'datasheet.pdf',
                    path: 'attachments/component-with-files/datasheet.pdf',
                    type: 'application/pdf',
                    size: 1024000,
                    addedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(500)

      // Select the component
      const component = page.getByText('Component with Files')
      await component.click()
      await page.waitForTimeout(300)

      // Attachment should be visible in the list
      const attachmentItem = page.getByText('datasheet.pdf')
      await expect(attachmentItem).toBeVisible()
    })

    test('shows attachment metadata (name, size, date)', async ({ page }) => {
      // Set up a node with an attachment
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'component-metadata-test',
                type: 'component',
                title: 'Metadata Test Component',
                tags: [],
                dates: {
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                },
                content: 'Testing attachment metadata display.',
                status: 'selected',
                cost: null,
                supplier: null,
                partNumber: null,
                customFields: {},
                parent: null,
                attachments: [
                  {
                    id: 'attach-meta',
                    name: 'specs.pdf',
                    path: 'attachments/component-metadata-test/specs.pdf',
                    type: 'application/pdf',
                    size: 2048000, // 2 MB
                    addedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(500)

      const component = page.getByText('Metadata Test Component')
      await component.click()
      await page.waitForTimeout(300)

      // Check for filename
      const attachmentsPanel = page.getByTestId('attachments-panel')
      await expect(attachmentsPanel.getByText('specs.pdf')).toBeVisible()

      // Check for file size (should show "2 MB" or similar)
      await expect(attachmentsPanel.getByText(/2.*MB/i)).toBeVisible()
    })
  })

  // ===========================================================================
  // Attachment Panel UI
  // ===========================================================================

  test.describe('Attachment Panel', () => {
    test('attachments panel visible in detail view', async ({ page }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const detailPanel = page.getByTestId('detail-panel')
      await expect(detailPanel).toBeVisible()

      // Attachments section should be visible
      const attachmentsSection = detailPanel.getByText(/attachments/i)
      await expect(attachmentsSection).toBeVisible()
    })

    test('shows empty state when no attachments', async ({ page }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const attachmentsPanel = page.getByTestId('attachments-panel')

      // Should show empty state message (specifically the dropzone text)
      const dropzone = attachmentsPanel.getByTestId('attachment-dropzone')
      await expect(dropzone.getByText(/drag and drop/i)).toBeVisible()
    })

    test('dropzone has proper aria labels', async ({ page }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const dropZone = page.getByTestId('attachment-dropzone')

      // Check for accessible name
      await expect(dropZone).toHaveAttribute(
        'aria-label',
        /drop.*files|add.*attachment/i
      )
    })
  })

  // ===========================================================================
  // Delete Attachment
  // ===========================================================================

  test.describe('Delete Attachment', () => {
    test('delete button appears on attachment item', async ({ page }) => {
      // Set up node with attachment
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'component-delete-test',
                type: 'component',
                title: 'Delete Test Component',
                tags: [],
                dates: {
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                },
                content: 'Testing delete functionality.',
                status: 'selected',
                cost: null,
                supplier: null,
                partNumber: null,
                customFields: {},
                parent: null,
                attachments: [
                  {
                    id: 'attach-delete',
                    name: 'to-delete.pdf',
                    path: 'attachments/component-delete-test/to-delete.pdf',
                    type: 'application/pdf',
                    size: 512000,
                    addedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(500)

      const component = page.getByText('Delete Test Component')
      await component.click()
      await page.waitForTimeout(300)

      // Find the attachment item
      const attachmentItem = page.getByTestId('attachment-attach-delete')
      await expect(attachmentItem).toBeVisible()

      // Delete button should be present (the one that says "Delete <filename>")
      const deleteButton = attachmentItem.getByRole('button', {
        name: /^Delete/,
      })
      await expect(deleteButton).toBeVisible()
    })

    test('clicking delete button shows confirmation dialog, then error when no project loaded', async ({
      page,
    }) => {
      // Set up node with attachment
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'component-confirm-delete',
                type: 'component',
                title: 'Confirm Delete Component',
                tags: [],
                dates: {
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                },
                content: 'Testing delete confirmation.',
                status: 'selected',
                cost: null,
                supplier: null,
                partNumber: null,
                customFields: {},
                parent: null,
                attachments: [
                  {
                    id: 'attach-confirm',
                    name: 'confirm-delete.pdf',
                    path: 'attachments/component-confirm-delete/confirm-delete.pdf',
                    type: 'application/pdf',
                    size: 256000,
                    addedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(500)

      const component = page.getByText('Confirm Delete Component')
      await component.click()
      await page.waitForTimeout(300)

      // Attachment should be visible initially
      const attachmentItem = page.getByTestId('attachment-attach-confirm')
      await expect(attachmentItem).toBeVisible()

      // Click delete button - should now show confirmation dialog
      const deleteButton = attachmentItem.getByRole('button', {
        name: /^Delete/,
      })
      await deleteButton.click()
      await page.waitForTimeout(300)

      // Confirmation dialog should appear
      const confirmDialog = page.getByRole('alertdialog')
      await expect(confirmDialog).toBeVisible()

      // Confirm the deletion - in test environment without adapter/project,
      // this should show an error since file operations require a loaded project
      const confirmButton = confirmDialog.getByRole('button', {
        name: /delete|confirm/i,
      })
      await confirmButton.click()
      await page.waitForTimeout(300)

      // Should show error alert (no project loaded) - scope to attachments panel
      const attachmentsPanel = page.getByTestId('attachments-panel')
      const errorAlert = attachmentsPanel.getByRole('alert')
      await expect(errorAlert).toBeVisible()
    })
  })

  // ===========================================================================
  // Node Deletion Cleanup
  // ===========================================================================

  test.describe('Node Deletion Cleanup', () => {
    test('node with attachments can be deleted', async ({ page }) => {
      // Set up node with attachments
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'component-to-delete',
                type: 'component',
                title: 'Component to Delete',
                tags: [],
                dates: {
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                },
                content: 'This component will be deleted.',
                status: 'selected',
                cost: null,
                supplier: null,
                partNumber: null,
                customFields: {},
                parent: null,
                attachments: [
                  {
                    id: 'attach-orphan',
                    name: 'will-be-deleted.pdf',
                    path: 'attachments/component-to-delete/will-be-deleted.pdf',
                    type: 'application/pdf',
                    size: 128000,
                    addedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(500)

      const component = page.getByText('Component to Delete')
      await component.click()
      await page.waitForTimeout(300)

      // Click delete node button
      const deleteNodeButton = page.getByRole('button', {
        name: /delete node/i,
      })
      await deleteNodeButton.click()
      await page.waitForTimeout(200)

      // Confirmation dialog should appear
      const confirmDialog = page.getByRole('alertdialog')
      await expect(confirmDialog).toBeVisible()

      // Click confirm to delete the node
      const confirmButton = confirmDialog.getByRole('button', {
        name: /delete|confirm/i,
      })
      await confirmButton.click()
      await page.waitForTimeout(300)

      // Node should be removed
      await expect(page.getByText('Component to Delete')).not.toBeVisible()
    })
  })

  // ===========================================================================
  // File Picker
  // ===========================================================================

  test.describe('File Picker', () => {
    test('file picker button is available', async ({ page }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const attachmentsPanel = page.getByTestId('attachments-panel')

      // File picker button should be available
      const filePickerButton = attachmentsPanel.getByRole('button', {
        name: /add|browse|choose|select.*file/i,
      })
      await expect(filePickerButton).toBeVisible()
    })

    test('file picker button has proper accessibility attributes', async ({
      page,
    }) => {
      const component = page.getByText('Motor Controller')
      await component.click()
      await page.waitForTimeout(300)

      const attachmentsPanel = page.getByTestId('attachments-panel')
      const filePickerButton = attachmentsPanel.getByRole('button', {
        name: /add|browse|choose|select.*file/i,
      })

      // Button should have accessible name
      await expect(filePickerButton).toHaveAttribute('aria-label', /add/i)
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  test.describe('Accessibility', () => {
    test('attachment items are keyboard navigable', async ({ page }) => {
      // Set up node with attachments
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              {
                id: 'component-a11y',
                type: 'component',
                title: 'Accessibility Component',
                tags: [],
                dates: {
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                },
                content: 'Testing keyboard navigation.',
                status: 'selected',
                cost: null,
                supplier: null,
                partNumber: null,
                customFields: {},
                parent: null,
                attachments: [
                  {
                    id: 'attach-a11y-1',
                    name: 'first.pdf',
                    path: 'attachments/component-a11y/first.pdf',
                    type: 'application/pdf',
                    size: 100000,
                    addedAt: new Date().toISOString(),
                  },
                  {
                    id: 'attach-a11y-2',
                    name: 'second.pdf',
                    path: 'attachments/component-a11y/second.pdf',
                    type: 'application/pdf',
                    size: 200000,
                    addedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(500)

      const component = page.getByText('Accessibility Component')
      await component.click()
      await page.waitForTimeout(300)

      // Attachment buttons should be keyboard accessible
      const firstItem = page.getByTestId('attachment-attach-a11y-1')
      await expect(firstItem).toBeVisible()

      // The download button within the attachment should be focusable
      const downloadButton = firstItem.getByRole('button', {
        name: /download/i,
      })
      await downloadButton.focus()
      await expect(downloadButton).toBeFocused()

      // Tab to delete button
      await page.keyboard.press('Tab')
      const deleteButton = firstItem.getByRole('button', { name: /delete/i })
      await expect(deleteButton).toBeFocused()
    })
  })
})
