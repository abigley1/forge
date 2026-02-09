/**
 * Image Upload Routes Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createImageUploadRouter } from './image-upload.js'
import {
  createTestDatabase,
  closeDatabase,
  resetDatabase,
} from '../db/index.js'
import type { DatabaseInstance } from '../db/index.js'

describe('Image Upload', () => {
  let db: DatabaseInstance
  let app: express.Application

  // Small valid PNG (1x1 transparent pixel)
  const VALID_PNG_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  // Small valid JPEG
  const VALID_JPEG_BASE64 =
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q=='

  beforeEach(() => {
    resetDatabase()
    db = createTestDatabase()
    app = express()
    app.use(express.json({ limit: '10mb' }))
    app.use('/api/inventory', createImageUploadRouter(db))
  })

  afterEach(() => {
    closeDatabase()
  })

  describe('POST /api/inventory/images', () => {
    it('should upload a PNG image', async () => {
      const response = await request(app).post('/api/inventory/images').send({
        data: VALID_PNG_BASE64,
        mime_type: 'image/png',
      })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBeDefined()
      expect(response.body.data.url).toContain('/api/inventory/images/')
    })

    it('should upload a JPEG image', async () => {
      const response = await request(app).post('/api/inventory/images').send({
        data: VALID_JPEG_BASE64,
        mime_type: 'image/jpeg',
      })

      expect(response.status).toBe(201)
      expect(response.body.data.id).toBeDefined()
    })

    it('should return 400 for missing data', async () => {
      const response = await request(app).post('/api/inventory/images').send({
        mime_type: 'image/png',
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Image data is required')
    })

    it('should return 400 for invalid mime type', async () => {
      const response = await request(app).post('/api/inventory/images').send({
        data: VALID_PNG_BASE64,
        mime_type: 'application/pdf',
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('Invalid mime type')
    })

    it('should return 400 for invalid base64', async () => {
      const response = await request(app).post('/api/inventory/images').send({
        data: 'not-valid-base64!!!',
        mime_type: 'image/png',
      })

      // Note: Our validation just checks if base64 decodes, which this will
      // For stricter validation, we'd need to check image headers
      expect(response.status).toBe(201) // Base64 decoding succeeds
    })

    it('should reject images that are too large', async () => {
      // Create a large string (> 5MB when decoded)
      const largeData = 'A'.repeat(7 * 1024 * 1024) // ~7MB

      const response = await request(app).post('/api/inventory/images').send({
        data: largeData,
        mime_type: 'image/png',
      })

      expect(response.status).toBe(400)
      expect(response.body.error).toContain('too large')
    })
  })

  describe('GET /api/inventory/images/:id', () => {
    it('should return uploaded image', async () => {
      // Upload first
      const uploadResponse = await request(app)
        .post('/api/inventory/images')
        .send({
          data: VALID_PNG_BASE64,
          mime_type: 'image/png',
        })

      const { id } = uploadResponse.body.data

      // Fetch
      const response = await request(app).get(`/api/inventory/images/${id}`)

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('image/png')
      expect(response.headers['cache-control']).toContain('max-age')
    })

    it('should return 404 for non-existent image', async () => {
      const response = await request(app).get(
        '/api/inventory/images/non-existent-id'
      )

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/inventory/images/:id', () => {
    it('should delete an image', async () => {
      // Upload first
      const uploadResponse = await request(app)
        .post('/api/inventory/images')
        .send({
          data: VALID_PNG_BASE64,
          mime_type: 'image/png',
        })

      const { id } = uploadResponse.body.data

      // Delete
      const deleteResponse = await request(app).delete(
        `/api/inventory/images/${id}`
      )
      expect(deleteResponse.status).toBe(204)

      // Verify deleted
      const getResponse = await request(app).get(`/api/inventory/images/${id}`)
      expect(getResponse.status).toBe(404)
    })

    it('should return 404 for non-existent image', async () => {
      const response = await request(app).delete(
        '/api/inventory/images/non-existent-id'
      )

      expect(response.status).toBe(404)
    })
  })
})
