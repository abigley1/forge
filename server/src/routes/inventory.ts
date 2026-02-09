/**
 * Inventory API Routes
 *
 * RESTful endpoints for inventory management:
 *
 * Items:
 * - GET    /api/inventory                              - List items with filters
 * - POST   /api/inventory                              - Create item
 * - GET    /api/inventory/:id                          - Get single item
 * - PUT    /api/inventory/:id                          - Update item
 * - DELETE /api/inventory/:id                          - Delete item
 * - PATCH  /api/inventory/:id/quantity                 - Adjust quantity
 *
 * Alerts:
 * - GET    /api/inventory/low-stock                    - Items below their low stock threshold
 *
 * Categories:
 * - GET    /api/inventory/categories                   - List all categories with subcategories
 * - POST   /api/inventory/categories                   - Create category
 * - PUT    /api/inventory/categories/:id               - Update category
 * - DELETE /api/inventory/categories/:id               - Delete (only if empty)
 * - POST   /api/inventory/categories/:id/subcategories - Add subcategory
 *
 * Subcategories:
 * - PUT    /api/inventory/subcategories/:id            - Update subcategory
 * - DELETE /api/inventory/subcategories/:id            - Delete subcategory
 *
 * Search:
 * - GET    /api/inventory/search?q=...                 - Full-text search
 */

import { Router, Request, Response } from 'express'
import {
  InventoryRepository,
  InventorySearchFilters,
} from '../db/InventoryRepository.js'
import type { DatabaseInstance } from '../db/index.js'

// =============================================================================
// Types
// =============================================================================

interface ItemParams {
  id: string
}

interface CategoryParams {
  id: string
}

interface SubcategoryParams {
  id: string
}

// =============================================================================
// Router
// =============================================================================

/**
 * Create the inventory router
 */
