/**
 * Inventory Type Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 * Tests type guards and factory functions for inventory module.
 */

import { describe, it, expect } from 'vitest'
import {
  createInventoryItem,
  createInventoryCategory,
  createInventorySubcategory,
  isInventoryItem,
  isInventoryCategory,
  isInventorySubcategory,
  isLowStock,
  getLowStockItems,
  type InventoryItem,
} from './inventory'

describe('Inventory Types', () => {
  describe('InventoryItem', () => {
    it('should create an inventory item with required fields', () => {
      const item = createInventoryItem('test-item', 'Test Item', 'electronics')

      expect(item.id).toBe('test-item')
      expect(item.name).toBe('Test Item')
      expect(item.category).toBe('electronics')
      expect(item.quantity).toBe(0) // Default
      expect(item.createdAt).toBeInstanceOf(Date)
      expect(item.updatedAt).toBeInstanceOf(Date)
    })

    it('should create an inventory item with all optional fields', () => {
      const item = createInventoryItem(
        'test-item',
        'Test Item',
        'electronics',
        {
          subcategory: 'capacitors',
          quantity: 10,
          location: 'Bin A3',
          supplier: 'DigiKey',
          supplierUrl: 'https://digikey.com/product/123',
          partNumber: 'CAP-100UF-25V',
          cost: 0.5,
          barcode: '012345678901',
          notes: 'Electrolytic capacitor',
          tags: ['capacitor', 'electrolytic'],
          imageUrl: 'https://example.com/image.jpg',
        }
      )

      expect(item.subcategory).toBe('capacitors')
      expect(item.quantity).toBe(10)
      expect(item.location).toBe('Bin A3')
      expect(item.supplier).toBe('DigiKey')
      expect(item.supplierUrl).toBe('https://digikey.com/product/123')
      expect(item.partNumber).toBe('CAP-100UF-25V')
      expect(item.cost).toBe(0.5)
      expect(item.barcode).toBe('012345678901')
      expect(item.notes).toBe('Electrolytic capacitor')
      expect(item.tags).toEqual(['capacitor', 'electrolytic'])
      expect(item.imageUrl).toBe('https://example.com/image.jpg')
    })

    it('should have default values for optional fields', () => {
      const item = createInventoryItem('test-item', 'Test Item', 'electronics')

      expect(item.subcategory).toBeNull()
      expect(item.quantity).toBe(0)
      expect(item.location).toBeNull()
      expect(item.supplier).toBeNull()
      expect(item.supplierUrl).toBeNull()
      expect(item.partNumber).toBeNull()
      expect(item.cost).toBeNull()
      expect(item.barcode).toBeNull()
      expect(item.notes).toBeNull()
      expect(item.tags).toEqual([])
      expect(item.imageUrl).toBeNull()
    })
  })

  describe('InventoryCategory', () => {
    it('should create a category with required fields', () => {
      const category = createInventoryCategory('electronics', 'Electronics')

      expect(category.id).toBe('electronics')
      expect(category.name).toBe('Electronics')
      expect(category.sortOrder).toBe(0) // Default
    })

    it('should create a category with sort order', () => {
      const category = createInventoryCategory('fasteners', 'Fasteners', 1)

      expect(category.id).toBe('fasteners')
      expect(category.name).toBe('Fasteners')
      expect(category.sortOrder).toBe(1)
    })
  })

  describe('InventorySubcategory', () => {
    it('should create a subcategory with required fields', () => {
      const subcategory = createInventorySubcategory(
        'electronics-capacitors',
        'electronics',
        'Capacitors'
      )

      expect(subcategory.id).toBe('electronics-capacitors')
      expect(subcategory.categoryId).toBe('electronics')
      expect(subcategory.name).toBe('Capacitors')
      expect(subcategory.sortOrder).toBe(0) // Default
    })

    it('should create a subcategory with sort order', () => {
      const subcategory = createInventorySubcategory(
        'electronics-resistors',
        'electronics',
        'Resistors',
        1
      )

      expect(subcategory.sortOrder).toBe(1)
    })
  })

  describe('Type Guards', () => {
    describe('isInventoryItem', () => {
      it('should return true for a valid inventory item', () => {
        const item = createInventoryItem('test', 'Test', 'electronics')
        expect(isInventoryItem(item)).toBe(true)
      })

      it('should return false for null', () => {
        expect(isInventoryItem(null)).toBe(false)
      })

      it('should return false for undefined', () => {
        expect(isInventoryItem(undefined)).toBe(false)
      })

      it('should return false for an object missing required fields', () => {
        expect(isInventoryItem({ id: 'test' })).toBe(false)
        expect(isInventoryItem({ id: 'test', name: 'Test' })).toBe(false)
      })

      it('should return false for an object with wrong types', () => {
        expect(
          isInventoryItem({
            id: 123, // Should be string
            name: 'Test',
            category: 'electronics',
            quantity: 0,
          })
        ).toBe(false)
      })
    })

    describe('isInventoryCategory', () => {
      it('should return true for a valid category', () => {
        const category = createInventoryCategory('electronics', 'Electronics')
        expect(isInventoryCategory(category)).toBe(true)
      })

      it('should return false for null', () => {
        expect(isInventoryCategory(null)).toBe(false)
      })

      it('should return false for an object missing required fields', () => {
        expect(isInventoryCategory({ id: 'test' })).toBe(false)
      })
    })

    describe('isInventorySubcategory', () => {
      it('should return true for a valid subcategory', () => {
        const subcategory = createInventorySubcategory(
          'electronics-capacitors',
          'electronics',
          'Capacitors'
        )
        expect(isInventorySubcategory(subcategory)).toBe(true)
      })

      it('should return false for null', () => {
        expect(isInventorySubcategory(null)).toBe(false)
      })

      it('should return false for an object missing categoryId', () => {
        expect(
          isInventorySubcategory({
            id: 'test',
            name: 'Test',
            sortOrder: 0,
          })
        ).toBe(false)
      })
    })
  })

  describe('Type compatibility', () => {
    it('should have InventoryItem type that matches the PRD data model', () => {
      // This test verifies the type structure matches the PRD
      const item: InventoryItem = {
        id: 'test-id',
        name: 'Test Item',
        category: 'electronics',
        subcategory: 'capacitors',
        status: 'owned',
        quantity: 5,
        lowStockThreshold: 10,
        location: 'Bin A3',
        supplier: 'DigiKey',
        supplierUrl: 'https://digikey.com',
        partNumber: 'ABC-123',
        cost: 1.99,
        barcode: '012345678901',
        notes: 'Test notes',
        tags: ['tag1', 'tag2'],
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Type check passes if this compiles
      expect(item.id).toBe('test-id')
    })

    it('should allow null for optional fields in InventoryItem', () => {
      const item: InventoryItem = {
        id: 'test-id',
        name: 'Test Item',
        category: 'electronics',
        subcategory: null,
        status: 'owned',
        quantity: 0,
        lowStockThreshold: null,
        location: null,
        supplier: null,
        supplierUrl: null,
        partNumber: null,
        cost: null,
        barcode: null,
        notes: null,
        tags: [],
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(item.subcategory).toBeNull()
    })
  })

  describe('Low stock helpers', () => {
    const createItem = (
      quantity: number,
      threshold: number | null
    ): InventoryItem => ({
      id: 'test-id',
      name: 'Test Item',
      category: 'electronics',
      subcategory: null,
      status: 'owned',
      quantity,
      lowStockThreshold: threshold,
      location: null,
      supplier: null,
      supplierUrl: null,
      partNumber: null,
      cost: null,
      barcode: null,
      notes: null,
      tags: [],
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    describe('isLowStock', () => {
      it('should return true when quantity is below threshold', () => {
        const item = createItem(2, 5)
        expect(isLowStock(item)).toBe(true)
      })

      it('should return true when quantity equals threshold', () => {
        const item = createItem(5, 5)
        expect(isLowStock(item)).toBe(true)
      })

      it('should return false when quantity is above threshold', () => {
        const item = createItem(10, 5)
        expect(isLowStock(item)).toBe(false)
      })

      it('should return false when threshold is null', () => {
        const item = createItem(0, null)
        expect(isLowStock(item)).toBe(false)
      })
    })

    describe('getLowStockItems', () => {
      it('should return only items below their threshold', () => {
        const items = [
          createItem(2, 5), // low stock
          createItem(10, 5), // not low stock
          createItem(0, null), // no threshold
          createItem(3, 3), // at threshold (low stock)
        ]

        const lowStock = getLowStockItems(items)

        expect(lowStock).toHaveLength(2)
        expect(lowStock[0].quantity).toBe(2)
        expect(lowStock[1].quantity).toBe(3)
      })

      it('should return empty array when no items are low stock', () => {
        const items = [createItem(10, 5), createItem(100, null)]

        expect(getLowStockItems(items)).toEqual([])
      })
    })
  })
})
