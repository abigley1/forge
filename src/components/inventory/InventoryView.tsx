/**
 * InventoryView
 *
 * Main inventory page that integrates:
 * - InventorySidebar for category navigation
 * - InventoryList for displaying items
 * - AddInventoryItemModal for creating items
 * - CategoryManagement for managing categories
 */

import { useCallback, useEffect, useState } from 'react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { Button } from '@/components/ui/Button'
import { InventorySidebar } from './InventorySidebar'
import { InventoryList } from './InventoryList'
import { AddInventoryItemModal } from './AddInventoryItemModal'
import { CategoryManagement } from './CategoryManagement'
import { cn } from '@/lib/utils'

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('h-5 w-5', className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function InventoryView() {
  const isLoading = useInventoryStore((state) => state.isLoading)
  const fetchItems = useInventoryStore((state) => state.fetchItems)
  const fetchCategories = useInventoryStore((state) => state.fetchCategories)

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null
  )
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showCategoryManagement, setShowCategoryManagement] = useState(false)

  // Fetch data on mount
  useEffect(() => {
    fetchItems()
    fetchCategories()
  }, [fetchItems, fetchCategories])

  // Handle category selection from sidebar
  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setSelectedSubcategory(null)
  }, [])

  const handleSubcategorySelect = useCallback((subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId)
    // Keep category selected (subcategory is a further filter)
  }, [])

  // Handle successful item creation
  const handleItemCreated = useCallback(() => {
    fetchItems()
  }, [fetchItems])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-forge-muted dark:text-forge-muted-dark">
          Loading inventory...
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={cn(
          'border-forge-border dark:border-forge-border-dark w-64 shrink-0 border-r',
          'bg-forge-surface dark:bg-forge-paper-dark'
        )}
      >
        <InventorySidebar
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          onCategorySelect={handleCategorySelect}
          onSubcategorySelect={handleSubcategorySelect}
        />

        {/* Manage Categories Toggle */}
        <div className="border-forge-border dark:border-forge-border-dark border-t p-3">
          <button
            onClick={() => setShowCategoryManagement(!showCategoryManagement)}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
              'text-forge-text-secondary hover:bg-forge-border dark:text-forge-muted-dark dark:hover:bg-forge-surface-dark',
              showCategoryManagement &&
                'bg-forge-border dark:bg-forge-surface-dark'
            )}
            aria-label="Manage categories"
          >
            <SettingsIcon className="h-4 w-4" />
            Manage Categories
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-6 py-4">
          <h1 className="text-forge-text dark:text-forge-text-dark text-xl font-semibold">
            Inventory
          </h1>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon className="mr-2" />
            Add Item
          </Button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {showCategoryManagement ? (
            <CategoryManagement />
          ) : (
            <InventoryList
              categoryFilter={selectedCategory ?? undefined}
              subcategoryFilter={selectedSubcategory ?? undefined}
            />
          )}
        </div>
      </main>

      {/* Add Item Modal */}
      <AddInventoryItemModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleItemCreated}
      />
    </div>
  )
}
