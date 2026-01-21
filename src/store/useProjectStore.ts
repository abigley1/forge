/**
 * Project Store for Forge
 *
 * Zustand store for managing project state and file system operations.
 * Integrates with the file system adapter for loading and saving projects.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

import type { Project, ProjectMetadata } from '@/types/project'
import type { ForgeNode } from '@/types/nodes'
import type { FileSystemAdapter } from '@/lib/filesystem/types'
import {
  loadProject as loadProjectFromDisk,
  saveNode as saveNodeToDisk,
  deleteNode as deleteNodeFromDisk,
  saveProjectMetadata,
  type ParseError,
} from '@/lib/project'
import { useNodesStore } from './useNodesStore'

// ============================================================================
// Types
// ============================================================================

/**
 * State shape for the project store
 */
export interface ProjectState {
  /** The currently loaded project (null if no project loaded) */
  project: Project | null
  /** The file system adapter being used */
  adapter: FileSystemAdapter | null
  /** Whether the project has unsaved changes */
  isDirty: boolean
  /** Whether a project operation is in progress */
  isLoading: boolean
  /** Error message from the last operation */
  error: string | null
  /** Parse errors encountered while loading */
  parseErrors: ParseError[]
}

/**
 * Actions available on the project store
 */
export interface ProjectActions {
  /** Load a project from the file system */
  loadProject: (adapter: FileSystemAdapter, path: string) => Promise<boolean>
  /** Save a specific node to disk */
  saveNode: (node: ForgeNode) => Promise<boolean>
  /** Save all dirty nodes to disk */
  saveAllDirtyNodes: () => Promise<boolean>
  /** Delete a node from disk */
  deleteNode: (nodeId: string) => Promise<boolean>
  /** Update project metadata */
  updateMetadata: (updates: Partial<ProjectMetadata>) => void
  /** Save project metadata to disk */
  saveMetadata: () => Promise<boolean>
  /** Close the current project */
  closeProject: () => void
  /** Set the file system adapter */
  setAdapter: (adapter: FileSystemAdapter) => void
  /** Clear any error */
  clearError: () => void
  /** Mark the project as dirty */
  markDirty: () => void
  /** Mark the project as clean */
  markClean: () => void
}

/**
 * Selectors for querying the project store
 */
export interface ProjectSelectors {
  /** Get the project name */
  getProjectName: () => string | null
  /** Get the project path */
  getProjectPath: () => string | null
  /** Check if a project is loaded */
  hasProject: () => boolean
  /** Check if the adapter is ready */
  hasAdapter: () => boolean
}

/**
 * Combined store type
 */
export type ProjectStore = ProjectState & ProjectActions & ProjectSelectors

// ============================================================================
// Initial State
// ============================================================================

