/**
 * Project Loading & Saving
 *
 * Provides functions for loading projects from directory structure
 * and saving nodes to the file system.
 */

import type { FileSystemAdapter } from './filesystem/types'
import { NodeType, type ForgeNode } from '../types/nodes'
import type { Project, ProjectMetadata } from '../types/project'
import { createProjectMetadata } from '../types/project'
import { parseMarkdownFile, serializeFrontmatter } from './frontmatter'
import { validateNode, type ValidationError } from './validation'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of loading a project
 */
export interface LoadProjectResult {
  /** Loaded project (null if failed) */
  project: Project | null
  /** Parse errors encountered during loading */
  parseErrors: ParseError[]
  /** Fatal error that prevented loading (null on success) */
  error: string | null
}

/**
 * Error encountered when parsing a node file
 */
export interface ParseError {
  /** Path to the file with the error */
  path: string
  /** Error message */
  message: string
  /** Validation error details (if validation failed) */
  validationError?: ValidationError
}

/**
 * Result of saving a node
 */
export interface SaveNodeResult {
  /** Whether the save was successful */
  success: boolean
  /** Path where the node was saved */
  path: string | null
  /** Error message if save failed */
  error: string | null
}

/**
 * Node directories by type
 */
const NODE_DIRECTORIES: Record<NodeType, string> = {
  [NodeType.Decision]: 'decisions',
  [NodeType.Component]: 'components',
  [NodeType.Task]: 'tasks',
  [NodeType.Note]: 'notes',
}

// ============================================================================
// Slugify Utility
// ============================================================================

/**
 * Converts a string to a URL-safe slug
 *
 * - Converts to lowercase
 * - Replaces spaces and underscores with hyphens
 * - Removes non-alphanumeric characters (except hyphens)
 * - Removes leading/trailing hyphens
 * - Collapses multiple consecutive hyphens
 *
 * @param text - Text to slugify
 * @returns URL-safe slug
 */
export function slugify(text: string): string {
  if (!text || text.trim() === '') {
    return ''
  }

  return (
    text
      .toLowerCase()
      .trim()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove non-alphanumeric characters except hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Collapse multiple hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '')
  )
}

/**
 * Generates a unique node ID from a title and type
 *
 * If the slugified title would create a duplicate, appends a number.
 *
 * @param title - Node title
 * @param existingIds - Set of existing node IDs
 * @returns Unique node ID
 */
export function generateNodeId(
  title: string,
  existingIds: Set<string>
): string {
  const baseSlug = slugify(title) || 'untitled'

  if (!existingIds.has(baseSlug)) {
    return baseSlug
  }

  // Find a unique ID by appending a number
  let counter = 2
  let candidateId = `${baseSlug}-${counter}`

  while (existingIds.has(candidateId)) {
    counter++
    candidateId = `${baseSlug}-${counter}`
  }

  return candidateId
}

// ============================================================================
// Directory Utilities
// ============================================================================

/**
 * Gets the directory name for a node type
 *
 * @param nodeType - The node type
 * @returns Directory name (e.g., 'decisions', 'tasks')
 */
export function getDirectoryForNodeType(nodeType: NodeType): string {
  return NODE_DIRECTORIES[nodeType]
}

/**
 * Gets the node type for a directory name
 *
 * @param directory - Directory name
 * @returns Node type or undefined if not a valid node directory
 */
export function getNodeTypeForDirectory(
  directory: string
): NodeType | undefined {
  const entry = Object.entries(NODE_DIRECTORIES).find(
    ([, dir]) => dir === directory
  )
  return entry ? (entry[0] as NodeType) : undefined
}

// ============================================================================
// File Path Utilities
// ============================================================================

/**
 * Generates the file path for a node
 *
 * @param projectPath - Path to the project directory
 * @param node - The node to get the path for
 * @returns Full path to the node file
 */
export function getNodeFilePath(projectPath: string, node: ForgeNode): string {
  const directory = getDirectoryForNodeType(node.type)
  const filename = `${node.id}.md`
  return `${projectPath}/${directory}/${filename}`
}

/**
 * Extracts the node ID from a file path
 *
 * @param filePath - Path to a node file
 * @returns Node ID (filename without extension)
 */
export function getNodeIdFromPath(filePath: string): string {
  const filename = filePath.split('/').pop() || ''
  return filename.replace(/\.md$/, '')
}

// ============================================================================
// Node Serialization
// ============================================================================

/**
 * Converts a ForgeNode to frontmatter data for serialization
 *
 * Handles snake_case conversion for YAML (e.g., dependsOn -> depends_on)
 */
