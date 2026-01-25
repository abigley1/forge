/**
 * Supplier Link Parser Service (Task 15.1)
 *
 * Parses product links from Amazon, DigiKey, Mouser, LCSC, and McMaster-Carr
 * to extract component metadata automatically.
 */

export type SupplierType =
  | 'amazon'
  | 'digikey'
  | 'mouser'
  | 'lcsc'
  | 'mcmaster'
  | 'adafruit'
  | 'unknown'

export const SUPPORTED_SUPPLIERS: SupplierType[] = [
  'amazon',
  'digikey',
  'mouser',
  'lcsc',
  'mcmaster',
  'adafruit',
]

/**
 * Partial component data extracted from supplier link
 */
export interface PartialComponentData {
  title: string | null
  price: number | null
  partNumber: string | null
  manufacturer: string | null
  description: string | null
  imageUrl: string | null
  supplier: string
  supplierUrl: string
}

/**
 * Parse error details
 */
export interface ParseLinkError {
  code: 'INVALID_URL' | 'UNSUPPORTED_SUPPLIER' | 'FETCH_ERROR'
  message: string
}

/**
 * Result type for parseLink - follows project validation pattern
 */
export type ParseLinkResult =
  | { success: true; data: PartialComponentData }
  | { success: false; error: ParseLinkError }

/**
 * URL patterns for each supported supplier
 */
const SUPPLIER_PATTERNS: Record<SupplierType, RegExp[]> = {
  amazon: [
    /amazon\.(com|co\.uk|de|fr|es|it|ca|com\.au|in|co\.jp)/i,
    /smile\.amazon\./i,
    /amzn\.to/i,
  ],
  digikey: [
    /digikey\.(com|ca|co\.uk|de|fr|nl|es|it|at|ch|be|se|fi|dk|no|ie|pl)/i,
  ],
  mouser: [/mouser\.(com|co\.uk|de|fr|es|it|cn|hk|tw|in|jp|kr|sg|my|th|au)/i],
  lcsc: [/lcsc\.com/i],
  mcmaster: [/mcmaster\.com/i, /mcmaster-carr\.com/i],
  adafruit: [/adafruit\.com/i],
  unknown: [],
}

/**
 * Detect which supplier a URL belongs to
 */
export function detectSupplier(url: string): SupplierType {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    for (const supplier of SUPPORTED_SUPPLIERS) {
      const patterns = SUPPLIER_PATTERNS[supplier]
      for (const pattern of patterns) {
        if (pattern.test(hostname)) {
          return supplier
        }
      }
    }

    return 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Check if a URL is a valid supplier URL
 */
export function isValidSupplierUrl(url: string): boolean {
  try {
    new URL(url)
    const supplier = detectSupplier(url)
    return supplier !== 'unknown'
  } catch {
    return false
  }
}

/**
 * Extract part number from URL based on supplier-specific patterns
 */
export function extractPartNumberFromUrl(
  url: string,
  supplier: SupplierType
): string | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname

    switch (supplier) {
      case 'amazon': {
        // Amazon ASIN from /dp/ASIN or /gp/product/ASIN patterns
        const dpMatch = pathname.match(/\/dp\/([A-Z0-9]{10})/i)
        if (dpMatch) return dpMatch[1].toUpperCase()
        const gpMatch = pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i)
        if (gpMatch) return gpMatch[1].toUpperCase()
        return null
      }

      case 'digikey': {
        // DigiKey: /en/products/detail/manufacturer/part-number/digikey-pn
        // or just extract the last segment
        const segments = pathname.split('/').filter(Boolean)
        if (segments.length >= 2) {
          // The manufacturer part number is usually the second-to-last segment
          const partIndex = segments.findIndex((s) => s === 'detail')
          if (partIndex >= 0 && segments[partIndex + 2]) {
            return segments[partIndex + 2]
          }
          // Fallback to last segment (DigiKey part number)
          return segments[segments.length - 1]
        }
        return null
      }

      case 'mouser': {
        // Mouser: /ProductDetail/manufacturer/part-number
        const segments = pathname.split('/').filter(Boolean)
        const detailIndex = segments.findIndex(
          (s) => s.toLowerCase() === 'productdetail'
        )
        if (detailIndex >= 0 && segments[detailIndex + 2]) {
          return segments[detailIndex + 2]
        }
        return null
      }

      case 'lcsc': {
        // LCSC: /product-detail/category_CXXXXXX.html
        const match = pathname.match(/_(C\d+)\.html/i)
        if (match) return match[1].toUpperCase()
        return null
      }

      case 'mcmaster': {
        // McMaster: /part-number or search with part number
        const segments = pathname.split('/').filter(Boolean)
        if (segments.length >= 1) {
          // McMaster part numbers are alphanumeric
          const partMatch = segments[0].match(/^(\d{4,}[A-Z]?\d*)/i)
          if (partMatch) return partMatch[1]
          return segments[0]
        }
        return null
      }

      case 'adafruit': {
        // Adafruit: /product/1234 or /product/1234-product-name
        const productMatch = pathname.match(/\/product\/(\d+)/i)
        if (productMatch) return productMatch[1]
        return null
      }

      default:
        return null
    }
  } catch {
    return null
  }
}

