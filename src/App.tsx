import { useState, useCallback, useMemo, useEffect } from 'react'
import { Trash2, Save } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { SaveIndicator, useSaveIndicator } from '@/components/ui'
import {
  useProjectStore,
  useNodesStore,
  useAppStore,
  useWorkspaceStore,
} from '@/store'
import {
  useUndoRedo,
  useFilters,
  useServerPersistence,
  useReducedMotion,
} from '@/hooks'
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
import { InventoryView } from '@/components/inventory'
import { getAllTagsForClustering } from '@/lib/graph'
import { cn } from '@/lib/utils'
import type { TaskStatus, ForgeNode, Attachment } from '@/types/nodes'
import { isDecisionNode, type DecisionNode } from '@/types/nodes'
import { ServerPersistenceContext } from '@/contexts'
import type { PersistenceContextValue } from '@/contexts'

/**
 * Loading screen — pulsing status LED with monospace label
 */
function LoadingScreen() {
  return (
    <div
      className="bg-forge-paper dark:bg-forge-paper-dark flex flex-1 flex-col items-center justify-center gap-4 p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="forge-pulse bg-forge-accent dark:bg-forge-accent-dark h-2 w-2 rounded-full" />
      <p className="text-forge-muted dark:text-forge-muted-dark font-mono text-xs font-medium tracking-[0.15em] uppercase">
        Initializing
      </p>
    </div>
  )
}

/**
 * Welcome screen — full-page project selector with warm industrial aesthetic
 */