const initialProjectState: ProjectState = {
  project: null,
  adapter: null,
  isDirty: false,
  isLoading: false,
  error: null,
  parseErrors: [],
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialProjectState,

      // ========================================================================
      // Actions
      // ========================================================================

      loadProject: async (adapter, path) => {
        set(
          { isLoading: true, error: null, parseErrors: [] },
          false,
          'loadProject/start'
        )

        try {
          const result = await loadProjectFromDisk(adapter, path)

          if (result.error || !result.project) {
            set(
              {
                isLoading: false,
                error: result.error || 'Failed to load project',
                parseErrors: result.parseErrors,
              },
              false,
              'loadProject/error'
            )
            return false
          }

          // Update project store
          set(
            {
              project: result.project,
              adapter,
              isLoading: false,
              isDirty: false,
              error: null,
              parseErrors: result.parseErrors,
            },
            false,
            'loadProject/success'
          )

          // Update nodes store with loaded nodes
          useNodesStore.getState().setNodes(result.project.nodes)

          return true
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Unknown error loading project'
          set(
            {
              isLoading: false,
              error: message,
            },
            false,
            'loadProject/exception'
          )
          return false
        }
      },

      saveNode: async (node) => {
        const { adapter, project } = get()

        if (!adapter || !project) {
          set(
            { error: 'No project or adapter available' },
            false,
            'saveNode/noProject'
          )
          return false
        }

        set({ isLoading: true, error: null }, false, 'saveNode/start')

        try {
          const result = await saveNodeToDisk(adapter, project.path, node)

          if (!result.success) {
            set(
              {
                isLoading: false,
                error: result.error || 'Failed to save node',
              },
              false,
              'saveNode/error'
            )
            return false
          }

          // Mark node as clean in nodes store
          useNodesStore.getState().markClean(node.id)

          // Update project's modified date
          set(
            (state) => ({
              isLoading: false,
              project: state.project
                ? {
                    ...state.project,
                    metadata: {
                      ...state.project.metadata,
                      modifiedAt: new Date(),
                    },
                  }
                : null,
            }),
            false,
            'saveNode/success'
          )

          // Check if there are still dirty nodes
          if (!useNodesStore.getState().hasDirtyNodes()) {
            set({ isDirty: false }, false, 'saveNode/allClean')
          }

          return true
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Unknown error saving node'
          set(
            {
              isLoading: false,
              error: message,
            },
            false,
            'saveNode/exception'
          )
          return false
        }
      },

      saveAllDirtyNodes: async () => {
        const nodesStore = useNodesStore.getState()
        const dirtyIds = nodesStore.getDirtyNodeIds()

        if (dirtyIds.length === 0) {
          return true
        }

        set({ isLoading: true, error: null }, false, 'saveAllDirtyNodes/start')

        let allSuccess = true
        const errors: string[] = []

        for (const id of dirtyIds) {
          const node = nodesStore.getNodeById(id)
          if (node) {
            const success = await get().saveNode(node)
            if (!success) {
              allSuccess = false
              errors.push(`Failed to save node: ${id}`)
            }
          }
        }

        if (!allSuccess) {
          set(
            {
              isLoading: false,
              error: errors.join('; '),
            },
            false,
            'saveAllDirtyNodes/partial'
          )
        } else {
          set(
            {
              isLoading: false,
              isDirty: false,
            },
            false,
            'saveAllDirtyNodes/success'
          )
        }

        return allSuccess
      },

      deleteNode: async (nodeId) => {
        const { adapter, project } = get()

        if (!adapter || !project) {
          set(
            { error: 'No project or adapter available' },
            false,
            'deleteNode/noProject'
          )
          return false
        }

        const nodesStore = useNodesStore.getState()
        const node = nodesStore.getNodeById(nodeId)

        if (!node) {
          set(
            { error: `Node not found: ${nodeId}` },
            false,
            'deleteNode/notFound'
          )
          return false
        }

        set({ isLoading: true, error: null }, false, 'deleteNode/start')

        try {
          const success = await deleteNodeFromDisk(adapter, project.path, node)

          if (!success) {
            set(
              {
                isLoading: false,
                error: 'Failed to delete node',
              },
              false,
              'deleteNode/error'
            )
            return false
          }

          // Remove from nodes store
          nodesStore.deleteNode(nodeId)

          // Update project metadata
          set(
            (state) => ({
              isLoading: false,
              project: state.project
                ? {
                    ...state.project,
                    metadata: {
                      ...state.project.metadata,
                      modifiedAt: new Date(),
                    },
                  }
                : null,
            }),
            false,
            'deleteNode/success'
          )

          return true
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Unknown error deleting node'
          set(
            {
              isLoading: false,
              error: message,
            },
            false,
            'deleteNode/exception'
          )
          return false
        }
      },

      updateMetadata: (updates) => {
        set(
          (state) => ({
            project: state.project
              ? {
                  ...state.project,
                  metadata: {
                    ...state.project.metadata,
                    ...updates,
                    modifiedAt: new Date(),
                  },
                }
              : null,
            isDirty: true,
          }),
          false,
          'updateMetadata'
        )
      },

      saveMetadata: async () => {
        const { adapter, project } = get()

        if (!adapter || !project) {
          set(
            { error: 'No project or adapter available' },
            false,
            'saveMetadata/noProject'
          )
          return false
        }

        set({ isLoading: true, error: null }, false, 'saveMetadata/start')

        try {
          await saveProjectMetadata(adapter, project.path, project.metadata)

          set({ isLoading: false }, false, 'saveMetadata/success')
          return true
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Unknown error saving metadata'
          set(
            {
              isLoading: false,
              error: message,
            },
            false,
            'saveMetadata/exception'
          )
          return false
        }
      },

      closeProject: () => {
        // Clear nodes store
        useNodesStore.getState().clearNodes()

        // Reset project store
        set(
          {
            project: null,
            isDirty: false,
            isLoading: false,
            error: null,
            parseErrors: [],
          },
          false,
          'closeProject'
        )
      },

      setAdapter: (adapter) => {
        set({ adapter }, false, 'setAdapter')
      },

      clearError: () => {
        set({ error: null }, false, 'clearError')
      },

      markDirty: () => {
        set({ isDirty: true }, false, 'markDirty')
      },

      markClean: () => {
        set({ isDirty: false }, false, 'markClean')
      },

      // ========================================================================
      // Selectors
      // ========================================================================

      getProjectName: () => {
        return get().project?.name ?? null
      },

      getProjectPath: () => {
        return get().project?.path ?? null
      },

      hasProject: () => {
        return get().project !== null
      },

      hasAdapter: () => {
        return get().adapter !== null
      },
    }),
    {
      name: 'forge-project-store',
      enabled: import.meta.env.DEV,
    }
  )
)

// ============================================================================
// Standalone Selectors
// ============================================================================

/**
 * Selector to get the project
 */
export const selectProject = (state: ProjectStore) => state.project

/**
 * Selector to check if loading
 */
export const selectIsLoading = (state: ProjectStore) => state.isLoading

/**
 * Selector to check if dirty
 */
export const selectIsDirty = (state: ProjectStore) => state.isDirty

/**
 * Selector to get error
 */
export const selectError = (state: ProjectStore) => state.error

/**
 * Selector to get parse errors
 */
export const selectParseErrors = (state: ProjectStore) => state.parseErrors
