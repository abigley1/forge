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
            className="bg-forge-accent-subtle dark:bg-forge-accent-subtle-dark text-inherit"
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
          <div className="border-forge-border dark:border-forge-border-dark flex items-center gap-3 border-b px-4 py-3">
            <Search
              className="text-forge-muted dark:text-forge-muted-dark h-5 w-5 shrink-0"
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
              className="text-forge-text placeholder:text-forge-muted dark:text-forge-text-dark dark:placeholder:text-forge-muted-dark flex-1 bg-transparent text-base outline-none"
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
                className="text-forge-muted hover:bg-forge-surface hover:text-forge-text dark:text-forge-muted-dark dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-dark -m-1.5 rounded p-2.5"
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
              <div className="border-forge-border-subtle text-forge-text-secondary dark:border-forge-border-subtle-dark dark:text-forge-text-secondary-dark flex items-center gap-2 border-b px-4 py-2 text-xs">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {recentIds.length > 0 ? 'Recent' : 'Recently modified'}
              </div>
            )}

            {results.length === 0 ? (
              <div className="text-forge-text-secondary dark:text-forge-text-secondary-dark px-4 py-8 text-center">
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
                      ? 'bg-forge-surface dark:bg-forge-surface-dark'
                      : 'hover:bg-forge-surface/50 dark:hover:bg-forge-surface-dark/50'
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
                          className="text-forge-muted dark:text-forge-muted-dark h-5 w-5 shrink-0"
                          aria-hidden="true"
                        />
                      )
                    })()
                  )}

                  {/* Title and subtitle */}
                  <div className="min-w-0 flex-1">
                    <div className="text-forge-text dark:text-forge-text-dark truncate text-sm font-medium">
                      <HighlightedText
                        text={result.title}
                        matchedIndices={result.matchedIndices}
                      />
                    </div>
                    {result.subtitle && (
                      <div className="text-forge-text-secondary dark:text-forge-text-secondary-dark truncate text-xs">
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
                    <kbd className="bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark hidden shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs sm:flex">
                      <CornerDownLeft className="h-3 w-3" aria-hidden="true" />
                    </kbd>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="border-forge-border bg-forge-surface text-forge-text-secondary dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark flex items-center justify-between border-t px-4 py-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-forge-border-subtle text-forge-text-secondary dark:bg-forge-border-dark dark:text-forge-text-secondary-dark rounded px-1.5 py-0.5 font-mono">
                  ↑↓
                </kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-forge-border-subtle text-forge-text-secondary dark:bg-forge-border-dark dark:text-forge-text-secondary-dark rounded px-1.5 py-0.5 font-mono">
                  ↵
                </kbd>
                <span>open</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-forge-border-subtle text-forge-text-secondary dark:bg-forge-border-dark dark:text-forge-text-secondary-dark rounded px-1.5 py-0.5 font-mono">
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
