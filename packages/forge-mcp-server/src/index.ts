#!/usr/bin/env node
/**
 * Forge MCP Server
 *
 * Model Context Protocol server that exposes Forge project operations
 * to AI agents like Claude Code.
 *
 * Usage:
 *   FORGE_API_URL=http://localhost:3000/api forge-mcp-server
 *
 * Or configure in Claude Code settings:
 *   {
 *     "mcpServers": {
 *       "forge": {
 *         "command": "npx",
 *         "args": ["forge-mcp-server"],
 *         "env": {
 *           "FORGE_API_URL": "http://localhost:3000/api"
 *         }
 *       }
 *     }
 *   }
 *
 * Optional: Set FORGE_PROJECT_ID to auto-select a project on startup.
 *
 * Legacy mode (filesystem-based) still supported:
 *   FORGE_PROJECT_PATH=/path/to/project forge-mcp-server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import {
  CreateNodeInputSchema,
  UpdateNodeInputSchema,
  SearchNodesInputSchema,
  DeleteNodeInputSchema,
  type ForgeNode,
  type Project,
} from './types.js'
import {
  loadProject,
  saveNode,
  deleteNode as deleteNodeFromFs,
  createNode as createNodeInMemory,
  updateNode as updateNodeInMemory,
  searchNodes as searchNodesInMemory,
  listProjects,
} from './project-loader.js'
import {
  buildDependencyGraph,
  wouldCreateCycle,
  getBlockedTasks as getBlockedTasksFromMemory,
  getCriticalPath as getCriticalPathFromMemory,
} from './dependency-utils.js'
import type { TaskNode, ComponentNode } from './types.js'
import { createApiClient, type ApiClient, type ApiNode } from './api-client.js'

// ============================================================================
// Configuration
// ============================================================================

interface ServerConfig {
  mode: 'api' | 'filesystem'
  // API mode
  apiUrl?: string
  projectId?: string
  // Filesystem mode (legacy)
  projectPath?: string
  workspacePath?: string
}

let apiClient: ApiClient | null = null

// Track current project ID (can be changed via switch_project tool)
let currentProjectId: string | null = null

function loadConfig(): ServerConfig {
  const apiUrl = process.env.FORGE_API_URL
  const projectId = process.env.FORGE_PROJECT_ID
  const projectPath = process.env.FORGE_PROJECT_PATH
  const workspacePath = process.env.FORGE_WORKSPACE_PATH

  // Prefer API mode if URL is set (project ID is optional)
  if (apiUrl) {
    apiClient = createApiClient({ baseUrl: apiUrl })
    // Set initial project if provided
    if (projectId) {
      currentProjectId = projectId
    }
    return {
      mode: 'api',
      apiUrl,
      projectId,
    }
  }

  // Fall back to filesystem mode
  if (projectPath) {
    return {
      mode: 'filesystem',
      projectPath,
      workspacePath,
    }
  }

  console.error('Error: Missing required configuration')
  console.error('API mode: Set FORGE_API_URL (FORGE_PROJECT_ID is optional)')
  console.error('Filesystem mode: Set FORGE_PROJECT_PATH')
  process.exit(1)
}

/**
 * Get the current project ID, throwing an error if none is selected
 */
function requireProjectId(): string {
  if (!currentProjectId) {
    throw new Error(
      'No project selected. Use list_projects to see available projects, then switch_project to select one.'
    )
  }
  return currentProjectId
}

// ============================================================================
// Server State
// ============================================================================

let currentProject: Project | null = null
let config: ServerConfig

// ============================================================================
// Helper Functions
// ============================================================================

function formatNodeForLLM(node: ForgeNode): Record<string, unknown> {
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    tags: node.tags,
    created: node.dates.created,
    modified: node.dates.modified,
    content:
      node.content.substring(0, 500) + (node.content.length > 500 ? '...' : ''),
    parent: node.parent,
    ...(node.type === 'task' && {
      status: (node as { status: string }).status,
      priority: (node as { priority: string }).priority,
      dependsOn: (node as { dependsOn: string[] }).dependsOn,
    }),
    ...(node.type === 'decision' && {
      status: (node as { status: string }).status,
      selected: (node as { selected?: string }).selected,
    }),
    ...(node.type === 'component' && {
      status: (node as { status: string }).status,
      cost: (node as { cost?: number }).cost,
      supplier: (node as { supplier?: string }).supplier,
      partNumber: (node as { partNumber?: string }).partNumber,
    }),
    ...(['subsystem', 'assembly', 'module'].includes(node.type) && {
      status: (node as { status: string }).status,
    }),
  }
}

/**
 * Format an API node for LLM output
 */
function formatApiNodeForLLM(node: ApiNode): Record<string, unknown> {
  return {
    id: node.id,
    type: node.type,
    title: node.title,
    tags: node.tags,
    created: node.created_at,
    modified: node.modified_at,
    content:
      (node.content ?? '').substring(0, 500) +
      ((node.content?.length ?? 0) > 500 ? '...' : ''),
    parent: node.parent_id,
    ...(node.type === 'task' && {
      status: node.status,
      priority: node.priority,
      dependsOn: node.depends_on,
    }),
    ...(node.type === 'decision' && {
      status: node.status,
      selected: node.selected_option,
    }),
    ...(node.type === 'component' && {
      status: node.status,
      cost: node.cost,
      supplier: node.supplier,
      partNumber: node.part_number,
    }),
    ...(['subsystem', 'assembly', 'module'].includes(node.type) && {
      status: node.status,
    }),
  }
}

