/**
 * ChecklistEditor - Editor for task checklists
 *
 * Features:
 * - Space to toggle completion
 * - Enter to add new item
 * - Backspace on empty item to delete
 * - Drag and drop reordering (future)
 * - Parses markdown checklist syntax: - [ ] and - [x]
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/types'
import { createChecklistItem } from '@/types'

export interface ChecklistEditorProps {
  /** Checklist items */
  value: ChecklistItem[]
  /** Called when checklist changes */
  onChange: (items: ChecklistItem[]) => void
  /** Optional label */
  label?: string
  /** Optional class name */
  className?: string
  /** Whether the editor is disabled */
  disabled?: boolean
  /** ID for accessibility */
  id?: string
}

/**
 * Checklist editor with keyboard controls
 */
export function ChecklistEditor({
  value,
  onChange,
  label = 'Checklist',
  className,
  disabled = false,
  id = 'checklist-editor',
}: ChecklistEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const listRef = useRef<HTMLUListElement>(null)

  // Focus newly added items
  useEffect(() => {
    if (editingId) {
      const input = inputRefs.current.get(editingId)
      input?.focus()
    }
  }, [editingId])

  const updateItem = useCallback(
    (itemId: string, updates: Partial<ChecklistItem>) => {
      onChange(
        value.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      )
    },
    [value, onChange]
  )

  const deleteItem = useCallback(
    (itemId: string) => {
      const index = value.findIndex((item) => item.id === itemId)
      const newItems = value.filter((item) => item.id !== itemId)
      onChange(newItems)

      // Focus previous item or add button
      if (newItems.length > 0) {
        const focusIndex = Math.max(0, index - 1)
        const focusId = newItems[focusIndex].id
        setTimeout(() => {
          inputRefs.current.get(focusId)?.focus()
        }, 0)
      }
    },
    [value, onChange]
  )

  const addItem = useCallback(
    (afterId?: string) => {
      const newItem = createChecklistItem('')
      let newItems: ChecklistItem[]

      if (afterId) {
        const index = value.findIndex((item) => item.id === afterId)
        newItems = [
          ...value.slice(0, index + 1),
          newItem,
          ...value.slice(index + 1),
        ]
      } else {
        newItems = [...value, newItem]
      }

      onChange(newItems)
      setEditingId(newItem.id)
    },
    [value, onChange]
  )

  const handleToggle = useCallback(
    (itemId: string) => {
      const item = value.find((i) => i.id === itemId)
      if (item) {
        updateItem(itemId, { completed: !item.completed })
      }
    },
    [value, updateItem]
  )

  const handleTextChange = useCallback(
    (itemId: string, text: string) => {
      updateItem(itemId, { text })
    },
    [updateItem]
  )

  const handleKeyDown = useCallback(
    (
      e: KeyboardEvent<HTMLInputElement>,
      item: ChecklistItem,
      index: number
    ) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          addItem(item.id)
          break

        case 'Backspace':
          if (item.text === '') {
            e.preventDefault()
            deleteItem(item.id)
          }
          break

        case ' ':
          // Only toggle if at the start of input or input is empty
          if (
            (e.currentTarget.selectionStart === 0 &&
              e.currentTarget.selectionEnd === 0) ||
            item.text === ''
          ) {
            e.preventDefault()
            handleToggle(item.id)
          }
          break

        case 'ArrowUp':
          if (index > 0) {
            e.preventDefault()
            const prevId = value[index - 1].id
            inputRefs.current.get(prevId)?.focus()
          }
          break

        case 'ArrowDown':
          if (index < value.length - 1) {
            e.preventDefault()
            const nextId = value[index + 1].id
            inputRefs.current.get(nextId)?.focus()
          }
          break
      }
    },
    [addItem, deleteItem, handleToggle, value]
  )

  const setInputRef = useCallback(
    (itemId: string) => (el: HTMLInputElement | null) => {
      if (el) {
        inputRefs.current.set(itemId, el)
      } else {
        inputRefs.current.delete(itemId)
      }
    },
    []
  )

  const completedCount = value.filter((item) => item.completed).length

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with label and progress */}
      <div className="flex items-center justify-between">
        <label
          id={`${id}-label`}
          className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-sm font-medium"
        >
          {label}
        </label>
        {value.length > 0 && (
          <span className="text-forge-muted dark:text-forge-muted-dark text-xs">
            {completedCount}/{value.length} complete
          </span>
        )}
      </div>

      {/* Checklist items */}
      <ul ref={listRef} aria-labelledby={`${id}-label`} className="space-y-1">
        {value.map((item, index) => (
          <li
            key={item.id}
            className={cn(
              'group flex items-center gap-2 rounded-md',
              '-mx-2 px-2 py-1',
              'hover:bg-forge-surface dark:hover:bg-forge-surface-dark/50'
            )}
          >
            {/* Drag handle (visual only for now) */}
            <span
              className={cn(
                'text-forge-border cursor-grab opacity-0 transition-opacity',
                'group-hover:opacity-100',
                'dark:text-forge-border-dark'
              )}
              aria-hidden="true"
            >
              <GripVertical className="h-4 w-4" />
            </span>

            {/* Checkbox - label provides 44x44px touch target per WCAG 2.1 */}
            <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => handleToggle(item.id)}
                disabled={disabled}
                className={cn(
                  'border-forge-border h-4 w-4 rounded',
                  'text-forge-text focus:ring-forge-muted',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  'dark:border-forge-border-dark dark:bg-forge-surface-dark',
                  'dark:checked:bg-forge-muted'
                )}
                aria-label={`Mark "${item.text || 'item'}" as ${item.completed ? 'incomplete' : 'complete'}`}
              />
            </label>

            {/* Text input */}
            <input
              ref={setInputRef(item.id)}
              type="text"
              value={item.text}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleTextChange(item.id, e.target.value)
              }
              onKeyDown={(e) => handleKeyDown(e, item, index)}
              disabled={disabled}
              placeholder="New item..."
              className={cn(
                'flex-1 border-none bg-transparent p-0',
                'text-forge-text text-sm',
                'placeholder:text-forge-muted',
                'focus:ring-0 focus:outline-none',
                item.completed && 'text-forge-muted line-through',
                'dark:text-forge-text-dark dark:placeholder:text-forge-muted-dark',
                item.completed && 'dark:text-forge-muted-dark'
              )}
            />
          </li>
        ))}
      </ul>

      {/* Add item button */}
      <button
        type="button"
        onClick={() => addItem()}
        disabled={disabled}
        className={cn(
          'text-forge-muted flex items-center gap-2 text-sm',
          'rounded-md px-2 py-1',
          'hover:bg-forge-surface hover:text-forge-text-secondary',
          'focus-visible:ring-2 focus-visible:outline-none',
          'focus-visible:ring-forge-accent focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:text-forge-muted-dark dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-dark',
          'dark:focus-visible:ring-forge-accent-dark'
        )}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add item
      </button>

      {/* Help text */}
      <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
        Enter to add, Backspace on empty to delete, Space at start to toggle
      </p>
    </div>
  )
}
