/**
 * Workspace Store for Forge
 *
 * Manages multiple projects in a workspace, including:
 * - List of available projects
 * - Active project selection
 * - Recent projects tracking
 * - Workspace configuration persistence
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

import type { WorkspaceConfig } from '@/types/project'
import { createDefaultWorkspaceConfig } from '@/types/project'

// ============================================================================
// Types
// ============================================================================

/**
 * Summary info about a project (lightweight, for listing)
 */
export interface ProjectSummary {
  /** Unique project ID */
  id: string
  /** Display name */
  name: string
  /** File system path */
  path: string
  /** Number of nodes in project */
  nodeCount: number
  /** Last modified timestamp */
  modifiedAt: Date
  /** Optional description */
  description?: string
}

/**
 * State shape for the workspace store
 */
export interface WorkspaceState {
  /** List of available projects */
  projects: ProjectSummary[]
  /** ID of the currently active project */
  activeProjectId: string | null
  /** Recently accessed project IDs (most recent first) */
  recentProjectIds: string[]
  /** Workspace configuration */
  config: WorkspaceConfig
  /** Whether the workspace is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Actions available on the workspace store
 */
export interface WorkspaceActions {
  /** Set the list of projects */
  setProjects: (projects: ProjectSummary[]) => void
  /** Add a project to the workspace */
  addProject: (project: ProjectSummary) => void
  /** Update a project's info */
  updateProject: (id: string, updates: Partial<ProjectSummary>) => void
  /** Remove a project from the workspace */
  removeProject: (id: string) => void
  /** Set the active project */
  setActiveProject: (id: string | null) => void
  /** Add a project to recent list */
  addToRecent: (id: string) => void
  /** Get sorted projects (recent first) */
  getSortedProjects: () => ProjectSummary[]
  /** Update workspace config */
  updateConfig: (updates: Partial<WorkspaceConfig>) => void
  /** Clear workspace */
  clearWorkspace: () => void
  /** Set loading state */
  setLoading: (loading: boolean) => void
  /** Set error */
  setError: (error: string | null) => void
}

/**
 * Selectors for querying the workspace store
 */
export interface WorkspaceSelectors {
  /** Get project by ID */
  getProjectById: (id: string) => ProjectSummary | undefined
  /** Get the active project */
  getActiveProject: () => ProjectSummary | undefined
  /** Check if workspace has projects */
  hasProjects: () => boolean
  /** Get recent projects */
  getRecentProjects: (limit?: number) => ProjectSummary[]
}

/**
 * Combined store type
 */
export type WorkspaceStore = WorkspaceState &
  WorkspaceActions &
  WorkspaceSelectors

// ============================================================================
// Initial State
// ============================================================================

const initialWorkspaceState: WorkspaceState = {
  projects: [],
  activeProjectId: null,
  recentProjectIds: [],
  config: createDefaultWorkspaceConfig(),
  isLoading: false,
  error: null,
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...initialWorkspaceState,

        // ========================================================================
        // Actions
        // ========================================================================

        setProjects: (projects) => {
          set({ projects }, false, 'setProjects')
        },

        addProject: (project) => {
          set(
            (state) => ({
              projects: [...state.projects, project],
            }),
            false,
            'addProject'
          )
        },

        updateProject: (id, updates) => {
          set(
            (state) => ({
              projects: state.projects.map((p) =>
                p.id === id ? { ...p, ...updates } : p
              ),
            }),
            false,
            'updateProject'
          )
        },

        removeProject: (id) => {
          set(
            (state) => ({
              projects: state.projects.filter((p) => p.id !== id),
              recentProjectIds: state.recentProjectIds.filter(
                (pid) => pid !== id
              ),
              activeProjectId:
                state.activeProjectId === id ? null : state.activeProjectId,
            }),
            false,
            'removeProject'
          )
        },

        setActiveProject: (id) => {
          set({ activeProjectId: id }, false, 'setActiveProject')
          if (id) {
            get().addToRecent(id)
          }
        },

        addToRecent: (id) => {
          set(
            (state) => {
              // Remove if already exists, add to front
              const filtered = state.recentProjectIds.filter(
                (pid) => pid !== id
              )
              return {
                recentProjectIds: [id, ...filtered].slice(0, 10), // Keep last 10
              }
            },
            false,
            'addToRecent'
          )
        },

        getSortedProjects: () => {
          const state = get()
          const { projects, recentProjectIds } = state

          // Sort by recent first, then by modified date
          return [...projects].sort((a, b) => {
            const aRecentIndex = recentProjectIds.indexOf(a.id)
            const bRecentIndex = recentProjectIds.indexOf(b.id)

            // If both are in recent, sort by recent order
            if (aRecentIndex !== -1 && bRecentIndex !== -1) {
              return aRecentIndex - bRecentIndex
            }

            // Recent items come first
            if (aRecentIndex !== -1) return -1
            if (bRecentIndex !== -1) return 1

            // Otherwise sort by modified date
            return (
              new Date(b.modifiedAt).getTime() -
              new Date(a.modifiedAt).getTime()
            )
          })
        },

        updateConfig: (updates) => {
          set(
            (state) => ({
              config: { ...state.config, ...updates },
            }),
            false,
            'updateConfig'
          )
        },

        clearWorkspace: () => {
          set(initialWorkspaceState, false, 'clearWorkspace')
        },

        setLoading: (loading) => {
          set({ isLoading: loading }, false, 'setLoading')
        },

        setError: (error) => {
          set({ error }, false, 'setError')
        },

        // ========================================================================
        // Selectors
        // ========================================================================

        getProjectById: (id) => {
          return get().projects.find((p) => p.id === id)
        },

        getActiveProject: () => {
          const state = get()
          if (!state.activeProjectId) return undefined
          return state.projects.find((p) => p.id === state.activeProjectId)
        },

        hasProjects: () => {
          return get().projects.length > 0
        },

        getRecentProjects: (limit = 5) => {
          const state = get()
          const { projects, recentProjectIds } = state

          return recentProjectIds
            .slice(0, limit)
            .map((id) => projects.find((p) => p.id === id))
            .filter((p): p is ProjectSummary => p !== undefined)
        },
      }),
      {
        name: 'forge-workspace-store',
        partialize: (state) => ({
          // Only persist these fields
          projects: state.projects,
          activeProjectId: state.activeProjectId,
          recentProjectIds: state.recentProjectIds,
          config: state.config,
        }),
        // Custom storage to handle Date serialization
        storage: {
          getItem: (name: string) => {
            const str = localStorage.getItem(name)
            if (!str) return null

            const parsed = JSON.parse(str)
            // Convert ISO date strings back to Date objects
            if (parsed.state?.projects) {
              parsed.state.projects = parsed.state.projects.map(
                (p: ProjectSummary & { modifiedAt: string | Date }) => ({
                  ...p,
                  modifiedAt: new Date(p.modifiedAt),
                })
              )
            }
            return parsed
          },
          setItem: (name: string, value: unknown) => {
            // Dates are automatically converted to ISO strings by JSON.stringify
            localStorage.setItem(name, JSON.stringify(value))
          },
          removeItem: (name: string) => {
            localStorage.removeItem(name)
          },
        },
      }
    ),
    {
      name: 'forge-workspace-store',
      enabled: import.meta.env.DEV,
    }
  )
)

// ============================================================================
// Standalone Selectors
// ============================================================================

/**
 * Selector to get all projects
 */
export const selectProjects = (state: WorkspaceStore) => state.projects

/**
 * Selector to get active project ID
 */
export const selectActiveProjectId = (state: WorkspaceStore) =>
  state.activeProjectId

/**
 * Selector to get workspace config
 */
export const selectConfig = (state: WorkspaceStore) => state.config

/**
 * Selector to check if loading
 */
export const selectIsLoading = (state: WorkspaceStore) => state.isLoading

/**
 * Selector to get error
 */
export const selectError = (state: WorkspaceStore) => state.error
