import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { barcodeLookupRouter } from './barcode-lookup.js'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('barcode-lookup routes', () => {
  let app: express.Express

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api/inventory', barcodeLookupRouter)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /lookup-barcode', () => {
    describe('validation', () => {
      it('should reject missing barcode', async () => {
        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({})

        expect(response.status).toBe(400)
        expect(response.body.error).toMatch(/barcode.*required/i)
      })

      it('should reject empty barcode', async () => {
        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '' })

        expect(response.status).toBe(400)
        expect(response.body.error).toMatch(/barcode.*required/i)
      })

      it('should reject non-string barcode', async () => {
        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: 12345 })

        expect(response.status).toBe(400)
        expect(response.body.error).toMatch(/barcode.*string/i)
      })

      it('should reject barcode that is too short', async () => {
        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '12345' })

        expect(response.status).toBe(400)
        expect(response.body.error).toMatch(/invalid.*barcode.*format/i)
      })

      it('should reject barcode that is too long', async () => {
        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '12345678901234567890' })

        expect(response.status).toBe(400)
        expect(response.body.error).toMatch(/invalid.*barcode.*format/i)
      })

      it('should reject barcode with non-numeric characters', async () => {
        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '12345ABCDE12' })

        expect(response.status).toBe(400)
        expect(response.body.error).toMatch(/invalid.*barcode.*format/i)
      })

      it('should accept valid UPC-A (12 digits)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 0 }), // product not found
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '012345678905' })

        expect(response.status).not.toBe(400)
      })

      it('should accept valid EAN-13 (13 digits)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 0 }), // product not found
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).not.toBe(400)
      })

      it('should accept valid EAN-8 (8 digits)', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 0 }), // product not found
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '96385074' })

        expect(response.status).not.toBe(400)
      })
    })

    describe('Open Food Facts API integration', () => {
      it('should return product info when found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              product_name: 'Test Product',
              brands: 'Test Brand',
              image_url: 'https://example.com/image.jpg',
              categories: 'Electronics, Components',
            },
          }),
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({
          found: true,
          name: 'Test Product',
          supplier: 'Test Brand',
          imageUrl: 'https://example.com/image.jpg',
          category: 'Electronics, Components',
          barcode: '5901234123457',
        })
      })

      it('should return found=false when product not in database', async () => {
        // Open Food Facts - not found
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 0, // product not found
          }),
        })

        // UPC Database fallback - also not found
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false }),
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '000000000000' })

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({
          found: false,
          barcode: '000000000000',
        })
      })

      it('should handle missing product fields gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              product_name: 'Minimal Product',
              // no brands, image_url, or categories
            },
          }),
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({
          found: true,
          name: 'Minimal Product',
          supplier: null,
          imageUrl: null,
          category: null,
          barcode: '5901234123457',
        })
      })

      it('should use generic name when product_name is missing', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 1,
            product: {
              // no product_name
              brands: 'Some Brand',
            },
          }),
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).toBe(200)
        expect(response.body.data.found).toBe(true)
        expect(response.body.data.name).toMatch(/unknown.*product/i)
      })

      it('should call Open Food Facts API with correct URL', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 0 }),
        })

        await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(mockFetch).toHaveBeenCalledWith(
          'https://world.openfoodfacts.org/api/v2/product/5901234123457.json',
          expect.objectContaining({
            headers: expect.objectContaining({
              'User-Agent': expect.stringMatching(/Forge/i),
            }),
          })
        )
      })
    })

    describe('error handling', () => {
      it('should handle API network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).toBe(503)
        expect(response.body.error).toMatch(/lookup.*service.*unavailable/i)
      })

      it('should handle API non-200 responses', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).toBe(503)
        expect(response.body.error).toMatch(/lookup.*service/i)
      })

      it('should handle malformed API response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => {
            throw new Error('Invalid JSON')
          },
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).toBe(503)
        expect(response.body.error).toMatch(/lookup.*service/i)
      })

      it('should handle API timeout', async () => {
        mockFetch.mockImplementationOnce(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
        )

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '5901234123457' })

        expect(response.status).toBe(503)
      })
    })

    describe('UPC Database fallback', () => {
      it('should try UPC Database API when Open Food Facts returns not found', async () => {
        // First call to Open Food Facts - not found
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 0 }),
        })

        // Second call to UPC Database API - found
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            title: 'UPC Product',
            brand: 'UPC Brand',
            images: ['https://example.com/upc-image.jpg'],
            category: 'Hardware',
          }),
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '012345678905' })

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({
          found: true,
          name: 'UPC Product',
          supplier: 'UPC Brand',
          imageUrl: 'https://example.com/upc-image.jpg',
          category: 'Hardware',
          barcode: '012345678905',
        })
      })

      it('should return not found if both APIs have no data', async () => {
        // Open Food Facts - not found
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 0 }),
        })

        // UPC Database - not found
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: false }),
        })

        const response = await request(app)
          .post('/api/inventory/lookup-barcode')
          .send({ barcode: '012345678905' })

        expect(response.status).toBe(200)
        expect(response.body.data).toEqual({
          found: false,
          barcode: '012345678905',
        })
      })
    })
  })
})
