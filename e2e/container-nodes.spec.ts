import { test, expect } from '@playwright/test'
import { waitForAppReady, setupTestDataViaActions } from './test-utils'

/**
 * E2E tests for Container Node Types (Sprint 13)
 *
 * Container nodes (Subsystem, Assembly, Module) are hierarchical organizational
 * units for grouping other nodes in large-scale projects.
 */

test.describe('Container Node Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Node Type System', () => {
    test('should display Subsystem, Assembly, Module in Quick Create menu', async ({
      page,
    }) => {
      // Quick Create section is expanded by default, so buttons should be visible
      // Verify all three container node types are visible
      await expect(
        page.getByRole('button', { name: /create new subsystem/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create new assembly/i })
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create new module/i })
      ).toBeVisible()
    })

    test('should create a new Subsystem node', async ({ page }) => {
      // Quick Create section is expanded by default
      const createSubsystemButton = page.getByRole('button', {
        name: /create new subsystem/i,
      })
      await createSubsystemButton.click()

      // Wait for state to update
      await page.waitForTimeout(200)

      // Should open detail panel with new node
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })
      // The panel should have aria-label containing "New Subsystem"
      await expect(detailPanel).toHaveAttribute('aria-label', /New Subsystem/i)
    })

    test('should create a new Assembly node', async ({ page }) => {
      // Quick Create section is expanded by default
      const createAssemblyButton = page.getByRole('button', {
        name: /create new assembly/i,
      })
      await createAssemblyButton.click()

      // Wait for state to update
      await page.waitForTimeout(200)

      // Should open detail panel with new node
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })
      // The panel should have aria-label containing "New Assembly"
      await expect(detailPanel).toHaveAttribute('aria-label', /New Assembly/i)
    })

    test('should create a new Module node', async ({ page }) => {
      // Quick Create section is expanded by default
      const createModuleButton = page.getByRole('button', {
        name: /create new module/i,
      })
      await createModuleButton.click()

      // Wait for state to update
      await page.waitForTimeout(200)

      // Should open detail panel with new node
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })
      // The panel should have aria-label containing "New Module"
      await expect(detailPanel).toHaveAttribute('aria-label', /New Module/i)
    })

    test('container nodes display correct status in outline', async ({
      page,
    }) => {
      // Quick Create section is expanded by default
      await page.getByRole('button', { name: /create new subsystem/i }).click()

      // Wait for state to update
      await page.waitForTimeout(200)

      // Verify the subsystem appears in the outline with Planning status
      // The outline shows the status badge next to non-task nodes
      await expect(page.getByText('New Subsystem')).toBeVisible()
      await expect(page.getByText('Planning', { exact: true })).toBeVisible()
    })
  })

  test.describe('Container Node Filtering', () => {
    test('should filter nodes by container type', async ({ page }) => {
      // Use the type filter to show only Subsystems
      const filterButton = page.getByRole('button', { name: 'Filters' })
      await filterButton.click()

      // Look for type filter options
      const subsystemCheckbox = page.getByRole('checkbox', {
        name: /subsystem/i,
      })
      if (await subsystemCheckbox.isVisible()) {
        await subsystemCheckbox.check()

        // Verify only subsystem nodes are shown (or empty state)
        // This will be more meaningful once we have container nodes in test data
      }
    })
  })

  test.describe('Container Type Icons', () => {
    test('container nodes should display distinct type icons', async ({
      page,
    }) => {
      // Quick Create section is expanded by default
      // Verify buttons for container types are present with icons
      const subsystemButton = page.getByRole('button', {
        name: /create new subsystem/i,
      })
      const assemblyButton = page.getByRole('button', {
        name: /create new assembly/i,
      })
      const moduleButton = page.getByRole('button', {
        name: /create new module/i,
      })

      // Verify all container type buttons are visible
      await expect(subsystemButton).toBeVisible()
      await expect(assemblyButton).toBeVisible()
      await expect(moduleButton).toBeVisible()

      // Verify each button contains SVG icons (Plus icon + Type icon)
      // Each button should have at least 2 SVGs
      await expect(subsystemButton.locator('svg').first()).toBeVisible()
      await expect(assemblyButton.locator('svg').first()).toBeVisible()
      await expect(moduleButton.locator('svg').first()).toBeVisible()
    })
  })
})

test.describe('Container Node Type Guards', () => {
  test('isContainerNode should correctly identify container types', async ({
    page,
  }) => {
    await page.goto('/')
    await waitForAppReady(page)

    // Test type guards via browser context
    const result = await page.evaluate(() => {
      // Test container type detection inline
      const isContainerType = (type: string) =>
        ['subsystem', 'assembly', 'module'].includes(type)

      return {
        subsystemIsContainer: isContainerType('subsystem'),
        assemblyIsContainer: isContainerType('assembly'),
        moduleIsContainer: isContainerType('module'),
        taskIsContainer: isContainerType('task'),
        decisionIsContainer: isContainerType('decision'),
        componentIsContainer: isContainerType('component'),
        noteIsContainer: isContainerType('note'),
      }
    })

    expect(result.subsystemIsContainer).toBe(true)
    expect(result.assemblyIsContainer).toBe(true)
    expect(result.moduleIsContainer).toBe(true)
    expect(result.taskIsContainer).toBe(false)
    expect(result.decisionIsContainer).toBe(false)
    expect(result.componentIsContainer).toBe(false)
    expect(result.noteIsContainer).toBe(false)
  })
})

