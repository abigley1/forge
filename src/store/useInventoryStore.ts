/**
 * Inventory Store
 *
 * Zustand store for managing inventory items and categories.
 * Uses API-first pattern where actions call the server and update state on success.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  InventoryItem,
  InventoryCategoryWithSubcategories,
  InventorySubcategory,
} from '@/types/inventory'

// ============================================================================
// Types
// ============================================================================

/**
 * API response format
 */
interface ApiResponse<T> {
  data?: T
  error?: string
}

/**
 * Filters for fetching items
 */
export interface InventoryFetchFilters {
  category?: string
  subcategory?: string
  location?: string
  status?: 'owned' | 'wishlist' | 'on_order'
  /** Filter to items below their individual low stock threshold */
  lowStock?: boolean
}

/**
 * Input for creating an item via API
 */
export interface CreateItemInput {
  name: string
  category_id: string
  subcategory_id?: string | null
  status?: 'owned' | 'wishlist' | 'on_order'
  quantity?: number
  low_stock_threshold?: number | null
  location?: string | null
  supplier?: string | null
  supplier_url?: string | null
  part_number?: string | null
  cost?: number | null
  barcode?: string | null
  notes?: string | null
  image_url?: string | null
  tags?: string[]
}

/**
 * Input for updating an item via API
 */
export interface UpdateItemInput {
  name?: string
  category_id?: string
  subcategory_id?: string | null
  status?: 'owned' | 'wishlist' | 'on_order'
  quantity?: number
  low_stock_threshold?: number | null
  location?: string | null
  supplier?: string | null
  supplier_url?: string | null
  part_number?: string | null
  cost?: number | null
  barcode?: string | null
  notes?: string | null
  image_url?: string | null
  tags?: string[]
}

/**
 * Input for creating a category
 */
export interface CreateCategoryInput {
  id?: string
  name: string
  sort_order?: number
}

/**
 * Input for updating a category
 */
export interface UpdateCategoryInput {
  name?: string
  sort_order?: number
}

/**
 * Input for creating a subcategory
 */
export interface CreateSubcategoryInput {
  id?: string
  name: string
  sort_order?: number
}

/**
 * Input for updating a subcategory
 */
export interface UpdateSubcategoryInput {
  name?: string
  sort_order?: number
}

/**
 * Store state
 */
interface InventoryState {
  items: InventoryItem[]
  categories: InventoryCategoryWithSubcategories[]
  isLoading: boolean
  error: string | null
}

/**
 * Store actions
 */
interface InventoryActions {
  // Items
  fetchItems: (filters?: InventoryFetchFilters) => Promise<void>
  fetchLowStockItems: () => Promise<void>
  createItem: (input: CreateItemInput) => Promise<InventoryItem | null>
  updateItem: (
    id: string,
    input: UpdateItemInput
  ) => Promise<InventoryItem | null>
  deleteItem: (id: string) => Promise<boolean>
  adjustQuantity: (id: string, delta: number) => Promise<boolean>
  searchItems: (query: string) => Promise<void>

  // Categories
  fetchCategories: () => Promise<void>
  createCategory: (
    input: CreateCategoryInput
  ) => Promise<InventoryCategoryWithSubcategories | null>
  updateCategory: (
    id: string,
    input: UpdateCategoryInput
  ) => Promise<InventoryCategoryWithSubcategories | null>
  deleteCategory: (id: string) => Promise<boolean>
  createSubcategory: (
    categoryId: string,
    input: CreateSubcategoryInput
  ) => Promise<InventorySubcategory | null>
  updateSubcategory: (
    id: string,
    input: UpdateSubcategoryInput
  ) => Promise<InventorySubcategory | null>
  deleteSubcategory: (id: string) => Promise<boolean>

  // Selectors
  getItemById: (id: string) => InventoryItem | undefined
  getItemsByCategory: (category: string) => InventoryItem[]
  /** Get items that are at or below their individual low stock threshold */
  getLowStockItems: () => InventoryItem[]
  getTotalValue: () => number

  // Utility
  clearError: () => void
  reset: () => void
}

type InventoryStore = InventoryState & InventoryActions

// ============================================================================
// API Helpers
// ============================================================================

