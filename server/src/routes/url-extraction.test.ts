/**
 * URL Extraction API Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 * Tests the POST /api/inventory/extract-from-url endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express, { type Express } from 'express'
import request from 'supertest'
import { urlExtractionRouter } from './url-extraction'

// Mock fetch for external HTTP requests
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// =============================================================================
// Test Fixtures
// =============================================================================

const amazonProductPage = `
<!DOCTYPE html>
<html>
<head>
  <title>Arduino Uno R3 - Amazon.com</title>
  <meta property="og:title" content="Arduino Uno R3 Microcontroller Board">
  <meta property="og:image" content="https://m.media-amazon.com/images/I/61LcsiBjPbL.jpg">
  <meta property="og:url" content="https://www.amazon.com/dp/B008GRTSV6">
  <meta name="description" content="Arduino Uno R3 development board for electronics projects">
</head>
<body>
  <span id="productTitle">Arduino Uno R3 Microcontroller Board</span>
  <span class="a-price-whole">24</span>
  <span class="a-price-fraction">95</span>
  <script type="application/ld+json">
  {
    "@type": "Product",
    "name": "Arduino Uno R3 Microcontroller Board",
    "image": "https://m.media-amazon.com/images/I/61LcsiBjPbL.jpg",
    "offers": {
      "@type": "Offer",
      "price": "24.95",
      "priceCurrency": "USD"
    }
  }
  </script>
</body>
</html>
`

const digikeyProductPage = `
<!DOCTYPE html>
<html>
<head>
  <title>LM7805CT-ND | Texas Instruments | DigiKey</title>
  <meta property="og:title" content="LM7805CT-ND - Voltage Regulator">
  <meta property="og:image" content="https://media.digikey.com/Photos/Texas%20Instr%20Photos/LM7805CT.jpg">
</head>
<body>
  <h1 class="product-title">LM7805CT/NOPB</h1>
  <span data-testid="price-per-unit">$0.72</span>
  <span data-testid="manufacturer-part-number">LM7805CT/NOPB</span>
  <span data-testid="manufacturer">Texas Instruments</span>
  <span data-testid="digikey-part-number">LM7805CT-ND</span>
</body>
</html>
`

const mouserProductPage = `
<!DOCTYPE html>
<html>
<head>
  <title>IRF520N | Mouser</title>
  <meta property="og:title" content="IRF520N MOSFET">
  <meta property="og:image" content="https://www.mouser.com/images/vishay/lrg/IRF520N.jpg">
</head>
<body>
  <h1 id="product-title">IRF520N N-Channel MOSFET</h1>
  <span class="price">$1.23</span>
  <span class="part-number">IRF520N</span>
  <span class="manufacturer">Vishay</span>
</body>
</html>
`

const genericPageWithOpenGraph = `
<!DOCTYPE html>
<html>
<head>
  <title>Some Product</title>
  <meta property="og:title" content="Generic Product Title">
  <meta property="og:description" content="A generic product description">
  <meta property="og:image" content="https://example.com/image.jpg">
  <meta property="og:url" content="https://example.com/product">
</head>
<body>
  <h1>Generic Product</h1>
</body>
</html>
`

const pageWithoutMetadata = `
<!DOCTYPE html>
<html>
<head>
  <title>Minimal Page</title>
</head>
<body>
  <p>No useful metadata here</p>
</body>
</html>
`

// =============================================================================
// Test Setup
// =============================================================================

function createTestApp(): Express {
  const app = express()
  app.use(express.json())
  app.use('/api/inventory', urlExtractionRouter)
  return app
}

describe('URL Extraction API', () => {
  let app: Express

  beforeEach(() => {
    vi.clearAllMocks()
    app = createTestApp()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Input Validation
  // ===========================================================================

  describe('input validation', () => {
    it('should return 400 if url is missing', async () => {
      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/url.*required/i)
    })

    it('should return 400 if url is not a valid URL', async () => {
      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'not-a-url' })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/invalid url/i)
    })

    it('should return 400 if url is empty string', async () => {
      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: '' })

      expect(response.status).toBe(400)
      expect(response.body.error).toMatch(/url.*required/i)
    })
  })

  // ===========================================================================
  // Amazon Extraction
  // ===========================================================================

  describe('Amazon extraction', () => {
    it('should extract product data from Amazon product page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(amazonProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.amazon.com/dp/B008GRTSV6' })

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        name: expect.stringContaining('Arduino'),
        supplier: 'Amazon',
        supplierUrl: expect.stringContaining('amazon.com'),
        cost: 24.95,
        imageUrl: expect.stringContaining('.jpg'),
      })
    })

    it('should extract price from JSON-LD structured data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(amazonProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.amazon.com/dp/B008GRTSV6' })

      expect(response.status).toBe(200)
      expect(response.body.data.cost).toBe(24.95)
    })

    it('should handle Amazon smile URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(amazonProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://smile.amazon.com/dp/B008GRTSV6' })

      expect(response.status).toBe(200)
      expect(response.body.data.supplier).toBe('Amazon')
    })
  })

  // ===========================================================================
  // DigiKey Extraction
  // ===========================================================================

  describe('DigiKey extraction', () => {
    it('should extract product data from DigiKey product page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(digikeyProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({
          url: 'https://www.digikey.com/en/products/detail/texas-instruments/LM7805CT-NOPB/3438',
        })

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        name: expect.stringContaining('LM7805'),
        supplier: 'DigiKey',
        supplierUrl: expect.stringContaining('digikey.com'),
        partNumber: expect.stringContaining('LM7805'),
      })
    })

    it('should extract DigiKey part number', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(digikeyProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({
          url: 'https://www.digikey.com/en/products/detail/texas-instruments/LM7805CT-NOPB/3438',
        })

      expect(response.status).toBe(200)
      expect(response.body.data.partNumber).toMatch(/LM7805/)
    })
  })

  // ===========================================================================
  // Mouser Extraction
  // ===========================================================================

  describe('Mouser extraction', () => {
    it('should extract product data from Mouser product page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mouserProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.mouser.com/ProductDetail/Vishay/IRF520N' })

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        name: expect.stringContaining('IRF520N'),
        supplier: 'Mouser',
        supplierUrl: expect.stringContaining('mouser.com'),
      })
    })
  })

  // ===========================================================================
  // Generic Extraction (OpenGraph Fallback)
  // ===========================================================================

  describe('generic extraction', () => {
    it('should extract data from OpenGraph meta tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(genericPageWithOpenGraph),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://example.com/product/123' })

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({
        name: 'Generic Product Title',
        imageUrl: 'https://example.com/image.jpg',
        supplierUrl: 'https://example.com/product/123',
      })
    })

    it('should use page title as fallback when no og:title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(pageWithoutMetadata),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://example.com/page' })

      expect(response.status).toBe(200)
      expect(response.body.data.name).toBe('Minimal Page')
    })

    it('should derive supplier from hostname', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(genericPageWithOpenGraph),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.sparkfun.com/products/12345' })

      expect(response.status).toBe(200)
      expect(response.body.data.supplier).toBe('sparkfun.com')
    })
  })

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should return 502 if external fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.amazon.com/dp/B008GRTSV6' })

      expect(response.status).toBe(502)
      expect(response.body.error).toMatch(/failed to fetch/i)
    })

    it('should return 502 if external site returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.amazon.com/dp/INVALID' })

      expect(response.status).toBe(502)
      expect(response.body.error).toMatch(/404/i)
    })

    it('should handle timeout gracefully', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 100)
          )
      )

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://slow-site.com/product' })

      expect(response.status).toBe(502)
      expect(response.body.error).toMatch(/failed to fetch/i)
    })
  })

  // ===========================================================================
  // Response Format
  // ===========================================================================

  describe('response format', () => {
    it('should return extracted data in consistent format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(amazonProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.amazon.com/dp/B008GRTSV6' })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          supplier: expect.any(String),
          supplierUrl: expect.any(String),
        })
      )
      // Optional fields should be present (even if null)
      expect(response.body.data).toHaveProperty('cost')
      expect(response.body.data).toHaveProperty('partNumber')
      expect(response.body.data).toHaveProperty('imageUrl')
    })

    it('should include extraction source in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(digikeyProductPage),
      })

      const response = await request(app)
        .post('/api/inventory/extract-from-url')
        .send({ url: 'https://www.digikey.com/en/products/detail/xyz' })

      expect(response.status).toBe(200)
      expect(response.body.data._extractedFrom).toBe('digikey')
    })
  })
})
