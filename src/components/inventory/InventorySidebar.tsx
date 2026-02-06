/**
 * InventorySidebar Component
 *
 * Displays a tree view of inventory categories and subcategories with:
 * - Expand/collapse for categories with subcategories
 * - Item counts per category/subcategory
 * - Selection highlighting
 * - Keyboard navigation support
 */

import { useState, useCallback, useMemo, useId } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Package,
  Folder,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInventoryStore } from '@/store/useInventoryStore'
import type {
  InventoryCategoryWithSubcategories,
  InventorySubcategory,
} from '@/types/inventory'

// ============================================================================
// Types
// ============================================================================

interface InventorySidebarProps {
  className?: string
  selectedCategory?: string | null
  selectedSubcategory?: string | null
  onCategorySelect?: (categoryId: string | null) => void
  onSubcategorySelect?: (subcategoryId: string) => void
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Calculate item counts per category and subcategory
 */
function useItemCounts() {
  const items = useInventoryStore((state) => state.items)

  return useMemo(() => {
    const categoryCounts = new Map<string, number>()
    const subcategoryCounts = new Map<string, number>()

    items.forEach((item) => {
      // Category count
      const currentCatCount = categoryCounts.get(item.category) ?? 0
      categoryCounts.set(item.category, currentCatCount + 1)

      // Subcategory count
      if (item.subcategory) {
        const currentSubCount = subcategoryCounts.get(item.subcategory) ?? 0
        subcategoryCounts.set(item.subcategory, currentSubCount + 1)
      }
    })

    return {
      total: items.length,
      byCategory: categoryCounts,
      bySubcategory: subcategoryCounts,
    }
  }, [items])
}

// ============================================================================
// CategoryItem Component
// ============================================================================

interface CategoryItemProps {
  category: InventoryCategoryWithSubcategories
  isExpanded: boolean
  isSelected: boolean
  itemCount: number
  onToggleExpand: () => void
  onSelect: () => void
  selectedSubcategory?: string | null
  onSubcategorySelect?: (subcategoryId: string) => void
  subcategoryCounts: Map<string, number>
}

function CategoryItem({
  category,
  isExpanded,
  isSelected,
  itemCount,
  onToggleExpand,
  onSelect,
  selectedSubcategory,
  onSubcategorySelect,
  subcategoryCounts,
}: CategoryItemProps) {
  const hasSubcategories = category.subcategories.length > 0
  const groupId = useId()

  return (
    <li
      role="treeitem"
      aria-selected={isSelected}
      aria-expanded={hasSubcategories ? isExpanded : undefined}
    >
      <div className="flex items-center">
        {/* Expand/Collapse Button */}
        {hasSubcategories ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded',
              'text-forge-muted hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
              'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none'
            )}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.name}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          <span className="w-6" aria-hidden="true" />
        )}

        {/* Category Button */}
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'flex flex-1 items-center gap-2 rounded-md px-2 py-1.5',
            'text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm',
            'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
            'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
            isSelected &&
              'bg-forge-accent-subtle text-forge-accent-hover dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
          )}
        >
          {hasSubcategories ? (
            isExpanded ? (
              <FolderOpen
                className="text-forge-muted h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Folder
                className="text-forge-muted h-4 w-4 shrink-0"
                aria-hidden="true"
              />
            )
          ) : (
            <Folder
              className="text-forge-muted h-4 w-4 shrink-0"
              aria-hidden="true"
            />
          )}
          <span className="flex-1 truncate text-left">{category.name}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs',
              isSelected
                ? 'bg-forge-accent-subtle text-forge-accent-hover dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
                : 'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-muted-dark'
            )}
          >
            {itemCount}
          </span>
        </button>
      </div>

      {/* Subcategories */}
      {hasSubcategories && isExpanded && (
        <ul role="group" id={groupId} className="mt-1 ml-6 space-y-0.5">
          {category.subcategories.map((subcategory) => (
            <SubcategoryItem
              key={subcategory.id}
              subcategory={subcategory}
              isSelected={selectedSubcategory === subcategory.id}
              itemCount={subcategoryCounts.get(subcategory.id) ?? 0}
              onSelect={() => onSubcategorySelect?.(subcategory.id)}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ============================================================================
// SubcategoryItem Component
// ============================================================================

interface SubcategoryItemProps {
  subcategory: InventorySubcategory
  isSelected: boolean
  itemCount: number
  onSelect: () => void
}

function SubcategoryItem({
  subcategory,
  isSelected,
  itemCount,
  onSelect,
}: SubcategoryItemProps) {
  return (
    <li role="treeitem" aria-selected={isSelected}>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5',
          'text-forge-text-secondary dark:text-forge-muted-dark text-sm',
          'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
          'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
          isSelected &&
            'bg-forge-accent-subtle text-forge-accent-hover dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
        )}
      >
        <Package
          className="text-forge-muted h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        <span className="flex-1 truncate text-left">{subcategory.name}</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs',
            isSelected
              ? 'bg-forge-accent-subtle text-forge-accent-hover dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
              : 'bg-forge-surface text-forge-muted dark:bg-forge-surface-dark dark:text-forge-muted-dark'
          )}
        >
          {itemCount}
        </span>
      </button>
    </li>
  )
}

// ============================================================================
// InventorySidebar Component
// ============================================================================

export function InventorySidebar({
  className,
  selectedCategory,
  selectedSubcategory,
  onCategorySelect,
  onSubcategorySelect,
}: InventorySidebarProps) {
  const categories = useInventoryStore((state) => state.categories)
  const isLoading = useInventoryStore((state) => state.isLoading)
  const error = useInventoryStore((state) => state.error)

  const itemCounts = useItemCounts()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )

  const toggleExpand = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      onCategorySelect?.(categoryId)
    },
    [onCategorySelect]
  )

  const handleAllItemsSelect = useCallback(() => {
    onCategorySelect?.(null)
  }, [onCategorySelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Basic keyboard navigation
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const tree = e.currentTarget
      const items = tree.querySelectorAll<HTMLButtonElement>(
        '[role="treeitem"] > div > button:last-child, [role="treeitem"] > button'
      )
      const currentIndex = Array.from(items).findIndex(
        (item) => item === document.activeElement
      )

      if (e.key === 'ArrowDown' && currentIndex < items.length - 1) {
        items[currentIndex + 1].focus()
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        items[currentIndex - 1].focus()
      }
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <nav
        aria-label="Inventory categories"
        className={cn('flex flex-col p-4', className)}
      >
        <p className="text-forge-muted dark:text-forge-muted-dark text-sm">
          Loading categories...
        </p>
      </nav>
    )
  }

  // Error state
  if (error) {
    return (
      <nav
        aria-label="Inventory categories"
        className={cn('flex flex-col p-4', className)}
      >
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load categories
        </p>
      </nav>
    )
  }

  // Empty state
  if (categories.length === 0) {
    return (
      <nav
        aria-label="Inventory categories"
        className={cn('flex flex-col p-4', className)}
      >
        <p className="text-forge-muted dark:text-forge-muted-dark text-sm">
          No categories found
        </p>
      </nav>
    )
  }

  const isAllSelected = selectedCategory === null && !selectedSubcategory

  return (
    <nav
      aria-label="Inventory categories"
      className={cn('flex flex-col', className)}
    >
      <ul
        role="tree"
        aria-label="Categories"
        className="space-y-0.5 p-2"
        onKeyDown={handleKeyDown}
      >
        {/* All Items */}
        <li role="treeitem" aria-selected={isAllSelected}>
          <button
            type="button"
            onClick={handleAllItemsSelect}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-2 py-1.5',
              'text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm font-medium',
              'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
              'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
              isAllSelected &&
                'bg-forge-accent-subtle text-forge-accent-hover dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
            )}
          >
            <Package
              className="text-forge-muted h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span className="flex-1 text-left">All Items</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs',
                isAllSelected
                  ? 'bg-forge-accent-subtle text-forge-accent-hover dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
                  : 'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-muted-dark'
              )}
            >
              {itemCounts.total}
            </span>
          </button>
        </li>

        {/* Categories */}
        {categories.map((category) => (
          <CategoryItem
            key={category.id}
            category={category}
            isExpanded={expandedCategories.has(category.id)}
            isSelected={
              selectedCategory === category.id && !selectedSubcategory
            }
            itemCount={itemCounts.byCategory.get(category.id) ?? 0}
            onToggleExpand={() => toggleExpand(category.id)}
            onSelect={() => handleCategorySelect(category.id)}
            selectedSubcategory={selectedSubcategory}
            onSubcategorySelect={onSubcategorySelect}
            subcategoryCounts={itemCounts.bySubcategory}
          />
        ))}
      </ul>
    </nav>
  )
}
