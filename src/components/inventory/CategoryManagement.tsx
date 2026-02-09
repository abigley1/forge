/**
 * CategoryManagement
 *
 * Component for managing inventory categories and subcategories.
 * Supports CRUD operations with inline editing.
 */

import { useCallback, useEffect, useState } from 'react'
import { useInventoryStore } from '@/store/useInventoryStore'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type {
  InventoryCategoryWithSubcategories,
  InventorySubcategory,
} from '@/types/inventory'

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
      aria-hidden="true"
    >
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
      aria-hidden="true"
    >
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={cn('h-4 w-4', className)}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

// =============================================================================
// Inline Edit Input
// =============================================================================

interface InlineEditProps {
  initialValue: string
  placeholder: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

function InlineEdit({
  initialValue,
  placeholder,
  onSubmit,
  onCancel,
}: InlineEditProps) {
  const [value, setValue] = useState(initialValue)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (value.trim()) {
          onSubmit(value.trim())
        }
      } else if (e.key === 'Escape') {
        onCancel()
      }
    },
    [value, onSubmit, onCancel]
  )

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (value.trim() && value !== initialValue) {
          onSubmit(value.trim())
        } else {
          onCancel()
        }
      }}
      placeholder={placeholder}
      ref={(el) => el?.focus()}
      className={cn(
        'rounded border px-2 py-1 text-sm',
        'focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'
      )}
    />
  )
}

// =============================================================================
// Confirmation Dialog
// =============================================================================

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Subcategory Item
// =============================================================================

interface SubcategoryItemProps {
  subcategory: InventorySubcategory
  onEdit: (id: string, name: string) => void
  onDelete: (id: string) => void
}

function SubcategoryItem({
  subcategory,
  onEdit,
  onDelete,
}: SubcategoryItemProps) {
  const [isEditing, setIsEditing] = useState(false)

  const handleSubmit = useCallback(
    (name: string) => {
      onEdit(subcategory.id, name)
      setIsEditing(false)
    },
    [subcategory.id, onEdit]
  )

  return (
    <li className="group flex items-center justify-between rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
      {isEditing ? (
        <InlineEdit
          initialValue={subcategory.name}
          placeholder="Subcategory name"
          onSubmit={handleSubmit}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {subcategory.name}
          </span>
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
              aria-label={`Edit ${subcategory.name}`}
            >
              <PencilIcon className="h-3 w-3 text-gray-500" />
            </button>
            <button
              onClick={() => onDelete(subcategory.id)}
              className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
              aria-label={`Delete ${subcategory.name}`}
            >
              <TrashIcon className="h-3 w-3 text-gray-500" />
            </button>
          </div>
        </>
      )}
    </li>
  )
}

// =============================================================================
// Category Item
// =============================================================================

interface CategoryItemProps {
  category: InventoryCategoryWithSubcategories
  onEditCategory: (id: string, name: string) => void
  onDeleteCategory: (id: string, subcategoryCount: number) => void
  onAddSubcategory: (categoryId: string, name: string) => void
  onEditSubcategory: (id: string, name: string) => void
  onDeleteSubcategory: (id: string) => void
}

