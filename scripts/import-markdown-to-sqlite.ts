#!/usr/bin/env npx tsx
/**
 * Import Markdown Files to SQLite
 *
 * Imports existing Forge markdown files (from MCP filesystem or export)
 * into the SQLite database via the Express API.
 *
 * Usage:
 *   npx tsx scripts/import-markdown-to-sqlite.ts <source-dir> [--project-id <id>] [--api-url <url>]
 *
 * Example:
 *   npx tsx scripts/import-markdown-to-sqlite.ts ./data/my-project --project-id my-project
 *   npx tsx scripts/import-markdown-to-sqlite.ts ./backup --api-url http://localhost:3000/api
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parse as parseYaml } from 'yaml'

// Default configuration
const DEFAULT_API_URL = 'http://localhost:3000/api'

// Node type directories
const NODE_TYPE_DIRS = [
  'tasks',
  'decisions',
  'components',
  'notes',
  'subsystems',
  'assemblies',
  'modules',
] as const

type NodeType =
  | 'task'
  | 'decision'
  | 'component'
  | 'note'
  | 'subsystem'
  | 'assembly'
  | 'module'

interface ParsedNode {
  id: string
  type: NodeType
  title: string
  content: string
  frontmatter: Record<string, unknown>
}

interface ImportResult {
  success: boolean
  imported: number
  failed: number
  errors: string[]
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  sourceDir: string
  projectId: string
  apiUrl: string
} {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage: npx tsx scripts/import-markdown-to-sqlite.ts <source-dir> [options]

Options:
  --project-id <id>   Project ID to import into (default: derived from directory name)
  --api-url <url>     API URL (default: ${DEFAULT_API_URL})
  --help, -h          Show this help message

Examples:
  npx tsx scripts/import-markdown-to-sqlite.ts ./data/my-project
  npx tsx scripts/import-markdown-to-sqlite.ts ./backup --project-id imported-project
`)
    process.exit(0)
  }

  const sourceDir = args[0]
  let projectId = path.basename(sourceDir)
  let apiUrl = DEFAULT_API_URL

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--project-id' && args[i + 1]) {
      projectId = args[i + 1]
      i++
    } else if (args[i] === '--api-url' && args[i + 1]) {
      apiUrl = args[i + 1]
      i++
    }
  }

  return { sourceDir, projectId, apiUrl }
}

/**
 * Parse a markdown file with YAML frontmatter
 */
function parseMarkdownFile(
  content: string,
  filename: string
): ParsedNode | null {
  // Check for frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!frontmatterMatch) {
    console.warn(`  Warning: No frontmatter found in ${filename}`)
    return null
  }

  const [, frontmatterStr, body] = frontmatterMatch

  try {
    const frontmatter = parseYaml(frontmatterStr) as Record<string, unknown>

    // Extract required fields
    const type = frontmatter.type as NodeType
    const title =
      (frontmatter.title as string) || path.basename(filename, '.md')

    if (!type) {
      console.warn(`  Warning: No type in frontmatter for ${filename}`)
      return null
    }

    // Generate ID from filename
    const id = path.basename(filename, '.md')

    return {
      id,
      type,
      title,
      content: body.trim(),
      frontmatter,
    }
  } catch (error) {
    console.error(`  Error parsing frontmatter in ${filename}:`, error)
    return null
  }
}

/**
 * Convert parsed node to API create input
 */
function toCreateInput(node: ParsedNode): Record<string, unknown> {
  const fm = node.frontmatter

  const input: Record<string, unknown> = {
    id: node.id,
    type: node.type,
    title: node.title,
    content: node.content,
  }

  // Common fields
  if (fm.status) input.status = fm.status
  if (fm.tags && Array.isArray(fm.tags)) input.tags = fm.tags
  if (fm.parent) input.parent_id = fm.parent

  // Task-specific fields
  if (node.type === 'task') {
    if (fm.priority) input.priority = fm.priority
    if (fm.depends_on && Array.isArray(fm.depends_on))
      input.depends_on = fm.depends_on
    if (fm.checklist && Array.isArray(fm.checklist))
      input.checklist = fm.checklist
  }

  // Component-specific fields
  if (node.type === 'component') {
    if (fm.supplier) input.supplier = fm.supplier
    if (fm.part_number) input.part_number = fm.part_number
    if (fm.cost !== undefined) input.cost = Number(fm.cost)
    if (fm.datasheet_url) input.datasheet_url = fm.datasheet_url
    if (fm.custom_fields) input.custom_fields = fm.custom_fields
  }

  // Decision-specific fields
  if (node.type === 'decision') {
    if (fm.selected) input.selected_option = fm.selected
    if (fm.selected_option) input.selected_option = fm.selected_option
    if (fm.rationale) input.selection_rationale = fm.rationale
    if (fm.selection_rationale)
      input.selection_rationale = fm.selection_rationale
    if (fm.selected_date) input.selected_date = fm.selected_date
    if (fm.comparison_data) input.comparison_data = fm.comparison_data
  }

  return input
}

/**
 * Create a project via API
 */
