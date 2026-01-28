/**
 * Forge API Client
 *
 * Type-safe HTTP client for the Forge Express server API.
 * All methods return Result types for explicit error handling.
 */

import type {
  ApiProject,
  ApiProjectWithStats,
  ApiNode,
  CreateProjectInput,
  UpdateProjectInput,
  CreateNodeInput,
  UpdateNodeInput,
  NodeFilters,
  NodeDependencies,
  ApiResult,
} from './types.js'

/**
 * Get the API base URL
 * - Uses VITE_API_URL env var if set
 * - In production (served by Express), uses relative /api path
 * - In development on localhost, uses localhost:3000
 * - Otherwise derives from current location (for Tailscale, LAN, etc.)
 */
function getDefaultBaseUrl(): string {
  // Environment variable takes precedence
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // In browser
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location

    // Development mode with Vite (typically port 5173)
    // API runs on separate port 3000
    if (import.meta.env.DEV && hostname === 'localhost') {
      return 'http://localhost:3000/api'
    }

    // Production or non-localhost access:
    // Frontend and API served from same origin, use relative URL
    // This works for Docker (port 8099), Home Assistant, Tailscale, etc.
    if (port && port !== '80' && port !== '443') {
      return `${protocol}//${hostname}:${port}/api`
    }
    return `${protocol}//${hostname}/api`
  }

  // Fallback for SSR/tests
  return 'http://localhost:3000/api'
}

const DEFAULT_BASE_URL = getDefaultBaseUrl()

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseUrl?: string
  /** Optional abort signal for cancelling requests */
  signal?: AbortSignal
}

/**
 * Create an API client instance
 */
export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL

  /**
   * Make an HTTP request to the API
   */
  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResult<T>> {
    try {
      const url = `${baseUrl}${path}`
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        signal: config.signal,
      }

      if (body !== undefined) {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)

      // Handle no-content responses (204)
      if (response.status === 204) {
        return { success: true, data: undefined as T }
      }

      const json = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: json.error || `HTTP ${response.status}`,
        }
      }

      return { success: true, data: json.data as T }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request aborted' }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ========== Projects API ==========

  /**
   * List all projects
   */
  async function listProjects(
    includeStats = false
  ): Promise<ApiResult<ApiProject[] | ApiProjectWithStats[]>> {
    const path = includeStats ? '/projects?stats=true' : '/projects'
    return request<ApiProject[] | ApiProjectWithStats[]>('GET', path)
  }

  /**
   * Get a project by ID
   */
  async function getProject(id: string): Promise<ApiResult<ApiProject>> {
    return request<ApiProject>('GET', `/projects/${id}`)
  }

  /**
   * Create a new project
   */
  async function createProject(
    data: CreateProjectInput
  ): Promise<ApiResult<ApiProject>> {
    return request<ApiProject>('POST', '/projects', data)
  }

  /**
   * Update a project
   */
  async function updateProject(
    id: string,
    data: UpdateProjectInput
  ): Promise<ApiResult<ApiProject>> {
    return request<ApiProject>('PUT', `/projects/${id}`, data)
  }

  /**
   * Delete a project
   */
  async function deleteProject(id: string): Promise<ApiResult<void>> {
    return request<void>('DELETE', `/projects/${id}`)
  }

  // ========== Nodes API ==========

  /**
   * Build query string from node filters
   */
  function buildNodeFilterQuery(filters?: NodeFilters): string {
    if (!filters) return ''

    const params = new URLSearchParams()

    if (filters.type) {
      const types = Array.isArray(filters.type)
        ? filters.type.join(',')
        : filters.type
      params.set('type', types)
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status.join(',')
        : filters.status
      params.set('status', statuses)
    }

    if (filters.tags && filters.tags.length > 0) {
      params.set('tags', filters.tags.join(','))
    }

    if (filters.parent_id !== undefined) {
      params.set(
        'parent_id',
        filters.parent_id === null ? 'null' : filters.parent_id
      )
    }

    if (filters.milestone) {
      params.set('milestone', filters.milestone)
    }

    if (filters.q) {
      params.set('q', filters.q)
    }

    const query = params.toString()
    return query ? `?${query}` : ''
  }

  /**
   * List nodes for a project
   */
  async function listNodes(
    projectId: string,
    filters?: NodeFilters
  ): Promise<ApiResult<ApiNode[]>> {
    const query = buildNodeFilterQuery(filters)
    return request<ApiNode[]>('GET', `/projects/${projectId}/nodes${query}`)
  }

  /**
   * Get a node by ID
   */
  async function getNode(
    projectId: string,
    nodeId: string
  ): Promise<ApiResult<ApiNode>> {
    return request<ApiNode>('GET', `/projects/${projectId}/nodes/${nodeId}`)
  }

  /**
   * Create a new node
   */
  async function createNode(
    projectId: string,
    data: CreateNodeInput
  ): Promise<ApiResult<ApiNode>> {
    return request<ApiNode>('POST', `/projects/${projectId}/nodes`, data)
  }

  /**
   * Update a node
   */
  async function updateNode(
    projectId: string,
    nodeId: string,
    data: UpdateNodeInput
  ): Promise<ApiResult<ApiNode>> {
    return request<ApiNode>(
      'PUT',
      `/projects/${projectId}/nodes/${nodeId}`,
      data
    )
  }

  /**
   * Delete a node
   */
  async function deleteNode(
    projectId: string,
    nodeId: string
  ): Promise<ApiResult<void>> {
    return request<void>('DELETE', `/projects/${projectId}/nodes/${nodeId}`)
  }

  // ========== Dependencies API ==========

  /**
   * Get dependencies for a node
   */
  async function getNodeDependencies(
    projectId: string,
    nodeId: string
  ): Promise<ApiResult<NodeDependencies>> {
    return request<NodeDependencies>(
      'GET',
      `/projects/${projectId}/nodes/${nodeId}/dependencies`
    )
  }

  /**
   * Add a dependency to a node
   */
  async function addDependency(
    projectId: string,
    nodeId: string,
    dependsOnId: string
  ): Promise<ApiResult<{ node_id: string; depends_on_id: string }>> {
    return request<{ node_id: string; depends_on_id: string }>(
      'POST',
      `/projects/${projectId}/nodes/${nodeId}/dependencies`,
      { depends_on_id: dependsOnId }
    )
  }

  /**
   * Remove a dependency from a node
   */
  async function removeDependency(
    projectId: string,
    nodeId: string,
    dependsOnId: string
  ): Promise<ApiResult<void>> {
    return request<void>(
      'DELETE',
      `/projects/${projectId}/nodes/${nodeId}/dependencies/${dependsOnId}`
    )
  }

  // ========== Analytics API ==========

  /**
   * Get blocked tasks for a project
   */
  async function getBlockedTasks(
    projectId: string
  ): Promise<ApiResult<ApiNode[]>> {
    return request<ApiNode[]>('GET', `/projects/${projectId}/blocked-tasks`)
  }

  /**
   * Get critical path for a project
   */
  async function getCriticalPath(
    projectId: string
  ): Promise<ApiResult<ApiNode[]>> {
    return request<ApiNode[]>('GET', `/projects/${projectId}/critical-path`)
  }

  return {
    // Projects
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    // Nodes
    listNodes,
    getNode,
    createNode,
    updateNode,
    deleteNode,
    // Dependencies
    getNodeDependencies,
    addDependency,
    removeDependency,
    // Analytics
    getBlockedTasks,
    getCriticalPath,
  }
}

/**
 * API Client type
 */
export type ApiClient = ReturnType<typeof createApiClient>

/**
 * Default API client instance
 */
export const api = createApiClient()
