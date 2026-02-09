/**
 * InventoryList Component
 *
 * Displays inventory items in a table with:
 * - Expandable rows for item details
 * - Sortable columns
 * - Quantity adjustment buttons
 * - Low stock highlighting
 * - Category/subcategory filtering
 */

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Edit2,
  Trash2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInventoryStore } from '@/store/useInventoryStore'
import type { InventoryItem } from '@/types/inventory'

// ============================================================================
// Types
// ============================================================================

interface InventoryListProps {
  className?: string
  categoryFilter?: string | null
  subcategoryFilter?: string | null
  lowStockThreshold?: number
  selectedItemId?: string | null
  onItemSelect?: (itemId: string) => void
  onItemEdit?: (itemId: string) => void
}

type SortField = 'name' | 'category' | 'quantity' | 'location' | 'cost'
type SortDirection = 'asc' | 'desc'

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return `$${value.toFixed(2)}`
}

function sortItems(
  items: InventoryItem[],
  field: SortField,
  direction: SortDirection
): InventoryItem[] {
  return [...items].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'category':
        comparison = a.category.localeCompare(b.category)
        break
      case 'quantity':
        comparison = a.quantity - b.quantity
        break
      case 'location':
        comparison = (a.location ?? '').localeCompare(b.location ?? '')
        break
      case 'cost':
        comparison = (a.cost ?? 0) - (b.cost ?? 0)
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })
}

// ============================================================================
// ExpandedRow Component
// ============================================================================

interface ExpandedRowProps {
  item: InventoryItem
}

