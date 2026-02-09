/**
 * Inventory Type System for Forge
 *
 * Defines TypeScript types for inventory items, categories, and subcategories
 * with type guards for runtime type narrowing and factory functions.
 */

// ============================================================================
// Status Type
// ============================================================================

/**
 * Status of an inventory item:
 * - 'owned': Item is in stock (default)
 * - 'wishlist': Item saved for later research/purchase
 * - 'on_order': Item has been ordered but not yet received
 */
export type InventoryItemStatus = 'owned' | 'wishlist' | 'on_order'

/**
 * Valid status values for runtime validation
 */
export const VALID_INVENTORY_STATUSES: InventoryItemStatus[] = [
  'owned',
  'wishlist',
  'on_order',
]

// ============================================================================
// Interfaces
// ============================================================================

/**
 * An inventory item representing a physical part or component
 */
export interface InventoryItem {
  /** Unique identifier (UUID) */
  id: string
  /** Human-readable name */
  name: string
  /** Top-level category ID */
  category: string
  /** Second-level category ID (optional) */
  subcategory: string | null
  /** Item status: owned, wishlist, or on_order */
  status: InventoryItemStatus
  /** Current stock count */
  quantity: number
  /** Physical storage location (e.g., "Bin A3") */
  location: string | null
  /** Where purchased */
  supplier: string | null
  /** Link to product page */
  supplierUrl: string | null
  /** Manufacturer or supplier part number */
  partNumber: string | null
  /** Price per unit */
  cost: number | null
  /** UPC/EAN if scanned */
  barcode: string | null
  /** Freeform text */
  notes: string | null
  /** Flexible tagging */
  tags: string[]
  /** Photo or product image */
  imageUrl: string | null
  /** Quantity threshold for low-stock alerts (null = no alert) */
  lowStockThreshold: number | null
  /** Creation timestamp */
  createdAt: Date
  /** Last modified timestamp */
  updatedAt: Date
}

/**
 * A category for organizing inventory items
 */
export interface InventoryCategory {
  /** Slug ID (e.g., "electronics") */
  id: string
  /** Display name (e.g., "Electronics") */
  name: string
  /** Display ordering */
  sortOrder: number
}

/**
 * A subcategory within a category
 */
export interface InventorySubcategory {
  /** Slug ID (e.g., "electronics-capacitors") */
  id: string
  /** Parent category ID */
  categoryId: string
  /** Display name (e.g., "Capacitors") */
  name: string
  /** Display ordering within parent */
  sortOrder: number
}

/**
 * A category with its nested subcategories
 */
export interface InventoryCategoryWithSubcategories extends InventoryCategory {
  subcategories: InventorySubcategory[]
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for InventoryItem
 */
export function isInventoryItem(value: unknown): value is InventoryItem {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.quantity === 'number' &&
    (obj.status === undefined ||
      VALID_INVENTORY_STATUSES.includes(obj.status as InventoryItemStatus))
  )
}

/**
 * Type guard for InventoryCategory
 */
export function isInventoryCategory(
  value: unknown
): value is InventoryCategory {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.sortOrder === 'number'
  )
}

/**
 * Type guard for InventorySubcategory
 */
export function isInventorySubcategory(
  value: unknown
): value is InventorySubcategory {
  if (value === null || value === undefined || typeof value !== 'object') {
    return false
  }

  const obj = value as Record<string, unknown>

  return (
    typeof obj.id === 'string' &&
    typeof obj.categoryId === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.sortOrder === 'number'
  )
}

// ============================================================================
// Low Stock Helpers
// ============================================================================

/**
 * Checks if an inventory item is below its low stock threshold
 * Returns false if no threshold is set (null)
 */
export function isLowStock(item: InventoryItem): boolean {
  if (item.lowStockThreshold === null) {
    return false
  }
  return item.quantity <= item.lowStockThreshold
}

/**
 * Gets all items that are below their low stock threshold
 */
export function getLowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter(isLowStock)
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Optional fields for creating an inventory item
 */
export interface CreateInventoryItemOptions {
  subcategory?: string | null
  status?: InventoryItemStatus
  quantity?: number
  location?: string | null
  supplier?: string | null
  supplierUrl?: string | null
  partNumber?: string | null
  cost?: number | null
  barcode?: string | null
  notes?: string | null
  tags?: string[]
  imageUrl?: string | null
  lowStockThreshold?: number | null
}

/**
 * Creates a new inventory item with sensible defaults
 */
