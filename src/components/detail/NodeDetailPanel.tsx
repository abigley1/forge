/**
 * NodeDetailPanel - Slide-out panel for editing node details
 *
 * Displays node title, frontmatter fields, and content editor.
 * Supports focus trapping, Escape to close, and keyboard navigation.
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHotkey } from '@/hooks'
import type { ForgeNode } from '@/types'

const Z_PANEL = 25 // Between sticky (20) and modal (30)

export interface NodeDetailPanelProps {
  /** The node being edited */
  node: ForgeNode | null
  /** Whether the panel is open */
  isOpen: boolean
  /** Called when panel should close */
  onClose: () => void
  /** Panel content (typically FrontmatterEditor + MarkdownEditor) */
  children?: ReactNode
  /** Optional class name for the panel */
  className?: string
  /** Whether this is a new node (for auto-focus behavior) */
  isNewNode?: boolean
}

/**
 * Slide-out detail panel for node editing
 */
export function NodeDetailPanel({
  node,
  isOpen,
  onClose,
  children,
  className,
  isNewNode = false,
}: NodeDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // Handle Escape key to close panel
  useHotkey('Escape', onClose, {
    enabled: isOpen,
  })

  // Focus management - trap focus and restore on close
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement

      // Focus the panel after a brief delay for animation
      const timeout = setTimeout(() => {
        if (panelRef.current) {
          // Find first focusable element or focus panel itself
          const firstFocusable = panelRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (firstFocusable) {
            firstFocusable.focus()
          } else {
            panelRef.current.focus()
          }
        }
      }, 50)

      return () => clearTimeout(timeout)
    } else {
      // Restore focus to previous element when closing
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen])

  // Focus trap - keep focus within panel
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return

    const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault()
      lastElement.focus()
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault()
      firstElement.focus()
    }
  }, [])

  if (!isOpen || !node) {
    return null
  }

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 lg:hidden',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
        )}
        style={{ zIndex: Z_PANEL - 1 }}
        onClick={onClose}
        aria-hidden="true"
        data-state={isOpen ? 'open' : 'closed'}
      />

      {/* Panel - uses role="dialog" which requires keyboard event handling for focus trap */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${node.title}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        data-state={isOpen ? 'open' : 'closed'}
        data-new-node={isNewNode || undefined}
        data-testid="detail-panel"
        className={cn(
          // Base styles
          'bg-forge-paper fixed top-0 right-0 h-dvh w-full',
          'flex flex-col overflow-hidden shadow-xl',
          'border-forge-border border-l',
          'dark:bg-forge-paper-dark dark:text-forge-text-dark dark:border-forge-border-dark',
          // Responsive width
          'sm:w-[480px] lg:w-[560px]',
          // Prevent scroll bleed
          'overscroll-contain',
          // Slide-in animation
          'transition-transform duration-200 ease-out',
          'data-[state=closed]:translate-x-full',
          'data-[state=open]:translate-x-0',
          // Focus styles
          'focus:outline-none',
          className
        )}
        style={{ zIndex: Z_PANEL }}
      >
        {/* Header */}
        <header className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-forge-text-secondary dark:text-forge-text-secondary-dark font-mono text-xs tracking-wider uppercase">
            Edit Node
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'text-forge-muted hover:bg-forge-surface hover:text-forge-text rounded-md p-2',
              'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              'dark:text-forge-muted-dark dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-dark',
              'dark:focus-visible:ring-forge-accent-dark'
            )}
            aria-label="Close panel"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </div>
    </>
  )
}
