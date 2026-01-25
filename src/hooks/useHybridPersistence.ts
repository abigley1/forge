/**
 * Hook for managing IndexedDB persistence
 *
 * This hook provides:
 * - IndexedDB initialization on app load
 * - Auto-save of nodes to IndexedDB on store changes
 * - Project switching support
 * - clearIndexedDB() for troubleshooting
 *
 * Note: File system sync has been removed in favor of on-demand export.
 * Use the "Save to Folder" feature in Project Settings to export to file system.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { IndexedDBAdapter, isIndexedDBSupported } from '@/lib/filesystem'
import { loadProject, serializeNode } from '@/lib/project'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { ForgeNode } from '@/types/nodes'
import { createProject } from '@/types/project'

// Extend Window interface for E2E communication
declare global {
  interface Window {
    __e2eHybridPersistenceReady?: boolean
  }
}

export interface IndexedDBPersistenceState {
  /** Whether the service is initialized */
  isInitialized: boolean
  /** Whether the service is currently loading data */
  isLoading: boolean
  /** Whether IndexedDB has stored data */
  hasStoredData: boolean
  /** Error message if any */
  error: string | null
  /** Persistence errors (write/delete failures) that need user attention */
  persistenceErrors: string[]
}

export interface IndexedDBPersistenceActions {
  /** Clear IndexedDB data (for troubleshooting) */
  clearIndexedDB: () => Promise<void>
  /** Clear persistence errors */
  clearPersistenceErrors: () => void
}

export type UseHybridPersistenceReturn = IndexedDBPersistenceState &
  IndexedDBPersistenceActions

// Default project ID for single-project mode
const DEFAULT_PROJECT_ID = 'default'

/**
 * Get the file path for a node based on its type
 */
function getNodePath(node: ForgeNode): string {
  const typeDirectories: Record<string, string> = {
    decision: 'decisions',
    component: 'components',
    task: 'tasks',
    note: 'notes',
    subsystem: 'subsystems',
    assembly: 'assemblies',
    module: 'modules',
  }

  const dir = typeDirectories[node.type] ?? 'notes'
  return `/${dir}/${node.id}.md`
}

/**
 * Result type for persistence operations
 */
interface PersistenceOperationResult {
  success: boolean
  error?: string
}

/**
 * Write a node to IndexedDB
 * Returns a result object instead of throwing - caller decides how to handle failures
 */
async function writeNodeToIndexedDB(
  adapter: IndexedDBAdapter,
  node: ForgeNode
): Promise<PersistenceOperationResult> {
  try {
    const path = getNodePath(node)
    const content = serializeNode(node)
    await adapter.writeFile(path, content)
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(
      '[useHybridPersistence] Failed to write node to IndexedDB:',
      error
    )
    return {
      success: false,
      error: `Failed to save "${node.title}": ${message}`,
    }
  }
}

/**
 * Delete a node from IndexedDB
 * Takes the node type to avoid O(n) directory search
 * Returns a result object instead of throwing - caller decides how to handle failures
 */
async function deleteNodeFromIndexedDB(
  adapter: IndexedDBAdapter,
  nodeId: string,
  nodeType?: string
): Promise<PersistenceOperationResult> {
  try {
    // If we have the node type, use it directly
    if (nodeType) {
      const typeDirectories: Record<string, string> = {
        decision: 'decisions',
        component: 'components',
        task: 'tasks',
        note: 'notes',
        subsystem: 'subsystems',
        assembly: 'assemblies',
        module: 'modules',
      }
      const dir = typeDirectories[nodeType] ?? 'notes'
      const path = `/${dir}/${nodeId}.md`
      const exists = await adapter.exists(path)
      if (exists) {
        await adapter.delete(path)
      }
      return { success: true }
    }

    // Fallback: search all directories if type is unknown
    const typeDirectories = [
      'decisions',
      'components',
      'tasks',
      'notes',
      'subsystems',
      'assemblies',
      'modules',
    ]

    for (const dir of typeDirectories) {
      const path = `/${dir}/${nodeId}.md`
      const exists = await adapter.exists(path)
      if (exists) {
        await adapter.delete(path)
        return { success: true }
      }
    }
    return { success: true } // Node not found - consider it deleted
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(
      '[useHybridPersistence] Failed to delete node from IndexedDB:',
      error
    )
    return {
      success: false,
      error: `Failed to delete node "${nodeId}": ${message}`,
    }
  }
}

/**
 * Hook for managing IndexedDB persistence
 */
