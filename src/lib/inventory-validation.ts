/**
 * Inventory Validation with Zod
 *
 * Provides Zod schemas for validating inventory items, categories, and subcategories.
 * Uses the same Result type pattern as the node validation.
 */

import { z } from 'zod'
import type {
  InventoryItem,
  InventoryCategory,
  InventorySubcategory,
} from '@/types/inventory'

// ============================================================================
// Result Type (same pattern as validation.ts)
// ============================================================================

/**
 * Validation error with detailed information
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: 'INVALID_TYPE' | 'MISSING_FIELD' | 'INVALID_VALUE' | 'PARSE_ERROR'
  /** Human-readable error message */
  message: string
  /** Path to the invalid field (e.g., "name", "quantity") */
  path?: string
  /** All validation issues (for multiple errors) */
  issues?: Array<{
    path: string
    message: string
  }>
}

/**
 * Result type for validation operations
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: ValidationError }

// ============================================================================
// Helper Schemas
// ============================================================================

/**
 * Schema for date that can be string or Date, outputs Date
 */
const dateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return undefined
}, z.date())

/**
 * Schema for optional URL (null allowed, validates if present)
 */
const optionalUrlSchema = z
  .string()
  .url({ message: 'Must be a valid URL' })
  .nullable()
  .optional()

/**
 * Schema for string arrays with default empty array
 */
const stringArraySchema = z.array(z.string()).default([])

// ============================================================================
// Inventory Schemas
// ============================================================================

/**
 * Inventory item schema
 */
/**
 * Status schema for inventory items
 */
const inventoryStatusSchema = z
  .enum(['owned', 'wishlist', 'on_order'] as const)
  .default('owned')

export const inventoryItemSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().nullable().optional().default(null),
  status: inventoryStatusSchema,
  quantity: z
    .number()
    .int()
    .nonnegative({ message: 'Quantity must be non-negative' }),
  location: z.string().nullable().optional().default(null),
  supplier: z.string().nullable().optional().default(null),
  supplierUrl: optionalUrlSchema.default(null),
  partNumber: z.string().nullable().optional().default(null),
  cost: z
    .number()
    .nonnegative({ message: 'Cost must be non-negative' })
    .nullable()
    .optional()
    .default(null),
  barcode: z.string().nullable().optional().default(null),
  notes: z.string().nullable().optional().default(null),
  tags: stringArraySchema,
  imageUrl: optionalUrlSchema.default(null),
  lowStockThreshold: z
    .number()
    .int()
    .nonnegative({ message: 'Low stock threshold must be non-negative' })
    .nullable()
    .optional()
    .default(null),
  createdAt: dateSchema,
  updatedAt: dateSchema,
})

/**
 * Inventory category schema
 */
export const inventoryCategorySchema = z.object({
  id: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Name is required'),
  sortOrder: z.number().int().default(0),
})

/**
 * Inventory subcategory schema
 */
export const inventorySubcategorySchema = z.object({
  id: z.string().min(1, 'Subcategory ID is required'),
  categoryId: z.string().min(1, 'Category ID is required'),
  name: z.string().min(1, 'Name is required'),
  sortOrder: z.number().int().default(0),
})

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Converts Zod errors to our ValidationError format
 */
function zodErrorToValidationError(error: z.ZodError): ValidationError {
  const issues = error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }))

  return {
    code: 'INVALID_VALUE',
    message: issues.map((i) => `${i.path}: ${i.message}`).join('; '),
    issues,
  }
}

/**
 * Validates an inventory item
 *
 * @param data - The data to validate
 * @returns ValidationResult with validated InventoryItem or error
 */
export function validateInventoryItem(
  data: unknown
): ValidationResult<InventoryItem> {
  const result = inventoryItemSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data as InventoryItem }
  }

  return {
    success: false,
    error: zodErrorToValidationError(result.error),
  }
}

/**
 * Validates an inventory category
 *
 * @param data - The data to validate
 * @returns ValidationResult with validated InventoryCategory or error
 */
export function validateInventoryCategory(
  data: unknown
): ValidationResult<InventoryCategory> {
  const result = inventoryCategorySchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data as InventoryCategory }
  }

  return {
    success: false,
    error: zodErrorToValidationError(result.error),
  }
}

/**
 * Validates an inventory subcategory
 *
 * @param data - The data to validate
 * @returns ValidationResult with validated InventorySubcategory or error
 */
export function validateInventorySubcategory(
  data: unknown
): ValidationResult<InventorySubcategory> {
  const result = inventorySubcategorySchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data as InventorySubcategory }
  }

  return {
    success: false,
    error: zodErrorToValidationError(result.error),
  }
}

// ============================================================================
// Schema Types (inferred from Zod schemas)
// ============================================================================

export type InventoryItemInput = z.input<typeof inventoryItemSchema>
export type InventoryCategoryInput = z.input<typeof inventoryCategorySchema>
export type InventorySubcategoryInput = z.input<
  typeof inventorySubcategorySchema
>
