/**
 * CategoryManagement Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryManagement } from './CategoryManagement'
import { useInventoryStore } from '@/store/useInventoryStore'
import type { InventoryCategoryWithSubcategories } from '@/types/inventory'

// Mock the store
vi.mock('@/store/useInventoryStore', () => ({
  useInventoryStore: vi.fn(),
}))

const mockUseInventoryStore = useInventoryStore as unknown as ReturnType<
  typeof vi.fn
>

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
]

interface MockStoreState {
  categories: InventoryCategoryWithSubcategories[]
  isLoading: boolean
  error: string | null
  fetchCategories: ReturnType<typeof vi.fn>
  createCategory: ReturnType<typeof vi.fn>
  updateCategory: ReturnType<typeof vi.fn>
  deleteCategory: ReturnType<typeof vi.fn>
  createSubcategory: ReturnType<typeof vi.fn>
  updateSubcategory: ReturnType<typeof vi.fn>
  deleteSubcategory: ReturnType<typeof vi.fn>
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
// Tests
// =============================================================================

describe('CategoryManagement', () => {
  const mockFetchCategories = vi.fn()
  const mockCreateCategory = vi.fn()
  const mockUpdateCategory = vi.fn()
  const mockDeleteCategory = vi.fn()
  const mockCreateSubcategory = vi.fn()
  const mockUpdateSubcategory = vi.fn()
  const mockDeleteSubcategory = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateCategory.mockResolvedValue({
      id: 'new-cat',
      name: 'New Category',
      sortOrder: 2,
      subcategories: [],
    })
    mockUpdateCategory.mockResolvedValue({
      id: 'electronics',
      name: 'Updated Name',
      sortOrder: 0,
      subcategories: [],
    })
    mockDeleteCategory.mockResolvedValue(true)
    mockCreateSubcategory.mockResolvedValue({
      id: 'new-sub',
      categoryId: 'electronics',
      name: 'New Subcategory',
      sortOrder: 0,
    })
    mockUpdateSubcategory.mockResolvedValue({
      id: 'electronics-capacitors',
      categoryId: 'electronics',
      name: 'Updated Sub',
      sortOrder: 0,
    })
    mockDeleteSubcategory.mockResolvedValue(true)

    mockUseInventoryStore.mockImplementation(
      createStoreMock({
        categories: mockCategories,
        isLoading: false,
        error: null,
        fetchCategories: mockFetchCategories,
        createCategory: mockCreateCategory,
        updateCategory: mockUpdateCategory,
        deleteCategory: mockDeleteCategory,
        createSubcategory: mockCreateSubcategory,
        updateSubcategory: mockUpdateSubcategory,
        deleteSubcategory: mockDeleteSubcategory,
      })
    )
  })

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe('rendering', () => {
    it('should render categories', () => {
      render(<CategoryManagement />)

      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Fasteners')).toBeInTheDocument()
    })

    it('should render subcategories under their categories', () => {
      render(<CategoryManagement />)

      // Find the Electronics section
      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      expect(
        within(electronicsSection!).getByText('Capacitors')
      ).toBeInTheDocument()
      expect(
        within(electronicsSection!).getByText('Resistors')
      ).toBeInTheDocument()

      // Find the Fasteners section
      const fastenersSection = screen
        .getByText('Fasteners')
        .closest('[data-category]')
      expect(within(fastenersSection!).getByText('Screws')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          categories: [],
          isLoading: true,
          error: null,
          fetchCategories: mockFetchCategories,
          createCategory: mockCreateCategory,
          updateCategory: mockUpdateCategory,
          deleteCategory: mockDeleteCategory,
          createSubcategory: mockCreateSubcategory,
          updateSubcategory: mockUpdateSubcategory,
          deleteSubcategory: mockDeleteSubcategory,
        })
      )

      render(<CategoryManagement />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should show empty state when no categories', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          categories: [],
          isLoading: false,
          error: null,
          fetchCategories: mockFetchCategories,
          createCategory: mockCreateCategory,
          updateCategory: mockUpdateCategory,
          deleteCategory: mockDeleteCategory,
          createSubcategory: mockCreateSubcategory,
          updateSubcategory: mockUpdateSubcategory,
          deleteSubcategory: mockDeleteSubcategory,
        })
      )

      render(<CategoryManagement />)
      expect(screen.getByText(/no categories/i)).toBeInTheDocument()
    })

    it('should show add category button', () => {
      render(<CategoryManagement />)
      expect(
        screen.getByRole('button', { name: /add category/i })
      ).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Add Category
  // ===========================================================================

  describe('add category', () => {
    it('should show input when add category button is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      await user.click(screen.getByRole('button', { name: /add category/i }))

      expect(screen.getByPlaceholderText(/category name/i)).toBeInTheDocument()
    })

    it('should call createCategory when new category is submitted', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      await user.type(
        screen.getByPlaceholderText(/category name/i),
        'New Category'
      )
      await user.keyboard('{Enter}')

      expect(mockCreateCategory).toHaveBeenCalledWith({ name: 'New Category' })
    })

    it('should hide input after successful category creation', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      const input = screen.getByPlaceholderText(/category name/i)
      await user.type(input, 'New Category')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(
          screen.queryByPlaceholderText(/category name/i)
        ).not.toBeInTheDocument()
      })
    })

    it('should not create category with empty name', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      await user.keyboard('{Enter}')

      expect(mockCreateCategory).not.toHaveBeenCalled()
    })

    it('should cancel add category on Escape', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      const input = screen.getByPlaceholderText(/category name/i)
      await user.type(input, 'New Cat')
      await user.keyboard('{Escape}')

      expect(
        screen.queryByPlaceholderText(/category name/i)
      ).not.toBeInTheDocument()
      expect(mockCreateCategory).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Add Subcategory
  // ===========================================================================

  describe('add subcategory', () => {
    it('should show add subcategory button for each category', () => {
      render(<CategoryManagement />)

      const addButtons = screen.getAllByRole('button', {
        name: /add subcategory/i,
      })
      expect(addButtons.length).toBe(2) // One for each category
    })

    it('should call createSubcategory when new subcategory is submitted', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      // Click add subcategory for Electronics
      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const addButton = within(electronicsSection!).getByRole('button', {
        name: /add subcategory/i,
      })
      await user.click(addButton)

      await user.type(
        screen.getByPlaceholderText(/subcategory name/i),
        'Inductors'
      )
      await user.keyboard('{Enter}')

      expect(mockCreateSubcategory).toHaveBeenCalledWith('electronics', {
        name: 'Inductors',
      })
    })
  })

  // ===========================================================================
  // Edit Category
  // ===========================================================================

  describe('edit category', () => {
    it('should show edit button for each category', () => {
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      expect(
        within(electronicsSection!).getByRole('button', {
          name: /edit.*electronics/i,
        })
      ).toBeInTheDocument()
    })

    it('should show input with current name when edit is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const editButton = within(electronicsSection!).getByRole('button', {
        name: /edit.*electronics/i,
      })
      await user.click(editButton)

      const input = screen.getByDisplayValue('Electronics')
      expect(input).toBeInTheDocument()
    })

    it('should call updateCategory when edit is submitted', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const editButton = within(electronicsSection!).getByRole('button', {
        name: /edit.*electronics/i,
      })
      await user.click(editButton)

      const input = screen.getByDisplayValue('Electronics')
      await user.clear(input)
      await user.type(input, 'Electronic Components')
      await user.keyboard('{Enter}')

      expect(mockUpdateCategory).toHaveBeenCalledWith('electronics', {
        name: 'Electronic Components',
      })
    })

    it('should cancel edit on Escape', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const editButton = within(electronicsSection!).getByRole('button', {
        name: /edit.*electronics/i,
      })
      await user.click(editButton)

      await user.keyboard('{Escape}')

      // Should show original name, not input
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.queryByDisplayValue('Electronics')).not.toBeInTheDocument()
      expect(mockUpdateCategory).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Edit Subcategory
  // ===========================================================================

  describe('edit subcategory', () => {
    it('should call updateSubcategory when subcategory edit is submitted', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const editButton = within(electronicsSection!).getByRole('button', {
        name: /edit.*capacitors/i,
      })
      await user.click(editButton)

      const input = screen.getByDisplayValue('Capacitors')
      await user.clear(input)
      await user.type(input, 'Caps')
      await user.keyboard('{Enter}')

      expect(mockUpdateSubcategory).toHaveBeenCalledWith(
        'electronics-capacitors',
        { name: 'Caps' }
      )
    })
  })

  // ===========================================================================
  // Delete Category
  // ===========================================================================

  describe('delete category', () => {
    it('should show delete button for each category', () => {
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      expect(
        within(electronicsSection!).getByRole('button', {
          name: /delete.*electronics/i,
        })
      ).toBeInTheDocument()
    })

    it('should show confirmation before deleting category with subcategories', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const deleteButton = within(electronicsSection!).getByRole('button', {
        name: /delete.*electronics/i,
      })
      await user.click(deleteButton)

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      expect(screen.getByText(/2 subcategories/i)).toBeInTheDocument()
    })

    it('should call deleteCategory when confirmed', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const deleteButton = within(electronicsSection!).getByRole('button', {
        name: /delete.*electronics/i,
      })
      await user.click(deleteButton)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      expect(mockDeleteCategory).toHaveBeenCalledWith('electronics')
    })

    it('should not delete when cancelled', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const deleteButton = within(electronicsSection!).getByRole('button', {
        name: /delete.*electronics/i,
      })
      await user.click(deleteButton)

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockDeleteCategory).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Delete Subcategory
  // ===========================================================================

  describe('delete subcategory', () => {
    it('should call deleteSubcategory when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<CategoryManagement />)

      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      const deleteButton = within(electronicsSection!).getByRole('button', {
        name: /delete.*capacitors/i,
      })
      await user.click(deleteButton)

      // Should not need confirmation for empty subcategories
      expect(mockDeleteSubcategory).toHaveBeenCalledWith(
        'electronics-capacitors'
      )
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('accessibility', () => {
    it('should have accessible list structure', () => {
      render(<CategoryManagement />)

      // Categories should be in a list
      expect(
        screen.getByRole('list', { name: /categories/i })
      ).toBeInTheDocument()
    })

    it('should have accessible labels for action buttons', () => {
      render(<CategoryManagement />)

      // All action buttons should have accessible names
      const electronicsSection = screen
        .getByText('Electronics')
        .closest('[data-category]')
      expect(
        within(electronicsSection!).getByRole('button', {
          name: /edit.*electronics/i,
        })
      ).toBeInTheDocument()
      expect(
        within(electronicsSection!).getByRole('button', {
          name: /delete.*electronics/i,
        })
      ).toBeInTheDocument()
      expect(
        within(electronicsSection!).getByRole('button', {
          name: /add subcategory/i,
        })
      ).toBeInTheDocument()
    })
  })
})
