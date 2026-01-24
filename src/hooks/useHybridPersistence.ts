/**
 * Hook for managing hybrid persistence with IndexedDB and file system
 *
 * This hook provides:
 * - Initialization from IndexedDB on app load (fast)
 * - Auto-reconnection to file system when permissions are available
 * - Connection status and sync status tracking
 * - Methods for connecting to file system and triggering syncs
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  HybridPersistenceService,
  isHybridPersistenceSupported,
  IndexedDBAdapter,
  SyncService,
  ConflictService,
  type ConnectionStatus,
  type SyncStatus,
  type PersistenceEvent,
  type SyncResult,
  type Conflict,
} from '@/lib/filesystem'
import { loadProject, serializeNode } from '@/lib/project'
import { useNodesStore } from '@/store/useNodesStore'
import { useProjectStore } from '@/store/useProjectStore'
import type { ForgeNode } from '@/types/nodes'
import {
  SYNC_INTERVALS,
  type SyncInterval,
} from '@/components/sync/SyncStatusIndicator'

// Extend Window interface for E2E communication
declare global {
  interface Window {
    __e2eHybridPersistenceReady?: boolean
  }
}

export interface HybridPersistenceState {
  /** Whether the service is initialized */
  isInitialized: boolean
  /** Whether the service is currently loading data */
  isLoading: boolean
  /** Connection status to file system */
  connectionStatus: ConnectionStatus
  /** Sync status with file system */
  syncStatus: SyncStatus
  /** Whether IndexedDB has stored data */
  hasStoredData: boolean
  /** Whether file system permission is needed */
  needsPermission: boolean
  /** Whether sync is in progress */
  isSyncing: boolean
  /** Last sync result */
  lastSyncResult: SyncResult | null
  /** Pending conflicts */
  conflicts: Conflict[]
  /** Error message if any */
  error: string | null
  /** Persistence errors (write/delete failures) that need user attention */
  persistenceErrors: string[]
  /** Whether auto-sync is enabled */
  autoSyncEnabled: boolean
  /** Sync interval in seconds */
  syncInterval: SyncInterval
}

export interface HybridPersistenceActions {
  /** Connect to file system (opens folder picker) */
  connectToFileSystem: () => Promise<boolean>
  /** Request permission for stored handle (must be called from user gesture) */
  requestPermission: () => Promise<boolean>
  /** Disconnect from file system */
  disconnect: (clearHandle?: boolean) => Promise<void>
  /** Sync to file system */
  syncToFileSystem: () => Promise<SyncResult | null>
  /** Sync from file system */
  syncFromFileSystem: () => Promise<SyncResult | null>
  /** Resolve a conflict */
  resolveConflict: (
    conflictId: string,
    resolution: 'keepLocal' | 'keepExternal'
  ) => Promise<boolean>
  /** Clear IndexedDB data (for troubleshooting) */
  clearIndexedDB: () => Promise<void>
  /** Clear persistence errors */
  clearPersistenceErrors: () => void
  /** Set auto-sync enabled */
  setAutoSyncEnabled: (enabled: boolean) => void
  /** Set sync interval in seconds */
  setSyncInterval: (interval: SyncInterval) => void
}

export type UseHybridPersistenceReturn = HybridPersistenceState &
  HybridPersistenceActions

// Default project ID for single-project mode
const DEFAULT_PROJECT_ID = 'default'

// Sync settings localStorage keys
const SYNC_SETTINGS_KEY = 'forge-sync-settings'
const DEFAULT_AUTO_SYNC = true
const DEFAULT_SYNC_INTERVAL: SyncInterval = 30 // seconds

/**
 * Load sync settings from localStorage
 */
function loadSyncSettings(): {
  autoSyncEnabled: boolean
  syncInterval: SyncInterval
} {
  if (typeof window === 'undefined') {
    return {
      autoSyncEnabled: DEFAULT_AUTO_SYNC,
      syncInterval: DEFAULT_SYNC_INTERVAL,
    }
  }
  try {
    const stored = localStorage.getItem(SYNC_SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate syncInterval is a valid SyncInterval value
      const validIntervals = SYNC_INTERVALS.map((i) => i.value)
      const parsedInterval = parsed.syncInterval
      const syncInterval =
        typeof parsedInterval === 'number' &&
        validIntervals.includes(parsedInterval as SyncInterval)
          ? (parsedInterval as SyncInterval)
          : DEFAULT_SYNC_INTERVAL
      return {
        autoSyncEnabled: parsed.autoSyncEnabled ?? DEFAULT_AUTO_SYNC,
        syncInterval,
      }
    }
  } catch {
    // Ignore parse errors
  }
  return {
    autoSyncEnabled: DEFAULT_AUTO_SYNC,
    syncInterval: DEFAULT_SYNC_INTERVAL,
  }
}