/**
 * Check if we're in API mode
 */
function isApiMode(): boolean {
  return config.mode === 'api' && apiClient !== null
}

async function ensureProjectLoaded(): Promise<Project> {
  if (config.mode === 'api') {
    // In API mode, we don't use the Project object for storage
    // Return a minimal project for compatibility
    if (!currentProject) {
      currentProject = {
        id: requireProjectId(),
        name: requireProjectId(),
        path: '',
        nodes: new Map(),
        metadata: {
          name: requireProjectId(),
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      }
    }
    return currentProject
  }

  // Filesystem mode
  if (!currentProject && config.projectPath) {
    currentProject = await loadProject(config.projectPath)
  }
  if (!currentProject) {
    throw new Error('No project loaded')
  }
  return currentProject
}

// ============================================================================
// Tool Handlers
// ============================================================================

async function handleCreateNode(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = CreateNodeInputSchema.parse(args)

  if (isApiMode()) {
    // API mode - create via HTTP
    const result = await apiClient!.createNode(requireProjectId(), {
      type: input.type,
      title: input.title,
      content: input.content,
      status: input.status,
      priority: input.priority,
      parent_id: input.parent,
      tags: input.tags,
      depends_on: input.dependsOn,
      supplier: input.supplier,
      part_number: input.partNumber,
      cost: input.cost,
    })

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Created ${result.data.type} node: ${result.data.title}`,
              node: formatApiNodeForLLM(result.data),
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const node = createNodeInMemory(input)
  project.nodes.set(node.id, node)
  await saveNode(config.projectPath!, node)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            message: `Created ${node.type} node: ${node.title}`,
            node: formatNodeForLLM(node),
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleUpdateNode(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = UpdateNodeInputSchema.parse(args)

  if (isApiMode()) {
    // API mode - update via HTTP
    const result = await apiClient!.updateNode(requireProjectId(), input.id, {
      title: input.title,
      content: input.content,
      status: input.status,
      priority: input.priority,
      parent_id: input.parent,
      tags: input.tags,
      depends_on: input.dependsOn,
      supplier: input.supplier,
      part_number: input.partNumber,
      cost: input.cost,
    })

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Updated ${result.data.type} node: ${result.data.title}`,
              node: formatApiNodeForLLM(result.data),
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const existing = project.nodes.get(input.id)
  if (!existing) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Node not found: ${input.id}`,
          }),
        },
      ],
    }
  }

  const updated = updateNodeInMemory(existing, input)
  project.nodes.set(updated.id, updated)
  await saveNode(config.projectPath!, updated)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            message: `Updated ${updated.type} node: ${updated.title}`,
            node: formatNodeForLLM(updated),
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleDeleteNode(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = DeleteNodeInputSchema.parse(args)

  if (isApiMode()) {
    // API mode - first get the node to get its info, then delete
    const getResult = await apiClient!.getNode(requireProjectId(), input.id)
    if (!getResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Node not found: ${input.id}`,
            }),
          },
        ],
      }
    }

    const nodeInfo = getResult.data
    const result = await apiClient!.deleteNode(requireProjectId(), input.id)

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Deleted ${nodeInfo.type} node: ${nodeInfo.title}`,
            deletedId: input.id,
          }),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const node = project.nodes.get(input.id)
  if (!node) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Node not found: ${input.id}`,
          }),
        },
      ],
    }
  }

  await deleteNodeFromFs(config.projectPath!, node.id, node.type)
  project.nodes.delete(input.id)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Deleted ${node.type} node: ${node.title}`,
          deletedId: node.id,
        }),
      },
    ],
  }
}

async function handleSearchNodes(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const input = SearchNodesInputSchema.parse(args)

  if (isApiMode()) {
    // API mode - use listNodes with filters
    const result = await apiClient!.listNodes(requireProjectId(), {
      type: input.type as ApiNode['type'],
      status: input.status,
      tags: input.tags,
      parent_id: input.parent,
      q: input.query,
    })

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    let nodes = result.data
    if (input.limit) {
      nodes = nodes.slice(0, input.limit)
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: nodes.length,
              nodes: nodes.map(formatApiNodeForLLM),
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const results = searchNodesInMemory(project.nodes, input)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            count: results.length,
            nodes: results.map(formatNodeForLLM),
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleGetNode(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { id } = args as { id: string }

  if (!id) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Node ID is required',
          }),
        },
      ],
    }
  }

  if (isApiMode()) {
    // API mode - get via HTTP
    const result = await apiClient!.getNode(requireProjectId(), id)

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Node not found: ${id}`,
            }),
          },
        ],
      }
    }

    // Return full content for get_node
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              node: {
                ...formatApiNodeForLLM(result.data),
                content: result.data.content, // Full content
              },
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const node = project.nodes.get(id)
  if (!node) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Node not found: ${id}`,
          }),
        },
      ],
    }
  }

  // Return full content for get_node
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            node: {
              ...formatNodeForLLM(node),
              content: node.content, // Full content
            },
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleListProjects(): Promise<{
  content: Array<{ type: string; text: string }>
}> {
  if (isApiMode()) {
    // API mode - list projects via HTTP
    const result = await apiClient!.listProjects()

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: result.data.length,
              projects: result.data.map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
              })),
              currentProject: currentProjectId
                ? {
                    id: currentProjectId,
                    name:
                      result.data.find((p) => p.id === currentProjectId)
                        ?.name || currentProjectId,
                  }
                : null,
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const workspacePath = config.workspacePath || config.projectPath + '/..'
  const projects = await listProjects(workspacePath)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            count: projects.length,
            projects,
            currentProject: currentProject
              ? {
                  id: currentProject.id,
                  name: currentProject.name,
                  path: currentProject.path,
                }
              : null,
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleSwitchProject(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { projectId } = args as { projectId: string }

  if (!projectId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'projectId is required',
          }),
        },
      ],
    }
  }

  if (isApiMode()) {
    // Verify the project exists
    const result = await apiClient!.getProject(projectId)

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Project not found: ${projectId}`,
            }),
          },
        ],
      }
    }

    // Switch to the project
    currentProjectId = projectId
    currentProject = null // Clear cached project

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Switched to project: ${result.data.name}`,
              project: {
                id: result.data.id,
                name: result.data.name,
                description: result.data.description,
              },
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode - not supported for switching
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Project switching is only supported in API mode',
        }),
      },
    ],
  }
}

// ============================================================================
// Advanced Tool Handlers (Task 15.7)
// ============================================================================

async function handleAddDependency(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { taskId, dependsOnId } = args as {
    taskId: string
    dependsOnId: string
  }

  if (!taskId || !dependsOnId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'taskId and dependsOnId are required',
          }),
        },
      ],
    }
  }

  if (isApiMode()) {
    // API mode - add dependency via HTTP
    const result = await apiClient!.addDependency(
      requireProjectId(),
      taskId,
      dependsOnId
    )

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    // Get the updated task to return
    const taskResult = await apiClient!.getNode(requireProjectId(), taskId)
    const depResult = await apiClient!.getNode(requireProjectId(), dependsOnId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Added dependency: ${taskResult.success ? taskResult.data.title : taskId} now depends on ${depResult.success ? depResult.data.title : dependsOnId}`,
            task: taskResult.success
              ? formatApiNodeForLLM(taskResult.data)
              : null,
          }),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const task = project.nodes.get(taskId)
  const dependency = project.nodes.get(dependsOnId)

  if (!task) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Task not found: ${taskId}`,
          }),
        },
      ],
    }
  }

  if (!dependency) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Dependency node not found: ${dependsOnId}`,
          }),
        },
      ],
    }
  }

  if (task.type !== 'task') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Node ${taskId} is not a task`,
          }),
        },
      ],
    }
  }

  const taskNode = task as TaskNode

  // Check for existing dependency
  if (taskNode.dependsOn.includes(dependsOnId)) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Dependency already exists',
          }),
        },
      ],
    }
  }

  // Check for cycle
  const graph = buildDependencyGraph(project.nodes)
  if (wouldCreateCycle(graph, dependsOnId, taskId)) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Adding this dependency would create a cycle',
          }),
        },
      ],
    }
  }

  // Add the dependency
  const updated = updateNodeInMemory(taskNode, {
    id: taskId,
    dependsOn: [...taskNode.dependsOn, dependsOnId],
  }) as TaskNode

  project.nodes.set(taskId, updated)
  await saveNode(config.projectPath!, updated)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Added dependency: ${task.title} now depends on ${dependency.title}`,
          task: formatNodeForLLM(updated),
        }),
      },
    ],
  }
}

