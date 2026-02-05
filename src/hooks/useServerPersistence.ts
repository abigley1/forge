/**
 * Server Persistence Hook
 *
 * Manages persistence of nodes via the Express server API.
 * Replaces IndexedDB persistence with server-backed storage.
 *
 * This hook provides:
 * - Server initialization and connection
 * - Auto-save of nodes to server on store changes
 * - Project switching support
 * - Optimistic updates with error handling
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  api,
  apiNodesToForgeNodes,
  forgeNodeToCreateInput,
  forgeNodeToUpdateInput,
} from '@/lib/api'
import type { ApiNode } from '@/lib/api'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { ForgeNode } from '@/types/nodes'
import { createProject } from '@/types/project'

// Extend Window interface for E2E communication
declare global {
  interface Window {
    __e2eServerPersistenceReady?: boolean
  }
}

export interface ServerPersistenceState {
  /** Whether the service is connected to the server */
  isConnected: boolean
  /** Whether the service is currently loading data */
  isLoading: boolean
  /** Whether the server has data for this project */
  hasStoredData: boolean
  /** Error message if any */
  error: string | null
  /** Persistence errors (write/delete failures) that need user attention */
  persistenceErrors: string[]
}

export interface ServerPersistenceActions {
  /** Refresh data from server */
  refresh: () => Promise<void>
  /** Clear persistence errors */
  clearPersistenceErrors: () => void
}

export type UseServerPersistenceReturn = ServerPersistenceState &
  ServerPersistenceActions

/**
 * Result type for loadFromServer
 * Distinguishes between: successful load with data, successful load with no data,
 * error during load, and stale load (project changed during async operation)
 */
export type LoadResult =
  | { status: 'success'; hasData: boolean }
  | { status: 'error'; error: string }
  | { status: 'stale' }

/**
 * Hook for managing server persistence
 */
