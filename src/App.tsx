import { useState, useCallback, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout'
import {
  Button,
  Dialog,
  SaveIndicator,
  useSaveIndicator,
} from '@/components/ui'
import { useProjectStore, useNodesStore, useAppStore } from '@/store'
import { useUndoRedo } from '@/hooks'
import { BrowserFileSystemAdapter } from '@/lib/filesystem/BrowserFileSystemAdapter'
import { initializeProject, slugify } from '@/lib/project'
import { OutlineView, ViewToggle } from '@/components/outline'
import { GraphView } from '@/components/graph'
import { NodeDetailPanel, FrontmatterEditor } from '@/components/detail'
import { MarkdownEditor } from '@/components/editor/MarkdownEditor'
import { CommandPalette } from '@/components/command'
import { DeleteNodeDialog, useDeleteNodeDialog } from '@/components/nodes'
import { ComparisonTable } from '@/components/decision'
import { getAllTagsForClustering } from '@/lib/graph'
import { cn } from '@/lib/utils'
import type { TaskStatus, ForgeNode } from '@/types/nodes'
import { isDecisionNode, type DecisionNode } from '@/types/nodes'

/**
 * Welcome screen shown when no project is loaded
 */
function WelcomeScreen() {
  const [projectName, setProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProject = useProjectStore((state) => state.loadProject)
  const setAdapter = useProjectStore((state) => state.setAdapter)

  const handleCreate = async () => {
    if (!projectName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const adapter = new BrowserFileSystemAdapter()
      await adapter.requestDirectoryAccess()

      const rootPath = adapter.getRootPath()
      const projectPath = `${rootPath}/${slugify(projectName)}`

      const project = await initializeProject(
        adapter,
        projectPath,
        projectName.trim()
      )

      setAdapter(adapter)
      useProjectStore.setState({
        project,
        isDirty: false,
        error: null,
        parseErrors: [],
      })
      useNodesStore.getState().setNodes(project.nodes)

      setDialogOpen(false)
      setProjectName('')
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === 'User cancelled directory selection'
      ) {
        // User cancelled - not an error
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpen = async () => {
    setIsOpening(true)
    setError(null)

    try {
      const adapter = new BrowserFileSystemAdapter()
      await adapter.requestDirectoryAccess()

      const rootPath = adapter.getRootPath()
      if (!rootPath) {
        setError('Failed to access project folder.')
        return
      }

      const success = await loadProject(adapter, rootPath)

      if (!success) {
        setError(
          'Failed to load project. Make sure you selected a valid Forge project folder.'
        )
      }
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === 'User cancelled directory selection'
      ) {
        // User cancelled - not an error
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to open project')
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Welcome to Forge
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Open an existing project or create a new one to get started.
      </p>

      {error && (
        <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-4">
        <Button onClick={handleOpen} disabled={isOpening || isCreating}>
          {isOpening ? 'Opening...' : 'Open Project'}
        </Button>

        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger disabled={isOpening || isCreating}>
            Create New Project
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Popup>
              <Dialog.Title>Create New Project</Dialog.Title>
              <Dialog.Description>
                Enter a name for your new project. You can change this later.
              </Dialog.Description>
              <div className="mt-4">
                <label
                  htmlFor="project-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Project Name
                </label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && projectName.trim()) {
                      handleCreate()
                    }
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                  placeholder="My Hardware Project"
                  autoComplete="off"
                  disabled={isCreating}
                />
              </div>
              <Dialog.Footer>
                <Dialog.Close disabled={isCreating}>Cancel</Dialog.Close>
                <Button
                  onClick={handleCreate}
                  disabled={!projectName.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </Button>
              </Dialog.Footer>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
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
            {nodes.size} {nodes.size === 1 ? 'node' : 'nodes'}
          </h2>
          <SaveIndicator status={saveStatus} errorMessage={saveErrorMessage} />
        </div>
        <ViewToggle value={activeView} onChange={setActiveView} />
      </div>

      {/* Main content area */}
      <div className="flex min-h-0 flex-1">
        {/* Node list / Graph view - tabpanel for ViewToggle tabs */}
        <div
          id={`${activeView}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeView}-tab`}
          className="min-w-0 flex-1 overflow-auto"
        >
          {activeView === 'outline' ? (
            <OutlineView
              nodes={nodes}
              activeNodeId={activeNodeId}
              onNodeSelect={setActiveNode}
              onTaskStatusToggle={handleTaskStatusToggle}
              className="p-4"
            />
          ) : (
            <GraphView
              onNodeSelect={setActiveNode}
              onNodeDelete={handleDeleteNode}
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

  // Enable global undo/redo keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z)
  useUndoRedo({ enableHotkeys: true })

  return (
    <AppShell>
      {project ? <ProjectWorkspace /> : <WelcomeScreen />}
      <CommandPalette />
    </AppShell>
  )
}

export default App
