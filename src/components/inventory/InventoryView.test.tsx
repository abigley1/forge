/**
 * InventoryView Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 * Tests the main inventory page that integrates all components.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InventoryView } from './InventoryView'
import { useInventoryStore } from '@/store/useInventoryStore'
import type {
  InventoryItem,
  InventoryCategoryWithSubcategories,
} from '@/types/inventory'

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
    ],
  },
  {
    id: 'fasteners',
    name: 'Fasteners',
    sortOrder: 1,
    subcategories: [],
  },
]

const mockItems: InventoryItem[] = [
  {
    id: 'item-1',
    name: 'Arduino Uno',
    category: 'electronics',
    subcategory: null,
    status: 'owned',
    quantity: 5,
    lowStockThreshold: null,
    location: 'Bin A1',
    supplier: 'DigiKey',
    supplierUrl: null,
    partNumber: 'ARD-UNO',
    cost: 25.0,
    barcode: null,
    notes: null,
    imageUrl: null,
    tags: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'item-2',
    name: '10uF Capacitor',
    category: 'electronics',
    subcategory: 'electronics-capacitors',
    status: 'owned',
    quantity: 100,
    lowStockThreshold: null,
    location: 'Bin B2',
    supplier: null,
    supplierUrl: null,
    partNumber: null,
    cost: 0.1,
    barcode: null,
    notes: null,
    imageUrl: null,
    tags: [],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'item-3',
    name: 'M3 Screws',
    category: 'fasteners',
    subcategory: null,
    status: 'owned',
    quantity: 50,
    lowStockThreshold: null,
    location: 'Drawer 1',
    supplier: null,
    supplierUrl: null,
    partNumber: null,
    cost: null,
    barcode: null,
    notes: null,
    imageUrl: null,
    tags: [],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
]

interface MockStoreState {
  items: InventoryItem[]
  categories: InventoryCategoryWithSubcategories[]
  isLoading: boolean
  error: string | null
  fetchItems: ReturnType<typeof vi.fn>
  fetchCategories: ReturnType<typeof vi.fn>
  createItem: ReturnType<typeof vi.fn>
  updateItem: ReturnType<typeof vi.fn>
  deleteItem: ReturnType<typeof vi.fn>
  adjustQuantity: ReturnType<typeof vi.fn>
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

describe('InventoryView', () => {
  const mockFetchItems = vi.fn()
  const mockFetchCategories = vi.fn()
  const mockCreateItem = vi.fn()
  const mockUpdateItem = vi.fn()
  const mockDeleteItem = vi.fn()
  const mockAdjustQuantity = vi.fn()
  const mockCreateCategory = vi.fn()
  const mockUpdateCategory = vi.fn()
  const mockDeleteCategory = vi.fn()
  const mockCreateSubcategory = vi.fn()
  const mockUpdateSubcategory = vi.fn()
  const mockDeleteSubcategory = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchItems.mockResolvedValue(undefined)
    mockFetchCategories.mockResolvedValue(undefined)
    mockCreateItem.mockResolvedValue({ id: 'new', name: 'New Item' })
    mockAdjustQuantity.mockResolvedValue(true)
    mockDeleteItem.mockResolvedValue(true)

    mockUseInventoryStore.mockImplementation(
      createStoreMock({
        items: mockItems,
        categories: mockCategories,
        isLoading: false,
        error: null,
        fetchItems: mockFetchItems,
        fetchCategories: mockFetchCategories,
        createItem: mockCreateItem,
        updateItem: mockUpdateItem,
        deleteItem: mockDeleteItem,
        adjustQuantity: mockAdjustQuantity,
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
  // Layout
  // ===========================================================================

  describe('layout', () => {
    it('should render the page title', () => {
      render(<InventoryView />)
      expect(
        screen.getByRole('heading', { name: /inventory/i })
      ).toBeInTheDocument()
    })

    it('should render the sidebar with categories', () => {
      render(<InventoryView />)
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Fasteners')).toBeInTheDocument()
    })

    it('should render the items list', () => {
      render(<InventoryView />)
      expect(screen.getByText('Arduino Uno')).toBeInTheDocument()
      expect(screen.getByText('10uF Capacitor')).toBeInTheDocument()
      expect(screen.getByText('M3 Screws')).toBeInTheDocument()
    })

    it('should render the add item button', () => {
      render(<InventoryView />)
      expect(
        screen.getByRole('button', { name: /add item/i })
      ).toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          items: [],
          categories: [],
          isLoading: true,
          error: null,
          fetchItems: mockFetchItems,
          fetchCategories: mockFetchCategories,
          createItem: mockCreateItem,
          updateItem: mockUpdateItem,
          deleteItem: mockDeleteItem,
          adjustQuantity: mockAdjustQuantity,
          createCategory: mockCreateCategory,
          updateCategory: mockUpdateCategory,
          deleteCategory: mockDeleteCategory,
          createSubcategory: mockCreateSubcategory,
          updateSubcategory: mockUpdateSubcategory,
          deleteSubcategory: mockDeleteSubcategory,
        })
      )

      render(<InventoryView />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Data Loading
  // ===========================================================================

  describe('data loading', () => {
    it('should fetch items and categories on mount', () => {
      render(<InventoryView />)
      expect(mockFetchItems).toHaveBeenCalled()
      expect(mockFetchCategories).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Category Filtering
  // ===========================================================================

  describe('category filtering', () => {
    it('should show categories in sidebar for navigation', () => {
      render(<InventoryView />)

      // Categories should be visible in sidebar
      expect(screen.getByText('Electronics')).toBeInTheDocument()
      expect(screen.getByText('Fasteners')).toBeInTheDocument()
      expect(screen.getByText('All Items')).toBeInTheDocument()
    })

    it('should show all items initially', () => {
      render(<InventoryView />)

      // All items should be visible initially
      expect(screen.getByText('Arduino Uno')).toBeInTheDocument()
      expect(screen.getByText('10uF Capacitor')).toBeInTheDocument()
      expect(screen.getByText('M3 Screws')).toBeInTheDocument()
    })

    it('should have clickable category items in sidebar tree', () => {
      render(<InventoryView />)

      // Tree structure should be present
      const tree = screen.getByRole('tree')
      expect(tree).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Add Item Modal
  // ===========================================================================

  describe('add item modal', () => {
    it('should open modal when add item button is clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryView />)

      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(
        screen.getByRole('dialog', { name: /add.*item/i })
      ).toBeInTheDocument()
    })

    it('should close modal when item is created', async () => {
      const user = userEvent.setup()
      render(<InventoryView />)

      // Open modal
      await user.click(screen.getByRole('button', { name: /add item/i }))

      // Fill form and submit
      await user.type(screen.getByLabelText(/^name\b/i), 'New Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item$/i }))

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  // ===========================================================================
  // Manage Categories
  // ===========================================================================

  describe('manage categories', () => {
    it('should show manage categories button', () => {
      render(<InventoryView />)
      expect(
        screen.getByRole('button', { name: /manage categories/i })
      ).toBeInTheDocument()
    })

    it('should toggle category management panel', async () => {
      const user = userEvent.setup()
      render(<InventoryView />)

      // Click manage categories
      await user.click(
        screen.getByRole('button', { name: /manage categories/i })
      )

      // Should show category management
      expect(
        screen.getByRole('button', { name: /add category/i })
      ).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<InventoryView />)

      // Main heading
      expect(
        screen.getByRole('heading', { level: 1, name: /inventory/i })
      ).toBeInTheDocument()
    })

    it('should have navigation landmark for sidebar', () => {
      render(<InventoryView />)
      expect(
        screen.getByRole('navigation', { name: /inventory categories/i })
      ).toBeInTheDocument()
    })

    it('should have main landmark for content', () => {
      render(<InventoryView />)
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })
})