const API_BASE = '/api/inventory'

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || 'Request failed' }
    }

    return { data: data.data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Transform API item (snake_case) to InventoryItem (camelCase)
 */
function transformApiItem(apiItem: Record<string, unknown>): InventoryItem {
  return {
    id: apiItem.id as string,
    name: apiItem.name as string,
    category: apiItem.category_id as string,
    subcategory: (apiItem.subcategory_id as string | null) ?? null,
    status: (apiItem.status as InventoryItem['status']) ?? 'owned',
    quantity: apiItem.quantity as number,
    lowStockThreshold: (apiItem.low_stock_threshold as number | null) ?? null,
    location: (apiItem.location as string | null) ?? null,
    supplier: (apiItem.supplier as string | null) ?? null,
    supplierUrl: (apiItem.supplier_url as string | null) ?? null,
    partNumber: (apiItem.part_number as string | null) ?? null,
    cost: (apiItem.cost as number | null) ?? null,
    barcode: (apiItem.barcode as string | null) ?? null,
    notes: (apiItem.notes as string | null) ?? null,
    imageUrl: (apiItem.image_url as string | null) ?? null,
    tags: (apiItem.tags as string[]) ?? [],
    createdAt: new Date(apiItem.created_at as string),
    updatedAt: new Date(apiItem.updated_at as string),
  }
}

/**
 * Transform API category (snake_case) to InventoryCategoryWithSubcategories (camelCase)
 */
function transformApiCategory(
  apiCategory: Record<string, unknown>
): InventoryCategoryWithSubcategories {
  const subcategories =
    (apiCategory.subcategories as Array<Record<string, unknown>>) ?? []
  return {
    id: apiCategory.id as string,
    name: apiCategory.name as string,
    sortOrder: apiCategory.sort_order as number,
    subcategories: subcategories.map((sub) => ({
      id: sub.id as string,
      categoryId: sub.category_id as string,
      name: sub.name as string,
      sortOrder: sub.sort_order as number,
    })),
  }
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: InventoryState = {
  items: [],
  categories: [],
  isLoading: false,
  error: null,
}

// ============================================================================
// Store
// ============================================================================

export const useInventoryStore = create<InventoryStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // Items
      // ========================================================================

      fetchItems: async (filters?: InventoryFetchFilters) => {
        set({ isLoading: true, error: null }, false, 'fetchItems/start')

        const params = new URLSearchParams()
        if (filters?.category) {
          params.set('category', filters.category)
        }
        if (filters?.subcategory) {
          params.set('subcategory', filters.subcategory)
        }
        if (filters?.location) {
          params.set('location', filters.location)
        }
        if (filters?.status) {
          params.set('status', filters.status)
        }
        if (filters?.lowStock) {
          params.set('low_stock', 'true')
        }

        const url = `${API_BASE}${params.toString() ? `?${params.toString()}` : ''}`
        const result = await apiFetch<Array<Record<string, unknown>>>(url)

        if (result.error) {
          set(
            { error: result.error, isLoading: false },
            false,
            'fetchItems/error'
          )
          return
        }

        const items = (result.data ?? []).map(transformApiItem)
        set({ items, isLoading: false }, false, 'fetchItems/success')
      },

      createItem: async (input: CreateItemInput) => {
        set({ error: null }, false, 'createItem/start')

        const result = await apiFetch<Record<string, unknown>>(API_BASE, {
          method: 'POST',
          body: JSON.stringify(input),
        })

        if (result.error) {
          set({ error: result.error }, false, 'createItem/error')
          return null
        }

        const newItem = transformApiItem(result.data!)
        set(
          (state) => ({ items: [...state.items, newItem] }),
          false,
          'createItem/success'
        )

        return newItem
      },

      updateItem: async (id: string, input: UpdateItemInput) => {
        set({ error: null }, false, 'updateItem/start')

        const result = await apiFetch<Record<string, unknown>>(
          `${API_BASE}/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify(input),
          }
        )

        if (result.error) {
          set({ error: result.error }, false, 'updateItem/error')
          return null
        }

        const updatedItem = transformApiItem(result.data!)
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.id === id ? updatedItem : item
            ),
          }),
          false,
          'updateItem/success'
        )

        return updatedItem
      },

      deleteItem: async (id: string) => {
        set({ error: null }, false, 'deleteItem/start')

        const result = await apiFetch<void>(`${API_BASE}/${id}`, {
          method: 'DELETE',
        })

        if (result.error) {
          set({ error: result.error }, false, 'deleteItem/error')
          return false
        }

        set(
          (state) => ({
            items: state.items.filter((item) => item.id !== id),
          }),
          false,
          'deleteItem/success'
        )

        return true
      },

      adjustQuantity: async (id: string, delta: number) => {
        set({ error: null }, false, 'adjustQuantity/start')

        const result = await apiFetch<{ id: string; newQuantity: number }>(
          `${API_BASE}/${id}/quantity`,
          {
            method: 'PATCH',
            body: JSON.stringify({ delta }),
          }
        )

        if (result.error) {
          set({ error: result.error }, false, 'adjustQuantity/error')
          return false
        }

        set(
          (state) => ({
            items: state.items.map((item) =>
              item.id === id
                ? { ...item, quantity: result.data!.newQuantity }
                : item
            ),
          }),
          false,
          'adjustQuantity/success'
        )

        return true
      },

      searchItems: async (query: string) => {
        set({ isLoading: true, error: null }, false, 'searchItems/start')

        const url = `${API_BASE}/search?q=${encodeURIComponent(query)}`
        const result = await apiFetch<Array<Record<string, unknown>>>(url)

        if (result.error) {
          set(
            { error: result.error, isLoading: false },
            false,
            'searchItems/error'
          )
          return
        }

        const items = (result.data ?? []).map(transformApiItem)
        set({ items, isLoading: false }, false, 'searchItems/success')
      },

      fetchLowStockItems: async () => {
        set({ isLoading: true, error: null }, false, 'fetchLowStockItems/start')

        const url = `${API_BASE}/low-stock`
        const result = await apiFetch<Array<Record<string, unknown>>>(url)

        if (result.error) {
          set(
            { error: result.error, isLoading: false },
            false,
            'fetchLowStockItems/error'
          )
          return
        }

        const items = (result.data ?? []).map(transformApiItem)
        set({ items, isLoading: false }, false, 'fetchLowStockItems/success')
      },

      // ========================================================================
      // Categories
      // ========================================================================

      fetchCategories: async () => {
        set({ isLoading: true, error: null }, false, 'fetchCategories/start')

        const result = await apiFetch<Array<Record<string, unknown>>>(
          `${API_BASE}/categories`
        )

        if (result.error) {
          set(
            { error: result.error, isLoading: false },
            false,
            'fetchCategories/error'
          )
          return
        }

        const categories = (result.data ?? []).map(transformApiCategory)
        set({ categories, isLoading: false }, false, 'fetchCategories/success')
      },

      createCategory: async (input: CreateCategoryInput) => {
        set({ error: null }, false, 'createCategory/start')

        const result = await apiFetch<Record<string, unknown>>(
          `${API_BASE}/categories`,
          {
            method: 'POST',
            body: JSON.stringify(input),
          }
        )

        if (result.error) {
          set({ error: result.error }, false, 'createCategory/error')
          return null
        }

        const newCategory = transformApiCategory(result.data!)
        set(
          (state) => ({ categories: [...state.categories, newCategory] }),
          false,
          'createCategory/success'
        )

        return newCategory
      },

      updateCategory: async (id: string, input: UpdateCategoryInput) => {
        set({ error: null }, false, 'updateCategory/start')

        const result = await apiFetch<Record<string, unknown>>(
          `${API_BASE}/categories/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify(input),
          }
        )

        if (result.error) {
          set({ error: result.error }, false, 'updateCategory/error')
          return null
        }

        const updatedCategory = transformApiCategory(result.data!)
        set(
          (state) => ({
            categories: state.categories.map((cat) =>
              cat.id === id
                ? { ...updatedCategory, subcategories: cat.subcategories }
                : cat
            ),
          }),
          false,
          'updateCategory/success'
        )

        return updatedCategory
      },

      deleteCategory: async (id: string) => {
        set({ error: null }, false, 'deleteCategory/start')

        const result = await apiFetch<void>(`${API_BASE}/categories/${id}`, {
          method: 'DELETE',
        })

        if (result.error) {
          set({ error: result.error }, false, 'deleteCategory/error')
          return false
        }

        set(
          (state) => ({
            categories: state.categories.filter((cat) => cat.id !== id),
          }),
          false,
          'deleteCategory/success'
        )

        return true
      },

      createSubcategory: async (
        categoryId: string,
        input: CreateSubcategoryInput
      ) => {
        set({ error: null }, false, 'createSubcategory/start')

        const result = await apiFetch<Record<string, unknown>>(
          `${API_BASE}/categories/${categoryId}/subcategories`,
          {
            method: 'POST',
            body: JSON.stringify(input),
          }
        )

        if (result.error) {
          set({ error: result.error }, false, 'createSubcategory/error')
          return null
        }

        const apiSubcategory = result.data!
        const newSubcategory: InventorySubcategory = {
          id: apiSubcategory.id as string,
          categoryId: apiSubcategory.category_id as string,
          name: apiSubcategory.name as string,
          sortOrder: apiSubcategory.sort_order as number,
        }

        set(
          (state) => ({
            categories: state.categories.map((cat) =>
              cat.id === categoryId
                ? {
                    ...cat,
                    subcategories: [...cat.subcategories, newSubcategory],
                  }
                : cat
            ),
          }),
          false,
          'createSubcategory/success'
        )

        return newSubcategory
      },

      updateSubcategory: async (id: string, input: UpdateSubcategoryInput) => {
        set({ error: null }, false, 'updateSubcategory/start')

        const result = await apiFetch<Record<string, unknown>>(
          `${API_BASE}/subcategories/${id}`,
          {
            method: 'PUT',
            body: JSON.stringify(input),
          }
        )

        if (result.error) {
          set({ error: result.error }, false, 'updateSubcategory/error')
          return null
        }

        const apiSubcategory = result.data!
        const updatedSubcategory: InventorySubcategory = {
          id: apiSubcategory.id as string,
          categoryId: apiSubcategory.category_id as string,
          name: apiSubcategory.name as string,
          sortOrder: apiSubcategory.sort_order as number,
        }

        set(
          (state) => ({
            categories: state.categories.map((cat) =>
              cat.id === updatedSubcategory.categoryId
                ? {
                    ...cat,
                    subcategories: cat.subcategories.map((sub) =>
                      sub.id === id ? updatedSubcategory : sub
                    ),
                  }
                : cat
            ),
          }),
          false,
          'updateSubcategory/success'
        )

        return updatedSubcategory
      },

      deleteSubcategory: async (id: string) => {
        set({ error: null }, false, 'deleteSubcategory/start')

        const result = await apiFetch<void>(`${API_BASE}/subcategories/${id}`, {
          method: 'DELETE',
        })

        if (result.error) {
          set({ error: result.error }, false, 'deleteSubcategory/error')
          return false
        }

        set(
          (state) => ({
            categories: state.categories.map((cat) => ({
              ...cat,
              subcategories: cat.subcategories.filter((sub) => sub.id !== id),
            })),
          }),
          false,
          'deleteSubcategory/success'
        )

        return true
      },

      // ========================================================================
      // Selectors
      // ========================================================================

      getItemById: (id: string) => {
        return get().items.find((item) => item.id === id)
      },

      getItemsByCategory: (category: string) => {
        return get().items.filter((item) => item.category === category)
      },

      getLowStockItems: () => {
        return get().items.filter(
          (item) =>
            item.lowStockThreshold !== null &&
            item.quantity <= item.lowStockThreshold
        )
      },

      getTotalValue: () => {
        return get().items.reduce((total, item) => {
          if (item.cost !== null) {
            return total + item.quantity * item.cost
          }
          return total
        }, 0)
      },

      // ========================================================================
      // Utility
      // ========================================================================

      clearError: () => {
        set({ error: null }, false, 'clearError')
      },

      reset: () => {
        set(initialState, false, 'reset')
      },
    }),
    {
      name: 'forge-inventory-store',
      enabled: import.meta.env.DEV,
    }
  )
)

// ============================================================================
// Selectors (for use outside of React components)
// ============================================================================

export const selectInventoryItems = (state: InventoryStore) => state.items
export const selectInventoryCategories = (state: InventoryStore) =>
  state.categories
export const selectInventoryLoading = (state: InventoryStore) => state.isLoading
export const selectInventoryError = (state: InventoryStore) => state.error
