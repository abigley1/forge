/**
 * Inventory Store Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock the fetch API for testing
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mock setup - will be created after tests
import { useInventoryStore } from './useInventoryStore'
import type { InventoryItem } from '@/types/inventory'

// =============================================================================
// Test Data
// =============================================================================

// API response format (snake_case) for categories
const mockApiCategories = [
  {
    id: 'electronics',
    name: 'Electronics',
    sort_order: 0,
    subcategories: [
      {
        id: 'electronics-capacitors',
        category_id: 'electronics',
        name: 'Capacitors',
        sort_order: 0,
      },
      {
        id: 'electronics-resistors',
        category_id: 'electronics',
        name: 'Resistors',
        sort_order: 1,
      },
    ],
  },
  {
    id: 'fasteners',
    name: 'Fasteners',
    sort_order: 1,
    subcategories: [
      {
        id: 'fasteners-screws',
        category_id: 'fasteners',
        name: 'Screws',
        sort_order: 0,
      },
    ],
  },
]

// API response format (snake_case) - matches what server returns
const mockApiItems = [
  {
    id: 'item-1',
    name: 'Arduino Uno',
    category_id: 'electronics',
    subcategory_id: 'electronics-capacitors',
    status: 'owned' as const,
    quantity: 5,
    low_stock_threshold: 10, // Below threshold (5 <= 10)
    location: 'Bin A1',
    supplier: 'DigiKey',
    supplier_url: 'https://digikey.com',
    part_number: 'ARD-UNO',
    cost: 25.0,
    barcode: null,
    notes: 'Microcontroller board',
    image_url: null,
    tags: ['microcontroller', 'arduino'],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'item-2',
    name: '10uF Capacitor',
    category_id: 'electronics',
    subcategory_id: 'electronics-capacitors',
    status: 'owned' as const,
    quantity: 100,
    low_stock_threshold: 50, // Not low stock (100 > 50)
    location: 'Bin B2',
    supplier: 'Mouser',
    supplier_url: null,
    part_number: 'CAP-10UF',
    cost: 0.1,
    barcode: null,
    notes: null,
    image_url: null,
    tags: ['capacitor'],
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'item-3',
    name: 'M3 Screws',
    category_id: 'fasteners',
    subcategory_id: 'fasteners-screws',
    status: 'owned' as const,
    quantity: 2,
    low_stock_threshold: 5, // Below threshold (2 <= 5)
    location: 'Drawer 1',
    supplier: null,
    supplier_url: null,
    part_number: null,
    cost: null,
    barcode: null,
    notes: 'Running low',
    image_url: null,
    tags: [],
    created_at: '2024-01-03T00:00:00.000Z',
    updated_at: '2024-01-03T00:00:00.000Z',
  },
]

// Client-side format (camelCase) - for type checking in tests
const mockItems: InventoryItem[] = mockApiItems.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category_id,
  subcategory: item.subcategory_id,
  status: item.status,
  quantity: item.quantity,
  lowStockThreshold: item.low_stock_threshold,
  location: item.location,
  supplier: item.supplier,
  supplierUrl: item.supplier_url,
  partNumber: item.part_number,
  cost: item.cost,
  barcode: item.barcode,
  notes: item.notes,
  imageUrl: item.image_url,
  tags: item.tags,
  createdAt: new Date(item.created_at),
  updatedAt: new Date(item.updated_at),
}))

// =============================================================================
// Helper Functions
// =============================================================================

function createMockResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data }),
  }
}

function createMockErrorResponse(error: string, status = 400) {
  return {
    ok: false,
    status,
    json: async () => ({ error }),
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('useInventoryStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useInventoryStore.getState().reset()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe('initial state', () => {
    it('should have empty items array', () => {
      const { result } = renderHook(() => useInventoryStore())
      expect(result.current.items).toEqual([])
    })

    it('should have empty categories array', () => {
      const { result } = renderHook(() => useInventoryStore())
      expect(result.current.categories).toEqual([])
    })

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useInventoryStore())
      expect(result.current.isLoading).toBe(false)
    })

    it('should have no error initially', () => {
      const { result } = renderHook(() => useInventoryStore())
      expect(result.current.error).toBeNull()
    })
  })

  // ===========================================================================
  // Fetch Items
  // ===========================================================================

  describe('fetchItems', () => {
    it('should set loading state while fetching', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useInventoryStore())

      act(() => {
        result.current.fetchItems()
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should fetch items from API and update state', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiItems))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchItems()
      })

      expect(result.current.items).toHaveLength(3)
      expect(result.current.items[0].name).toBe('Arduino Uno')
      expect(result.current.isLoading).toBe(false)
    })

    it('should fetch items with category filter', async () => {
      const filteredItems = mockItems.filter(
        (i) => i.category === 'electronics'
      )
      mockFetch.mockResolvedValueOnce(createMockResponse(filteredItems))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchItems({ category: 'electronics' })
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('category=electronics'),
        expect.any(Object)
      )
    })

    it('should fetch items with low_stock filter', async () => {
      const lowStockItems = mockItems.filter(
        (i) => i.lowStockThreshold !== null && i.quantity <= i.lowStockThreshold
      )
      mockFetch.mockResolvedValueOnce(createMockResponse(lowStockItems))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchItems({ lowStock: true })
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('low_stock=true'),
        expect.any(Object)
      )
    })

    it('should set error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse('Server error', 500)
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchItems()
      })

      expect(result.current.error).toBe('Server error')
      expect(result.current.isLoading).toBe(false)
    })
  })

  // ===========================================================================
  // Fetch Categories
  // ===========================================================================

  describe('fetchCategories', () => {
    it('should fetch categories from API and update state', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiCategories))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchCategories()
      })

      expect(result.current.categories).toHaveLength(2)
      expect(result.current.categories[0].name).toBe('Electronics')
      expect(result.current.categories[0].subcategories).toHaveLength(2)
    })

    it('should set error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse('Failed to load categories')
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchCategories()
      })

      expect(result.current.error).toBe('Failed to load categories')
    })
  })

  // ===========================================================================
  // Create Item
  // ===========================================================================

  describe('createItem', () => {
    it('should create item via API and add to state', async () => {
      const newItemApi = {
        id: 'new-item',
        name: 'New Item',
        category_id: 'electronics',
        subcategory_id: null,
        quantity: 10,
        location: null,
        supplier: null,
        supplier_url: null,
        part_number: null,
        cost: null,
        barcode: null,
        notes: null,
        image_url: null,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(newItemApi, 201))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.createItem({
          name: 'New Item',
          category_id: 'electronics',
          quantity: 10,
        })
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].name).toBe('New Item')
    })

    it('should return created item on success', async () => {
      const newItemApi = {
        id: 'new-item',
        name: 'Test Item',
        category_id: 'electronics',
        subcategory_id: null,
        quantity: 1,
        location: null,
        supplier: null,
        supplier_url: null,
        part_number: null,
        cost: null,
        barcode: null,
        notes: null,
        image_url: null,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockFetch.mockResolvedValueOnce(createMockResponse(newItemApi, 201))

      const { result } = renderHook(() => useInventoryStore())

      let createdItem: InventoryItem | null = null
      await act(async () => {
        createdItem = await result.current.createItem({
          name: 'Test Item',
          category_id: 'electronics',
        })
      })

      expect(createdItem).not.toBeNull()
      expect(createdItem!.name).toBe('Test Item')
    })

    it('should set error on create failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse('Name is required', 400)
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.createItem({
          name: '',
          category_id: 'electronics',
        })
      })

      expect(result.current.error).toBe('Name is required')
    })
  })

  // ===========================================================================
  // Update Item
  // ===========================================================================

  describe('updateItem', () => {
    beforeEach(async () => {
      // Pre-populate items
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiItems))
      const { result } = renderHook(() => useInventoryStore())
      await act(async () => {
        await result.current.fetchItems()
      })
      mockFetch.mockReset()
    })

    it('should update item via API and update state', async () => {
      const updatedItemApi = { ...mockApiItems[0], name: 'Updated Arduino' }
      mockFetch.mockResolvedValueOnce(createMockResponse(updatedItemApi))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.updateItem('item-1', { name: 'Updated Arduino' })
      })

      const item = result.current.items.find((i) => i.id === 'item-1')
      expect(item?.name).toBe('Updated Arduino')
    })

    it('should set error on update failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse('Item not found', 404)
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.updateItem('non-existent', { name: 'Test' })
      })

      expect(result.current.error).toBe('Item not found')
    })
  })

  // ===========================================================================
  // Delete Item
  // ===========================================================================

  describe('deleteItem', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiItems))
      const { result } = renderHook(() => useInventoryStore())
      await act(async () => {
        await result.current.fetchItems()
      })
      mockFetch.mockReset()
    })

    it('should delete item via API and remove from state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      })

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.deleteItem('item-1')
      })

      expect(result.current.items).toHaveLength(2)
      expect(
        result.current.items.find((i) => i.id === 'item-1')
      ).toBeUndefined()
    })

    it('should set error on delete failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse('Item not found', 404)
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.deleteItem('non-existent')
      })

      expect(result.current.error).toBe('Item not found')
    })
  })

  // ===========================================================================
  // Adjust Quantity
  // ===========================================================================

  describe('adjustQuantity', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiItems))
      const { result } = renderHook(() => useInventoryStore())
      await act(async () => {
        await result.current.fetchItems()
      })
      mockFetch.mockReset()
    })

    it('should increase quantity via API and update state', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ id: 'item-1', newQuantity: 10 })
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.adjustQuantity('item-1', 5)
      })

      const item = result.current.items.find((i) => i.id === 'item-1')
      expect(item?.quantity).toBe(10)
    })

    it('should decrease quantity via API and update state', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ id: 'item-1', newQuantity: 3 })
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.adjustQuantity('item-1', -2)
      })

      const item = result.current.items.find((i) => i.id === 'item-1')
      expect(item?.quantity).toBe(3)
    })

    it('should set error on adjust failure', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockErrorResponse('Item not found', 404)
      )

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.adjustQuantity('non-existent', 5)
      })

      expect(result.current.error).toBe('Item not found')
    })
  })

  // ===========================================================================
  // Search Items
  // ===========================================================================

  describe('searchItems', () => {
    it('should search items via API and update state', async () => {
      const searchResults = [mockApiItems[0]] // Only Arduino matches
      mockFetch.mockResolvedValueOnce(createMockResponse(searchResults))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.searchItems('Arduino')
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].name).toBe('Arduino Uno')
    })

    it('should call search endpoint with query', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([]))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.searchItems('test query')
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inventory/search?q=test%20query'),
        expect.any(Object)
      )
    })
  })

  // ===========================================================================
  // Selectors
  // ===========================================================================

  describe('selectors', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiItems))
      const { result } = renderHook(() => useInventoryStore())
      await act(async () => {
        await result.current.fetchItems()
      })
      mockFetch.mockReset()
    })

    describe('getItemById', () => {
      it('should return item by id', () => {
        const { result } = renderHook(() => useInventoryStore())
        const item = result.current.getItemById('item-1')
        expect(item?.name).toBe('Arduino Uno')
      })

      it('should return undefined for non-existent id', () => {
        const { result } = renderHook(() => useInventoryStore())
        const item = result.current.getItemById('non-existent')
        expect(item).toBeUndefined()
      })
    })

    describe('getItemsByCategory', () => {
      it('should return items filtered by category', () => {
        const { result } = renderHook(() => useInventoryStore())
        const items = result.current.getItemsByCategory('electronics')
        expect(items).toHaveLength(2)
        expect(items.every((i) => i.category === 'electronics')).toBe(true)
      })

      it('should return empty array for non-existent category', () => {
        const { result } = renderHook(() => useInventoryStore())
        const items = result.current.getItemsByCategory('non-existent')
        expect(items).toEqual([])
      })
    })

    describe('getLowStockItems', () => {
      it('should return items with quantity at or below their own threshold', () => {
        const { result } = renderHook(() => useInventoryStore())
        const items = result.current.getLowStockItems()
        // Arduino: 5 <= 10 (low), Capacitor: 100 > 50 (not low), Screws: 2 <= 5 (low)
        expect(items).toHaveLength(2)
        expect(
          items.every(
            (i: InventoryItem) =>
              i.lowStockThreshold !== null && i.quantity <= i.lowStockThreshold
          )
        ).toBe(true)
      })
    })

    describe('getTotalValue', () => {
      it('should calculate total inventory value', () => {
        const { result } = renderHook(() => useInventoryStore())
        const total = result.current.getTotalValue()
        // Arduino: 5 * 25 = 125
        // Capacitor: 100 * 0.1 = 10
        // Screws: no cost
        expect(total).toBe(135)
      })
    })
  })

  // ===========================================================================
  // Category Management
  // ===========================================================================

  describe('category management', () => {
    describe('createCategory', () => {
      it('should create category via API and add to state', async () => {
        const newCategoryApi = {
          id: 'new-cat',
          name: 'New Category',
          sort_order: 10,
          subcategories: [],
        }

        mockFetch.mockResolvedValueOnce(createMockResponse(newCategoryApi, 201))

        const { result } = renderHook(() => useInventoryStore())

        await act(async () => {
          await result.current.createCategory({
            id: 'new-cat',
            name: 'New Category',
            sort_order: 10,
          })
        })

        expect(result.current.categories).toHaveLength(1)
        expect(result.current.categories[0].name).toBe('New Category')
      })
    })

    describe('updateCategory', () => {
      beforeEach(async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockApiCategories))
        const { result } = renderHook(() => useInventoryStore())
        await act(async () => {
          await result.current.fetchCategories()
        })
        mockFetch.mockReset()
      })

      it('should update category via API and update state', async () => {
        const updatedCategoryApi = {
          ...mockApiCategories[0],
          name: 'Updated Electronics',
        }
        mockFetch.mockResolvedValueOnce(createMockResponse(updatedCategoryApi))

        const { result } = renderHook(() => useInventoryStore())

        await act(async () => {
          await result.current.updateCategory('electronics', {
            name: 'Updated Electronics',
          })
        })

        const category = result.current.categories.find(
          (c) => c.id === 'electronics'
        )
        expect(category?.name).toBe('Updated Electronics')
      })
    })

    describe('deleteCategory', () => {
      beforeEach(async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockApiCategories))
        const { result } = renderHook(() => useInventoryStore())
        await act(async () => {
          await result.current.fetchCategories()
        })
        mockFetch.mockReset()
      })

      it('should delete category via API and remove from state', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          json: async () => ({}),
        })

        const { result } = renderHook(() => useInventoryStore())

        await act(async () => {
          await result.current.deleteCategory('fasteners')
        })

        expect(result.current.categories).toHaveLength(1)
        expect(
          result.current.categories.find((c) => c.id === 'fasteners')
        ).toBeUndefined()
      })
    })

    describe('createSubcategory', () => {
      beforeEach(async () => {
        mockFetch.mockResolvedValueOnce(createMockResponse(mockApiCategories))
        const { result } = renderHook(() => useInventoryStore())
        await act(async () => {
          await result.current.fetchCategories()
        })
        mockFetch.mockReset()
      })

      it('should create subcategory via API and add to category', async () => {
        const newSubcategory = {
          id: 'electronics-leds',
          category_id: 'electronics',
          name: 'LEDs',
          sort_order: 2,
        }

        mockFetch.mockResolvedValueOnce(createMockResponse(newSubcategory, 201))

        const { result } = renderHook(() => useInventoryStore())

        await act(async () => {
          await result.current.createSubcategory('electronics', {
            id: 'electronics-leds',
            name: 'LEDs',
          })
        })

        const category = result.current.categories.find(
          (c) => c.id === 'electronics'
        )
        expect(category?.subcategories).toHaveLength(3)
        expect(
          category?.subcategories.find((s) => s.id === 'electronics-leds')
        ).toBeDefined()
      })
    })
  })

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should clear error when clearError is called', async () => {
      mockFetch.mockResolvedValueOnce(createMockErrorResponse('Some error'))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchItems()
      })

      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchItems()
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isLoading).toBe(false)
    })
  })

  // ===========================================================================
  // Reset
  // ===========================================================================

  describe('reset', () => {
    it('should reset store to initial state', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiItems))
      mockFetch.mockResolvedValueOnce(createMockResponse(mockApiCategories))

      const { result } = renderHook(() => useInventoryStore())

      await act(async () => {
        await result.current.fetchItems()
        await result.current.fetchCategories()
      })

      expect(result.current.items.length).toBeGreaterThan(0)
      expect(result.current.categories.length).toBeGreaterThan(0)

      act(() => {
        result.current.reset()
      })

      expect(result.current.items).toEqual([])
      expect(result.current.categories).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })
})
