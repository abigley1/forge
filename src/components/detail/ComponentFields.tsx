/**
 * ComponentFields - Field editors specific to Component nodes
 *
 * Includes:
 * - Import from Link functionality
 * - Cost input
 * - Supplier input
 * - Part number input
 * - Custom key-value fields
 */

import {
  useState,
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { Plus, X, Link, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseLink, SUPPORTED_SUPPLIERS } from '@/lib/supplier-parser'

export interface ComponentFieldsProps {
  /** Cost value (null if unknown) */
  cost: number | null
  /** Supplier name */
  supplier: string | null
  /** Part number */
  partNumber: string | null
  /** Custom fields (key-value pairs) */
  customFields: Record<string, string | number>
  /** Called when any field changes */
  onChange: (updates: {
    cost?: number | null
    supplier?: string | null
    partNumber?: string | null
    customFields?: Record<string, string | number>
  }) => void
  /** Whether fields are disabled */
  disabled?: boolean
  /** Optional class name */
  className?: string
}

/**
 * Field editors for Component node properties
 */
export function ComponentFields({
  cost,
  supplier,
  partNumber,
  customFields,
  onChange,
  disabled = false,
  className,
}: ComponentFieldsProps) {
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldValue, setNewFieldValue] = useState('')

  // Import from link state
  const [showImportLink, setShowImportLink] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Handle import from link
  const handleImportLink = useCallback(async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a URL')
      return
    }

    setImportError(null)
    setIsImporting(true)

    try {
      const result = await parseLink(importUrl.trim())

      if (!result.success) {
        setImportError(result.error.message)
        setIsImporting(false)
        return
      }

      // Apply the imported data to the component fields
      const updates: Parameters<typeof onChange>[0] = {}

      if (result.data.supplier) {
        updates.supplier = result.data.supplier
      }
      if (result.data.partNumber) {
        updates.partNumber = result.data.partNumber
      }
      if (result.data.price !== null) {
        updates.cost = result.data.price
      }
      // Store supplier URL in custom fields
      if (result.data.supplierUrl) {
        updates.customFields = {
          ...customFields,
          supplierUrl: result.data.supplierUrl,
        }
      }

      onChange(updates)

      // Reset import state
      setShowImportLink(false)
      setImportUrl('')
      setImportError(null)
    } catch (err) {
      console.error('Import from link failed:', err)
      setImportError('Failed to import from link')
    } finally {
      setIsImporting(false)
    }
  }, [importUrl, customFields, onChange])

  // Handle Enter key in import URL input
  const handleImportKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleImportLink()
      }
    },
    [handleImportLink]
  )

  const handleCostChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      const numValue = value === '' ? null : parseFloat(value)
      onChange({ cost: numValue })
    },
    [onChange]
  )

  const handleSupplierChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || null
      onChange({ supplier: value })
    },
    [onChange]
  )

  const handlePartNumberChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value || null
      onChange({ partNumber: value })
    },
    [onChange]
  )

  const handleCustomFieldChange = useCallback(
    (key: string, value: string) => {
      const newCustomFields = { ...customFields }
      // Try to parse as number if it looks like one
      const numValue = parseFloat(value)
      newCustomFields[key] =
        !isNaN(numValue) && value.trim() !== '' ? numValue : value
      onChange({ customFields: newCustomFields })
    },
    [customFields, onChange]
  )

  const handleRemoveCustomField = useCallback(
    (key: string) => {
      const newCustomFields = { ...customFields }
      delete newCustomFields[key]
      onChange({ customFields: newCustomFields })
    },
    [customFields, onChange]
  )

  const handleAddCustomField = useCallback(() => {
    if (newFieldKey.trim()) {
      const newCustomFields = {
        ...customFields,
        [newFieldKey.trim()]: newFieldValue,
      }
      onChange({ customFields: newCustomFields })
      setNewFieldKey('')
      setNewFieldValue('')
    }
  }, [newFieldKey, newFieldValue, customFields, onChange])

  const handleNewFieldKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddCustomField()
      }
    },
    [handleAddCustomField]
  )

  const inputClassName = cn(
    'w-full rounded-md border border-gray-300 px-3 py-2',
    'text-sm text-gray-900',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50',
    'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
    'dark:placeholder:text-gray-500 dark:focus:ring-gray-300'
  )

  const labelClassName = cn(
    'block text-sm font-medium text-gray-700 dark:text-gray-300'
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Import from Link */}
      <div className="space-y-2">
        {!showImportLink ? (
          <button
            type="button"
            onClick={() => setShowImportLink(true)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2',
              'text-sm font-medium text-gray-600 dark:text-gray-400',
              'border border-dashed border-gray-300 dark:border-gray-600',
              'hover:border-gray-400 hover:text-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-300',
              'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
              'dark:focus-visible:ring-gray-300',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Link className="h-4 w-4" aria-hidden="true" />
            Import from Link
          </button>
        ) : (
          <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Import from Link
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowImportLink(false)
                  setImportUrl('')
                  setImportError(null)
                }}
                className={cn(
                  'rounded p-1 text-gray-400 hover:text-gray-600',
                  'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none',
                  'dark:hover:text-gray-300 dark:focus-visible:ring-gray-300'
                )}
                aria-label="Cancel import"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supported:{' '}
              {SUPPORTED_SUPPLIERS.map(
                (s) => s.charAt(0).toUpperCase() + s.slice(1)
              ).join(', ')}
            </p>

            <div className="flex gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                onKeyDown={handleImportKeyDown}
                placeholder="Paste supplier URL..."
                disabled={disabled || isImporting}
                className={cn(
                  'flex-1 rounded-md border border-gray-300 px-3 py-2',
                  'text-sm text-gray-900',
                  'placeholder:text-gray-400',
                  'focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 focus:outline-none',
                  'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50',
                  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                  'dark:placeholder:text-gray-500 dark:focus:ring-gray-300'
                )}
              />
              <button
                type="button"
                onClick={handleImportLink}
                disabled={disabled || isImporting || !importUrl.trim()}
                className={cn(
                  'rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white',
                  'hover:bg-gray-800',
                  'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200',
                  'dark:focus-visible:ring-gray-300'
                )}
              >
                {isImporting ? (
                  <Loader2
                    className="h-4 w-4 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  'Import'
                )}
              </button>
            </div>

            {importError && (
              <p
                className="text-xs text-red-600 dark:text-red-400"
                role="alert"
              >
                {importError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cost */}
      <div className="space-y-1.5">
        <label htmlFor="component-cost" className={labelClassName}>
          Cost
        </label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            $
          </span>
          <input
            id="component-cost"
            type="number"
            value={cost ?? ''}
            onChange={handleCostChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            disabled={disabled}
            className={cn(inputClassName, 'pl-7')}
          />
        </div>
      </div>

      {/* Supplier */}
      <div className="space-y-1.5">
        <label htmlFor="component-supplier" className={labelClassName}>
          Supplier
        </label>
        <input
          id="component-supplier"
          type="text"
          value={supplier ?? ''}
          onChange={handleSupplierChange}
          placeholder="e.g., DigiKey, Amazon"
          disabled={disabled}
          className={inputClassName}
        />
      </div>

      {/* Part Number */}
      <div className="space-y-1.5">
        <label htmlFor="component-part-number" className={labelClassName}>
          Part Number
        </label>
        <input
          id="component-part-number"
          type="text"
          value={partNumber ?? ''}
          onChange={handlePartNumberChange}
          placeholder="e.g., MFG-12345"
          disabled={disabled}
          className={inputClassName}
        />
      </div>

      {/* Custom Fields */}
      <div className="space-y-2">
        <span className={labelClassName}>Custom Fields</span>

        {/* Existing custom fields */}
        {Object.entries(customFields).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-1/3 truncate text-sm text-gray-600 dark:text-gray-400">
              {key}
            </span>
            <input
              type="text"
              value={String(value)}
              onChange={(e) => handleCustomFieldChange(key, e.target.value)}
              disabled={disabled}
              className={cn(inputClassName, 'flex-1')}
            />
            <button
              type="button"
              onClick={() => handleRemoveCustomField(key)}
              disabled={disabled}
              className={cn(
                'rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                'focus-visible:ring-2 focus-visible:outline-none',
                'focus-visible:ring-gray-950 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'dark:hover:bg-gray-700 dark:hover:text-gray-300',
                'dark:focus-visible:ring-gray-300'
              )}
              aria-label={`Remove ${key} field`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}

        {/* Add new field */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newFieldKey}
            onChange={(e) => setNewFieldKey(e.target.value)}
            onKeyDown={handleNewFieldKeyDown}
            placeholder="Field name"
            disabled={disabled}
            className={cn(inputClassName, 'w-1/3')}
          />
          <input
            type="text"
            value={newFieldValue}
            onChange={(e) => setNewFieldValue(e.target.value)}
            onKeyDown={handleNewFieldKeyDown}
            placeholder="Value"
            disabled={disabled}
            className={cn(inputClassName, 'flex-1')}
          />
          <button
            type="button"
            onClick={handleAddCustomField}
            disabled={disabled || !newFieldKey.trim()}
            className={cn(
              'rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600',
              'focus-visible:ring-2 focus-visible:outline-none',
              'focus-visible:ring-gray-950 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:hover:bg-gray-700 dark:hover:text-gray-300',
              'dark:focus-visible:ring-gray-300'
            )}
            aria-label="Add custom field"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
