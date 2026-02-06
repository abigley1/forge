/**
 * Container Filter Component
 *
 * Dropdown for filtering nodes by parent container.
 * Shows all container nodes (Subsystem, Assembly, Module) and allows
 * filtering to show only nodes within the selected container.
 */

import { useMemo } from 'react'
import { Layers, Box, Grid3X3, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNodesStore } from '@/store/useNodesStore'
import { NodeType, isContainerNode } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

interface ContainerFilterProps {
  /** Currently selected container ID (null = show all) */
  selectedContainer: string | null
  /** Callback when container selection changes */
  onContainerChange: (containerId: string | null) => void
  /** Additional class name */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dropdown for filtering by parent container
 */
export function ContainerFilter({
  selectedContainer,
  onContainerChange,
  className,
}: ContainerFilterProps) {
  const nodes = useNodesStore((s) => s.nodes)

  // Get all container nodes
  const containers = useMemo(() => {
    return Array.from(nodes.values()).filter(isContainerNode)
  }, [nodes])

  // Get the selected container node
  const selectedContainerNode = useMemo(() => {
    if (!selectedContainer) return null
    return containers.find((c) => c.id === selectedContainer) || null
  }, [selectedContainer, containers])

  // Group containers by type for display
  const groupedContainers = useMemo(() => {
    const groups: {
      type: NodeType
      label: string
      containers: typeof containers
    }[] = []
    const typeOrder = [NodeType.Subsystem, NodeType.Assembly, NodeType.Module]

    for (const type of typeOrder) {
      const containersOfType = containers.filter((c) => c.type === type)
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
        groups.push({ type, label, containers: containersOfType })
      }
    }

    return groups
  }, [containers])

  if (containers.length === 0) {
    return null
  }

  // Get the appropriate icon based on selected container
  const iconProps = {
    className:
      'pointer-events-none absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2 text-forge-muted dark:text-forge-muted-dark',
    'aria-hidden': true as const,
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark block text-xs font-medium">
        Container
      </span>
      <div className="flex items-center gap-1">
        <div className="relative flex-1">
          {selectedContainerNode?.type === NodeType.Subsystem ? (
            <Layers {...iconProps} />
          ) : selectedContainerNode?.type === NodeType.Assembly ? (
            <Box {...iconProps} />
          ) : selectedContainerNode?.type === NodeType.Module ? (
            <Grid3X3 {...iconProps} />
          ) : (
            <Layers {...iconProps} />
          )}
          <select
            value={selectedContainer || ''}
            onChange={(e) => onContainerChange(e.target.value || null)}
            className={cn(
              'w-full cursor-pointer appearance-none rounded-md',
              'border-forge-border border bg-white py-1.5 pr-8 pl-8 text-sm shadow-sm',
              'focus:border-forge-accent focus:ring-forge-accent focus:ring-2 focus:outline-none',
              'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark'
            )}
            aria-label="Filter by container"
          >
            <option value="">All Containers</option>
            {groupedContainers.map((group) => (
              <optgroup key={group.type} label={group.label}>
                {group.containers.map((container) => (
                  <option key={container.id} value={container.id}>
                    {container.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className="text-forge-muted dark:text-forge-muted-dark h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {selectedContainer && (
          <button
            type="button"
            onClick={() => onContainerChange(null)}
            className={cn(
              'flex items-center justify-center rounded-md p-2.5',
              'text-forge-text-secondary min-h-[44px] min-w-[44px]',
              'transition-colors duration-150',
              'hover:bg-forge-surface hover:text-forge-text',
              'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
              'dark:text-forge-text-secondary-dark dark:hover:bg-forge-surface-dark dark:hover:text-forge-text-dark'
            )}
            aria-label="Clear container filter"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
