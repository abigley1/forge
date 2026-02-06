/**
 * ParentSelector - Dropdown for selecting parent container for nodes
 *
 * Features:
 * - Shows available containers (Subsystem, Assembly, Module) grouped by type
 * - Search/filter functionality
 * - Clear button to remove parent
 * - Shows current parent with type badge and navigation
 */

import {
  useState,
  useCallback,
  useRef,
  useId,
  useMemo,
  type KeyboardEvent,
} from 'react'
import {
  ChevronDown,
  X,
  ExternalLink,
  Layers,
  Box,
  Grid3X3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Z_POPOVER } from '@/lib/z-index'
import { useNodesStore } from '@/store/useNodesStore'
import { NodeType, isContainerNode, type ForgeNode } from '@/types'

export interface ParentSelectorProps {
  /** Current parent ID (null if none) */
  value: string | null
  /** Called when parent selection changes */
  onChange: (parentId: string | null) => void
  /** Current node ID (to exclude from selection) */
  nodeId: string
  /** Called when clicking navigate to parent */
  onNavigate?: (nodeId: string) => void
  /** Optional label */
  label?: string
  /** Optional class name */
  className?: string
  /** Whether the selector is disabled */
  disabled?: boolean
}

/** Get icon for container type */
function getContainerIcon(type: NodeType) {
  switch (type) {
    case NodeType.Subsystem:
      return <Layers className="h-4 w-4" aria-hidden="true" />
    case NodeType.Assembly:
      return <Box className="h-4 w-4" aria-hidden="true" />
    case NodeType.Module:
      return <Grid3X3 className="h-4 w-4" aria-hidden="true" />
    default:
      return <Layers className="h-4 w-4" aria-hidden="true" />
  }
}

/** Get label for container type */
function getContainerTypeLabel(type: NodeType): string {
  switch (type) {
    case NodeType.Subsystem:
      return 'Subsystem'
    case NodeType.Assembly:
      return 'Assembly'
    case NodeType.Module:
      return 'Module'
    default:
      return 'Container'
  }
}

interface ContainerGroup {
  type: NodeType
  label: string
  containers: ForgeNode[]
}

/**
 * Dropdown for selecting parent container
 */
