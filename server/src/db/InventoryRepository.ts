/**
 * Inventory Repository
 *
 * Handles all database operations for inventory items, categories, and subcategories.
 * Follows the same patterns as NodeRepository.
 */

import type { DatabaseInstance } from './index.js'
import { randomUUID } from 'node:crypto'

// ============================================================================
// Types
// ============================================================================

/**
 * Database row types
 */
/**
 * Valid status values for inventory items
 */
export type InventoryItemStatus = 'owned' | 'wishlist' | 'on_order'

export interface InventoryItemRow {
  id: string
  name: string
  category_id: string
  subcategory_id: string | null
  status: InventoryItemStatus
  quantity: number
  low_stock_threshold: number | null
  location: string | null
  supplier: string | null
  supplier_url: string | null
  part_number: string | null
  cost: number | null
  barcode: string | null
  notes: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface InventoryCategoryRow {
  id: string
  name: string
  sort_order: number
}

export interface InventorySubcategoryRow {
  id: string
  category_id: string
  name: string
  sort_order: number
}

/**
 * Full item data including tags
 */
export interface InventoryItemWithTags extends InventoryItemRow {
  tags: string[]
}

/**
 * Category with nested subcategories
 */
export interface CategoryWithSubcategories extends InventoryCategoryRow {
  subcategories: InventorySubcategoryRow[]
}

/**
 * Data for creating a new inventory item
 */
export interface CreateInventoryItemData {
  id?: string
  name: string
  category_id: string
  subcategory_id?: string | null
  status?: InventoryItemStatus
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
 * Data for updating an inventory item
 */
export interface UpdateInventoryItemData {
  name?: string
  category_id?: string
  subcategory_id?: string | null
  status?: InventoryItemStatus
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
 * Search filters for finding inventory items
 */
export interface InventorySearchFilters {
  category_id?: string
  subcategory_id?: string
  status?: InventoryItemStatus
  location?: string
  supplier?: string
  tags?: string[]
  query?: string
  /** Filter to items below a specific quantity threshold (legacy) */
  low_stock_threshold?: number
  /** Filter to items that are below their individual low_stock_threshold */
  low_stock?: boolean
}

// ============================================================================
// Repository
// ============================================================================

/**
 * Repository for inventory database operations
 */
export class InventoryRepository {
  constructor(private db: DatabaseInstance) {}

  // --------------------------------------------------------------------------
  // Items
  // --------------------------------------------------------------------------

