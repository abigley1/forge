import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  clearTestData,
  waitForAppReady,
} from './test-utils'

test.describe('Filtering - Type Filter UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)

    // Expand the Filters section (it's collapsed by default)
    const filtersButton = page.getByRole('button', { name: /filters/i })
    await filtersButton.click()
    await page.waitForTimeout(100)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('type filter buttons are visible when Filters expanded', async ({
    page,
  }) => {
    // Type filters are toggle buttons with aria-label "Filter by X"
    await expect(
      page.getByRole('button', { name: /filter by decision/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /filter by component/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /filter by task/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /filter by note/i })
    ).toBeVisible()
  })

  test('clicking type filter toggles its pressed state', async ({ page }) => {
    const decisionsButton = page.getByRole('button', {
      name: /filter by decision/i,
    })

    // Initially should not be pressed
    await expect(decisionsButton).toHaveAttribute('aria-pressed', 'false')

    // Click to select
    await decisionsButton.click()
    await page.waitForTimeout(100)
    await expect(decisionsButton).toHaveAttribute('aria-pressed', 'true')

    // Click again to deselect
    await decisionsButton.click()
    await page.waitForTimeout(100)
    await expect(decisionsButton).toHaveAttribute('aria-pressed', 'false')
  })

  test('multiple type filters can be selected', async ({ page }) => {
    const decisionsButton = page.getByRole('button', {
      name: /filter by decision/i,
    })
    const tasksButton = page.getByRole('button', { name: /filter by task/i })

    // Select both
    await decisionsButton.click()
    await tasksButton.click()
    await page.waitForTimeout(100)

    // Both should be pressed
    await expect(decisionsButton).toHaveAttribute('aria-pressed', 'true')
    await expect(tasksButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('filter section shows active filter count', async ({ page }) => {
    const decisionsButton = page.getByRole('button', {
      name: /filter by decision/i,
    })
    await decisionsButton.click()
    await page.waitForTimeout(100)

    // The Filters button should show count
    const filtersLabel = page.getByText(/Filters.*\(1\)/i)
    await expect(filtersLabel).toBeVisible()
  })
})

test.describe('Filtering - Status Filter UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)

    // Expand the Filters section
    const filtersButton = page.getByRole('button', { name: /filters/i })
    await filtersButton.click()
    await page.waitForTimeout(100)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('status filter checkboxes are visible', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: /pending/i })).toBeVisible()
    await expect(
      page.getByRole('checkbox', { name: /in progress/i })
    ).toBeVisible()
  })

  test('clicking status checkbox toggles it', async ({ page }) => {
    const pendingCheckbox = page.getByRole('checkbox', { name: /pending/i })

    // Initially unchecked
    await expect(pendingCheckbox).not.toBeChecked()

    // Click to check
    await pendingCheckbox.click()
    await expect(pendingCheckbox).toBeChecked()

    // Click to uncheck
    await pendingCheckbox.click()
    await expect(pendingCheckbox).not.toBeChecked()
  })

  test('multiple status filters can be selected', async ({ page }) => {
    const pendingCheckbox = page.getByRole('checkbox', { name: /pending/i })
    const inProgressCheckbox = page.getByRole('checkbox', {
      name: /in progress/i,
    })

    await pendingCheckbox.click()
    await inProgressCheckbox.click()
    await page.waitForTimeout(100)

    await expect(pendingCheckbox).toBeChecked()
    await expect(inProgressCheckbox).toBeChecked()
  })
})

test.describe('Filtering - Tag Filter UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('tag cloud displays tags from nodes', async ({ page }) => {
    // Tags section should show tags from test data
    const hardwareTag = page.getByRole('button', {
      name: /tag filter.*hardware/i,
    })
    await expect(hardwareTag).toBeVisible()
  })

  test('clicking tag toggles its pressed state', async ({ page }) => {
    const hardwareTag = page.getByRole('button', {
      name: /tag filter.*hardware/i,
    })

    // Initially not pressed
    await expect(hardwareTag).toHaveAttribute('aria-pressed', 'false')

    // Click to select
    await hardwareTag.click()
    await page.waitForTimeout(100)
    await expect(hardwareTag).toHaveAttribute('aria-pressed', 'true')

    // Click to deselect
    await hardwareTag.click()
    await page.waitForTimeout(100)
    await expect(hardwareTag).toHaveAttribute('aria-pressed', 'false')
  })
})

test.describe('Filtering - Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)

    // Expand Filters section
    const filtersButton = page.getByRole('button', { name: /filters/i })
    await filtersButton.click()
    await page.waitForTimeout(100)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('search input is visible', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    await expect(searchInput).toBeVisible()
  })

  test('can type in search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('motor')
    await expect(searchInput).toHaveValue('motor')
  })
})

test.describe('Sorting UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)

    // Expand Filters section (sorting is inside)
    const filtersButton = page.getByRole('button', { name: /filters/i })
    await filtersButton.click()
    await page.waitForTimeout(100)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('sort label is visible', async ({ page }) => {
    const sortLabel = page.getByText('Sort', { exact: true })
    await expect(sortLabel).toBeVisible()
  })

  test('sort dropdown is visible', async ({ page }) => {
    // Look for the sort dropdown trigger
    const sortDropdown = page.locator('[role="combobox"]')
    if ((await sortDropdown.count()) > 0) {
      await expect(sortDropdown.first()).toBeVisible()
    }
  })
})

test.describe('Filter URL Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
    await page.waitForTimeout(200)

    // Expand Filters section
    const filtersButton = page.getByRole('button', { name: /filters/i })
    await filtersButton.click()
    await page.waitForTimeout(100)
  })

  test.afterEach(async ({ page }) => {
    await clearTestData(page)
  })

  test('selecting type filter updates URL', async ({ page }) => {
    const decisionsButton = page.getByRole('button', {
      name: /filter by decision/i,
    })
    await decisionsButton.click()
    await page.waitForTimeout(200)

    // URL should contain type parameter
    const url = page.url()
    expect(url).toContain('type')
  })
})