export function ParentSelector({
  value,
  onChange,
  nodeId,
  onNavigate,
  label = 'Parent',
  className,
  disabled = false,
}: ParentSelectorProps) {
  const generatedId = useId()
  const inputId = `parent-selector-${generatedId}`
  const listboxId = `${inputId}-listbox`

  const [searchValue, setSearchValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const getAllNodes = useNodesStore((s) => s.getAllNodes)
  const nodes = useNodesStore((s) => s.nodes)

  // Get the current parent node
  const parentNode = useMemo(() => {
    if (!value) return null
    return nodes.get(value) || null
  }, [value, nodes])

  // Get all container nodes grouped by type
  const containerGroups = useMemo(() => {
    const allNodes = getAllNodes()
    const containers = allNodes.filter(
      (n) => isContainerNode(n) && n.id !== nodeId
    )

    // Filter by search
    const filtered = searchValue
      ? containers.filter((c) =>
          c.title.toLowerCase().includes(searchValue.toLowerCase())
        )
      : containers

    // Group by type
    const groups: ContainerGroup[] = []
    const typeOrder = [NodeType.Subsystem, NodeType.Assembly, NodeType.Module]

    for (const type of typeOrder) {
      const containersOfType = filtered.filter((c) => c.type === type)
      if (containersOfType.length > 0) {
        let label: string
        switch (type) {
          case NodeType.Subsystem:
            label = 'Subsystems'
            break
          case NodeType.Assembly:
            label = 'Assemblies'
            break
          case NodeType.Module:
            label = 'Modules'
            break
          default:
            label = 'Containers'
        }
        groups.push({
          type,
          label,
          containers: containersOfType,
        })
      }
    }

    return groups
  }, [getAllNodes, nodeId, searchValue])

  // Flatten for keyboard navigation
  const flatOptions = useMemo(() => {
    const options: ForgeNode[] = []
    for (const group of containerGroups) {
      options.push(...group.containers)
    }
    return options
  }, [containerGroups])

  const selectParent = useCallback(
    (parentId: string | null) => {
      onChange(parentId)
      setSearchValue('')
      setIsOpen(false)
      setHighlightedIndex(-1)
    },
    [onChange]
  )

  const clearParent = useCallback(() => {
    onChange(null)
    setSearchValue('')
    inputRef.current?.focus()
  }, [onChange])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < flatOptions.length) {
            selectParent(flatOptions[highlightedIndex].id)
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (!isOpen && flatOptions.length > 0) {
            setIsOpen(true)
          }
          if (isOpen && flatOptions.length > 0) {
            setHighlightedIndex((prev) =>
              prev < flatOptions.length - 1 ? prev + 1 : 0
            )
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (isOpen && flatOptions.length > 0) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : flatOptions.length - 1
            )
          }
          break

        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setHighlightedIndex(-1)
          setSearchValue('')
          break

        case 'Tab':
          setIsOpen(false)
          setHighlightedIndex(-1)
          break
      }
    },
    [isOpen, highlightedIndex, flatOptions, selectParent]
  )

  const handleInputFocus = () => {
    if (!value) {
      setIsOpen(true)
    }
  }

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsOpen(false)
      setHighlightedIndex(-1)
      setSearchValue('')
    }, 150)
  }

  const handleContainerClick = () => {
    if (!disabled) {
      inputRef.current?.focus()
      setIsOpen(true)
    }
  }

  const handleNavigateToParent = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (value && onNavigate) {
      onNavigate(value)
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={inputId}
        className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-sm font-medium"
      >
        {label}
      </label>

      <div ref={containerRef} className="relative">
        {/* Selected parent display or input */}
        {parentNode && !isOpen ? (
          <div
            className={cn(
              'flex items-center justify-between gap-2',
              'border-forge-border rounded-md border bg-white px-3 py-2',
              'min-h-[42px]',
              disabled && 'cursor-not-allowed opacity-50',
              'dark:border-forge-border-dark dark:bg-forge-surface-dark'
            )}
            onClick={handleContainerClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleContainerClick()
              }
            }}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`Parent: ${parentNode.title}, click to change`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {/* Type icon */}
              <span className="text-forge-muted dark:text-forge-muted-dark flex-shrink-0">
                {getContainerIcon(parentNode.type)}
              </span>
              {/* Type badge */}
              <span
                className={cn(
                  'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
                  'bg-purple-100 text-purple-800',
                  'dark:bg-purple-900/30 dark:text-purple-200'
                )}
              >
                {getContainerTypeLabel(parentNode.type)}
              </span>
              {/* Parent title */}
              <span className="text-forge-text dark:text-forge-text-dark truncate text-sm">
                {parentNode.title}
              </span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              {/* Navigate button */}
              {onNavigate && (
                <button
                  type="button"
                  onClick={handleNavigateToParent}
                  className={cn(
                    'text-forge-muted hover:bg-forge-accent-subtle hover:text-forge-accent rounded p-2.5',
                    'dark:hover:bg-forge-accent-subtle-dark dark:hover:text-forge-accent-dark',
                    'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none'
                  )}
                  aria-label="Navigate to parent"
                  disabled={disabled}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {/* Clear button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    clearParent()
                  }}
                  className={cn(
                    'text-forge-muted rounded p-2.5 hover:bg-red-50 hover:text-red-500',
                    'dark:hover:bg-red-900/20 dark:hover:text-red-400',
                    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none'
                  )}
                  aria-label="Clear parent"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-label="Parent"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value)
                setIsOpen(true)
                setHighlightedIndex(-1)
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              placeholder="Select parent container..."
              disabled={disabled}
              className={cn(
                'border-forge-border w-full rounded-md border px-3 py-2 pr-10',
                'text-forge-text text-sm',
                'placeholder:text-forge-muted',
                'focus:ring-forge-accent focus:ring-2 focus:ring-offset-2 focus:outline-none',
                'disabled:bg-forge-surface disabled:cursor-not-allowed disabled:opacity-50',
                'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
                'dark:placeholder:text-forge-muted-dark dark:focus:ring-forge-accent-dark'
              )}
            />
            <ChevronDown
              className={cn(
                'absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2',
                'text-forge-muted pointer-events-none transition-transform duration-150',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Dropdown */}
        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Available containers"
            className={cn(
              'absolute right-0 left-0 mt-1',
              'max-h-60 overflow-auto rounded-md',
              'border-forge-border border bg-white shadow-lg',
              'dark:border-forge-border-dark dark:bg-forge-surface-dark'
            )}
            style={{ zIndex: Z_POPOVER }}
          >
            {containerGroups.length === 0 ? (
              <li className="text-forge-muted dark:text-forge-muted-dark px-3 py-2 text-sm">
                {searchValue
                  ? 'No matching containers'
                  : 'No containers available'}
              </li>
            ) : (
              containerGroups.map((group) => (
                <li key={group.type}>
                  {/* Group header */}
                  <div className="bg-forge-surface text-forge-muted dark:bg-forge-surface-dark/50 dark:text-forge-muted-dark px-3 py-1.5 text-xs font-semibold">
                    {group.label}
                  </div>
                  {/* Group items */}
                  <ul>
                    {group.containers.map((container) => {
                      const optionIndex = flatOptions.findIndex(
                        (o) => o.id === container.id
                      )
                      const isHighlighted = optionIndex === highlightedIndex
                      const isSelected = container.id === value

                      return (
                        <li
                          key={container.id}
                          role="option"
                          aria-selected={isSelected}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 px-3 py-2',
                            'text-forge-text dark:text-forge-text-dark text-sm',
                            isHighlighted &&
                              'bg-forge-surface dark:bg-forge-surface-dark',
                            isSelected &&
                              'bg-forge-accent-subtle dark:bg-forge-accent-subtle-dark'
                          )}
                          onClick={() => selectParent(container.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              selectParent(container.id)
                            }
                          }}
                          onMouseEnter={() => setHighlightedIndex(optionIndex)}
                        >
                          <span className="text-forge-muted dark:text-forge-muted-dark">
                            {getContainerIcon(container.type)}
                          </span>
                          <span className="truncate">{container.title}</span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
