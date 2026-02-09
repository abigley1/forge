/**
 * Inventory Validation Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 * Tests Zod schemas and validation functions for inventory module.
 */

import { describe, it, expect } from 'vitest'
import {
  validateInventoryItem,
  validateInventoryCategory,
  validateInventorySubcategory,
  inventoryItemSchema,
  inventoryCategorySchema,
  inventorySubcategorySchema,
} from './inventory-validation'
// Types imported for documentation - actual validation uses Zod inference

describe('Inventory Validation', () => {
  describe('inventoryItemSchema', () => {
    it('should validate a complete inventory item', () => {
      const item = {
        id: 'item-123',
        name: 'Arduino Uno',
        category: 'electronics',
        subcategory: 'electronics-ics',
        quantity: 5,
        location: 'Bin A3',
        supplier: 'DigiKey',
        supplierUrl: 'https://digikey.com/product/123',
        partNumber: 'ARD-UNO-R3',
        cost: 24.95,
        barcode: '012345678901',
        notes: 'Microcontroller board',
        tags: ['arduino', 'microcontroller'],
        imageUrl: 'https://example.com/image.jpg',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it('should validate item with minimum required fields', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it('should fail when id is missing', () => {
      const item = {
        name: 'Test Item',
        category: 'electronics',
        quantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('should fail when name is empty', () => {
      const item = {
        id: 'item-123',
        name: '',
        category: 'electronics',
        quantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('should fail when category is missing', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        quantity: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('should fail when quantity is negative', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: -1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('should fail when cost is negative', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: 0,
        cost: -5.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('should fail when supplierUrl is not a valid URL', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: 0,
        supplierUrl: 'not-a-url',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('should fail when imageUrl is not a valid URL', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: 0,
        imageUrl: 'invalid-url',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('should allow null for optional URL fields', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: 0,
        supplierUrl: null,
        imageUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it('should coerce date strings to Date objects', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: 0,
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
      }

      const result = inventoryItemSchema.safeParse(item)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.createdAt).toBeInstanceOf(Date)
        expect(result.data.updatedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe('inventoryCategorySchema', () => {
    it('should validate a complete category', () => {
      const category = {
        id: 'electronics',
        name: 'Electronics',
        sortOrder: 0,
      }

      const result = inventoryCategorySchema.safeParse(category)
      expect(result.success).toBe(true)
    })

    it('should fail when id is missing', () => {
      const category = {
        name: 'Electronics',
        sortOrder: 0,
      }

      const result = inventoryCategorySchema.safeParse(category)
      expect(result.success).toBe(false)
    })

    it('should fail when name is empty', () => {
      const category = {
        id: 'electronics',
        name: '',
        sortOrder: 0,
      }

      const result = inventoryCategorySchema.safeParse(category)
      expect(result.success).toBe(false)
    })

    it('should default sortOrder to 0', () => {
      const category = {
        id: 'electronics',
        name: 'Electronics',
      }

      const result = inventoryCategorySchema.safeParse(category)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sortOrder).toBe(0)
      }
    })
  })

  describe('inventorySubcategorySchema', () => {
    it('should validate a complete subcategory', () => {
      const subcategory = {
        id: 'electronics-capacitors',
        categoryId: 'electronics',
        name: 'Capacitors',
        sortOrder: 0,
      }

      const result = inventorySubcategorySchema.safeParse(subcategory)
      expect(result.success).toBe(true)
    })

    it('should fail when categoryId is missing', () => {
      const subcategory = {
        id: 'electronics-capacitors',
        name: 'Capacitors',
        sortOrder: 0,
      }

      const result = inventorySubcategorySchema.safeParse(subcategory)
      expect(result.success).toBe(false)
    })
  })

  describe('validateInventoryItem', () => {
    it('should return success result for valid item', () => {
      const item = {
        id: 'item-123',
        name: 'Test Item',
        category: 'electronics',
        quantity: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = validateInventoryItem(item)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('item-123')
      }
    })

    it('should return error result for invalid item', () => {
      const item = {
        id: 'item-123',
        // Missing name and category
        quantity: 5,
      }

      const result = validateInventoryItem(item)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_VALUE')
        expect(result.error.issues).toBeDefined()
        expect(result.error.issues!.length).toBeGreaterThan(0)
      }
    })
  })

  describe('validateInventoryCategory', () => {
    it('should return success result for valid category', () => {
      const category = {
        id: 'electronics',
        name: 'Electronics',
        sortOrder: 0,
      }

      const result = validateInventoryCategory(category)
      expect(result.success).toBe(true)
    })

    it('should return error result for invalid category', () => {
      const category = {
        id: 'electronics',
        // Missing name
      }

      const result = validateInventoryCategory(category)
      expect(result.success).toBe(false)
    })
  })

  describe('validateInventorySubcategory', () => {
    it('should return success result for valid subcategory', () => {
      const subcategory = {
        id: 'electronics-capacitors',
        categoryId: 'electronics',
        name: 'Capacitors',
        sortOrder: 0,
      }

      const result = validateInventorySubcategory(subcategory)
      expect(result.success).toBe(true)
    })

    it('should return error result for invalid subcategory', () => {
      const subcategory = {
        id: 'test',
        // Missing categoryId and name
      }

      const result = validateInventorySubcategory(subcategory)
      expect(result.success).toBe(false)
    })
  })
})
