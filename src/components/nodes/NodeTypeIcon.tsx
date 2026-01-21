/**
 * NodeTypeIcon Component
 *
 * Displays the appropriate lucide-react icon for a node type.
 * Icons are hidden from screen readers (aria-hidden="true").
 */

import { cn } from '@/lib/utils'
import { NodeType } from '@/types/nodes'
import { NODE_TYPE_ICON_CONFIG } from './config'

// ============================================================================
// Types
// ============================================================================

interface NodeTypeIconProps {
  /** The node type to display an icon for */
  type: NodeType
  /** Additional CSS classes */
  className?: string
  /** Size of the icon (default: 'md') */
  size?: 'sm' | 'md' | 'lg'
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Size classes for the icon
 */
const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const

// ============================================================================
// Component
// ============================================================================

/**
 * Displays the appropriate icon for a node type with consistent styling.
 *
 * @example
 * <NodeTypeIcon type={NodeType.Task} />
 * <NodeTypeIcon type={NodeType.Decision} size="lg" />
 */
export function NodeTypeIcon({
  type,
  className,
  size = 'md',
}: NodeTypeIconProps) {
  const config = NODE_TYPE_ICON_CONFIG[type]
  const Icon = config.icon

  return (
    <Icon
      className={cn(SIZE_CLASSES[size], config.color, 'shrink-0', className)}
      aria-hidden="true"
    />
  )
}