async function createProject(
  apiUrl: string,
  projectId: string,
  name: string
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: projectId,
        name,
      }),
    })

    if (response.ok || response.status === 409) {
      // 409 means project already exists, which is fine
      return true
    }

    const body = await response.json()
    console.error(`Failed to create project: ${body.error || response.status}`)
    return false
  } catch (error) {
    console.error(`Failed to create project:`, error)
    return false
  }
}

/**
 * Create a node via API
 */
async function createNode(
  apiUrl: string,
  projectId: string,
  input: Record<string, unknown>
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/projects/${projectId}/nodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (response.ok) {
      return true
    }

    const body = await response.json()
    console.error(
      `  Failed to create node ${input.id}: ${body.error || response.status}`
    )
    return false
  } catch (error) {
    console.error(`  Failed to create node ${input.id}:`, error)
    return false
  }
}

/**
 * Import all markdown files from a directory
 */
async function importDirectory(
  sourceDir: string,
  projectId: string,
  apiUrl: string
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    failed: 0,
    errors: [],
  }

  // Collect all nodes first (for dependency ordering)
  const allNodes: ParsedNode[] = []

  for (const typeDir of NODE_TYPE_DIRS) {
    const dirPath = path.join(sourceDir, typeDir)

    try {
      const files = await fs.readdir(dirPath)
      const mdFiles = files.filter((f) => f.endsWith('.md'))

      console.log(`Found ${mdFiles.length} files in ${typeDir}/`)

      for (const file of mdFiles) {
        const filePath = path.join(dirPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const node = parseMarkdownFile(content, file)

        if (node) {
          // Override type based on directory if not set
          if (!node.type) {
            node.type = typeDir.replace(/s$/, '') as NodeType
          }
          allNodes.push(node)
        } else {
          result.failed++
          result.errors.push(`Failed to parse ${typeDir}/${file}`)
        }
      }
    } catch (error) {
      // Directory doesn't exist, skip it
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.warn(`  Warning: Could not read ${typeDir}/:`, error)
      }
    }
  }

  console.log(`\nTotal nodes to import: ${allNodes.length}`)

  // Sort nodes to import dependencies first
  // Nodes with no dependencies come first
  const nodeIds = new Set(allNodes.map((n) => n.id))
  const sortedNodes = [...allNodes].sort((a, b) => {
    const aDeps = (a.frontmatter.depends_on as string[] | undefined) || []
    const bDeps = (b.frontmatter.depends_on as string[] | undefined) || []

    // Filter to only internal dependencies
    const aInternalDeps = aDeps.filter((d) => nodeIds.has(d))
    const bInternalDeps = bDeps.filter((d) => nodeIds.has(d))

    return aInternalDeps.length - bInternalDeps.length
  })

  // Import nodes
  console.log('\nImporting nodes...')

  for (const node of sortedNodes) {
    const input = toCreateInput(node)
    const success = await createNode(apiUrl, projectId, input)

    if (success) {
      result.imported++
      console.log(`  + ${node.type}: ${node.title}`)
    } else {
      result.failed++
      result.errors.push(`Failed to import ${node.type} "${node.title}"`)
    }
  }

  result.success = result.failed === 0

  return result
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { sourceDir, projectId, apiUrl } = parseArgs()

  console.log('Forge Markdown to SQLite Importer')
  console.log('==================================')
  console.log(`Source:    ${sourceDir}`)
  console.log(`Project:   ${projectId}`)
  console.log(`API URL:   ${apiUrl}`)
  console.log()

  // Check source directory exists
  try {
    const stat = await fs.stat(sourceDir)
    if (!stat.isDirectory()) {
      console.error(`Error: ${sourceDir} is not a directory`)
      process.exit(1)
    }
  } catch {
    console.error(`Error: ${sourceDir} does not exist`)
    process.exit(1)
  }

  // Check API is available
  try {
    const healthResponse = await fetch(`${apiUrl}/health`)
    if (!healthResponse.ok) {
      console.error('Error: API server is not healthy')
      process.exit(1)
    }
    console.log('API server is healthy')
  } catch {
    console.error(`Error: Cannot connect to API at ${apiUrl}`)
    console.error('Make sure the server is running: cd server && npm run dev')
    process.exit(1)
  }

  // Create project
  console.log(`\nCreating project "${projectId}"...`)
  const projectCreated = await createProject(apiUrl, projectId, projectId)
  if (!projectCreated) {
    console.error('Failed to create project')
    process.exit(1)
  }
  console.log('Project ready')

  // Import nodes
  console.log('\nScanning for markdown files...')
  const result = await importDirectory(sourceDir, projectId, apiUrl)

  // Print summary
  console.log('\n==================================')
  console.log('Import Summary')
  console.log('==================================')
  console.log(`Imported: ${result.imported}`)
  console.log(`Failed:   ${result.failed}`)

  if (result.errors.length > 0) {
    console.log('\nErrors:')
    result.errors.forEach((e) => console.log(`  - ${e}`))
  }

  if (result.success) {
    console.log('\nImport completed successfully!')
  } else {
    console.log('\nImport completed with errors')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
