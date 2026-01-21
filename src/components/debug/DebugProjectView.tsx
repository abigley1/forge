/**
 * Debug Project View Component
 *
 * Displays project information for debugging purposes:
 * - Node counts by type
 * - Parse errors with details
 * - Collapsible sections
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Project } from '@/types/project'
import { getNodeCountsByType } from '@/types/project'
import type { ParseError } from '@/lib/project'

// ============================================================================
// Types
// ============================================================================

interface DebugProjectViewProps {
  /** The loaded project to display */
  project: Project | null
  /** Parse errors encountered during loading */
  parseErrors: ParseError[]
  /** Loading error message */
  error: string | null
  /** Optional class name for styling */
  className?: string
}

interface CollapsibleSectionProps {
  /** Section title */
  title: string
  /** Optional badge count */
  count?: number
  /** Badge color variant */
  countVariant?: 'default' | 'error' | 'warning'
  /** Whether section is expanded by default */
  defaultOpen?: boolean
  /** Section content */
  children: React.ReactNode
}

// ============================================================================
// Collapsible Section Component
// ============================================================================

function CollapsibleSection({
  title,
  count,
  countVariant = 'default',
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const badgeColors = {
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3',
          'text-left font-medium text-gray-900 dark:text-gray-100',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset',
          'rounded-lg transition-colors',
          isOpen && 'rounded-b-none'
        )}
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'transition-transform',
              isOpen ? 'rotate-90' : 'rotate-0'
            )}
            aria-hidden="true"
          >
            ▶
          </span>
          {title}
        </span>
        {count !== undefined && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-sm font-medium',
              badgeColors[countVariant]
            )}
          >
            {count}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Node Type Icons
// ============================================================================

const nodeTypeIcons: Record<string, string> = {
  decision: '🎯',
  component: '🔧',
  task: '✅',
  note: '📝',
}

const nodeTypeColors: Record<string, string> = {
  decision: 'text-blue-600 dark:text-blue-400',
  component: 'text-green-600 dark:text-green-400',
  task: 'text-orange-600 dark:text-orange-400',
  note: 'text-gray-600 dark:text-gray-400',
}

// ============================================================================
// Debug Project View Component
// ============================================================================

export function DebugProjectView({
  project,
  parseErrors,
  error,
  className,
}: DebugProjectViewProps) {
  // Show loading error if any
  if (error) {
    return (
      <div
        className={cn(
          'rounded-lg border border-red-200 bg-red-50 p-6',
          'dark:border-red-800 dark:bg-red-900/20',
          className
        )}
        role="alert"
      >
        <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-300">
          Failed to Load Project
        </h2>
        <p className="text-red-700 dark:text-red-400">{error}</p>
      </div>
    )
  }

  // Show empty state if no project
  if (!project) {
    return (
      <div
        className={cn(
          'rounded-lg border border-gray-200 bg-gray-50 p-6',
          'dark:border-gray-700 dark:bg-gray-800',
          'text-center',
          className
        )}
      >
        <p className="text-gray-500 dark:text-gray-400">No project loaded</p>
      </div>
    )
  }

  const nodeCounts = getNodeCountsByType(project)
  const totalNodes = Object.values(nodeCounts).reduce(
    (sum, count) => sum + count,
    0
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Project Header */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
          {project.name}
        </h2>
        {project.metadata.description && (
          <p className="mb-3 text-gray-600 dark:text-gray-400">
            {project.metadata.description}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">Path:</dt>
          <dd className="truncate font-mono text-gray-700 dark:text-gray-300">
            {project.path}
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">ID:</dt>
          <dd className="font-mono text-gray-700 dark:text-gray-300">
            {project.id}
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">Created:</dt>
          <dd className="text-gray-700 dark:text-gray-300">
            {project.metadata.createdAt.toLocaleDateString()}
          </dd>
          <dt className="text-gray-500 dark:text-gray-400">Modified:</dt>
          <dd className="text-gray-700 dark:text-gray-300">
            {project.metadata.modifiedAt.toLocaleDateString()}
          </dd>
        </dl>
      </div>

      {/* Node Counts Section */}
      <CollapsibleSection
        title="Nodes by Type"
        count={totalNodes}
        defaultOpen={true}
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Object.entries(nodeCounts).map(([type, count]) => (
            <div
              key={type}
              className={cn(
                'rounded-lg border bg-white p-3',
                'dark:border-gray-600 dark:bg-gray-900'
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <span aria-hidden="true">{nodeTypeIcons[type]}</span>
                <span
                  className={cn(
                    'text-sm font-medium capitalize',
                    nodeTypeColors[type]
                  )}
                >
                  {type}s
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {count}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* All Nodes Section */}
      <CollapsibleSection
        title="All Nodes"
        count={totalNodes}
        defaultOpen={false}
      >
        {totalNodes === 0 ? (
          <p className="text-gray-500 italic dark:text-gray-400">
            No nodes in project
          </p>
        ) : (
          <div className="space-y-2">
            {Array.from(project.nodes.values()).map((node) => (
              <div
                key={node.id}
                className={cn(
                  'rounded border bg-white p-2',
                  'dark:border-gray-600 dark:bg-gray-900',
                  'flex items-center gap-3'
                )}
              >
                <span aria-hidden="true">{nodeTypeIcons[node.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {node.title}
                  </div>
                  <div className="font-mono text-sm text-gray-500 dark:text-gray-400">
                    {node.id}
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    'bg-gray-100 text-gray-600',
                    'dark:bg-gray-700 dark:text-gray-400'
                  )}
                >
                  {node.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Parse Errors Section */}
      {parseErrors.length > 0 && (
        <CollapsibleSection
          title="Parse Errors"
          count={parseErrors.length}
          countVariant="error"
          defaultOpen={true}
        >
          <div className="space-y-3">
            {parseErrors.map((error, index) => (
              <div
                key={index}
                className={cn(
                  'rounded-lg border border-red-200 bg-red-50 p-3',
                  'dark:border-red-800 dark:bg-red-900/20'
                )}
              >
                <div className="mb-1 truncate font-mono text-sm text-red-800 dark:text-red-300">
                  {error.path}
                </div>
                <div className="text-red-700 dark:text-red-400">
                  {error.message}
                </div>
                {error.validationError?.issues && (
                  <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-400">
                    {error.validationError.issues.map((issue, i) => (
                      <li key={i}>
                        <span className="font-mono">
                          {issue.path || 'root'}
                        </span>
                        : {issue.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* No Errors Indicator */}
      {parseErrors.length === 0 && (
        <div
          className={cn(
            'rounded-lg border border-green-200 bg-green-50 p-3',
            'dark:border-green-800 dark:bg-green-900/20',
            'flex items-center gap-2'
          )}
        >
          <span aria-hidden="true">✓</span>
          <span className="text-green-700 dark:text-green-400">
            All nodes loaded successfully - no parse errors
          </span>
        </div>
      )}
    </div>
  )
}

export default DebugProjectView
