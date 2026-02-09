/**
 * Forge API Client for MCP Server
 *
 * HTTP client for calling the Express server API from Node.js.
 * Similar to the browser API client but uses native fetch.
 */

/**
 * API Result type
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Node types
 */
export type NodeType =
  | 'task'
  | 'decision'
  | 'component'
  | 'note'
  | 'subsystem'
  | 'assembly'
  | 'module'

/**
 * Project from API
 */
export interface ApiProject {
  id: string
  name: string
  description: string | null
  created_at: string
  modified_at: string
}

/**
 * Node from API
 */
export interface ApiNode {
  id: string
  project_id: string
  type: NodeType
  title: string
  content: string | null
  status: string | null
  priority: string | null
  parent_id: string | null
  milestone: string | null
  created_at: string
  modified_at: string
  tags: string[]
  depends_on: string[]
  // Component extras
  supplier?: string | null
  part_number?: string | null
  cost?: number | null
  datasheet_url?: string | null
  custom_fields?: Record<string, string | number> | null
  // Decision extras
  selected_option?: string | null
  selection_rationale?: string | null
  selected_date?: string | null
  comparison_data?: unknown | null
  // Task extras
  checklist?: unknown[] | null
}

/**
 * Create node input
 */
export interface CreateNodeInput {
  id?: string
  type: NodeType
  title: string
  content?: string
  status?: string
  priority?: string
  parent_id?: string
  milestone?: string
  tags?: string[]
  depends_on?: string[]
  supplier?: string
  part_number?: string
  cost?: number
  datasheet_url?: string
  custom_fields?: Record<string, string | number>
  selected_option?: string
  selection_rationale?: string
  selected_date?: string
  comparison_data?: unknown
  checklist?: unknown[]
}

/**
 * Update node input
 */
export interface UpdateNodeInput {
  title?: string
  content?: string
  status?: string
  priority?: string
  parent_id?: string | null
  milestone?: string | null
  tags?: string[]
  depends_on?: string[]
  supplier?: string | null
  part_number?: string | null
  cost?: number | null
  datasheet_url?: string | null
  custom_fields?: Record<string, string | number> | null
  selected_option?: string | null
  selection_rationale?: string | null
  selected_date?: string | null
  comparison_data?: unknown | null
  checklist?: unknown[] | null
}

/**
 * Create project input
 */
export interface CreateProjectInput {
  id?: string
  name: string
  description?: string
}

/**
 * Node filters
 */
export interface NodeFilters {
  type?: NodeType | NodeType[]
  status?: string | string[]
  tags?: string[]
  parent_id?: string | null
  milestone?: string
  q?: string
}

/**
 * Node dependencies
 */
export interface NodeDependencies {
  depends_on: string[]
  depended_on_by: string[]
}

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseUrl: string
}

/**
 * Component search filters
 */
export interface FindComponentsFilters {
  status?: string
  supplier?: string
  minCost?: number
  maxCost?: number
  tags?: string[]
  query?: string
  limit?: number
}

/**
 * Create an API client for the Forge server
 */