/**
 * Get human-readable supplier name
 */
function getSupplierDisplayName(supplier: SupplierType): string {
  const names: Record<SupplierType, string> = {
    amazon: 'Amazon',
    digikey: 'DigiKey',
    mouser: 'Mouser',
    lcsc: 'LCSC',
    mcmaster: 'McMaster-Carr',
    adafruit: 'Adafruit',
    unknown: 'Unknown',
  }
  return names[supplier]
}

/**
 * Fetch and parse HTML to extract metadata
 * Uses Open Graph and meta tags as fallback when structured data is unavailable
 */
async function fetchAndParseMetadata(
  url: string,
  supplier: SupplierType
): Promise<Partial<PartialComponentData>> {
  // In a browser environment, we need to use a CORS proxy or server-side fetching
  // For now, we'll return a minimal result with just the URL-extractable data
  // In production, this would use a backend service or proxy

  const partNumber = extractPartNumberFromUrl(url, supplier)

  // Attempt to fetch via a CORS-friendly approach
  // This will likely fail in browser due to CORS, but we handle it gracefully
  try {
    // Try fetching - this may fail due to CORS in browser
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; ForgeApp/1.0)',
      },
      mode: 'cors',
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    return parseHtmlMetadata(html, supplier, partNumber)
  } catch {
    // CORS or network error is expected in browser - return minimal data silently
    return {
      partNumber,
      title: null,
      price: null,
      manufacturer: null,
      description: null,
      imageUrl: null,
    }
  }
}

/**
 * Parse HTML content to extract Open Graph and meta tags
 */
function parseHtmlMetadata(
  html: string,
  supplier: SupplierType,
  partNumber: string | null
): Partial<PartialComponentData> {
  const result: Partial<PartialComponentData> = {
    partNumber,
  }

  // Extract Open Graph title
  const ogTitleMatch = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  )
  if (ogTitleMatch) {
    result.title = decodeHtmlEntities(ogTitleMatch[1])
  }

  // Extract regular title as fallback
  if (!result.title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch) {
      result.title = decodeHtmlEntities(titleMatch[1])
    }
  }

  // Extract Open Graph image
  const ogImageMatch = html.match(
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
  )
  if (ogImageMatch) {
    result.imageUrl = ogImageMatch[1]
  }

  // Extract Open Graph description
  const ogDescMatch = html.match(
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
  )
  if (ogDescMatch) {
    result.description = decodeHtmlEntities(ogDescMatch[1])
  }

  // Extract meta description as fallback
  if (!result.description) {
    const metaDescMatch = html.match(
      /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
    )
    if (metaDescMatch) {
      result.description = decodeHtmlEntities(metaDescMatch[1])
    }
  }

  // Extract price from structured data (JSON-LD)
  const jsonLdMatch = html.match(
    /<script\s+type=["']application\/ld\+json["']>([^<]+)<\/script>/i
  )
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.offers?.price) {
        result.price = parseFloat(jsonLd.offers.price)
      } else if (jsonLd.price) {
        result.price = parseFloat(jsonLd.price)
      }
      if (jsonLd.brand?.name) {
        result.manufacturer = jsonLd.brand.name
      } else if (jsonLd.manufacturer?.name) {
        result.manufacturer = jsonLd.manufacturer.name
      }
    } catch {
      // JSON-LD parsing failed, continue without it
    }
  }

  // Supplier-specific parsing
  switch (supplier) {
    case 'amazon':
      parseAmazonSpecific(html, result)
      break
    case 'digikey':
      parseDigiKeySpecific(html, result)
      break
    case 'mouser':
      parseMouserSpecific(html, result)
      break
    case 'lcsc':
      parseLCSCSpecific(html, result)
      break
    case 'mcmaster':
      parseMcMasterSpecific(html, result)
      break
    case 'adafruit':
      parseAdafruitSpecific(html, result)
      break
  }

  return result
}

/**
 * Amazon-specific HTML parsing
 */
