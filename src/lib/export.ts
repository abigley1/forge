import { z } from 'zod'
import type { Project, ProjectMetadata } from '@/types/project'
import { createProjectMetadata } from '@/types/project'
import type {
  ForgeNode,
  NodeType as NodeTypeType,
  ComponentNode,
} from '@/types/nodes'
import { NodeType, isComponentNode } from '@/types/nodes'
import type {
  JSONExport,
  JSONExportOptions,
  SerializedNode,
  ExportMetadata,
  MarkdownExportOptions,
  MarkdownExportResult,
  MarkdownFileEntry,
  MarkdownImportResult,
  MarkdownParseError,
  ImportOptions,
  CSVExportOptions,
  CSVExportResult,
  BOMLineItem,
  BOMExportResult,
} from '@/types/export'
import { validateNode, type ValidationResult } from './validation'
import { serializeFrontmatter, parseMarkdownFile } from './frontmatter'

/** Current export format version */
export const EXPORT_VERSION = '1.0.0'

/** Application name for export metadata */
export const EXPORT_APP_NAME = 'Forge'

/**
 * Serialize a ForgeNode to a plain object for JSON export
 * Converts Date objects to ISO strings
 */
function serializeNode(node: ForgeNode): SerializedNode {
  const base: SerializedNode = {
    id: node.id,
    type: node.type,
    title: node.title,
    content: node.content,
    tags: [...node.tags],
    dates: {
      created: node.dates.created.toISOString(),
      modified: node.dates.modified.toISOString(),
    },
  }

  // Add type-specific fields
  switch (node.type) {
    case 'decision':
      return {
        ...base,
        status: node.status,
        selected: node.selected,
        selectedDate: node.selectedDate?.toISOString() ?? null,
        rationale: node.rationale ?? null,
        options: node.options,
        criteria: node.criteria,
      }
    case 'component':
      return {
        ...base,
        status: node.status,
        cost: node.cost,
        supplier: node.supplier,
        partNumber: node.partNumber,
        customFields: node.customFields,
      }
    case 'task':
      return {
        ...base,
        status: node.status,
        priority: node.priority,
        dependsOn: node.dependsOn,
        blocks: node.blocks,
        checklist: node.checklist,
        milestone: node.milestone,
      }
    case 'note':
      return base
  }
}

/**
 * Export a project to JSON format
 * @param project The project to export
 * @param options Export options
 * @returns JSON string of the exported project
 */
export function exportToJSON(
  project: Project,
  options: JSONExportOptions = {}
): string {
  const {
    prettyPrint = true,
    includeMetadata = true,
    indentSpaces = 2,
  } = options

  // Serialize all nodes
  const nodes: SerializedNode[] = []
  for (const node of project.nodes.values()) {
    nodes.push(serializeNode(node))
  }

  // Sort nodes by type, then by title for consistent output
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type)
    }
    return a.title.localeCompare(b.title)
  })

  // Build export object
  const exportData: JSONExport = {
    metadata: includeMetadata
      ? {
          version: EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          exportedBy: EXPORT_APP_NAME,
          nodeCount: nodes.length,
        }
      : ({} as ExportMetadata),
    project: {
      id: project.id,
      name: project.name,
      description: project.metadata.description,
      createdAt: project.metadata.createdAt.toISOString(),
      modifiedAt: project.metadata.modifiedAt.toISOString(),
      nodeOrder: project.metadata.nodeOrder,
      nodePositions: project.metadata.nodePositions,
    },
    nodes,
  }

  // Remove empty metadata if not included
  if (!includeMetadata) {
    delete (exportData as Partial<JSONExport>).metadata
  }

  return prettyPrint
    ? JSON.stringify(exportData, null, indentSpaces)
    : JSON.stringify(exportData)
}

// Zod schemas for import validation

const exportMetadataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  exportedBy: z.string(),
  nodeCount: z.number(),
})

const projectDataSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string(),
  modifiedAt: z.string(),
  nodeOrder: z.array(z.string()).optional(),
  nodePositions: z
    .record(z.object({ x: z.number(), y: z.number() }))
    .optional(),
})

