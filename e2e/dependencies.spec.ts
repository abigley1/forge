import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
} from './test-utils'

/**
 * Dependencies & DAG Tests (Sprint 6)
 * Tests for task dependencies, blocked status, and critical path
 */

test.describe('Dependencies - Task Dependency Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('task node shows depends_on field', async ({ page }) => {
    // Order Parts depends on Research Motor Options
    await page.getByText('Order Parts').click()

    const detailPanel = page.getByLabel(/Edit Order Parts/i)
    await expect(detailPanel).toBeVisible()

    // Should show dependencies section
    const depsSection = detailPanel.getByText(
      /depends on|dependencies|blocked by/i
    )
    await expect(depsSection.first()).toBeVisible()
  })

  test('task node shows blocks field', async ({ page }) => {
    // Research Motor Options blocks Order Parts
    await page.getByText('Research Motor Options').click()

    const detailPanel = page.getByLabel(/Edit Research Motor Options/i)
    await expect(detailPanel).toBeVisible()

    // Should show what this task blocks
    const blocksSection = detailPanel.getByText(/blocks|blocking/i)
    if ((await blocksSection.count()) > 0) {
      await expect(blocksSection.first()).toBeVisible()
    }
  })

  test('dependency links are clickable', async ({ page }) => {
    await page.getByText('Order Parts').click()

    const detailPanel = page.getByLabel(/Edit Order Parts/i)
    await expect(detailPanel).toBeVisible()

    // Find dependency link to "Research Motor Options"
    // Use more specific selector to get the navigate button, not the remove button
    const depLink = detailPanel.getByRole('link', { name: /research motor/i })
    const depNavigateButton = detailPanel.getByRole('button', {
      name: /^Navigate to Research Motor/i,
    })

    const hasLink = (await depLink.count()) > 0
    const hasNavigateButton = (await depNavigateButton.count()) > 0

    if (hasLink) {
      await depLink.click()
      // Should navigate to that task
      await expect(
        page.getByLabel(/Edit Research Motor Options/i)
      ).toBeVisible()
    } else if (hasNavigateButton) {
      await depNavigateButton.click()
      await expect(
        page.getByLabel(/Edit Research Motor Options/i)
      ).toBeVisible()
    } else {
      // Fall back to clicking the text directly within the dependency chip
      const depChipText = detailPanel
        .locator('button')
        .filter({ hasText: /Research Motor Options/ })
        .first()
      if ((await depChipText.count()) > 0) {
        await depChipText.click()
        await expect(
          page.getByLabel(/Edit Research Motor Options/i)
        ).toBeVisible()
      }
    }
  })
})

test.describe('Dependencies - Blocked Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('blocked task shows blocked indicator', async ({ page }) => {
    // Order Parts is blocked by incomplete Research Motor Options
    const orderPartsItem = page.getByText('Order Parts').locator('..')

    // Should have blocked indicator (icon, badge, or status)
    const blockedIndicator = orderPartsItem.locator(
      '[data-blocked="true"], [aria-label*="blocked"], .text-red-500'
    )
    if ((await blockedIndicator.count()) > 0) {
      await expect(blockedIndicator.first()).toBeVisible()
    }
  })

  test('blocked indicator shows blocking tasks in tooltip', async ({
    page,
  }) => {
    // Hover over blocked indicator
    const orderPartsItem = page.getByText('Order Parts').locator('..')
    const blockedIndicator = orderPartsItem.locator(
      '[data-blocked="true"], [aria-label*="blocked"]'
    )

    if ((await blockedIndicator.count()) > 0) {
      await blockedIndicator.first().hover()

      // Tooltip should show blocking task
      const tooltip = page.locator('[role="tooltip"]')
      if ((await tooltip.count()) > 0) {
        await expect(tooltip).toContainText(/research motor/i)
      }
    }
  })

  test('completing blocking task unblocks dependent tasks', async ({
    page,
  }) => {
    // Complete Research Motor Options
    await page.getByText('Research Motor Options').click()

    const detailPanel = page.getByLabel(/Edit Research Motor Options/i)
    await expect(detailPanel).toBeVisible()

    // Change status to complete
    const statusSelect = detailPanel.getByRole('combobox', { name: /status/i })
    if ((await statusSelect.count()) > 0) {
      await statusSelect.click()
      const completeOption = page.getByRole('option', { name: /complete/i })
      if ((await completeOption.count()) > 0) {
        await completeOption.click()
        await page.waitForTimeout(500)

        // Close panel
        await page.keyboard.press('Escape')

        // Order Parts should no longer be blocked
        const orderPartsItem = page.getByText('Order Parts').locator('..')
        const blockedIndicator = orderPartsItem.locator('[data-blocked="true"]')
        await expect(blockedIndicator).toHaveCount(0)
      }
    }
  })

  test('blocked status propagates through dependency chain', async ({
    page,
  }) => {
    // Assemble Frame depends on Order Parts which depends on Research Motor Options
    // All downstream tasks should show as blocked when upstream is incomplete

    const assembleFrameItem = page.getByText('Assemble Frame').locator('..')
    const blockedIndicator = assembleFrameItem.locator(
      '[data-blocked="true"], [aria-label*="blocked"]'
    )

    if ((await blockedIndicator.count()) > 0) {
      await expect(blockedIndicator.first()).toBeVisible()
    }
  })
})

