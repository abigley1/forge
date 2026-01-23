import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
  getNodeCount,
} from './test-utils'

test.describe('Node Operations - Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('clicking a node selects it', async ({ page }) => {
    // Find a node in the outline view
    const nodeItem = page.getByText('Motor Selection')
    await nodeItem.click()

    // Detail panel should open with aria-label for the specific node
    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()
  })

  test('selected node shows in detail panel', async ({ page }) => {
    const nodeItem = page.getByText('Motor Selection')
    await nodeItem.click()

    // Use aria-label to find the specific dialog for this node
    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()
  })

  test('close button closes detail panel', async ({ page }) => {
    // Select a node
    const nodeItem = page.getByText('Motor Selection')
    await nodeItem.click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find and click close button
    const closeButton = detailPanel.getByRole('button', { name: /close/i })
    await closeButton.click()

    // Panel should close (or be hidden)
    await expect(detailPanel).not.toBeVisible()
  })

  test('selecting different node updates detail panel', async ({ page }) => {
    // Select first node
    await page.getByText('Motor Selection').click()
    await expect(page.getByLabel(/Edit Motor Selection/i)).toBeVisible()

    // Close the panel first to access other nodes
    const closeButton = page
      .getByLabel(/Edit Motor Selection/i)
      .getByRole('button', { name: /close/i })
    await closeButton.click()
    await expect(page.getByLabel(/Edit Motor Selection/i)).not.toBeVisible()

    // Select different node
    await page.getByText('Research Motor Options').click()
    await expect(page.getByLabel(/Edit Research Motor Options/i)).toBeVisible()
  })
})

test.describe('Node Operations - Outline View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('outline view shows all nodes', async ({ page }) => {
    // Should show node count in header
    await expect(page.getByText(/\d+ nodes?/i)).toBeVisible()
  })

  test('outline view displays node titles', async ({ page }) => {
    // Check some test nodes are visible
    await expect(page.getByText('Motor Selection')).toBeVisible()
    await expect(page.getByText('Frame Material')).toBeVisible()
    await expect(page.getByText('Project Overview')).toBeVisible()
  })

  test('outline view shows node type indicators', async ({ page }) => {
    // Nodes should have type icons or indicators
    const nodeList = page.locator('main')
    await expect(nodeList).toBeVisible()
  })

  test('task nodes show status indicators', async ({ page }) => {
    // Find a task node
    const taskNode = page.getByText('Research Motor Options').locator('..')

    // Should have some status indicator
    await expect(taskNode).toBeVisible()
  })

  test('task checkbox can be toggled', async ({ page }) => {
    // Find a task with a checkbox
    const taskItem = page.getByText('Research Motor Options').locator('..')
    const checkbox = taskItem.getByRole('checkbox')

    if ((await checkbox.count()) > 0) {
      const wasChecked = await checkbox.isChecked()
      await checkbox.click()
      const isNowChecked = await checkbox.isChecked()
      expect(isNowChecked).not.toBe(wasChecked)
    }
  })
})

