/**
 * CSV Import Routes for Inventory
 *
 * Handles bulk import of inventory items from CSV files.
 *
 * Endpoints:
 * - POST /api/inventory/import - Import items from CSV
 * - GET  /api/inventory/import/template - Download CSV template
 */

import { Router, Request, Response } from 'express'
import {
  InventoryRepository,
  CreateInventoryItemData,
} from '../db/InventoryRepository.js'
import type { DatabaseInstance } from '../db/index.js'

// =============================================================================
// Types
// =============================================================================

export interface CsvRow {
  name: string
  category_id: string
  subcategory_id?: string
  status?: string
  quantity?: string
  low_stock_threshold?: string
  location?: string
  supplier?: string
  supplier_url?: string
  part_number?: string
  cost?: string
  barcode?: string
  notes?: string
  tags?: string
}

export interface ImportResult {
  total: number
  successful: number
  failed: number
  errors: Array<{
    row: number
    error: string
    data?: Partial<CsvRow>
  }>
}

// =============================================================================
// CSV Parsing
// =============================================================================

/**
 * Parse CSV content into rows
 */
export function parseCsv(content: string): CsvRow[] {
  const lines = content.trim().split('\n')
  if (lines.length < 2) {
    return []
  }

  // Parse header
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim())

  // Parse data rows
  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      if (values[index] !== undefined) {
        row[header] = values[index].trim()
      }
    })

    rows.push(row as unknown as CsvRow)
  }

  return rows
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * Validate and convert a CSV row to CreateInventoryItemData
 */
export function validateRow(
  row: CsvRow,
  rowNumber: number,
  validCategories: Set<string>,
  validSubcategories: Set<string>
):
  | { success: true; data: CreateInventoryItemData }
  | { success: false; error: string } {
  // Required fields
  if (!row.name || row.name.trim() === '') {
    return { success: false, error: 'Name is required' }
  }

  if (!row.category_id || row.category_id.trim() === '') {
    return { success: false, error: 'Category ID is required' }
  }

  // Validate category exists
  if (!validCategories.has(row.category_id.trim())) {
    return { success: false, error: `Invalid category_id: ${row.category_id}` }
  }

  // Validate subcategory if provided
  if (row.subcategory_id && row.subcategory_id.trim() !== '') {
    if (!validSubcategories.has(row.subcategory_id.trim())) {
      return {
        success: false,
        error: `Invalid subcategory_id: ${row.subcategory_id}`,
      }
    }
  }

  // Validate status
  const validStatuses = ['owned', 'wishlist', 'on_order']
  const status = row.status?.trim().toLowerCase() || 'owned'
  if (!validStatuses.includes(status)) {
    return {
      success: false,
      error: `Invalid status: ${row.status}. Must be one of: ${validStatuses.join(', ')}`,
    }
  }

  // Parse numeric fields
  const quantity = row.quantity ? parseInt(row.quantity, 10) : 0
  if (row.quantity && isNaN(quantity)) {
    return { success: false, error: `Invalid quantity: ${row.quantity}` }
  }
  if (quantity < 0) {
    return { success: false, error: 'Quantity cannot be negative' }
  }

  let lowStockThreshold: number | null = null
  if (row.low_stock_threshold && row.low_stock_threshold.trim() !== '') {
    lowStockThreshold = parseInt(row.low_stock_threshold, 10)
    if (isNaN(lowStockThreshold)) {
      return {
        success: false,
        error: `Invalid low_stock_threshold: ${row.low_stock_threshold}`,
      }
    }
    if (lowStockThreshold < 0) {
      return { success: false, error: 'Low stock threshold cannot be negative' }
    }
  }

  let cost: number | null = null
  if (row.cost && row.cost.trim() !== '') {
    cost = parseFloat(row.cost)
    if (isNaN(cost)) {
      return { success: false, error: `Invalid cost: ${row.cost}` }
    }
    if (cost < 0) {
      return { success: false, error: 'Cost cannot be negative' }
    }
  }

  // Validate URL if provided
  if (row.supplier_url && row.supplier_url.trim() !== '') {
    try {
      new URL(row.supplier_url.trim())
    } catch {
      return {
        success: false,
        error: `Invalid supplier_url: ${row.supplier_url}`,
      }
    }
  }

  // Parse tags (comma-separated)
  const tags = row.tags
    ? row.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t !== '')
    : []

  return {
    success: true,
    data: {
      name: row.name.trim(),
      category_id: row.category_id.trim(),
      subcategory_id: row.subcategory_id?.trim() || null,
      status: status as 'owned' | 'wishlist' | 'on_order',
      quantity,
      low_stock_threshold: lowStockThreshold,
      location: row.location?.trim() || null,
      supplier: row.supplier?.trim() || null,
      supplier_url: row.supplier_url?.trim() || null,
      part_number: row.part_number?.trim() || null,
      cost,
      barcode: row.barcode?.trim() || null,
      notes: row.notes?.trim() || null,
      tags,
    },
  }
}

// =============================================================================
// Template
// =============================================================================

const CSV_TEMPLATE = `name,category_id,subcategory_id,status,quantity,low_stock_threshold,location,supplier,supplier_url,part_number,cost,barcode,notes,tags
Arduino Uno,electronics,electronics-ics,owned,5,2,Bin A1,DigiKey,https://digikey.com,ARD-UNO,25.00,,Microcontroller board,"arduino,microcontroller"
10uF Capacitor,electronics,electronics-capacitors,owned,100,50,Bin B2,Mouser,,CAP-10UF,0.10,,,capacitor
M3 Screws,fasteners,fasteners-screws,owned,200,100,Drawer 1,Amazon,,,0.02,,,fastener`

// =============================================================================
// Router
// =============================================================================

export function createCsvImportRouter(db: DatabaseInstance): Router {
  const router = Router()
  const repo = new InventoryRepository(db)

  /**
   * GET /api/inventory/import/template
   * Download CSV template
   */
  router.get('/import/template', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="inventory-import-template.csv"'
    )
    res.send(CSV_TEMPLATE)
  })

  /**
   * POST /api/inventory/import
   * Import items from CSV
   */
  router.post('/import', (req: Request, res: Response) => {
    try {
      const { csv } = req.body

      if (!csv || typeof csv !== 'string') {
        res
          .status(400)
          .json({ error: 'CSV content is required in the "csv" field' })
        return
      }

      // Parse CSV
      const rows = parseCsv(csv)

      if (rows.length === 0) {
        res.status(400).json({ error: 'No data rows found in CSV' })
        return
      }

      // Get valid categories and subcategories
      const categories = repo.findCategories()
      const validCategories = new Set(categories.map((c) => c.id))
      const validSubcategories = new Set(
        categories.flatMap((c) => c.subcategories.map((s) => s.id))
      )

      // Process rows
      const result: ImportResult = {
        total: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowNumber = i + 2 // +2 for 1-indexed and header row

        const validation = validateRow(
          row,
          rowNumber,
          validCategories,
          validSubcategories
        )

        if (!validation.success) {
          result.failed++
          result.errors.push({
            row: rowNumber,
            error: validation.error,
            data: row,
          })
          continue
        }

        try {
          repo.createItem(validation.data)
          result.successful++
        } catch (error) {
          result.failed++
          result.errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: row,
          })
        }
      }

      res.json({ data: result })
    } catch (error) {
      console.error('[CSV Import] Error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