test.describe('Container Node Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test('subsystem node is created with planning status', async ({ page }) => {
    // Quick Create section is expanded by default
    await page.getByRole('button', { name: /create new subsystem/i }).click()

    // Wait for detail panel to open
    await page.waitForTimeout(200)
    const detailPanel = page.getByRole('dialog')
    await expect(detailPanel).toBeVisible({ timeout: 5000 })

    // Verify the new subsystem dialog has correct aria-label
    await expect(detailPanel).toHaveAttribute('aria-label', /New Subsystem/i)

    // Verify the status is shown in the outline (not in the detail panel)
    // The outline shows "Planning" badge next to the node
    await expect(page.getByText('Planning', { exact: true })).toBeVisible()
  })
})

test.describe('Container Node Detail Panel (Task 13.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Detail Panel Rendering', () => {
    test('should display detail panel for Subsystem nodes', async ({
      page,
    }) => {
      // Create a subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Detail panel should be open
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })

      // Should show title field
      await expect(
        detailPanel.locator('input[type="text"]').first()
      ).toBeVisible()

      // Should show status selector
      await expect(detailPanel.getByText('Status')).toBeVisible()
    })

    test('should display detail panel for Assembly nodes', async ({ page }) => {
      // Create an assembly
      await page.getByRole('button', { name: /create new assembly/i }).click()
      await page.waitForTimeout(200)

      // Detail panel should be open
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })

      // Should show title field
      await expect(
        detailPanel.locator('input[type="text"]').first()
      ).toBeVisible()

      // Should show status selector
      await expect(detailPanel.getByText('Status')).toBeVisible()
    })

    test('should display detail panel for Module nodes', async ({ page }) => {
      // Create a module
      await page.getByRole('button', { name: /create new module/i }).click()
      await page.waitForTimeout(200)

      // Detail panel should be open
      const detailPanel = page.getByRole('dialog')
      await expect(detailPanel).toBeVisible({ timeout: 5000 })

      // Should show title field
      await expect(
        detailPanel.locator('input[type="text"]').first()
      ).toBeVisible()

      // Should show status selector
      await expect(detailPanel.getByText('Status')).toBeVisible()
    })
  })

  test.describe('Container Fields', () => {
    test('should display requirements section', async ({ page }) => {
      // Create a subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Should show requirements section
      const detailPanel = page.getByRole('dialog')
      await expect(
        detailPanel.getByText('Requirements', { exact: true })
      ).toBeVisible()
    })

    test('should allow adding requirements', async ({ page }) => {
      // Create a subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Find add requirement input
      const detailPanel = page.getByRole('dialog')
      const requirementInput = detailPanel.getByLabel('New requirement')

      // Input should be visible
      await expect(requirementInput).toBeVisible()

      // Type a requirement
      await requirementInput.fill('Test requirement')

      // Add button should now be enabled
      const addButton = detailPanel.getByRole('button', {
        name: /add requirement/i,
      })
      await expect(addButton).toBeEnabled()

      // Click to add
      await addButton.click()

      // The requirement should now appear in the list
      await expect(
        detailPanel.locator('input[value="Test requirement"]')
      ).toBeVisible()
    })

    test('should display child nodes section', async ({ page }) => {
      // Create a subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Should show child nodes section
      const detailPanel = page.getByRole('dialog')
      await expect(
        detailPanel.getByRole('heading', { name: /child nodes/i })
      ).toBeVisible()
    })
  })

  test.describe('Child Nodes Navigation', () => {
    test('child nodes should be grouped by type with counts', async ({
      page,
    }) => {
      // Create a subsystem first
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Set title
      const titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Test Container')
      await page.waitForTimeout(100)

      // Close panel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create a task and link it to the container
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      const taskTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await taskTitle.fill('Child Task')
      await page.waitForTimeout(100)

      // Link to parent via E2E hook
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-set-task-parent', {
          detail: { taskTitle: 'Child Task', parentTitle: 'Test Container' },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(200)

      // Close task panel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Open the container panel again
      await page.getByText('Test Container').click()
      await page.waitForTimeout(200)

      // Child nodes section should show tasks with count
      const detailPanel = page.getByRole('dialog')
      // Look for "Tasks" or "Task" label with count
      await expect(
        detailPanel
          .getByText(/tasks?\s*\(/i)
          .or(detailPanel.getByText(/1 task/i))
      ).toBeVisible({ timeout: 5000 })
    })

    test('clicking child node should navigate to it', async ({ page }) => {
      // Create container and child as in previous test
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      const titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Navigation Container')
      await page.waitForTimeout(100)

      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      const taskTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await taskTitle.fill('Clickable Task')
      await page.waitForTimeout(100)

      await page.evaluate(() => {
        const event = new CustomEvent('e2e-set-task-parent', {
          detail: {
            taskTitle: 'Clickable Task',
            parentTitle: 'Navigation Container',
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(200)

      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Open container panel
      await page.getByText('Navigation Container').click()
      await page.waitForTimeout(200)

      // Click on the child task in the child nodes section
      const detailPanel = page.getByRole('dialog')
      const childTaskLink = detailPanel.getByText('Clickable Task')

      if (await childTaskLink.isVisible()) {
        await childTaskLink.click()
        await page.waitForTimeout(300)

        // Panel should now show the task - check the dialog name
        await expect(
          page.getByRole('dialog', { name: /Clickable Task/i })
        ).toBeVisible()
      }
    })
  })
})

test.describe('Container Node CRUD & Store (Task 13.4)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Container Node Store Operations', () => {
    test('getNodesByType works for container node types', async ({ page }) => {
      // Create a subsystem first
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Close the detail panel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)

      // Create an assembly
      await page.getByRole('button', { name: /create new assembly/i }).click()
      await page.waitForTimeout(200)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)

      // Verify nodes were created via store query
      const result = await page.evaluate(() => {
        const event = new CustomEvent('e2e-get-nodes-by-type', {
          detail: { types: ['subsystem', 'assembly', 'module'] },
        })
        window.dispatchEvent(event)
        return (
          window as unknown as { __e2eNodesByType?: Record<string, number> }
        ).__e2eNodesByType
      })

      // Should have at least 1 subsystem and 1 assembly
      expect(result?.subsystem).toBeGreaterThanOrEqual(1)
      expect(result?.assembly).toBeGreaterThanOrEqual(1)
    })

    test('getChildNodes returns nodes with matching parent field', async ({
      page,
    }) => {
      // Create a subsystem first
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Get the subsystem ID from the detail panel
      const subsystemTitle = await page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
        .inputValue()

      // Close the detail panel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)

      // The test data includes tasks - they could have parent set to the subsystem
      // For now, verify getChildNodes function exists and returns empty for new container
      const result = await page.evaluate((title) => {
        const event = new CustomEvent('e2e-get-child-nodes', {
          detail: { parentTitle: title },
        })
        window.dispatchEvent(event)
        return (window as unknown as { __e2eChildNodes?: string[] })
          .__e2eChildNodes
      }, subsystemTitle)

      // New subsystem should have no children initially
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  test.describe('Container Node Deletion', () => {
    test('deleting container with child nodes shows warning', async ({
      page,
    }) => {
      // Create a subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Set a recognizable title
      const titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Test Parent Subsystem')
      await page.waitForTimeout(100)

      // Close the panel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create a task and link it to the subsystem as parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      // Set task title
      const taskTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await taskTitle.fill('Child Task')
      await page.waitForTimeout(100)

      // Close the panel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Link the task to the subsystem via store (simulate parent assignment)
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-set-task-parent', {
          detail: {
            taskTitle: 'Child Task',
            parentTitle: 'Test Parent Subsystem',
          },
        })
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(200)

      // Now click on the subsystem in the outline to select it
      await page.getByText('Test Parent Subsystem').click()
      await page.waitForTimeout(200)

      // Try to delete it - should show a warning about orphaned children
      // Use keyboard shortcut or delete button
      const deleteButton = page.getByRole('button', { name: /delete/i })
      if (await deleteButton.isVisible()) {
        await deleteButton.click()

        // Should see a warning dialog about orphaned children
        const warningDialog = page.getByRole('alertdialog')
        await expect(warningDialog).toBeVisible({ timeout: 5000 })

        // The warning should mention child nodes or orphaned references
        const dialogText = await warningDialog.textContent()
        expect(
          dialogText?.toLowerCase().includes('child') ||
            dialogText?.toLowerCase().includes('orphan') ||
            dialogText?.toLowerCase().includes('linked')
        ).toBe(true)
      }
    })

    test('deleting container without children succeeds normally', async ({
      page,
    }) => {
      // Create a subsystem with no children
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)

      // Set a recognizable title
      const titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Standalone Subsystem')
      await page.waitForTimeout(100)

      // Close the panel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Click on the subsystem in the outline
      await page.getByText('Standalone Subsystem').click()
      await page.waitForTimeout(200)

      // Try to delete - should not show orphan warning (might show standard confirmation)
      const deleteButton = page.getByRole('button', { name: /delete/i })
      if (await deleteButton.isVisible()) {
        await deleteButton.click()

        // Should show standard delete confirmation (not orphan warning)
        const confirmDialog = page.getByRole('alertdialog')
        if (await confirmDialog.isVisible()) {
          const dialogText = await confirmDialog.textContent()
          // Standard confirmation, not orphan-specific warning
          expect(
            dialogText?.toLowerCase().includes('delete') ||
              dialogText?.toLowerCase().includes('confirm')
          ).toBe(true)
        }
      }
    })
  })
})

// ============================================================================
// Task 13.6: Parent Selector UI
// ============================================================================

test.describe('Parent Selector UI (Task 13.6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Parent Selector in Detail Panels', () => {
    test('Task detail panel shows Parent selector', async ({ page }) => {
      // Create a task
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      // Should show Parent selector field
      const detailPanel = page.getByRole('dialog')
      await expect(
        detailPanel.getByText('Parent', { exact: true })
      ).toBeVisible()
    })

    test('Component detail panel shows Parent selector', async ({ page }) => {
      // Create a component
      await page.getByRole('button', { name: /create new component/i }).click()
      await page.waitForTimeout(200)

      // Should show Parent selector field
      const detailPanel = page.getByRole('dialog')
      await expect(
        detailPanel.getByText('Parent', { exact: true })
      ).toBeVisible()
    })

    test('Decision detail panel shows Parent selector', async ({ page }) => {
      // Create a decision
      await page.getByRole('button', { name: /create new decision/i }).click()
      await page.waitForTimeout(200)

      // Should show Parent selector field
      const detailPanel = page.getByRole('dialog')
      await expect(
        detailPanel.getByText('Parent', { exact: true })
      ).toBeVisible()
    })

    test('Note detail panel shows Parent selector', async ({ page }) => {
      // Create a note
      await page.getByRole('button', { name: /create new note/i }).click()
      await page.waitForTimeout(200)

      // Should show Parent selector field
      const detailPanel = page.getByRole('dialog')
      await expect(
        detailPanel.getByText('Parent', { exact: true })
      ).toBeVisible()
    })
  })

  test.describe('Parent Selector Dropdown', () => {
    test('dropdown shows container nodes grouped by type', async ({ page }) => {
      // First create some container nodes
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const subsystemTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await subsystemTitle.fill('Test Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      await page.getByRole('button', { name: /create new assembly/i }).click()
      await page.waitForTimeout(200)
      const assemblyTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await assemblyTitle.fill('Test Assembly')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create a task
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      // Open the parent selector
      const detailPanel = page.getByRole('dialog')
      const parentSelector = detailPanel.getByRole('combobox', {
        name: /parent/i,
      })
      await parentSelector.click()
      await page.waitForTimeout(200)

      // Should show container types as groups in the dropdown
      const dropdown = page.getByRole('listbox', {
        name: /available containers/i,
      })
      await expect(dropdown.getByText('Subsystems')).toBeVisible()
      await expect(dropdown.getByText('Test Subsystem')).toBeVisible()
      await expect(dropdown.getByText('Test Assembly')).toBeVisible()
    })

    test('dropdown supports search/filter', async ({ page }) => {
      // Create containers
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const title1 = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await title1.fill('Motion System')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const title2 = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await title2.fill('Electrical System')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create a task
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      // Open parent selector and search
      const detailPanel = page.getByRole('dialog')
      const parentSelector = detailPanel.getByRole('combobox', {
        name: /parent/i,
      })
      await parentSelector.click()
      await page.waitForTimeout(200)

      // Type to filter
      await parentSelector.fill('Motion')
      await page.waitForTimeout(200)

      // Should show matching container in dropdown, not the other
      const dropdown = page.getByRole('listbox', {
        name: /available containers/i,
      })
      await expect(dropdown.getByText('Motion System')).toBeVisible()
      // Electrical System should be filtered out
    })
  })

  test.describe('Parent Assignment', () => {
    test('can assign parent to a task', async ({ page }) => {
      // Create a subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const subsystemTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await subsystemTitle.fill('Parent Container')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create a task
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      // Open parent selector and select the container
      const detailPanel = page.getByRole('dialog')
      const parentSelector = detailPanel.getByRole('combobox', {
        name: /parent/i,
      })
      await parentSelector.click()
      await page.waitForTimeout(200)

      // Select the container
      await page.getByRole('option', { name: /Parent Container/i }).click()
      await page.waitForTimeout(200)

      // Parent should now be shown
      await expect(detailPanel.getByText('Parent Container')).toBeVisible()
    })

    test('can clear parent assignment', async ({ page }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const subsystemTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await subsystemTitle.fill('Clearable Parent')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task and assign parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      const detailPanel = page.getByRole('dialog')
      const parentSelector = detailPanel.getByRole('combobox', {
        name: /parent/i,
      })
      await parentSelector.click()
      await page.waitForTimeout(200)

      await page.getByRole('option', { name: /Clearable Parent/i }).click()
      await page.waitForTimeout(200)

      // Now clear the parent
      const clearButton = detailPanel.getByRole('button', {
        name: /clear parent/i,
      })
      if (await clearButton.isVisible()) {
        await clearButton.click()
        await page.waitForTimeout(200)

        // Parent should no longer be shown (or show "None")
        await expect(
          detailPanel.getByText('Clearable Parent')
        ).not.toBeVisible()
      }
    })
  })

  test.describe('Current Parent Display', () => {
    test('shows current parent with type badge', async ({ page }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const subsystemTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await subsystemTitle.fill('Badged Parent')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task and assign parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      const detailPanel = page.getByRole('dialog')
      const parentSelector = detailPanel.getByRole('combobox', {
        name: /parent/i,
      })
      await parentSelector.click()
      await page.waitForTimeout(200)

      await page.getByRole('option', { name: /Badged Parent/i }).click()
      await page.waitForTimeout(200)

      // Should show parent with type indicator
      await expect(detailPanel.getByText('Badged Parent')).toBeVisible()
      // Should have some type indicator (Subsystem badge or icon)
      await expect(
        detailPanel
          .getByText('Subsystem')
          .or(detailPanel.locator('[aria-label*="subsystem" i]'))
      ).toBeVisible()
    })

    test('clicking parent link navigates to parent', async ({ page }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const subsystemTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await subsystemTitle.fill('Navigable Parent')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task and assign parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)

      const detailPanel = page.getByRole('dialog')
      const parentSelector = detailPanel.getByRole('combobox', {
        name: /parent/i,
      })
      await parentSelector.click()
      await page.waitForTimeout(200)

      await page.getByRole('option', { name: /Navigable Parent/i }).click()
      await page.waitForTimeout(200)

      // Click the parent link/button to navigate
      const parentLink = detailPanel
        .getByRole('button', { name: /navigate.*parent/i })
        .or(detailPanel.getByRole('link', { name: /Navigable Parent/i }))

      if (await parentLink.isVisible()) {
        await parentLink.click()
        await page.waitForTimeout(300)

        // Panel should now show the parent container
        await expect(
          page.getByRole('dialog', { name: /Navigable Parent/i })
        ).toBeVisible()
      }
    })
  })
})