function parseAmazonSpecific(
  html: string,
  result: Partial<PartialComponentData>
): void {
  // Extract price
  if (!result.price) {
    const priceMatch = html.match(/class=["']a-price-whole["'][^>]*>(\d+)/)
    if (priceMatch) {
      const fractionMatch = html.match(
        /class=["']a-price-fraction["'][^>]*>(\d+)/
      )
      const whole = parseInt(priceMatch[1], 10)
      const fraction = fractionMatch ? parseInt(fractionMatch[1], 10) / 100 : 0
      result.price = whole + fraction
    }
  }

  // Extract brand/manufacturer
  if (!result.manufacturer) {
    const brandMatch = html.match(/by\s+<a[^>]*>([^<]+)<\/a>/i)
    if (brandMatch) {
      result.manufacturer = decodeHtmlEntities(brandMatch[1])
    }
  }
}

/**
 * DigiKey-specific HTML parsing
 */
function parseDigiKeySpecific(
  html: string,
  result: Partial<PartialComponentData>
): void {
  // Extract manufacturer from typical DigiKey format
  if (!result.manufacturer) {
    const mfgMatch = html.match(/Manufacturer[^<]*<[^>]+>([^<]+)/i)
    if (mfgMatch) {
      result.manufacturer = decodeHtmlEntities(mfgMatch[1].trim())
    }
  }
}

/**
 * Mouser-specific HTML parsing
 */
function parseMouserSpecific(
  html: string,
  result: Partial<PartialComponentData>
): void {
  // Extract manufacturer
  if (!result.manufacturer) {
    const mfgMatch = html.match(/Manufacturer:\s*<[^>]+>([^<]+)/i)
    if (mfgMatch) {
      result.manufacturer = decodeHtmlEntities(mfgMatch[1].trim())
    }
  }
}

/**
 * LCSC-specific HTML parsing
 */
function parseLCSCSpecific(
  html: string,
  result: Partial<PartialComponentData>
): void {
  // Extract LCSC part number if not already set
  if (!result.partNumber) {
    const lcscMatch = html.match(/LCSC Part #:\s*<[^>]+>([^<]+)/i)
    if (lcscMatch) {
      result.partNumber = lcscMatch[1].trim()
    }
  }
}

/**
 * McMaster-specific HTML parsing
 */
function parseMcMasterSpecific(
  html: string,
  result: Partial<PartialComponentData>
): void {
  // McMaster typically doesn't have manufacturer info
  // Focus on part number and description
  if (!result.description) {
    const descMatch = html.match(
      /<div[^>]*class="[^"]*ProductDescription[^"]*"[^>]*>([^<]+)/i
    )
    if (descMatch) {
      result.description = decodeHtmlEntities(descMatch[1].trim())
    }
  }
}

/**
 * Adafruit-specific HTML parsing
 */
function parseAdafruitSpecific(
  html: string,
  result: Partial<PartialComponentData>
): void {
  // Adafruit products are typically their own brand
  if (!result.manufacturer) {
    result.manufacturer = 'Adafruit'
  }

  // Extract price from Adafruit's format
  if (!result.price) {
    const priceMatch = html.match(
      /class="[^"]*price[^"]*"[^>]*>\s*\$?([\d.]+)/i
    )
    if (priceMatch) {
      result.price = parseFloat(priceMatch[1])
    }
  }
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
  }

  return text.replace(/&[^;]+;/g, (match) => entities[match] || match)
}

/**
 * Parse a supplier link and extract component metadata
 *
 * @param url - The supplier product URL to parse
 * @returns ParseLinkResult - either success with data or failure with error
 */
export async function parseLink(url: string): Promise<ParseLinkResult> {
  // Validate URL
  try {
    new URL(url)
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_URL',
        message: 'Invalid URL format',
      },
    }
  }

  // Detect supplier
  const supplier = detectSupplier(url)
  if (supplier === 'unknown') {
    return {
      success: false,
      error: {
        code: 'UNSUPPORTED_SUPPLIER',
        message:
          'Unsupported supplier. Supported: Amazon, DigiKey, Mouser, LCSC, McMaster-Carr',
      },
    }
  }

  // Fetch and parse metadata
  const metadata = await fetchAndParseMetadata(url, supplier)

  // Build result with all required fields
  const data: PartialComponentData = {
    title: metadata.title ?? null,
    price: metadata.price ?? null,
    partNumber: metadata.partNumber ?? null,
    manufacturer: metadata.manufacturer ?? null,
    description: metadata.description ?? null,
    imageUrl: metadata.imageUrl ?? null,
    supplier: getSupplierDisplayName(supplier),
    supplierUrl: url,
  }

  return { success: true, data }
}