  /**
   * Create a new inventory item
   */
  createItem(data: CreateInventoryItemData): InventoryItemWithTags {
    const id = data.id ?? randomUUID()
    const now = new Date().toISOString()

    const result = this.db.transaction(() => {
      // Insert item
      const itemStmt = this.db.prepare(`
        INSERT INTO inventory_items (
          id, name, category_id, subcategory_id, status, quantity, low_stock_threshold,
          location, supplier, supplier_url, part_number, cost, barcode, notes, image_url,
          created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      itemStmt.run(
        id,
        data.name,
        data.category_id,
        data.subcategory_id ?? null,
        data.status ?? 'owned',
        data.quantity ?? 0,
        data.low_stock_threshold ?? null,
        data.location ?? null,
        data.supplier ?? null,
        data.supplier_url ?? null,
        data.part_number ?? null,
        data.cost ?? null,
        data.barcode ?? null,
        data.notes ?? null,
        data.image_url ?? null,
        now,
        now
      )

      // Insert tags
      if (data.tags && data.tags.length > 0) {
        const tagStmt = this.db.prepare(
          'INSERT INTO inventory_item_tags (item_id, tag) VALUES (?, ?)'
        )
        for (const tag of data.tags) {
          tagStmt.run(id, tag)
        }
      }

      return this.findItemById(id)!
    })()

    return result
  }

  /**
   * Find an inventory item by ID
   */
  findItemById(id: string): InventoryItemWithTags | null {
    const itemStmt = this.db.prepare(
      'SELECT * FROM inventory_items WHERE id = ?'
    )
    const item = itemStmt.get(id) as InventoryItemRow | undefined

    if (!item) {
      return null
    }

    // Get tags
    const tags = this.getItemTags(id)

    return {
      ...item,
      tags,
    }
  }

  /**
   * Find all inventory items, optionally filtered
   */
  findItems(filters?: InventorySearchFilters): InventoryItemWithTags[] {
    let sql = 'SELECT * FROM inventory_items WHERE 1=1'
    const params: unknown[] = []

    if (filters) {
      if (filters.category_id) {
        sql += ' AND category_id = ?'
        params.push(filters.category_id)
      }

      if (filters.subcategory_id) {
        sql += ' AND subcategory_id = ?'
        params.push(filters.subcategory_id)
      }

      if (filters.status) {
        sql += ' AND status = ?'
        params.push(filters.status)
      }

      if (filters.location) {
        sql += ' AND location = ?'
        params.push(filters.location)
      }

      if (filters.supplier) {
        sql += ' AND supplier LIKE ?'
        params.push(`%${filters.supplier}%`)
      }

      if (filters.tags && filters.tags.length > 0) {
        sql += ` AND id IN (
          SELECT item_id FROM inventory_item_tags
          WHERE tag IN (${filters.tags.map(() => '?').join(', ')})
        )`
        params.push(...filters.tags)
      }

      if (filters.query) {
        // Use FTS for search
        sql += ` AND id IN (
          SELECT rowid FROM inventory_items_fts
          WHERE inventory_items_fts MATCH ?
        )`
        params.push(filters.query)
      }

      if (filters.low_stock_threshold !== undefined) {
        sql += ' AND quantity <= ?'
        params.push(filters.low_stock_threshold)
      }

      if (filters.low_stock) {
        // Find items where threshold is set AND quantity <= threshold
        sql +=
          ' AND low_stock_threshold IS NOT NULL AND quantity <= low_stock_threshold'
      }
    }

    sql += ' ORDER BY updated_at DESC'

    const stmt = this.db.prepare(sql)
    const items = stmt.all(...params) as InventoryItemRow[]

    return items.map((item) => ({
      ...item,
      tags: this.getItemTags(item.id),
    }))
  }

  /**
   * Update an inventory item
   */
  updateItem(
    id: string,
    data: UpdateInventoryItemData
  ): InventoryItemWithTags | null {
    const existing = this.findItemById(id)
    if (!existing) {
      return null
    }

    const now = new Date().toISOString()

    this.db.transaction(() => {
      // Build dynamic update
      const updates: string[] = ['updated_at = ?']
      const params: unknown[] = [now]

      if (data.name !== undefined) {
        updates.push('name = ?')
        params.push(data.name)
      }
      if (data.category_id !== undefined) {
        updates.push('category_id = ?')
        params.push(data.category_id)
      }
      if (data.subcategory_id !== undefined) {
        updates.push('subcategory_id = ?')
        params.push(data.subcategory_id)
      }
      if (data.status !== undefined) {
        updates.push('status = ?')
        params.push(data.status)
      }
      if (data.quantity !== undefined) {
        updates.push('quantity = ?')
        params.push(data.quantity)
      }
      if (data.low_stock_threshold !== undefined) {
        updates.push('low_stock_threshold = ?')
        params.push(data.low_stock_threshold)
      }
      if (data.location !== undefined) {
        updates.push('location = ?')
        params.push(data.location)
      }
      if (data.supplier !== undefined) {
        updates.push('supplier = ?')
        params.push(data.supplier)
      }
      if (data.supplier_url !== undefined) {
        updates.push('supplier_url = ?')
        params.push(data.supplier_url)
      }
      if (data.part_number !== undefined) {
        updates.push('part_number = ?')
        params.push(data.part_number)
      }
      if (data.cost !== undefined) {
        updates.push('cost = ?')
        params.push(data.cost)
      }
      if (data.barcode !== undefined) {
        updates.push('barcode = ?')
        params.push(data.barcode)
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?')
        params.push(data.notes)
      }
      if (data.image_url !== undefined) {
        updates.push('image_url = ?')
        params.push(data.image_url)
      }

      params.push(id)

      this.db
        .prepare(
          `UPDATE inventory_items SET ${updates.join(', ')} WHERE id = ?`
        )
        .run(...params)

      // Update tags
      if (data.tags !== undefined) {
        this.db
          .prepare('DELETE FROM inventory_item_tags WHERE item_id = ?')
          .run(id)
        if (data.tags.length > 0) {
          const tagStmt = this.db.prepare(
            'INSERT INTO inventory_item_tags (item_id, tag) VALUES (?, ?)'
          )
          for (const tag of data.tags) {
            tagStmt.run(id, tag)
          }
        }
      }
    })()

    return this.findItemById(id)
  }

  /**
   * Delete an inventory item
   */
  deleteItem(id: string): boolean {
    const result = this.db
      .prepare('DELETE FROM inventory_items WHERE id = ?')
      .run(id)
    return result.changes > 0
  }

  /**
   * Adjust item quantity by delta
   */
  adjustQuantity(
    id: string,
    delta: number
  ): { id: string; newQuantity: number } | null {
    const item = this.findItemById(id)
    if (!item) {
      return null
    }

    const newQuantity = Math.max(0, item.quantity + delta)
    const now = new Date().toISOString()

    this.db
      .prepare(
        'UPDATE inventory_items SET quantity = ?, updated_at = ? WHERE id = ?'
      )
      .run(newQuantity, now, id)

    return { id, newQuantity }
  }

  /**
   * Search items using full-text search
   */
  searchItems(query: string): InventoryItemWithTags[] {
    const sql = `
      SELECT i.* FROM inventory_items i
      WHERE i.rowid IN (
        SELECT rowid FROM inventory_items_fts
        WHERE inventory_items_fts MATCH ?
      )
    `

    const items = this.db.prepare(sql).all(query) as InventoryItemRow[]

    return items.map((item) => ({
      ...item,
      tags: this.getItemTags(item.id),
    }))
  }

  /**
   * Find all items that are at or below their low stock threshold
   */
  findLowStockItems(): InventoryItemWithTags[] {
    const sql = `
      SELECT * FROM inventory_items
      WHERE low_stock_threshold IS NOT NULL
        AND quantity <= low_stock_threshold
      ORDER BY quantity ASC
    `

    const items = this.db.prepare(sql).all() as InventoryItemRow[]

    return items.map((item) => ({
      ...item,
      tags: this.getItemTags(item.id),
    }))
  }

  /**
   * Get tags for an item
   */
  private getItemTags(itemId: string): string[] {
    const rows = this.db
      .prepare('SELECT tag FROM inventory_item_tags WHERE item_id = ?')
      .all(itemId) as Array<{ tag: string }>
    return rows.map((r) => r.tag)
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------

  /**
   * Create a new category
   */
  createCategory(data: {
    id?: string
    name: string
    sort_order?: number
  }): InventoryCategoryRow {
    const id = data.id ?? randomUUID()

    this.db
      .prepare(
        `
      INSERT INTO inventory_categories (id, name, sort_order)
      VALUES (?, ?, ?)
    `
      )
      .run(id, data.name, data.sort_order ?? 0)

    return this.findCategoryById(id)!
  }

  /**
   * Find a category by ID
   */
  findCategoryById(id: string): InventoryCategoryRow | null {
    const stmt = this.db.prepare(
      'SELECT * FROM inventory_categories WHERE id = ?'
    )
    return (stmt.get(id) as InventoryCategoryRow) ?? null
  }

  /**
   * Find all categories with their subcategories
   */
  findCategories(): CategoryWithSubcategories[] {
    const categories = this.db
      .prepare('SELECT * FROM inventory_categories ORDER BY sort_order')
      .all() as InventoryCategoryRow[]

    return categories.map((cat) => ({
      ...cat,
      subcategories: this.findSubcategoriesByCategoryId(cat.id),
    }))
  }

  /**
   * Update a category
   */
  updateCategory(
    id: string,
    data: { name?: string; sort_order?: number }
  ): InventoryCategoryRow | null {
    const existing = this.findCategoryById(id)
    if (!existing) {
      return null
    }

    const updates: string[] = []
    const params: unknown[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      params.push(data.name)
    }
    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?')
      params.push(data.sort_order)
    }

    if (updates.length > 0) {
      params.push(id)
      this.db
        .prepare(
          `UPDATE inventory_categories SET ${updates.join(', ')} WHERE id = ?`
        )
        .run(...params)
    }

    return this.findCategoryById(id)
  }

  /**
   * Delete a category (only if empty)
   */
  deleteCategory(id: string): boolean {
    // Check if category has items
    const itemCount = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM inventory_items WHERE category_id = ?'
      )
      .get(id) as { count: number }

    if (itemCount.count > 0) {
      throw new Error('Cannot delete category with items')
    }

    // Subcategories will cascade delete
    const result = this.db
      .prepare('DELETE FROM inventory_categories WHERE id = ?')
      .run(id)
    return result.changes > 0
  }

  // --------------------------------------------------------------------------
  // Subcategories
  // --------------------------------------------------------------------------

  /**
   * Create a new subcategory
   */
  createSubcategory(data: {
    id?: string
    category_id: string
    name: string
    sort_order?: number
  }): InventorySubcategoryRow {
    const id = data.id ?? randomUUID()

    this.db
      .prepare(
        `
      INSERT INTO inventory_subcategories (id, category_id, name, sort_order)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(id, data.category_id, data.name, data.sort_order ?? 0)

    return this.findSubcategoryById(id)!
  }

  /**
   * Find a subcategory by ID
   */
  findSubcategoryById(id: string): InventorySubcategoryRow | null {
    const stmt = this.db.prepare(
      'SELECT * FROM inventory_subcategories WHERE id = ?'
    )
    return (stmt.get(id) as InventorySubcategoryRow) ?? null
  }

  /**
   * Find subcategories for a category
   */
  findSubcategoriesByCategoryId(categoryId: string): InventorySubcategoryRow[] {
    return this.db
      .prepare(
        'SELECT * FROM inventory_subcategories WHERE category_id = ? ORDER BY sort_order'
      )
      .all(categoryId) as InventorySubcategoryRow[]
  }

  /**
   * Update a subcategory
   */
  updateSubcategory(
    id: string,
    data: { name?: string; sort_order?: number }
  ): InventorySubcategoryRow | null {
    const existing = this.findSubcategoryById(id)
    if (!existing) {
      return null
    }

    const updates: string[] = []
    const params: unknown[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      params.push(data.name)
    }
    if (data.sort_order !== undefined) {
      updates.push('sort_order = ?')
      params.push(data.sort_order)
    }

    if (updates.length > 0) {
      params.push(id)
      this.db
        .prepare(
          `UPDATE inventory_subcategories SET ${updates.join(', ')} WHERE id = ?`
        )
        .run(...params)
    }

    return this.findSubcategoryById(id)
  }

  /**
   * Delete a subcategory (only if empty)
   */
  deleteSubcategory(id: string): boolean {
    // Check if subcategory has items
    const itemCount = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM inventory_items WHERE subcategory_id = ?'
      )
      .get(id) as { count: number }

    if (itemCount.count > 0) {
      throw new Error('Cannot delete subcategory with items')
    }

    const result = this.db
      .prepare('DELETE FROM inventory_subcategories WHERE id = ?')
      .run(id)
    return result.changes > 0
  }
}
