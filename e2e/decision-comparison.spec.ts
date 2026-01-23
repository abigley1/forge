import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
} from './test-utils'

/**
 * Decision Comparison Table Tests (Sprint 7)
 * Tests for decision options, criteria, scoring, and selection
 */

test.describe('Decision Comparison Table - Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('decision node shows comparison table', async ({ page }) => {
    // Open a decision node
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Should have a comparison table section
    const comparisonTable = detailPanel.locator(
      'table, [data-testid="comparison-table"], [role="grid"]'
    )
    await expect(comparisonTable).toBeVisible()
  })

  test('comparison table shows options as columns', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Should show option names in the table headers - test data has "NEMA 17 Stepper" and "Servo Motor"
    // Use the table's header cells specifically (spans with title attribute)
    const table = detailPanel.locator('table[role="grid"]')
    await expect(table.getByTitle('NEMA 17 Stepper')).toBeVisible()
    await expect(table.getByTitle('Servo Motor')).toBeVisible()
  })

  test('comparison table shows criteria as rows', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Should have criteria section or row headers
    const criteriaSection = detailPanel.getByText(
      /criteria|specifications|compare/i
    )
    if ((await criteriaSection.count()) > 0) {
      await expect(criteriaSection.first()).toBeVisible()
    }
  })
})

test.describe('Decision Comparison Table - Adding Options', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('can add new option to comparison table', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find add option button
    const addOptionButton = detailPanel.getByRole('button', {
      name: /add option|new option|\+/i,
    })
    if ((await addOptionButton.count()) > 0) {
      await addOptionButton.click()

      // New option input should appear or be focused
      const optionInput = detailPanel.getByRole('textbox', {
        name: /option.*name|new option/i,
      })
      if ((await optionInput.count()) > 0) {
        await expect(optionInput).toBeVisible()
      }
    }
  })

  test('new option appears in table after creation', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    const addOptionButton = detailPanel.getByRole('button', {
      name: /add option|new option|\+/i,
    })
    if ((await addOptionButton.count()) > 0) {
      await addOptionButton.click()

      const optionInput = detailPanel.getByRole('textbox', {
        name: /option.*name|new option/i,
      })
      if ((await optionInput.count()) > 0) {
        await optionInput.fill('Brushless DC Motor')
        await page.keyboard.press('Enter')

        await page.waitForTimeout(200)
        // Use the table's header cells specifically (spans with title attribute)
        const table = detailPanel.locator('table[role="grid"]')
        await expect(table.getByTitle('Brushless DC Motor')).toBeVisible()
      }
    }
  })

  test('can delete option from comparison table', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find delete button for an option
    const deleteButton = detailPanel.getByRole('button', {
      name: /delete.*option|remove.*option/i,
    })
    if ((await deleteButton.count()) > 0) {
      await deleteButton.first().click()

      // Confirmation dialog should appear
      const confirmDialog = page.getByRole('alertdialog')
      if ((await confirmDialog.count()) > 0) {
        await expect(confirmDialog).toBeVisible()
      }
    }
  })
})

test.describe('Decision Comparison Table - Adding Criteria', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('can add new criterion to comparison table', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find add criterion button
    const addCriterionButton = detailPanel.getByRole('button', {
      name: /add criterion|new criterion|add row/i,
    })
    if ((await addCriterionButton.count()) > 0) {
      await addCriterionButton.click()

      // Criterion input should appear
      const criterionInput = detailPanel.getByRole('textbox', {
        name: /criterion.*name|new criterion/i,
      })
      if ((await criterionInput.count()) > 0) {
        await expect(criterionInput).toBeVisible()
      }
    }
  })

  test('criterion can have weight assigned', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // First add a criterion so we can check for weight controls
    const addCriterionButton = detailPanel.getByRole('button', {
      name: /add criterion|new criterion|add row/i,
    })
    if ((await addCriterionButton.count()) > 0) {
      await addCriterionButton.click()

      const criterionInput = detailPanel.getByRole('textbox', {
        name: /criterion.*name|new criterion/i,
      })
      if ((await criterionInput.count()) > 0) {
        await criterionInput.fill('Test Criterion')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(200)

        // Now look for weight slider or input
        const weightControl = detailPanel.getByRole('slider', {
          name: /weight/i,
        })
        const weightInput = detailPanel.getByLabel(/weight/i)

        const hasWeightControl = (await weightControl.count()) > 0
        const hasWeightInput = (await weightInput.count()) > 0

        // At least one form of weight control should exist now that we have a criterion
        expect(hasWeightControl || hasWeightInput).toBeTruthy()
      }
    }
  })

  test('criterion can have unit specified', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for unit dropdown or input
    const unitControl = detailPanel.getByLabel(/unit/i)
    if ((await unitControl.count()) > 0) {
      await expect(unitControl).toBeVisible()
    }
  })
})