export function createInventoryRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new InventoryRepository(db)

  // ---------------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------------

  /**
   * GET /api/inventory
   * List all inventory items with optional filters
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      const filters: InventorySearchFilters = {}

      if (req.query.category) {
        filters.category_id = String(req.query.category)
      }

      if (req.query.subcategory) {
        filters.subcategory_id = String(req.query.subcategory)
      }

      if (req.query.location) {
        filters.location = String(req.query.location)
      }

      if (req.query.supplier) {
        filters.supplier = String(req.query.supplier)
      }

      if (req.query.tags) {
        filters.tags = String(req.query.tags).split(',')
      }

      if (req.query.q) {
        filters.query = String(req.query.q)
      }

      if (req.query.status) {
        filters.status = String(req.query.status) as
          | 'owned'
          | 'wishlist'
          | 'on_order'
      }

      if (req.query.low_stock === 'true') {
        filters.low_stock = true
      }

      const items = repo.findItems(filters)
      res.json({ data: items })
    } catch (error) {
      console.error('[Inventory] Error listing items:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * POST /api/inventory
   * Create a new inventory item
   */
  router.post('/', (req: Request, res: Response) => {
    try {
      const {
        name,
        category_id,
        subcategory_id,
        status,
        quantity,
        low_stock_threshold,
        location,
        supplier,
        supplier_url,
        part_number,
        cost,
        barcode,
        notes,
        image_url,
        tags,
      } = req.body

      // Validation
      if (!name) {
        res.status(400).json({ error: 'Name is required' })
        return
      }

      if (!category_id) {
        res.status(400).json({ error: 'Category is required' })
        return
      }

      const item = repo.createItem({
        name,
        category_id,
        subcategory_id,
        status,
        quantity: quantity ?? 0,
        low_stock_threshold,
        location,
        supplier,
        supplier_url,
        part_number,
        cost,
        barcode,
        notes,
        image_url,
        tags,
      })

      res.status(201).json({ data: item })
    } catch (error) {
      console.error('[Inventory] Error creating item:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * GET /api/inventory/low-stock
   * Get all items that are at or below their low stock threshold
   */
  router.get('/low-stock', (_req: Request, res: Response) => {
    try {
      const items = repo.findLowStockItems()
      res.json({ data: items })
    } catch (error) {
      console.error('[Inventory] Error fetching low stock items:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * GET /api/inventory/search
   * Full-text search for items
   */
  router.get('/search', (req: Request, res: Response) => {
    try {
      const query = req.query.q

      if (!query) {
        res.status(400).json({ error: 'Query parameter q is required' })
        return
      }

      const items = repo.searchItems(String(query))
      res.json({ data: items })
    } catch (error) {
      console.error('[Inventory] Error searching items:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * GET /api/inventory/categories
   * List all categories with subcategories
   */
  router.get('/categories', (req: Request, res: Response) => {
    try {
      const categories = repo.findCategories()
      res.json({ data: categories })
    } catch (error) {
      console.error('[Inventory] Error listing categories:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * POST /api/inventory/categories
   * Create a new category
   */
  router.post('/categories', (req: Request, res: Response) => {
    try {
      const { id, name, sort_order } = req.body

      if (!name) {
        res.status(400).json({ error: 'Name is required' })
        return
      }

      const category = repo.createCategory({
        id,
        name,
        sort_order,
      })

      res.status(201).json({ data: category })
    } catch (error) {
      console.error('[Inventory] Error creating category:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * PUT /api/inventory/categories/:id
   * Update a category
   */
  router.put(
    '/categories/:id',
    (req: Request<CategoryParams>, res: Response) => {
      try {
        const { id } = req.params
        const { name, sort_order } = req.body

        const category = repo.updateCategory(id, { name, sort_order })

        if (!category) {
          res.status(404).json({ error: 'Category not found' })
          return
        }

        res.json({ data: category })
      } catch (error) {
        console.error('[Inventory] Error updating category:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  )

  /**
   * DELETE /api/inventory/categories/:id
   * Delete a category (only if empty)
   */
  router.delete(
    '/categories/:id',
    (req: Request<CategoryParams>, res: Response) => {
      try {
        const { id } = req.params

        repo.deleteCategory(id)
        res.status(204).send()
      } catch (error) {
        if (error instanceof Error && error.message.includes('items')) {
          res.status(400).json({ error: error.message })
          return
        }
        console.error('[Inventory] Error deleting category:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  )

  /**
   * POST /api/inventory/categories/:id/subcategories
   * Create a subcategory within a category
   */
  router.post(
    '/categories/:id/subcategories',
    (req: Request<CategoryParams>, res: Response) => {
      try {
        const categoryId = req.params.id
        const { id, name, sort_order } = req.body

        // Check category exists
        const category = repo.findCategoryById(categoryId)
        if (!category) {
          res.status(404).json({ error: 'Category not found' })
          return
        }

        if (!name) {
          res.status(400).json({ error: 'Name is required' })
          return
        }

        const subcategory = repo.createSubcategory({
          id,
          category_id: categoryId,
          name,
          sort_order,
        })

        res.status(201).json({ data: subcategory })
      } catch (error) {
        console.error('[Inventory] Error creating subcategory:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  )

  /**
   * PUT /api/inventory/subcategories/:id
   * Update a subcategory
   */
  router.put(
    '/subcategories/:id',
    (req: Request<SubcategoryParams>, res: Response) => {
      try {
        const { id } = req.params
        const { name, sort_order } = req.body

        const subcategory = repo.updateSubcategory(id, { name, sort_order })

        if (!subcategory) {
          res.status(404).json({ error: 'Subcategory not found' })
          return
        }

        res.json({ data: subcategory })
      } catch (error) {
        console.error('[Inventory] Error updating subcategory:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  )

  /**
   * DELETE /api/inventory/subcategories/:id
   * Delete a subcategory (only if empty)
   */
  router.delete(
    '/subcategories/:id',
    (req: Request<SubcategoryParams>, res: Response) => {
      try {
        const { id } = req.params

        repo.deleteSubcategory(id)
        res.status(204).send()
      } catch (error) {
        if (error instanceof Error && error.message.includes('items')) {
          res.status(400).json({ error: error.message })
          return
        }
        console.error('[Inventory] Error deleting subcategory:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  )

  /**
   * GET /api/inventory/:id
   * Get a single inventory item
   */
  router.get('/:id', (req: Request<ItemParams>, res: Response) => {
    try {
      const { id } = req.params
      const item = repo.findItemById(id)

      if (!item) {
        res.status(404).json({ error: 'Item not found' })
        return
      }

      res.json({ data: item })
    } catch (error) {
      console.error('[Inventory] Error getting item:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * PUT /api/inventory/:id
   * Update an inventory item
   */
  router.put('/:id', (req: Request<ItemParams>, res: Response) => {
    try {
      const { id } = req.params
      const {
        name,
        category_id,
        subcategory_id,
        status,
        quantity,
        low_stock_threshold,
        location,
        supplier,
        supplier_url,
        part_number,
        cost,
        barcode,
        notes,
        image_url,
        tags,
      } = req.body

      const item = repo.updateItem(id, {
        name,
        category_id,
        subcategory_id,
        status,
        quantity,
        low_stock_threshold,
        location,
        supplier,
        supplier_url,
        part_number,
        cost,
        barcode,
        notes,
        image_url,
        tags,
      })

      if (!item) {
        res.status(404).json({ error: 'Item not found' })
        return
      }

      res.json({ data: item })
    } catch (error) {
      console.error('[Inventory] Error updating item:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * DELETE /api/inventory/:id
   * Delete an inventory item
   */
  router.delete('/:id', (req: Request<ItemParams>, res: Response) => {
    try {
      const { id } = req.params
      const deleted = repo.deleteItem(id)

      if (!deleted) {
        res.status(404).json({ error: 'Item not found' })
        return
      }

      res.status(204).send()
    } catch (error) {
      console.error('[Inventory] Error deleting item:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * PATCH /api/inventory/:id/quantity
   * Adjust item quantity by delta
   */
  router.patch('/:id/quantity', (req: Request<ItemParams>, res: Response) => {
    try {
      const { id } = req.params
      const { delta } = req.body

      if (delta === undefined || typeof delta !== 'number') {
        res
          .status(400)
          .json({ error: 'Delta is required and must be a number' })
        return
      }

      const result = repo.adjustQuantity(id, delta)

      if (!result) {
        res.status(404).json({ error: 'Item not found' })
        return
      }

      res.json({ data: result })
    } catch (error) {
      console.error('[Inventory] Error adjusting quantity:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
