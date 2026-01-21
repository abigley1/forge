/**
 * NodeTitleEditor - Large heading input for editing node titles
 *
 * Features:
 * - Large heading-style input
 * - Auto-focus on new nodes
 * - Immediate onChange feedback
 */

import { useRef, useEffect, type ChangeEvent } from 'react'
import { cn } from '@/lib/utils'

export interface NodeTitleEditorProps {
  /** Current title value */
  value: string
  /** Called when title changes */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Whether to focus input and select text (for new nodes) */
  focusOnMount?: boolean
  /** Optional class name */
  className?: string
  /** ID for accessibility */
  id?: string
}

/**
 * Large heading input for node titles
 */
export function NodeTitleEditor({
  value,
  onChange,
  placeholder = 'Untitled',
  focusOnMount = false,
  className,
  id = 'node-title-editor',
}: NodeTitleEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus and select all on mount when focusOnMount is true
  useEffect(() => {
    if (focusOnMount && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [focusOnMount])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={cn('mb-4', className)}>
      <label htmlFor={id} className="sr-only">
        Node title
      </label>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="true"
        className={cn(
          // Layout
          'w-full border-none bg-transparent px-0',
          // Typography - large heading style
          'text-2xl font-semibold text-gray-900 dark:text-gray-100',
          // Placeholder
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          // Focus styles
          'focus:ring-0 focus:outline-none',
          // Remove browser default styling
          'appearance-none'
        )}
      />
    </div>
  )
}
