/**
 * Image Upload Routes for Inventory
 *
 * Handles image uploads for inventory items.
 * Images are stored as base64 in SQLite for simplicity.
 *
 * Endpoints:
 * - POST /api/inventory/images - Upload an image
 * - GET  /api/inventory/images/:id - Get an image
 * - DELETE /api/inventory/images/:id - Delete an image
 */

import { Router, Request, Response } from 'express'
import type { DatabaseInstance } from '../db/index.js'
import { randomUUID } from 'node:crypto'

// =============================================================================
// Types
// =============================================================================

interface ImageRow {
  id: string
  mime_type: string
  data: string // base64
  created_at: string
}

interface UploadImageParams {
  id: string
}

// =============================================================================
// Validation
// =============================================================================

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Validate base64 image data
 */
function validateImageData(
  data: string,
  mimeType: string
): { success: true } | { success: false; error: string } {
  if (!data || typeof data !== 'string') {
    return { success: false, error: 'Image data is required' }
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      success: false,
      error: `Invalid mime type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  // Check size (base64 is ~4/3 the size of binary)
  const estimatedSize = Math.ceil((data.length * 3) / 4)
  if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      error: `Image too large. Maximum size is ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB`,
    }
  }

  // Validate base64 format
  try {
    // Try to decode a small portion to validate
    Buffer.from(data.slice(0, 100), 'base64')
  } catch {
    return { success: false, error: 'Invalid base64 encoding' }
  }

  return { success: true }
}

// =============================================================================
// Database Setup
// =============================================================================

/**
 * Ensure the images table exists
 */
function ensureImagesTable(db: DatabaseInstance): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_images (
      id TEXT PRIMARY KEY,
      mime_type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

// =============================================================================
// Router
// =============================================================================

export function createImageUploadRouter(db: DatabaseInstance): Router {
  const router = Router()

  // Ensure table exists
  ensureImagesTable(db)

  /**
   * POST /api/inventory/images
   * Upload an image
   */
  router.post('/images', (req: Request, res: Response) => {
    try {
      const { data, mime_type } = req.body

      // Validate
      const validation = validateImageData(data, mime_type)
      if (!validation.success) {
        res.status(400).json({ error: validation.error })
        return
      }

      // Store image
      const id = randomUUID()
      const now = new Date().toISOString()

      db.prepare(
        `
        INSERT INTO inventory_images (id, mime_type, data, created_at)
        VALUES (?, ?, ?, ?)
      `
      ).run(id, mime_type, data, now)

      // Return URL
      const url = `/api/inventory/images/${id}`
      res.status(201).json({ data: { id, url } })
    } catch (error) {
      console.error('[Image Upload] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  /**
   * GET /api/inventory/images/:id
   * Get an image (returns binary data with correct Content-Type)
   */
  router.get(
    '/images/:id',
    (req: Request<UploadImageParams>, res: Response) => {
      try {
        const { id } = req.params

        const image = db
          .prepare('SELECT * FROM inventory_images WHERE id = ?')
          .get(id) as ImageRow | undefined

        if (!image) {
          res.status(404).json({ error: 'Image not found' })
          return
        }

        // Convert base64 to binary and send
        const buffer = Buffer.from(image.data, 'base64')
        res.setHeader('Content-Type', image.mime_type)
        res.setHeader('Content-Length', buffer.length)
        res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache for 1 year
        res.send(buffer)
      } catch (error) {
        console.error('[Image Upload] Error fetching image:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  )

  /**
   * DELETE /api/inventory/images/:id
   * Delete an image
   */
  router.delete(
    '/images/:id',
    (req: Request<UploadImageParams>, res: Response) => {
      try {
        const { id } = req.params

        const result = db
          .prepare('DELETE FROM inventory_images WHERE id = ?')
          .run(id)

        if (result.changes === 0) {
          res.status(404).json({ error: 'Image not found' })
          return
        }

        res.status(204).send()
      } catch (error) {
        console.error('[Image Upload] Error deleting image:', error)
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  )

  return router
}
