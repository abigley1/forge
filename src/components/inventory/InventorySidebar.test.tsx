/**
 * InventorySidebar Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InventorySidebar } from './InventorySidebar'
import { useInventoryStore } from '@/store/useInventoryStore'
import type { InventoryCategoryWithSubcategories } from '@/types/inventory'

// Mock the store - Zustand stores are called with selectors
vi.mock('@/store/useInventoryStore', () => ({
  useInventoryStore: vi.fn(),
}))

const mockUseInventoryStore = useInventoryStore as unknown as ReturnType<
  typeof vi.fn
>

// Helper to create store mock that handles selector functions
interface MockStoreState {
  categories: InventoryCategoryWithSubcategories[]
  items: Array<{ id: string; category: string; subcategory: string | null }>
  isLoading: boolean
  error: string | null
  fetchCategories: () => void
}

function createStoreMock(state: MockStoreState) {
  return (selector?: (s: MockStoreState) => unknown) => {
    if (selector) {
      return selector(state)
    }
    return state
  }
}

// =============================================================================
// Test Data
// =============================================================================

const mockCategories: InventoryCategoryWithSubcategories[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    sortOrder: 0,
    subcategories: [
      {
        id: 'electronics-capacitors',
        categoryId: 'electronics',
        name: 'Capacitors',
        sortOrder: 0,
      },
      {
        id: 'electronics-resistors',
        categoryId: 'electronics',
        name: 'Resistors',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 'fasteners',
    name: 'Fasteners',
    sortOrder: 1,
    subcategories: [
      {
        id: 'fasteners-screws',
        categoryId: 'fasteners',
        name: 'Screws',
        sortOrder: 0,
      },
    ],
  },
  {
    id: 'tools',
    name: 'Tools',
    sortOrder: 2,
    subcategories: [],
  },
]

const mockItems = [
  { id: '1', category: 'electronics', subcategory: 'electronics-capacitors' },
  { id: '2', category: 'electronics', subcategory: 'electronics-capacitors' },
  { id: '3', category: 'electronics', subcategory: 'electronics-resistors' },
  { id: '4', category: 'fasteners', subcategory: 'fasteners-screws' },
  { id: '5', category: 'fasteners', subcategory: null },
]

// =============================================================================
// Tests
// =============================================================================

describe('InventorySidebar', () => {
  const mockOnCategorySelect = vi.fn()
  const mockOnSubcategorySelect = vi.fn()
  const mockFetchCategories = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseInventoryStore.mockImplementation(
      createStoreMock({
        categories: mockCategories,
        items: mockItems,
        isLoading: false,
        error: null,
        fetchCategories: mockFetchCategories,
      })
    )
  })

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe('rendering', () => {
    it('should render the sidebar with title', () => {
      render(<InventorySidebar />)
      expect(
        screen.getByRole('navigation', { name: /inventory/i })
      ).toBeInTheDocument()
    })

    it('should render all categories', () => {
      render(<InventorySidebar />)

      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Fasteners')).toBeInTheDocument()
      expect(screen.getByText('Tools')).toBeInTheDocument()
    })

    it('should show item counts for categories', () => {
      render(<InventorySidebar />)

      // Electronics has 3 items (2 capacitors + 1 resistor)
      const electronicsRow = screen.getByText('Electronics').closest('button')
      expect(within(electronicsRow!).getByText('3')).toBeInTheDocument()

      // Fasteners has 2 items
      const fastenersRow = screen.getByText('Fasteners').closest('button')
      expect(within(fastenersRow!).getByText('2')).toBeInTheDocument()

      // Tools has 0 items
      const toolsRow = screen.getByText('Tools').closest('button')
      expect(within(toolsRow!).getByText('0')).toBeInTheDocument()
    })

    it('should show "All Items" option with total count', () => {
      render(<InventorySidebar />)

      expect(screen.getByText('All Items')).toBeInTheDocument()
      const allItemsRow = screen.getByText('All Items').closest('button')
      expect(within(allItemsRow!).getByText('5')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          categories: [],
          items: [],
          isLoading: true,
          error: null,
          fetchCategories: mockFetchCategories,
        })
      )

      render(<InventorySidebar />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should show error state', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          categories: [],
          items: [],
          isLoading: false,
          error: 'Failed to load categories',
          fetchCategories: mockFetchCategories,
        })
      )

      render(<InventorySidebar />)
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })

    it('should show empty state when no categories', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          categories: [],
          items: [],
          isLoading: false,
          error: null,
          fetchCategories: mockFetchCategories,
        })
      )

      render(<InventorySidebar />)
      expect(screen.getByText(/no categories/i)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Expand/Collapse
  // ===========================================================================

  describe('expand/collapse', () => {
    it('should collapse categories by default', () => {
      render(<InventorySidebar />)

      // Subcategories should not be visible initially
      expect(screen.queryByText('Capacitors')).not.toBeInTheDocument()
      expect(screen.queryByText('Resistors')).not.toBeInTheDocument()
    })

    it('should expand category on click to show subcategories', async () => {
      const user = userEvent.setup()
      render(<InventorySidebar />)

      // Click Electronics expand button
      const electronicsButton = screen.getByRole('button', {
        name: /expand electronics/i,
      })
      await user.click(electronicsButton)

      // Subcategories should now be visible
      expect(screen.getByText('Capacitors')).toBeInTheDocument()
      expect(screen.getByText('Resistors')).toBeInTheDocument()
    })

    it('should show subcategory item counts when expanded', async () => {
      const user = userEvent.setup()
      render(<InventorySidebar />)

      // Expand Electronics
      const electronicsButton = screen.getByRole('button', {
        name: /expand electronics/i,
      })
      await user.click(electronicsButton)

      // Capacitors has 2 items
      const capacitorsRow = screen.getByText('Capacitors').closest('button')
      expect(within(capacitorsRow!).getByText('2')).toBeInTheDocument()

      // Resistors has 1 item
      const resistorsRow = screen.getByText('Resistors').closest('button')
      expect(within(resistorsRow!).getByText('1')).toBeInTheDocument()
    })

    it('should collapse category when clicking expanded category', async () => {
      const user = userEvent.setup()
      render(<InventorySidebar />)

      // Expand Electronics
      const electronicsButton = screen.getByRole('button', {
        name: /expand electronics/i,
      })
      await user.click(electronicsButton)

      expect(screen.getByText('Capacitors')).toBeInTheDocument()

      // Collapse Electronics
      const collapseButton = screen.getByRole('button', {
        name: /collapse electronics/i,
      })
      await user.click(collapseButton)

      expect(screen.queryByText('Capacitors')).not.toBeInTheDocument()
    })

    it('should not show expand button for categories without subcategories', () => {
      render(<InventorySidebar />)

      // Tools has no subcategories, should not have expand button
      expect(
        screen.queryByRole('button', { name: /expand tools/i })
      ).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Selection
  // ===========================================================================

  describe('selection', () => {
    it('should call onCategorySelect when category is clicked', async () => {
      const user = userEvent.setup()
      render(<InventorySidebar onCategorySelect={mockOnCategorySelect} />)

      const electronicsText = screen.getByText('Electronics')
      await user.click(electronicsText)

      expect(mockOnCategorySelect).toHaveBeenCalledWith('electronics')
    })

    it('should call onSubcategorySelect when subcategory is clicked', async () => {
      const user = userEvent.setup()
      render(
        <InventorySidebar
          onCategorySelect={mockOnCategorySelect}
          onSubcategorySelect={mockOnSubcategorySelect}
        />
      )

      // First expand Electronics
      const expandButton = screen.getByRole('button', {
        name: /expand electronics/i,
      })
      await user.click(expandButton)

      // Click on Capacitors subcategory
      const capacitorsText = screen.getByText('Capacitors')
      await user.click(capacitorsText)

      expect(mockOnSubcategorySelect).toHaveBeenCalledWith(
        'electronics-capacitors'
      )
    })

    it('should call onCategorySelect with null when "All Items" is clicked', async () => {
      const user = userEvent.setup()
      render(<InventorySidebar onCategorySelect={mockOnCategorySelect} />)

      const allItems = screen.getByText('All Items')
      await user.click(allItems)

      expect(mockOnCategorySelect).toHaveBeenCalledWith(null)
    })

    it('should highlight selected category', () => {
      render(
        <InventorySidebar
          selectedCategory="electronics"
          onCategorySelect={mockOnCategorySelect}
        />
      )

      const electronicsButton = screen
        .getByText('Electronics')
        .closest('button')
      expect(electronicsButton).toHaveAttribute('aria-selected', 'true')
    })

    it('should highlight selected subcategory', async () => {
      const user = userEvent.setup()
      render(
        <InventorySidebar
          selectedSubcategory="electronics-capacitors"
          onCategorySelect={mockOnCategorySelect}
          onSubcategorySelect={mockOnSubcategorySelect}
        />
      )

      // Expand Electronics first
      const expandButton = screen.getByRole('button', {
        name: /expand electronics/i,
      })
      await user.click(expandButton)

      const capacitorsButton = screen.getByText('Capacitors').closest('button')
      expect(capacitorsButton).toHaveAttribute('aria-selected', 'true')
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<InventorySidebar />)

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAccessibleName(/inventory/i)
    })

    it('should have proper tree structure', () => {
      render(<InventorySidebar />)

      const tree = screen.getByRole('tree')
      expect(tree).toBeInTheDocument()

      const treeItems = screen.getAllByRole('treeitem')
      expect(treeItems.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<InventorySidebar onCategorySelect={mockOnCategorySelect} />)

      // Tab to first item
      await user.tab()

      // Should focus All Items first
      expect(document.activeElement).toHaveTextContent('All Items')

      // Arrow down to Electronics
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toHaveTextContent('Electronics')

      // Enter to select
      await user.keyboard('{Enter}')
      expect(mockOnCategorySelect).toHaveBeenCalledWith('electronics')
    })
  })
})
