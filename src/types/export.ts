import type { Project } from './project'
import type { ValidationResult } from '@/lib/validation'

/**
 * Supported export formats
 */
export type ExportFormat = 'json' | 'markdown' | 'csv'

/**
 * Options for JSON export
 */
export interface JSONExportOptions {
  /** Pretty print with indentation (default: true) */
  prettyPrint?: boolean
  /** Include export metadata (default: true) */
  includeMetadata?: boolean
  /** Indentation spaces for pretty print (default: 2) */
  indentSpaces?: number
}

/**
 * Options for Markdown export
 */
export interface MarkdownExportOptions {
  /** Include frontmatter in exported files (default: true) */
  includeFrontmatter?: boolean
}

/**
 * Options for CSV export
 */
export interface CSVExportOptions {
  /** Fields to include in CSV (default: all) */
  fields?: string[]
  /** Include BOM for Excel compatibility (default: true) */
  includeBOM?: boolean
}

/**
 * Combined export options by format
 */
export type ExportOptions = {
  json?: JSONExportOptions
  markdown?: MarkdownExportOptions
  csv?: CSVExportOptions
}

/**
 * Metadata included in exports
 */
export interface ExportMetadata {
  /** Export format version for migration support */
  version: string
  /** ISO timestamp of when export was created */
  exportedAt: string
  /** Name of the exporting application */
  exportedBy: string
  /** Total number of nodes in export */
  nodeCount: number
}

/**
 * Structure of a JSON project export
 */
export interface JSONExport {
  /** Export metadata */
  metadata: ExportMetadata
  /** Project information */
  project: {
    id: string
    name: string
    description?: string
    createdAt: string
    modifiedAt: string
    nodeOrder?: string[]
    nodePositions?: Record<string, { x: number; y: number }>
  }
  /** All nodes in the project (serialized) */
  nodes: SerializedNode[]
}

/**
 * A node serialized for export (dates as ISO strings)
 */
export interface SerializedNode {
  id: string
  type: 'decision' | 'component' | 'task' | 'note'
  title: string
  content: string
  tags: string[]
  dates: {
    created: string
    modified: string
  }
  // Type-specific fields are included dynamically
  [key: string]: unknown
}

/**
 * Result of an export operation
 */
export interface ExportResult {
  success: true
  data: string
  format: ExportFormat
  filename: string
}

/**
 * Result of an import operation
 */
export type ImportResult = ValidationResult<Project>

/**
 * Options for import operations
 */
export interface ImportOptions {
  /** How to handle conflicts with existing nodes */
  conflictResolution?: 'skip' | 'overwrite' | 'rename'
  /** Whether to merge with existing project or replace */
  mergeMode?: boolean
}

/**
 * A file entry for markdown import
 */
export interface MarkdownFileEntry {
  /** The file path (relative to project root) */
  path: string
  /** The file content */
  content: string
}

/**
 * Result of exporting a project to markdown format
 * Returns a map of relative file paths to their content
 */
export interface MarkdownExportResult {
  /** Map of file paths to content */
  files: Map<string, string>
  /** Project metadata file content (project.json) */
  projectJson: string
}

/**
 * Parse error for markdown import
 */
export interface MarkdownParseError {
  /** Path to the file that failed */
  path: string
  /** Error message */
  message: string
}

/**
 * Result of importing from markdown files
 */
export interface MarkdownImportResult {
  /** Whether import was successful */
  success: boolean
  /** The imported project (if successful) */
  project: Project | null
  /** Parse errors for individual files (non-fatal) */
  parseErrors: MarkdownParseError[]
  /** Fatal error message (if unsuccessful) */
  error: string | null
}

/**
 * Result of exporting components to CSV format
 */
export interface CSVExportResult {
  /** Whether export was successful */
  success: true
  /** CSV content string */
  data: string
  /** Number of components exported */
  componentCount: number
  /** Suggested filename */
  filename: string
}

/**
 * A single line item in a Bill of Materials
 */
export interface BOMLineItem {
  /** Part number */
  partNumber: string
  /** Component title/description */
  description: string
  /** Supplier name */
  supplier: string
  /** Quantity (count of components with same part number) */
  quantity: number
  /** Unit cost */
  unitCost: number | null
  /** Extended cost (quantity * unit cost) */
  extendedCost: number | null
  /** Node IDs of components with this part number */
  nodeIds: string[]
}

/**
 * Result of exporting a Bill of Materials
 */
export interface BOMExportResult {
  /** Whether export was successful */
  success: true
  /** CSV content string */
  data: string
  /** Number of unique line items */
  lineItemCount: number
  /** Total cost of all components with known costs */
  totalCost: number
  /** Number of components with unknown costs */
  unknownCostCount: number
  /** Suggested filename */
  filename: string
}

/**
 * Service interface for export/import operations
 */
export interface ExportService {
  /**
   * Export a project to the specified format
   * @param project The project to export
   * @param format The export format
   * @param options Format-specific options
   * @returns Export result with data and suggested filename
   */
  export(
    project: Project,
    format: ExportFormat,
    options?: ExportOptions
  ): Promise<ExportResult>
}
