import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Search,
  X,
  Clock,
  ArrowRight,
  FileText,
  Package,
  CheckSquare,
  Lightbulb,
  CornerDownLeft,
} from 'lucide-react'
import { Dialog } from '@/components/ui'
import { NodeTypeIcon, StatusBadge, type NodeStatus } from '@/components/nodes'
import { useNodesStore } from '@/store'
import { useHotkey } from '@/hooks'
import { fuzzySearchObjects, highlightMatches } from '@/lib/fuzzySearch'
import { cn } from '@/lib/utils'
import type { ForgeNode, NodeType } from '@/types'

const RECENT_COMMANDS_KEY = 'forge-recent-commands'
const MAX_RECENT_COMMANDS = 10
const MAX_RESULTS = 20

export interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface CommandResult {
  id: string
  type: 'node' | 'action'
  nodeType?: NodeType
  title: string
  subtitle?: string
  status?: NodeStatus
  score: number
  matchedIndices: number[]
}

/**
 * Load recent command IDs from localStorage
 */
function loadRecentCommands(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_RECENT_COMMANDS)
      }
    }
  } catch (error) {
    console.warn('Failed to load recent commands from localStorage:', error)
    // Attempt to clear corrupted data
    try {
      localStorage.removeItem(RECENT_COMMANDS_KEY)
    } catch {
      // Storage completely unavailable
    }
  }
  return []
}

/**
 * Save recent command IDs to localStorage
 */
function saveRecentCommands(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      RECENT_COMMANDS_KEY,
      JSON.stringify(ids.slice(0, MAX_RECENT_COMMANDS))
    )
  } catch (error) {
    console.warn('Failed to save recent commands to localStorage:', error)
  }
}

/**
 * Add a command to recent history
 */
function addToRecentCommands(id: string): void {
  const recent = loadRecentCommands()
  const filtered = recent.filter((r) => r !== id)
  filtered.unshift(id)
  saveRecentCommands(filtered.slice(0, MAX_RECENT_COMMANDS))
}

/**
 * Render text with highlighted matched characters
 */
