/**
 * Project Loader for Forge MCP Server
 *
 * Handles reading and writing Forge project files from the file system.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import matter from 'gray-matter'
import type {
  ForgeNode,
  NodeType,
  Project,
  ProjectMetadata,
  TaskNode,
  DecisionNode,
  ComponentNode,
  NoteNode,
  SubsystemNode,
  AssemblyNode,
  ModuleNode,
  CreateNodeInput,
  UpdateNodeInput,
} from './types.js'

// ============================================================================
// Constants
// ============================================================================

const NODE_TYPE_DIRECTORIES: Record<NodeType, string> = {
  decision: 'decisions',
  component: 'components',
  task: 'tasks',
  note: 'notes',
  subsystem: 'subsystems',
  assembly: 'assemblies',
  module: 'modules',
}

const PROJECT_CONFIG_FILE = 'project.json'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a URL-safe slug from a title
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

/**
 * Generate a unique node ID
 */
function generateNodeId(title: string, type: NodeType): string {
  const slug = slugify(title)
  const timestamp = Date.now().toString(36)
  return `${type}-${slug}-${timestamp}`
}

/**
 * Convert frontmatter snake_case to camelCase
 */
function convertFrontmatterToNode(
  frontmatter: Record<string, unknown>,
  content: string,
  filePath: string
): ForgeNode | null {
  const type = frontmatter.type as NodeType
  if (!type) return null

  const baseNode = {
    id: path.basename(filePath, '.md'),
    type,
    title: (frontmatter.title as string) || extractTitleFromContent(content),
    tags: (frontmatter.tags as string[]) || [],
    dates: {
      created:
        (frontmatter.created as string) ||
        (frontmatter.dates as Record<string, string>)?.created ||
        new Date().toISOString(),
      modified:
        (frontmatter.modified as string) ||
        (frontmatter.dates as Record<string, string>)?.modified ||
        new Date().toISOString(),
    },
    content,
    parent: frontmatter.parent as string | undefined,
  }

  switch (type) {
    case 'task':
      return {
        ...baseNode,
        type: 'task',
        status: (frontmatter.status as TaskNode['status']) || 'pending',
        priority: (frontmatter.priority as TaskNode['priority']) || 'medium',
        dependsOn: (frontmatter.depends_on as string[]) || [],
        blocks: (frontmatter.blocks as string[]) || [],
        checklist: parseChecklist(content),
        milestone: frontmatter.milestone as string | undefined,
      } as TaskNode

    case 'decision':
      return {
        ...baseNode,
        type: 'decision',
        status: (frontmatter.status as DecisionNode['status']) || 'pending',
        selected: frontmatter.selected as string | undefined,
        options: (frontmatter.options as DecisionNode['options']) || [],
        criteria: (frontmatter.criteria as DecisionNode['criteria']) || [],
      } as DecisionNode

    case 'component':
      return {
        ...baseNode,
        type: 'component',
        status: (frontmatter.status as ComponentNode['status']) || 'pending',
        cost: frontmatter.cost as number | undefined,
        supplier: frontmatter.supplier as string | undefined,
        partNumber:
          (frontmatter.part_number as string) ||
          (frontmatter.partNumber as string) ||
          undefined,
        supplierUrl:
          (frontmatter.supplier_url as string) ||
          (frontmatter.supplierUrl as string) ||
          undefined,
        customFields:
          (frontmatter.custom_fields as Record<string, string>) ||
          (frontmatter.customFields as Record<string, string>) ||
          {},
      } as ComponentNode

    case 'note':
      return {
        ...baseNode,
        type: 'note',
      } as NoteNode

    case 'subsystem':
      return {
        ...baseNode,
        type: 'subsystem',
        status: (frontmatter.status as SubsystemNode['status']) || 'planning',
        description: frontmatter.description as string | undefined,
        requirements: (frontmatter.requirements as string[]) || undefined,
      } as SubsystemNode

    case 'assembly':
      return {
        ...baseNode,
        type: 'assembly',
        status: (frontmatter.status as AssemblyNode['status']) || 'planning',
        description: frontmatter.description as string | undefined,
        requirements: (frontmatter.requirements as string[]) || undefined,
      } as AssemblyNode

    case 'module':
      return {
        ...baseNode,
        type: 'module',
        status: (frontmatter.status as ModuleNode['status']) || 'planning',
        description: frontmatter.description as string | undefined,
        requirements: (frontmatter.requirements as string[]) || undefined,
      } as ModuleNode

    default:
      return null
  }
}

/**
 * Extract title from markdown content (first # heading)
 */
function extractTitleFromContent(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled'
}

/**
 * Parse checklist items from markdown content
 */
function parseChecklist(
  content: string
): Array<{ text: string; completed: boolean }> {
  const checklist: Array<{ text: string; completed: boolean }> = []
  const regex = /^-\s+\[([ x])\]\s+(.+)$/gm
  let match
  while ((match = regex.exec(content)) !== null) {
    checklist.push({
      completed: match[1] === 'x',
      text: match[2].trim(),
    })
  }
  return checklist
}

