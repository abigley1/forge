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
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-500" aria-hidden="true" />
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
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
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
                'w-full resize-none rounded-md border border-gray-200 p-3',
                'text-sm text-gray-900 placeholder:text-gray-400',
                'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
                'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
              )}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
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
                'bg-blue-600 text-white',
                'hover:bg-blue-700',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none'
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