function nodeToFrontmatterData(node: ForgeNode): Record<string, unknown> {
  const data: Record<string, unknown> = {
    type: node.type,
  }

  // Add type-specific fields
  switch (node.type) {
    case NodeType.Decision:
      data.status = node.status
      if (node.selected) data.selected = node.selected
      if (node.options.length > 0) data.options = node.options
      if (node.criteria.length > 0) data.criteria = node.criteria
      break

    case NodeType.Component:
      data.status = node.status
      if (node.cost !== null) data.cost = node.cost
      if (node.supplier) data.supplier = node.supplier
      if (node.partNumber) data.partNumber = node.partNumber
      if (Object.keys(node.customFields).length > 0) {
        data.customFields = node.customFields
      }
      break

    case NodeType.Task:
      data.status = node.status
      data.priority = node.priority
      // Use snake_case for YAML
      if (node.dependsOn.length > 0) data.depends_on = node.dependsOn
      if (node.blocks.length > 0) data.blocks = node.blocks
      if (node.checklist.length > 0) data.checklist = node.checklist
      break

    case NodeType.Note:
      // Note has no additional frontmatter fields
      break
  }

  // Add common fields
  if (node.tags.length > 0) {
    data.tags = node.tags
  }

  // Add dates if they differ from now significantly
  data.created = node.dates.created.toISOString()
  data.modified = node.dates.modified.toISOString()

  return data
}

/**
 * Serializes a node to markdown file content
 *
 * @param node - Node to serialize
 * @returns Complete markdown file content
 */
export function serializeNode(node: ForgeNode): string {
  const frontmatterData = nodeToFrontmatterData(node)

  // Combine title and content for the body
  const body = `# ${node.title}\n\n${node.content}`.trim()

  return serializeFrontmatter(frontmatterData, body)
}

// ============================================================================
// Node Loading
// ============================================================================

/**
 * Loads a single node from a file
 *
 * @param adapter - File system adapter
 * @param filePath - Path to the node file
 * @returns Parsed node or error
 */
export async function loadNode(
  adapter: FileSystemAdapter,
  filePath: string
): Promise<{ node: ForgeNode | null; error: ParseError | null }> {
  try {
    const content = await adapter.readFile(filePath)
    const {
      frontmatter,
      title,
      body,
      error: parseError,
    } = parseMarkdownFile(content)

    if (parseError) {
      return {
        node: null,
        error: {
          path: filePath,
          message: `Failed to parse frontmatter: ${parseError}`,
        },
      }
    }

    // Extract node ID from filename
    const nodeId = getNodeIdFromPath(filePath)

    // Build the data object for validation
    const nodeData = {
      ...frontmatter,
      id: nodeId,
      title: title || frontmatter.title || nodeId,
      content: body,
    }

    // Validate and convert to ForgeNode
    const validationResult = validateNode(nodeData)

    if (!validationResult.success) {
      return {
        node: null,
        error: {
          path: filePath,
          message: validationResult.error.message,
          validationError: validationResult.error,
        },
      }
    }

    return { node: validationResult.data, error: null }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error reading file'
    return {
      node: null,
      error: {
        path: filePath,
        message,
      },
    }
  }
}

// ============================================================================
// Project Loading
// ============================================================================

/**
 * Loads a project from a directory
 *
 * Scans the decisions/, components/, tasks/, and notes/ subdirectories
 * for markdown files and parses them as nodes.
 *
 * @param adapter - File system adapter
 * @param projectPath - Path to the project directory
 * @returns Loaded project with any parse errors
 */