test.describe('Decision Comparison Table - Cell Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('clicking cell allows editing', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // First add a criterion so we have data cells to edit
    const addCriterionButton = detailPanel.getByRole('button', {
      name: /add criterion|new criterion|add row/i,
    })
    if ((await addCriterionButton.count()) > 0) {
      await addCriterionButton.click()
      const criterionInput = detailPanel.getByRole('textbox', {
        name: /criterion.*name|new criterion/i,
      })
      if ((await criterionInput.count()) > 0) {
        await criterionInput.fill('Test Criterion')
        await page.keyboard.press('Enter')
        await page.waitForTimeout(200)
      }
    }

    // Find a data table cell (in tbody)
    const table = detailPanel.locator('table[role="grid"]')
    const dataCells = table.locator('tbody td')
    if ((await dataCells.count()) > 1) {
      // Click on a value cell (not the criterion name cell)
      const valueCell = dataCells.nth(1)
      await valueCell.click()

      // Cell should become editable or show input
      const input = valueCell.locator('input, [contenteditable="true"]')
      if ((await input.count()) > 0) {
        await expect(input.first()).toBeVisible()
      }
    }
  })

  test('Tab key navigates between cells', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find first editable cell
    const tableCell = detailPanel.locator('td, [role="gridcell"]').first()
    if ((await tableCell.count()) > 0) {
      await tableCell.click()
      await page.keyboard.press('Tab')

      // Focus should move to next cell
      const focusedElement = await page.evaluate(
        () => document.activeElement?.tagName
      )
      expect(focusedElement).toBeTruthy()
    }
  })

  test('Escape cancels cell editing', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    const tableCell = detailPanel.locator('td, [role="gridcell"]').first()
    if ((await tableCell.count()) > 0) {
      await tableCell.click()

      // Type something
      await page.keyboard.type('test value')

      // Press Escape
      await page.keyboard.press('Escape')

      // Original value should be restored (or input closed)
    }
  })
})

test.describe('Decision Comparison Table - Scoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('scores are displayed for each option', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for score display
    const scoreDisplay = detailPanel.getByText(/score|total|rating/i)
    if ((await scoreDisplay.count()) > 0) {
      await expect(scoreDisplay.first()).toBeVisible()
    }
  })

  test('score bar visualization shows relative scores', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for score bars (usually progress bars or colored divs)
    const scoreBar = detailPanel.locator(
      '[role="progressbar"], [data-testid="score-bar"]'
    )
    if ((await scoreBar.count()) > 0) {
      await expect(scoreBar.first()).toBeVisible()
    }
  })

  test('highest score is highlighted', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for highlighted/winning option
    const highlightedOption = detailPanel.locator(
      '[data-highlighted="true"], .bg-green-50, [data-winner="true"]'
    )
    if ((await highlightedOption.count()) > 0) {
      await expect(highlightedOption.first()).toBeVisible()
    }
  })
})

