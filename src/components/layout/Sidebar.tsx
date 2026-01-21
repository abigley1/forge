/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar with:
 * - Project switcher (header)
 * - Quick create buttons for all node types
 * - Filters section (type, status)
 * - Tag cloud from nodes
 *
 * Collapses at mobile breakpoint (handled by AppShell).
 */

import {
  Lightbulb,
  Package,
  CheckSquare,
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Filter,
  Tags,
} from 'lucide-react'
import { useState, useCallback, useMemo } from 'react'

import { cn } from '@/lib/utils'
import { NodeType, createNodeDates } from '@/types/nodes'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
} from '@/types/nodes'
import { useNodesStore } from '@/store'
import { generateNodeId } from '@/lib/project'
import { useUndoableAddNode } from '@/hooks'

// ============================================================================
// Types
// ============================================================================

interface SidebarProps {
  className?: string
}

interface SidebarSectionProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

interface QuickCreateButtonProps {
  nodeType: NodeType
  onClick: () => void
}

// ============================================================================
// Node Type Config
// ============================================================================

/**
 * Configuration for each node type including icon and colors
 */
const NODE_TYPE_CONFIG: Record<
  NodeType,
  {
    label: string
    icon: typeof Lightbulb
    bgColor: string
    hoverBgColor: string
    iconColor: string
  }
> = {
  [NodeType.Decision]: {
    label: 'Decision',
    icon: Lightbulb,
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    hoverBgColor: 'hover:bg-blue-100 dark:hover:bg-blue-900/50',
    iconColor: 'text-blue-500',
  },
  [NodeType.Component]: {
    label: 'Component',
    icon: Package,
    bgColor: 'bg-green-50 dark:bg-green-950/50',
    hoverBgColor: 'hover:bg-green-100 dark:hover:bg-green-900/50',
    iconColor: 'text-green-500',
  },
  [NodeType.Task]: {
    label: 'Task',
    icon: CheckSquare,
    bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    hoverBgColor: 'hover:bg-orange-100 dark:hover:bg-orange-900/50',
    iconColor: 'text-orange-500',
  },
  [NodeType.Note]: {
    label: 'Note',
    icon: FileText,
    bgColor: 'bg-gray-50 dark:bg-gray-900/50',
    hoverBgColor: 'hover:bg-gray-100 dark:hover:bg-gray-800/50',
    iconColor: 'text-gray-500',
  },
}

// ============================================================================
// SidebarSection Component
// ============================================================================

/**
 * Collapsible section in the sidebar
 */
function SidebarSection({
  title,
  icon,
  children,
  defaultExpanded = true,
  className,
}: SidebarSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div
      className={cn('border-b border-gray-200 dark:border-gray-800', className)}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-2',
          'text-sm font-medium text-gray-700 dark:text-gray-300',
          'hover:bg-gray-100 dark:hover:bg-gray-800/50',
          'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none focus-visible:ring-inset dark:focus-visible:ring-gray-300'
        )}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-gray-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-gray-500"
            aria-hidden="true"
          />
        )}
        {icon && <span className="shrink-0 text-gray-500">{icon}</span>}
        <span className="truncate">{title}</span>
      </button>
      {expanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

// ============================================================================
// QuickCreateButton Component
// ============================================================================

/**
 * Button for quickly creating a new node of a specific type
 */
function QuickCreateButton({ nodeType, onClick }: QuickCreateButtonProps) {
  const config = NODE_TYPE_CONFIG[nodeType]
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2',
        'text-sm font-medium text-gray-700 dark:text-gray-300',
        config.bgColor,
        config.hoverBgColor,
        'transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
      )}
      aria-label={`Create new ${config.label}`}
    >
      <Plus className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
      <Icon
        className={cn('h-4 w-4 shrink-0', config.iconColor)}
        aria-hidden="true"
      />
      <span className="truncate">{config.label}</span>
    </button>
  )
}

// ============================================================================
// ProjectSwitcher Component
// ============================================================================

/**
 * Placeholder project switcher - will be fully implemented in Sprint 11
 */
function ProjectSwitcher() {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <FolderOpen className="h-5 w-5 text-gray-500" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
          Forge
        </h1>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          No project loaded
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// FilterSection Component
// ============================================================================

/**
 * Placeholder filter section - will be fully implemented in Sprint 3
 */
function FilterSection() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Type, status, and search filters will appear here.
      </p>
    </div>
  )
}

// ============================================================================
// TagCloud Component
// ============================================================================

interface TagCloudProps {
  onTagClick?: (tag: string) => void
}

/**
 * Displays tags from all nodes with counts
 */