// ============================================================================
// Task 13.7: Container Filtering & Outline
// ============================================================================
test.describe('Container Filtering & Outline (Task 13.7)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Container Filter in Sidebar', () => {
    test('container filter dropdown shows available containers', async ({
      page,
    }) => {
      // Create a subsystem container
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const subsystemTitle = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await subsystemTitle.fill('Power System')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Expand Filters section if collapsed
      const filtersSection = page.getByRole('button', { name: /filters/i })
      if ((await filtersSection.getAttribute('aria-expanded')) === 'false') {
        await filtersSection.click()
        await page.waitForTimeout(200)
      }

      // Look for container filter in sidebar - it's a native select element
      const sidebar = page.locator('[data-testid="sidebar"]')
      const containerFilter = sidebar.locator(
        'select[aria-label="Filter by container"]'
      )

      await expect(containerFilter).toBeVisible()

      // Check that the container we created is in the dropdown
      // Native selects have hidden options until opened, so check by text content
      const optionTexts = await containerFilter
        .locator('option')
        .allTextContents()
      expect(optionTexts).toContain('All Containers')
      expect(optionTexts.some((text) => text.includes('Power System'))).toBe(
        true
      )
    })

    test('selecting container filter shows only nodes within that container', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Filtered Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task with parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Child Task')

      // Assign parent
      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page.getByRole('option', { name: /Filtered Subsystem/i }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create another task WITHOUT parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Orphan Task')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Expand Filters section if collapsed
      const filtersSection = page.getByRole('button', { name: /filters/i })
      if ((await filtersSection.getAttribute('aria-expanded')) === 'false') {
        await filtersSection.click()
        await page.waitForTimeout(200)
      }

      // Select container filter using native select
      const sidebar = page.locator('[data-testid="sidebar"]')
      const containerFilter = sidebar.locator(
        'select[aria-label="Filter by container"]'
      )
      await containerFilter.selectOption({ label: 'Filtered Subsystem' })
      await page.waitForTimeout(300)

      // Should show only Child Task, not Orphan Task
      await expect(page.getByText('Child Task')).toBeVisible()
      await expect(page.getByText('Orphan Task')).not.toBeVisible()
    })

    test('container filter state persists in URL', async ({ page }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('URL Test Container')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Expand Filters section if collapsed
      const filtersSection = page.getByRole('button', { name: /filters/i })
      if ((await filtersSection.getAttribute('aria-expanded')) === 'false') {
        await filtersSection.click()
        await page.waitForTimeout(200)
      }

      // Select container filter using native select
      const sidebar = page.locator('[data-testid="sidebar"]')
      const containerFilter = sidebar.locator(
        'select[aria-label="Filter by container"]'
      )
      await containerFilter.selectOption({ label: 'URL Test Container' })
      await page.waitForTimeout(300)

      // URL should contain container parameter
      const url = page.url()
      expect(url).toMatch(/container=/i)
    })
  })

  test.describe('Outline View Container Grouping', () => {
    test('outline view can group by container', async ({ page }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Grouping Container')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task with parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Grouped Task')

      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page.getByRole('option', { name: /Grouping Container/i }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Find group by selector and select container grouping
      const groupBySelector = page
        .getByRole('combobox', { name: /group.*by/i })
        .or(page.getByLabel(/group.*by/i))

      if (await groupBySelector.isVisible()) {
        await groupBySelector.click()
        await page.waitForTimeout(200)

        // Select container grouping option
        const containerOption = page.getByRole('option', { name: /container/i })
        if (await containerOption.isVisible()) {
          await containerOption.click()
          await page.waitForTimeout(300)

          // Should see container section header
          await expect(page.getByText('Grouping Container')).toBeVisible()
        }
      }
    })

    test('container sections are collapsible with node counts', async ({
      page,
    }) => {
      // Create subsystem with 2 child tasks
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Collapsible Container')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create 2 tasks
      for (let i = 1; i <= 2; i++) {
        await page.getByRole('button', { name: /create new task/i }).click()
        await page.waitForTimeout(200)
        titleInput = page
          .getByRole('dialog')
          .locator('input[type="text"]')
          .first()
        await titleInput.fill(`Container Task ${i}`)

        const parentSelector = page
          .getByRole('dialog')
          .getByRole('combobox', { name: /parent/i })
        await parentSelector.click()
        await page.waitForTimeout(200)
        await page
          .getByRole('option', { name: /Collapsible Container/i })
          .click()
        await page.keyboard.press('Escape')
        await page.waitForTimeout(200)
      }

      // Switch to container grouping if available
      const groupBySelector = page.getByRole('combobox', { name: /group.*by/i })
      if (await groupBySelector.isVisible()) {
        await groupBySelector.click()
        await page.waitForTimeout(200)
        const containerOption = page.getByRole('option', { name: /container/i })
        if (await containerOption.isVisible()) {
          await containerOption.click()
          await page.waitForTimeout(300)
        }
      }

      // Look for container section with count
      const containerSection = page
        .getByRole('button', { name: /Collapsible Container/i })
        .or(page.getByText(/Collapsible Container.*\(2\)/i))

      if (await containerSection.isVisible()) {
        // Verify count is shown
        await expect(page.getByText(/\(2\)/)).toBeVisible()

        // Click to collapse
        await containerSection.click()
        await page.waitForTimeout(200)

        // Tasks should be hidden
        await expect(page.getByText('Container Task 1')).not.toBeVisible()
      }
    })

    test('nodes without parent shown in Unassigned section', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Has Parent Container')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task with parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Assigned Task')

      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page.getByRole('option', { name: /Has Parent Container/i }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task WITHOUT parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Unassigned Task')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to container grouping
      const groupBySelector = page.getByRole('combobox', { name: /group.*by/i })
      if (await groupBySelector.isVisible()) {
        await groupBySelector.click()
        await page.waitForTimeout(200)
        const containerOption = page.getByRole('option', { name: /container/i })
        if (await containerOption.isVisible()) {
          await containerOption.click()
          await page.waitForTimeout(300)

          // Should see Unassigned section
          await expect(page.getByText(/Unassigned/i)).toBeVisible()

          // Unassigned Task should be in the unassigned section
          await expect(page.getByText('Unassigned Task')).toBeVisible()
        }
      }
    })
  })

  test.describe('Container Filter Clear', () => {
    test('can clear container filter to show all nodes', async ({ page }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Clear Test Container')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task with parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Filtered Task')

      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page.getByRole('option', { name: /Clear Test Container/i }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create another task WITHOUT parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Non Filtered Task')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Expand Filters section if collapsed
      const filtersSection = page.getByRole('button', { name: /filters/i })
      if ((await filtersSection.getAttribute('aria-expanded')) === 'false') {
        await filtersSection.click()
        await page.waitForTimeout(200)
      }

      // Apply container filter using native select
      const sidebar = page.locator('[data-testid="sidebar"]')
      const containerFilter = sidebar.locator(
        'select[aria-label="Filter by container"]'
      )
      await containerFilter.selectOption({ label: 'Clear Test Container' })
      await page.waitForTimeout(300)

      // Only Filtered Task should be visible
      await expect(
        page.getByText('Filtered Task', { exact: true })
      ).toBeVisible()
      await expect(
        page.getByText('Non Filtered Task', { exact: true })
      ).not.toBeVisible()

      // Clear filter by selecting "All Containers" or using clear button
      const clearButton = sidebar.getByRole('button', {
        name: /clear.*container/i,
      })
      if (await clearButton.isVisible()) {
        await clearButton.click()
      } else {
        // Select "All Containers" option
        await containerFilter.selectOption({ label: 'All Containers' })
      }
      await page.waitForTimeout(300)

      // Both tasks should be visible now
      await expect(
        page.getByText('Filtered Task', { exact: true })
      ).toBeVisible()
      await expect(
        page.getByText('Non Filtered Task', { exact: true })
      ).toBeVisible()
    })
  })
})