/**
 * Save sync settings to localStorage
 */
function saveSyncSettings(settings: {
  autoSyncEnabled: boolean
  syncInterval: SyncInterval
}): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

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
 * Hook for managing hybrid persistence
 */
export function useHybridPersistence(): UseHybridPersistenceReturn {
  // Load sync settings from localStorage on mount
  const initialSyncSettings = loadSyncSettings()

  const [state, setState] = useState<HybridPersistenceState>({
    isInitialized: false,
    isLoading: true,
    connectionStatus: 'disconnected',
    syncStatus: 'idle',
    hasStoredData: false,
    needsPermission: false,
    isSyncing: false,
    lastSyncResult: null,
    conflicts: [],
    error: null,
    persistenceErrors: [],
    autoSyncEnabled: initialSyncSettings.autoSyncEnabled,
    syncInterval: initialSyncSettings.syncInterval,
  })

  // Service references
  const serviceRef = useRef<HybridPersistenceService | null>(null)
  const syncServiceRef = useRef<SyncService | null>(null)
  const conflictServiceRef = useRef<ConflictService | null>(null)

  // Ref to avoid stale closure in background sync interval
  const isSyncingRef = useRef(state.isSyncing)

  // Keep isSyncingRef in sync with state
  useEffect(() => {
    isSyncingRef.current = state.isSyncing
  }, [state.isSyncing])

  // Store actions
  const setNodes = useNodesStore((s) => s.setNodes)
  const loadProjectAction = useProjectStore((s) => s.loadProject)
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
   * Initialize the hybrid persistence service
   */
  useEffect(() => {
    if (!isHybridPersistenceSupported()) {
      setState((prev) => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        error: 'Hybrid persistence is not supported in this browser',
      }))
      return
    }

    let mounted = true
    const service = new HybridPersistenceService(DEFAULT_PROJECT_ID)
    serviceRef.current = service

    // Handle persistence events
    const unsubscribe = service.subscribe((event: PersistenceEvent) => {
      if (!mounted) return

      switch (event.type) {
        case 'connection-changed':
          setState((prev) => ({
            ...prev,
            connectionStatus: event.status,
            needsPermission: event.status === 'permission-needed',
          }))
          break
        case 'sync-changed':
          setState((prev) => ({ ...prev, syncStatus: event.status }))
          break
        case 'permission-request':
          setState((prev) => ({ ...prev, needsPermission: true }))
          break
        case 'error':
          setState((prev) => ({ ...prev, error: event.message }))
          break
      }
    })

    // Initialize the service
    const init = async () => {
      try {
        await service.initialize()

        // Check if we have stored data
        const indexedDBAdapter = service.getIndexedDBAdapter()
        let hasData = false

        if (indexedDBAdapter) {
          // Check if there's any data in IndexedDB
          const files = await indexedDBAdapter.listDirectory('/', {
            recursive: false,
          })
          hasData = files.length > 0

          if (hasData) {
            // Load data from IndexedDB
            await loadFromIndexedDB(indexedDBAdapter)
          }

          // Set up sync service
          syncServiceRef.current = new SyncService(indexedDBAdapter)

          // Connect sync service if we have file system access
          const fsAdapter = service.getFileSystemAdapter()
          if (fsAdapter) {
            syncServiceRef.current.connect(fsAdapter)
            conflictServiceRef.current = new ConflictService(indexedDBAdapter)
            conflictServiceRef.current.connect(fsAdapter)
          }
        }

        if (mounted) {
          setState((prev) => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
            hasStoredData: hasData,
            connectionStatus: service.getConnectionStatus(),
            syncStatus: service.getSyncStatus(),
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
      unsubscribe()
      service.close()
      // Clean up E2E flag
      if (import.meta.env.DEV) {
        window.__e2eHybridPersistenceReady = false
      }
    }
  }, [loadFromIndexedDB])

  /**
   * Subscribe to store changes and sync to IndexedDB
   * This must run AFTER initialization completes to ensure the adapter is ready
   */
  useEffect(() => {
    // Only set up subscription after initialization is complete
    if (!state.isInitialized) return

    const service = serviceRef.current
    if (!service) return

    const indexedDBAdapter = service.getIndexedDBAdapter()
    if (!indexedDBAdapter) return

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
          writePromises.push(writeNodeToIndexedDB(indexedDBAdapter, node))
        }
      }

      // Find deleted nodes (capture type from previous node for efficient lookup)
      for (const [id, previousNode] of previousNodesSnapshot) {
        if (!currentNodes.has(id)) {
          // Node was deleted - remove from IndexedDB
          writePromises.push(
            deleteNodeFromIndexedDB(indexedDBAdapter, id, previousNode.type)
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
        (node) => writeNodeToIndexedDB(indexedDBAdapter, node)
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
   * Connect to file system
   */
  const connectToFileSystem = useCallback(async (): Promise<boolean> => {
    const service = serviceRef.current
    if (!service) return false

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const success = await service.connectToDirectory()

      if (success) {
        const fsAdapter = service.getFileSystemAdapter()
        const indexedDBAdapter = service.getIndexedDBAdapter()
        const rootPath = fsAdapter?.getRootPath()

        if (fsAdapter && rootPath) {
          // Load project from file system
          const loaded = await loadProjectAction(fsAdapter, rootPath)

          if (loaded && indexedDBAdapter) {
            // Sync data to IndexedDB for offline access
            if (syncServiceRef.current) {
              syncServiceRef.current.connect(fsAdapter)
            } else {
              syncServiceRef.current = new SyncService(indexedDBAdapter)
              syncServiceRef.current.connect(fsAdapter)
            }

            // Set up conflict service
            conflictServiceRef.current = new ConflictService(indexedDBAdapter)
            conflictServiceRef.current.connect(fsAdapter)

            // Sync from file system to IndexedDB
            await syncServiceRef.current.syncFromFileSystem()
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          connectionStatus: 'connected',
          syncStatus: 'synced',
          hasStoredData: true,
        }))
        return true
      }

      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to connect',
      }))
      return false
    }
  }, [loadProjectAction])

  /**
   * Request permission for stored handle
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const service = serviceRef.current
    if (!service) return false

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const success = await service.requestPermission()

      if (success) {
        const fsAdapter = service.getFileSystemAdapter()
        const indexedDBAdapter = service.getIndexedDBAdapter()

        if (fsAdapter && indexedDBAdapter) {
          // Set up sync service
          if (syncServiceRef.current) {
            syncServiceRef.current.connect(fsAdapter)
          } else {
            syncServiceRef.current = new SyncService(indexedDBAdapter)
            syncServiceRef.current.connect(fsAdapter)
          }

          // Set up conflict service
          conflictServiceRef.current = new ConflictService(indexedDBAdapter)
          conflictServiceRef.current.connect(fsAdapter)

          // Update project store with file system adapter
          setAdapter(fsAdapter)
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          needsPermission: false,
          connectionStatus: 'connected',
          syncStatus: 'synced',
        }))
        return true
      }

      setState((prev) => ({ ...prev, isLoading: false }))
      return false
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Permission denied',
      }))
      return false
    }
  }, [setAdapter])

  /**
   * Disconnect from file system
   */
  const disconnect = useCallback(async (clearHandle = false): Promise<void> => {
    const service = serviceRef.current
    if (!service) return

    await service.disconnect(clearHandle)

    if (syncServiceRef.current) {
      syncServiceRef.current.disconnect()
    }

    setState((prev) => ({
      ...prev,
      connectionStatus: 'disconnected',
      syncStatus: 'offline',
      needsPermission: false,
    }))
  }, [])

  /**
   * Sync to file system
   */
  const syncToFileSystem = useCallback(async (): Promise<SyncResult | null> => {
    const syncService = syncServiceRef.current
    if (!syncService || !syncService.isConnected()) return null

    setState((prev) => ({ ...prev, isSyncing: true }))

    try {
      const result = await syncService.syncToFileSystem()
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncResult: result,
        syncStatus: result.success ? 'synced' : 'error',
      }))
      return result
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      }))
      return null
    }
  }, [])

  /**
   * Sync from file system
   */
  const syncFromFileSystem =
    useCallback(async (): Promise<SyncResult | null> => {
      const syncService = syncServiceRef.current
      if (!syncService || !syncService.isConnected()) return null

      setState((prev) => ({ ...prev, isSyncing: true }))

      try {
        const result = await syncService.syncFromFileSystem()
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncResult: result,
          syncStatus: result.success ? 'synced' : 'error',
        }))
        return result
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        }))
        return null
      }
    }, [])

  /**
   * Resolve a conflict
   */
  const resolveConflict = useCallback(
    async (
      conflictId: string,
      resolution: 'keepLocal' | 'keepExternal'
    ): Promise<boolean> => {
      const conflictService = conflictServiceRef.current
      if (!conflictService) return false

      try {
        const result = await conflictService.resolveConflict(
          conflictId,
          resolution
        )

        if (result.success) {
          // Update conflicts list
          const pending = conflictService.getPendingConflicts()
          setState((prev) => ({ ...prev, conflicts: pending }))
        }

        return result.success
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to resolve conflict',
        }))
        return false
      }
    },
    []
  )

  /**
   * Clear IndexedDB data
   */
  const clearIndexedDB = useCallback(async (): Promise<void> => {
    const service = serviceRef.current
    const indexedDBAdapter = service?.getIndexedDBAdapter()

    if (indexedDBAdapter) {
      // Close and delete the database
      indexedDBAdapter.close()
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('forge-db')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }

    setState((prev) => ({
      ...prev,
      hasStoredData: false,
      connectionStatus: 'disconnected',
      syncStatus: 'idle',
      persistenceErrors: [],
    }))
  }, [])

  /**
   * Clear persistence errors
   */
  const clearPersistenceErrors = useCallback(() => {
    setState((prev) => ({ ...prev, persistenceErrors: [] }))
  }, [])

  /**
   * Set auto-sync enabled
   */
  const setAutoSyncEnabled = useCallback((enabled: boolean) => {
    setState((prev) => {
      const newSettings = {
        autoSyncEnabled: enabled,
        syncInterval: prev.syncInterval,
      }
      saveSyncSettings(newSettings)
      return { ...prev, autoSyncEnabled: enabled }
    })
  }, [])

  /**
   * Set sync interval
   */
  const setSyncInterval = useCallback((interval: SyncInterval) => {
    setState((prev) => {
      const newSettings = {
        autoSyncEnabled: prev.autoSyncEnabled,
        syncInterval: interval,
      }
      saveSyncSettings(newSettings)
      return { ...prev, syncInterval: interval }
    })
  }, [])

  /**
   * Background sync interval
   * Only syncs to file system when connected and auto-sync is enabled
   */
  useEffect(() => {
    // Only run if initialized, connected, and auto-sync enabled
    if (
      !state.isInitialized ||
      !state.autoSyncEnabled ||
      state.connectionStatus !== 'connected'
    ) {
      return
    }

    const syncService = syncServiceRef.current
    if (!syncService) return

    // Set up interval for background sync
    const intervalId = setInterval(async () => {
      // Don't sync if page is hidden (Page Visibility API)
      if (document.hidden) {
        return
      }

      // Don't sync if already syncing (use ref to avoid stale closure)
      if (isSyncingRef.current) {
        return
      }

      try {
        await syncService.syncToFileSystem()
      } catch (error) {
        console.warn('[useHybridPersistence] Background sync failed:', error)
      }
    }, state.syncInterval * 1000)

    return () => clearInterval(intervalId)
  }, [
    state.isInitialized,
    state.autoSyncEnabled,
    state.connectionStatus,
    state.syncInterval,
  ])

  return {
    ...state,
    connectToFileSystem,
    requestPermission,
    disconnect,
    syncToFileSystem,
    syncFromFileSystem,
    resolveConflict,
    clearIndexedDB,
    clearPersistenceErrors,
    setAutoSyncEnabled,
    setSyncInterval,
  }
}

/**
 * Check if hybrid persistence is supported
 */
export { isHybridPersistenceSupported }