function TagCloud({ onTagClick }: TagCloudProps) {
  const nodes = useNodesStore((state) => state.nodes)

  // Extract unique tags with counts
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    nodes.forEach((node) => {
      node.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) || 0) + 1)
      })
    })
    // Sort by count descending, then alphabetically
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]
        return a[0].localeCompare(b[0])
      })
      .slice(0, 10) // Limit to top 10 tags
  }, [nodes])

  if (tagCounts.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        No tags yet. Add tags to nodes to see them here.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tagCounts.map(([tag, count]) => (
        <button
          key={tag}
          type="button"
          onClick={() => onTagClick?.(tag)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
            'text-xs font-medium text-gray-700 dark:text-gray-300',
            'bg-gray-100 dark:bg-gray-800',
            'hover:bg-gray-200 dark:hover:bg-gray-700',
            'transition-colors duration-150',
            'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
          )}
          aria-label={`Filter by tag: ${tag}`}
        >
          <span className="max-w-[100px] truncate">{tag}</span>
          <span className="text-gray-500 dark:text-gray-400">{count}</span>
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Sidebar Component
// ============================================================================

/**
 * Main sidebar component with all navigation sections
 */
export function Sidebar({ className }: SidebarProps) {
  const nodes = useNodesStore((state) => state.nodes)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)
  const addNodeWithUndo = useUndoableAddNode()

  /**
   * Creates a new node of the specified type with default values
   */
  const handleCreateNode = useCallback(
    (nodeType: NodeType) => {
      const existingIds = new Set(nodes.keys())
      const config = NODE_TYPE_CONFIG[nodeType]
      const title = `New ${config.label}`
      const id = generateNodeId(title, existingIds)
      const dates = createNodeDates()

      let newNode: ForgeNode

      switch (nodeType) {
        case NodeType.Decision:
          newNode = {
            id,
            type: NodeType.Decision,
            title,
            tags: [],
            dates,
            content: '',
            status: 'pending',
            selected: null,
            options: [],
            criteria: [],
          } satisfies DecisionNode
          break
        case NodeType.Component:
          newNode = {
            id,
            type: NodeType.Component,
            title,
            tags: [],
            dates,
            content: '',
            status: 'considering',
            cost: null,
            supplier: null,
            partNumber: null,
            customFields: {},
          } satisfies ComponentNode
          break
        case NodeType.Task:
          newNode = {
            id,
            type: NodeType.Task,
            title,
            tags: [],
            dates,
            content: '',
            status: 'pending',
            priority: 'medium',
            dependsOn: [],
            blocks: [],
            checklist: [],
          } satisfies TaskNode
          break
        case NodeType.Note:
          newNode = {
            id,
            type: NodeType.Note,
            title,
            tags: [],
            dates,
            content: '',
          } satisfies NoteNode
          break
      }

      addNodeWithUndo(newNode)
      setActiveNode(id)
    },
    [nodes, addNodeWithUndo, setActiveNode]
  )

  const handleTagClick = useCallback((tag: string) => {
    // TODO: Implement tag filtering in Sprint 3
    console.log('Tag clicked:', tag)
  }, [])

  return (
    <nav
      className={cn('flex h-full flex-col', className)}
      aria-label="Main navigation"
    >
      {/* Project Switcher Header */}
      <ProjectSwitcher />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Quick Create Section */}
        <SidebarSection
          title="Quick Create"
          icon={<Plus className="h-4 w-4" />}
          defaultExpanded={true}
        >
          <div className="space-y-1">
            <QuickCreateButton
              nodeType={NodeType.Decision}
              onClick={() => handleCreateNode(NodeType.Decision)}
            />
            <QuickCreateButton
              nodeType={NodeType.Component}
              onClick={() => handleCreateNode(NodeType.Component)}
            />
            <QuickCreateButton
              nodeType={NodeType.Task}
              onClick={() => handleCreateNode(NodeType.Task)}
            />
            <QuickCreateButton
              nodeType={NodeType.Note}
              onClick={() => handleCreateNode(NodeType.Note)}
            />
          </div>
        </SidebarSection>

        {/* Filters Section */}
        <SidebarSection
          title="Filters"
          icon={<Filter className="h-4 w-4" />}
          defaultExpanded={false}
        >
          <FilterSection />
        </SidebarSection>

        {/* Tag Cloud Section */}
        <SidebarSection
          title="Tags"
          icon={<Tags className="h-4 w-4" />}
          defaultExpanded={true}
        >
          <TagCloud onTagClick={handleTagClick} />
        </SidebarSection>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500">Forge v0.0.1</p>
      </div>
    </nav>
  )
}
