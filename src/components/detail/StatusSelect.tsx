/**
 * StatusSelect - Dropdown for selecting node status
 *
 * Uses Base UI Select for keyboard accessibility.
 * Status options vary based on node type.
 */

import { Select as BaseSelect } from '@base-ui/react/select'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NodeType } from '@/types'
import type { DecisionStatus, ComponentStatus, TaskStatus } from '@/types'
import { STATUS_CONFIG } from '@/components/nodes/config'

const Z_DROPDOWN = 10

export type NodeStatus = DecisionStatus | ComponentStatus | TaskStatus

export interface StatusOption {
  value: string
  label: string
  dotColor: string
}

// Status options by node type
const DECISION_STATUSES: StatusOption[] = [
  {
    value: 'pending',
    label: 'Pending',
    dotColor: STATUS_CONFIG.pending.dotColor,
  },
  {
    value: 'selected',
    label: 'Selected',
    dotColor: STATUS_CONFIG.selected.dotColor,
  },
]

const COMPONENT_STATUSES: StatusOption[] = [
  {
    value: 'considering',
    label: 'Considering',
    dotColor: STATUS_CONFIG.considering.dotColor,
  },
  {
    value: 'selected',
    label: 'Selected',
    dotColor: STATUS_CONFIG.selected.dotColor,
  },
  {
    value: 'rejected',
    label: 'Rejected',
    dotColor: STATUS_CONFIG.rejected.dotColor,
  },
]

const TASK_STATUSES: StatusOption[] = [
  {
    value: 'pending',
    label: 'Pending',
    dotColor: STATUS_CONFIG.pending.dotColor,
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    dotColor: STATUS_CONFIG.in_progress.dotColor,
  },
  {
    value: 'blocked',
    label: 'Blocked',
    dotColor: STATUS_CONFIG.blocked.dotColor,
  },
  {
    value: 'complete',
    label: 'Complete',
    dotColor: STATUS_CONFIG.complete.dotColor,
  },
]

function getStatusOptions(nodeType: NodeType): StatusOption[] {
  switch (nodeType) {
    case NodeType.Decision:
      return DECISION_STATUSES
    case NodeType.Component:
      return COMPONENT_STATUSES
    case NodeType.Task:
      return TASK_STATUSES
    default:
      return []
  }
}

export interface StatusSelectProps {
  /** Current status value */
  value: string
  /** Called when status changes */
  onChange: (value: string) => void
  /** Node type to determine available statuses */
  nodeType: NodeType
  /** Optional label (shown above select) */
  label?: string
  /** Optional class name */
  className?: string
  /** ID for accessibility */
  id?: string
  /** Whether the select is disabled */
  disabled?: boolean
}

/**
 * Keyboard-accessible status select dropdown
 */
export function StatusSelect({
  value,
  onChange,
  nodeType,
  label = 'Status',
  className,
  id = 'status-select',
  disabled = false,
}: StatusSelectProps) {
  const options = getStatusOptions(nodeType)

  // Note nodes don't have status
  if (nodeType === NodeType.Note || options.length === 0) {
    return null
  }

  const currentOption = options.find((opt) => opt.value === value) || options[0]

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>

      <BaseSelect.Root
        value={value}
        onValueChange={(newValue) => {
          if (newValue !== null) {
            onChange(newValue)
          }
        }}
        disabled={disabled}
      >
        <BaseSelect.Trigger
          id={id}
          className={cn(
            'inline-flex w-full items-center justify-between gap-2',
            'rounded-md border border-gray-300 bg-white px-3 py-2',
            'text-sm text-gray-900',
            'hover:bg-gray-50',
            'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
            'dark:hover:bg-gray-700',
            'dark:focus-visible:ring-gray-300'
          )}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn('h-2 w-2 rounded-full', currentOption.dotColor)}
              aria-hidden="true"
            />
            <BaseSelect.Value placeholder="Select status" />
          </span>
          <BaseSelect.Icon>
            <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>

        <BaseSelect.Portal>
          <BaseSelect.Positioner sideOffset={4} style={{ zIndex: Z_DROPDOWN }}>
            <BaseSelect.Popup
              className={cn(
                'min-w-[var(--anchor-width)] overflow-hidden rounded-md',
                'border border-gray-200 bg-white shadow-lg',
                'dark:border-gray-700 dark:bg-gray-800',
                'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
                'transition-opacity duration-150'
              )}
            >
              {options.map((option) => (
                <BaseSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2',
                    'text-sm text-gray-900 dark:text-gray-100',
                    'outline-none',
                    'data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-700'
                  )}
                >
                  <span
                    className={cn('h-2 w-2 rounded-full', option.dotColor)}
                    aria-hidden="true"
                  />
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="ml-auto">
                    <Check
                      className="h-4 w-4 text-gray-600 dark:text-gray-400"
                      aria-hidden="true"
                    />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </div>
  )
}
