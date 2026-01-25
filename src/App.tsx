import { useState, useCallback, useMemo, useEffect } from 'react'
import { Trash2, Loader2, FolderOpen } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button, SaveIndicator, useSaveIndicator } from '@/components/ui'
import {
  useProjectStore,
  useNodesStore,
  useAppStore,
  useWorkspaceStore,
} from '@/store'
import { useUndoRedo, useFilters, useHybridPersistence } from '@/hooks'
import {
  QuickProjectSwitcher,
  CreateProjectDialog,
} from '@/components/workspace'
import { OutlineView, ViewToggle } from '@/components/outline'
import { GraphView } from '@/components/graph'
import { KanbanView } from '@/components/kanban'
import {
  NodeDetailPanel,
  FrontmatterEditor,
  AttachmentsPanel,
} from '@/components/detail'
import { MarkdownEditor } from '@/components/editor/MarkdownEditor'
import { CommandPalette } from '@/components/command'
import { DeleteNodeDialog, useDeleteNodeDialog } from '@/components/nodes'
import { ComparisonTable } from '@/components/decision'
import { getAllTagsForClustering } from '@/lib/graph'
import { cn } from '@/lib/utils'
import type { TaskStatus, ForgeNode, Attachment } from '@/types/nodes'
import { isDecisionNode, type DecisionNode } from '@/types/nodes'
import { HybridPersistenceContext } from '@/contexts'

/**
 * Loading screen shown while initializing from IndexedDB
 */
function LoadingScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-hidden />
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  )
}

/**
 * Welcome screen shown when no project is loaded
 */
function WelcomeScreen() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Get existing projects from workspace
  const projects = useWorkspaceStore((state) => state.projects)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)

  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Welcome to Forge
      </h2>
      <p className="max-w-md text-center text-gray-600 dark:text-gray-400">
        {projects.length > 0
          ? 'Select a project to continue, or create a new one.'
          : 'Create a new project to get started.'}
      </p>

      {/* Existing Projects */}
      {projects.length > 0 && (
        <div className="w-full max-w-md space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your Projects
          </p>
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleSelectProject(project.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3',
                  'text-left transition-colors',
                  'hover:border-blue-300 hover:bg-blue-50',
                  'dark:border-gray-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/30',
                  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none'
                )}
              >
                <FolderOpen
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {project.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {project.nodeCount} nodes
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create New Project Button */}
      <Button onClick={() => setCreateDialogOpen(true)}>
        Create New Project
      </Button>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}

/**
 * Main workspace shown when a project is loaded
 */