function WelcomeScreen({ onOpenInventory }: { onOpenInventory: () => void }) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const reducedMotion = useReducedMotion()

  const projects = useWorkspaceStore((state) => state.projects)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)

  const handleSelectProject = (projectId: string) => {
    setActiveProject(projectId)
  }

  const hasProjects = projects.length > 0

  return (
    <div
      className="bg-forge-paper dark:bg-forge-paper-dark flex flex-1 flex-col"
      data-testid="welcome-screen"
    >
      {/* Header bar */}
      <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-forge-text dark:text-forge-text-dark font-mono text-lg font-semibold tracking-[0.15em] uppercase">
          Forge
        </h1>
        <span className="text-forge-muted dark:text-forge-muted-dark font-mono text-xs tabular-nums">
          v0.0.1
        </span>
      </div>

      {/* Main content — two-column layout */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-3xl gap-12 max-md:max-w-lg max-md:flex-col max-md:gap-10">
          {/* Projects zone */}
          <div className="min-w-0 flex-1">
            <h2 className="text-forge-muted dark:text-forge-muted-dark mb-6 font-mono text-xs font-medium tracking-[0.1em] uppercase">
              {hasProjects ? 'Projects' : 'Get Started'}
            </h2>

            {/* Project cards */}
            {hasProjects ? (
              <div className="space-y-3">
                {projects.map((project, index) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project.id)}
                    className={cn(
                      'border-forge-border bg-forge-surface flex w-full items-start gap-4 rounded-md border p-4',
                      'border-l-forge-accent border-l-[3px]',
                      'text-left transition-transform duration-150',
                      'hover:translate-x-0.5',
                      'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:border-l-forge-accent-dark',
                      'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
                      'dark:focus-visible:ring-forge-accent-dark',
                      !reducedMotion && 'forge-card-enter'
                    )}
                    style={
                      !reducedMotion && index < 5
                        ? { animationDelay: `${index * 60}ms` }
                        : undefined
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-forge-text dark:text-forge-text-dark truncate font-mono text-sm font-medium">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-1 truncate text-sm">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-forge-text dark:text-forge-text-dark font-mono text-sm tabular-nums">
                        {project.nodeCount}
                      </span>
                      <span className="text-forge-muted dark:text-forge-muted-dark block font-mono text-[10px] font-medium tracking-[0.08em] uppercase">
                        Nodes
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-6 text-sm">
                Create your first project to begin planning.
              </p>
            )}

            {/* Divider */}
            {hasProjects && (
              <div className="border-forge-border-subtle dark:border-forge-border-subtle-dark my-6 border-t" />
            )}

            {/* New Project button */}
            <div className={cn(hasProjects ? 'flex justify-center' : '')}>
              <button
                type="button"
                onClick={() => setCreateDialogOpen(true)}
                className={cn(
                  'border-forge-border inline-flex items-center gap-2 rounded-md border bg-transparent px-4 py-2',
                  'text-forge-text font-mono text-xs font-medium tracking-[0.08em] uppercase',
                  'transition-colors duration-150',
                  'hover:border-forge-accent hover:text-forge-accent',
                  'dark:border-forge-border-dark dark:text-forge-text-dark',
                  'dark:hover:border-forge-accent-dark dark:hover:text-forge-accent-dark',
                  'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
                  'dark:focus-visible:ring-forge-accent-dark'
                )}
              >
                <span aria-hidden="true">+</span>
                New Project
              </button>
            </div>
          </div>

          {/* Divider — vertical on desktop, horizontal on mobile */}
          <div className="max-md:border-forge-border-subtle max-md:dark:border-forge-border-subtle-dark md:border-forge-border-subtle md:dark:border-forge-border-subtle-dark shrink-0 max-md:border-t md:border-l" />

          {/* Tools zone */}
          <div className="w-44 shrink-0 max-md:w-full">
            <h2 className="text-forge-muted dark:text-forge-muted-dark mb-4 font-mono text-xs font-medium tracking-[0.1em] uppercase">
              Tools
            </h2>
            <button
              type="button"
              onClick={onOpenInventory}
              className={cn(
                'group flex w-full items-center gap-3 py-2',
                'text-left transition-colors duration-150',
                'focus-visible:ring-forge-accent focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none',
                'dark:focus-visible:ring-forge-accent-dark'
              )}
            >
              <span
                className={cn(
                  'text-forge-muted font-mono text-xs tracking-[0.08em] uppercase',
                  'transition-colors duration-150',
                  'group-hover:text-forge-accent',
                  'dark:text-forge-muted-dark dark:group-hover:text-forge-accent-dark'
                )}
              >
                →
              </span>
              <span
                className={cn(
                  'text-forge-text-secondary font-mono text-sm font-medium',
                  'transition-colors duration-150',
                  'group-hover:text-forge-text',
                  'dark:text-forge-text-secondary-dark dark:group-hover:text-forge-text-dark'
                )}
              >
                Inventory
              </span>
            </button>
          </div>
        </div>
      </div>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}

/**
 * Standalone inventory view — full-page, no project context
 */
function StandaloneInventory({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-forge-paper dark:bg-forge-paper-dark flex flex-1 flex-col">
      {/* Header bar with back navigation */}
      <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'text-forge-muted font-mono text-xs tracking-[0.08em] uppercase',
              'transition-colors duration-150',
              'hover:text-forge-accent',
              'dark:text-forge-muted-dark dark:hover:text-forge-accent-dark',
              'focus-visible:ring-forge-accent focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none',
              'dark:focus-visible:ring-forge-accent-dark'
            )}
          >
            ← Forge
          </button>
          <span className="text-forge-border dark:text-forge-border-dark">
            /
          </span>
          <span className="text-forge-text dark:text-forge-text-dark font-mono text-sm font-medium tracking-[0.1em] uppercase">
            Inventory
          </span>
        </div>
      </div>

      {/* Inventory content */}
      <div className="min-h-0 flex-1 overflow-auto">
        <InventoryView />
      </div>
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
  const {
    status: saveStatus,
    errorMessage: saveErrorMessage,
    saveNow,
    isSaving,
    hasUnsavedChanges,
  } = useSaveIndicator()

  // Keyboard shortcut for manual save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (modifier && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (hasUnsavedChanges && !isSaving) {
          saveNow()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, isSaving, saveNow])

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
    <div className="bg-forge-paper dark:bg-forge-paper-dark flex h-full flex-col">
      {/* Header with view toggle */}
      <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <h2 className="text-forge-text dark:text-forge-text-dark font-mono text-sm tracking-[0.05em]">
            {hasActiveFilters
              ? `${filteredNodes.size} of ${nodes.size} nodes`
              : `${nodes.size} ${nodes.size === 1 ? 'node' : 'nodes'}`}
          </h2>
          <div className="flex items-center gap-2">
            <SaveIndicator
              status={saveStatus}
              errorMessage={saveErrorMessage}
            />
            <button
              type="button"
              onClick={() => saveNow()}
              disabled={!hasUnsavedChanges || isSaving}
              aria-label="Save all changes"
              title="Save all changes (⌘S / Ctrl+S)"
              className={cn(
                'rounded-md p-1.5 transition-colors',
                'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none',
                'dark:focus-visible:ring-forge-accent-dark',
                hasUnsavedChanges && !isSaving
                  ? 'text-forge-accent hover:bg-forge-accent-subtle dark:text-forge-accent-dark dark:hover:bg-forge-accent-subtle-dark'
                  : 'text-forge-muted dark:text-forge-muted-dark cursor-not-allowed'
              )}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
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
          {activeView === 'inventory' && <InventoryView />}
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
                  <span className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-2 block text-sm font-medium">
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
                  className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-2 block text-sm font-medium"
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
              <div className="border-forge-border dark:border-forge-border-dark border-t pt-6">
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

