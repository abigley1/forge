/**
 * Unit Tests for Supplier Link Parser Service (Task 15.1)
 *
 * Tests the parsing of supplier links to extract component metadata.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  detectSupplier,
  isValidSupplierUrl,
  extractPartNumberFromUrl,
  parseLink,
  SUPPORTED_SUPPLIERS,
  type SupplierType,
} from './supplier-parser'

describe('Supplier Link Parser Service (15.1)', () => {
  // ===========================================================================
  // Supplier Type Detection
  // ===========================================================================

  describe('detectSupplier', () => {
    it('detects Amazon links', () => {
      expect(detectSupplier('https://www.amazon.com/dp/B08N5WRWNW')).toBe(
        'amazon'
      )
    })

    it('detects DigiKey links', () => {
      expect(
        detectSupplier(
          'https://www.digikey.com/en/products/detail/texas-instruments/LM7805CT-NOPB/3440'
        )
      ).toBe('digikey')
    })

    it('detects Mouser links', () => {
      expect(
        detectSupplier(
          'https://www.mouser.com/ProductDetail/Texas-Instruments/LM7805CT-NOPB'
        )
      ).toBe('mouser')
    })

    it('detects LCSC links', () => {
      expect(
        detectSupplier(
          'https://www.lcsc.com/product-detail/Voltage-Regulators_C347376.html'
        )
      ).toBe('lcsc')
    })

    it('detects McMaster-Carr links', () => {
      expect(detectSupplier('https://www.mcmaster.com/91251A195')).toBe(
        'mcmaster'
      )
    })

    it('detects Adafruit links', () => {
      expect(detectSupplier('https://www.adafruit.com/product/5483')).toBe(
        'adafruit'
      )
    })

    it('returns unknown for unsupported URLs', () => {
      expect(detectSupplier('https://www.randomsite.com/product/123')).toBe(
        'unknown'
      )
    })

    it('handles URLs with different protocols', () => {
      expect(detectSupplier('http://www.digikey.com/products/123')).toBe(
        'digikey'
      )
    })

    it('handles URLs with subdomains', () => {
      expect(detectSupplier('https://smile.amazon.com/dp/B08N5WRWNW')).toBe(
        'amazon'
      )
    })

    it('handles Amazon short links', () => {
      expect(detectSupplier('https://amzn.to/abc123')).toBe('amazon')
    })

    it('handles international DigiKey domains', () => {
      expect(detectSupplier('https://www.digikey.co.uk/products/123')).toBe(
        'digikey'
      )
      expect(detectSupplier('https://www.digikey.de/products/123')).toBe(
        'digikey'
      )
    })

    it('handles international Mouser domains', () => {
      expect(detectSupplier('https://www.mouser.co.uk/product/123')).toBe(
        'mouser'
      )
      expect(detectSupplier('https://www.mouser.cn/product/123')).toBe('mouser')
    })

    it('handles invalid URLs gracefully', () => {
      expect(detectSupplier('not-a-url')).toBe('unknown')
      expect(detectSupplier('')).toBe('unknown')
    })
  })

  // ===========================================================================
  // URL Validation
  // ===========================================================================

  describe('isValidSupplierUrl', () => {
    it('validates well-formed URLs from supported suppliers', () => {
      expect(isValidSupplierUrl('https://www.amazon.com/dp/B08N5WRWNW')).toBe(
        true
      )
      expect(isValidSupplierUrl('https://www.digikey.com/products/123')).toBe(
        true
      )
      expect(isValidSupplierUrl('https://www.mouser.com/product/123')).toBe(
        true
      )
      expect(isValidSupplierUrl('https://www.lcsc.com/product/123')).toBe(true)
      expect(isValidSupplierUrl('https://www.mcmaster.com/91251A195')).toBe(
        true
      )
    })

    it('rejects malformed URLs', () => {
      expect(isValidSupplierUrl('not-a-url')).toBe(false)
      expect(isValidSupplierUrl('')).toBe(false)
      expect(isValidSupplierUrl('ftp://amazon.com')).toBe(true) // valid URL, valid supplier
    })

    it('rejects URLs without supported suppliers', () => {
      expect(
        isValidSupplierUrl('https://www.google.com/search?q=capacitor')
      ).toBe(false)
      expect(isValidSupplierUrl('https://www.ebay.com/product/123')).toBe(false)
    })
  })

  // ===========================================================================
  // Part Number Extraction
  // ===========================================================================

  describe('extractPartNumberFromUrl', () => {
    describe('Amazon', () => {
      it('extracts ASIN from /dp/ format', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.amazon.com/dp/B08N5WRWNW',
            'amazon'
          )
        ).toBe('B08N5WRWNW')
      })

      it('extracts ASIN from /gp/product/ format', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.amazon.com/gp/product/B08N5WRWNW',
            'amazon'
          )
        ).toBe('B08N5WRWNW')
      })

      it('extracts ASIN with query params', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.amazon.com/dp/B08N5WRWNW?ref=something',
            'amazon'
          )
        ).toBe('B08N5WRWNW')
      })

      it('returns null for URLs without ASIN', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.amazon.com/s?k=capacitor',
            'amazon'
          )
        ).toBe(null)
      })
    })

    describe('DigiKey', () => {
      it('extracts part number from product detail URL', () => {
        const result = extractPartNumberFromUrl(
          'https://www.digikey.com/en/products/detail/texas-instruments/LM7805CT-NOPB/3440',
          'digikey'
        )
        expect(result).toBe('LM7805CT-NOPB')
      })

      it('extracts DigiKey part number when MFG part not present', () => {
        const result = extractPartNumberFromUrl(
          'https://www.digikey.com/en/products/detail/3440',
          'digikey'
        )
        expect(result).toBe('3440')
      })
    })

    describe('Mouser', () => {
      it('extracts part number from ProductDetail URL', () => {
        const result = extractPartNumberFromUrl(
          'https://www.mouser.com/ProductDetail/Texas-Instruments/LM7805CT-NOPB',
          'mouser'
        )
        expect(result).toBe('LM7805CT-NOPB')
      })
    })

    describe('LCSC', () => {
      it('extracts LCSC part number from URL', () => {
        const result = extractPartNumberFromUrl(
          'https://www.lcsc.com/product-detail/Voltage-Regulators_C347376.html',
          'lcsc'
        )
        expect(result).toBe('C347376')
      })
    })

    describe('McMaster-Carr', () => {
      it('extracts part number from URL', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.mcmaster.com/91251A195',
            'mcmaster'
          )
        ).toBe('91251A195')
      })

      it('extracts alphanumeric part numbers', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.mcmaster.com/9541K71',
            'mcmaster'
          )
        ).toBe('9541K71')
      })
    })

    describe('Adafruit', () => {
      it('extracts product ID from URL', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.adafruit.com/product/5483',
            'adafruit'
          )
        ).toBe('5483')
      })

      it('extracts product ID from URL with product name', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.adafruit.com/product/4884',
            'adafruit'
          )
        ).toBe('4884')
      })

      it('returns null for non-product URLs', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.adafruit.com/category/35',
            'adafruit'
          )
        ).toBe(null)
      })
    })

    describe('Unknown supplier', () => {
      it('returns null for unknown supplier', () => {
        expect(
          extractPartNumberFromUrl(
            'https://www.unknown.com/product/123',
            'unknown' as SupplierType
          )
        ).toBe(null)
      })
    })
  })

  // ===========================================================================
  // Supported Suppliers List
  // ===========================================================================

  describe('SUPPORTED_SUPPLIERS', () => {
    it('is an array', () => {
      expect(Array.isArray(SUPPORTED_SUPPLIERS)).toBe(true)
    })

    it('includes all required suppliers', () => {
      expect(SUPPORTED_SUPPLIERS).toContain('amazon')
      expect(SUPPORTED_SUPPLIERS).toContain('digikey')
      expect(SUPPORTED_SUPPLIERS).toContain('mouser')
      expect(SUPPORTED_SUPPLIERS).toContain('lcsc')
      expect(SUPPORTED_SUPPLIERS).toContain('mcmaster')
    })

    it('does not include unknown', () => {
      expect(SUPPORTED_SUPPLIERS).not.toContain('unknown')
    })
  })

  // ===========================================================================
  // Parse Link
  // ===========================================================================

  describe('parseLink', () => {
    it('returns error for invalid URLs', async () => {
      const result = await parseLink('not-a-valid-url')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_URL')
        expect(result.error.message).toContain('Invalid')
      }
    })

    it('returns error for unsupported suppliers', async () => {
      const result = await parseLink(
        'https://www.unsupported-site.com/product/123'
      )
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('UNSUPPORTED_SUPPLIER')
        expect(result.error.message).toContain('Unsupported')
      }
    })

    it('returns PartialComponentData structure on success', async () => {
      // Mock fetch to avoid actual network requests
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', mockFetch)

      const result = await parseLink('https://www.amazon.com/dp/B08N5WRWNW')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveProperty('title')
        expect(result.data).toHaveProperty('price')
        expect(result.data).toHaveProperty('partNumber')
        expect(result.data).toHaveProperty('manufacturer')
        expect(result.data).toHaveProperty('description')
        expect(result.data).toHaveProperty('imageUrl')
        expect(result.data).toHaveProperty('supplier')
        expect(result.data).toHaveProperty('supplierUrl')
      }

      vi.unstubAllGlobals()
    })

    it('includes supplier URL in result', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', mockFetch)

      const url = 'https://www.digikey.com/en/products/detail/test/123'
      const result = await parseLink(url)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.supplierUrl).toBe(url)
      }

      vi.unstubAllGlobals()
    })

    it('includes detected supplier name', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', mockFetch)

      const result = await parseLink(
        'https://www.mouser.com/ProductDetail/test'
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.supplier).toBe('Mouser')
      }

      vi.unstubAllGlobals()
    })

    it('extracts part number from URL', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.stubGlobal('fetch', mockFetch)

      const result = await parseLink('https://www.amazon.com/dp/B08N5WRWNW')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.partNumber).toBe('B08N5WRWNW')
      }

      vi.unstubAllGlobals()
    })

    it('handles successful fetch with metadata', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Product - Amazon.com</title>
          <meta property="og:title" content="Test Product Title">
          <meta property="og:image" content="https://images.example.com/test.jpg">
          <meta property="og:description" content="Test product description">
          <script type="application/ld+json">
            {"offers":{"price":"29.99"},"brand":{"name":"TestBrand"}}
          </script>
        </head>
        <body></body>
        </html>
      `

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await parseLink('https://www.amazon.com/dp/B08N5WRWNW')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Test Product Title')
        expect(result.data.imageUrl).toBe('https://images.example.com/test.jpg')
        expect(result.data.description).toBe('Test product description')
        expect(result.data.price).toBe(29.99)
        expect(result.data.manufacturer).toBe('TestBrand')
      }

      vi.unstubAllGlobals()
    })

    it('falls back to title tag when OG title not available', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Fallback Title</title>
        </head>
        <body></body>
        </html>
      `

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await parseLink('https://www.amazon.com/dp/B08N5WRWNW')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Fallback Title')
      }

      vi.unstubAllGlobals()
    })

    it('handles HTTP errors gracefully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })
      vi.stubGlobal('fetch', mockFetch)

      // Should return success with minimal data (CORS/network errors return partial data)
      const result = await parseLink('https://www.amazon.com/dp/B08N5WRWNW')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.partNumber).toBe('B08N5WRWNW')
        expect(result.data.supplier).toBe('Amazon')
      }

      vi.unstubAllGlobals()
    })

    it('decodes HTML entities in extracted text', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:title" content="Test &amp; Product &lt;3&gt;">
        </head>
        <body></body>
        </html>
      `

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await parseLink('https://www.amazon.com/dp/B08N5WRWNW')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Test & Product <3>')
      }

      vi.unstubAllGlobals()
    })

    it('handles malformed JSON-LD gracefully', async () => {
      const mockHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Product</title>
          <script type="application/ld+json">{invalid json here}</script>
        </head>
        <body></body>
        </html>
      `

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      })
      vi.stubGlobal('fetch', mockFetch)

      const result = await parseLink('https://www.amazon.com/dp/B08N5WRWNW')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('Test Product')
        expect(result.data.price).toBe(null)
      }

      vi.unstubAllGlobals()
    })
  })
})
