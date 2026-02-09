/**
 * URL Extraction API
 *
 * Extracts product metadata from URLs (Amazon, DigiKey, Mouser, etc.)
 * Returns pre-filled data for creating inventory items.
 */

import { Router } from 'express'
import * as cheerio from 'cheerio'

type CheerioAPI = ReturnType<typeof cheerio.load>

const router = Router()

// =============================================================================
// Types
// =============================================================================

interface ExtractedData {
  name: string
  supplier: string
  supplierUrl: string
  cost: number | null
  partNumber: string | null
  imageUrl: string | null
  _extractedFrom: string
}

interface ExtractionStrategy {
  matches: (hostname: string) => boolean
  extract: ($: CheerioAPI, url: string) => ExtractedData
  name: string
}

// =============================================================================
// Extraction Strategies
// =============================================================================

/**
 * Amazon extraction strategy
 */
const amazonStrategy: ExtractionStrategy = {
  name: 'amazon',
  matches: (hostname) =>
    hostname.includes('amazon.com') || hostname.includes('smile.amazon.com'),
  extract: ($, url) => {
    // Try JSON-LD structured data first
    let name = ''
    let cost: number | null = null
    let imageUrl: string | null = null

    // Parse JSON-LD if available
    const jsonLdScript = $('script[type="application/ld+json"]').first().html()
    if (jsonLdScript) {
      try {
        const jsonLd = JSON.parse(jsonLdScript)
        if (jsonLd['@type'] === 'Product') {
          name = jsonLd.name || ''
          imageUrl = jsonLd.image || null
          if (jsonLd.offers?.price) {
            cost = parseFloat(jsonLd.offers.price)
          }
        }
      } catch {
        // JSON-LD parsing failed, fall back to meta tags
      }
    }

    // Fall back to meta tags and DOM
    if (!name) {
      name =
        $('meta[property="og:title"]').attr('content') ||
        $('#productTitle').text().trim() ||
        $('title')
          .text()
          .trim()
          .replace(/ - Amazon\.com$/, '')
    }

    if (!imageUrl) {
      imageUrl = $('meta[property="og:image"]').attr('content') || null
    }

    if (cost === null) {
      // Try price selectors
      const priceWhole = $('.a-price-whole').first().text().replace(',', '')
      const priceFraction = $('.a-price-fraction').first().text()
      if (priceWhole) {
        cost = parseFloat(`${priceWhole}.${priceFraction || '00'}`)
      }
    }

    return {
      name,
      supplier: 'Amazon',
      supplierUrl: url,
      cost: isNaN(cost as number) ? null : cost,
      partNumber: null,
      imageUrl,
      _extractedFrom: 'amazon',
    }
  },
}

/**
 * DigiKey extraction strategy
 */
const digikeyStrategy: ExtractionStrategy = {
  name: 'digikey',
  matches: (hostname) => hostname.includes('digikey.com'),
  extract: ($, url) => {
    const name =
      $('h1.product-title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim()

    const partNumber =
      $('span[data-testid="manufacturer-part-number"]').text().trim() ||
      $('span[data-testid="digikey-part-number"]').text().trim() ||
      null

    const priceText = $('span[data-testid="price-per-unit"]').text().trim()
    let cost: number | null = null
    if (priceText) {
      const match = priceText.match(/\$?([\d,.]+)/)
      if (match) {
        cost = parseFloat(match[1].replace(',', ''))
      }
    }

    const imageUrl = $('meta[property="og:image"]').attr('content') || null

    return {
      name,
      supplier: 'DigiKey',
      supplierUrl: url,
      cost: isNaN(cost as number) ? null : cost,
      partNumber,
      imageUrl,
      _extractedFrom: 'digikey',
    }
  },
}

/**
 * Mouser extraction strategy
 */
const mouserStrategy: ExtractionStrategy = {
  name: 'mouser',
  matches: (hostname) => hostname.includes('mouser.com'),
  extract: ($, url) => {
    const name =
      $('h1#product-title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim()

    const partNumber = $('span.part-number').text().trim() || null

    const priceText = $('span.price').first().text().trim()
    let cost: number | null = null
    if (priceText) {
      const match = priceText.match(/\$?([\d,.]+)/)
      if (match) {
        cost = parseFloat(match[1].replace(',', ''))
      }
    }

    const imageUrl = $('meta[property="og:image"]').attr('content') || null

    return {
      name,
      supplier: 'Mouser',
      supplierUrl: url,
      cost: isNaN(cost as number) ? null : cost,
      partNumber,
      imageUrl,
      _extractedFrom: 'mouser',
    }
  },
}

/**
 * Generic OpenGraph fallback strategy
 */
const genericStrategy: ExtractionStrategy = {
  name: 'generic',
  matches: () => true, // Always matches as fallback
  extract: ($, url) => {
    const name =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim() ||
      'Unknown Product'

    const imageUrl = $('meta[property="og:image"]').attr('content') || null

    // Extract supplier from hostname
    const urlObj = new URL(url)
    const supplier = urlObj.hostname.replace(/^www\./, '')

    return {
      name,
      supplier,
      supplierUrl: url,
      cost: null,
      partNumber: null,
      imageUrl,
      _extractedFrom: 'generic',
    }
  },
}

// Order matters - specific strategies before generic
const strategies: ExtractionStrategy[] = [
  amazonStrategy,
  digikeyStrategy,
  mouserStrategy,
  genericStrategy,
]

// =============================================================================
// Route Handler
// =============================================================================

/**
 * POST /api/inventory/extract-from-url
 *
 * Extracts product data from a URL.
 *
 * Request body:
 * - url: string (required) - The product page URL
 *
 * Response:
 * - data: ExtractedData - The extracted product information
 */
router.post('/extract-from-url', async (req, res) => {
  const { url } = req.body

  // Validate URL
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({ error: 'URL is required' })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('Invalid protocol')
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' })
  }

  // Fetch the page
  let html: string
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ForgeInventory/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      return res.status(502).json({
        error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
      })
    }

    html = await response.text()
  } catch (error) {
    return res.status(502).json({
      error: `Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }

  // Parse HTML
  const $ = cheerio.load(html)

  // Find matching strategy
  const strategy = strategies.find((s) => s.matches(parsedUrl.hostname))
  if (!strategy) {
    return res.status(500).json({ error: 'No extraction strategy found' })
  }

  // Extract data
  try {
    const data = strategy.extract($, url)
    return res.json({ data })
  } catch (error) {
    return res.status(500).json({
      error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
  }
})

export { router as urlExtractionRouter }
