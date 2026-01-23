import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from 'react'
import { Plus, Trash2, Link2, X } from 'lucide-react'
import type {
  DecisionNode,
  DecisionOption,
  DecisionCriterion,
  ComponentNode,
  ForgeNode,
} from '@/types/nodes'
import {
  createDecisionOption,
  createDecisionCriterion,
  createLinkedDecisionOption,
  isComponentNode,
} from '@/types/nodes'
import { cn } from '@/lib/utils'
import { AlertDialog } from '@/components/ui'

// Common units for criteria
const COMMON_UNITS = [
  '',
  '$',
  '%',
  'mm',
  'cm',
  'in',
  'kg',
  'lb',
  'V',
  'A',
  'W',
  'Nm',
  'rpm',
]

export interface ComparisonTableProps {
  node: DecisionNode
  onChange: (updates: Partial<DecisionNode>) => void
  disabled?: boolean
  className?: string
  /** All available nodes (for linking components) */
  availableNodes?: Map<string, ForgeNode>
  /** Called when clicking a linked component to navigate */
  onNavigate?: (nodeId: string) => void
}

interface EditingCell {
  optionId: string
  criterionId: string
}

interface ResolvedValue {
  value: string | number | undefined
  source: 'component' | 'override' | 'empty'
  componentValue?: string | number
}

/**
 * Get the resolved value for a criterion on a linked option
 */
function getResolvedValue(
  option: DecisionOption,
  criterion: DecisionCriterion,
  linkedComponent: ComponentNode | undefined
): ResolvedValue {
  const criterionName = criterion.name.toLowerCase()
  const override = option.values[criterion.id]

  // Find matching component field
  let componentValue: string | number | undefined

  if (linkedComponent) {
    if (criterionName === 'cost' && linkedComponent.cost !== null) {
      componentValue = linkedComponent.cost
    } else if (criterionName === 'supplier' && linkedComponent.supplier) {
      componentValue = linkedComponent.supplier
    } else if (
      (criterionName === 'part number' || criterionName === 'partnumber') &&
      linkedComponent.partNumber
    ) {
      componentValue = linkedComponent.partNumber
    } else if (linkedComponent.customFields) {
      // Check customFields with case-insensitive matching
      const matchingKey = Object.keys(linkedComponent.customFields).find(
        (key) => key.toLowerCase() === criterionName
      )
      if (matchingKey) {
        componentValue = linkedComponent.customFields[matchingKey]
      }
    }
  }

  // Determine source and value
  if (override !== undefined) {
    return {
      value: override,
      source: 'override',
      componentValue,
    }
  } else if (componentValue !== undefined) {
    return {
      value: componentValue,
      source: 'component',
      componentValue,
    }
  } else {
    return {
      value: undefined,
      source: 'empty',
    }
  }
}