export function useHybridPersistence(): UseHybridPersistenceReturn {
  const [state, setState] = useState<IndexedDBPersistenceState>({
    isInitialized: false,
    isLoading: true,
    hasStoredData: false,
    error: null,
    persistenceErrors: [],
  })

  // IndexedDB adapter reference
  const adapterRef = useRef<IndexedDBAdapter | null>(null)

  // Get active project ID from workspace store
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)
  const projectId = activeProjectId || DEFAULT_PROJECT_ID

  // Track current project ID to detect switches
  const currentProjectIdRef = useRef<string>(projectId)

  // Store actions
  const setNodes = useNodesStore((s) => s.setNodes)
  const setActiveNode = useNodesStore((s) => s.setActiveNode)
  const setAdapter = useProjectStore((s) => s.setAdapter)

  /**
   * Load data from IndexedDB into stores
   */
  const loadFromIndexedDB = useCallback(
    async (adapter: IndexedDBAdapter): Promise<boolean> => {
      try {
        // Get the stored project path
        const handleInfo = await adapter.getStoredDirectoryHandle()
        const projectPath = handleInfo?.projectPath ?? '/'

        // Load project using the IndexedDB adapter
        const result = await loadProject(adapter, projectPath)

        if (!result.project) {
          // No data or invalid data - not an error, just empty
          return false
        }

        // Set nodes in store (project.nodes is already a Map)
        setNodes(result.project.nodes)

        // Set the project in the project store so the UI shows the workspace
        useProjectStore.setState({
          project: result.project,
          isDirty: false,
          error: null,
          parseErrors: result.parseErrors ?? [],
        })

        // Update project store with IndexedDB adapter
        setAdapter(adapter)

        return true
      } catch (error) {
        console.warn(
          '[useHybridPersistence] Failed to load from IndexedDB:',
          error
        )
        return false
      }
    },
    [setNodes, setAdapter]
  )

  /**
   * Initialize IndexedDB
   * Re-runs when projectId changes to switch projects
   */
  useEffect(() => {
    if (!isIndexedDBSupported()) {
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        error: 'IndexedDB is not supported in this browser',
      }))
      return
    }

    // Check if this is a project switch
    const isProjectSwitch = currentProjectIdRef.current !== projectId
    if (isProjectSwitch) {
      console.log(
        `[useHybridPersistence] Switching from project "${currentProjectIdRef.current}" to "${projectId}"`
      )
      // Clean up old adapter
      if (adapterRef.current) {
        adapterRef.current.close()
        adapterRef.current = null
      }

      // Reset state for new project
      setState((prev) => ({
        ...prev,
        isInitialized: false,
        isLoading: true,
        hasStoredData: false,
        error: null,
        persistenceErrors: [],
      }))
    }
    currentProjectIdRef.current = projectId

    let mounted = true

    const init = async () => {
      try {
        // Create IndexedDB adapter (it initializes lazily on first use)
        const adapter = new IndexedDBAdapter(projectId)
        adapterRef.current = adapter

        // Get project info from workspace store (needed for project name)
        const workspaceProjects = useWorkspaceStore.getState().projects
        const projectInfo = workspaceProjects.find((p) => p.id === projectId)

        // Set the project name on the adapter so loadProject can use it
        if (projectInfo) {
          adapter.setProjectName(projectInfo.name)
        }

        // Check if we have stored data
        let hasData = false
        try {
          const files = await adapter.listDirectory('/', { recursive: false })
          hasData = files.length > 0
        } catch {
          // Directory may not exist yet for new projects
          hasData = false
        }

        // Load data from IndexedDB
        let loadedSuccessfully = false
        if (hasData) {
          loadedSuccessfully = await loadFromIndexedDB(adapter)
        }

        // If no data loaded, create an empty project from workspace metadata
        if (!loadedSuccessfully && projectInfo) {
          // Create empty project with workspace metadata
          const emptyProject = createProject(
            projectInfo.id,
            projectInfo.name,
            projectInfo.path,
            projectInfo.description
          )

          // Set up the project store with the empty project
          useProjectStore.setState({
            project: emptyProject,
            isDirty: false,
            error: null,
            parseErrors: [],
          })

          // Update project store with IndexedDB adapter
          setAdapter(adapter)

          // Clear nodes for new/empty project
          setNodes(new Map())
          setActiveNode(null)
        }
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
            hasStoredData: hasData,
          }))
          // Signal to E2E tests that hybrid persistence is ready
          if (import.meta.env.DEV) {
            window.__e2eHybridPersistenceReady = true
          }
        }
      } catch (error) {
        console.error('[useHybridPersistence] Initialization failed:', error)
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
            error:
              error instanceof Error ? error.message : 'Failed to initialize',
          }))
          // Signal to E2E tests that hybrid persistence is ready (even on error)
          if (import.meta.env.DEV) {
            window.__e2eHybridPersistenceReady = true
          }
        }
      }
    }

    init()

    return () => {
      mounted = false
      // Clean up E2E flag
      if (import.meta.env.DEV) {
        window.__e2eHybridPersistenceReady = false
      }
    }
  }, [projectId, loadFromIndexedDB, setNodes, setActiveNode])

  /**
   * Subscribe to store changes and sync to IndexedDB
   * This must run AFTER initialization completes to ensure the adapter is ready
   */
  useEffect(() => {
    // Only set up subscription after initialization is complete
    if (!state.isInitialized) return

    const adapter = adapterRef.current
    if (!adapter) return

    // Track previous nodes to detect changes
    // Use current state as baseline (may already have data from E2E setup)
    let previousNodes = new Map(useNodesStore.getState().nodes)

    /**
     * Handle persistence errors by accumulating them and updating state
     */
    const handlePersistenceError = (error: string) => {
      setState((prev) => ({
        ...prev,
        persistenceErrors: [...prev.persistenceErrors.slice(-9), error], // Keep last 10 errors
      }))
    }

    /**
     * Process write operations for changed nodes
     */
    const processWriteOperations = async (
      currentNodes: Map<string, ForgeNode>,
      previousNodesSnapshot: Map<string, ForgeNode>
    ) => {
      const writePromises: Promise<PersistenceOperationResult>[] = []

      // Find added or updated nodes
      for (const [id, node] of currentNodes) {
        const previousNode = previousNodesSnapshot.get(id)
        if (!previousNode || previousNode !== node) {
          // Node was added or updated - write to IndexedDB
          writePromises.push(writeNodeToIndexedDB(adapter, node))
        }
      }

      // Find deleted nodes (capture type from previous node for efficient lookup)
      for (const [id, previousNode] of previousNodesSnapshot) {
        if (!currentNodes.has(id)) {
          // Node was deleted - remove from IndexedDB
          writePromises.push(
            deleteNodeFromIndexedDB(adapter, id, previousNode.type)
          )
        }
      }

      // Wait for all operations and collect errors
      const results = await Promise.all(writePromises)
      for (const result of results) {
        if (!result.success && result.error) {
          handlePersistenceError(result.error)
        }
      }
    }

    // Subscribe to nodes store changes
    const unsubscribe = useNodesStore.subscribe((storeState) => {
      const currentNodes = storeState.nodes
      const previousNodesSnapshot = new Map(previousNodes)
      previousNodes = new Map(currentNodes)

      // Update workspace store node count if it changed
      if (currentNodes.size !== previousNodesSnapshot.size) {
        const activeId = useWorkspaceStore.getState().activeProjectId
        if (activeId) {
          useWorkspaceStore.getState().updateProject(activeId, {
            nodeCount: currentNodes.size,
            modifiedAt: new Date(),
          })
        }
      }

      // Process async but don't block the subscription
      processWriteOperations(currentNodes, previousNodesSnapshot).catch(
        (error) => {
          console.error(
            '[useHybridPersistence] Unexpected error in processWriteOperations:',
            error
          )
          handlePersistenceError(
            `Unexpected persistence error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      )
    })

    // If there's existing data in the store (from E2E setup), write it to IndexedDB now
    const currentNodes = useNodesStore.getState().nodes
    if (currentNodes.size > 0) {
      const initialWritePromises = Array.from(currentNodes.values()).map(
        (node) => writeNodeToIndexedDB(adapter, node)
      )
      Promise.all(initialWritePromises)
        .then((results) => {
          for (const result of results) {
            if (!result.success && result.error) {
              handlePersistenceError(result.error)
            }
          }
        })
        .catch((error) => {
          console.error(
            '[useHybridPersistence] Failed to write initial nodes:',
            error
          )
          handlePersistenceError(
            `Failed to initialize persistence: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        })
    }

    return unsubscribe
  }, [state.isInitialized])

  /**
   * Clear IndexedDB data
   */
  const clearIndexedDB = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current

    if (adapter) {
      // Close and delete the database
      adapter.close()
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('forge-db')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }

    setState((prev) => ({
      ...prev,
      hasStoredData: false,
      persistenceErrors: [],
    }))
  }, [])

  /**
   * Clear persistence errors
   */
  const clearPersistenceErrors = useCallback(() => {
    setState((prev) => ({ ...prev, persistenceErrors: [] }))
  }, [])

  return {
    ...state,
    clearIndexedDB,
    clearPersistenceErrors,
  }
}

/**
 * Check if IndexedDB persistence is supported
 */
export { isIndexedDBSupported as isHybridPersistenceSupported }