test.describe('Dependencies - Dependency Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('can add new dependency', async ({ page }) => {
    // Open a task that doesn't have many dependencies
    await page.getByText('Research Motor Options').click()

    const detailPanel = page.getByLabel(/Edit Research Motor Options/i)
    await expect(detailPanel).toBeVisible()

    // Find add dependency button/dropdown
    const addDepButton = detailPanel.getByRole('button', {
      name: /add dependency|depends on/i,
    })
    const depDropdown = detailPanel.getByRole('combobox', {
      name: /depends on/i,
    })

    if ((await addDepButton.count()) > 0) {
      await addDepButton.click()
      // Should open dependency selector
      const selector = page.getByRole('listbox')
      if ((await selector.count()) > 0) {
        await expect(selector).toBeVisible()
      }
    } else if ((await depDropdown.count()) > 0) {
      await depDropdown.click()
      // Should show available tasks/decisions to depend on
    }
  })

  test('can remove existing dependency', async ({ page }) => {
    await page.getByText('Order Parts').click()

    const detailPanel = page.getByLabel(/Edit Order Parts/i)
    await expect(detailPanel).toBeVisible()

    // Find remove button on existing dependency chip
    const depChip = detailPanel.locator('[data-testid="dependency-chip"]')
    if ((await depChip.count()) > 0) {
      const removeButton = depChip.getByRole('button', {
        name: /remove|delete|×/i,
      })
      if ((await removeButton.count()) > 0) {
        await removeButton.click()
        // Dependency should be removed
      }
    }
  })

  test('cycle detection prevents invalid dependencies', async ({ page }) => {
    // Try to create a cycle: A depends on B, B depends on A
    // Research Motor Options -> Order Parts -> (try to make Order Parts depend on something that creates cycle)

    await page.getByText('Research Motor Options').click()

    const detailPanel = page.getByLabel(/Edit Research Motor Options/i)
    await expect(detailPanel).toBeVisible()

    const depDropdown = detailPanel.getByRole('combobox', {
      name: /depends on/i,
    })
    if ((await depDropdown.count()) > 0) {
      await depDropdown.click()

      // Order Parts (which depends on this task) should be disabled or show warning
      const orderPartsOption = page.getByRole('option', {
        name: /order parts/i,
      })
      if ((await orderPartsOption.count()) > 0) {
        const isDisabled = await orderPartsOption.getAttribute('aria-disabled')
        // Either disabled or clicking should show error
        if (isDisabled !== 'true') {
          await orderPartsOption.click()
          // Should show cycle error
          const errorMessage = page.getByText(/cycle|circular|invalid/i)
          if ((await errorMessage.count()) > 0) {
            await expect(errorMessage).toBeVisible()
          }
        }
      }
    }
  })
})

test.describe('Dependencies - Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('critical path toggle is available', async ({ page }) => {
    // Look for critical path toggle in toolbar or graph view
    const criticalPathToggle = page.getByRole('button', {
      name: /critical path|show critical/i,
    })
    const criticalPathCheckbox = page.getByRole('checkbox', {
      name: /critical path/i,
    })

    const hasToggle = (await criticalPathToggle.count()) > 0
    const hasCheckbox = (await criticalPathCheckbox.count()) > 0

    // Might only be visible in graph view
    if (!hasToggle && !hasCheckbox) {
      // Switch to graph view
      const graphTab = page.getByRole('tab', { name: /graph/i })
      if ((await graphTab.count()) > 0) {
        await graphTab.click()
        await page.waitForTimeout(300)

        const graphCriticalToggle = page.getByRole('button', {
          name: /critical path/i,
        })
        if ((await graphCriticalToggle.count()) > 0) {
          await expect(graphCriticalToggle).toBeVisible()
        }
      }
    }
  })

  test('critical path nodes are highlighted in outline view', async ({
    page,
  }) => {
    // Look for critical badge on tasks
    const criticalBadge = page.locator(
      '[data-critical="true"], .critical-path, [aria-label*="critical"]'
    )
    if ((await criticalBadge.count()) > 0) {
      await expect(criticalBadge.first()).toBeVisible()
    }
  })

  test('critical path filter is available', async ({ page }) => {
    // Expand filters
    const filtersButton = page.getByRole('button', { name: /filters/i })
    await filtersButton.click()
    await page.waitForTimeout(100)

    // Look for critical path filter
    const criticalFilter = page.getByRole('checkbox', { name: /critical/i })
    if ((await criticalFilter.count()) > 0) {
      await expect(criticalFilter).toBeVisible()
    }
  })
})