/**
 * Main App component using server persistence (SQLite via Express API)
 */
function App() {
  const project = useProjectStore((state) => state.project)
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId)
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [projectsSynced, setProjectsSynced] = useState(false)
  const [standaloneTool, setStandaloneTool] = useState<'inventory' | null>(null)

  // Initialize server persistence
  const serverPersistence = useServerPersistence()

  // Sync dark mode class with system preference on mount
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (dark: boolean) =>
      document.documentElement.classList.toggle('dark', dark)
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sync projects from server to workspace store
  useEffect(() => {
    const syncProjects = async () => {
      try {
        const { api } = await import('@/lib/api')
        const result = await api.listProjects(true) // includeStats for node count

        if (result.success && Array.isArray(result.data)) {
          const projects = result.data.map(
            (p: {
              id: string
              name: string
              description?: string | null
              created_at: string
              modified_at: string
              node_count?: number
            }) => ({
              id: p.id,
              name: p.name,
              path: '', // Server projects don't have local paths
              description: p.description || undefined,
              nodeCount: p.node_count || 0,
              modifiedAt: new Date(p.modified_at),
            })
          )
          useWorkspaceStore.getState().setProjects(projects)
        }
      } catch (error) {
        console.error('[App] Failed to sync projects from server:', error)
      } finally {
        setProjectsSynced(true)
      }
    }

    syncProjects()
  }, [])

  // Create context value with isInitialized alias for compatibility
  const persistenceContextValue: PersistenceContextValue = {
    ...serverPersistence,
    isInitialized: serverPersistence.isConnected,
  }

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

  // Hide sidebar on welcome/loading screens and standalone tools
  const hideSidebar =
    !activeProjectId ||
    !projectsSynced ||
    serverPersistence.isLoading ||
    !!standaloneTool

  // Determine what to render based on state
  const renderContent = () => {
    // Still syncing project list from server
    if (!projectsSynced) {
      return <LoadingScreen />
    }

    // Standalone tool (e.g. inventory) — no project needed
    if (standaloneTool === 'inventory' && !activeProjectId) {
      return <StandaloneInventory onBack={() => setStandaloneTool(null)} />
    }

    // No project selected - show welcome screen to pick one
    if (!activeProjectId) {
      return (
        <WelcomeScreen onOpenInventory={() => setStandaloneTool('inventory')} />
      )
    }

    // Project selected but still loading data from server
    if (serverPersistence.isLoading) {
      return <LoadingScreen />
    }

    // Show error if connection failed (only when trying to load a project)
    if (serverPersistence.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <p className="text-red-600 dark:text-red-400">
            Failed to connect to server: {serverPersistence.error}
          </p>
          <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark">
            Make sure the server is running: cd server && npm run dev
          </p>
        </div>
      )
    }

    // Have project loaded (from server)
    if (project) {
      return <ProjectWorkspace />
    }

    // Fallback - show welcome screen
    return (
      <WelcomeScreen onOpenInventory={() => setStandaloneTool('inventory')} />
    )
  }

  return (
    <ServerPersistenceContext.Provider value={persistenceContextValue}>
      <AppShell hideSidebar={hideSidebar}>
        {renderContent()}
        <CommandPalette />
        <QuickProjectSwitcher
          open={quickSwitcherOpen}
          onOpenChange={setQuickSwitcherOpen}
        />
      </AppShell>
    </ServerPersistenceContext.Provider>
  )
}

export default App
