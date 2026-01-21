/**
 * Node Component Configuration
 *
 * Shared configuration for node-related components.
 * Separated from components to avoid fast-refresh warnings.
 */

import { Lightbulb, Package, CheckSquare, FileText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { NodeType } from '@/types/nodes'
import type { DecisionStatus, ComponentStatus, TaskStatus } from '@/types/nodes'

// ============================================================================
// Node Type Icon Configuration
// ============================================================================

/**
 * Icon and color configuration for each node type
 */
export const NODE_TYPE_ICON_CONFIG: Record<
  NodeType,
  {
    icon: LucideIcon
    color: string
    label: string
  }
> = {
  [NodeType.Decision]: {
    icon: Lightbulb,
    color: 'text-blue-500',
    label: 'Decision',
  },
  [NodeType.Component]: {
    icon: Package,
    color: 'text-green-500',
    label: 'Component',
  },
  [NodeType.Task]: {
    icon: CheckSquare,
    color: 'text-orange-500',
    label: 'Task',
  },
  [NodeType.Note]: {
    icon: FileText,
    color: 'text-gray-500',
    label: 'Note',
  },
}

/**
 * Get the label for a node type
 */
export function getNodeTypeLabel(type: NodeType): string {
  return NODE_TYPE_ICON_CONFIG[type].label
}

// ============================================================================
// Status Badge Configuration
// ============================================================================

/** All possible status values across node types */
export type NodeStatus = DecisionStatus | ComponentStatus | TaskStatus

/**
 * Status configuration with colors and display labels.
 * Each status has both a background color and text for accessibility.
 */
export const STATUS_CONFIG: Record<
  NodeStatus,
  {
    label: string
    bgColor: string
    textColor: string
    dotColor: string
  }
> = {
  // Decision statuses
  pending: {
    label: 'Pending',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    dotColor: 'bg-yellow-500',
  },
  selected: {
    label: 'Selected',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-200',
    dotColor: 'bg-blue-500',
  },
  // Component statuses
  considering: {
    label: 'Considering',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-800 dark:text-purple-200',
    dotColor: 'bg-purple-500',
  },
  rejected: {
    label: 'Rejected',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-200',
    dotColor: 'bg-red-500',
  },
  // Task statuses
  in_progress: {
    label: 'In Progress',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-200',
    dotColor: 'bg-blue-500',
  },
  blocked: {
    label: 'Blocked',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-200',
    dotColor: 'bg-red-500',
  },
  complete: {
    label: 'Complete',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-800 dark:text-green-200',
    dotColor: 'bg-green-500',
  },
}

/**
 * Get the display label for a status
 */
export function getStatusLabel(status: NodeStatus): string {
  return STATUS_CONFIG[status]?.label ?? status
}
