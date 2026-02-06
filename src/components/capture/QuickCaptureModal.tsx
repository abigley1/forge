/**
 * Quick Capture Modal Component
 *
 * A floating modal for quickly capturing notes without leaving the current context.
 * Features:
 * - Opens with Cmd/Ctrl+Shift+N global hotkey
 * - Single text input with multi-line support
 * - Enter submits, Escape cancels
 * - Creates NoteNode with first line as title
 * - Auto-tags with 'inbox' for later triage
 * - Supports inline #tag syntax
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { FileText, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog, useToast } from '@/components/ui'
import { useNodesStore } from '@/store'
import type { NoteNode } from '@/types/nodes'

export interface QuickCaptureModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when the modal should close */
  onClose: () => void
  /** Called when a note is created with the note ID */
  onNoteCreated?: (noteId: string) => void
}

/**
 * Parse inline #tags from text
 * Returns the text without tags and an array of tag names
 */
function parseInlineTags(text: string): { cleanText: string; tags: string[] } {
  const tagPattern = /#([a-zA-Z0-9_-]+)/g
  const tags: string[] = []
  let match

  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1].toLowerCase())
  }

  // Remove tags from text
  const cleanText = text.replace(tagPattern, '').trim()

  return { cleanText, tags }
}

/**
 * Generate a slug-like ID from a title
 */
function generateIdFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  const timestamp = Date.now().toString(36)
  return `note-${slug || 'untitled'}-${timestamp}`
}

export function QuickCaptureModal({
  isOpen,
  onClose,
  onNoteCreated,
}: QuickCaptureModalProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevIsOpenRef = useRef(isOpen)
  const { info } = useToast()

  // Store actions
  const addNode = useNodesStore((state) => state.addNode)

  // Focus textarea when modal opens (using ref to track previous state to avoid lint warning)
  useEffect(() => {
    // Modal just opened
    if (isOpen && !prevIsOpenRef.current) {
      // Focus input after a brief delay for animation
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
    prevIsOpenRef.current = isOpen
  }, [isOpen])

  // Handle form submission
  const handleSubmit = useCallback(() => {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      onClose()
      return
    }

    // Parse inline tags
    const { cleanText, tags: inlineTags } = parseInlineTags(trimmedContent)

    // Split into title and body
    const lines = cleanText.split('\n')
    const title = lines[0].trim() || 'Untitled Note'
    const body = lines.slice(1).join('\n').trim()

    // Always include 'inbox' tag for triage
    const allTags = ['inbox', ...inlineTags.filter((t) => t !== 'inbox')]

    // Generate ID
    const noteId = generateIdFromTitle(title)
    const now = new Date()

    // Create the note
    const newNote: NoteNode = {
      id: noteId,
      type: 'note',
      title,
      content: body,
      tags: allTags,
      dates: {
        created: now,
        modified: now,
      },
      parent: null,
    }

    // Add to store
    addNode(newNote)

    // Show toast with View action
    info({
      title: 'Note created',
      description: title,
    })

    // Close modal
    onClose()

    // Notify parent if callback provided (for View action in toast)
    onNoteCreated?.(noteId)
  }, [content, addNode, info, onClose, onNoteCreated])

  // Handle key events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSubmit()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setContent('') // Reset content when closing via Escape
        onClose()
      }
    },
    [handleSubmit, onClose]
  )

  // Handle open change from Dialog
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setContent('') // Reset content when closing
        onClose()
      }
    },
    [onClose]
  )

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup aria-label="Quick capture note" className="max-w-lg">
          {/* Header */}
          <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText
                className="text-forge-muted dark:text-forge-muted-dark h-5 w-5"
                aria-hidden="true"
              />
              <Dialog.Title className="!mb-0 !text-sm !font-medium">
                Quick Capture
              </Dialog.Title>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                'rounded-md p-1',
                'text-forge-muted hover:text-forge-text dark:text-forge-muted-dark dark:hover:text-forge-text-dark',
                'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
                'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none'
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Quick note... (first line becomes title, use #tags inline)"
              aria-label="Note content"
              autoComplete="off"
              rows={4}
              className={cn(
                'border-forge-border w-full resize-none rounded-md border p-3',
                'text-forge-text placeholder:text-forge-muted text-sm',
                'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark dark:placeholder:text-forge-muted-dark',
                'focus:border-forge-accent focus:ring-forge-accent focus:ring-1 focus:outline-none',
                'dark:focus:border-forge-accent-dark dark:focus:ring-forge-accent-dark'
              )}
            />
            <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-2 text-xs">
              Press <kbd className="font-mono">Enter</kbd> to save,{' '}
              <kbd className="font-mono">Shift+Enter</kbd> for new line,{' '}
              <kbd className="font-mono">Escape</kbd> to cancel
            </p>
          </div>

          {/* Footer */}
          <Dialog.Footer>
            <Dialog.Close>Cancel</Dialog.Close>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim()}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                'bg-forge-accent text-white',
                'hover:bg-forge-accent-hover',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none'
              )}
            >
              Save Note
            </button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