export async function loadProject(
  adapter: FileSystemAdapter,
  projectPath: string
): Promise<LoadProjectResult> {
  const parseErrors: ParseError[] = []
  const nodes = new Map<string, ForgeNode>()

  try {
    // Check if project directory exists
    const projectExists = await adapter.exists(projectPath)
    if (!projectExists) {
      return {
        project: null,
        parseErrors: [],
        error: `Project directory not found: ${projectPath}`,
      }
    }

    // Load nodes from each type directory
    for (const [nodeType, directory] of Object.entries(NODE_DIRECTORIES)) {
      const dirPath = `${projectPath}/${directory}`

      // Check if directory exists
      const dirExists = await adapter.exists(dirPath)
      if (!dirExists) {
        // Directory doesn't exist - that's okay, just skip
        continue
      }

      // List markdown files in directory
      const files = await adapter.listDirectory(dirPath, {
        extension: '.md',
        recursive: false,
      })

      // Load each node file
      for (const file of files) {
        if (file.isDirectory) continue

        const { node, error } = await loadNode(adapter, file.path)

        if (error) {
          parseErrors.push(error)
          continue
        }

        if (node) {
          // Verify node type matches directory
          if (node.type !== nodeType) {
            parseErrors.push({
              path: file.path,
              message: `Node type mismatch: file in ${directory}/ has type '${node.type}'`,
            })
          }
          nodes.set(node.id, node)
        }
      }
    }

    // Try to load project metadata from project.json
    let metadata: ProjectMetadata = createProjectMetadata()
    const metadataPath = `${projectPath}/project.json`

    if (await adapter.exists(metadataPath)) {
      try {
        const metadataContent = await adapter.readFile(metadataPath)
        const parsed = JSON.parse(metadataContent)
        metadata = {
          createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
          modifiedAt: parsed.modifiedAt
            ? new Date(parsed.modifiedAt)
            : new Date(),
          description: parsed.description,
          nodeOrder: parsed.nodeOrder,
          nodePositions: parsed.nodePositions,
        }
      } catch (err) {
        // Failed to parse metadata - include error details for debugging
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error'
        parseErrors.push({
          path: metadataPath,
          message: `Failed to parse project.json: ${errorMessage}. Using defaults.`,
        })
      }
    }

    // Extract project name from path
    const projectName = projectPath.split('/').pop() || 'Untitled Project'
    const projectId = slugify(projectName)

    const project: Project = {
      id: projectId,
      name: projectName,
      path: projectPath,
      nodes,
      metadata,
    }

    return {
      project,
      parseErrors,
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error loading project'
    return {
      project: null,
      parseErrors,
      error: message,
    }
  }
}

// ============================================================================
// Node Saving
// ============================================================================

/**
 * Saves a node to the file system
 *
 * Creates the appropriate subdirectory if it doesn't exist,
 * and writes the node as a markdown file.
 *
 * @param adapter - File system adapter
 * @param projectPath - Path to the project directory
 * @param node - Node to save
 * @returns Save result
 */
export async function saveNode(
  adapter: FileSystemAdapter,
  projectPath: string,
  node: ForgeNode
): Promise<SaveNodeResult> {
  try {
    // Get the directory for this node type
    const directory = getDirectoryForNodeType(node.type)
    const dirPath = `${projectPath}/${directory}`

    // Ensure directory exists
    const dirExists = await adapter.exists(dirPath)
    if (!dirExists) {
      await adapter.mkdir(dirPath)
    }

    // Generate file path
    const filePath = getNodeFilePath(projectPath, node)

    // Serialize and write
    const content = serializeNode(node)
    await adapter.writeFile(filePath, content)

    return {
      success: true,
      path: filePath,
      error: null,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error saving node'
    return {
      success: false,
      path: null,
      error: message,
    }
  }
}

/**
 * Deletes a node from the file system
 *
 * @param adapter - File system adapter
 * @param projectPath - Path to the project directory
 * @param node - Node to delete
 * @returns True if deleted successfully
 */
export async function deleteNode(
  adapter: FileSystemAdapter,
  projectPath: string,
  node: ForgeNode
): Promise<{ success: boolean; error: string | null }> {
  try {
    const filePath = getNodeFilePath(projectPath, node)

    const exists = await adapter.exists(filePath)
    if (!exists) {
      return { success: true, error: null } // Already deleted
    }

    await adapter.delete(filePath)
    return { success: true, error: null }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error deleting file'
    console.error(`Failed to delete node "${node.title}" (${node.id}):`, err)
    return {
      success: false,
      error: `Failed to delete "${node.title}": ${message}`,
    }
  }
}

/**
 * Saves project metadata to project.json
 *
 * @param adapter - File system adapter
 * @param projectPath - Path to the project directory
 * @param metadata - Project metadata to save
 */
export async function saveProjectMetadata(
  adapter: FileSystemAdapter,
  projectPath: string,
  metadata: ProjectMetadata
): Promise<void> {
  const metadataPath = `${projectPath}/project.json`

  const data = {
    createdAt: metadata.createdAt.toISOString(),
    modifiedAt: new Date().toISOString(),
    description: metadata.description,
    nodeOrder: metadata.nodeOrder,
    nodePositions: metadata.nodePositions,
  }

  await adapter.writeFile(metadataPath, JSON.stringify(data, null, 2))
}

/**
 * Initializes a new project directory structure
 *
 * Creates the project directory with subdirectories for each node type.
 *
 * @param adapter - File system adapter
 * @param projectPath - Path for the new project
 * @param name - Project name
 * @param description - Optional project description
 */
export async function initializeProject(
  adapter: FileSystemAdapter,
  projectPath: string,
  name: string,
  description?: string
): Promise<Project> {
  // Create project directory
  await adapter.mkdir(projectPath)

  // Create node type directories
  for (const directory of Object.values(NODE_DIRECTORIES)) {
    await adapter.mkdir(`${projectPath}/${directory}`)
  }

  // Create project metadata
  const metadata = createProjectMetadata(description)
  await saveProjectMetadata(adapter, projectPath, metadata)

  // Return the new project
  return {
    id: slugify(name),
    name,
    path: projectPath,
    nodes: new Map(),
    metadata,
  }
}