export function ComparisonTable({
  node,
  onChange,
  disabled = false,
  className,
  availableNodes,
  onNavigate,
}: ComparisonTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newOptionName, setNewOptionName] = useState('')
  const [newCriterionName, setNewCriterionName] = useState('')
  const [newCriterionUnit, setNewCriterionUnit] = useState('')
  const [newCriterionWeight, setNewCriterionWeight] = useState(5)
  const [isAddingOption, setIsAddingOption] = useState(false)
  const [isAddingCriterion, setIsAddingCriterion] = useState(false)
  const [deleteOptionId, setDeleteOptionId] = useState<string | null>(null)
  const [deleteCriterionId, setDeleteCriterionId] = useState<string | null>(
    null
  )
  const [showComponentSelector, setShowComponentSelector] = useState(false)
  const [componentSearchValue, setComponentSearchValue] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const newOptionInputRef = useRef<HTMLInputElement>(null)
  const newCriterionInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const componentSearchRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)

  const { options, criteria } = node

  // Get available components for linking (excluding already linked ones)
  const availableComponents = useMemo(() => {
    if (!availableNodes) return []
    const linkedIds = new Set(
      options.filter((o) => o.linkedNodeId).map((o) => o.linkedNodeId)
    )
    return Array.from(availableNodes.values())
      .filter(isComponentNode)
      .filter((c) => !linkedIds.has(c.id))
      .filter((c) =>
        c.title.toLowerCase().includes(componentSearchValue.toLowerCase())
      )
  }, [availableNodes, options, componentSearchValue])

  // Focus management for adding options
  useEffect(() => {
    if (isAddingOption && !showComponentSelector && newOptionInputRef.current) {
      newOptionInputRef.current.focus()
    }
  }, [isAddingOption, showComponentSelector])

  // Focus management for component search
  useEffect(() => {
    if (showComponentSelector && componentSearchRef.current) {
      componentSearchRef.current.focus()
    }
  }, [showComponentSelector])

  // Focus management for adding criteria
  useEffect(() => {
    if (isAddingCriterion && newCriterionInputRef.current) {
      newCriterionInputRef.current.focus()
    }
  }, [isAddingCriterion])

  // Focus management for cell editing
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  // Reset highlighted index when search changes - intentional setState in effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(-1)
  }, [componentSearchValue])

  // --- Option handlers ---
  const handleAddOption = useCallback(() => {
    if (!newOptionName.trim()) {
      setIsAddingOption(false)
      setNewOptionName('')
      return
    }

    const newOption = createDecisionOption(newOptionName.trim())
    onChange({
      options: [...options, newOption],
    })
    setNewOptionName('')
    setIsAddingOption(false)
  }, [newOptionName, options, onChange])

  const handleAddLinkedOption = useCallback(
    (component: ComponentNode) => {
      const newOption = createLinkedDecisionOption(component)
      onChange({
        options: [...options, newOption],
      })
      setShowComponentSelector(false)
      setComponentSearchValue('')
      setIsAddingOption(false)
    },
    [options, onChange]
  )

  const handleUnlinkOption = useCallback(
    (optionId: string) => {
      const option = options.find((o) => o.id === optionId)
      if (!option?.linkedNodeId) return

      const linkedComponent = availableNodes?.get(option.linkedNodeId)

      // Snapshot current resolved values into the option
      const snapshotValues = { ...option.values }
      if (linkedComponent && isComponentNode(linkedComponent)) {
        for (const criterion of criteria) {
          if (snapshotValues[criterion.id] === undefined) {
            const resolved = getResolvedValue(
              option,
              criterion,
              linkedComponent
            )
            if (resolved.value !== undefined) {
              snapshotValues[criterion.id] = resolved.value
            }
          }
        }
      }

      const newOptions = options.map((o) =>
        o.id === optionId
          ? { ...o, linkedNodeId: undefined, values: snapshotValues }
          : o
      )
      onChange({ options: newOptions })
    },
    [options, criteria, availableNodes, onChange]
  )

  const handleDeleteOption = useCallback(
    (optionId: string) => {
      const newOptions = options.filter((o) => o.id !== optionId)
      // Also clear selected if we're deleting the selected option
      const updates: Partial<DecisionNode> = { options: newOptions }
      if (node.selected === optionId) {
        updates.selected = null
      }
      onChange(updates)
      setDeleteOptionId(null)
    },
    [options, node.selected, onChange]
  )

  // --- Criterion handlers ---
  const handleAddCriterion = useCallback(() => {
    if (!newCriterionName.trim()) {
      setIsAddingCriterion(false)
      setNewCriterionName('')
      setNewCriterionUnit('')
      setNewCriterionWeight(5)
      return
    }

    const newCriterion = createDecisionCriterion(
      newCriterionName.trim(),
      newCriterionWeight,
      newCriterionUnit || undefined
    )
    onChange({
      criteria: [...criteria, newCriterion],
    })
    setNewCriterionName('')
    setNewCriterionUnit('')
    setNewCriterionWeight(5)
    setIsAddingCriterion(false)
  }, [
    newCriterionName,
    newCriterionUnit,
    newCriterionWeight,
    criteria,
    onChange,
  ])

  const handleDeleteCriterion = useCallback(
    (criterionId: string) => {
      const newCriteria = criteria.filter((c) => c.id !== criterionId)
      // Also remove this criterion's values from all options
      const newOptions = options.map((opt) => {
        const newValues = { ...opt.values }
        delete newValues[criterionId]
        return { ...opt, values: newValues }
      })
      onChange({
        criteria: newCriteria,
        options: newOptions,
      })
      setDeleteCriterionId(null)
    },
    [criteria, options, onChange]
  )

  const handleWeightChange = useCallback(
    (criterionId: string, weight: number) => {
      const newCriteria = criteria.map((c) =>
        c.id === criterionId ? { ...c, weight } : c
      )
      onChange({ criteria: newCriteria })
    },
    [criteria, onChange]
  )

  // --- Cell editing handlers ---
  const startEditing = useCallback(
    (optionId: string, criterionId: string) => {
      if (disabled) return
      const option = options.find((o) => o.id === optionId)
      if (!option) return

      // Get the displayed value (may be from linked component)
      const linkedComponent = option.linkedNodeId
        ? availableNodes?.get(option.linkedNodeId)
        : undefined
      const criterion = criteria.find((c) => c.id === criterionId)
      if (!criterion) return

      const resolved =
        linkedComponent && isComponentNode(linkedComponent)
          ? getResolvedValue(option, criterion, linkedComponent)
          : { value: option.values[criterionId], source: 'empty' as const }

      setEditingCell({ optionId, criterionId })
      setEditValue(resolved.value !== undefined ? String(resolved.value) : '')
    },
    [disabled, options, criteria, availableNodes]
  )

  const commitEdit = useCallback(() => {
    if (!editingCell) return

    const { optionId, criterionId } = editingCell
    const newOptions = options.map((opt) => {
      if (opt.id !== optionId) return opt

      const newValues = { ...opt.values }
      // Try to parse as number, otherwise keep as string
      const numValue = parseFloat(editValue)
      if (!isNaN(numValue) && editValue.trim() !== '') {
        newValues[criterionId] = numValue
      } else if (editValue.trim() === '') {
        delete newValues[criterionId]
      } else {
        newValues[criterionId] = editValue.trim()
      }
      return { ...opt, values: newValues }
    })

    onChange({ options: newOptions })
    setEditingCell(null)
    setEditValue('')
  }, [editingCell, editValue, options, onChange])

  const cancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue('')
  }, [])

  const handleCellKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
      } else if (e.key === 'Tab') {
        // Allow natural tab behavior but commit first
        commitEdit()
      }
    },
    [commitEdit, cancelEdit]
  )

  const handleCellBlur = useCallback(() => {
    // Small delay to allow Tab navigation to work properly
    setTimeout(() => {
      if (editingCell) {
        commitEdit()
      }
    }, 0)
  }, [editingCell, commitEdit])

  // --- New option input handlers ---
  const handleNewOptionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddOption()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsAddingOption(false)
        setNewOptionName('')
      }
    },
    [handleAddOption]
  )

  // --- Component selector handlers ---
  const handleComponentSelectorKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowComponentSelector(false)
        setComponentSearchValue('')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < availableComponents.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (highlightedIndex >= 0 && availableComponents[highlightedIndex]) {
          handleAddLinkedOption(availableComponents[highlightedIndex])
        }
      }
    },
    [availableComponents, highlightedIndex, handleAddLinkedOption]
  )

  // --- New criterion input handlers ---
  const handleNewCriterionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAddCriterion()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsAddingCriterion(false)
        setNewCriterionName('')
        setNewCriterionUnit('')
        setNewCriterionWeight(5)
      }
    },
    [handleAddCriterion]
  )

  // --- Render helpers ---
  const inputClassName = cn(
    'w-full rounded-md border border-gray-300 px-2 py-1',
    'text-sm text-gray-900',
    'placeholder:text-gray-400',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50',
    'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
    'dark:placeholder:text-gray-500 dark:focus:ring-blue-400'
  )

  const cellClassName = cn(
    'border border-gray-200 px-3 py-2 text-sm',
    'dark:border-gray-700'
  )

  const headerCellClassName = cn(
    cellClassName,
    'bg-gray-50 font-medium text-gray-700',
    'dark:bg-gray-800 dark:text-gray-300'
  )

  const getOptionToDelete = () => options.find((o) => o.id === deleteOptionId)

  const getCriterionToDelete = () =>
    criteria.find((c) => c.id === deleteCriterionId)

  // Empty state
  if (
    options.length === 0 &&
    criteria.length === 0 &&
    !isAddingOption &&
    !isAddingCriterion
  ) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800/50">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            No comparison data yet. Add options and criteria to compare.
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingOption(true)}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-3 py-1.5',
                'bg-blue-600 text-sm font-medium text-white',
                'hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Option
            </button>
            <button
              type="button"
              onClick={() => setIsAddingCriterion(true)}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-3 py-1.5',
                'border border-gray-300 bg-white text-sm font-medium text-gray-700',
                'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              )}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Criterion
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse"
          role="grid"
          aria-label="Decision comparison table"
        >
          <thead>
            <tr>
              {/* Criterion header (row labels column) */}
              <th
                className={cn(headerCellClassName, 'min-w-[150px] text-left')}
              >
                Criteria
              </th>

              {/* Option headers */}
              {options.map((option) => {
                const linkedComponent = option.linkedNodeId
                  ? availableNodes?.get(option.linkedNodeId)
                  : undefined
                const isLinked =
                  !!linkedComponent && isComponentNode(linkedComponent)

                return (
                  <th
                    key={option.id}
                    className={cn(headerCellClassName, 'min-w-[120px]')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {isLinked && (
                          <button
                            type="button"
                            onClick={() => onNavigate?.(option.linkedNodeId!)}
                            className="flex-shrink-0 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            aria-label={`Navigate to linked component ${linkedComponent.title}`}
                            title={`Linked to: ${linkedComponent.title}`}
                          >
                            <Link2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                        <span className="truncate" title={option.name}>
                          {option.name}
                        </span>
                      </div>
                      {!disabled && (
                        <div className="flex items-center">
                          {isLinked && (
                            <button
                              type="button"
                              onClick={() => handleUnlinkOption(option.id)}
                              className={cn(
                                'flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-gray-400',
                                'hover:bg-gray-200 hover:text-amber-600',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
                                'dark:hover:bg-gray-700'
                              )}
                              aria-label={`Unlink ${option.name} from component`}
                              title="Unlink from component"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteOptionId(option.id)}
                            className={cn(
                              'flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-gray-400',
                              'hover:bg-gray-200 hover:text-red-600',
                              'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                              'dark:hover:bg-gray-700'
                            )}
                            aria-label={`Delete option ${option.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  </th>
                )
              })}

              {/* Add Option column */}
              <th className={cn(headerCellClassName, 'w-[180px]')}>
                {isAddingOption ? (
                  showComponentSelector ? (
                    <div className="relative">
                      <input
                        ref={componentSearchRef}
                        type="text"
                        role="combobox"
                        value={componentSearchValue}
                        onChange={(e) =>
                          setComponentSearchValue(e.target.value)
                        }
                        onKeyDown={handleComponentSelectorKeyDown}
                        onBlur={() => {
                          // Delay to allow click on suggestion
                          setTimeout(() => {
                            setShowComponentSelector(false)
                            setComponentSearchValue('')
                          }, 200)
                        }}
                        placeholder="Search components..."
                        className={cn(inputClassName, 'pr-8')}
                        aria-label="Search components to link"
                        aria-expanded="true"
                        aria-haspopup="listbox"
                        aria-controls="component-suggestions"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowComponentSelector(false)
                          setComponentSearchValue('')
                        }}
                        className="absolute top-1/2 right-1 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        aria-label="Cancel component selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {availableComponents.length > 0 && (
                        <ul
                          ref={suggestionsRef}
                          id="component-suggestions"
                          role="listbox"
                          className={cn(
                            'absolute top-full right-0 left-0 z-10 mt-1',
                            'max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg',
                            'dark:border-gray-700 dark:bg-gray-800'
                          )}
                        >
                          {availableComponents.map((component, index) => (
                            <li
                              key={component.id}
                              role="option"
                              aria-selected={highlightedIndex === index}
                              className={cn(
                                'cursor-pointer px-3 py-2 text-left text-sm',
                                highlightedIndex === index
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              )}
                              onClick={() => handleAddLinkedOption(component)}
                              // Keyboard navigation handled by input's onKeyDown
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddLinkedOption(component)
                                }
                              }}
                            >
                              <div className="truncate font-medium">
                                {component.title}
                              </div>
                              {component.supplier && (
                                <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {component.supplier}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {availableComponents.length === 0 &&
                        componentSearchValue && (
                          <div
                            className={cn(
                              'absolute top-full right-0 left-0 z-10 mt-1',
                              'rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg',
                              'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            )}
                          >
                            No matching components
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        ref={newOptionInputRef}
                        type="text"
                        value={newOptionName}
                        onChange={(e) => setNewOptionName(e.target.value)}
                        onKeyDown={handleNewOptionKeyDown}
                        onBlur={handleAddOption}
                        placeholder="Option name..."
                        className={cn(inputClassName, 'flex-1 text-center')}
                        aria-label="New option name"
                        autoComplete="off"
                      />
                      {availableNodes && availableNodes.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowComponentSelector(true)}
                          className={cn(
                            'flex-shrink-0 rounded p-1.5',
                            'text-gray-400 hover:bg-blue-50 hover:text-blue-600',
                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                            'dark:hover:bg-blue-900/50 dark:hover:text-blue-400'
                          )}
                          aria-label="Link to existing component"
                          title="Link to component"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingOption(true)}
                    disabled={disabled}
                    className={cn(
                      'inline-flex w-full items-center justify-center gap-1 rounded px-2 py-1',
                      'text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      'dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                    )}
                    aria-label="Add option"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Option
                  </button>
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Criterion rows */}
            {criteria.map((criterion) => (
              <tr key={criterion.id}>
                {/* Criterion name cell */}
                <td
                  className={cn(cellClassName, 'bg-gray-50 dark:bg-gray-800')}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span
                          className="truncate font-medium"
                          title={criterion.name}
                        >
                          {criterion.name}
                        </span>
                        {criterion.unit && (
                          <span className="text-xs text-gray-400">
                            ({criterion.unit})
                          </span>
                        )}
                      </div>
                      {/* Weight slider */}
                      <div className="mt-1 flex items-center gap-2">
                        <label
                          htmlFor={`weight-${criterion.id}`}
                          className="sr-only"
                        >
                          Weight for {criterion.name}
                        </label>
                        <input
                          id={`weight-${criterion.id}`}
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={criterion.weight}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value)) {
                              handleWeightChange(criterion.id, value)
                            }
                          }}
                          disabled={disabled}
                          className="h-1.5 w-16 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Weight for ${criterion.name}: ${criterion.weight}`}
                        />
                        <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                          {criterion.weight}
                        </span>
                      </div>
                    </div>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => setDeleteCriterionId(criterion.id)}
                        className={cn(
                          'flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-gray-400',
                          'hover:bg-gray-200 hover:text-red-600',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                          'dark:hover:bg-gray-700'
                        )}
                        aria-label={`Delete criterion ${criterion.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>

                {/* Value cells for each option */}
                {options.map((option) => {
                  const linkedComponent = option.linkedNodeId
                    ? availableNodes?.get(option.linkedNodeId)
                    : undefined
                  const isLinked =
                    linkedComponent && isComponentNode(linkedComponent)

                  const isEditing =
                    editingCell?.optionId === option.id &&
                    editingCell?.criterionId === criterion.id

                  // Get resolved value (from component or override)
                  const resolved = isLinked
                    ? getResolvedValue(option, criterion, linkedComponent)
                    : {
                        value: option.values[criterion.id],
                        source: 'empty' as const,
                      }

                  const hasOverride = isLinked && resolved.source === 'override'

                  return (
                    <td
                      key={`${option.id}-${criterion.id}`}
                      className={cn(
                        cellClassName,
                        'relative text-center',
                        !disabled &&
                          'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
                        hasOverride && 'bg-amber-50/50 dark:bg-amber-950/20'
                      )}
                      onClick={() => startEditing(option.id, criterion.id)}
                      role="gridcell"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          startEditing(option.id, criterion.id)
                        }
                      }}
                    >
                      {isEditing ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleCellKeyDown}
                          onBlur={handleCellBlur}
                          className={cn(inputClassName, 'text-center')}
                          aria-label={`Value for ${option.name} - ${criterion.name}`}
                          autoComplete="off"
                        />
                      ) : (
                        <>
                          <span
                            className={cn(
                              'block min-h-[1.5rem]',
                              resolved.value === undefined &&
                                'text-gray-300 dark:text-gray-600',
                              isLinked &&
                                resolved.source === 'component' &&
                                'text-blue-600 dark:text-blue-400'
                            )}
                          >
                            {resolved.value !== undefined
                              ? String(resolved.value)
                              : '—'}
                          </span>
                          {hasOverride && (
                            <span
                              className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400"
                              title="Value overridden from component"
                              aria-label="Overridden value"
                            />
                          )}
                        </>
                      )}
                    </td>
                  )
                })}

                {/* Empty cell in Add Option column */}
                <td
                  className={cn(cellClassName, 'bg-gray-50 dark:bg-gray-800')}
                />
              </tr>
            ))}

            {/* Add Criterion row */}
            <tr>
              <td
                colSpan={options.length + 2}
                className={cn(cellClassName, 'bg-gray-50 dark:bg-gray-800')}
              >
                {isAddingCriterion ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1">
                      <input
                        ref={newCriterionInputRef}
                        type="text"
                        value={newCriterionName}
                        onChange={(e) => setNewCriterionName(e.target.value)}
                        onKeyDown={handleNewCriterionKeyDown}
                        placeholder="Criterion name..."
                        className={inputClassName}
                        aria-label="New criterion name"
                        autoComplete="off"
                      />
                    </div>
                    <div className="w-20">
                      <label htmlFor="new-criterion-unit" className="sr-only">
                        Unit
                      </label>
                      <select
                        id="new-criterion-unit"
                        value={newCriterionUnit}
                        onChange={(e) => setNewCriterionUnit(e.target.value)}
                        className={cn(inputClassName, 'py-1.5')}
                        aria-label="Unit"
                      >
                        {COMMON_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit || 'No unit'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="new-criterion-weight"
                        className="text-xs text-gray-500"
                      >
                        Weight:
                      </label>
                      <input
                        id="new-criterion-weight"
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={newCriterionWeight}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          if (!isNaN(value)) {
                            setNewCriterionWeight(value)
                          }
                        }}
                        className="h-1.5 w-16 cursor-pointer accent-blue-600"
                        aria-label={`Weight: ${newCriterionWeight}`}
                      />
                      <span className="w-4 text-xs text-gray-500 tabular-nums">
                        {newCriterionWeight}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCriterion}
                      className={cn(
                        'rounded-md bg-blue-600 px-2 py-1 text-sm font-medium text-white',
                        'hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none'
                      )}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCriterion(false)
                        setNewCriterionName('')
                        setNewCriterionUnit('')
                        setNewCriterionWeight(5)
                      }}
                      className={cn(
                        'rounded-md px-2 py-1 text-sm text-gray-500',
                        'hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-1',
                        'dark:text-gray-400 dark:hover:bg-gray-700'
                      )}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCriterion(true)}
                    disabled={disabled}
                    className={cn(
                      'inline-flex w-full items-center justify-center gap-1 rounded px-2 py-1',
                      'text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      'dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                    )}
                    aria-label="Add criterion"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Criterion
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Delete Option Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteOptionId !== null}
        onOpenChange={(open) => !open && setDeleteOptionId(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Delete Option</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete the option "
              {getOptionToDelete()?.name}"? This will remove all associated
              values and cannot be undone.
            </AlertDialog.Description>
            <AlertDialog.Footer>
              <AlertDialog.Close
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  'border border-gray-300 bg-white text-gray-700',
                  'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                onClick={() =>
                  deleteOptionId && handleDeleteOption(deleteOptionId)
                }
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  'bg-red-600 text-white',
                  'hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2'
                )}
              >
                Delete
              </button>
            </AlertDialog.Footer>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Delete Criterion Confirmation Dialog */}
      <AlertDialog.Root
        open={deleteCriterionId !== null}
        onOpenChange={(open) => !open && setDeleteCriterionId(null)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Popup>
            <AlertDialog.Title>Delete Criterion</AlertDialog.Title>
            <AlertDialog.Description>
              Are you sure you want to delete the criterion "
              {getCriterionToDelete()?.name}"? This will remove all associated
              values from all options and cannot be undone.
            </AlertDialog.Description>
            <AlertDialog.Footer>
              <AlertDialog.Close
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  'border border-gray-300 bg-white text-gray-700',
                  'hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                onClick={() =>
                  deleteCriterionId && handleDeleteCriterion(deleteCriterionId)
                }
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium',
                  'bg-red-600 text-white',
                  'hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2'
                )}
              >
                Delete
              </button>
            </AlertDialog.Footer>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