function HighlightedText({
  text,
  matchedIndices,
}: {
  text: string
  matchedIndices: number[]
}) {
  const segments = highlightMatches(text, matchedIndices)

  return (
    <>
      {segments.map((segment, i) =>
        segment.highlighted ? (
          <mark
            key={i}
            className="bg-yellow-200 text-inherit dark:bg-yellow-900/50"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  )
}

/**
 * Get icon for action type
 */
function getActionIcon(actionId: string) {
  if (actionId.startsWith('create-')) {
    const typeMap: Record<string, typeof FileText> = {
      'create-decision': Lightbulb,
      'create-component': Package,
      'create-task': CheckSquare,
      'create-note': FileText,
    }
    return typeMap[actionId] || FileText
  }
  return ArrowRight
}

export function CommandPalette({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CommandPaletteProps) {
  // Open state
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  // Search state - declare before setOpen callback
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Store access
  const nodes = useNodesStore((state) => state.nodes)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)

  // Recent commands - initialize from localStorage
  const [recentIds, setRecentIds] = useState<string[]>(loadRecentCommands)

  const setOpen = useCallback(
    (newOpen: boolean) => {
      // Reset state when opening
      if (newOpen) {
        setQuery('')
        setSelectedIndex(0)
        setRecentIds(loadRecentCommands())
        // Focus input after animation
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (!isControlled) {
        setInternalOpen(newOpen)
      }
      controlledOnOpenChange?.(newOpen)
    },
    [isControlled, controlledOnOpenChange]
  )

  // Hotkey to open palette
  useHotkey('k', () => setOpen(true), { meta: true })
  useHotkey('k', () => setOpen(true), { ctrl: true })

  // Build search results
  const results = useMemo((): CommandResult[] => {
    const allNodes = Array.from(nodes.values())

    if (!query.trim()) {
      // Show recent commands when query is empty
      const recentNodes: CommandResult[] = []
      for (const id of recentIds) {
        const node = nodes.get(id)
        if (node) {
          recentNodes.push({
            id: node.id,
            type: 'node',
            nodeType: node.type,
            title: node.title,
            status: 'status' in node ? (node.status as NodeStatus) : undefined,
            score: 1,
            matchedIndices: [],
          })
        }
      }

      // If we have recent nodes, show them
      if (recentNodes.length > 0) {
        return recentNodes.slice(0, MAX_RESULTS)
      }

      // Otherwise show all nodes sorted by modified date
      return allNodes
        .sort((a, b) => b.dates.modified.getTime() - a.dates.modified.getTime())
        .slice(0, MAX_RESULTS)
        .map((node) => ({
          id: node.id,
          type: 'node' as const,
          nodeType: node.type,
          title: node.title,
          status: 'status' in node ? (node.status as NodeStatus) : undefined,
          score: 1,
          matchedIndices: [],
        }))
    }

    // Fuzzy search nodes
    const searchResults = fuzzySearchObjects<ForgeNode>(
      allNodes,
      query,
      (node) => node.title,
      { threshold: 0.1, limit: MAX_RESULTS }
    )

    return searchResults.map((result) => ({
      id: result.item.id,
      type: 'node' as const,
      nodeType: result.item.type,
      title: result.item.title,
      status:
        'status' in result.item
          ? (result.item.status as NodeStatus)
          : undefined,
      score: result.score,
      matchedIndices: result.matchedIndices,
    }))
  }, [query, nodes, recentIds])

  // Compute bounded selected index to ensure it's always valid
  const boundedSelectedIndex = useMemo(() => {
    if (results.length === 0) return 0
    return Math.min(selectedIndex, results.length - 1)
  }, [selectedIndex, results.length])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selectedElement = listRef.current.querySelector(
      '[data-selected="true"]'
    )
    if (
      selectedElement &&
      typeof selectedElement.scrollIntoView === 'function'
    ) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }, [boundedSelectedIndex])

  // Execute selected result
  const executeResult = useCallback(
    (result: CommandResult) => {
      if (result.type === 'node') {
        setActiveNode(result.id)
        addToRecentCommands(result.id)
      }
      setOpen(false)
    },
    [setActiveNode, setOpen]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[boundedSelectedIndex]) {
            executeResult(results[boundedSelectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          break
        case 'Home':
          e.preventDefault()
          setSelectedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setSelectedIndex(results.length - 1)
          break
      }
    },
    [results, boundedSelectedIndex, executeResult, setOpen]
  )

  // Clear input
  const clearInput = useCallback(() => {
    setQuery('')
    inputRef.current?.focus()
  }, [])

  // Announce result count for screen readers
  const resultCountMessage = useMemo(() => {
    if (!query.trim()) {
      return recentIds.length > 0
        ? `Showing ${Math.min(recentIds.length, results.length)} recent items`
        : `Showing ${results.length} nodes`
    }
    return `${results.length} result${results.length === 1 ? '' : 's'} found`
  }, [query, results.length, recentIds.length])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          className="fixed top-[15%] left-1/2 w-full max-w-xl -translate-x-1/2 p-0"
          aria-label="Command palette"
          aria-modal="true"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <Search
              className="h-5 w-5 shrink-0 text-gray-400"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search nodes..."
              className="flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
              aria-label="Search nodes"
              aria-autocomplete="list"
              aria-controls="command-palette-results"
              aria-activedescendant={
                results[boundedSelectedIndex]
                  ? `result-${results[boundedSelectedIndex].id}`
                  : undefined
              }
            />
            {query && (
              <button
                type="button"
                onClick={clearInput}
                className="-m-1.5 rounded p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results list */}
          <div
            ref={listRef}
            id="command-palette-results"
            role="listbox"
            aria-label="Search results"
            className="max-h-80 overflow-y-auto overscroll-contain"
          >
            {/* Show hint when empty query */}
            {!query.trim() && results.length > 0 && (
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {recentIds.length > 0 ? 'Recent' : 'Recently modified'}
              </div>
            )}

            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                No results found for "{query}"
              </div>
            ) : (
              results.map((result, index) => (
                <button
                  key={result.id}
                  id={`result-${result.id}`}
                  role="option"
                  aria-selected={index === boundedSelectedIndex}
                  data-selected={index === boundedSelectedIndex}
                  onClick={() => executeResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left',
                    index === boundedSelectedIndex
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  {/* Icon */}
                  {result.type === 'node' && result.nodeType ? (
                    <NodeTypeIcon type={result.nodeType} size="md" />
                  ) : (
                    (() => {
                      const Icon = getActionIcon(result.id)
                      return (
                        <Icon
                          className="h-5 w-5 shrink-0 text-gray-400"
                          aria-hidden="true"
                        />
                      )
                    })()
                  )}

                  {/* Title and subtitle */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      <HighlightedText
                        text={result.title}
                        matchedIndices={result.matchedIndices}
                      />
                    </div>
                    {result.subtitle && (
                      <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {result.subtitle}
                      </div>
                    )}
                  </div>

                  {/* Status badge */}
                  {result.status && (
                    <StatusBadge status={result.status} size="sm" />
                  )}

                  {/* Enter hint on selected */}
                  {index === boundedSelectedIndex && (
                    <kbd className="hidden shrink-0 items-center gap-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500 sm:flex dark:bg-gray-700 dark:text-gray-400">
                      <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
                    </kbd>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  ↑↓
                </kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  ↵
                </kbd>
                <span>open</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  esc
                </kbd>
                <span>close</span>
              </span>
            </div>
            <span aria-live="polite" aria-atomic="true">
              {resultCountMessage}
            </span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