/**
 * Convert node to frontmatter format
 */
function nodeToFrontmatter(node: ForgeNode): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: node.type,
    title: node.title,
    tags: node.tags,
    created: node.dates.created,
    modified: node.dates.modified,
  }

  if (node.parent) {
    base.parent = node.parent
  }

  switch (node.type) {
    case 'task': {
      const task = node as TaskNode
      return {
        ...base,
        status: task.status,
        priority: task.priority,
        depends_on: task.dependsOn,
        blocks: task.blocks,
        ...(task.milestone && { milestone: task.milestone }),
      }
    }
    case 'decision': {
      const decision = node as DecisionNode
      return {
        ...base,
        status: decision.status,
        ...(decision.selected && { selected: decision.selected }),
        options: decision.options,
        criteria: decision.criteria,
      }
    }
    case 'component': {
      const component = node as ComponentNode
      return {
        ...base,
        status: component.status,
        ...(component.cost !== undefined && { cost: component.cost }),
        ...(component.supplier && { supplier: component.supplier }),
        ...(component.partNumber && { part_number: component.partNumber }),
        ...(component.supplierUrl && { supplier_url: component.supplierUrl }),
        ...(Object.keys(component.customFields).length > 0 && {
          custom_fields: component.customFields,
        }),
      }
    }
    case 'note':
      return base
    case 'subsystem':
    case 'assembly':
    case 'module': {
      const container = node as SubsystemNode | AssemblyNode | ModuleNode
      return {
        ...base,
        status: container.status,
        ...(container.description && { description: container.description }),
        ...(container.requirements && { requirements: container.requirements }),
      }
    }
    default:
      return base
  }
}

// ============================================================================
// Project Operations
// ============================================================================

/**
 * Load project metadata from project.json
 */
export async function loadProjectMetadata(
  projectPath: string
): Promise<ProjectMetadata | null> {
  try {
    const configPath = path.join(projectPath, PROJECT_CONFIG_FILE)
    const content = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(content) as ProjectMetadata
  } catch {
    // Return default metadata if file doesn't exist
    return {
      name: path.basename(projectPath),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    }
  }
}

/**
 * Load all nodes from a project directory
 */
export async function loadProject(projectPath: string): Promise<Project> {
  const metadata = await loadProjectMetadata(projectPath)
  const nodes = new Map<string, ForgeNode>()

  // Load nodes from each type directory
  for (const [, dir] of Object.entries(NODE_TYPE_DIRECTORIES)) {
    const dirPath = path.join(projectPath, dir)
    try {
      const files = await fs.readdir(dirPath)
      for (const file of files) {
        if (!file.endsWith('.md')) continue

        const filePath = path.join(dirPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const parsed = matter(content)
        const node = convertFrontmatterToNode(
          parsed.data,
          parsed.content,
          filePath
        )

        if (node) {
          nodes.set(node.id, node)
        }
      }
    } catch {
      // Directory doesn't exist - that's okay
    }
  }

  return {
    id: path.basename(projectPath),
    name: metadata?.name || path.basename(projectPath),
    path: projectPath,
    metadata: metadata || {
      name: path.basename(projectPath),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    },
    nodes,
  }
}

/**
 * Save a node to the file system
 */
export async function saveNode(
  projectPath: string,
  node: ForgeNode
): Promise<void> {
  const dir = NODE_TYPE_DIRECTORIES[node.type]
  const dirPath = path.join(projectPath, dir)

  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true })

  // Build file content
  const frontmatter = nodeToFrontmatter(node)
  const fileContent = matter.stringify(node.content, frontmatter)

  // Write file
  const filePath = path.join(dirPath, `${node.id}.md`)
  await fs.writeFile(filePath, fileContent, 'utf-8')
}

/**
 * Delete a node from the file system
 */
