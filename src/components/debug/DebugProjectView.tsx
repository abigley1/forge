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
    default:
      'bg-forge-surface text-forge-text-secondary dark:bg-forge-surface-dark dark:text-forge-text-secondary-dark',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  }

  return (
    <div className="border-forge-border dark:border-forge-border-dark rounded-lg border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between px-4 py-3',
          'text-forge-text dark:text-forge-text-dark text-left font-medium',
          'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
          'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
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
        <div className="border-forge-border dark:border-forge-border-dark border-t px-4 py-3">
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
  note: 'text-forge-text-secondary dark:text-forge-muted-dark',
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
          'border-forge-border bg-forge-surface rounded-lg border p-6',
          'dark:border-forge-border-dark dark:bg-forge-surface-dark',
          'text-center',
          className
        )}
      >
        <p className="text-forge-muted dark:text-forge-muted-dark">
          No project loaded
        </p>
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
      <div className="border-forge-border bg-forge-surface dark:border-forge-border-dark dark:bg-forge-surface-dark rounded-lg border p-4">
        <h2 className="text-forge-text dark:text-forge-text-dark mb-2 text-xl font-bold">
          {project.name}
        </h2>
        {project.metadata.description && (
          <p className="text-forge-text-secondary dark:text-forge-muted-dark mb-3">
            {project.metadata.description}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-forge-muted dark:text-forge-muted-dark">Path:</dt>
          <dd className="text-forge-text-secondary dark:text-forge-text-secondary-dark truncate font-mono">
            {project.path}
          </dd>
          <dt className="text-forge-muted dark:text-forge-muted-dark">ID:</dt>
          <dd className="text-forge-text-secondary dark:text-forge-text-secondary-dark font-mono">
            {project.id}
          </dd>
          <dt className="text-forge-muted dark:text-forge-muted-dark">
            Created:
          </dt>
          <dd className="text-forge-text-secondary dark:text-forge-text-secondary-dark">
            {project.metadata.createdAt.toLocaleDateString()}
          </dd>
          <dt className="text-forge-muted dark:text-forge-muted-dark">
            Modified:
          </dt>
          <dd className="text-forge-text-secondary dark:text-forge-text-secondary-dark">
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
                'dark:border-forge-border-dark dark:bg-forge-paper-dark'
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
              <div className="text-forge-text dark:text-forge-text-dark text-2xl font-bold">
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
          <p className="text-forge-muted dark:text-forge-muted-dark italic">
            No nodes in project
          </p>
        ) : (
          <div className="space-y-2">
            {Array.from(project.nodes.values()).map((node) => (
              <div
                key={node.id}
                className={cn(
                  'rounded border bg-white p-2',
                  'dark:border-forge-border-dark dark:bg-forge-paper-dark',
                  'flex items-center gap-3'
                )}
              >
                <span aria-hidden="true">{nodeTypeIcons[node.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-forge-text dark:text-forge-text-dark truncate font-medium">
                    {node.title}
                  </div>
                  <div className="text-forge-muted dark:text-forge-muted-dark font-mono text-sm">
                    {node.id}
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    'bg-forge-surface text-forge-text-secondary',
                    'dark:bg-forge-surface-dark dark:text-forge-muted-dark'
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
