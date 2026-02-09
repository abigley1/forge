/**
 * AddInventoryItemModal
 *
 * Modal dialog for adding new inventory items.
 * Supports two modes:
 * - Manual: Standard form entry
 * - Quick Add: Paste URL to extract product data automatically
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useInventoryStore } from '@/store/useInventoryStore'
import { cn } from '@/lib/utils'
import type { InventoryItemStatus } from '@/types/inventory'
import { BarcodeScanner, type BarcodeLookupResult } from './BarcodeScanner'

// =============================================================================
// Types
// =============================================================================

interface AddInventoryItemModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

type TabId = 'manual' | 'quick-add'

interface FormData {
  name: string
  category: string
  subcategory: string
  status: InventoryItemStatus
  quantity: string
  location: string
  supplier: string
  supplierUrl: string
  partNumber: string
  cost: string
  notes: string
}

interface FormErrors {
  name?: string
  category?: string
  quantity?: string
  cost?: string
}

const initialFormData: FormData = {
  name: '',
  category: '',
  subcategory: '',
  status: 'owned',
  quantity: '1',
  location: '',
  supplier: '',
  supplierUrl: '',
  partNumber: '',
  cost: '',
  notes: '',
}

// =============================================================================
// Tab Component
// =============================================================================

interface TabProps {
  id: TabId
  label: string
  selected: boolean
  onClick: () => void
}

function Tab({ id, label, selected, onClick }: TabProps) {
  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={selected}
      aria-controls={`tabpanel-${id}`}
      onClick={onClick}
      className={cn(
        'border-b-2 px-4 py-2 text-sm font-medium transition-colors',
        selected
          ? 'border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
      )}
    >
      {label}
    </button>
  )
}

// =============================================================================
// Component
// =============================================================================

export function AddInventoryItemModal({
  open,
  onClose,
  onSuccess,
}: AddInventoryItemModalProps) {
  const categories = useInventoryStore((state) => state.categories)
  const createItem = useInventoryStore((state) => state.createItem)

  const [activeTab, setActiveTab] = useState<TabId>('manual')
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Quick Add state
  const [extractUrl, setExtractUrl] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Reset form when modal opens — setState in effect is intentional here
  // to synchronize form state with the dialog open/close lifecycle
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setFormData(initialFormData)
      setErrors({})
      setSubmitError(null)
      setIsSubmitting(false)
      setActiveTab('manual')
      setExtractUrl('')
      setExtractError(null)
      setIsExtracting(false)
      // Focus name input after render
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 0)
    }
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Focus URL input when switching to Quick Add tab
  useEffect(() => {
    if (activeTab === 'quick-add') {
      setTimeout(() => {
        urlInputRef.current?.focus()
      }, 0)
    }
  }, [activeTab])

  // Get subcategories for selected category
  const selectedCategory = categories.find((c) => c.id === formData.category)
  const subcategories = selectedCategory?.subcategories ?? []

  // ---------------------------------------------------------------------------
  // Form Handlers
  // ---------------------------------------------------------------------------

  const handleInputChange = useCallback(
    (field: keyof FormData) =>
      (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }))

        // Clear field error when user types
        if (errors[field as keyof FormErrors]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
      },
    [errors]
  )

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCategory = e.target.value
      setFormData((prev) => ({
        ...prev,
        category: newCategory,
        subcategory: '', // Reset subcategory when category changes
      }))

      // Clear category error
      if (errors.category) {
        setErrors((prev) => ({ ...prev, category: undefined }))
      }
    },
    [errors.category]
  )

  const handleSubcategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFormData((prev) => ({ ...prev, subcategory: e.target.value }))
    },
    []
  )

  // ---------------------------------------------------------------------------
  // Quick Add - URL Extraction
  // ---------------------------------------------------------------------------

  const handleExtract = useCallback(async () => {
    if (!extractUrl.trim()) return

    setIsExtracting(true)
    setExtractError(null)

    try {
      const response = await fetch('/api/inventory/extract-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: extractUrl }),
      })

      const result = await response.json()

      if (!response.ok) {
        setExtractError(result.error || 'Failed to extract data')
        setIsExtracting(false)
        return
      }

      const data = result.data

      // Pre-fill form with extracted data
      setFormData((prev) => ({
        ...prev,
        name: data.name || '',
        supplier: data.supplier || '',
        supplierUrl: data.supplierUrl || extractUrl,
        partNumber: data.partNumber || '',
        cost: data.cost !== null ? String(data.cost) : '',
        status: 'wishlist', // Default to wishlist for Quick Add
      }))

      // Switch to manual tab to review/complete the form
      setActiveTab('manual')
      setIsExtracting(false)

      // Focus name input
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 0)
    } catch (error) {
      setExtractError(
        error instanceof Error ? error.message : 'Failed to extract data'
      )
      setIsExtracting(false)
    }
  }, [extractUrl])

  // ---------------------------------------------------------------------------
  // Quick Add - Barcode Scanning
  // ---------------------------------------------------------------------------

  const handleBarcodeScan = useCallback((result: BarcodeLookupResult) => {
    if (result.found) {
      // Pre-fill form with scanned product data
      setFormData((prev) => ({
        ...prev,
        name: result.name || 'Unknown Product',
        supplier: result.supplier || '',
        status: 'wishlist', // Default to wishlist for scanned items
      }))
    } else {
      // Product not found - just fill in the barcode
      setFormData((prev) => ({
        ...prev,
        name: `Unknown (Barcode: ${result.barcode})`,
        status: 'wishlist',
      }))
    }

    // Switch to manual tab to review/complete the form
    setActiveTab('manual')

    // Focus name input
    setTimeout(() => {
      nameInputRef.current?.focus()
    }, 0)
  }, [])

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    const quantityValue = parseInt(formData.quantity, 10)
    if (!Number.isNaN(quantityValue) && quantityValue < 0) {
      newErrors.quantity = 'Quantity cannot be negative'
    }

    const costValue = formData.cost ? parseFloat(formData.cost) : null
    if (costValue !== null && costValue < 0) {
      newErrors.cost = 'Cost cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validate()) {
        return
      }

      setIsSubmitting(true)
      setSubmitError(null)

      const costValue = formData.cost ? parseFloat(formData.cost) : null
      const quantityValue = parseInt(formData.quantity, 10) || 0

      const result = await createItem({
        name: formData.name.trim(),
        category_id: formData.category,
        subcategory_id: formData.subcategory || null,
        status: formData.status,
        quantity: quantityValue,
        location: formData.location.trim() || null,
        supplier: formData.supplier.trim() || null,
        supplier_url: formData.supplierUrl.trim() || null,
        part_number: formData.partNumber.trim() || null,
        cost: costValue,
        notes: formData.notes.trim() || null,
        barcode: null,
        image_url: null,
        tags: [],
      })

      setIsSubmitting(false)

      if (result) {
        // Reset form before closing so it's clean if reopened
        setFormData(initialFormData)
        onSuccess?.()
        onClose()
      } else {
        setSubmitError('Failed to create item')
      }
    },
    [formData, validate, createItem, onSuccess, onClose]
  )

  // ---------------------------------------------------------------------------
  // Render - Manual Tab Content
  // ---------------------------------------------------------------------------

  const renderManualTab = () => (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      {/* Name */}
      <div>
        <label
          htmlFor="item-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Name <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameInputRef}
          id="item-name"
          type="text"
          value={formData.name}
          onChange={handleInputChange('name')}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
            errors.name && 'border-red-500'
          )}
          autoComplete="off"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="item-category"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="item-category"
          value={formData.category}
          onChange={handleCategoryChange}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
            errors.category && 'border-red-500'
          )}
        >
          <option value="">Select category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="mt-1 text-sm text-red-500">{errors.category}</p>
        )}
      </div>

      {/* Subcategory */}
      <div>
        <label
          htmlFor="item-subcategory"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Subcategory
        </label>
        <select
          id="item-subcategory"
          value={formData.subcategory}
          onChange={handleSubcategoryChange}
          disabled={subcategories.length === 0}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
            'disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-700'
          )}
        >
          <option value="">Select subcategory...</option>
          {subcategories.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="item-status"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Status
        </label>
        <select
          id="item-status"
          value={formData.status}
          onChange={handleInputChange('status')}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          )}
        >
          <option value="owned">Owned (in stock)</option>
          <option value="wishlist">Wishlist (saved for later)</option>
          <option value="on_order">On Order (purchased)</option>
        </select>
      </div>

      {/* Quantity */}
      <div>
        <label
          htmlFor="item-quantity"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Quantity <span className="text-red-500">*</span>
        </label>
        <input
          id="item-quantity"
          type="number"
          value={formData.quantity}
          onChange={handleInputChange('quantity')}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
            errors.quantity && 'border-red-500'
          )}
        />
        {errors.quantity && (
          <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
        )}
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="item-location"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Location
        </label>
        <input
          id="item-location"
          type="text"
          value={formData.location}
          onChange={handleInputChange('location')}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          )}
          autoComplete="off"
        />
      </div>

      {/* Supplier */}
      <div>
        <label
          htmlFor="item-supplier"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Supplier
        </label>
        <input
          id="item-supplier"
          type="text"
          value={formData.supplier}
          onChange={handleInputChange('supplier')}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          )}
          autoComplete="off"
        />
      </div>

      {/* Part Number */}
      <div>
        <label
          htmlFor="item-part-number"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Part Number
        </label>
        <input
          id="item-part-number"
          type="text"
          value={formData.partNumber}
          onChange={handleInputChange('partNumber')}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          )}
          autoComplete="off"
        />
      </div>

      {/* Cost */}
      <div>
        <label
          htmlFor="item-cost"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Cost
        </label>
        <input
          id="item-cost"
          type="number"
          step="0.01"
          value={formData.cost}
          onChange={handleInputChange('cost')}
          placeholder="0.00"
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
            errors.cost && 'border-red-500'
          )}
        />
        {errors.cost && (
          <p className="mt-1 text-sm text-red-500">{errors.cost}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="item-notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Notes
        </label>
        <textarea
          id="item-notes"
          value={formData.notes}
          onChange={handleInputChange('notes')}
          rows={3}
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          )}
        />
      </div>

      {/* Submit Error */}
      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      {/* Actions */}
      <Dialog.Footer>
        <Dialog.Close>Cancel</Dialog.Close>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Item'}
        </Button>
      </Dialog.Footer>
    </form>
  )

  // ---------------------------------------------------------------------------
  // Render - Quick Add Tab Content
  // ---------------------------------------------------------------------------

  const renderQuickAddTab = () => (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Paste a product URL from Amazon, DigiKey, Mouser, or other suppliers to
        automatically extract product information.
      </p>

      {/* URL Input */}
      <div>
        <label
          htmlFor="extract-url"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          URL
        </label>
        <input
          ref={urlInputRef}
          id="extract-url"
          type="url"
          value={extractUrl}
          onChange={(e) => setExtractUrl(e.target.value)}
          placeholder="https://www.amazon.com/dp/..."
          className={cn(
            'mt-1 block w-full rounded-md border px-3 py-2',
            'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
          )}
        />
      </div>

      {/* Extract Error */}
      {extractError && <p className="text-sm text-red-500">{extractError}</p>}

      {/* Extract Button */}
      <Button
        type="button"
        onClick={handleExtract}
        disabled={!extractUrl.trim() || isExtracting}
        className="w-full"
      >
        {isExtracting ? 'Extracting...' : 'Extract'}
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            or
          </span>
        </div>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner onScan={handleBarcodeScan} />
    </div>
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup aria-labelledby="add-item-title">
          <Dialog.Title id="add-item-title">Add Inventory Item</Dialog.Title>

          {/* Tab Navigation */}
          <div
            role="tablist"
            className="mt-2 flex border-b border-gray-200 dark:border-gray-700"
          >
            <Tab
              id="manual"
              label="Manual"
              selected={activeTab === 'manual'}
              onClick={() => setActiveTab('manual')}
            />
            <Tab
              id="quick-add"
              label="Quick Add"
              selected={activeTab === 'quick-add'}
              onClick={() => setActiveTab('quick-add')}
            />
          </div>

          {/* Tab Panels */}
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === 'manual' ? renderManualTab() : renderQuickAddTab()}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
