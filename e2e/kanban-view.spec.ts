/**
 * E2E Tests for Kanban View (Task 15.12)
 *
 * Tests verify that:
 * - Kanban view toggle appears alongside Outline and Graph
 * - Ctrl/Cmd+3 keyboard shortcut switches to Kanban view
 * - Tasks are organized in columns by status
 * - Task cards display required information
 * - Drag and drop changes task status
 * - Cards are clickable to open detail panel
 * - Filter integration works
 * - Keyboard navigation works
 * - Respects prefers-reduced-motion
 */

import { test, expect } from '@playwright/test'
import { waitForAppReady } from './test-utils'

// Test nodes for Kanban view with tasks in various statuses
const KANBAN_TEST_NODES = [
  {
    id: 'task-pending-1',
    type: 'task',
    title: 'Design System Architecture',
    tags: ['planning', 'high-priority'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Create the initial system architecture document.',
    status: 'pending',
    priority: 'high',
    dependsOn: [],
    blocks: [],
    checklist: [],
  },
  {
    id: 'task-pending-2',
    type: 'task',
    title: 'Write Unit Tests',
    tags: ['testing'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Write unit tests for core modules.',
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  },
  {
    id: 'task-in-progress-1',
    type: 'task',
    title: 'Implement Authentication',
    tags: ['development', 'security'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Implement user authentication flow.',
    status: 'in_progress',
    priority: 'high',
    dependsOn: [],
    blocks: [],
    checklist: [],
  },
  {
    id: 'task-in-progress-2',
    type: 'task',
    title: 'Build API Endpoints',
    tags: ['development', 'backend'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Create REST API endpoints.',
    status: 'in_progress',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  },
  {
    id: 'task-blocked-1',
    type: 'task',
    title: 'Deploy to Production',
    tags: ['deployment'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Deploy application to production servers.',
    status: 'blocked',
    priority: 'high',
    dependsOn: ['task-in-progress-1'],
    blocks: [],
    checklist: [],
  },
  {
    id: 'task-complete-1',
    type: 'task',
    title: 'Setup Repository',
    tags: ['setup'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Initialize git repository and project structure.',
    status: 'complete',
    priority: 'low',
    dependsOn: [],
    blocks: [],
    checklist: [],
  },
  {
    id: 'task-complete-2',
    type: 'task',
    title: 'Configure CI/CD',
    tags: ['setup', 'devops'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Set up continuous integration pipeline.',
    status: 'complete',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  },
  // Non-task nodes for filter tests
  {
    id: 'note-1',
    type: 'note',
    title: 'Project Notes',
    tags: ['documentation'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'General project notes.',
  },
  {
    id: 'decision-1',
    type: 'decision',
    title: 'Technology Stack',
    tags: ['planning'],
    dates: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    content: 'Decide on technology stack.',
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
  },
]

/**
 * Set up test nodes for Kanban tests
 */
async function setupKanbanTestNodes(page: import('@playwright/test').Page) {
  await page.evaluate((nodes) => {
    const event = new CustomEvent('e2e-setup-nodes', {
      detail: { nodes },
    })
    window.dispatchEvent(event)
  }, KANBAN_TEST_NODES)

  await page.waitForTimeout(500)
}

test.describe('Kanban View (15.12)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupKanbanTestNodes(page)
  })

  // ===========================================================================
  // View Toggle
  // ===========================================================================

  test.describe('View Toggle', () => {
    test('Kanban tab appears in view toggle alongside Outline and Graph', async ({
      page,
    }) => {
      // Find the view toggle tablist
      const tablist = page.getByRole('tablist', { name: /view mode/i })
      await expect(tablist).toBeVisible()

      // Check all three tabs are present
      const outlineTab = page.getByRole('tab', { name: /outline/i })
      const graphTab = page.getByRole('tab', { name: /graph/i })
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })

      await expect(outlineTab).toBeVisible()
      await expect(graphTab).toBeVisible()
      await expect(kanbanTab).toBeVisible()
    })

    test('clicking Kanban tab switches to Kanban view', async ({ page }) => {
      // Click Kanban tab
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)

      // Tab should be selected
      await expect(kanbanTab).toHaveAttribute('aria-selected', 'true')

      // Kanban view should be visible (check for kanban columns)
      const kanbanColumn = page.getByTestId('kanban-column-pending')
      await expect(kanbanColumn).toBeVisible()
    })

    test('Ctrl/Cmd+3 keyboard shortcut switches to Kanban view', async ({
      page,
    }) => {
      const isMac = process.platform === 'darwin'
      const modifier = isMac ? 'Meta' : 'Control'

      // Press keyboard shortcut
      await page.keyboard.press(`${modifier}+3`)
      await page.waitForTimeout(200)

      // Kanban tab should be selected
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await expect(kanbanTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  // ===========================================================================
  // Kanban Columns
  // ===========================================================================

  test.describe('Kanban Columns', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Kanban view
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('displays columns for each task status', async ({ page }) => {
      // Check for status columns
      const pendingColumn = page.getByTestId('kanban-column-pending')
      const inProgressColumn = page.getByTestId('kanban-column-in_progress')
      const blockedColumn = page.getByTestId('kanban-column-blocked')
      const completeColumn = page.getByTestId('kanban-column-complete')

      await expect(pendingColumn).toBeVisible()
      await expect(inProgressColumn).toBeVisible()
      await expect(blockedColumn).toBeVisible()
      await expect(completeColumn).toBeVisible()
    })

    test('column headers show task counts', async ({ page }) => {
      // Pending column should show 2 tasks
      const pendingHeader = page
        .getByTestId('kanban-column-pending')
        .locator('h3')
      await expect(pendingHeader).toContainText('2')

      // In Progress column should show 2 tasks
      const inProgressHeader = page
        .getByTestId('kanban-column-in_progress')
        .locator('h3')
      await expect(inProgressHeader).toContainText('2')

      // Blocked column should show 1 task
      const blockedHeader = page
        .getByTestId('kanban-column-blocked')
        .locator('h3')
      await expect(blockedHeader).toContainText('1')

      // Complete column should show 2 tasks
      const completeHeader = page
        .getByTestId('kanban-column-complete')
        .locator('h3')
      await expect(completeHeader).toContainText('2')
    })

    test('empty column shows helpful drop zone text', async ({ page }) => {
      // Create nodes without any blocked tasks to test empty column
      await page.evaluate(() => {
        const event = new CustomEvent('e2e-clear-nodes')
        window.dispatchEvent(event)
      })
      await page.waitForTimeout(200)

      // Set up nodes without blocked tasks
      const nodesWithoutBlocked = KANBAN_TEST_NODES.filter(
        (n) => n.type !== 'task' || n.status !== 'blocked'
      )
      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: { nodes },
        })
        window.dispatchEvent(event)
      }, nodesWithoutBlocked)
      await page.waitForTimeout(300)

      // Blocked column should show empty state
      const blockedColumn = page.getByTestId('kanban-column-blocked')
      const emptyText = blockedColumn.getByText(/drop.*here|no tasks/i)
      await expect(emptyText).toBeVisible()
    })
  })

  // ===========================================================================
  // Task Cards
  // ===========================================================================

  test.describe('Task Cards', () => {
    test.beforeEach(async ({ page }) => {
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('task cards show title', async ({ page }) => {
      // Find a task card
      const taskCard = page.getByTestId('kanban-card-task-pending-1')
      await expect(taskCard).toBeVisible()

      // Card should show title
      await expect(taskCard).toContainText('Design System Architecture')
    })

    test('task cards show priority badge', async ({ page }) => {
      // High priority task should show priority indicator
      const highPriorityCard = page.getByTestId('kanban-card-task-pending-1')
      await expect(highPriorityCard).toBeVisible()

      // Priority badge should be visible within the card
      const priorityBadge = highPriorityCard
        .locator('span')
        .filter({ hasText: /^high$/i })
      await expect(priorityBadge).toBeVisible()
    })

    test('task cards show blocked indicator for blocked tasks', async ({
      page,
    }) => {
      // Blocked task should show blocked indicator
      const blockedCard = page.getByTestId('kanban-card-task-blocked-1')
      await expect(blockedCard).toBeVisible()

      // Should have blocked text or indicator
      const blockedText = blockedCard.getByText(/blocked/i)
      await expect(blockedText).toBeVisible()
    })

    test('task cards show tags', async ({ page }) => {
      // Card with tags should display them
      const taskCard = page.getByTestId('kanban-card-task-pending-1')

      // Should show at least one tag
      const tag = taskCard.getByText('planning')
      await expect(tag).toBeVisible()
    })

    test('clicking card opens detail panel', async ({ page }) => {
      // Click on a task card
      const taskCard = page.getByTestId('kanban-card-task-pending-1')
      await taskCard.click()
      await page.waitForTimeout(300)

      // Detail panel should open
      const detailPanel = page.getByTestId('detail-panel')
      await expect(detailPanel).toBeVisible()

      // Detail panel should have the task title in aria-label
      await expect(detailPanel).toHaveAttribute(
        'aria-label',
        /Design System Architecture/i
      )
    })
  })

  // ===========================================================================
  // Drag and Drop
  // ===========================================================================

  test.describe('Drag and Drop', () => {
    test.beforeEach(async ({ page }) => {
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('dragging card between columns changes task status', async ({
      page,
    }) => {
      // Get the pending task card
      const pendingCard = page.getByTestId('kanban-card-task-pending-1')
      const inProgressColumn = page.getByTestId('kanban-column-in_progress')

      // Perform drag and drop
      await pendingCard.dragTo(inProgressColumn)
      await page.waitForTimeout(300)

      // Card should now be in the In Progress column
      const cardInNewColumn = inProgressColumn.getByTestId(
        'kanban-card-task-pending-1'
      )
      await expect(cardInNewColumn).toBeVisible()
    })

    test('dragging respects prefers-reduced-motion', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' })

      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)

      // Get a card
      const card = page.getByTestId('kanban-card-task-pending-1')

      // Verify card has reduced-motion styles
      const hasReducedMotion = await card.evaluate((el) => {
        const style = window.getComputedStyle(el)
        // Check that transitions are minimal or instant
        return (
          style.transitionDuration === '0s' ||
          style.animationDuration === '0s' ||
          el.classList.contains('motion-reduce') ||
          el.getAttribute('data-reduced-motion') === 'true'
        )
      })

      // This is a soft check - the important thing is no animation errors
      expect(hasReducedMotion).toBeTruthy()
    })
  })

  // ===========================================================================
  // Filters
  // ===========================================================================

  test.describe('Filter Integration', () => {
    test.beforeEach(async ({ page }) => {
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('tag filter applies to Kanban view', async ({ page }) => {
      // Apply tag filter via URL query param
      await page.goto('/?tags=development')
      await waitForAppReady(page)

      // Setup nodes again after navigation
      await setupKanbanTestNodes(page)

      // Switch to Kanban
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(300)

      // Only tasks with 'development' tag should be visible
      // task-in-progress-1 has 'development' tag
      const authCard = page.getByTestId('kanban-card-task-in-progress-1')
      await expect(authCard).toBeVisible()

      // Tasks without 'development' tag should not be visible
      // task-pending-1 has 'planning' tag, not 'development'
      const pendingCard = page.getByTestId('kanban-card-task-pending-1')
      await expect(pendingCard).not.toBeVisible()
    })

    test('only task nodes appear in Kanban (not notes/decisions)', async ({
      page,
    }) => {
      // Kanban should only show tasks, not notes or decisions
      const kanbanPanel = page.getByRole('tabpanel', { name: /kanban/i })

      // Should not find the note
      const noteCard = kanbanPanel.getByText('Project Notes')
      await expect(noteCard).not.toBeVisible()

      // Should not find the decision
      const decisionCard = kanbanPanel.getByText('Technology Stack')
      await expect(decisionCard).not.toBeVisible()
    })
  })

  // ===========================================================================
  // Keyboard Navigation
  // ===========================================================================

  test.describe('Keyboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('Tab navigates between cards', async ({ page }) => {
      // Focus the first card
      const firstCard = page.getByTestId('kanban-card-task-pending-1')
      await firstCard.focus()

      // Tab should move to next focusable element
      await page.keyboard.press('Tab')

      // Another card or column should be focused
      const focused = page.locator(':focus')
      await expect(focused).toBeVisible()
    })

    test('Enter on focused card opens detail panel', async ({ page }) => {
      // Focus a card
      const card = page.getByTestId('kanban-card-task-pending-1')
      await card.focus()

      // Press Enter
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)

      // Detail panel should open
      const detailPanel = page.getByTestId('detail-panel')
      await expect(detailPanel).toBeVisible()
    })

    test('arrow keys navigate between cards in column', async ({ page }) => {
      // Focus a card in pending column
      const firstCard = page.getByTestId('kanban-card-task-pending-1')
      await firstCard.focus()
      await expect(firstCard).toBeFocused()

      // Press ArrowDown
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(100)

      // Second card in column should be focused
      const secondCard = page.getByTestId('kanban-card-task-pending-2')
      await expect(secondCard).toBeFocused()
    })
  })

  // ===========================================================================
  // Quick Actions
  // ===========================================================================

  test.describe('Quick Actions', () => {
    test.beforeEach(async ({ page }) => {
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('hovering card reveals quick actions', async ({ page }) => {
      // Hover over a card
      const card = page.getByTestId('kanban-card-task-pending-1')
      await card.hover()
      await page.waitForTimeout(200)

      // Quick action buttons should be visible
      const quickActions = card.locator('[data-testid="quick-actions"]')
      await expect(quickActions).toBeVisible()
    })

    test('mark complete quick action changes status', async ({ page }) => {
      // Hover over a pending task card
      const card = page.getByTestId('kanban-card-task-pending-1')
      await card.hover()
      await page.waitForTimeout(200)

      // Click mark complete button
      const completeButton = card.getByRole('button', {
        name: /complete|done|check/i,
      })
      await completeButton.click()
      await page.waitForTimeout(300)

      // Card should move to complete column
      const completeColumn = page.getByTestId('kanban-column-complete')
      const movedCard = completeColumn.getByTestId('kanban-card-task-pending-1')
      await expect(movedCard).toBeVisible()
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('columns have proper ARIA labels', async ({ page }) => {
      // Columns should have accessible names
      const pendingColumn = page.getByTestId('kanban-column-pending')
      await expect(pendingColumn).toHaveAttribute('aria-label', /pending/i)

      const inProgressColumn = page.getByTestId('kanban-column-in_progress')
      await expect(inProgressColumn).toHaveAttribute(
        'aria-label',
        /in.?progress/i
      )
    })

    test('cards are focusable and have proper roles', async ({ page }) => {
      const card = page.getByTestId('kanban-card-task-pending-1')

      // Card should be focusable
      await card.focus()
      await expect(card).toBeFocused()

      // Card should have button or article role
      const role = await card.getAttribute('role')
      expect(['button', 'article', 'listitem']).toContain(role)
    })

    test('drag handles have accessible names', async ({ page }) => {
      const card = page.getByTestId('kanban-card-task-pending-1')

      // Look for drag handle
      const dragHandle = card.locator('[data-drag-handle="true"]')
      if (await dragHandle.isVisible()) {
        await expect(dragHandle).toHaveAttribute('aria-label', /drag|move/i)
      }
    })
  })

  // ===========================================================================
  // Column Collapse
  // ===========================================================================

  test.describe('Column Collapse', () => {
    test.beforeEach(async ({ page }) => {
      const kanbanTab = page.getByRole('tab', { name: /kanban/i })
      await kanbanTab.click()
      await page.waitForTimeout(200)
    })

    test('columns can be collapsed', async ({ page }) => {
      // Find collapse button on complete column
      const completeColumn = page.getByTestId('kanban-column-complete')
      const collapseButton = completeColumn.getByRole('button', {
        name: /collapse|hide|minimize/i,
      })

      if (await collapseButton.isVisible()) {
        await collapseButton.click()
        await page.waitForTimeout(200)

        // Column should be collapsed (narrow width or hidden content)
        const isCollapsed = await completeColumn.evaluate((el) => {
          return (
            el.getAttribute('data-collapsed') === 'true' ||
            el.classList.contains('collapsed')
          )
        })
        expect(isCollapsed).toBeTruthy()
      }
    })
  })
})
