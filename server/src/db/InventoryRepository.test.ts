/**
 * Tests for InventoryRepository
 *
 * Following TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDatabase, type DatabaseInstance } from './index.js'
import { InventoryRepository } from './InventoryRepository.js'

describe('InventoryRepository - Schema', () => {
  let db: DatabaseInstance

  beforeEach(() => {
    db = createTestDatabase()
  })

  afterEach(() => {
    db.close()
  })

  describe('inventory_categories table', () => {
    it('should exist with correct columns', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_categories')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const columns = tableInfo.map((col) => col.name)

      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('sort_order')
    })

    it('should have id as primary key', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_categories')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const idCol = tableInfo.find((col) => col.name === 'id')
      expect(idCol?.pk).toBe(1)
    })

    it('should require name to be NOT NULL', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_categories')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const nameCol = tableInfo.find((col) => col.name === 'name')
      expect(nameCol?.notnull).toBe(1)
    })
  })

  describe('inventory_subcategories table', () => {
    it('should exist with correct columns', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_subcategories')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const columns = tableInfo.map((col) => col.name)

      expect(columns).toContain('id')
      expect(columns).toContain('category_id')
      expect(columns).toContain('name')
      expect(columns).toContain('sort_order')
    })

    it('should have foreign key to inventory_categories', () => {
      const foreignKeys = db
        .prepare("PRAGMA foreign_key_list('inventory_subcategories')")
        .all() as Array<{ table: string; from: string; to: string }>

      const categoryFK = foreignKeys.find((fk) => fk.from === 'category_id')
      expect(categoryFK).toBeDefined()
      expect(categoryFK?.table).toBe('inventory_categories')
      expect(categoryFK?.to).toBe('id')
    })

    it('should cascade delete when category is deleted', () => {
      // Insert a category
      db.prepare(
        "INSERT INTO inventory_categories (id, name, sort_order) VALUES ('cat1', 'Test Category', 0)"
      ).run()

      // Insert a subcategory
      db.prepare(
        "INSERT INTO inventory_subcategories (id, category_id, name, sort_order) VALUES ('sub1', 'cat1', 'Test Subcategory', 0)"
      ).run()

      // Delete the category
      db.prepare("DELETE FROM inventory_categories WHERE id = 'cat1'").run()

      // Subcategory should be deleted too
      const subcategory = db
        .prepare("SELECT * FROM inventory_subcategories WHERE id = 'sub1'")
        .get()
      expect(subcategory).toBeUndefined()
    })
  })

  describe('inventory_items table', () => {
    it('should exist with all required columns', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_items')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const columns = tableInfo.map((col) => col.name)

      // Required fields from PRD
      expect(columns).toContain('id')
      expect(columns).toContain('name')
      expect(columns).toContain('category_id')
      expect(columns).toContain('subcategory_id')
      expect(columns).toContain('quantity')
      expect(columns).toContain('location')
      expect(columns).toContain('supplier')
      expect(columns).toContain('supplier_url')
      expect(columns).toContain('part_number')
      expect(columns).toContain('cost')
      expect(columns).toContain('barcode')
      expect(columns).toContain('notes')
      expect(columns).toContain('image_url')
      expect(columns).toContain('created_at')
      expect(columns).toContain('updated_at')
    })

    it('should have foreign key to inventory_categories', () => {
      const foreignKeys = db
        .prepare("PRAGMA foreign_key_list('inventory_items')")
        .all() as Array<{ table: string; from: string; to: string }>

      const categoryFK = foreignKeys.find((fk) => fk.from === 'category_id')
      expect(categoryFK).toBeDefined()
      expect(categoryFK?.table).toBe('inventory_categories')
    })

    it('should have foreign key to inventory_subcategories', () => {
      const foreignKeys = db
        .prepare("PRAGMA foreign_key_list('inventory_items')")
        .all() as Array<{ table: string; from: string; to: string }>

      const subcategoryFK = foreignKeys.find(
        (fk) => fk.from === 'subcategory_id'
      )
      expect(subcategoryFK).toBeDefined()
      expect(subcategoryFK?.table).toBe('inventory_subcategories')
    })

    it('should require name to be NOT NULL', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_items')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const nameCol = tableInfo.find((col) => col.name === 'name')
      expect(nameCol?.notnull).toBe(1)
    })

    it('should require category_id to be NOT NULL', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_items')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const categoryCol = tableInfo.find((col) => col.name === 'category_id')
      expect(categoryCol?.notnull).toBe(1)
    })

    it('should require quantity to be NOT NULL with default 0', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_items')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
        dflt_value: string | null
      }>

      const qtyCol = tableInfo.find((col) => col.name === 'quantity')
      expect(qtyCol?.notnull).toBe(1)
    })
  })

  describe('inventory_item_tags table', () => {
    it('should exist with correct columns', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_item_tags')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const columns = tableInfo.map((col) => col.name)

      expect(columns).toContain('item_id')
      expect(columns).toContain('tag')
    })

    it('should have composite primary key on item_id and tag', () => {
      const tableInfo = db
        .prepare("PRAGMA table_info('inventory_item_tags')")
        .all() as Array<{
        name: string
        type: string
        notnull: number
        pk: number
      }>

      const itemIdPk = tableInfo.find((col) => col.name === 'item_id')?.pk
      const tagPk = tableInfo.find((col) => col.name === 'tag')?.pk

      // Both should be part of the primary key (pk > 0)
      expect(itemIdPk).toBeGreaterThan(0)
      expect(tagPk).toBeGreaterThan(0)
    })

    it('should cascade delete when item is deleted', () => {
      // Insert a category and item first
      db.prepare(
        "INSERT INTO inventory_categories (id, name, sort_order) VALUES ('cat1', 'Test', 0)"
      ).run()
      db.prepare(
        "INSERT INTO inventory_items (id, name, category_id, quantity, created_at, updated_at) VALUES ('item1', 'Test Item', 'cat1', 1, datetime('now'), datetime('now'))"
      ).run()
      db.prepare(
        "INSERT INTO inventory_item_tags (item_id, tag) VALUES ('item1', 'testtag')"
      ).run()

      // Delete the item
      db.prepare("DELETE FROM inventory_items WHERE id = 'item1'").run()

      // Tag should be deleted too
      const tag = db
        .prepare("SELECT * FROM inventory_item_tags WHERE item_id = 'item1'")
        .get()
      expect(tag).toBeUndefined()
    })
  })

  describe('inventory_items_fts (full-text search)', () => {
    it('should exist as a virtual FTS5 table', () => {
      const tables = db
        .prepare(
          "SELECT name, sql FROM sqlite_master WHERE type='table' AND name='inventory_items_fts'"
        )
        .get() as { name: string; sql: string } | undefined

      expect(tables).toBeDefined()
      expect(tables?.sql?.toLowerCase()).toContain('fts5')
    })

    it('should search across name, notes, and part_number', () => {
      // Insert test data
      db.prepare(
        "INSERT INTO inventory_categories (id, name, sort_order) VALUES ('cat1', 'Electronics', 0)"
      ).run()
      db.prepare(
        "INSERT INTO inventory_items (id, name, category_id, quantity, notes, part_number, created_at, updated_at) VALUES ('item1', 'Arduino Uno', 'cat1', 1, 'Microcontroller board', 'ARDUNOR3', datetime('now'), datetime('now'))"
      ).run()

      // Search by name
      const byName = db
        .prepare(
          "SELECT * FROM inventory_items_fts WHERE inventory_items_fts MATCH 'Arduino'"
        )
        .all()
      expect(byName.length).toBeGreaterThan(0)

      // Search by notes
      const byNotes = db
        .prepare(
          "SELECT * FROM inventory_items_fts WHERE inventory_items_fts MATCH 'Microcontroller'"
        )
        .all()
      expect(byNotes.length).toBeGreaterThan(0)

      // Search by part_number (using simple alphanumeric)
      const byPartNumber = db
        .prepare(
          "SELECT * FROM inventory_items_fts WHERE inventory_items_fts MATCH 'ARDUNOR3'"
        )
        .all()
      expect(byPartNumber.length).toBeGreaterThan(0)
    })
  })

  describe('default categories', () => {
    it('should have seeded default categories', () => {
      const categories = db
        .prepare('SELECT * FROM inventory_categories ORDER BY sort_order')
        .all() as Array<{ id: string; name: string; sort_order: number }>

      // Check for expected default categories from PRD
      const categoryNames = categories.map((c) => c.name)

      expect(categoryNames).toContain('Electronics')
      expect(categoryNames).toContain('Fasteners')
      expect(categoryNames).toContain('Mechanical')
      expect(categoryNames).toContain('Raw Materials')
      expect(categoryNames).toContain('Tools')
      expect(categoryNames).toContain('Consumables')
      expect(categoryNames).toContain('Other')
    })

    it('should have seeded default subcategories for Electronics', () => {
      const electronicsCategory = db
        .prepare(
          "SELECT id FROM inventory_categories WHERE name = 'Electronics'"
        )
        .get() as { id: string } | undefined

      expect(electronicsCategory).toBeDefined()

      const subcategories = db
        .prepare(
          'SELECT name FROM inventory_subcategories WHERE category_id = ? ORDER BY sort_order'
        )
        .all(electronicsCategory!.id) as Array<{ name: string }>

      const subcategoryNames = subcategories.map((s) => s.name)

      expect(subcategoryNames).toContain('Capacitors')
      expect(subcategoryNames).toContain('Resistors')
      expect(subcategoryNames).toContain('ICs')
      expect(subcategoryNames).toContain('Connectors')
      expect(subcategoryNames).toContain('Sensors')
      expect(subcategoryNames).toContain('LEDs')
      expect(subcategoryNames).toContain('Other')
    })

    it('should have seeded default subcategories for Fasteners', () => {
      const fastenersCategory = db
        .prepare("SELECT id FROM inventory_categories WHERE name = 'Fasteners'")
        .get() as { id: string } | undefined

      expect(fastenersCategory).toBeDefined()

      const subcategories = db
        .prepare(
          'SELECT name FROM inventory_subcategories WHERE category_id = ? ORDER BY sort_order'
        )
        .all(fastenersCategory!.id) as Array<{ name: string }>

      const subcategoryNames = subcategories.map((s) => s.name)

      expect(subcategoryNames).toContain('Screws')
      expect(subcategoryNames).toContain('Nuts')
      expect(subcategoryNames).toContain('Bolts')
      expect(subcategoryNames).toContain('Washers')
      expect(subcategoryNames).toContain('Standoffs')
      expect(subcategoryNames).toContain('Other')
    })
  })

  describe('indexes', () => {
    it('should have index on inventory_items.category_id', () => {
      const indexes = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='inventory_items'"
        )
        .all() as Array<{ name: string }>

      const indexNames = indexes.map((i) => i.name)
      expect(indexNames.some((n) => n.includes('category'))).toBe(true)
    })

    it('should have index on inventory_items.subcategory_id', () => {
      const indexes = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='inventory_items'"
        )
        .all() as Array<{ name: string }>

      const indexNames = indexes.map((i) => i.name)
      expect(indexNames.some((n) => n.includes('subcategory'))).toBe(true)
    })

    it('should have index on inventory_items.location', () => {
      const indexes = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='inventory_items'"
        )
        .all() as Array<{ name: string }>

      const indexNames = indexes.map((i) => i.name)
      expect(indexNames.some((n) => n.includes('location'))).toBe(true)
    })
  })
})

// ============================================================================
// InventoryRepository CRUD Tests
// ============================================================================

describe('InventoryRepository', () => {
  let db: DatabaseInstance
  let repo: InventoryRepository

  beforeEach(() => {
    db = createTestDatabase()
    repo = new InventoryRepository(db)
  })

  afterEach(() => {
    db.close()
  })

  describe('Items - Create', () => {
    it('should create an item with required fields', () => {
      const item = repo.createItem({
        name: 'Arduino Uno',
        category_id: 'electronics',
      })

      expect(item.id).toBeDefined()
      expect(item.name).toBe('Arduino Uno')
      expect(item.category_id).toBe('electronics')
      expect(item.quantity).toBe(0)
      expect(item.tags).toEqual([])
    })

    it('should create an item with all fields', () => {
      const item = repo.createItem({
        name: 'Capacitor 100uF',
        category_id: 'electronics',
        subcategory_id: 'electronics-capacitors',
        quantity: 50,
        location: 'Bin A3',
        supplier: 'DigiKey',
        supplier_url: 'https://digikey.com/cap100',
        part_number: 'CAP-100UF-25V',
        cost: 0.25,
        barcode: '012345678901',
        notes: 'Electrolytic capacitor',
        image_url: 'https://example.com/cap.jpg',
        tags: ['capacitor', 'electrolytic'],
      })

      expect(item.subcategory_id).toBe('electronics-capacitors')
      expect(item.quantity).toBe(50)
      expect(item.location).toBe('Bin A3')
      expect(item.supplier).toBe('DigiKey')
      expect(item.supplier_url).toBe('https://digikey.com/cap100')
      expect(item.part_number).toBe('CAP-100UF-25V')
      expect(item.cost).toBe(0.25)
      expect(item.barcode).toBe('012345678901')
      expect(item.notes).toBe('Electrolytic capacitor')
      expect(item.image_url).toBe('https://example.com/cap.jpg')
      expect(item.tags).toEqual(['capacitor', 'electrolytic'])
    })

    it('should generate UUID if id not provided', () => {
      const item1 = repo.createItem({
        name: 'Item 1',
        category_id: 'electronics',
      })
      const item2 = repo.createItem({
        name: 'Item 2',
        category_id: 'electronics',
      })

      expect(item1.id).not.toBe(item2.id)
      expect(item1.id.length).toBe(36) // UUID format
    })

    it('should use provided id if given', () => {
      const item = repo.createItem({
        id: 'my-custom-id',
        name: 'Item 1',
        category_id: 'electronics',
      })

      expect(item.id).toBe('my-custom-id')
    })
  })

  describe('Items - Find', () => {
    it('should find item by id', () => {
      const created = repo.createItem({
        name: 'Test Item',
        category_id: 'electronics',
      })

      const found = repo.findItemById(created.id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.name).toBe('Test Item')
    })

    it('should return null for non-existent id', () => {
      const found = repo.findItemById('non-existent-id')
      expect(found).toBeNull()
    })

    it('should find all items', () => {
      repo.createItem({ name: 'Item 1', category_id: 'electronics' })
      repo.createItem({ name: 'Item 2', category_id: 'fasteners' })

      const items = repo.findItems()

      expect(items.length).toBe(2)
    })

    it('should filter items by category', () => {
      repo.createItem({ name: 'Item 1', category_id: 'electronics' })
      repo.createItem({ name: 'Item 2', category_id: 'fasteners' })

      const items = repo.findItems({ category_id: 'electronics' })

      expect(items.length).toBe(1)
      expect(items[0].name).toBe('Item 1')
    })

    it('should filter items by subcategory', () => {
      repo.createItem({
        name: 'Capacitor',
        category_id: 'electronics',
        subcategory_id: 'electronics-capacitors',
      })
      repo.createItem({
        name: 'Resistor',
        category_id: 'electronics',
        subcategory_id: 'electronics-resistors',
      })

      const items = repo.findItems({ subcategory_id: 'electronics-capacitors' })

      expect(items.length).toBe(1)
      expect(items[0].name).toBe('Capacitor')
    })

    it('should filter items by location', () => {
      repo.createItem({
        name: 'Item 1',
        category_id: 'electronics',
        location: 'Bin A1',
      })
      repo.createItem({
        name: 'Item 2',
        category_id: 'electronics',
        location: 'Bin B2',
      })

      const items = repo.findItems({ location: 'Bin A1' })

      expect(items.length).toBe(1)
      expect(items[0].name).toBe('Item 1')
    })

    it('should filter items by tags', () => {
      repo.createItem({
        name: 'Item 1',
        category_id: 'electronics',
        tags: ['urgent', 'review'],
      })
      repo.createItem({
        name: 'Item 2',
        category_id: 'electronics',
        tags: ['low-priority'],
      })

      const items = repo.findItems({ tags: ['urgent'] })

      expect(items.length).toBe(1)
      expect(items[0].name).toBe('Item 1')
    })
  })

  describe('Items - Update', () => {
    it('should update item fields', () => {
      const item = repo.createItem({
        name: 'Original',
        category_id: 'electronics',
      })

      const updated = repo.updateItem(item.id, {
        name: 'Updated Name',
        quantity: 10,
        location: 'Bin C3',
      })

      expect(updated!.name).toBe('Updated Name')
      expect(updated!.quantity).toBe(10)
      expect(updated!.location).toBe('Bin C3')
    })

    it('should update item tags', () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        tags: ['old-tag'],
      })

      const updated = repo.updateItem(item.id, {
        tags: ['new-tag-1', 'new-tag-2'],
      })

      expect(updated!.tags).toEqual(['new-tag-1', 'new-tag-2'])
    })

    it('should return null for non-existent id', () => {
      const result = repo.updateItem('non-existent', { name: 'Test' })
      expect(result).toBeNull()
    })
  })

  describe('Items - Delete', () => {
    it('should delete existing item', () => {
      const item = repo.createItem({
        name: 'To Delete',
        category_id: 'electronics',
      })

      const deleted = repo.deleteItem(item.id)

      expect(deleted).toBe(true)
      expect(repo.findItemById(item.id)).toBeNull()
    })

    it('should return false for non-existent id', () => {
      const deleted = repo.deleteItem('non-existent')
      expect(deleted).toBe(false)
    })

    it('should cascade delete tags', () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        tags: ['tag1', 'tag2'],
      })

      repo.deleteItem(item.id)

      // Verify tags were deleted
      const tags = db
        .prepare('SELECT * FROM inventory_item_tags WHERE item_id = ?')
        .all(item.id)
      expect(tags.length).toBe(0)
    })
  })

  describe('Items - Quantity Adjustment', () => {
    it('should increase quantity', () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        quantity: 10,
      })

      const result = repo.adjustQuantity(item.id, 5)

      expect(result!.newQuantity).toBe(15)
      expect(repo.findItemById(item.id)!.quantity).toBe(15)
    })

    it('should decrease quantity', () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        quantity: 10,
      })

      const result = repo.adjustQuantity(item.id, -3)

      expect(result!.newQuantity).toBe(7)
    })

    it('should not go below zero', () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        quantity: 5,
      })

      const result = repo.adjustQuantity(item.id, -10)

      expect(result!.newQuantity).toBe(0)
    })

    it('should return null for non-existent id', () => {
      const result = repo.adjustQuantity('non-existent', 5)
      expect(result).toBeNull()
    })
  })

  describe('Categories - CRUD', () => {
    it('should list default categories', () => {
      const categories = repo.findCategories()

      expect(categories.length).toBeGreaterThan(0)
      expect(categories.some((c) => c.name === 'Electronics')).toBe(true)
    })

    it('should create a new category', () => {
      const category = repo.createCategory({
        id: 'custom-category',
        name: 'Custom Category',
        sort_order: 10,
      })

      expect(category.id).toBe('custom-category')
      expect(category.name).toBe('Custom Category')
      expect(category.sort_order).toBe(10)
    })

    it('should update category name', () => {
      const category = repo.createCategory({
        id: 'test-cat',
        name: 'Original Name',
      })

      const updated = repo.updateCategory(category.id, { name: 'New Name' })

      expect(updated!.name).toBe('New Name')
    })

    it('should delete empty category', () => {
      const category = repo.createCategory({
        id: 'to-delete',
        name: 'Delete Me',
      })

      const deleted = repo.deleteCategory(category.id)

      expect(deleted).toBe(true)
      expect(repo.findCategoryById(category.id)).toBeNull()
    })

    it('should throw when deleting category with items', () => {
      repo.createItem({ name: 'Item', category_id: 'electronics' })

      expect(() => repo.deleteCategory('electronics')).toThrow(
        'Cannot delete category with items'
      )
    })

    it('should include subcategories when finding categories', () => {
      const categories = repo.findCategories()
      const electronics = categories.find((c) => c.id === 'electronics')

      expect(electronics).toBeDefined()
      expect(electronics!.subcategories.length).toBeGreaterThan(0)
      expect(
        electronics!.subcategories.some((s) => s.name === 'Capacitors')
      ).toBe(true)
    })
  })

  describe('Subcategories - CRUD', () => {
    it('should create a new subcategory', () => {
      const subcategory = repo.createSubcategory({
        id: 'electronics-custom',
        category_id: 'electronics',
        name: 'Custom Subcategory',
        sort_order: 99,
      })

      expect(subcategory.id).toBe('electronics-custom')
      expect(subcategory.category_id).toBe('electronics')
      expect(subcategory.name).toBe('Custom Subcategory')
      expect(subcategory.sort_order).toBe(99)
    })

    it('should update subcategory name', () => {
      const subcategory = repo.createSubcategory({
        id: 'test-sub',
        category_id: 'electronics',
        name: 'Original',
      })

      const updated = repo.updateSubcategory(subcategory.id, {
        name: 'Updated',
      })

      expect(updated!.name).toBe('Updated')
    })

    it('should delete empty subcategory', () => {
      const subcategory = repo.createSubcategory({
        id: 'to-delete-sub',
        category_id: 'electronics',
        name: 'Delete Me',
      })

      const deleted = repo.deleteSubcategory(subcategory.id)

      expect(deleted).toBe(true)
      expect(repo.findSubcategoryById(subcategory.id)).toBeNull()
    })

    it('should throw when deleting subcategory with items', () => {
      repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        subcategory_id: 'electronics-capacitors',
      })

      expect(() => repo.deleteSubcategory('electronics-capacitors')).toThrow(
        'Cannot delete subcategory with items'
      )
    })
  })

  describe('Search', () => {
    it('should search items by name', () => {
      repo.createItem({
        name: 'Arduino Uno',
        category_id: 'electronics',
        notes: 'Microcontroller board',
      })
      repo.createItem({
        name: 'Raspberry Pi',
        category_id: 'electronics',
        notes: 'Single board computer',
      })

      const results = repo.searchItems('Arduino')

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Arduino Uno')
    })

    it('should search items by notes', () => {
      repo.createItem({
        name: 'Item 1',
        category_id: 'electronics',
        notes: 'Important microcontroller',
      })
      repo.createItem({
        name: 'Item 2',
        category_id: 'electronics',
        notes: 'Regular component',
      })

      const results = repo.searchItems('microcontroller')

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Item 1')
    })
  })
})