const jsonExportSchema = z.object({
  metadata: exportMetadataSchema.optional(),
  project: projectDataSchema,
  nodes: z.array(z.record(z.unknown())), // Loose validation, individual nodes validated separately
})

/**
 * Parse and validate a serialized node back to a ForgeNode
 */
function parseSerializedNode(
  data: Record<string, unknown>
): ValidationResult<ForgeNode> {
  // Convert ISO date strings back to Date objects
  const nodeData = { ...data }

  if (nodeData.dates && typeof nodeData.dates === 'object') {
    const dates = nodeData.dates as { created?: string; modified?: string }
    nodeData.created = dates.created
    nodeData.modified = dates.modified
    delete nodeData.dates
  }

  // Handle selectedDate for decisions
  if (nodeData.selectedDate && typeof nodeData.selectedDate === 'string') {
    nodeData.selected_date = nodeData.selectedDate
    delete nodeData.selectedDate
  }

  // Handle dependsOn for tasks (convert to snake_case for validation)
  if (nodeData.dependsOn !== undefined) {
    nodeData.depends_on = nodeData.dependsOn
    delete nodeData.dependsOn
  }

  return validateNode(nodeData)
}

/**
 * Import a project from JSON
 * @param json The JSON string to import
 * @returns ValidationResult with the imported Project or validation error
 */
export function importFromJSON(json: string): ValidationResult<Project> {
  // Parse JSON
  let parsedData: unknown
  try {
    parsedData = JSON.parse(json)
  } catch {
    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Invalid JSON: Failed to parse input',
      },
    }
  }

  // Validate top-level structure
  const structureResult = jsonExportSchema.safeParse(parsedData)
  if (!structureResult.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: 'Invalid export structure',
        issues: structureResult.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    }
  }

  const exportData = structureResult.data

  // Note: Version migrations would be handled here if needed
  // For now we only have version 1.0.0, so no migrations needed

  // Parse project metadata
  const projectData = exportData.project
  const metadata: ProjectMetadata = {
    createdAt: new Date(projectData.createdAt),
    modifiedAt: new Date(projectData.modifiedAt),
    description: projectData.description,
    nodeOrder: projectData.nodeOrder,
    nodePositions: projectData.nodePositions,
  }

  // Validate dates
  if (isNaN(metadata.createdAt.getTime())) {
    return {
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: 'Invalid project createdAt date',
        path: 'project.createdAt',
      },
    }
  }
  if (isNaN(metadata.modifiedAt.getTime())) {
    return {
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: 'Invalid project modifiedAt date',
        path: 'project.modifiedAt',
      },
    }
  }

  // Parse and validate each node
  const nodes = new Map<string, ForgeNode>()
  const nodeErrors: Array<{ path: string; message: string }> = []

  for (let i = 0; i < exportData.nodes.length; i++) {
    const nodeData = exportData.nodes[i] as Record<string, unknown>
    const nodeResult = parseSerializedNode(nodeData)

    if (nodeResult.success) {
      const node = nodeResult.data
      if (nodes.has(node.id)) {
        nodeErrors.push({
          path: `nodes[${i}].id`,
          message: `Duplicate node ID: ${node.id}`,
        })
      } else {
        nodes.set(node.id, node)
      }
    } else {
      nodeErrors.push({
        path: `nodes[${i}]`,
        message: nodeResult.error.message,
      })
    }
  }

  // If any nodes failed validation, return error with all issues
  if (nodeErrors.length > 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_VALUE',
        message: `Failed to validate ${nodeErrors.length} node(s)`,
        issues: nodeErrors,
      },
    }
  }

  // Build the project
  const project: Project = {
    id: projectData.id,
    name: projectData.name,
    path: '', // Path will be set when saving to file system
    nodes,
    metadata,
  }

  return { success: true, data: project }
}

// ============================================================================
// Markdown Export/Import
// ============================================================================