export function createApiClient(config: ApiClientConfig) {
  const { baseUrl } = config

  /**
   * Make an HTTP request
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
      }

      if (body !== undefined) {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)

      // Handle no-content responses
      if (response.status === 204) {
        return { success: true, data: undefined as T }
      }

      const json = (await response.json()) as { data?: T; error?: string }

      if (!response.ok) {
        return {
          success: false,
          error: json.error || `HTTP ${response.status}`,
        }
      }

      return { success: true, data: json.data as T }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ========== Projects API ==========

  async function listProjects(): Promise<ApiResult<ApiProject[]>> {
    return request<ApiProject[]>('GET', '/projects')
  }

  async function getProject(id: string): Promise<ApiResult<ApiProject>> {
    return request<ApiProject>('GET', `/projects/${id}`)
  }

  async function createProject(
    data: CreateProjectInput
  ): Promise<ApiResult<ApiProject>> {
    return request<ApiProject>('POST', '/projects', data)
  }

  // ========== Nodes API ==========

  function buildFilterQuery(filters?: NodeFilters): string {
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

  async function listNodes(
    projectId: string,
    filters?: NodeFilters
  ): Promise<ApiResult<ApiNode[]>> {
    const query = buildFilterQuery(filters)
    return request<ApiNode[]>('GET', `/projects/${projectId}/nodes${query}`)
  }

  async function getNode(
    projectId: string,
    nodeId: string
  ): Promise<ApiResult<ApiNode>> {
    return request<ApiNode>('GET', `/projects/${projectId}/nodes/${nodeId}`)
  }

  async function createNode(
    projectId: string,
    data: CreateNodeInput
  ): Promise<ApiResult<ApiNode>> {
    return request<ApiNode>('POST', `/projects/${projectId}/nodes`, data)
  }

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

  async function deleteNode(
    projectId: string,
    nodeId: string
  ): Promise<ApiResult<void>> {
    return request<void>('DELETE', `/projects/${projectId}/nodes/${nodeId}`)
  }

  // ========== Dependencies API ==========

  async function getNodeDependencies(
    projectId: string,
    nodeId: string
  ): Promise<ApiResult<NodeDependencies>> {
    return request<NodeDependencies>(
      'GET',
      `/projects/${projectId}/nodes/${nodeId}/dependencies`
    )
  }

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

  async function getBlockedTasks(
    projectId: string
  ): Promise<ApiResult<ApiNode[]>> {
    return request<ApiNode[]>('GET', `/projects/${projectId}/blocked-tasks`)
  }

  async function getCriticalPath(
    projectId: string
  ): Promise<ApiResult<ApiNode[]>> {
    return request<ApiNode[]>('GET', `/projects/${projectId}/critical-path`)
  }

  // ========== Component Search API ==========

  async function findComponents(
    projectId: string,
    filters?: FindComponentsFilters
  ): Promise<ApiResult<ApiNode[]>> {
    const params = new URLSearchParams()
    params.set('type', 'component')

    if (filters) {
      if (filters.status) {
        params.set('status', filters.status)
      }
      if (filters.supplier) {
        params.set('supplier', filters.supplier)
      }
      if (filters.minCost !== undefined) {
        params.set('min_cost', String(filters.minCost))
      }
      if (filters.maxCost !== undefined) {
        params.set('max_cost', String(filters.maxCost))
      }
      if (filters.tags && filters.tags.length > 0) {
        params.set('tags', filters.tags.join(','))
      }
      if (filters.query) {
        params.set('q', filters.query)
      }
    }

    const query = params.toString()
    return request<ApiNode[]>(
      'GET',
      `/projects/${projectId}/nodes${query ? `?${query}` : ''}`
    )
  }

  // ========== Inventory API ==========

  async function searchInventory(
    filters?: InventorySearchFilters
  ): Promise<ApiResult<ApiInventoryItem[]>> {
    const params = new URLSearchParams()

    if (filters) {
      if (filters.category) {
        params.set('category', filters.category)
      }
      if (filters.subcategory) {
        params.set('subcategory', filters.subcategory)
      }
      if (filters.status) {
        params.set('status', filters.status)
      }
      if (filters.location) {
        params.set('location', filters.location)
      }
      if (filters.q) {
        params.set('q', filters.q)
      }
      if (filters.limit !== undefined) {
        params.set('limit', String(filters.limit))
      }
      if (filters.low_stock) {
        params.set('low_stock', 'true')
      }
    }

    const query = params.toString()
    return request<ApiInventoryItem[]>(
      'GET',
      `/inventory${query ? `?${query}` : ''}`
    )
  }

  async function getInventoryItem(
    id: string
  ): Promise<ApiResult<ApiInventoryItem>> {
    return request<ApiInventoryItem>('GET', `/inventory/${id}`)
  }

  async function createInventoryItem(
    data: CreateInventoryItemInput
  ): Promise<ApiResult<ApiInventoryItem>> {
    return request<ApiInventoryItem>('POST', '/inventory', data)
  }

  async function updateInventoryQuantity(
    id: string,
    data: UpdateInventoryQuantityInput
  ): Promise<ApiResult<ApiInventoryItem>> {
    return request<ApiInventoryItem>('PATCH', `/inventory/${id}/quantity`, data)
  }

  async function listInventoryCategories(): Promise<
    ApiResult<ApiInventoryCategory[]>
  > {
    return request<ApiInventoryCategory[]>('GET', '/inventory/categories')
  }

  return {
    // Projects
    listProjects,
    getProject,
    createProject,
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
    // Component Search
    findComponents,
    // Inventory
    searchInventory,
    getInventoryItem,
    createInventoryItem,
    updateInventoryQuantity,
    listInventoryCategories,
  }
}

// ========== Inventory Types ==========

export interface ApiInventoryItem {
  id: string
  name: string
  category_id: string
  subcategory_id: string | null
  status: 'owned' | 'wishlist' | 'on_order'
  quantity: number
  low_stock_threshold: number | null
  location: string | null
  supplier: string | null
  supplier_url: string | null
  part_number: string | null
  cost: number | null
  barcode: string | null
  notes: string | null
  image_url: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ApiInventoryCategory {
  id: string
  name: string
  sort_order: number
  subcategories: Array<{
    id: string
    name: string
    sort_order: number
  }>
}

export interface InventorySearchFilters {
  category?: string
  subcategory?: string
  status?: 'owned' | 'wishlist' | 'on_order'
  location?: string
  q?: string
  limit?: number
  /** Filter to items below their individual low_stock_threshold */
  low_stock?: boolean
}

export interface CreateInventoryItemInput {
  name: string
  category_id: string
  subcategory_id?: string | null
  status?: 'owned' | 'wishlist' | 'on_order'
  quantity?: number
  low_stock_threshold?: number | null
  location?: string | null
  supplier?: string | null
  supplier_url?: string | null
  part_number?: string | null
  cost?: number | null
  barcode?: string | null
  notes?: string | null
  image_url?: string | null
  tags?: string[]
}

export interface UpdateInventoryQuantityInput {
  delta: number
}

export type ApiClient = ReturnType<typeof createApiClient>