async function handleRemoveDependency(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { taskId, dependsOnId } = args as {
    taskId: string
    dependsOnId: string
  }

  if (!taskId || !dependsOnId) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'taskId and dependsOnId are required',
          }),
        },
      ],
    }
  }

  if (isApiMode()) {
    // API mode - remove dependency via HTTP
    const result = await apiClient!.removeDependency(
      requireProjectId(),
      taskId,
      dependsOnId
    )

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    // Get the updated task to return
    const taskResult = await apiClient!.getNode(requireProjectId(), taskId)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Removed dependency from ${taskResult.success ? taskResult.data.title : taskId}`,
            task: taskResult.success
              ? formatApiNodeForLLM(taskResult.data)
              : null,
          }),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const task = project.nodes.get(taskId)
  if (!task || task.type !== 'task') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Task not found: ${taskId}`,
          }),
        },
      ],
    }
  }

  const taskNode = task as TaskNode
  if (!taskNode.dependsOn.includes(dependsOnId)) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Dependency does not exist',
          }),
        },
      ],
    }
  }

  const updated = updateNodeInMemory(taskNode, {
    id: taskId,
    dependsOn: taskNode.dependsOn.filter((d) => d !== dependsOnId),
  }) as TaskNode

  project.nodes.set(taskId, updated)
  await saveNode(config.projectPath!, updated)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Removed dependency from ${task.title}`,
          task: formatNodeForLLM(updated),
        }),
      },
    ],
  }
}

async function handleGetBlockedTasks(): Promise<{
  content: Array<{ type: string; text: string }>
}> {
  if (isApiMode()) {
    // API mode - get blocked tasks via HTTP
    const result = await apiClient!.getBlockedTasks(requireProjectId())

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    // Get all nodes to resolve dependency info
    const allNodesResult = await apiClient!.listNodes(requireProjectId())
    const nodesMap = new Map<string, ApiNode>()
    if (allNodesResult.success) {
      for (const node of allNodesResult.data) {
        nodesMap.set(node.id, node)
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: result.data.length,
              blockedTasks: result.data.map((t) => ({
                ...formatApiNodeForLLM(t),
                blockedBy: t.depends_on.map((depId) => {
                  const dep = nodesMap.get(depId)
                  return dep
                    ? { id: depId, title: dep.title, type: dep.type }
                    : { id: depId, title: 'Unknown', type: 'unknown' }
                }),
              })),
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const blocked = getBlockedTasksFromMemory(project.nodes)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            count: blocked.length,
            blockedTasks: blocked.map((t) => ({
              ...formatNodeForLLM(t),
              blockedBy: t.dependsOn.map((depId) => {
                const dep = project.nodes.get(depId)
                return dep
                  ? { id: depId, title: dep.title, type: dep.type }
                  : { id: depId, title: 'Unknown', type: 'unknown' }
              }),
            })),
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleGetCriticalPath(): Promise<{
  content: Array<{ type: string; text: string }>
}> {
  if (isApiMode()) {
    // API mode - get critical path via HTTP
    const result = await apiClient!.getCriticalPath(requireProjectId())

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              length: result.data.length,
              description:
                result.data.length > 0
                  ? `The critical path has ${result.data.length} tasks that must be completed in sequence`
                  : 'No critical path found (no incomplete tasks with dependencies)',
              criticalPath: result.data.map((t, i) => ({
                step: i + 1,
                ...formatApiNodeForLLM(t),
              })),
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const criticalPath = getCriticalPathFromMemory(project.nodes)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            length: criticalPath.length,
            description:
              criticalPath.length > 0
                ? `The critical path has ${criticalPath.length} tasks that must be completed in sequence`
                : 'No critical path found (no incomplete tasks with dependencies)',
            criticalPath: criticalPath.map((t, i) => ({
              step: i + 1,
              ...formatNodeForLLM(t),
            })),
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleBulkUpdate(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { updates } = args as {
    updates: Array<{
      id: string
      status?: string
      priority?: 'high' | 'medium' | 'low'
      tags?: string[]
    }>
  }

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'updates array is required and must not be empty',
          }),
        },
      ],
    }
  }

  if (isApiMode()) {
    // API mode - bulk update via HTTP (update nodes one by one)
    const results: Array<{ id: string; success: boolean; error?: string }> = []

    for (const update of updates) {
      const { id, ...fields } = update
      if (!id) {
        results.push({ id: 'unknown', success: false, error: 'id is required' })
        continue
      }

      try {
        const result = await apiClient!.updateNode(requireProjectId(), id, {
          status: fields.status,
          priority: fields.priority,
          tags: fields.tags,
        })

        if (!result.success) {
          results.push({ id, success: false, error: result.error })
        } else {
          results.push({ id, success: true })
        }
      } catch (error) {
        results.push({
          id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: successCount === updates.length,
              message: `Updated ${successCount}/${updates.length} nodes`,
              results,
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  const results: Array<{ id: string; success: boolean; error?: string }> = []

  for (const update of updates) {
    const { id, ...fields } = update
    if (!id) {
      results.push({ id: 'unknown', success: false, error: 'id is required' })
      continue
    }

    const node = project.nodes.get(id)
    if (!node) {
      results.push({ id, success: false, error: 'Node not found' })
      continue
    }

    try {
      const updated = updateNodeInMemory(node, { id, ...fields })
      project.nodes.set(id, updated)
      await saveNode(config.projectPath!, updated)
      results.push({ id, success: true })
    } catch (error) {
      results.push({
        id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const successCount = results.filter((r) => r.success).length

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: successCount === updates.length,
            message: `Updated ${successCount}/${updates.length} nodes`,
            results,
          },
          null,
          2
        ),
      },
    ],
  }
}

async function handleFindComponents(
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const { status, supplier, minCost, maxCost, tags, query, limit } = args as {
    status?: string
    supplier?: string
    minCost?: number
    maxCost?: number
    tags?: string[]
    query?: string
    limit?: number
  }

  if (isApiMode()) {
    // API mode - find components via HTTP
    const result = await apiClient!.findComponents(requireProjectId(), {
      status,
      supplier,
      minCost,
      maxCost,
      tags,
      query,
      limit,
    })

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: result.error,
            }),
          },
        ],
      }
    }

    // Calculate total cost
    const totalCost = result.data.reduce((sum, c) => sum + (c.cost || 0), 0)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              count: result.data.length,
              totalCost: totalCost.toFixed(2),
              components: result.data.map((c) => ({
                ...formatApiNodeForLLM(c),
                cost: c.cost,
                supplier: c.supplier,
                partNumber: c.part_number,
                datasheetUrl: c.datasheet_url,
              })),
            },
            null,
            2
          ),
        },
      ],
    }
  }

  // Filesystem mode
  const project = await ensureProjectLoaded()
  let components = Array.from(project.nodes.values()).filter(
    (n) => n.type === 'component'
  ) as ComponentNode[]

  if (status) {
    components = components.filter((c) => c.status === status)
  }

  if (supplier) {
    const lowerSupplier = supplier.toLowerCase()
    components = components.filter((c) =>
      c.supplier?.toLowerCase().includes(lowerSupplier)
    )
  }

  if (minCost !== undefined) {
    components = components.filter(
      (c) => c.cost !== undefined && c.cost >= minCost
    )
  }

  if (maxCost !== undefined) {
    components = components.filter(
      (c) => c.cost !== undefined && c.cost <= maxCost
    )
  }

  if (tags && tags.length > 0) {
    components = components.filter((c) =>
      tags.some((tag) => c.tags.includes(tag))
    )
  }

  if (query) {
    const lowerQuery = query.toLowerCase()
    components = components.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.content.toLowerCase().includes(lowerQuery) ||
        c.partNumber?.toLowerCase().includes(lowerQuery)
    )
  }

  const limitedResults = components.slice(0, limit || 50)

  // Calculate total cost
  const totalCost = limitedResults.reduce((sum, c) => sum + (c.cost || 0), 0)

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            success: true,
            count: limitedResults.length,
            totalCost: totalCost.toFixed(2),
            components: limitedResults.map((c) => ({
              ...formatNodeForLLM(c),
              cost: c.cost,
              supplier: c.supplier,
              partNumber: c.partNumber,
              supplierUrl: c.supplierUrl,
            })),
          },
          null,
          2
        ),
      },
    ],
  }
}

// ============================================================================
// Main Server Setup
// ============================================================================

async function main() {
  config = loadConfig()

  const server = new Server(
    {
      name: 'forge-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  )

  // -------------------------------------------------------------------------
  // List Tools Handler
  // -------------------------------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'list_projects',
          description:
            'List all available Forge projects. Use this to see what projects exist before selecting one with switch_project.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'switch_project',
          description:
            'Switch to a different Forge project. All subsequent operations will use this project until switched again.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: {
                type: 'string',
                description: 'ID of the project to switch to',
              },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'create_node',
          description:
            'Create a new node in the Forge project. Supports task, decision, component, note, subsystem, assembly, and module types.',
          inputSchema: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: [
                  'task',
                  'decision',
                  'component',
                  'note',
                  'subsystem',
                  'assembly',
                  'module',
                ],
                description: 'Type of node to create',
              },
              title: {
                type: 'string',
                description: 'Title of the node',
              },
              content: {
                type: 'string',
                description: 'Markdown content for the node body',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags to categorize the node',
              },
              parent: {
                type: 'string',
                description:
                  'ID of parent container node (subsystem/assembly/module)',
              },
              status: {
                type: 'string',
                description:
                  'Status (type-specific: pending, in_progress, etc.)',
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Priority level (for tasks)',
              },
              dependsOn: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs of nodes this task depends on',
              },
              cost: {
                type: 'number',
                description: 'Cost in dollars (for components)',
              },
              supplier: {
                type: 'string',
                description: 'Supplier name (for components)',
              },
              partNumber: {
                type: 'string',
                description: 'Part number (for components)',
              },
            },
            required: ['type', 'title'],
          },
        },
        {
          name: 'update_node',
          description:
            'Update an existing node in the Forge project. Only provide fields you want to change.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the node to update',
              },
              title: {
                type: 'string',
                description: 'New title',
              },
              content: {
                type: 'string',
                description: 'New markdown content',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'New tags (replaces existing)',
              },
              parent: {
                type: 'string',
                description: 'New parent container ID',
              },
              status: {
                type: 'string',
                description: 'New status',
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'New priority (for tasks)',
              },
              dependsOn: {
                type: 'array',
                items: { type: 'string' },
                description: 'New dependency IDs (for tasks)',
              },
              cost: {
                type: 'number',
                description: 'New cost (for components)',
              },
              supplier: {
                type: 'string',
                description: 'New supplier (for components)',
              },
              partNumber: {
                type: 'string',
                description: 'New part number (for components)',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'delete_node',
          description: 'Delete a node from the Forge project.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the node to delete',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'search_nodes',
          description:
            'Search for nodes in the project. Filter by type, status, tags, parent, or free-text query.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Free-text search in title and content',
              },
              type: {
                type: 'string',
                enum: [
                  'task',
                  'decision',
                  'component',
                  'note',
                  'subsystem',
                  'assembly',
                  'module',
                ],
                description: 'Filter by node type',
              },
              status: {
                type: 'string',
                description: 'Filter by status',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags (any match)',
              },
              parent: {
                type: 'string',
                description: 'Filter by parent container ID',
              },
              limit: {
                type: 'number',
                description: 'Maximum results to return (default 50)',
              },
            },
          },
        },
        {
          name: 'get_node',
          description:
            'Get a single node by ID with its full content and metadata.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the node to retrieve',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_projects',
          description: 'List all Forge projects in the workspace directory.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'add_dependency',
          description:
            'Add a dependency between two task nodes. The dependent task will be blocked until the dependency is complete.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'ID of the task that will depend on another',
              },
              dependsOnId: {
                type: 'string',
                description: 'ID of the task to depend on',
              },
            },
            required: ['taskId', 'dependsOnId'],
          },
        },
        {
          name: 'remove_dependency',
          description: 'Remove a dependency between two task nodes.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId: {
                type: 'string',
                description: 'ID of the task to remove dependency from',
              },
              dependsOnId: {
                type: 'string',
                description: 'ID of the dependency to remove',
              },
            },
            required: ['taskId', 'dependsOnId'],
          },
        },
        {
          name: 'get_blocked_tasks',
          description:
            'Get all tasks that are blocked by incomplete dependencies.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_critical_path',
          description:
            'Get the critical path through incomplete tasks (longest chain of dependent tasks).',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'bulk_update',
          description:
            'Update multiple nodes at once. Useful for batch status changes.',
          inputSchema: {
            type: 'object',
            properties: {
              updates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Node ID to update' },
                    status: { type: 'string', description: 'New status' },
                    priority: {
                      type: 'string',
                      enum: ['high', 'medium', 'low'],
                      description: 'New priority',
                    },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'New tags',
                    },
                  },
                  required: ['id'],
                },
                description: 'Array of node updates to apply',
              },
            },
            required: ['updates'],
          },
        },
        {
          name: 'find_components',
          description:
            'Find components by supplier, price range, status, tags, or free-text query.',
          inputSchema: {
            type: 'object',
            properties: {
              supplier: {
                type: 'string',
                description:
                  'Filter by supplier name (case-insensitive partial match)',
              },
              minCost: {
                type: 'number',
                description: 'Minimum cost filter',
              },
              maxCost: {
                type: 'number',
                description: 'Maximum cost filter',
              },
              status: {
                type: 'string',
                description: 'Filter by component status',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by tags (any match)',
              },
              query: {
                type: 'string',
                description:
                  'Free-text search in title, content, and part number',
              },
              limit: {
                type: 'number',
                description: 'Maximum results to return (default 50)',
              },
            },
          },
        },
      ],
    }
  })

  // -------------------------------------------------------------------------
  // Call Tool Handler
  // -------------------------------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      switch (name) {
        case 'create_node':
          return await handleCreateNode(args ?? {})
        case 'update_node':
          return await handleUpdateNode(args ?? {})
        case 'delete_node':
          return await handleDeleteNode(args ?? {})
        case 'search_nodes':
          return await handleSearchNodes(args ?? {})
        case 'get_node':
          return await handleGetNode(args ?? {})
        case 'list_projects':
          return await handleListProjects()
        case 'switch_project':
          return await handleSwitchProject(args ?? {})
        case 'add_dependency':
          return await handleAddDependency(args ?? {})
        case 'remove_dependency':
          return await handleRemoveDependency(args ?? {})
        case 'get_blocked_tasks':
          return await handleGetBlockedTasks()
        case 'get_critical_path':
          return await handleGetCriticalPath()
        case 'bulk_update':
          return await handleBulkUpdate(args ?? {})
        case 'find_components':
          return await handleFindComponents(args ?? {})
        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: message,
            }),
          },
        ],
      }
    }
  })

  // -------------------------------------------------------------------------
  // List Resources Handler
  // -------------------------------------------------------------------------
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const project = await ensureProjectLoaded()

    return {
      resources: [
        {
          uri: `forge://project/${project.id}`,
          name: `Project: ${project.name}`,
          description: `Forge project with ${project.nodes.size} nodes`,
          mimeType: 'application/json',
        },
        {
          uri: `forge://nodes/all`,
          name: 'All Nodes',
          description: 'List of all nodes in the current project',
          mimeType: 'application/json',
        },
        {
          uri: `forge://nodes/tasks`,
          name: 'Tasks',
          description: 'All task nodes',
          mimeType: 'application/json',
        },
        {
          uri: `forge://nodes/decisions`,
          name: 'Decisions',
          description: 'All decision nodes',
          mimeType: 'application/json',
        },
        {
          uri: `forge://nodes/components`,
          name: 'Components',
          description: 'All component nodes',
          mimeType: 'application/json',
        },
      ],
    }
  })

  // -------------------------------------------------------------------------
  // Read Resource Handler
  // -------------------------------------------------------------------------
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params
    const project = await ensureProjectLoaded()

    if (uri === `forge://project/${project.id}`) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                id: project.id,
                name: project.name,
                path: project.path,
                nodeCount: project.nodes.size,
                metadata: project.metadata,
              },
              null,
              2
            ),
          },
        ],
      }
    }

    if (uri === 'forge://nodes/all') {
      const nodes = Array.from(project.nodes.values())
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                count: nodes.length,
                nodes: nodes.map(formatNodeForLLM),
              },
              null,
              2
            ),
          },
        ],
      }
    }

    const typeMatch = uri.match(/forge:\/\/nodes\/(\w+)$/)
    if (typeMatch) {
      const type = typeMatch[1].replace(/s$/, '') // Remove trailing 's'
      const nodes = Array.from(project.nodes.values()).filter(
        (n) => n.type === type
      )
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                count: nodes.length,
                nodes: nodes.map(formatNodeForLLM),
              },
              null,
              2
            ),
          },
        ],
      }
    }

    throw new Error(`Unknown resource: ${uri}`)
  })

  // -------------------------------------------------------------------------
  // List Prompts Handler
  // -------------------------------------------------------------------------
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'plan_subsystem',
          description:
            'Guide AI to create a complete subsystem with components and tasks',
          arguments: [
            {
              name: 'name',
              description: 'Name of the subsystem to plan',
              required: true,
            },
            {
              name: 'description',
              description: 'Brief description of the subsystem purpose',
              required: false,
            },
          ],
        },
        {
          name: 'source_components',
          description:
            'Guide AI to find and import components for given requirements',
          arguments: [
            {
              name: 'requirements',
              description:
                'Component requirements (specs, constraints, use case)',
              required: true,
            },
            {
              name: 'budget',
              description: 'Budget constraint for components',
              required: false,
            },
          ],
        },
        {
          name: 'review_dependencies',
          description: 'Analyze task dependencies and suggest improvements',
          arguments: [],
        },
        {
          name: 'project_status',
          description:
            'Summarize project state, blocked items, and critical path',
          arguments: [],
        },
      ],
    }
  })

  // -------------------------------------------------------------------------
  // Get Prompt Handler
  // -------------------------------------------------------------------------
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const project = await ensureProjectLoaded()

    switch (name) {
      case 'plan_subsystem': {
        const subsystemName = args?.name ?? 'New Subsystem'
        const description = args?.description ?? ''

        // Get existing subsystems for context
        const existingSubsystems = Array.from(project.nodes.values())
          .filter((n) => n.type === 'subsystem')
          .map((n) => `- ${n.title}`)
          .join('\n')

        // Get existing components for reference
        const componentCount = Array.from(project.nodes.values()).filter(
          (n) => n.type === 'component'
        ).length

        return {
          description: `Plan a new subsystem: ${subsystemName}`,
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are planning a new subsystem called "${subsystemName}" for a Forge project.
${description ? `\nSubsystem description: ${description}` : ''}

## Project Context
- Current project: ${project.name}
- Total nodes: ${project.nodes.size}
- Existing components: ${componentCount}
${existingSubsystems ? `\n### Existing Subsystems\n${existingSubsystems}` : ''}

## Your Task
Create a complete plan for the "${subsystemName}" subsystem. Use the Forge MCP tools to:

1. **Create the subsystem container** using \`create_node\` with type="subsystem"

2. **Identify required components** - for each component:
   - Use \`create_node\` with type="component" and parent=subsystem_id
   - Include estimated cost, potential supplier, part number if known

3. **Create tasks for implementation** - for each task:
   - Use \`create_node\` with type="task" and parent=subsystem_id
   - Set appropriate dependencies using \`add_dependency\`
   - Include checklist items for detailed steps

4. **Review the dependency graph** using \`get_critical_path\` to verify the plan

Please proceed step by step, explaining your reasoning as you create each node.`,
              },
            },
          ],
        }
      }

      case 'source_components': {
        const requirements = args?.requirements ?? ''
        const budget = args?.budget ?? ''

        // Get existing components for comparison
        const existingComponents = Array.from(project.nodes.values())
          .filter((n) => n.type === 'component')
          .map((n) => {
            const comp = n as ComponentNode
            return `- ${comp.title} (${comp.supplier ?? 'no supplier'}, ${comp.cost ? `$${comp.cost}` : 'no cost'})`
          })
          .join('\n')

        return {
          description: 'Source components for requirements',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are helping source components for a Forge project.

## Requirements
${requirements}
${budget ? `\n## Budget Constraint\n${budget}` : ''}

## Existing Components
${existingComponents || 'No components yet'}

## Your Task
Help find and add suitable components to the project:

1. **Analyze requirements** - identify specific component types needed

2. **For each component**:
   - Research options (consider suppliers like DigiKey, Mouser, Amazon, etc.)
   - Use \`create_node\` with type="component" to add it
   - Include: title, cost estimate, supplier, part_number if available
   - Add relevant tags (e.g., "electronics", "mechanical", "fasteners")

3. **Use \`find_components\`** to check for similar existing components that might work

4. **Summary** - provide a cost breakdown and any trade-offs considered

Proceed step by step, researching and adding components one at a time.`,
              },
            },
          ],
        }
      }

      case 'review_dependencies': {
        // Get dependency analysis
        const blockedTasks = getBlockedTasksFromMemory(project.nodes)
        const criticalPath = getCriticalPathFromMemory(project.nodes)

        const blockedList = blockedTasks
          .map((t: TaskNode) => {
            const blockingDeps = t.dependsOn
              .map((id: string) => project.nodes.get(id)?.title ?? id)
              .join(', ')
            return `- ${t.title} (blocked by: ${blockingDeps})`
          })
          .join('\n')

        const criticalPathList = criticalPath
          .map((t: TaskNode, i: number) => `${i + 1}. ${t.title} [${t.status}]`)
          .join('\n')

        // Get all tasks for context
        const allTasks = Array.from(project.nodes.values()).filter(
          (n) => n.type === 'task'
        ) as TaskNode[]
        const completedCount = allTasks.filter(
          (t) => t.status === 'complete'
        ).length

        return {
          description: 'Review and improve task dependencies',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are reviewing the task dependencies in a Forge project.

## Project Statistics
- Project: ${project.name}
- Total tasks: ${allTasks.length}
- Completed: ${completedCount}
- In progress: ${allTasks.filter((t) => t.status === 'in_progress').length}
- Blocked: ${blockedTasks.length}

## Critical Path (${criticalPath.length} tasks)
${criticalPathList || 'No critical path (all tasks complete or no dependencies)'}

## Blocked Tasks
${blockedList || 'No blocked tasks'}

## Your Task
Analyze the dependency graph and suggest improvements:

1. **Identify bottlenecks** - tasks that block many others
   - Use \`get_blocked_tasks\` for current state
   - Consider if dependencies are necessary or could be parallelized

2. **Check for improvements**:
   - Are there unnecessary dependencies that could be removed?
   - Could any tasks be split to allow parallel work?
   - Are there missing dependencies that should be added?

3. **Make changes** using:
   - \`add_dependency\` to add missing dependencies
   - \`remove_dependency\` to remove unnecessary ones
   - \`update_node\` to adjust task descriptions

4. **Verify with \`get_critical_path\`** after changes

Provide your analysis and any recommended changes.`,
              },
            },
          ],
        }
      }

      case 'project_status': {
        // Gather comprehensive project status
        const allNodes = Array.from(project.nodes.values())
        const tasks = allNodes.filter((n) => n.type === 'task') as TaskNode[]
        const components = allNodes.filter(
          (n) => n.type === 'component'
        ) as ComponentNode[]
        const decisions = allNodes.filter((n) => n.type === 'decision')

        const blockedTasks = getBlockedTasksFromMemory(project.nodes)
        const criticalPath = getCriticalPathFromMemory(project.nodes)

        const statusCounts = {
          pending: tasks.filter((t) => t.status === 'pending').length,
          in_progress: tasks.filter((t) => t.status === 'in_progress').length,
          complete: tasks.filter((t) => t.status === 'complete').length,
          blocked: blockedTasks.length,
        }

        const totalCost = components.reduce((sum, c) => sum + (c.cost || 0), 0)

        const openDecisions = decisions.filter(
          (d) => (d as { status: string }).status !== 'selected'
        )

        const criticalPathSummary = criticalPath
          .slice(0, 5)
          .map((t: TaskNode, i: number) => `${i + 1}. ${t.title}`)
          .join('\n')

        const recentlyModified = [...allNodes]
          .sort(
            (a, b) =>
              new Date(b.dates.modified).getTime() -
              new Date(a.dates.modified).getTime()
          )
          .slice(0, 5)
          .map((n) => `- ${n.type}: ${n.title}`)
          .join('\n')

        return {
          description: 'Project status summary',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Generate a comprehensive status report for this Forge project.

## Project Overview
- **Name:** ${project.name}
- **Total Nodes:** ${project.nodes.size}

## Task Progress
- Pending: ${statusCounts.pending}
- In Progress: ${statusCounts.in_progress}
- Blocked: ${statusCounts.blocked}
- Complete: ${statusCounts.complete}
- **Completion Rate:** ${tasks.length > 0 ? Math.round((statusCounts.complete / tasks.length) * 100) : 0}%

## Components
- Total: ${components.length}
- **Estimated Cost:** $${totalCost.toFixed(2)}

## Open Decisions
${openDecisions.length} decision(s) pending

## Critical Path (next ${Math.min(5, criticalPath.length)} tasks)
${criticalPathSummary || 'All tasks complete!'}

## Recently Modified
${recentlyModified}

## Your Task
Provide a status summary including:

1. **Executive Summary** - one paragraph overview
2. **Key Blockers** - what's preventing progress
3. **Recommended Next Steps** - prioritized actions
4. **Risks** - potential issues to watch

Use the tools if needed to gather more detail:
- \`search_nodes\` to find specific items
- \`get_blocked_tasks\` for detailed blocker info
- \`get_critical_path\` for full critical path`,
              },
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown prompt: ${name}`)
    }
  })

  // -------------------------------------------------------------------------
  // Start Server
  // -------------------------------------------------------------------------
  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error(`Forge MCP Server started`)
  console.error(`Project: ${config.projectPath}`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
