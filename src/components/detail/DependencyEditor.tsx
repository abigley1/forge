import {
  useState,
  useCallback,
  useRef,
  type KeyboardEvent,
  type ChangeEvent,
  useMemo,
} from 'react'
import { X, AlertTriangle, ArrowRight, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NodeTypeIcon } from '@/components/nodes/NodeTypeIcon'
import { type ForgeNode, NodeType, isTaskNode } from '@/types'
import {
  DependencyGraph,
  buildDependencyGraph,
  wouldCreateCycle,
  CycleError,
} from '@/lib/dependencyGraph'

/**
 * Node information for display in the dependency editor
 */
export interface DependencyNodeInfo {
  id: string
  title: string
  type: NodeType
}

/**
 * Props for the DependencyEditor component
 */
export interface DependencyEditorProps {
  /** Current node's ID (for cycle detection) */
  nodeId: string
  /** Current list of dependency IDs */
  value: string[]
  /** Called when dependencies change */
  onChange: (dependsOn: string[]) => void
  /** All available nodes that can be dependencies */
  availableNodes: Map<string, ForgeNode>
  /** IDs of nodes that depend on the current node (for "Blocks" display) */
  blockedByThis?: string[]
  /** Called when clicking a dependency to navigate to it */
  onNavigate?: (nodeId: string) => void
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Build a dependency graph from all nodes for cycle checking
 */
function buildGraphFromNodes(nodes: Map<string, ForgeNode>): DependencyGraph {
  const dependencies = new Map<string, string[]>()

  for (const [id, node] of nodes) {
    if (isTaskNode(node)) {
      dependencies.set(id, node.dependsOn)
    } else {
      dependencies.set(id, [])
    }
  }

  try {
    return buildDependencyGraph(dependencies)
  } catch (error) {
    // Log the error for debugging - this indicates corrupted data
    if (error instanceof CycleError) {
      console.warn(
        '[DependencyEditor] Existing data contains cycle:',
        error.cyclePath.join(' -> ')
      )
    } else {
      console.error(
        '[DependencyEditor] Failed to build dependency graph:',
        error
      )
    }
    // Return empty graph to allow the editor to function
    return new DependencyGraph()
  }
}

/**
 * Get node info from the available nodes map
 */
function getNodeInfo(
  nodeId: string,
  availableNodes: Map<string, ForgeNode>
): DependencyNodeInfo | null {
  const node = availableNodes.get(nodeId)
  if (!node) return null
  return {
    id: node.id,
    title: node.title,
    type: node.type,
  }
}

/**
 * DependencyEditor - Multi-select editor for task dependencies with cycle prevention
 *
 * Features:
 * - Dropdown with search/filter to add dependencies
 * - Chip display for current dependencies with removal
 * - Cycle detection prevents creating circular dependencies
 * - "Blocks" section shows nodes that depend on this node
 */
export function DependencyEditor({
  nodeId,
  value,
  onChange,
  availableNodes,
  blockedByThis = [],
  onNavigate,
  disabled = false,
  className,
}: DependencyEditorProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [cycleWarning, setCycleWarning] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Build dependency graph for cycle detection
  const dependencyGraph = useMemo(
    () => buildGraphFromNodes(availableNodes),
    [availableNodes]
  )

  // Get available nodes as suggestions (exclude current node and already selected)
  const suggestions = useMemo(() => {
    const result: DependencyNodeInfo[] = []
    for (const [id, node] of availableNodes) {
      // Exclude self
      if (id === nodeId) continue
      // Exclude already selected
      if (value.includes(id)) continue
      // Only include tasks and decisions (things that can be dependencies)
      if (node.type !== NodeType.Task && node.type !== NodeType.Decision)
        continue

      result.push({
        id: node.id,
        title: node.title,
        type: node.type,
      })
    }
    return result
  }, [availableNodes, nodeId, value])

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return suggestions
    const query = inputValue.toLowerCase()
    return suggestions.filter(
      (node) =>
        node.title.toLowerCase().includes(query) ||
        node.id.toLowerCase().includes(query)
    )
  }, [suggestions, inputValue])

  // Check if adding a dependency would create a cycle
  const checkForCycle = useCallback(
    (depId: string): boolean => {
      // Create a temporary graph to test
      const testGraph = dependencyGraph.clone()
      // Ensure both nodes exist in the test graph
      testGraph.addNode(nodeId)
      testGraph.addNode(depId)
      return wouldCreateCycle(testGraph, nodeId, depId)
    },
    [dependencyGraph, nodeId]
  )

  const addDependency = useCallback(
    (depId: string) => {
      // Check for self-dependency
      if (depId === nodeId) {
        setCycleWarning('Cannot depend on self')
        setTimeout(() => setCycleWarning(null), 3000)
        return
      }

      // Check for duplicates
      if (value.includes(depId)) {
        return
      }

      // Check for cycles
      if (checkForCycle(depId)) {
        const depNode = availableNodes.get(depId)
        setCycleWarning(
          `Adding "${depNode?.title || depId}" would create a circular dependency`
        )
        setTimeout(() => setCycleWarning(null), 3000)
        return
      }

      onChange([...value, depId])
      setInputValue('')
      setShowSuggestions(false)
      setHighlightedIndex(-1)
      setCycleWarning(null)
    },
    [nodeId, value, onChange, checkForCycle, availableNodes]
  )

  const removeDependency = useCallback(
    (depId: string) => {
      onChange(value.filter((id) => id !== depId))
    },
    [value, onChange]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
            addDependency(filteredSuggestions[highlightedIndex].id)
          }
          break

        case 'Backspace':
          if (!inputValue && value.length > 0) {
            removeDependency(value[value.length - 1])
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (showSuggestions && filteredSuggestions.length > 0) {
            setHighlightedIndex((prev) =>
              prev < filteredSuggestions.length - 1 ? prev + 1 : 0
            )
          } else if (filteredSuggestions.length > 0) {
            setShowSuggestions(true)
            setHighlightedIndex(0)
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (showSuggestions && filteredSuggestions.length > 0) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredSuggestions.length - 1
            )
          }
          break

        case 'Escape':
          setShowSuggestions(false)
          setHighlightedIndex(-1)
          break
      }
    },
    [
      inputValue,
      value,
      addDependency,
      removeDependency,
      showSuggestions,
      filteredSuggestions,
      highlightedIndex,
    ]
  )

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setShowSuggestions(true)
    setHighlightedIndex(-1)
    setCycleWarning(null)
  }

  const handleInputFocus = () => {
    if (filteredSuggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      setShowSuggestions(false)
      setHighlightedIndex(-1)
    }, 150)
  }

  const handleSuggestionClick = (depId: string) => {
    addDependency(depId)
    inputRef.current?.focus()
  }

  const handleChipClick = (depId: string) => {
    if (onNavigate) {
      onNavigate(depId)
    }
  }

  // Get info for blocked nodes (nodes that this node blocks)
  const blockedNodes = useMemo(() => {
    return blockedByThis
      .map((id) => getNodeInfo(id, availableNodes))
      .filter((info): info is DependencyNodeInfo => info !== null)
  }, [blockedByThis, availableNodes])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dependencies (Depends On) Section */}
      <div className="space-y-1.5">
        <label
          htmlFor="dependency-input"
          className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-sm font-medium"
        >
          Depends On
        </label>

        {/* Cycle warning */}
        {cycleWarning && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            <AlertTriangle
              className="h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{cycleWarning}</span>
          </div>
        )}

        <div className="relative">
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              'border-forge-border rounded-md border bg-white px-2 py-1.5',
              'min-h-[42px]',
              'focus-within:ring-forge-accent focus-within:ring-2 focus-within:ring-offset-2',
              disabled && 'cursor-not-allowed opacity-50',
              'dark:border-forge-border-dark dark:bg-forge-surface-dark',
              'dark:focus-within:ring-forge-accent-dark'
            )}
          >
            {/* Dependency chips */}
            {value.map((depId) => {
              const nodeInfo = getNodeInfo(depId, availableNodes)
              return (
                <span
                  key={depId}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md',
                    'bg-forge-accent-subtle text-forge-accent-hover px-2 py-0.5 text-sm',
                    'dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark',
                    onNavigate &&
                      'hover:bg-forge-accent-subtle dark:hover:bg-forge-accent-subtle-dark cursor-pointer'
                  )}
                >
                  {nodeInfo && (
                    <NodeTypeIcon
                      type={nodeInfo.type}
                      size="sm"
                      className="h-3.5 w-3.5"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleChipClick(depId)}
                    disabled={disabled || !onNavigate}
                    className="hover:underline focus-visible:underline focus-visible:outline-none"
                    aria-label={`Navigate to ${nodeInfo?.title || depId}`}
                  >
                    {nodeInfo?.title || depId}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeDependency(depId)
                    }}
                    disabled={disabled}
                    className={cn(
                      'hover:bg-forge-accent-subtle rounded-sm p-0.5',
                      'focus-visible:ring-forge-accent focus-visible:ring-1 focus-visible:outline-none',
                      'dark:hover:bg-forge-accent-subtle-dark'
                    )}
                    aria-label={`Remove dependency on ${nodeInfo?.title || depId}`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              )
            })}

            {/* Input field */}
            <input
              ref={inputRef}
              id="dependency-input"
              type="text"
              role="combobox"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              disabled={disabled}
              placeholder={value.length === 0 ? 'Add dependency...' : ''}
              className={cn(
                'min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0.5',
                'text-forge-text placeholder:text-forge-muted text-sm',
                'focus:ring-0 focus:outline-none',
                'dark:text-forge-text-dark dark:placeholder:text-forge-muted-dark'
              )}
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls="dependency-suggestions"
              aria-expanded={showSuggestions}
              aria-activedescendant={
                highlightedIndex >= 0
                  ? `dep-suggestion-${filteredSuggestions[highlightedIndex]?.id}`
                  : undefined
              }
            />
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul
              id="dependency-suggestions"
              role="listbox"
              className={cn(
                'absolute z-10 mt-1 max-h-60 w-full overflow-auto',
                'border-forge-border rounded-md border bg-white shadow-lg',
                'dark:border-forge-border-dark dark:bg-forge-surface-dark'
              )}
            >
              {filteredSuggestions.map((node, index) => (
                <li
                  key={node.id}
                  id={`dep-suggestion-${node.id}`}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2',
                    'text-forge-text-secondary dark:text-forge-text-dark text-sm',
                    index === highlightedIndex &&
                      'bg-forge-surface dark:bg-forge-surface-dark'
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSuggestionClick(node.id)
                  }}
                >
                  <NodeTypeIcon type={node.type} size="sm" />
                  <span className="flex-1 truncate">{node.title}</span>
                </li>
              ))}
            </ul>
          )}

          {/* No suggestions message */}
          {showSuggestions &&
            inputValue &&
            filteredSuggestions.length === 0 && (
              <div
                className={cn(
                  'absolute z-10 mt-1 w-full px-3 py-2',
                  'border-forge-border text-forge-muted rounded-md border bg-white text-sm',
                  'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-muted-dark'
                )}
              >
                No matching nodes found
              </div>
            )}
        </div>

        {/* Empty state hint */}
        {value.length === 0 && !showSuggestions && (
          <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
            Add tasks or decisions that must complete before this one
          </p>
        )}
      </div>

      {/* Blocks Section (nodes blocked by this one) */}
      {blockedNodes.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-sm font-medium">
            Blocks
          </span>
          <div className="flex flex-wrap gap-1.5">
            {blockedNodes.map((node) => (
              <span
                key={node.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md',
                  'bg-orange-50 px-2 py-1 text-sm text-orange-700',
                  'dark:bg-orange-950 dark:text-orange-200',
                  onNavigate &&
                    'cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900'
                )}
              >
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                <NodeTypeIcon
                  type={node.type}
                  size="sm"
                  className="h-3.5 w-3.5"
                />
                {onNavigate ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(node.id)}
                    className="hover:underline focus-visible:underline focus-visible:outline-none"
                    aria-label={`Navigate to ${node.title}`}
                  >
                    {node.title}
                  </button>
                ) : (
                  <span>{node.title}</span>
                )}
              </span>
            ))}
          </div>
          <p className="text-forge-muted dark:text-forge-muted-dark text-xs">
            These nodes are waiting on this one to complete
          </p>
        </div>
      )}

      {/* Show empty blocks state if no blocked nodes */}
      {blockedNodes.length === 0 && value.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-sm font-medium">
            Blocks
          </span>
          <div className="text-forge-muted dark:text-forge-muted-dark flex items-center gap-2 text-sm">
            <Link2 className="h-4 w-4" aria-hidden="true" />
            <span>No nodes depend on this one yet</span>
          </div>
        </div>
      )}
    </div>
  )
}
