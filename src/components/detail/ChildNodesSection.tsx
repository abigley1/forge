/**
 * ChildNodesSection - Displays child nodes of a container, grouped by type
 *
 * Shows tasks, components, decisions, and notes that have this container as their parent.
 * Clicking a child node navigates to it.
 */

import { useMemo } from 'react'
import {
  CheckSquare,
  Cpu,
  GitBranch,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNodesStore } from '@/store/useNodesStore'
import type { ForgeNode } from '@/types'
import {
  NodeType,
  isTaskNode,
  isComponentNode,
  isDecisionNode,
  isNoteNode,
} from '@/types'

export interface ChildNodesSectionProps {
  /** The parent container ID */
  containerId: string
  /** Called when a child node is clicked */
  onNavigate?: (nodeId: string) => void
  /** Optional class name */
  className?: string
}

interface NodeGroup {
  type: NodeType
  label: string
  icon: React.ReactNode
  nodes: ForgeNode[]
}

/**
 * Get icon for node type
 */
function getNodeIcon(type: NodeType) {
  switch (type) {
    case NodeType.Task:
      return <CheckSquare className="h-4 w-4" aria-hidden="true" />
    case NodeType.Component:
      return <Cpu className="h-4 w-4" aria-hidden="true" />
    case NodeType.Decision:
      return <GitBranch className="h-4 w-4" aria-hidden="true" />
    case NodeType.Note:
      return <FileText className="h-4 w-4" aria-hidden="true" />
    default:
      return <FileText className="h-4 w-4" aria-hidden="true" />
  }
}

/**
 * Get plural label for node type
 */
function getTypeLabel(type: NodeType): string {
  switch (type) {
    case NodeType.Task:
      return 'Tasks'
    case NodeType.Component:
      return 'Components'
    case NodeType.Decision:
      return 'Decisions'
    case NodeType.Note:
      return 'Notes'
    default:
      return 'Items'
  }
}

/**
 * Displays child nodes of a container grouped by type
 */
export function ChildNodesSection({
  containerId,
  onNavigate,
  className,
}: ChildNodesSectionProps) {
  const getChildNodes = useNodesStore((s) => s.getChildNodes)

  // Get and group child nodes by type
  const nodeGroups = useMemo(() => {
    const children = getChildNodes(containerId)
    const groups: NodeGroup[] = []

    // Group by type (maintaining consistent order)
    const typeOrder = [
      NodeType.Task,
      NodeType.Component,
      NodeType.Decision,
      NodeType.Note,
    ]

    for (const type of typeOrder) {
      const nodesOfType = children.filter((node) => {
        if (type === NodeType.Task) return isTaskNode(node)
        if (type === NodeType.Component) return isComponentNode(node)
        if (type === NodeType.Decision) return isDecisionNode(node)
        if (type === NodeType.Note) return isNoteNode(node)
        return false
      })

      if (nodesOfType.length > 0) {
        groups.push({
          type,
          label: getTypeLabel(type),
          icon: getNodeIcon(type),
          nodes: nodesOfType,
        })
      }
    }

    return groups
  }, [containerId, getChildNodes])

  const totalChildren = nodeGroups.reduce((sum, g) => sum + g.nodes.length, 0)

  if (totalChildren === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <h3 className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm font-medium">
          Child Nodes
        </h3>
        <p className="text-forge-muted dark:text-forge-muted-dark text-sm italic">
          No child nodes yet
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-forge-text-secondary dark:text-forge-text-secondary-dark text-sm font-medium">
        Child Nodes ({totalChildren})
      </h3>

      <div className="space-y-4">
        {nodeGroups.map((group) => (
          <div key={group.type} className="space-y-1">
            {/* Group Header */}
            <div className="text-forge-text-secondary dark:text-forge-muted-dark flex items-center gap-2 text-sm">
              {group.icon}
              <span>
                {group.label} ({group.nodes.length})
              </span>
            </div>

            {/* Group Items */}
            <ul className="space-y-1 pl-6" aria-label={`${group.label} list`}>
              {group.nodes.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.(node.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5',
                      'text-forge-text-secondary dark:text-forge-text-secondary-dark text-left text-sm',
                      'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
                      'focus:ring-forge-accent dark:focus:ring-forge-accent-dark focus:ring-2 focus:outline-none',
                      'transition-colors'
                    )}
                    aria-label={`Navigate to ${node.title}`}
                  >
                    <span className="flex-1 truncate">{node.title}</span>
                    <ChevronRight
                      className="text-forge-muted h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
