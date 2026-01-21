/**
 * Project & Workspace Types for Forge
 *
 * Defines TypeScript interfaces for Project, Workspace, and WorkspaceConfig
 * to manage multi-project workspaces and project metadata.
 */

import type { ForgeNode } from './nodes'

// ============================================================================
// Project Metadata
// ============================================================================

/**
 * Metadata associated with a project
 */
export interface ProjectMetadata {
  /** When the project was created */
  createdAt: Date
  /** When the project was last modified */
  modifiedAt: Date
  /** Optional description of the project */
  description?: string
  /** Custom node ordering (array of node IDs) */
  nodeOrder?: string[]
  /** Graph view node positions */
  nodePositions?: Record<string, { x: number; y: number }>
}

// ============================================================================
// Project Interface
// ============================================================================

/**
 * Represents a single Forge project
 *
 * A project is a collection of nodes (decisions, components, tasks, notes)
 * stored in a directory with subdirectories for each node type.
 */
export interface Project {
  /** Unique identifier for the project (slug-based) */
  id: string
  /** Display name of the project */
  name: string
  /** File system path to the project directory */
  path: string
  /** Map of all nodes in the project, keyed by node ID */
  nodes: Map<string, ForgeNode>
  /** Project metadata */
  metadata: ProjectMetadata
}

// ============================================================================
// Workspace Configuration
// ============================================================================

/**
 * Configuration options for a workspace
 */
export interface WorkspaceConfig {
  /** Theme preference: system, light, or dark */
  theme: 'system' | 'light' | 'dark'
  /** Auto-save delay in milliseconds (0 to disable) */
  autoSaveDelay: number
  /** Whether to show the welcome dialog on first run */
  showWelcome: boolean
  /** Default view mode for node lists */
  defaultView: 'outline' | 'graph'
  /** Git integration settings */
  git: {
    /** Whether git integration is enabled */
    enabled: boolean
    /** Whether to auto-commit on save */
    autoCommit: boolean
  }
}

// ============================================================================
// Workspace Interface
// ============================================================================

/**
 * Represents a Forge workspace containing multiple projects
 *
 * A workspace is stored in a .forge directory and contains configuration
 * and references to one or more projects.
 */
export interface Workspace {
  /** Array of projects in this workspace */
  projects: Project[]
  /** ID of the currently active project (null if no project selected) */
  activeProjectId: string | null
  /** Workspace configuration */
  config: WorkspaceConfig
}

// ============================================================================
// Factory Helpers
// ============================================================================

/**
 * Creates default workspace configuration
 */
export function createDefaultWorkspaceConfig(): WorkspaceConfig {
  return {
    theme: 'system',
    autoSaveDelay: 2000,
    showWelcome: true,
    defaultView: 'outline',
    git: {
      enabled: false,
      autoCommit: false,
    },
  }
}

/**
 * Creates default project metadata with current timestamp
 */
export function createProjectMetadata(description?: string): ProjectMetadata {
  const now = new Date()
  return {
    createdAt: now,
    modifiedAt: now,
    description,
  }
}

/**
 * Creates a new empty project
 */
export function createProject(
  id: string,
  name: string,
  path: string,
  description?: string
): Project {
  return {
    id,
    name,
    path,
    nodes: new Map(),
    metadata: createProjectMetadata(description),
  }
}

/**
 * Creates a new empty workspace with default configuration
 */
export function createWorkspace(): Workspace {
  return {
    projects: [],
    activeProjectId: null,
    config: createDefaultWorkspaceConfig(),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the active project from a workspace
 * Returns undefined if no project is active
 */
export function getActiveProject(workspace: Workspace): Project | undefined {
  if (!workspace.activeProjectId) {
    return undefined
  }
  return workspace.projects.find((p) => p.id === workspace.activeProjectId)
}

/**
 * Gets a project by ID from a workspace
 * Returns undefined if project not found
 */
export function getProjectById(
  workspace: Workspace,
  projectId: string
): Project | undefined {
  return workspace.projects.find((p) => p.id === projectId)
}

/**
 * Checks if a workspace has any projects
 */
export function hasProjects(workspace: Workspace): boolean {
  return workspace.projects.length > 0
}

/**
 * Gets the count of nodes in a project by type
 */
export function getNodeCountsByType(project: Project): Record<string, number> {
  const counts: Record<string, number> = {
    decision: 0,
    component: 0,
    task: 0,
    note: 0,
  }

  project.nodes.forEach((node) => {
    counts[node.type] = (counts[node.type] || 0) + 1
  })

  return counts
}