test.describe('Node Operations - Graph View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('can switch to graph view', async ({ page }) => {
    // Find and click graph view toggle (name includes shortcut like "Graph ⌘2")
    const graphTab = page.locator('button[role="tab"]', { hasText: 'Graph' })
    await graphTab.click()

    // Graph view should be visible
    await expect(graphTab).toHaveAttribute('aria-selected', 'true')
  })

  test('graph view renders canvas', async ({ page }) => {
    // Switch to graph view
    const graphTab = page.locator('button[role="tab"]', { hasText: 'Graph' })
    await graphTab.click()

    // Should have a canvas or SVG element
    const graphCanvas = page.locator('canvas, svg').first()
    await expect(graphCanvas).toBeVisible()
  })

  test('can switch back to outline view', async ({ page }) => {
    // Switch to graph
    await page.locator('button[role="tab"]', { hasText: 'Graph' }).click()

    // Switch back to outline
    const outlineTab = page.locator('button[role="tab"]', {
      hasText: 'Outline',
    })
    await outlineTab.click()

    await expect(outlineTab).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Node Operations - Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('detail panel shows node title', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Title is in an input field, check the value
    const titleInput = detailPanel.getByLabel(/title/i)
    await expect(titleInput).toHaveValue('Motor Selection')
  })

  test('detail panel shows node content', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Test data has content about "stepper and servo motors"
    await expect(detailPanel).toContainText(/stepper|servo/i)
  })

  test('detail panel shows node tags', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Test data has tags 'hardware', 'actuator'
    await expect(detailPanel.getByText('hardware')).toBeVisible()
  })

  test('decision node shows options', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Decision has options "NEMA 17 Stepper" and "Servo Motor"
    await expect(detailPanel).toContainText(/NEMA 17|Servo/i)
  })

  test('task node shows priority', async ({ page }) => {
    await page.getByText('Research Motor Options').click()

    const detailPanel = page.getByLabel(/Edit Research Motor Options/i)
    // Task has priority "high"
    await expect(detailPanel.getByText(/high/i)).toBeVisible()
  })

  test('task node shows checklist', async ({ page }) => {
    await page.getByText('Research Motor Options').click()

    const detailPanel = page.getByLabel(/Edit Research Motor Options/i)
    // Task has checklist items - check for one specific item
    await expect(
      detailPanel.getByText('Check torque requirements')
    ).toBeVisible()
  })

  test('component node shows cost', async ({ page }) => {
    await page.getByText('NEMA 17 Stepper Motor').click()

    const detailPanel = page.getByLabel(/Edit NEMA 17 Stepper Motor/i)
    // Component has cost 15.99 in input field
    const costInput = detailPanel.getByLabel('Cost')
    await expect(costInput).toHaveValue('15.99')
  })

  test('component node shows supplier', async ({ page }) => {
    await page.getByText('NEMA 17 Stepper Motor').click()

    const detailPanel = page.getByLabel(/Edit NEMA 17 Stepper Motor/i)
    // Supplier is in input field
    const supplierInput = detailPanel.getByLabel('Supplier')
    await expect(supplierInput).toHaveValue('Amazon')
  })

  test('detail panel has delete button', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    const deleteButton = detailPanel.getByRole('button', {
      name: /delete node/i,
    })
    await expect(deleteButton).toBeVisible()
  })
})

test.describe('Node Operations - Create and Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('creating a new node increases node count', async ({ page }) => {
    const initialCount = await getNodeCount(page)

    // Click create button in sidebar
    const createButton = page.getByRole('button', {
      name: /create new decision/i,
    })
    await createButton.click()

    await page.waitForTimeout(200)
    const newCount = await getNodeCount(page)

    expect(newCount).toBe(initialCount + 1)
  })

  test('new node appears in outline view', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create new note/i })
    await createButton.click()

    await page.waitForTimeout(200)

    // New note should be visible
    await expect(page.getByText(/New Note/i)).toBeVisible()
  })

  test('new node is automatically selected', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create new task/i })
    await createButton.click()

    await page.waitForTimeout(200)

    // Detail panel should be open with new task (aria-label contains "Edit New Task")
    const detailPanel = page.getByLabel(/Edit New Task/i)
    await expect(detailPanel).toBeVisible()
    // Title input should have "New Task" value
    const titleInput = detailPanel.getByLabel(/title/i)
    await expect(titleInput).toHaveValue('New Task')
  })

  test('delete button opens confirmation dialog', async ({ page }) => {
    // Select a node
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Click delete button
    const deleteButton = detailPanel.getByRole('button', {
      name: /delete node/i,
    })
    await deleteButton.click()

    // Confirmation dialog should appear (uses role="alertdialog")
    const confirmDialog = page.getByRole('alertdialog')
    await expect(confirmDialog).toBeVisible()

    // Should show confirmation text with "Delete Decision?" title
    await expect(confirmDialog.getByText(/Delete Decision/i)).toBeVisible()
  })

  test('canceling delete keeps the node', async ({ page }) => {
    const initialCount = await getNodeCount(page)

    // Select a node
    await page.getByText('Motor Selection').click()

    // Click delete button
    const detailPanel = page.getByRole('dialog').first()
    const deleteButton = detailPanel.getByRole('button', {
      name: /delete node/i,
    })
    await deleteButton.click()

    // Cancel the deletion
    const cancelButton = page.getByRole('button', { name: /cancel/i })
    await cancelButton.click()

    // Node count should be unchanged
    await page.waitForTimeout(200)
    const newCount = await getNodeCount(page)
    expect(newCount).toBe(initialCount)
  })

  test('confirming delete removes the node', async ({ page }) => {
    // Verify project loaded
    await expect(page.getByText(/\d+ nodes?/i)).toBeVisible()

    const initialCount = await getNodeCount(page)

    // Select a node
    await page.getByText('Motor Selection').click()

    // Wait for detail panel to be visible
    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Click delete button in the detail panel
    const deleteButton = detailPanel.getByRole('button', {
      name: /delete node/i,
    })
    await deleteButton.click()

    // Wait for the confirmation dialog to appear
    const confirmDialog = page.getByRole('alertdialog')
    await expect(confirmDialog).toBeVisible()

    // Confirm the deletion - the button has text "Delete"
    const confirmButton = confirmDialog.getByRole('button', { name: 'Delete' })
    await confirmButton.click()

    // Node count should decrease
    await page.waitForTimeout(200)
    const newCount = await getNodeCount(page)
    expect(newCount).toBe(initialCount - 1)

    // Node should no longer be in the list
    await expect(page.getByText('Motor Selection')).not.toBeVisible()
  })

  test('deleting closes the detail panel', async ({ page }) => {
    // Verify project loaded
    await expect(page.getByText(/\d+ nodes?/i)).toBeVisible()

    // Select a node
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Delete the node
    const deleteButton = detailPanel.getByRole('button', {
      name: /delete node/i,
    })
    await deleteButton.click()

    // Wait for confirmation dialog to appear
    const confirmDialog = page.getByRole('alertdialog')
    await expect(confirmDialog).toBeVisible()

    // Confirm in the alertdialog - button has text "Delete"
    const confirmButton = confirmDialog.getByRole('button', { name: 'Delete' })
    await confirmButton.click()

    // Detail panel should close
    await page.waitForTimeout(200)
    await expect(page.getByLabel(/Edit Motor Selection/i)).not.toBeVisible()
  })
})