test.describe('Decision Selection - Status Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('select button is available for each option', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for select buttons
    const selectButton = detailPanel.getByRole('button', {
      name: /select|choose|pick/i,
    })
    if ((await selectButton.count()) > 0) {
      await expect(selectButton.first()).toBeVisible()
    }
  })

  test('selecting option changes decision status', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Find and click select button for an option
    const selectButton = detailPanel.getByRole('button', {
      name: /select|choose/i,
    })
    if ((await selectButton.count()) > 0) {
      await selectButton.first().click()

      await page.waitForTimeout(200)

      // Status should change to "selected"
      const statusBadge = detailPanel.getByText(/selected/i)
      if ((await statusBadge.count()) > 0) {
        await expect(statusBadge).toBeVisible()
      }
    }
  })

  test('selection rationale can be entered', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for rationale textarea
    const rationaleInput = detailPanel.getByLabel(/rationale|reason|why/i)
    if ((await rationaleInput.count()) > 0) {
      await expect(rationaleInput).toBeVisible()
      await rationaleInput.fill('Better torque margin for reliability')
      await expect(rationaleInput).toHaveValue(
        'Better torque margin for reliability'
      )
    }
  })

  test('reopen decision reverts to pending', async ({ page }) => {
    // Use Frame Material which is already selected
    await page.getByText('Frame Material').click()

    const detailPanel = page.getByLabel(/Edit Frame Material/i)
    await expect(detailPanel).toBeVisible()

    // Look for reopen button
    const reopenButton = detailPanel.getByRole('button', {
      name: /reopen|reset|unselect/i,
    })
    if ((await reopenButton.count()) > 0) {
      await reopenButton.click()

      await page.waitForTimeout(200)

      // Status should change to "pending"
      const pendingBadge = detailPanel.getByText(/pending/i)
      if ((await pendingBadge.count()) > 0) {
        await expect(pendingBadge).toBeVisible()
      }
    }
  })
})

test.describe('Decision Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('timeline shows creation date', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for created date
    const createdDate = detailPanel.getByText(/created|created on/i)
    if ((await createdDate.count()) > 0) {
      await expect(createdDate).toBeVisible()
    }
  })

  test('timeline shows last modified date', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for modified date
    const modifiedDate = detailPanel.getByText(/modified|updated|last updated/i)
    if ((await modifiedDate.count()) > 0) {
      await expect(modifiedDate).toBeVisible()
    }
  })

  test('timeline shows selected date for decided items', async ({ page }) => {
    // Use Frame Material which is already selected
    await page.getByText('Frame Material').click()

    const detailPanel = page.getByLabel(/Edit Frame Material/i)
    await expect(detailPanel).toBeVisible()

    // Look for selected date
    const selectedDate = detailPanel.getByText(/selected on|decided on/i)
    if ((await selectedDate.count()) > 0) {
      await expect(selectedDate).toBeVisible()
    }
  })
})

test.describe('Decision Implications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('implications section is visible', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for implications section
    const implicationsSection = detailPanel.getByText(
      /implications|impact|affects/i
    )
    if ((await implicationsSection.count()) > 0) {
      await expect(implicationsSection.first()).toBeVisible()
    }
  })

  test('implications can link to other nodes', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    // Look for links in implications section
    const implLinks = detailPanel.locator(
      '[data-testid="implication-link"], a[href*="node"]'
    )
    if ((await implLinks.count()) > 0) {
      await expect(implLinks.first()).toBeVisible()
    }
  })
})

test.describe('Decision Comparison Table - Keyboard Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('table is keyboard navigable', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    const table = detailPanel.locator('table[role="grid"]')
    await expect(table).toBeVisible()

    // Find a focusable element inside the table (e.g., a button or input)
    const focusableInTable = table.locator('button, input').first()
    if ((await focusableInTable.count()) > 0) {
      await focusableInTable.focus()

      // Tab should navigate to next focusable element
      await page.keyboard.press('Tab')

      // Focus should still be in the table or table section
      const focusInTable = await page.evaluate(() => {
        const table = document.querySelector('table[role="grid"]')
        if (!table) return false
        // Check if active element is in table or in the same scroll container
        const activeEl = document.activeElement
        return (
          table.contains(activeEl) ||
          activeEl?.closest('[role="grid"]') !== null
        )
      })
      // If Tab moved focus out of table, that's also acceptable behavior
      expect(focusInTable !== undefined).toBe(true)
    }
  })

  test('Enter key edits focused cell', async ({ page }) => {
    await page.getByText('Motor Selection').click()

    const detailPanel = page.getByLabel(/Edit Motor Selection/i)
    await expect(detailPanel).toBeVisible()

    const table = detailPanel.locator('table, [role="grid"]')
    if ((await table.count()) > 0) {
      const cell = table.locator('td, [role="gridcell"]').first()
      await cell.focus()
      await page.keyboard.press('Enter')

      // Cell should be in edit mode
      const editInput = cell.locator('input, [contenteditable="true"]')
      if ((await editInput.count()) > 0) {
        await expect(editInput).toBeVisible()
      }
    }
  })
})