export function useServerPersistence(): UseServerPersistenceReturn {
  const [state, setState] = useState<ServerPersistenceState>({
    isConnected: false,
    isLoading: true,
    hasStoredData: false,
    error: null,
    persistenceErrors: [],
  })

  // Get active project ID from workspace store
  const activeProjectId = useWorkspaceStore((s) => s.activeProjectId)

  // Track current project ID to detect switches
  const currentProjectIdRef = useRef<string | null>(null)

  // Store actions
  const setNodes = useNodesStore((s) => s.setNodes)
  const setActiveNode = useNodesStore((s) => s.setActiveNode)
  const markClean = useNodesStore((s) => s.markClean)

  /**
   * Handle persistence errors by accumulating them
   */
  const handlePersistenceError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      persistenceErrors: [...prev.persistenceErrors.slice(-9), error], // Keep last 10
    }))
  }, [])

  /**
   * Load data from server into stores
   * Returns a LoadResult that distinguishes between:
   * - success with data
   * - success with no data (empty project)
   * - error
   * - stale (project changed during async operation)
   */
  const loadFromServer = useCallback(
    async (projectId: string): Promise<LoadResult> => {
      try {
        // Fetch all nodes for the project
        const result = await api.listNodes(projectId)

        if (!result.success) {
          console.warn(
            '[useServerPersistence] Failed to load from server:',
            result.error
          )
          return { status: 'error', error: result.error }
        }

        // Check if project ID changed during async load - if so, skip store updates
        if (currentProjectIdRef.current !== projectId) {
          console.log(
            `[useServerPersistence] Skipping stale load for "${projectId}", current is "${currentProjectIdRef.current}"`
          )
          return { status: 'stale' }
        }

        const apiNodes = result.data as ApiNode[]

        if (apiNodes.length === 0) {
          return { status: 'success', hasData: false }
        }

        // Convert API nodes to ForgeNodes
        const forgeNodes = apiNodesToForgeNodes(apiNodes)

        // Set nodes in store
        setNodes(forgeNodes)

        return { status: 'success', hasData: true }
      } catch (error) {
        console.warn(
          '[useServerPersistence] Failed to load from server:',
          error
        )
        return {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
    [setNodes]
  )

  /**
   * Refresh data from server
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!activeProjectId) return

    setState((prev) => ({ ...prev, isLoading: true }))

    const result = await loadFromServer(activeProjectId)

    if (result.status === 'stale') {
      // Project changed during refresh - don't update state
      return
    }

    if (result.status === 'error') {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error,
      }))
      return
    }

    setState((prev) => ({ ...prev, isLoading: false }))
  }, [activeProjectId, loadFromServer])

  /**
   * Initialize connection to server and load project data
   */
  useEffect(() => {
    if (!activeProjectId) {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: false,
        hasStoredData: false,
      }))
      return
    }

    // Check if this is a project switch
    const isProjectSwitch = currentProjectIdRef.current !== activeProjectId
    if (isProjectSwitch) {
      console.log(
        `[useServerPersistence] Switching from project "${currentProjectIdRef.current}" to "${activeProjectId}"`
      )

      // Reset state for new project
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isLoading: true,
        hasStoredData: false,
        error: null,
        persistenceErrors: [],
      }))
    }
    currentProjectIdRef.current = activeProjectId

    let mounted = true

    const init = async () => {
      try {
        // Get project info from workspace store
        const workspaceProjects = useWorkspaceStore.getState().projects
        const projectInfo = workspaceProjects.find(
          (p) => p.id === activeProjectId
        )

        // Handle missing project info - this indicates a workspace/state inconsistency
        if (!projectInfo) {
          console.error(
            `[useServerPersistence] Project info not found in workspace: ${activeProjectId}`
          )
          if (mounted) {
            setState((prev) => ({
              ...prev,
              isConnected: false,
              isLoading: false,
              error: `Project not found in workspace: ${activeProjectId}`,
            }))
          }
          return
        }

        // First check if the project exists on the server
        const projectResult = await api.getProject(activeProjectId)

        // Check if project ID changed during async call - if so, abort
        if (currentProjectIdRef.current !== activeProjectId) {
          console.log(
            `[useServerPersistence] Aborting stale init for "${activeProjectId}" after getProject, current is "${currentProjectIdRef.current}"`
          )
          return
        }

        if (!projectResult.success) {
          // Project doesn't exist on server - create it
          if (projectInfo) {
            const createResult = await api.createProject({
              id: activeProjectId,
              name: projectInfo.name,
              description: projectInfo.description,
            })

            // Check again after create call
            if (currentProjectIdRef.current !== activeProjectId) {
              console.log(
                `[useServerPersistence] Aborting stale init for "${activeProjectId}" after createProject, current is "${currentProjectIdRef.current}"`
              )
              return
            }

            if (!createResult.success) {
              throw new Error(
                `Failed to create project on server: ${createResult.error}`
              )
            }
          }
        }

        // Load nodes from server
        const loadResult = await loadFromServer(activeProjectId)

        // Handle stale load - project changed during async operation
        if (loadResult.status === 'stale') {
          return
        }

        // Handle error
        if (loadResult.status === 'error') {
          throw new Error(`Failed to load nodes: ${loadResult.error}`)
        }

        const hasData = loadResult.hasData

        // Always set up the project in the project store
        // (Previously this only happened when !hasData, causing projects with nodes to not load)
        if (projectInfo) {
          const project = createProject(
            projectInfo.id,
            projectInfo.name,
            projectInfo.path,
            projectInfo.description
          )

          useProjectStore.setState({
            project,
            isDirty: false,
            error: null,
            parseErrors: [],
          })

          // If no data was loaded, also clear nodes and active node
          if (!hasData) {
            setNodes(new Map())
            setActiveNode(null)
          }
        }

        if (mounted) {
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isLoading: false,
            hasStoredData: hasData,
          }))

          // Signal to E2E tests
          if (import.meta.env.DEV) {
            window.__e2eServerPersistenceReady = true
          }
        }
      } catch (error) {
        console.error('[useServerPersistence] Initialization failed:', error)
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to connect',
          }))

          // Signal to E2E tests (even on error)
          if (import.meta.env.DEV) {
            window.__e2eServerPersistenceReady = true
          }
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (import.meta.env.DEV) {
        window.__e2eServerPersistenceReady = false
      }
    }
  }, [activeProjectId, loadFromServer, setNodes, setActiveNode])

  /**
   * Subscribe to store changes and sync to server
   */
  useEffect(() => {
    // Only set up subscription after connection is established
    if (!state.isConnected || !activeProjectId) return

    const projectId = activeProjectId

    // Track previous nodes to detect changes
    let previousNodes = new Map(useNodesStore.getState().nodes)

    /**
     * Create a node on the server
     * Skips if project changed during operation
     */
    const createNodeOnServer = async (node: ForgeNode): Promise<void> => {
      // Check for stale operation before making API call
      if (currentProjectIdRef.current !== projectId) {
        console.log(
          `[useServerPersistence] Skipping stale create for ${node.id}`
        )
        return
      }

      const input = forgeNodeToCreateInput(node)
      const result = await api.createNode(projectId, input)

      // Check again after API call - project may have changed
      if (currentProjectIdRef.current !== projectId) {
        return
      }

      if (result.success) {
        // Mark node as clean since it's now saved to server
        markClean(node.id)
      } else {
        handlePersistenceError(
          `Failed to save "${node.title}": ${result.error}`
        )
      }
    }

    /**
     * Update a node on the server
     * Skips if project changed during operation
     */
    const updateNodeOnServer = async (
      node: ForgeNode,
      previousNode: ForgeNode
    ): Promise<void> => {
      // Check for stale operation before making API call
      if (currentProjectIdRef.current !== projectId) {
        console.log(
          `[useServerPersistence] Skipping stale update for ${node.id}`
        )
        return
      }

      const updates = forgeNodeToUpdateInput(previousNode, node)
      const result = await api.updateNode(projectId, node.id, updates)

      // Check again after API call - project may have changed
      if (currentProjectIdRef.current !== projectId) {
        return
      }

      if (result.success) {
        // Mark node as clean since it's now saved to server
        markClean(node.id)
      } else {
        handlePersistenceError(
          `Failed to update "${node.title}": ${result.error}`
        )
      }
    }

    /**
     * Delete a node from the server
     * Skips if project changed during operation
     */
    const deleteNodeFromServer = async (nodeId: string): Promise<void> => {
      // Check for stale operation before making API call
      if (currentProjectIdRef.current !== projectId) {
        console.log(
          `[useServerPersistence] Skipping stale delete for ${nodeId}`
        )
        return
      }

      const result = await api.deleteNode(projectId, nodeId)

      // Check again after API call - project may have changed
      if (currentProjectIdRef.current !== projectId) {
        return
      }

      if (!result.success) {
        handlePersistenceError(`Failed to delete node: ${result.error}`)
      }
    }

    /**
     * Process store changes and sync to server
     * Operations are sequenced: creates → updates → deletes
     * This prevents race conditions where a node depends on another being created
     */
    const processChanges = async (
      currentNodes: Map<string, ForgeNode>,
      previousNodesSnapshot: Map<string, ForgeNode>
    ) => {
      const creates: Promise<void>[] = []
      const updates: Promise<void>[] = []
      const deletes: Promise<void>[] = []

      // Find added or updated nodes
      for (const [id, node] of currentNodes) {
        const previousNode = previousNodesSnapshot.get(id)

        if (!previousNode) {
          // Node was added - create on server
          creates.push(createNodeOnServer(node))
        } else if (previousNode !== node) {
          // Node was updated - update on server
          updates.push(updateNodeOnServer(node, previousNode))
        }
      }

      // Find deleted nodes
      for (const [id] of previousNodesSnapshot) {
        if (!currentNodes.has(id)) {
          // Node was deleted - delete from server
          deletes.push(deleteNodeFromServer(id))
        }
      }

      // Sequence operations: creates first, then updates, then deletes
      // This ensures dependencies exist before nodes that reference them
      await Promise.all(creates)
      await Promise.all(updates)
      await Promise.all(deletes)
    }

    // Subscribe to nodes store changes
    const unsubscribe = useNodesStore.subscribe((storeState) => {
      const currentNodes = storeState.nodes
      const previousNodesSnapshot = new Map(previousNodes)
      previousNodes = new Map(currentNodes)

      // Update workspace store node count
      if (currentNodes.size !== previousNodesSnapshot.size) {
        const activeId = useWorkspaceStore.getState().activeProjectId
        if (activeId) {
          useWorkspaceStore.getState().updateProject(activeId, {
            nodeCount: currentNodes.size,
            modifiedAt: new Date(),
          })
        }
      }

      // Process async but don't block
      processChanges(currentNodes, previousNodesSnapshot).catch((error) => {
        console.error(
          '[useServerPersistence] Unexpected error in processChanges:',
          error
        )
        handlePersistenceError(
          `Sync error: ${error instanceof Error ? error.message : 'Unknown'}`
        )
      })
    })

    return unsubscribe
  }, [state.isConnected, activeProjectId, handlePersistenceError, markClean])

  /**
   * Clear persistence errors
   */
  const clearPersistenceErrors = useCallback(() => {
    setState((prev) => ({ ...prev, persistenceErrors: [] }))
  }, [])

  return {
    ...state,
    refresh,
    clearPersistenceErrors,
  }
}

/**
 * Check if the server API is available
 */
export async function isServerAvailable(): Promise<boolean> {
  try {
    const result = await api.listProjects()
    return result.success
  } catch {
    return false
  }
}