export function createInventoryItem(
  id: string,
  name: string,
  category: string,
  options: CreateInventoryItemOptions = {}
): InventoryItem {
  const now = new Date()

  return {
    id,
    name,
    category,
    subcategory: options.subcategory ?? null,
    status: options.status ?? 'owned',
    quantity: options.quantity ?? 0,
    location: options.location ?? null,
    supplier: options.supplier ?? null,
    supplierUrl: options.supplierUrl ?? null,
    partNumber: options.partNumber ?? null,
    cost: options.cost ?? null,
    barcode: options.barcode ?? null,
    notes: options.notes ?? null,
    tags: options.tags ?? [],
    imageUrl: options.imageUrl ?? null,
    lowStockThreshold: options.lowStockThreshold ?? null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Creates a new inventory category
 */
export function createInventoryCategory(
  id: string,
  name: string,
  sortOrder: number = 0
): InventoryCategory {
  return {
    id,
    name,
    sortOrder,
  }
}

/**
 * Creates a new inventory subcategory
 */
export function createInventorySubcategory(
  id: string,
  categoryId: string,
  name: string,
  sortOrder: number = 0
): InventorySubcategory {
  return {
    id,
    categoryId,
    name,
    sortOrder,
  }
}

// ============================================================================
// Default Categories (matching database seeds)
// ============================================================================

/**
 * Default inventory categories as defined in the PRD
 */
export const DEFAULT_CATEGORIES: InventoryCategory[] = [
  { id: 'electronics', name: 'Electronics', sortOrder: 0 },
  { id: 'fasteners', name: 'Fasteners', sortOrder: 1 },
  { id: 'mechanical', name: 'Mechanical', sortOrder: 2 },
  { id: 'raw-materials', name: 'Raw Materials', sortOrder: 3 },
  { id: 'tools', name: 'Tools', sortOrder: 4 },
  { id: 'consumables', name: 'Consumables', sortOrder: 5 },
  { id: 'other', name: 'Other', sortOrder: 6 },
]

/**
 * Default subcategories organized by parent category
 */
export const DEFAULT_SUBCATEGORIES: Record<string, InventorySubcategory[]> = {
  electronics: [
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
    {
      id: 'electronics-ics',
      categoryId: 'electronics',
      name: 'ICs',
      sortOrder: 2,
    },
    {
      id: 'electronics-connectors',
      categoryId: 'electronics',
      name: 'Connectors',
      sortOrder: 3,
    },
    {
      id: 'electronics-sensors',
      categoryId: 'electronics',
      name: 'Sensors',
      sortOrder: 4,
    },
    {
      id: 'electronics-leds',
      categoryId: 'electronics',
      name: 'LEDs',
      sortOrder: 5,
    },
    {
      id: 'electronics-other',
      categoryId: 'electronics',
      name: 'Other',
      sortOrder: 6,
    },
  ],
  fasteners: [
    {
      id: 'fasteners-screws',
      categoryId: 'fasteners',
      name: 'Screws',
      sortOrder: 0,
    },
    {
      id: 'fasteners-nuts',
      categoryId: 'fasteners',
      name: 'Nuts',
      sortOrder: 1,
    },
    {
      id: 'fasteners-bolts',
      categoryId: 'fasteners',
      name: 'Bolts',
      sortOrder: 2,
    },
    {
      id: 'fasteners-washers',
      categoryId: 'fasteners',
      name: 'Washers',
      sortOrder: 3,
    },
    {
      id: 'fasteners-standoffs',
      categoryId: 'fasteners',
      name: 'Standoffs',
      sortOrder: 4,
    },
    {
      id: 'fasteners-other',
      categoryId: 'fasteners',
      name: 'Other',
      sortOrder: 5,
    },
  ],
  mechanical: [
    {
      id: 'mechanical-bearings',
      categoryId: 'mechanical',
      name: 'Bearings',
      sortOrder: 0,
    },
    {
      id: 'mechanical-gears',
      categoryId: 'mechanical',
      name: 'Gears',
      sortOrder: 1,
    },
    {
      id: 'mechanical-pulleys',
      categoryId: 'mechanical',
      name: 'Pulleys',
      sortOrder: 2,
    },
    {
      id: 'mechanical-shafts',
      categoryId: 'mechanical',
      name: 'Shafts',
      sortOrder: 3,
    },
    {
      id: 'mechanical-motors',
      categoryId: 'mechanical',
      name: 'Motors',
      sortOrder: 4,
    },
    {
      id: 'mechanical-other',
      categoryId: 'mechanical',
      name: 'Other',
      sortOrder: 5,
    },
  ],
  'raw-materials': [
    {
      id: 'raw-materials-sheet',
      categoryId: 'raw-materials',
      name: 'Sheet',
      sortOrder: 0,
    },
    {
      id: 'raw-materials-rod',
      categoryId: 'raw-materials',
      name: 'Rod',
      sortOrder: 1,
    },
    {
      id: 'raw-materials-tube',
      categoryId: 'raw-materials',
      name: 'Tube',
      sortOrder: 2,
    },
    {
      id: 'raw-materials-wire',
      categoryId: 'raw-materials',
      name: 'Wire',
      sortOrder: 3,
    },
    {
      id: 'raw-materials-other',
      categoryId: 'raw-materials',
      name: 'Other',
      sortOrder: 4,
    },
  ],
  tools: [], // No subcategories per PRD
  consumables: [
    {
      id: 'consumables-solder',
      categoryId: 'consumables',
      name: 'Solder',
      sortOrder: 0,
    },
    {
      id: 'consumables-tape',
      categoryId: 'consumables',
      name: 'Tape',
      sortOrder: 1,
    },
    {
      id: 'consumables-adhesives',
      categoryId: 'consumables',
      name: 'Adhesives',
      sortOrder: 2,
    },
    {
      id: 'consumables-other',
      categoryId: 'consumables',
      name: 'Other',
      sortOrder: 3,
    },
  ],
  other: [], // No subcategories per PRD
}
