/**
 * Sidebar Navigation Component
 *
 * Main navigation sidebar with:
 * - Project switcher (header) with dropdown for switching projects
 * - Quick create buttons for all node types
 * - Filters section (type, status, search)
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
  Filter,
  Tags,
  Download,
  Upload,
  Layers,
  Boxes,
  LayoutGrid,
} from 'lucide-react'
import { useState, useCallback, useMemo, useId } from 'react'

import { cn } from '@/lib/utils'
import { NodeType, createNodeDates } from '@/types/nodes'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
  SubsystemNode,
  AssemblyNode,
  ModuleNode,
} from '@/types/nodes'
import { useNodesStore } from '@/store'
import { generateNodeId } from '@/lib/project'
import { useUndoableAddNode, useFilters, useSorting } from '@/hooks'
import {
  TypeFilter,
  StatusFilter,
  ContainerFilter,
  NodeSearchInput,
  FilterResultsCount,
  SortDropdown,
} from '@/components/filters'
import { ExportDialog } from '@/components/export/ExportDialog'
import { ImportDialog } from '@/components/export/ImportDialog'
import {
  ProjectSwitcher,
  CreateProjectDialog,
  ProjectSettingsDialog,
} from '@/components/workspace'
import { SyncStatusIndicator } from '@/components/sync'
import { useOptionalHybridPersistence } from '@/contexts'
import type { Project } from '@/types/project'
import { createProjectMetadata } from '@/types/project'

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
  [NodeType.Subsystem]: {
    label: 'Subsystem',
    icon: Layers,
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    hoverBgColor: 'hover:bg-purple-100 dark:hover:bg-purple-900/50',
    iconColor: 'text-purple-500',
  },
  [NodeType.Assembly]: {
    label: 'Assembly',
    icon: Boxes,
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    hoverBgColor: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/50',
    iconColor: 'text-cyan-500',
  },
  [NodeType.Module]: {
    label: 'Module',
    icon: LayoutGrid,
    bgColor: 'bg-rose-50 dark:bg-rose-950/50',
    hoverBgColor: 'hover:bg-rose-100 dark:hover:bg-rose-900/50',
    iconColor: 'text-rose-500',
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
  const contentId = useId()

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
        aria-controls={contentId}
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
      {expanded && (
        <div id={contentId} className="px-4 pb-3">
          {children}
        </div>
      )}
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
// FilterSection Component
// ============================================================================

interface FilterSectionContentProps {
  filters: ReturnType<typeof useFilters>
  sorting: ReturnType<typeof useSorting>
}

/**
 * Filter section with type, status, search filters, and sorting
 */
function FilterSectionContent({ filters, sorting }: FilterSectionContentProps) {
  const nodes = useNodesStore((state) => state.nodes)
  const filteredNodes = filters.filterNodes(nodes)

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <NodeSearchInput
        value={filters.filters.search}
        onChange={filters.setSearch}
        placeholder="Search nodes..."
      />

      {/* Sort Dropdown */}
      <div>
        <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Sort
        </span>
        <SortDropdown
          sortBy={sorting.sortBy}
          direction={sorting.direction}
          onSortByChange={sorting.setSortBy}
          onDirectionChange={sorting.setDirection}
        />
      </div>

      {/* Type Filter */}
      <TypeFilter
        selectedTypes={filters.filters.types}
        onToggleType={filters.toggleType}
      />

      {/* Status Filter */}
      <StatusFilter
        selectedStatuses={filters.filters.statuses}
        onToggleStatus={filters.toggleStatus}
      />

      {/* Container Filter */}
      <ContainerFilter
        selectedContainer={filters.filters.container}
        onContainerChange={filters.setContainer}
      />

      {/* Results Count */}
      <FilterResultsCount
        resultCount={filteredNodes.length}
        totalCount={nodes.size}
        hasActiveFilters={filters.hasActiveFilters}
        onClearFilters={filters.clearFilters}
      />
    </div>
  )
}

// ============================================================================
// TagCloud Component
// ============================================================================

interface TagCloudProps {
  onTagClick?: (tag: string) => void
  /** Currently selected tags (for highlighting) */
  selectedTags?: string[]
}

/**
 * Displays tags from all nodes with counts.
 * Click adds tag to filter.
 */