function CategoryItem({
  category,
  onEditCategory,
  onDeleteCategory,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoryItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false)

  const handleCategorySubmit = useCallback(
    (name: string) => {
      onEditCategory(category.id, name)
      setIsEditing(false)
    },
    [category.id, onEditCategory]
  )

  const handleSubcategorySubmit = useCallback(
    (name: string) => {
      onAddSubcategory(category.id, name)
      setIsAddingSubcategory(false)
    },
    [category.id, onAddSubcategory]
  )

  return (
    <li
      data-category={category.id}
      className="rounded-lg border p-3 dark:border-gray-700"
    >
      <div className="mb-2 flex items-center justify-between">
        {isEditing ? (
          <InlineEdit
            initialValue={category.name}
            placeholder="Category name"
            onSubmit={handleCategorySubmit}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {category.name}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={`Edit ${category.name}`}
              >
                <PencilIcon className="text-gray-500" />
              </button>
              <button
                onClick={() =>
                  onDeleteCategory(category.id, category.subcategories.length)
                }
                className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={`Delete ${category.name}`}
              >
                <TrashIcon className="text-gray-500" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Subcategories */}
      <ul className="ml-4 space-y-1 border-l-2 border-gray-200 pl-3 dark:border-gray-600">
        {category.subcategories.map((sub) => (
          <SubcategoryItem
            key={sub.id}
            subcategory={sub}
            onEdit={onEditSubcategory}
            onDelete={onDeleteSubcategory}
          />
        ))}

        {/* Add subcategory */}
        {isAddingSubcategory ? (
          <li className="py-1">
            <InlineEdit
              initialValue=""
              placeholder="Subcategory name"
              onSubmit={handleSubcategorySubmit}
              onCancel={() => setIsAddingSubcategory(false)}
            />
          </li>
        ) : (
          <li>
            <button
              onClick={() => setIsAddingSubcategory(true)}
              className="flex items-center gap-1 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              aria-label="Add subcategory"
            >
              <PlusIcon className="h-3 w-3" />
              Add subcategory
            </button>
          </li>
        )}
      </ul>
    </li>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function CategoryManagement() {
  const categories = useInventoryStore((state) => state.categories)
  const isLoading = useInventoryStore((state) => state.isLoading)
  const fetchCategories = useInventoryStore((state) => state.fetchCategories)
  const createCategory = useInventoryStore((state) => state.createCategory)
  const updateCategory = useInventoryStore((state) => state.updateCategory)
  const deleteCategory = useInventoryStore((state) => state.deleteCategory)
  const createSubcategory = useInventoryStore(
    (state) => state.createSubcategory
  )
  const updateSubcategory = useInventoryStore(
    (state) => state.updateSubcategory
  )
  const deleteSubcategory = useInventoryStore(
    (state) => state.deleteSubcategory
  )

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    name: string
    subcategoryCount: number
  } | null>(null)

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Handlers
  const handleAddCategory = useCallback(
    async (name: string) => {
      await createCategory({ name })
      setIsAddingCategory(false)
    },
    [createCategory]
  )

  const handleEditCategory = useCallback(
    async (id: string, name: string) => {
      await updateCategory(id, { name })
    },
    [updateCategory]
  )

  const handleDeleteCategoryClick = useCallback(
    (id: string, subcategoryCount: number) => {
      const category = categories.find((c) => c.id === id)
      if (category) {
        setConfirmDelete({ id, name: category.name, subcategoryCount })
      }
    },
    [categories]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (confirmDelete) {
      await deleteCategory(confirmDelete.id)
      setConfirmDelete(null)
    }
  }, [confirmDelete, deleteCategory])

  const handleAddSubcategory = useCallback(
    async (categoryId: string, name: string) => {
      await createSubcategory(categoryId, { name })
    },
    [createSubcategory]
  )

  const handleEditSubcategory = useCallback(
    async (id: string, name: string) => {
      await updateSubcategory(id, { name })
    },
    [updateSubcategory]
  )

  const handleDeleteSubcategory = useCallback(
    async (id: string) => {
      await deleteSubcategory(id)
    },
    [deleteSubcategory]
  )

  // Loading state
  if (isLoading && categories.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        Loading categories...
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Categories
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsAddingCategory(true)}
          aria-label="Add category"
        >
          <PlusIcon className="mr-1" />
          Add Category
        </Button>
      </div>

      {/* Add category input */}
      {isAddingCategory && (
        <div className="mb-4">
          <InlineEdit
            initialValue=""
            placeholder="Category name"
            onSubmit={handleAddCategory}
            onCancel={() => setIsAddingCategory(false)}
          />
        </div>
      )}

      {/* Categories list */}
      {categories.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No categories yet. Add one to get started.
        </p>
      ) : (
        <ul aria-label="Categories" className="space-y-3">
          {categories.map((category) => (
            <CategoryItem
              key={category.id}
              category={category}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategoryClick}
              onAddSubcategory={handleAddSubcategory}
              onEditSubcategory={handleEditSubcategory}
              onDeleteSubcategory={handleDeleteSubcategory}
            />
          ))}
        </ul>
      )}

      {/* Confirmation dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Category"
          message={`Are you sure you want to delete "${confirmDelete.name}"?${
            confirmDelete.subcategoryCount > 0
              ? ` This will also delete ${confirmDelete.subcategoryCount} subcategories.`
              : ''
          }`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
