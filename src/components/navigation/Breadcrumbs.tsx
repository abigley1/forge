/**
 * Breadcrumbs Component
 *
 * Shows navigation path: Project > Node Type > Node
 * Each segment is clickable for navigation.
 */

import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProjectStore } from '@/store/useProjectStore'
import { useNodesStore } from '@/store/useNodesStore'
import { useNodeNavigation } from '@/hooks/useNodeNavigation'
import { NODE_TYPE_ICON_CONFIG } from '@/components/nodes/config'
import type { NodeType } from '@/types/nodes'

export interface BreadcrumbsProps {
  /** Additional CSS classes */
  className?: string
  /** Called when clicking project segment (optional - defaults to clearing node) */
  onProjectClick?: () => void
  /** Called when clicking node type segment (optional - for filtering) */
  onTypeClick?: (type: NodeType) => void
}

interface BreadcrumbSegment {
  id: string
  label: string
  onClick?: () => void
  isCurrent: boolean
}

/**
 * Breadcrumbs showing Project > Node Type > Node navigation path.
 *
 * - Project segment: clears active node (returns to project view)
 * - Type segment: optional callback for filtering by type
 * - Node segment: current node title (not clickable, aria-current)
 */
export function Breadcrumbs({
  className,
  onProjectClick,
  onTypeClick,
}: BreadcrumbsProps) {
  const projectName = useProjectStore((state) => state.project?.name)
  const activeNodeId = useNodesStore((state) => state.activeNodeId)
  const getNodeById = useNodesStore((state) => state.getNodeById)
  const { navigateToNode } = useNodeNavigation()

  // Get active node details
  const activeNode = activeNodeId ? getNodeById(activeNodeId) : null

  // Build breadcrumb segments
  const segments: BreadcrumbSegment[] = []

  // Project segment (always shown if project exists, always clickable)
  if (projectName) {
    segments.push({
      id: 'project',
      label: projectName,
      onClick: () => {
        if (onProjectClick) {
          onProjectClick()
        } else {
          navigateToNode(null)
        }
      },
      // Project is current only when no node is selected, but still clickable
      isCurrent: false,
    })
  }

  // Node type segment (shown if node is selected)
  if (activeNode) {
    const typeConfig = NODE_TYPE_ICON_CONFIG[activeNode.type]
    segments.push({
      id: 'type',
      label: `${typeConfig.label}s`, // Pluralize: "Tasks", "Decisions", etc.
      onClick: onTypeClick ? () => onTypeClick(activeNode.type) : undefined,
      isCurrent: false,
    })

    // Node segment (current)
    segments.push({
      id: 'node',
      label: activeNode.title,
      isCurrent: true,
    })
  }

  // Don't render if no segments
  if (segments.length === 0) {
    return null
  }

  return (
    <nav className={cn('flex items-center', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1 text-sm">
        {segments.map((segment, index) => (
          <li key={segment.id} className="flex items-center">
            {/* Separator */}
            {index > 0 && (
              <ChevronRight
                className="mx-1 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              />
            )}

            {/* Segment */}
            {segment.isCurrent ? (
              // Current segment - not clickable
              <span
                className={cn(
                  'max-w-[200px] truncate font-medium',
                  'text-gray-900 dark:text-gray-100'
                )}
                aria-current="page"
              >
                {segment.label}
              </span>
            ) : segment.onClick ? (
              // Clickable segment
              <button
                type="button"
                onClick={segment.onClick}
                className={cn(
                  'inline-flex max-w-[150px] items-center truncate rounded px-1.5 py-0.5',
                  'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                  'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none',
                  'dark:focus-visible:ring-gray-300',
                  'transition-colors'
                )}
              >
                {segment.id === 'project' && (
                  <Home
                    className="mr-1 h-3.5 w-3.5 flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
                {segment.label}
              </button>
            ) : (
              // Non-clickable segment (type without handler)
              <span
                className={cn(
                  'max-w-[150px] truncate px-1.5 py-0.5',
                  'text-gray-500 dark:text-gray-400'
                )}
              >
                {segment.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