function TagCloud({ onTagClick, selectedTags = [] }: TagCloudProps) {
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
      {tagCounts.map(([tag, count]) => {
        const isSelected = selectedTags.includes(tag)
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick?.(tag)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-2',
              'min-h-[44px]', // WCAG 2.1 touch target minimum
              'text-xs font-medium',
              'transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300',
              isSelected
                ? [
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
                    'hover:bg-blue-200 dark:hover:bg-blue-800/50',
                  ]
                : [
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    'hover:bg-gray-200 dark:hover:bg-gray-700',
                  ]
            )}
            aria-label={`${isSelected ? 'Remove' : 'Add'} tag filter: ${tag}`}
            aria-pressed={isSelected}
          >
            <span className="max-w-[100px] truncate">{tag}</span>
            <span
              className={cn(
                isSelected
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
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
  const setNodes = useNodesStore((state) => state.setNodes)
  const addNodeWithUndo = useUndoableAddNode()
  const filters = useFilters()
  const sorting = useSorting()

  // Hybrid persistence (optional - may not be available in tests)
  const persistence = useOptionalHybridPersistence()

  // Import/Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Project management dialog state
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false)

  // Create a Project object from current nodes for export
  const currentProject = useMemo((): Project => {
    return {
      id: 'current-project',
      name: 'Forge Project',
      path: '.',
      nodes: nodes,
      metadata: createProjectMetadata(),
    }
  }, [nodes])

  /**
   * Handle import success by replacing/merging nodes
   */
  const handleImportSuccess = useCallback(
    (importedProject: Project) => {
      // Replace all nodes with imported nodes
      setNodes(importedProject.nodes)
    },
    [setNodes]
  )

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
            rationale: null,
            selectedDate: null,
            parent: null,
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
            parent: null,
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
            parent: null,
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
            parent: null,
          } satisfies NoteNode
          break
        case NodeType.Subsystem:
          newNode = {
            id,
            type: NodeType.Subsystem,
            title,
            tags: [],
            dates,
            content: '',
            status: 'planning',
          } satisfies SubsystemNode
          break
        case NodeType.Assembly:
          newNode = {
            id,
            type: NodeType.Assembly,
            title,
            tags: [],
            dates,
            content: '',
            status: 'planning',
            parent: null,
          } satisfies AssemblyNode
          break
        case NodeType.Module:
          newNode = {
            id,
            type: NodeType.Module,
            title,
            tags: [],
            dates,
            content: '',
            status: 'planning',
            parent: null,
          } satisfies ModuleNode
          break
      }

      addNodeWithUndo(newNode)
      setActiveNode(id)
    },
    [nodes, addNodeWithUndo, setActiveNode]
  )

  /**
   * Toggle tag in filter when clicked in tag cloud
   */
  const handleTagClick = useCallback(
    (tag: string) => {
      filters.toggleTag(tag)
    },
    [filters]
  )

  return (
    <nav
      data-testid="sidebar"
      className={cn('flex h-full flex-col', className)}
      aria-label="Main navigation"
    >
      {/* Project Switcher Header */}
      <ProjectSwitcher
        onSettingsClick={() => setProjectSettingsOpen(true)}
        onCreateClick={() => setCreateProjectOpen(true)}
      />

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
            <QuickCreateButton
              nodeType={NodeType.Subsystem}
              onClick={() => handleCreateNode(NodeType.Subsystem)}
            />
            <QuickCreateButton
              nodeType={NodeType.Assembly}
              onClick={() => handleCreateNode(NodeType.Assembly)}
            />
            <QuickCreateButton
              nodeType={NodeType.Module}
              onClick={() => handleCreateNode(NodeType.Module)}
            />
          </div>
        </SidebarSection>

        {/* Filters Section */}
        <SidebarSection
          title={
            filters.hasActiveFilters
              ? `Filters (${filters.activeFilterCount})`
              : 'Filters'
          }
          icon={<Filter className="h-4 w-4" />}
          defaultExpanded={filters.hasActiveFilters}
        >
          <FilterSectionContent filters={filters} sorting={sorting} />
        </SidebarSection>

        {/* Tag Cloud Section */}
        <SidebarSection
          title="Tags"
          icon={<Tags className="h-4 w-4" />}
          defaultExpanded={true}
        >
          <TagCloud
            onTagClick={handleTagClick}
            selectedTags={filters.filters.tags}
          />
        </SidebarSection>
      </div>

      {/* Import/Export Buttons */}
      <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setImportDialogOpen(true)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2',
              'text-sm font-medium text-gray-700 dark:text-gray-300',
              'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
              'transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
            )}
            aria-label="Import project data"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import
          </button>
          <button
            type="button"
            onClick={() => setExportDialogOpen(true)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2',
              'text-sm font-medium text-gray-700 dark:text-gray-300',
              'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
              'transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300'
            )}
            aria-label="Export project data"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export
          </button>
        </div>
      </div>

      {/* Footer with Sync Status */}
      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Forge v0.0.1
          </p>
          {persistence && (
            <SyncStatusIndicator
              status={
                persistence.syncStatus === 'synced'
                  ? 'synced'
                  : persistence.syncStatus === 'syncing'
                    ? 'syncing'
                    : persistence.error
                      ? 'error'
                      : 'offline'
              }
              isConnected={persistence.connectionStatus === 'connected'}
              errorMessage={persistence.error ?? undefined}
              onSyncNow={persistence.syncToFileSystem}
              onReconnect={
                persistence.needsPermission
                  ? persistence.requestPermission
                  : persistence.connectToFileSystem
              }
              autoSyncEnabled={persistence.autoSyncEnabled}
              syncInterval={persistence.syncInterval}
              onAutoSyncChange={persistence.setAutoSyncEnabled}
              onSyncIntervalChange={persistence.setSyncInterval}
            />
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        project={currentProject}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportSuccess={handleImportSuccess}
        currentProject={currentProject}
      />

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />

      {/* Project Settings Dialog */}
      <ProjectSettingsDialog
        open={projectSettingsOpen}
        onOpenChange={setProjectSettingsOpen}
      />
    </nav>
  )
}