/** Directory mapping for each node type */
const NODE_DIRECTORIES: Record<NodeTypeType, string> = {
  [NodeType.Decision]: 'decisions',
  [NodeType.Component]: 'components',
  [NodeType.Task]: 'tasks',
  [NodeType.Note]: 'notes',
}

/**
 * Convert a ForgeNode to frontmatter data object
 * Uses snake_case for YAML fields
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
      if (node.selectedDate)
        data.selected_date = node.selectedDate.toISOString()
      if (node.rationale) data.rationale = node.rationale
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
      if (node.dependsOn.length > 0) data.depends_on = node.dependsOn
      if (node.blocks.length > 0) data.blocks = node.blocks
      if (node.checklist.length > 0) data.checklist = node.checklist
      if (node.milestone) data.milestone = node.milestone
      break

    case NodeType.Note:
      // Note has no additional frontmatter fields
      break
  }

  // Add common fields
  if (node.tags.length > 0) {
    data.tags = node.tags
  }

  data.created = node.dates.created.toISOString()
  data.modified = node.dates.modified.toISOString()

  return data
}

/**
 * Export a single node to markdown format
 * @param node The node to export
 * @param options Export options
 * @returns Markdown string with frontmatter and content
 */
export function exportNodeToMarkdown(
  node: ForgeNode,
  options: MarkdownExportOptions = {}
): string {
  const { includeFrontmatter = true } = options

  // Build the markdown body (title + content)
  const body = `# ${node.title}\n\n${node.content}`.trim()

  if (!includeFrontmatter) {
    return body
  }

  const frontmatterData = nodeToFrontmatterData(node)
  return serializeFrontmatter(frontmatterData, body)
}

/**
 * Get the relative file path for a node
 * @param node The node
 * @returns Relative file path (e.g., "tasks/my-task.md")
 */
function getNodeFilePath(node: ForgeNode): string {
  const directory = NODE_DIRECTORIES[node.type]
  // Use node ID as filename (already slugified)
  return `${directory}/${node.id}.md`
}

/**
 * Export a project to markdown format
 * Returns a map of file paths to content, suitable for creating a directory structure
 * @param project The project to export
 * @param options Export options
 * @returns MarkdownExportResult with files map and project.json content
 */
export function exportProjectToMarkdown(
  project: Project,
  options: MarkdownExportOptions = {}
): MarkdownExportResult {
  const files = new Map<string, string>()

  // Export each node to its respective directory
  for (const node of project.nodes.values()) {
    const filePath = getNodeFilePath(node)
    const content = exportNodeToMarkdown(node, options)
    files.set(filePath, content)
  }

  // Create project.json content
  const projectJson = JSON.stringify(
    {
      id: project.id,
      name: project.name,
      description: project.metadata.description,
      createdAt: project.metadata.createdAt.toISOString(),
      modifiedAt: project.metadata.modifiedAt.toISOString(),
      nodeOrder: project.metadata.nodeOrder,
      nodePositions: project.metadata.nodePositions,
    },
    null,
    2
  )

  return { files, projectJson }
}

/**
 * Detect node type from file path
 * @param path The file path
 * @returns The node type or null if not in a valid directory
 */
function detectNodeTypeFromPath(path: string): NodeTypeType | null {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()

  if (
    normalizedPath.includes('/decisions/') ||
    normalizedPath.startsWith('decisions/')
  ) {
    return NodeType.Decision
  }
  if (
    normalizedPath.includes('/components/') ||
    normalizedPath.startsWith('components/')
  ) {
    return NodeType.Component
  }
  if (
    normalizedPath.includes('/tasks/') ||
    normalizedPath.startsWith('tasks/')
  ) {
    return NodeType.Task
  }
  if (
    normalizedPath.includes('/notes/') ||
    normalizedPath.startsWith('notes/')
  ) {
    return NodeType.Note
  }

  return null
}

/**
 * Extract node ID from file path
 * @param path The file path
 * @returns The node ID (filename without extension)
 */
function getNodeIdFromPath(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/')
  const filename = normalizedPath.split('/').pop() || ''
  return filename.replace(/\.md$/i, '')
}

