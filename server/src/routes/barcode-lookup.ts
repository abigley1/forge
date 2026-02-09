import { Router, type Request, type Response } from 'express'

export const barcodeLookupRouter = Router()

/**
 * Response type for barcode lookup
 */
export interface BarcodeLookupResult {
  found: boolean
  name?: string
  supplier?: string | null
  imageUrl?: string | null
  category?: string | null
  barcode: string
}

/**
 * Validate barcode format
 * Supports: EAN-8 (8 digits), UPC-A (12 digits), EAN-13 (13 digits)
 */
function isValidBarcode(barcode: string): boolean {
  // Must be 8, 12, or 13 digits only
  const validLengths = [8, 12, 13]
  if (!validLengths.includes(barcode.length)) {
    return false
  }
  // Must be all numeric
  return /^\d+$/.test(barcode)
}

/**
 * Open Food Facts API response types
 */
interface OpenFoodFactsResponse {
  status: number // 1 = found, 0 = not found
  product?: {
    product_name?: string
    brands?: string
    image_url?: string
    categories?: string
  }
}

/**
 * UPC Database API response types
 */
interface UPCDatabaseResponse {
  success: boolean
  title?: string
  brand?: string
  images?: string[]
  category?: string
}

/**
 * Lookup product in Open Food Facts database
 */
async function lookupOpenFoodFacts(
  barcode: string
): Promise<BarcodeLookupResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Forge Inventory Manager/1.0',
    },
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as OpenFoodFactsResponse

  if (data.status !== 1 || !data.product) {
    return null
  }

  const product = data.product
  return {
    found: true,
    name: product.product_name || 'Unknown Product',
    supplier: product.brands || null,
    imageUrl: product.image_url || null,
    category: product.categories || null,
    barcode,
  }
}

/**
 * Lookup product in UPC Database (fallback)
 */
async function lookupUPCDatabase(
  barcode: string
): Promise<BarcodeLookupResult | null> {
  // UPC Database API - free tier, no key required for basic lookups
  const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Forge Inventory Manager/1.0',
    },
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as UPCDatabaseResponse

  if (!data.success) {
    return null
  }

  return {
    found: true,
    name: data.title || 'Unknown Product',
    supplier: data.brand || null,
    imageUrl: data.images?.[0] || null,
    category: data.category || null,
    barcode,
  }
}

// POST /lookup-barcode - Lookup product info from barcode
barcodeLookupRouter.post(
  '/lookup-barcode',
  async (req: Request, res: Response) => {
    try {
      const { barcode } = req.body

      // Validate barcode is provided
      if (barcode === undefined || barcode === null || barcode === '') {
        return res.status(400).json({ error: 'Barcode is required' })
      }

      // Validate barcode is a string
      if (typeof barcode !== 'string') {
        return res.status(400).json({ error: 'Barcode must be a string' })
      }

      // Validate barcode format
      if (!isValidBarcode(barcode)) {
        return res.status(400).json({
          error:
            'Invalid barcode format. Must be 8, 12, or 13 numeric digits (EAN-8, UPC-A, or EAN-13)',
        })
      }

      // Try Open Food Facts first
      let result = await lookupOpenFoodFacts(barcode)

      // If not found, try UPC Database as fallback
      if (!result) {
        result = await lookupUPCDatabase(barcode)
      }

      // Return result (found or not found)
      if (result) {
        return res.json({ data: result })
      }

      return res.json({
        data: {
          found: false,
          barcode,
        },
      })
    } catch (error) {
      console.error('[barcode-lookup] Error:', error)
      return res.status(503).json({
        error: 'Barcode lookup service unavailable. Please try again later.',
      })
    }
  }
)