function ExpandedRow({ item }: ExpandedRowProps) {
  return (
    <tr className="bg-gray-50 dark:bg-gray-900/50">
      <td colSpan={6} className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          {/* Supplier */}
          <div>
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Supplier
            </span>
            {item.supplierUrl ? (
              <a
                href={item.supplierUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
              >
                {item.supplier || 'Link'}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-gray-700 dark:text-gray-300">
                {item.supplier || '—'}
              </span>
            )}
          </div>

          {/* Part Number */}
          <div>
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Part Number
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {item.partNumber || '—'}
            </span>
          </div>

          {/* Cost */}
          <div>
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Unit Cost
            </span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatCurrency(item.cost)}
            </span>
          </div>

          {/* Barcode */}
          <div>
            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
              Barcode
            </span>
            <span className="font-mono text-gray-700 dark:text-gray-300">
              {item.barcode || '—'}
            </span>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="col-span-2 md:col-span-4">
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                Notes
              </span>
              <span className="text-gray-700 dark:text-gray-300">
                {item.notes}
              </span>
            </div>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="col-span-2 md:col-span-4">
              <span className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                Tags
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ============================================================================
// ItemRow Component
// ============================================================================

interface ItemRowProps {
  item: InventoryItem
  isExpanded: boolean
  isSelected: boolean
  isLowStock: boolean
  onToggleExpand: () => void
  onSelect: () => void
  onEdit?: () => void
  onDelete: () => void
  onAdjustQuantity: (delta: number) => void
}

function ItemRow({
  item,
  isExpanded,
  isSelected,
  isLowStock,
  onToggleExpand,
  onSelect,
  onEdit,
  onDelete,
  onAdjustQuantity,
}: ItemRowProps) {
  return (
    <>
      <tr
        aria-selected={isSelected}
        className={cn(
          'border-b border-gray-200 dark:border-gray-700',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          isSelected && 'bg-blue-50 dark:bg-blue-900/20',
          isLowStock && !isSelected && 'bg-red-50 dark:bg-red-900/20'
        )}
      >
        {/* Expand Button */}
        <td className="w-10 px-2 py-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded',
              'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700',
              'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
            )}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.name}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </td>

        {/* Name */}
        <th
          scope="row"
          className="px-3 py-2 text-left font-medium text-gray-900 dark:text-gray-100"
        >
          <button
            type="button"
            onClick={onSelect}
            className="text-left hover:underline focus-visible:underline focus-visible:outline-none"
          >
            {item.name}
          </button>
        </th>

        {/* Category */}
        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
          {item.category}
          {item.subcategory && (
            <span className="text-gray-400 dark:text-gray-500">
              {' / '}
              {item.subcategory.split('-').pop()}
            </span>
          )}
        </td>

        {/* Quantity */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAdjustQuantity(-1)}
              disabled={item.quantity === 0}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded',
                'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              aria-label={`Decrease quantity of ${item.name}`}
            >
              <Minus className="h-3 w-3" aria-hidden="true" />
            </button>
            <span
              className={cn(
                'min-w-[2rem] text-center font-medium',
                isLowStock
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
              )}
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onAdjustQuantity(1)}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded',
                'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
              )}
              aria-label={`Increase quantity of ${item.name}`}
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </td>

        {/* Location */}
        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
          {item.location || '—'}
        </td>

        {/* Actions */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded',
                  'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700',
                  'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
                )}
                aria-label={`Edit ${item.name}`}
              >
                <Edit2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded',
                'text-gray-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
              )}
              aria-label={`Delete ${item.name}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && <ExpandedRow item={item} />}
    </>
  )
}

// ============================================================================
// SortableHeader Component
// ============================================================================

interface SortableHeaderProps {
  field: SortField
  label: string
  currentSort: SortField
  direction: SortDirection
  onSort: (field: SortField) => void
  className?: string
}

function SortableHeader({
  field,
  label,
  currentSort,
  direction,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === field

  return (
    <th
      scope="col"
      aria-sort={
        isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
      }
      className={cn(
        'px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300',
        'cursor-pointer select-none',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        className
      )}
      onClick={() => onSort(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSort(field)
        }
      }}
      tabIndex={0}
      role="columnheader"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive &&
          (direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          ))}
      </span>
    </th>
  )
}

// ============================================================================
// InventoryList Component
// ============================================================================

export function InventoryList({
  className,
  categoryFilter,
  subcategoryFilter,
  lowStockThreshold = 5,
  selectedItemId,
  onItemSelect,
  onItemEdit,
}: InventoryListProps) {
  const items = useInventoryStore((state) => state.items)
  const isLoading = useInventoryStore((state) => state.isLoading)
  const error = useInventoryStore((state) => state.error)
  const adjustQuantity = useInventoryStore((state) => state.adjustQuantity)
  const deleteItem = useInventoryStore((state) => state.deleteItem)

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items

    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter)
    }

    if (subcategoryFilter) {
      result = result.filter((item) => item.subcategory === subcategoryFilter)
    }

    return result
  }, [items, categoryFilter, subcategoryFilter])

  // Sort items
  const sortedItems = useMemo(() => {
    return sortItems(filteredItems, sortField, sortDirection)
  }, [filteredItems, sortField, sortDirection])

  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }, [])

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        // Toggle direction if clicking the same field
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        // New field - reset to ascending
        setSortField(field)
        setSortDirection('asc')
      }
    },
    [sortField]
  )

  const handleAdjustQuantity = useCallback(
    (itemId: string, delta: number) => {
      adjustQuantity(itemId, delta)
    },
    [adjustQuantity]
  )

  const handleDelete = useCallback(
    (itemId: string) => {
      deleteItem(itemId)
    },
    [deleteItem]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-gray-500 dark:text-gray-400">Loading items...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-red-600 dark:text-red-400">Failed to load items</p>
      </div>
    )
  }

  // Empty state
  if (sortedItems.length === 0) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-gray-500 dark:text-gray-400">No items found</p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse" aria-label="Inventory items">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
          <tr>
            <th scope="col" className="w-10 px-2 py-2">
              <span className="sr-only">Expand</span>
            </th>
            <SortableHeader
              field="name"
              label="Name"
              currentSort={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="category"
              label="Category"
              currentSort={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="quantity"
              label="Quantity"
              currentSort={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              field="location"
              label="Location"
              currentSort={sortField}
              direction={sortDirection}
              onSort={handleSort}
            />
            <th
              scope="col"
              className="px-3 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              isSelected={selectedItemId === item.id}
              isLowStock={item.quantity <= lowStockThreshold}
              onToggleExpand={() => toggleExpand(item.id)}
              onSelect={() => onItemSelect?.(item.id)}
              onEdit={onItemEdit ? () => onItemEdit(item.id) : undefined}
              onDelete={() => handleDelete(item.id)}
              onAdjustQuantity={(delta) => handleAdjustQuantity(item.id, delta)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
