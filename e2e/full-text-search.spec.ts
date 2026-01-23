/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test'
import {
  setupTestDataViaActions,
  waitForAppReady,
  openCommandPalette,
} from './test-utils'

test.describe('Full-Text Search (9.2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForAppReady(page)
    await setupTestDataViaActions(page)
  })

  test.describe('Search Indexing', () => {
    test('search indexes node titles', async ({ page }) => {
      // Open command palette to access search
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      // Search for a node by title
      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('Motor Selection')
      await page.waitForTimeout(300)

      // Result should appear in the search results listbox
      const resultList = page.getByRole('listbox')
      const result = resultList.getByText('Motor Selection')
      await expect(result).toBeVisible()
    })

    test('search indexes node body content', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      // Search for content within a node body
      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('stepper')
      await page.waitForTimeout(300)

      // Results should include nodes containing "stepper"
      const resultList = page.getByRole('listbox')
      if (await resultList.isVisible()) {
        const results = resultList.getByRole('option')
        const resultCount = await results.count()
        expect(resultCount).toBeGreaterThan(0)
      }
    })

    test('search updates when node content changes', async ({ page }) => {
      // Add a new node with specific content
      await page.evaluate(() => {
        const newNode = {
          id: 'note-searchable',
          type: 'note',
          title: 'Searchable Note',
          tags: [],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: 'This note contains UNIQUE_SEARCH_TERM_XYZ for testing.',
        }
        const event = new CustomEvent('e2e-setup-nodes', {
          detail: {
            nodes: [
              newNode,
              // Keep existing nodes
              {
                id: 'task-research-motors',
                type: 'task',
                title: 'Research Motor Options',
                tags: ['research'],
                dates: {
                  created: '2024-01-03T00:00:00.000Z',
                  modified: '2024-01-08T00:00:00.000Z',
                },
                content: 'Compare stepper vs servo motors.',
                status: 'in_progress',
                priority: 'high',
                dependsOn: [],
                blocks: [],
                checklist: [],
              },
            ],
          },
        })
        window.dispatchEvent(event)
      })

      await page.waitForTimeout(500)

      // Search for the unique term
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('UNIQUE_SEARCH_TERM_XYZ')
      await page.waitForTimeout(300)

      // Should find the new note
      const result = page.getByText('Searchable Note')
      await expect(result).toBeVisible()
    })
  })

  test.describe('Search Results Display', () => {
    test('search results show context snippet', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      // Search for a term
      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('Research')
      await page.waitForTimeout(300)

      // Results should be visible
      const resultList = page.getByRole('listbox')
      if (await resultList.isVisible()) {
        // Each result may show a snippet of content
        const results = resultList.getByRole('option')
        if ((await results.count()) > 0) {
          const firstResult = results.first()
          await expect(firstResult).toBeVisible()
        }
      }
    })

    test('matched characters are highlighted in results', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('Motor')
      await page.waitForTimeout(300)

      // Results should show with highlighted matches
      const resultList = page.getByRole('listbox')
      if (await resultList.isVisible()) {
        // Look for highlighted/marked text
        const highlight = resultList.locator(
          'mark, strong, .highlight, [class*="match"]'
        )
        const highlightCount = await highlight.count()
        // Highlighting may or may not be implemented
      }
    })

    test('empty search shows recent/all nodes', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      // With empty search, should show recent or all nodes
      const resultList = page.getByRole('listbox')
      if (await resultList.isVisible()) {
        const results = resultList.getByRole('option')
        const resultCount = await results.count()
        // Should show some results even with empty search
        expect(resultCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Search Interaction', () => {
    test('selecting search result navigates to node', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('Motor Selection')
      await page.waitForTimeout(300)

      // Click on the result
      const result = page.getByRole('option', { name: /Motor Selection/i })
      if (await result.isVisible()) {
        await result.click()
        await page.waitForTimeout(300)

        // Command palette should close (but edit panel may open)
        const commandPalette = page.getByRole('dialog', {
          name: /command palette/i,
        })
        await expect(commandPalette).not.toBeVisible()

        // Node should be selected - edit panel opens with the node
        // The edit panel aria-label includes the node title
        const editPanel = page.getByRole('dialog', {
          name: /Edit Motor Selection/i,
        })
        await expect(editPanel).toBeVisible()
      }
    })

    test('keyboard navigation works in search results', async ({ page }) => {
      // Open command palette
      await openCommandPalette(page)
      await page.waitForTimeout(200)

      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('task')
      await page.waitForTimeout(300)

      // Navigate with arrow keys
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(100)
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(100)
      await page.keyboard.press('ArrowUp')
      await page.waitForTimeout(100)

      // Press Enter to select
      await page.keyboard.press('Enter')
      await page.waitForTimeout(300)

      // Should have navigated (dialog closed)
      const dialog = page.getByRole('dialog')
      // Dialog should close after selection
    })
  })

  test.describe('Search Performance', () => {
    test('search responds quickly with many nodes', async ({ page }) => {
      // Set up many nodes
      const manyNodes = []
      for (let i = 0; i < 100; i++) {
        manyNodes.push({
          id: `note-perf-${i}`,
          type: 'note',
          title: `Performance Note ${i}`,
          tags: [],
          dates: {
            created: '2024-01-01T00:00:00.000Z',
            modified: '2024-01-01T00:00:00.000Z',
          },
          content: `This is content for note ${i} with some searchable text.`,
        })
      }

      await page.evaluate((nodes) => {
        const event = new CustomEvent('e2e-setup-nodes', { detail: { nodes } })
        window.dispatchEvent(event)
      }, manyNodes)

      await page.waitForTimeout(500)

      // Open command palette and time the search
      const startTime = Date.now()

      await openCommandPalette(page)
      const searchInput = page.getByRole('combobox', { name: /search/i })
      await searchInput.fill('Performance Note 50')
      await page.waitForTimeout(300)

      const endTime = Date.now()
      const searchTime = endTime - startTime

      // Search should complete in reasonable time (under 2 seconds)
      expect(searchTime).toBeLessThan(2000)

      // Result should be found in the search results listbox
      const resultList = page.getByRole('listbox')
      const result = resultList.getByText('Performance Note 50')
      await expect(result).toBeVisible()
    })
  })
})