function ProjectWorkspace() {
  const activeView = useAppStore((state) => state.activeView)
  const setActiveView = useAppStore((state) => state.setActiveView)
  const nodes = useNodesStore((state) => state.nodes)
  const activeNodeId = useNodesStore((state) => state.activeNodeId)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)
  const updateNode = useNodesStore((state) => state.updateNode)
  const getNodeById = useNodesStore((state) => state.getNodeById)

  const activeNode = activeNodeId ? getNodeById(activeNodeId) : null

  // Get filters and apply them to nodes
  const { filterNodes, hasActiveFilters } = useFilters()

  // Create filtered nodes Map for OutlineView
  const filteredNodes = useMemo(() => {
    const filteredArray = filterNodes(nodes)
    const filteredMap = new Map<string, ForgeNode>()
    for (const node of filteredArray) {
      filteredMap.set(node.id, node)
    }
    return filteredMap
  }, [nodes, filterNodes])

  // Enable auto-save and get save status
  const { status: saveStatus, errorMessage: saveErrorMessage } =
    useSaveIndicator()

  // Delete node dialog state
  const {
    isOpen: deleteDialogOpen,
    nodeToDelete,
    openForNode: openDeleteDialog,
    close: closeDeleteDialog,
  } = useDeleteNodeDialog()

  // Get available tags for autocomplete
  const availableTags = useMemo(() => getAllTagsForClustering(nodes), [nodes])

  const handleTaskStatusToggle = useCallback(
    (nodeId: string, newStatus: TaskStatus) => {
      updateNode(nodeId, { status: newStatus })
    },
    [updateNode]
  )

  // Handle node field changes from the editor
  const handleNodeChange = useCallback(
    (updates: Partial<ForgeNode>) => {
      if (activeNodeId) {
        updateNode(activeNodeId, updates)
      }
    },
    [activeNodeId, updateNode]
  )

  // Handle decision-specific changes (for ComparisonTable)
  const handleDecisionChange = useCallback(
    (updates: Partial<DecisionNode>) => {
      if (activeNodeId) {
        updateNode(activeNodeId, updates as Partial<ForgeNode>)
      }
    },
    [activeNodeId, updateNode]
  )

  // Handle markdown content changes
  const handleContentChange = useCallback(
    (content: string) => {
      if (activeNodeId) {
        updateNode(activeNodeId, { content })
      }
    },
    [activeNodeId, updateNode]
  )

  // Handle attachment changes
  const handleAttachmentsChange = useCallback(
    (attachments: Attachment[]) => {
      if (activeNodeId) {
        updateNode(activeNodeId, { attachments })
      }
    },
    [activeNodeId, updateNode]
  )

  // Handle delete node (from detail panel or graph context menu)
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const node = getNodeById(nodeId)
      if (node) {
        openDeleteDialog(node)
      }
    },
    [getNodeById, openDeleteDialog]
  )

  // Handle delete confirmed - close detail panel if deleted node was active
  const handleDeleteConfirmed = useCallback(() => {
    if (nodeToDelete && activeNodeId === nodeToDelete.id) {
      setActiveNode(null)
    }
  }, [nodeToDelete, activeNodeId, setActiveNode])

  return (
    <div className="flex h-full flex-col">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {hasActiveFilters
              ? `${filteredNodes.size} of ${nodes.size} nodes`
              : `${nodes.size} ${nodes.size === 1 ? 'node' : 'nodes'}`}
          </h2>
          <SaveIndicator status={saveStatus} errorMessage={saveErrorMessage} />
        </div>
        <ViewToggle value={activeView} onChange={setActiveView} />
      </div>

      {/* Main content area */}
      <div className="flex min-h-0 flex-1">
        {/* Node list / Graph / Kanban view - tabpanel for ViewToggle tabs */}
        <div
          id={`${activeView}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeView}-tab`}
          className="min-w-0 flex-1 overflow-auto"
        >
          {activeView === 'outline' && (
            <OutlineView
              nodes={filteredNodes}
              activeNodeId={activeNodeId}
              onNodeSelect={setActiveNode}
              onTaskStatusToggle={handleTaskStatusToggle}
              className="p-4"
            />
          )}
          {activeView === 'graph' && (
            <GraphView
              onNodeSelect={setActiveNode}
              onNodeDelete={handleDeleteNode}
            />
          )}
          {activeView === 'kanban' && (
            <KanbanView
              nodes={filteredNodes}
              onNodeSelect={setActiveNode}
              activeNodeId={activeNodeId}
            />
          )}
        </div>

        {/* Detail panel (when node selected) */}
        <NodeDetailPanel
          node={activeNode ?? null}
          isOpen={!!activeNode}
          onClose={() => setActiveNode(null)}
        >
          {activeNode && (
            <div className="space-y-6">
              <FrontmatterEditor
                node={activeNode}
                onChange={handleNodeChange}
                availableTags={availableTags}
                availableNodes={nodes}
                onNavigate={setActiveNode}
              />

              {/* Comparison table for decision nodes */}
              {isDecisionNode(activeNode) && (
                <div>
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Comparison Table
                  </span>
                  <ComparisonTable
                    node={activeNode}
                    onChange={handleDecisionChange}
                    availableNodes={nodes}
                    onNavigate={setActiveNode}
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="node-content"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Content
                </label>
                <MarkdownEditor
                  value={activeNode.content}
                  onChange={handleContentChange}
                  placeholder="Write your notes here..."
                  aria-label="Node content"
                  minHeight="200px"
                />
              </div>

              {/* Attachments panel */}
              <AttachmentsPanel
                node={activeNode}
                onChange={handleAttachmentsChange}
              />

              {/* Delete node button */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => handleDeleteNode(activeNode.id)}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-md px-4 py-2',
                    'border border-red-300 text-red-600',
                    'hover:border-red-400 hover:bg-red-50',
                    'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none',
                    'dark:border-red-800 dark:text-red-400',
                    'dark:hover:border-red-700 dark:hover:bg-red-950'
                  )}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete Node
                </button>
              </div>
            </div>
          )}
        </NodeDetailPanel>
      </div>

      {/* Delete node confirmation dialog */}
      <DeleteNodeDialog
        node={nodeToDelete}
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        onDeleted={handleDeleteConfirmed}
      />
    </div>
  )
}

function App() {
  const project = useProjectStore((state) => state.project)
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)

  // Initialize IndexedDB persistence
  const persistence = useHybridPersistence()

  // Enable global undo/redo keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
  useUndoRedo({ enableHotkeys: true })

  // Keyboard shortcut for quick project switcher (Cmd+Shift+P / Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (modifier && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setQuickSwitcherOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Determine what to render based on state
  const renderContent = () => {
    // Still loading from IndexedDB
    if (!persistence.isInitialized || persistence.isLoading) {
      return <LoadingScreen />
    }

    // Have project loaded (from IndexedDB)
    if (project) {
      return <ProjectWorkspace />
    }

    // No data - show welcome screen
    return <WelcomeScreen />
  }

  return (
    <HybridPersistenceContext.Provider value={persistence}>
      <AppShell>
        {renderContent()}
        <CommandPalette />
        <QuickProjectSwitcher
          open={quickSwitcherOpen}
          onOpenChange={setQuickSwitcherOpen}
        />
      </AppShell>
    </HybridPersistenceContext.Provider>
  )
}

export default App
