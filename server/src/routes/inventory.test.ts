/**
 * Inventory API Routes Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createTestDatabase, type DatabaseInstance } from '../db/index.js'
import { createInventoryRouter } from './inventory.js'
import { InventoryRepository } from '../db/InventoryRepository.js'

describe('Inventory API Routes', () => {
  let db: DatabaseInstance
  let app: express.Application
  let repo: InventoryRepository

  beforeEach(() => {
    db = createTestDatabase()
    repo = new InventoryRepository(db)

    app = express()
    app.use(express.json())
    app.use('/api/inventory', createInventoryRouter(db))
  })

  afterEach(() => {
    db.close()
  })

  // ==========================================================================
  // Items
  // ==========================================================================

  describe('GET /api/inventory', () => {
    it('should return empty array when no items', async () => {
      const response = await request(app).get('/api/inventory')

      expect(response.status).toBe(200)
      expect(response.body.data).toEqual([])
    })

    it('should return all items', async () => {
      repo.createItem({ name: 'Item 1', category_id: 'electronics' })
      repo.createItem({ name: 'Item 2', category_id: 'fasteners' })

      const response = await request(app).get('/api/inventory')

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBe(2)
    })

    it('should filter by category', async () => {
      repo.createItem({ name: 'Electronics Item', category_id: 'electronics' })
      repo.createItem({ name: 'Fasteners Item', category_id: 'fasteners' })

      const response = await request(app).get(
        '/api/inventory?category=electronics'
      )

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].name).toBe('Electronics Item')
    })

    it('should filter by subcategory', async () => {
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

      const response = await request(app).get(
        '/api/inventory?subcategory=electronics-capacitors'
      )

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].name).toBe('Capacitor')
    })

    it('should filter by location', async () => {
      repo.createItem({
        name: 'Item A',
        category_id: 'electronics',
        location: 'Bin A1',
      })
      repo.createItem({
        name: 'Item B',
        category_id: 'electronics',
        location: 'Bin B2',
      })

      const response = await request(app).get(
        '/api/inventory?location=Bin%20A1'
      )

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].name).toBe('Item A')
    })

    it('should filter items by low_stock threshold', async () => {
      // Items below their own threshold
      repo.createItem({
        name: 'Low Stock Item',
        category_id: 'electronics',
        quantity: 2,
        low_stock_threshold: 5,
      })
      // Items above their threshold
      repo.createItem({
        name: 'High Stock Item',
        category_id: 'electronics',
        quantity: 100,
        low_stock_threshold: 50,
      })
      // Items without threshold (should not be included)
      repo.createItem({
        name: 'No Threshold Item',
        category_id: 'electronics',
        quantity: 1,
      })

      const response = await request(app).get('/api/inventory?low_stock=true')

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].name).toBe('Low Stock Item')
    })
  })

  describe('POST /api/inventory', () => {
    it('should create an item with required fields', async () => {
      const response = await request(app).post('/api/inventory').send({
        name: 'Test Item',
        category_id: 'electronics',
        quantity: 10,
      })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBeDefined()
      expect(response.body.data.name).toBe('Test Item')
      expect(response.body.data.category_id).toBe('electronics')
      expect(response.body.data.quantity).toBe(10)
    })

    it('should create an item with all fields', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .send({
          name: 'Full Item',
          category_id: 'electronics',
          subcategory_id: 'electronics-capacitors',
          quantity: 25,
          location: 'Bin A3',
          supplier: 'DigiKey',
          supplier_url: 'https://digikey.com',
          part_number: 'CAP-100',
          cost: 0.5,
          barcode: '012345678901',
          notes: 'Test notes',
          image_url: 'https://example.com/image.jpg',
          tags: ['tag1', 'tag2'],
        })

      expect(response.status).toBe(201)
      expect(response.body.data.supplier).toBe('DigiKey')
      expect(response.body.data.tags).toEqual(['tag1', 'tag2'])
    })

    it('should return 400 for missing name', async () => {
      const response = await request(app).post('/api/inventory').send({
        category_id: 'electronics',
        quantity: 10,
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    it('should return 400 for missing category_id', async () => {
      const response = await request(app).post('/api/inventory').send({
        name: 'Test Item',
        quantity: 10,
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })
  })

  describe('GET /api/inventory/:id', () => {
    it('should return item by id', async () => {
      const item = repo.createItem({
        name: 'Test Item',
        category_id: 'electronics',
      })

      const response = await request(app).get(`/api/inventory/${item.id}`)

      expect(response.status).toBe(200)
      expect(response.body.data.id).toBe(item.id)
      expect(response.body.data.name).toBe('Test Item')
    })

    it('should return 404 for non-existent id', async () => {
      const response = await request(app).get('/api/inventory/non-existent-id')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Item not found')
    })
  })

  describe('PUT /api/inventory/:id', () => {
    it('should update item fields', async () => {
      const item = repo.createItem({
        name: 'Original',
        category_id: 'electronics',
      })

      const response = await request(app)
        .put(`/api/inventory/${item.id}`)
        .send({
          name: 'Updated',
          quantity: 50,
        })

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe('Updated')
      expect(response.body.data.quantity).toBe(50)
    })

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .put('/api/inventory/non-existent-id')
        .send({ name: 'Updated' })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Item not found')
    })
  })

  describe('DELETE /api/inventory/:id', () => {
    it('should delete item', async () => {
      const item = repo.createItem({
        name: 'To Delete',
        category_id: 'electronics',
      })

      const response = await request(app).delete(`/api/inventory/${item.id}`)

      expect(response.status).toBe(204)
      expect(repo.findItemById(item.id)).toBeNull()
    })

    it('should return 404 for non-existent id', async () => {
      const response = await request(app).delete(
        '/api/inventory/non-existent-id'
      )

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Item not found')
    })
  })

  describe('PATCH /api/inventory/:id/quantity', () => {
    it('should increase quantity', async () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        quantity: 10,
      })

      const response = await request(app)
        .patch(`/api/inventory/${item.id}/quantity`)
        .send({ delta: 5 })

      expect(response.status).toBe(200)
      expect(response.body.data.newQuantity).toBe(15)
    })

    it('should decrease quantity', async () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        quantity: 10,
      })

      const response = await request(app)
        .patch(`/api/inventory/${item.id}/quantity`)
        .send({ delta: -3 })

      expect(response.status).toBe(200)
      expect(response.body.data.newQuantity).toBe(7)
    })

    it('should not go below zero', async () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        quantity: 5,
      })

      const response = await request(app)
        .patch(`/api/inventory/${item.id}/quantity`)
        .send({ delta: -10 })

      expect(response.status).toBe(200)
      expect(response.body.data.newQuantity).toBe(0)
    })

    it('should return 400 for missing delta', async () => {
      const item = repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        quantity: 10,
      })

      const response = await request(app)
        .patch(`/api/inventory/${item.id}/quantity`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .patch('/api/inventory/non-existent-id/quantity')
        .send({ delta: 5 })

      expect(response.status).toBe(404)
    })
  })

  // ==========================================================================
  // Categories
  // ==========================================================================

  describe('GET /api/inventory/categories', () => {
    it('should return all categories with subcategories', async () => {
      const response = await request(app).get('/api/inventory/categories')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body.data)).toBe(true)

      // Should have default categories
      const electronics = response.body.data.find(
        (c: Record<string, unknown>) => c.id === 'electronics'
      )
      expect(electronics).toBeDefined()
      expect(electronics.subcategories.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/inventory/categories', () => {
    it('should create a new category', async () => {
      const response = await request(app)
        .post('/api/inventory/categories')
        .send({
          id: 'custom-category',
          name: 'Custom Category',
          sort_order: 10,
        })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBe('custom-category')
      expect(response.body.data.name).toBe('Custom Category')
    })

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/inventory/categories')
        .send({ id: 'test' })

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/inventory/categories/:id', () => {
    it('should update category', async () => {
      const category = repo.createCategory({ id: 'test-cat', name: 'Original' })

      const response = await request(app)
        .put(`/api/inventory/categories/${category.id}`)
        .send({ name: 'Updated' })

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe('Updated')
    })

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .put('/api/inventory/categories/non-existent')
        .send({ name: 'Updated' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/inventory/categories/:id', () => {
    it('should delete empty category', async () => {
      const category = repo.createCategory({
        id: 'to-delete',
        name: 'Delete Me',
      })

      const response = await request(app).delete(
        `/api/inventory/categories/${category.id}`
      )

      expect(response.status).toBe(204)
    })

    it('should return 400 when category has items', async () => {
      repo.createItem({ name: 'Item', category_id: 'electronics' })

      const response = await request(app).delete(
        '/api/inventory/categories/electronics'
      )

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('items')
    })
  })

  // ==========================================================================
  // Subcategories
  // ==========================================================================

  describe('POST /api/inventory/categories/:id/subcategories', () => {
    it('should create a new subcategory', async () => {
      const response = await request(app)
        .post('/api/inventory/categories/electronics/subcategories')
        .send({
          id: 'electronics-custom',
          name: 'Custom Subcategory',
        })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBe('electronics-custom')
      expect(response.body.data.category_id).toBe('electronics')
    })

    it('should return 404 for non-existent category', async () => {
      const response = await request(app)
        .post('/api/inventory/categories/non-existent/subcategories')
        .send({ id: 'test', name: 'Test' })

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/inventory/subcategories/:id', () => {
    it('should update subcategory', async () => {
      const subcategory = repo.createSubcategory({
        id: 'test-sub',
        category_id: 'electronics',
        name: 'Original',
      })

      const response = await request(app)
        .put(`/api/inventory/subcategories/${subcategory.id}`)
        .send({ name: 'Updated' })

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe('Updated')
    })

    it('should return 404 for non-existent id', async () => {
      const response = await request(app)
        .put('/api/inventory/subcategories/non-existent')
        .send({ name: 'Updated' })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/inventory/subcategories/:id', () => {
    it('should delete empty subcategory', async () => {
      const subcategory = repo.createSubcategory({
        id: 'to-delete-sub',
        category_id: 'electronics',
        name: 'Delete Me',
      })

      const response = await request(app).delete(
        `/api/inventory/subcategories/${subcategory.id}`
      )

      expect(response.status).toBe(204)
    })

    it('should return 400 when subcategory has items', async () => {
      repo.createItem({
        name: 'Item',
        category_id: 'electronics',
        subcategory_id: 'electronics-capacitors',
      })

      const response = await request(app).delete(
        '/api/inventory/subcategories/electronics-capacitors'
      )

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('items')
    })
  })

  // ==========================================================================
  // Search
  // ==========================================================================

  describe('GET /api/inventory/search', () => {
    it('should search items by query', async () => {
      repo.createItem({
        name: 'Arduino Uno',
        category_id: 'electronics',
        notes: 'Microcontroller',
      })
      repo.createItem({ name: 'Raspberry Pi', category_id: 'electronics' })

      const response = await request(app).get('/api/inventory/search?q=Arduino')

      expect(response.status).toBe(200)
      expect(response.body.data.length).toBe(1)
      expect(response.body.data[0].name).toBe('Arduino Uno')
    })

    it('should return 400 for missing q parameter', async () => {
      const response = await request(app).get('/api/inventory/search')

      expect(response.status).toBe(400)
      expect(response.body.error).toBeDefined()
    })
  })
})