export async function deleteNode(
  projectPath: string,
  nodeId: string,
  nodeType: NodeType
): Promise<void> {
  const dir = NODE_TYPE_DIRECTORIES[nodeType]
  const filePath = path.join(projectPath, dir, `${nodeId}.md`)

  try {
    await fs.unlink(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    // File already doesn't exist - that's fine
  }
}

/**
 * Create a new node
 */
export function createNode(input: CreateNodeInput): ForgeNode {
  const id = generateNodeId(input.title, input.type)
  const now = new Date().toISOString()

  const base = {
    id,
    title: input.title,
    content: input.content || '',
    tags: input.tags || [],
    dates: {
      created: now,
      modified: now,
    },
    parent: input.parent,
  }

  switch (input.type) {
    case 'task':
      return {
        ...base,
        type: 'task',
        status: (input.status as TaskNode['status']) || 'pending',
        priority: input.priority || 'medium',
        dependsOn: input.dependsOn || [],
        blocks: [],
        checklist: [],
      } as TaskNode

    case 'decision':
      return {
        ...base,
        type: 'decision',
        status: (input.status as DecisionNode['status']) || 'pending',
        options: [],
        criteria: [],
      } as DecisionNode

    case 'component':
      return {
        ...base,
        type: 'component',
        status: (input.status as ComponentNode['status']) || 'pending',
        cost: input.cost,
        supplier: input.supplier,
        partNumber: input.partNumber,
        customFields: {},
      } as ComponentNode

    case 'note':
      return {
        ...base,
        type: 'note',
      } as NoteNode

    case 'subsystem':
      return {
        ...base,
        type: 'subsystem',
        status: (input.status as SubsystemNode['status']) || 'planning',
      } as SubsystemNode

    case 'assembly':
      return {
        ...base,
        type: 'assembly',
        status: (input.status as AssemblyNode['status']) || 'planning',
      } as AssemblyNode

    case 'module':
      return {
        ...base,
        type: 'module',
        status: (input.status as ModuleNode['status']) || 'planning',
      } as ModuleNode
  }
}

/**
 * Update an existing node with new values
 */
export function updateNode(
  existing: ForgeNode,
  updates: UpdateNodeInput
): ForgeNode {
  const now = new Date().toISOString()

  const updated = {
    ...existing,
    title: updates.title ?? existing.title,
    content: updates.content ?? existing.content,
    tags: updates.tags ?? existing.tags,
    parent: updates.parent ?? existing.parent,
    dates: {
      ...existing.dates,
      modified: now,
    },
  }

  // Apply type-specific updates
  switch (existing.type) {
    case 'task': {
      const task = updated as TaskNode
      if (updates.status) task.status = updates.status as TaskNode['status']
      if (updates.priority) task.priority = updates.priority
      if (updates.dependsOn) task.dependsOn = updates.dependsOn
      return task
    }
    case 'decision': {
      const decision = updated as DecisionNode
      if (updates.status)
        decision.status = updates.status as DecisionNode['status']
      return decision
    }
    case 'component': {
      const component = updated as ComponentNode
      if (updates.status)
        component.status = updates.status as ComponentNode['status']
      if (updates.cost !== undefined) component.cost = updates.cost
      if (updates.supplier !== undefined) component.supplier = updates.supplier
      if (updates.partNumber !== undefined)
        component.partNumber = updates.partNumber
      return component
    }
    case 'subsystem':
    case 'assembly':
    case 'module': {
      const container = updated as SubsystemNode | AssemblyNode | ModuleNode
      if (updates.status)
        container.status = updates.status as SubsystemNode['status']
      return container
    }
    default:
      return updated as ForgeNode
  }
}

/**
 * Search nodes with various filters
 */
export function searchNodes(
  nodes: Map<string, ForgeNode>,
  options: {
    query?: string
    type?: NodeType
    status?: string
    tags?: string[]
    parent?: string
    limit?: number
  }
): ForgeNode[] {
  let results = Array.from(nodes.values())

  // Filter by type
  if (options.type) {
    results = results.filter((n) => n.type === options.type)
  }

  // Filter by parent
  if (options.parent) {
    results = results.filter((n) => n.parent === options.parent)
  }

  // Filter by tags (any match)
  if (options.tags && options.tags.length > 0) {
    results = results.filter((n) =>
      options.tags!.some((tag) => n.tags.includes(tag))
    )
  }

  // Filter by status
  if (options.status) {
    results = results.filter((n) => {
      if ('status' in n) {
        return (n as { status: string }).status === options.status
      }
      return false
    })
  }

  // Filter by query (title and content search)
  if (options.query) {
    const lowerQuery = options.query.toLowerCase()
    results = results.filter(
      (n) =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.content.toLowerCase().includes(lowerQuery)
    )
  }

  // Apply limit
  const limit = options.limit ?? 50
  return results.slice(0, limit)
}

/**
 * List available projects in a directory
 */
export async function listProjects(
  workspacePath: string
): Promise<Array<{ id: string; name: string; path: string }>> {
  const projects: Array<{ id: string; name: string; path: string }> = []

  try {
    const entries = await fs.readdir(workspacePath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const projectPath = path.join(workspacePath, entry.name)

      // Check if this looks like a Forge project
      // (has project.json or standard directories)
      const hasProjectJson = await fs
        .access(path.join(projectPath, PROJECT_CONFIG_FILE))
        .then(() => true)
        .catch(() => false)

      const hasStandardDirs = await Promise.all(
        ['tasks', 'decisions', 'components', 'notes'].map((dir) =>
          fs
            .access(path.join(projectPath, dir))
            .then(() => true)
            .catch(() => false)
        )
      ).then((results) => results.some(Boolean))

      if (hasProjectJson || hasStandardDirs) {
        const metadata = await loadProjectMetadata(projectPath)
        projects.push({
          id: entry.name,
          name: metadata?.name || entry.name,
          path: projectPath,
        })
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return projects
}