/**
 * Import a project from markdown files
 * @param files Array of file entries with path and content
 * @param projectName Name for the imported project
 * @param options Import options
 * @returns MarkdownImportResult with the project and any parse errors
 */
export function importFromMarkdown(
  files: MarkdownFileEntry[],
  projectName: string = 'Imported Project',
  options: ImportOptions = {}
): MarkdownImportResult {
  const { mergeMode = false } = options
  const nodes = new Map<string, ForgeNode>()
  const parseErrors: MarkdownParseError[] = []
  let projectMetadata: ProjectMetadata | null = null

  // Process project.json if present
  const projectJsonFile = files.find((f) =>
    f.path.toLowerCase().endsWith('project.json')
  )
  if (projectJsonFile) {
    try {
      const parsed = JSON.parse(projectJsonFile.content)
      projectMetadata = {
        createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
        modifiedAt: parsed.modifiedAt
          ? new Date(parsed.modifiedAt)
          : new Date(),
        description: parsed.description,
        nodeOrder: parsed.nodeOrder,
        nodePositions: parsed.nodePositions,
      }
      // Use project name from metadata if available
      if (parsed.name) {
        projectName = parsed.name
      }
    } catch (err) {
      parseErrors.push({
        path: projectJsonFile.path,
        message: `Failed to parse project.json: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }
  }

  // Process markdown files
  const markdownFiles = files.filter((f) =>
    f.path.toLowerCase().endsWith('.md')
  )

  for (const file of markdownFiles) {
    // Detect node type from path
    const expectedType = detectNodeTypeFromPath(file.path)
    if (!expectedType) {
      // File is not in a recognized node directory, skip it
      parseErrors.push({
        path: file.path,
        message:
          'File not in a recognized node directory (decisions/, components/, tasks/, notes/)',
      })
      continue
    }

    // Parse the markdown file
    const {
      frontmatter,
      title,
      body,
      error: parseError,
    } = parseMarkdownFile(file.content)

    if (parseError) {
      parseErrors.push({
        path: file.path,
        message: `Failed to parse frontmatter: ${parseError}`,
      })
      continue
    }

    // Extract node ID from filename
    const nodeId = getNodeIdFromPath(file.path)

    // Build node data for validation
    const nodeData = {
      ...frontmatter,
      id: nodeId,
      title: title || frontmatter.title || nodeId,
      content: body,
    }

    // Validate the node
    const validationResult = validateNode(nodeData)

    if (!validationResult.success) {
      parseErrors.push({
        path: file.path,
        message: validationResult.error.message,
      })
      continue
    }

    const node = validationResult.data

    // Verify node type matches directory
    if (node.type !== expectedType) {
      parseErrors.push({
        path: file.path,
        message: `Node type mismatch: file in ${NODE_DIRECTORIES[expectedType]}/ has type '${node.type}'`,
      })
      // Still include the node, but with warning
    }

    // Handle duplicate node IDs
    if (nodes.has(node.id)) {
      if (mergeMode) {
        // In merge mode, skip duplicates
        parseErrors.push({
          path: file.path,
          message: `Duplicate node ID '${node.id}' - skipping in merge mode`,
        })
        continue
      } else {
        // In replace mode, overwrite
        parseErrors.push({
          path: file.path,
          message: `Duplicate node ID '${node.id}' - overwriting previous node`,
        })
      }
    }

    nodes.set(node.id, node)
  }

  // If no nodes were successfully parsed, return error
  if (nodes.size === 0 && markdownFiles.length > 0) {
    return {
      success: false,
      project: null,
      parseErrors,
      error: 'No valid nodes found in the imported files',
    }
  }

  // Generate project ID from name
  const projectId = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Build the project
  const project: Project = {
    id: projectId,
    name: projectName,
    path: '', // Path will be set when saving to file system
    nodes,
    metadata: projectMetadata || createProjectMetadata(),
  }

  return {
    success: true,
    project,
    parseErrors,
    error: null,
  }
}

/**
 * Generate a filename for the export
 * @param projectName The project name
 * @param format The export format
 * @returns Suggested filename
 */
export function generateExportFilename(
  projectName: string,
  format: 'json' | 'markdown' | 'csv'
): string {
  const sanitized = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const timestamp = new Date().toISOString().split('T')[0]

  switch (format) {
    case 'json':
      return `${sanitized}-${timestamp}.json`
    case 'markdown':
      return `${sanitized}-${timestamp}.zip`
    case 'csv':
      return `${sanitized}-${timestamp}.csv`
  }
}

// ============================================================================
// CSV Export
// ============================================================================

/** Unicode BOM for Excel compatibility */
const UTF8_BOM = '\uFEFF'

/**
 * Escape a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Doubles any quotes inside the value
 * @param value The value to escape
 * @returns Properly escaped CSV field
 */
function escapeCSVField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // Check if value needs quoting
  const needsQuoting =
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')

  if (needsQuoting) {
    // Escape quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""')
    return `"${escaped}"`
  }

  return stringValue
}

/**
 * Format custom fields as a semicolon-separated string
 * e.g., "voltage:12V; torque:50Nm; weight:100g"
 */
function formatCustomFields(
  customFields: Record<string, string | number>
): string {
  const entries = Object.entries(customFields)
  if (entries.length === 0) return ''
  return entries.map(([key, value]) => `${key}:${value}`).join('; ')
}

/** Default fields for component CSV export */
const DEFAULT_COMPONENT_FIELDS = [
  'id',
  'title',
  'status',
  'cost',
  'supplier',
  'partNumber',
  'tags',
  'customFields',
  'created',
  'modified',
] as const

type ComponentFieldName = (typeof DEFAULT_COMPONENT_FIELDS)[number]

/**
 * Get the value of a component field
 */
function getComponentFieldValue(
  component: ComponentNode,
  field: ComponentFieldName
): string | number | null {
  switch (field) {
    case 'id':
      return component.id
    case 'title':
      return component.title
    case 'status':
      return component.status
    case 'cost':
      return component.cost
    case 'supplier':
      return component.supplier
    case 'partNumber':
      return component.partNumber
    case 'tags':
      return component.tags.join('; ')
    case 'customFields':
      return formatCustomFields(component.customFields)
    case 'created':
      return component.dates.created.toISOString()
    case 'modified':
      return component.dates.modified.toISOString()
    default:
      return null
  }
}

/** Human-readable header names for CSV columns */
const FIELD_HEADERS: Record<ComponentFieldName, string> = {
  id: 'ID',
  title: 'Title',
  status: 'Status',
  cost: 'Cost',
  supplier: 'Supplier',
  partNumber: 'Part Number',
  tags: 'Tags',
  customFields: 'Custom Fields',
  created: 'Created',
  modified: 'Modified',
}

/**
 * Export component nodes to CSV format
 * @param nodes Map or array of ForgeNodes (filters to components only)
 * @param options Export options
 * @returns CSVExportResult with CSV data
 */
export function exportComponentsToCSV(
  nodes: Map<string, ForgeNode> | ForgeNode[],
  options: CSVExportOptions = {}
): CSVExportResult {
  const { fields, includeBOM = true } = options

  // Convert Map to array if needed
  const nodeArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes

  // Filter to component nodes only
  const components = nodeArray.filter(isComponentNode)

  // Determine which fields to include
  const selectedFields = (
    fields
      ? fields.filter((f): f is ComponentFieldName =>
          DEFAULT_COMPONENT_FIELDS.includes(f as ComponentFieldName)
        )
      : [...DEFAULT_COMPONENT_FIELDS]
  ) as ComponentFieldName[]

  // Build CSV rows
  const rows: string[] = []

  // Header row
  const headerRow = selectedFields.map((f) => FIELD_HEADERS[f]).join(',')
  rows.push(headerRow)

  // Data rows - sort by title for consistent output
  const sortedComponents = [...components].sort((a, b) =>
    a.title.localeCompare(b.title)
  )

  for (const component of sortedComponents) {
    const rowValues = selectedFields.map((field) =>
      escapeCSVField(getComponentFieldValue(component, field))
    )
    rows.push(rowValues.join(','))
  }

  // Join rows with CRLF for Excel compatibility
  const csvContent = rows.join('\r\n')

  // Add BOM for Excel UTF-8 detection
  const data = includeBOM ? UTF8_BOM + csvContent : csvContent

  return {
    success: true,
    data,
    componentCount: components.length,
    filename: 'components.csv',
  }
}

/**
 * Export a Bill of Materials (BOM) for component nodes
 * Groups components by part number and sums quantities and costs
 * @param project The project to export
 * @returns BOMExportResult with CSV data
 */
export function exportBOM(project: Project): BOMExportResult {
  // Filter to component nodes only
  const components: ComponentNode[] = []
  for (const node of project.nodes.values()) {
    if (isComponentNode(node)) {
      components.push(node)
    }
  }

  // Group by part number (or by ID if no part number)
  const lineItemMap = new Map<string, BOMLineItem>()

  for (const component of components) {
    // Use part number as key, or generate a unique key for items without part numbers
    const key = component.partNumber || `_no_pn_${component.id}`
    const isNoPartNumber = !component.partNumber

    const existing = lineItemMap.get(key)
    if (existing) {
      // Add to existing line item
      existing.quantity += 1
      existing.nodeIds.push(component.id)
      // If costs differ, we take the first one (or could average)
      if (existing.extendedCost !== null && component.cost !== null) {
        existing.extendedCost = existing.quantity * existing.unitCost!
      }
    } else {
      // Create new line item
      lineItemMap.set(key, {
        partNumber: component.partNumber || '',
        description: isNoPartNumber
          ? component.title
          : (components.find((c) => c.partNumber === key)?.title ??
            component.title),
        supplier: component.supplier || '',
        quantity: 1,
        unitCost: component.cost,
        extendedCost: component.cost,
        nodeIds: [component.id],
      })
    }
  }

  // Convert to array and sort by part number, then description
  const lineItems = Array.from(lineItemMap.values()).sort((a, b) => {
    if (a.partNumber !== b.partNumber) {
      // Items with part numbers come first
      if (!a.partNumber) return 1
      if (!b.partNumber) return -1
      return a.partNumber.localeCompare(b.partNumber)
    }
    return a.description.localeCompare(b.description)
  })

  // Calculate totals
  let totalCost = 0
  let unknownCostCount = 0

  for (const item of lineItems) {
    if (item.extendedCost !== null) {
      totalCost += item.extendedCost
    } else {
      unknownCostCount += item.quantity
    }
  }

  // Build CSV
  const rows: string[] = []

  // Header row
  rows.push('Part Number,Description,Supplier,Quantity,Unit Cost,Extended Cost')

  // Data rows
  for (const item of lineItems) {
    const row = [
      escapeCSVField(item.partNumber),
      escapeCSVField(item.description),
      escapeCSVField(item.supplier),
      escapeCSVField(item.quantity),
      item.unitCost !== null ? escapeCSVField(item.unitCost.toFixed(2)) : '',
      item.extendedCost !== null
        ? escapeCSVField(item.extendedCost.toFixed(2))
        : '',
    ]
    rows.push(row.join(','))
  }

  // Add empty row and totals
  rows.push('') // Empty row before totals
  rows.push(`,,,,Total:,${escapeCSVField(totalCost.toFixed(2))}`)

  if (unknownCostCount > 0) {
    rows.push(`,,,,Unknown Cost Items:,${unknownCostCount}`)
  }

  // Join rows with CRLF for Excel compatibility
  const csvContent = rows.join('\r\n')

  // Add BOM for Excel UTF-8 detection
  const data = UTF8_BOM + csvContent

  // Generate filename
  const sanitizedName = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `${sanitizedName}-bom-${timestamp}.csv`

  return {
    success: true,
    data,
    lineItemCount: lineItems.length,
    totalCost,
    unknownCostCount,
    filename,
  }
}
