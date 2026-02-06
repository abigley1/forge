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
    'w-full rounded-md border border-forge-border px-3 py-2',
    'text-sm text-forge-text',
    'placeholder:text-forge-muted',
    'focus:outline-none focus:ring-2 focus:ring-forge-accent focus:ring-offset-2',
    'disabled:cursor-not-allowed disabled:bg-forge-surface disabled:opacity-50',
    'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
    'dark:placeholder:text-forge-muted-dark dark:focus:ring-forge-accent-dark'
  )

  const labelClassName = cn(
    'block text-sm font-medium text-forge-text-secondary dark:text-forge-text-secondary-dark'
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
              'text-forge-text-secondary dark:text-forge-muted-dark text-sm font-medium',
              'border-forge-border dark:border-forge-border-dark border border-dashed',
              'hover:border-forge-muted hover:text-forge-text-secondary dark:hover:border-forge-muted-dark dark:hover:text-forge-text-secondary-dark',
              'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              'dark:focus-visible:ring-forge-accent-dark',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            <Link className="h-4 w-4" aria-hidden="true" />
            Import from Link
          </button>
        ) : (
          <div className="border-forge-border bg-forge-surface dark:border-forge-border-dark dark:bg-forge-surface-dark/50 space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm font-medium">
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
                  'text-forge-muted hover:text-forge-text-secondary rounded p-1',
                  'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
                  'dark:hover:text-forge-text-secondary-dark dark:focus-visible:ring-forge-accent-dark'
                )}
                aria-label="Cancel import"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
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
                  'border-forge-border flex-1 rounded-md border px-3 py-2',
                  'text-forge-text text-sm',
                  'placeholder:text-forge-muted',
                  'focus:ring-forge-accent focus:ring-2 focus:ring-offset-2 focus:outline-none',
                  'disabled:bg-forge-surface disabled:cursor-not-allowed disabled:opacity-50',
                  'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
                  'dark:placeholder:text-forge-muted-dark dark:focus:ring-forge-accent-dark'
                )}
              />
              <button
                type="button"
                onClick={handleImportLink}
                disabled={disabled || isImporting || !importUrl.trim()}
                className={cn(
                  'bg-forge-accent rounded-md px-3 py-2 text-sm font-medium text-white',
                  'hover:bg-forge-accent-hover',
                  'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'dark:bg-forge-accent-dark dark:text-forge-paper-dark dark:hover:bg-forge-accent-hover',
                  'dark:focus-visible:ring-forge-accent-dark'
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
          <span className="text-forge-muted dark:text-forge-muted-dark absolute top-1/2 left-3 -translate-y-1/2">
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
            <span className="text-forge-text-secondary dark:text-forge-muted-dark w-1/3 truncate text-sm">
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
                'text-forge-muted hover:bg-forge-surface hover:text-forge-text-secondary rounded-md p-2',
                'focus-visible:ring-2 focus-visible:outline-none',
                'focus-visible:ring-forge-accent focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-secondary-dark',
                'dark:focus-visible:ring-forge-accent-dark'
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
              'text-forge-muted hover:bg-forge-surface hover:text-forge-text-secondary rounded-md p-2',
              'focus-visible:ring-2 focus-visible:outline-none',
              'focus-visible:ring-forge-accent focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-secondary-dark',
              'dark:focus-visible:ring-forge-accent-dark'
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