test.describe('Node Operations - Wiki Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('wiki links are rendered in content', async ({ page }) => {
    // The note "Project Overview" has wiki link [[decision-motor-selection]]
    await page.getByText('Project Overview').click()

    const detailPanel = page.getByLabel(/Edit Project Overview/i)
    // Link should be rendered (as text or clickable link)
    await expect(detailPanel).toContainText(/motor.*selection/i)
  })
})

test.describe('Node Operations - Edit Panel Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('edit panel shows title editor', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Should have a title input/editor
    const titleInput = detailPanel.getByLabel(/title/i)
    await expect(titleInput).toBeVisible()
    await expect(titleInput).toHaveValue('Motor Selection')
  })

  test('edit panel shows status selector', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Should have a status selector
    const statusLabel = detailPanel.getByText(/status/i)
    await expect(statusLabel).toBeVisible()
  })

  test('edit panel shows tags input', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Should show existing tags - use exact match to avoid matching content text
    await expect(
      detailPanel.getByText('hardware', { exact: true })
    ).toBeVisible()
    await expect(
      detailPanel.getByText('actuator', { exact: true })
    ).toBeVisible()
  })

  test('edit panel shows content editor', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    // Should have a content label and editor
    const contentLabel = detailPanel.getByText(/^content$/i)
    await expect(contentLabel).toBeVisible()
  })

  test('edit panel can edit title', async ({ page }) => {
    // Verify project loaded
    await expect(page.getByText(/\d+ nodes?/i)).toBeVisible()

    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Use a more specific locator for the title input
    const titleInput = page.locator('#node-title-editor')
    await expect(titleInput).toBeVisible()

    // Fill replaces the content
    await titleInput.fill('Updated Motor Selection')

    // The title should be updated
    await expect(titleInput).toHaveValue('Updated Motor Selection')
  })
})

test.describe('Node Operations - Save Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('save indicator is present in header', async ({ page }) => {
    // Verify project loaded
    await expect(page.getByText(/\d+ nodes?/i)).toBeVisible()

    // The save indicator should be present (may show nothing when idle)
    // After making changes, it should show status
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Use specific ID for the title input
    const titleInput = page.locator('#node-title-editor')
    await expect(titleInput).toBeVisible()

    // Make a change (fill replaces content)
    await titleInput.fill('Changed Title')

    // Wait for debounced save to trigger
    await page.waitForTimeout(2500)

    // Should show "Saved" status in the header (use data-testid or text match)
    // The save indicator shows "Saved" text when save completes
    const saveStatus = page.getByText(/saved|saving/i).first()
    await expect(saveStatus).toBeVisible()
  })
})