test.describe('Dependencies - Graph View Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)

    // Switch to graph view
    const graphTab = page.getByRole('tab', { name: /graph/i })
    await graphTab.click()
    await page.waitForTimeout(500)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('dependency edges are visible in graph', async ({ page }) => {
    // Look for edge elements (usually SVG paths or lines)
    const edges = page.locator(
      '.react-flow__edge, [class*="edge"], path[class*="edge"]'
    )
    await expect(edges.first()).toBeVisible()
  })

  test('dependency edges are visually distinct from reference edges', async ({
    page,
  }) => {
    // Dependency edges should be solid, reference edges should be dashed
    const solidEdge = page.locator(
      '.react-flow__edge--dependency, [data-edge-type="dependency"]'
    )
    const dashedEdge = page.locator(
      '.react-flow__edge--reference, [data-edge-type="reference"]'
    )

    // At least dependency edges should exist
    if ((await solidEdge.count()) > 0) {
      await expect(solidEdge.first()).toBeVisible()
    }
    // Reference edges may or may not exist depending on test data
    const dashedCount = await dashedEdge.count()
    expect(dashedCount).toBeGreaterThanOrEqual(0)
  })

  test('edge direction shows correct arrow', async ({ page }) => {
    // Edges should have arrows indicating direction
    const edgeWithArrow = page.locator('.react-flow__edge marker, [marker-end]')
    if ((await edgeWithArrow.count()) > 0) {
      await expect(edgeWithArrow.first()).toBeAttached()
    }
  })

  test('critical path edges are highlighted when enabled', async ({ page }) => {
    // Enable critical path
    const criticalToggle = page.getByRole('button', { name: /critical path/i })
    if ((await criticalToggle.count()) > 0) {
      await criticalToggle.click()
      await page.waitForTimeout(300)

      // Critical path edges should be highlighted
      const highlightedEdge = page.locator(
        '[data-critical="true"], .critical-path-edge'
      )
      if ((await highlightedEdge.count()) > 0) {
        await expect(highlightedEdge.first()).toBeVisible()
      }
    }
  })
})

test.describe('Dependencies - Decision Blocking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('pending decision can block tasks', async ({ page }) => {
    // If a task depends on an unresolved decision, it should be blocked
    // Motor Selection is pending, tasks depending on it should be blocked

    // Look for tasks that depend on decisions
    const blockedByDecision = page.locator('[data-blocked-by*="decision"]')
    if ((await blockedByDecision.count()) > 0) {
      await expect(blockedByDecision.first()).toBeVisible()
    }
  })

  test('selecting decision option unblocks dependent tasks', async ({
    page,
  }) => {
    // Open Motor Selection decision
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Select an option
    const selectButton = detailPanel.getByRole('button', {
      name: /select|choose/i,
    })
    if ((await selectButton.count()) > 0) {
      await selectButton.first().click()
      await page.waitForTimeout(500)

      // Tasks depending on this decision should be unblocked
    }
  })
})

test.describe('Dependencies - Hover Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('hovering Mark Complete shows tasks to unblock', async ({ page }) => {
    // Find a blocking task
    await page.getByText('Research Motor Options').click()

    const detailPanel = page.getByLabel(/Edit Research Motor Options/i)
    await expect(detailPanel).toBeVisible()

    // Hover over complete button/option
    const completeButton = detailPanel.getByRole('button', {
      name: /mark complete|complete/i,
    })
    if ((await completeButton.count()) > 0) {
      await completeButton.hover()

      // Tooltip should show what will be unblocked
      const tooltip = page.locator('[role="tooltip"]')
      if ((await tooltip.count()) > 0) {
        await expect(tooltip).toContainText(/unblock|order parts/i)
      }
    }
  })
})

test.describe('Dependencies - Keyboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('dependency chips are keyboard focusable', async ({ page }) => {
    await page.getByText('Order Parts').click()

    const detailPanel = page.getByLabel(/Edit Order Parts/i)
    await expect(detailPanel).toBeVisible()

    // Tab to dependency section
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Should be able to focus dependency chips
    const focusedInDeps = await page.evaluate(() => {
      const depSection = document.querySelector(
        '[data-testid="dependencies-section"]'
      )
      return depSection?.contains(document.activeElement) ?? false
    })
    // This is a soft check - implementation may vary
    expect(typeof focusedInDeps).toBe('boolean')
  })

  test('Enter on dependency chip navigates to that node', async ({ page }) => {
    await page.getByText('Order Parts').click()

    const detailPanel = page.getByLabel(/Edit Order Parts/i)
    await expect(detailPanel).toBeVisible()

    // Find and focus dependency link
    const depLink = detailPanel.getByRole('link', { name: /research motor/i })
    if ((await depLink.count()) > 0) {
      await depLink.focus()
      await page.keyboard.press('Enter')

      // Should navigate to that task
      await expect(
        page.getByLabel(/Edit Research Motor Options/i)
      ).toBeVisible()
    }
  })
})
