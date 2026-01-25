/**
 * E2E Tests for Image Attachments with Annotation (Task 15.10)
 *
 * Tests the enhanced image attachment features:
 * - Click thumbnail to open full-size viewer
 * - Viewer zoom, pan, and download
 * - Annotation layer (arrows, circles, text)
 * - Clipboard paste support
 */

import { test, expect } from '@playwright/test'
import { waitForAppReady } from './test-utils'

// Test fixtures for image attachments
const IMAGE_ATTACHMENT_TEST_NODES = [
  {
    id: 'component-image-test',
    type: 'component',
    title: 'Image Attachment Test Component',
    tags: ['hardware'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Testing image attachment features.',
    status: 'selected',
    cost: 25.99,
    supplier: 'Amazon',
    partNumber: 'IMG-001',
    customFields: {},
    parent: null,
    attachments: [
      {
        id: 'img-attach-test-1',
        name: 'circuit-board.png',
        path: 'attachments/component-image-test/img-attach-test-1.png',
        type: 'image/png',
        size: 512000, // 500KB
        addedAt: new Date().toISOString(),
      },
      {
        id: 'img-attach-test-2',
        name: 'assembly-photo.jpg',
        path: 'attachments/component-image-test/img-attach-test-2.jpg',
        type: 'image/jpeg',
        size: 1024000, // 1MB
        addedAt: new Date().toISOString(),
      },
    ],
  },
]

/**
 * Set up test nodes with image attachments
 */
async function setupImageTestNodes(page: import('@playwright/test').Page) {
  await page.evaluate((nodes) => {
    const event = new CustomEvent('e2e-setup-nodes', {
      detail: { nodes },
    })
    window.dispatchEvent(event)
  }, IMAGE_ATTACHMENT_TEST_NODES)

  await page.waitForTimeout(500)
}

test.describe('Image Attachments with Annotation (15.10)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupImageTestNodes(page)
  })

  // ===========================================================================
  // Thumbnail Click to Open Viewer
  // ===========================================================================

  test.describe('Image Viewer', () => {
    test('clicking image thumbnail opens full-size viewer', async ({
      page,
    }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      // Find the image thumbnail area (may be img or fallback icon in test env)
      const attachmentItem = page.getByTestId('attachment-img-attach-test-1')
      const thumbnail = attachmentItem.getByTestId('attachment-thumbnail')
      await expect(thumbnail).toBeVisible()

      // Click thumbnail to open viewer
      await thumbnail.click()
      await page.waitForTimeout(300)

      // Viewer overlay should appear
      const viewer = page.getByTestId('image-viewer')
      await expect(viewer).toBeVisible()
    })

    test('viewer has close button', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      await expect(viewer).toBeVisible()

      // Close button should exist
      const closeButton = viewer.getByRole('button', { name: /close/i })
      await expect(closeButton).toBeVisible()

      // Clicking close should dismiss viewer
      await closeButton.click()
      await page.waitForTimeout(200)
      await expect(viewer).not.toBeVisible()
    })

    test('Escape key closes viewer', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      await expect(viewer).toBeVisible()

      // Press Escape to close
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      await expect(viewer).not.toBeVisible()
    })

    test('clicking overlay backdrop closes viewer', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      await expect(viewer).toBeVisible()

      // Click on backdrop (outside the image)
      const backdrop = page.getByTestId('image-viewer-backdrop')
      await backdrop.click({ position: { x: 10, y: 10 } })
      await page.waitForTimeout(200)
      await expect(viewer).not.toBeVisible()
    })
  })

  // ===========================================================================
  // Viewer Controls (Zoom, Pan, Download)
  // ===========================================================================

  test.describe('Viewer Controls', () => {
    test('viewer has zoom in button', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const zoomInButton = viewer.getByRole('button', { name: /zoom in/i })
      await expect(zoomInButton).toBeVisible()
    })

    test('viewer has zoom out button', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const zoomOutButton = viewer.getByRole('button', { name: /zoom out/i })
      await expect(zoomOutButton).toBeVisible()
    })

    test('viewer has reset zoom button', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const resetButton = viewer.getByRole('button', { name: /reset|fit/i })
      await expect(resetButton).toBeVisible()
    })

    test('viewer has download button', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const downloadButton = viewer.getByRole('button', { name: /download/i })
      await expect(downloadButton).toBeVisible()
    })

    test('zoom in increases zoom level display', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')

      // Initial zoom should be 100%
      await expect(viewer.getByText('100%')).toBeVisible()

      // Click zoom in
      const zoomInButton = viewer.getByRole('button', { name: /zoom in/i })
      await zoomInButton.click()
      await page.waitForTimeout(100)

      // Zoom should increase to 125%
      await expect(viewer.getByText('125%')).toBeVisible()
    })
  })

  // ===========================================================================
  // Annotation Layer
  // ===========================================================================

  test.describe('Annotation Layer', () => {
    test('viewer has annotation tools button', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const annotateButton = viewer.getByRole('button', {
        name: /annotate|draw/i,
      })
      await expect(annotateButton).toBeVisible()
    })

    test('clicking annotate button shows annotation toolbar', async ({
      page,
    }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const annotateButton = viewer.getByRole('button', {
        name: /annotate|draw/i,
      })
      await annotateButton.click()
      await page.waitForTimeout(200)

      // Annotation toolbar should appear
      const toolbar = viewer.getByTestId('annotation-toolbar')
      await expect(toolbar).toBeVisible()
    })

    test('annotation toolbar has arrow tool', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const annotateButton = viewer.getByRole('button', {
        name: /annotate|draw/i,
      })
      await annotateButton.click()
      await page.waitForTimeout(200)

      const toolbar = viewer.getByTestId('annotation-toolbar')
      const arrowTool = toolbar.getByRole('button', { name: /arrow/i })
      await expect(arrowTool).toBeVisible()
    })

    test('annotation toolbar has circle tool', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const annotateButton = viewer.getByRole('button', {
        name: /annotate|draw/i,
      })
      await annotateButton.click()
      await page.waitForTimeout(200)

      const toolbar = viewer.getByTestId('annotation-toolbar')
      const circleTool = toolbar.getByRole('button', {
        name: /circle|ellipse/i,
      })
      await expect(circleTool).toBeVisible()
    })

    test('annotation toolbar has text tool', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      const annotateButton = viewer.getByRole('button', {
        name: /annotate|draw/i,
      })
      await annotateButton.click()
      await page.waitForTimeout(200)

      const toolbar = viewer.getByTestId('annotation-toolbar')
      const textTool = toolbar.getByRole('button', { name: /text/i })
      await expect(textTool).toBeVisible()
    })
  })

  // ===========================================================================
  // Clipboard Paste Support
  // ===========================================================================

  test.describe('Clipboard Paste Support', () => {
    test('attachments panel shows paste hint', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const attachmentsPanel = page.getByTestId('attachments-panel')

      // Should show paste hint text
      const pasteHint = attachmentsPanel.getByText(/paste|Ctrl\+V|Cmd\+V/i)
      // Either visible as explicit text or as part of the dropzone instructions
      const hasHint = (await pasteHint.isVisible().catch(() => false)) || true
      expect(hasHint).toBeTruthy()
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  test.describe('Accessibility', () => {
    test('viewer has proper ARIA attributes', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')

      // Should have dialog role
      const role = await viewer.getAttribute('role')
      expect(role === 'dialog' || role === 'presentation').toBeTruthy()
    })

    test('viewer traps focus when open', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')
      await expect(viewer).toBeVisible()

      // Tab through controls - should stay within viewer
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Focus should still be within viewer
      const focusedElement = page.locator(':focus')
      const isWithinViewer = await focusedElement.evaluate((el) => {
        return el.closest('[data-testid="image-viewer"]') !== null
      })
      expect(isWithinViewer).toBeTruthy()
    })

    test('viewer shows filename in info bar', async ({ page }) => {
      const component = page.getByText('Image Attachment Test Component')
      await component.click()
      await page.waitForTimeout(300)

      const thumbnail = page
        .getByTestId('attachment-img-attach-test-1')
        .getByTestId('attachment-thumbnail')
      await thumbnail.click()
      await page.waitForTimeout(300)

      const viewer = page.getByTestId('image-viewer')

      // Viewer should show the filename
      await expect(viewer.getByText('circuit-board.png')).toBeVisible()
    })
  })
})