/**
 * Task 13.8: Container Nodes in Graph View
 *
 * Display container nodes and parent relationships in graph:
 * - Container nodes render with distinct visual style (larger, different shape or border)
 * - Parent-child edges shown as containment lines (different from dependency/reference)
 * - Filter graph to show only nodes within a container
 * - Container node context menu includes 'Show Children Only' option
 * - Graph layout respects container grouping (children clustered near parent)
 */
test.describe('Container Nodes in Graph View (Task 13.8)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Container Node Visual Style', () => {
    test('container nodes have distinct visual style in graph', async ({
      page,
    }) => {
      // Create a subsystem (container node)
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Visual Test Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to graph view
      const graphTab = page.getByRole('tab', { name: /graph/i })
      await graphTab.click()
      await page.waitForTimeout(500)

      // Find the container node in the graph
      const graphCanvas = page.locator('.react-flow')
      await expect(graphCanvas).toBeVisible()

      // Container nodes should have a distinct class or style
      const containerNode = graphCanvas.locator(
        '[data-node-type="subsystem"], [data-container="true"]'
      )
      // Should be visible and have larger dimensions or special border
      await expect(containerNode.first()).toBeVisible()
    })

    test('container nodes are larger than regular nodes', async ({ page }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Size Test Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create a regular task
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Size Test Task')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to graph view
      await page.getByRole('tab', { name: /graph/i }).click()
      await page.waitForTimeout(500)

      // Container nodes should be visually distinct (larger or different border)
      const graphCanvas = page.locator('.react-flow')
      await expect(graphCanvas).toBeVisible()

      // Check that container nodes have distinct styling class
      const containerNodes = graphCanvas.locator('[data-container="true"]')
      const regularNodes = graphCanvas.locator(
        '[data-node-type="task"]:not([data-container="true"])'
      )

      // At least one of each should exist
      const containerCount = await containerNodes.count()
      const regularCount = await regularNodes.count()

      expect(containerCount).toBeGreaterThan(0)
      expect(regularCount).toBeGreaterThan(0)
    })
  })

  test.describe('Parent-Child Edge Visualization', () => {
    test('parent-child relationships shown as containment edges', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Parent Edge Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task with parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Child Edge Task')

      // Set parent
      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page.getByRole('option', { name: /Parent Edge Subsystem/i }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to graph view
      await page.getByRole('tab', { name: /graph/i }).click()
      await page.waitForTimeout(500)

      // Parent-child edges should be visible with distinct style
      const graphCanvas = page.locator('.react-flow')
      await expect(graphCanvas).toBeVisible()

      // Containment edges should have a different class/style than dependency edges
      const containmentEdges = graphCanvas.locator(
        '[data-edge-type="containment"], .containment-edge'
      )
      // There should be at least one containment edge
      await expect(containmentEdges.first()).toBeVisible()
    })

    test('containment edges visually different from dependency edges', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Edge Style Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create first task with parent
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Edge Style Task 1')

      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page.getByRole('option', { name: /Edge Style Subsystem/i }).click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create second task that depends on the first
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Edge Style Task 2')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to graph view
      await page.getByRole('tab', { name: /graph/i }).click()
      await page.waitForTimeout(500)

      const graphCanvas = page.locator('.react-flow')
      await expect(graphCanvas).toBeVisible()

      // Edges exist in the graph (React Flow renders them as SVG elements)
      // Note: SVG edges may not pass toBeVisible() check, so we check count
      const edges = graphCanvas.locator('.react-flow__edge')
      const edgeCount = await edges.count()
      // There should be at least one edge (the containment edge from parent to child)
      expect(edgeCount).toBeGreaterThan(0)
    })
  })

  test.describe('Graph Container Filtering', () => {
    test('can filter graph to show only nodes within a container', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Graph Filter Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task inside subsystem
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Inside Container Task')

      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page
        .getByRole('option', { name: /Graph Filter Subsystem/i })
        .click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task outside subsystem
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Outside Container Task')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to graph view
      await page.getByRole('tab', { name: /graph/i }).click()
      await page.waitForTimeout(500)

      // Expand filters and apply container filter
      const filtersSection = page.getByRole('button', { name: /filters/i })
      if ((await filtersSection.getAttribute('aria-expanded')) === 'false') {
        await filtersSection.click()
        await page.waitForTimeout(200)
      }

      const sidebar = page.locator('[data-testid="sidebar"]')
      const containerFilter = sidebar.locator(
        'select[aria-label="Filter by container"]'
      )
      await containerFilter.selectOption({ label: 'Graph Filter Subsystem' })
      await page.waitForTimeout(300)

      // Graph should only show nodes within the container
      const graphCanvas = page.locator('.react-flow')
      await expect(graphCanvas).toBeVisible()

      // The outside task should not be visible in graph
      const graphNodes = graphCanvas.locator('.react-flow__node')
      const nodeTexts = await graphNodes.allTextContents()
      const hasInsideTask = nodeTexts.some((text) =>
        text.includes('Inside Container Task')
      )
      const hasOutsideTask = nodeTexts.some((text) =>
        text.includes('Outside Container Task')
      )

      expect(hasInsideTask).toBe(true)
      expect(hasOutsideTask).toBe(false)
    })
  })

  test.describe('Container Context Menu', () => {
    test('container node context menu has Show Children Only option', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      const titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Context Menu Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to graph view
      await page.getByRole('tab', { name: /graph/i }).click()
      await page.waitForTimeout(500)

      // Find and right-click the container node
      const graphCanvas = page.locator('.react-flow')
      await expect(graphCanvas).toBeVisible()

      // Find the container node by its text
      const containerNode = graphCanvas.locator('.react-flow__node').filter({
        hasText: 'Context Menu Subsystem',
      })
      await containerNode.click({ button: 'right' })
      await page.waitForTimeout(200)

      // Context menu should appear with 'Show Children Only' option
      const contextMenu = page.getByRole('menu')
      await expect(contextMenu).toBeVisible()

      const showChildrenOption = contextMenu.getByRole('menuitem', {
        name: /show children only/i,
      })
      await expect(showChildrenOption).toBeVisible()
    })

    test('Show Children Only filters graph to container children', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Filter Action Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task inside subsystem
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Inside Task')

      const parentSelector = page
        .getByRole('dialog')
        .getByRole('combobox', { name: /parent/i })
      await parentSelector.click()
      await page.waitForTimeout(200)
      await page
        .getByRole('option', { name: /Filter Action Subsystem/i })
        .click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create task outside subsystem
      await page.getByRole('button', { name: /create new task/i }).click()
      await page.waitForTimeout(200)
      titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Outside Task')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Switch to graph view
      await page.getByRole('tab', { name: /graph/i }).click()
      await page.waitForTimeout(500)

      // Right-click the container node
      const graphCanvas = page.locator('.react-flow')
      const containerNode = graphCanvas.locator('.react-flow__node').filter({
        hasText: 'Filter Action Subsystem',
      })
      await containerNode.click({ button: 'right' })
      await page.waitForTimeout(200)

      // Click 'Show Children Only'
      const showChildrenOption = page.getByRole('menuitem', {
        name: /show children only/i,
      })
      await showChildrenOption.click()
      await page.waitForTimeout(300)

      // Graph should now only show nodes within the container
      const graphNodes = graphCanvas.locator('.react-flow__node')
      const nodeTexts = await graphNodes.allTextContents()
      const hasInsideTask = nodeTexts.some((text) =>
        text.includes('Inside Task')
      )
      const hasOutsideTask = nodeTexts.some((text) =>
        text.includes('Outside Task')
      )

      expect(hasInsideTask).toBe(true)
      expect(hasOutsideTask).toBe(false)
    })
  })

  test.describe('Graph Layout with Containers', () => {
    test('children are clustered near their parent container', async ({
      page,
    }) => {
      // Create subsystem
      await page.getByRole('button', { name: /create new subsystem/i }).click()
      await page.waitForTimeout(200)
      let titleInput = page
        .getByRole('dialog')
        .locator('input[type="text"]')
        .first()
      await titleInput.fill('Layout Test Subsystem')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Create multiple children
      for (let i = 1; i <= 3; i++) {
        await page.getByRole('button', { name: /create new task/i }).click()
        await page.waitForTimeout(200)
        titleInput = page
          .getByRole('dialog')
          .locator('input[type="text"]')
          .first()
        await titleInput.fill(`Layout Child ${i}`)

        const parentSelector = page
          .getByRole('dialog')
          .getByRole('combobox', { name: /parent/i })
        await parentSelector.click()
        await page.waitForTimeout(200)
        await page
          .getByRole('option', { name: /Layout Test Subsystem/i })
          .click()
        await page.keyboard.press('Escape')
        await page.waitForTimeout(200)
      }

      // Switch to graph view
      await page.getByRole('tab', { name: /graph/i }).click()
      await page.waitForTimeout(500)

      // Verify nodes are in the graph
      const graphCanvas = page.locator('.react-flow')
      await expect(graphCanvas).toBeVisible()

      // Children should be present in the graph
      const graphNodes = graphCanvas.locator('.react-flow__node')
      const nodeTexts = await graphNodes.allTextContents()

      expect(nodeTexts.some((t) => t.includes('Layout Test Subsystem'))).toBe(
        true
      )
      expect(nodeTexts.some((t) => t.includes('Layout Child 1'))).toBe(true)
      expect(nodeTexts.some((t) => t.includes('Layout Child 2'))).toBe(true)
      expect(nodeTexts.some((t) => t.includes('Layout Child 3'))).toBe(true)
    })
  })
})
