/**
 * YAML Frontmatter Parsing & Serialization
 *
 * Provides utilities for parsing markdown files with YAML frontmatter
 * and extracting wiki-links from content.
 */

import matter from 'gray-matter'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of parsing frontmatter from a markdown file
 */
export interface ParseFrontmatterResult {
  /** Parsed frontmatter data (empty object if none) */
  data: Record<string, unknown>
  /** Markdown content without frontmatter */
  content: string
  /** Error message if parsing failed (null on success) */
  error: string | null
}

/**
 * Result of parsing the markdown body
 */
export interface ParseMarkdownBodyResult {
  /** Extracted title from first # heading (null if not found) */
  title: string | null
  /** Content without the title heading */
  body: string
}

/**
 * Frontmatter field ordering for serialization
 * Fields are ordered: type, status, priority, then alphabetically
 */
const FIELD_ORDER = [
  'type',
  'status',
  'priority',
  'selected',
  'cost',
  'supplier',
  'partNumber',
  'depends_on',
  'blocks',
  'tags',
  'created',
  'modified',
]

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Parses YAML frontmatter from markdown content
 *
 * Handles edge cases:
 * - No frontmatter: returns empty data object
 * - Malformed YAML: returns error message
 * - Empty file: returns empty data and content
 *
 * Uses gray-matter with default safe YAML parsing (js-yaml DEFAULT_SCHEMA).
 *
 * @param rawContent - Raw markdown content with optional frontmatter
 * @returns Parsed data, content, and any error
 */
export function parseFrontmatter(rawContent: string): ParseFrontmatterResult {
  // Handle empty or whitespace-only input
  if (!rawContent || rawContent.trim() === '') {
    return {
      data: {},
      content: '',
      error: null,
    }
  }

  try {
    // gray-matter uses safe YAML parsing by default (no code execution)
    const result = matter(rawContent)

    return {
      data: result.data as Record<string, unknown>,
      content: result.content,
      error: null,
    }
  } catch (err) {
    // Return error for malformed YAML
    const errorMessage =
      err instanceof Error ? err.message : 'Failed to parse frontmatter'
    return {
      data: {},
      content: rawContent,
      error: errorMessage,
    }
  }
}

/**
 * Extracts the title from the first # heading in markdown content
 *
 * @param content - Markdown content (without frontmatter)
 * @returns Extracted title and remaining body
 */
export function parseMarkdownBody(content: string): ParseMarkdownBodyResult {
  if (!content || content.trim() === '') {
    return {
      title: null,
      body: '',
    }
  }

  // Match first # heading (not ## or more)
  const headingMatch = content.match(/^#\s+(.+)$/m)

  if (!headingMatch) {
    return {
      title: null,
      body: content.trim(),
    }
  }

  const title = headingMatch[1].trim()

  // Remove the title line from content
  const body = content.replace(/^#\s+.+\n?/m, '').trim()

  return {
    title,
    body,
  }
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Sorts object keys according to FIELD_ORDER, then alphabetically
 */
function sortFrontmatterKeys(obj: Record<string, unknown>): string[] {
  const keys = Object.keys(obj)

  return keys.sort((a, b) => {
    const indexA = FIELD_ORDER.indexOf(a)
    const indexB = FIELD_ORDER.indexOf(b)

    // Both in FIELD_ORDER: sort by order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB
    }

    // Only a is in FIELD_ORDER: a comes first
    if (indexA !== -1) {
      return -1
    }

    // Only b is in FIELD_ORDER: b comes first
    if (indexB !== -1) {
      return 1
    }

    // Neither in FIELD_ORDER: alphabetical
    return a.localeCompare(b)
  })
}

/**
 * Serializes frontmatter data to YAML string with proper field ordering
 *
 * Field order: type, status, priority, then other fields alphabetically
 *
 * @param data - Frontmatter data object
 * @returns YAML string (without --- delimiters)
 */
export function serializeFrontmatterData(
  data: Record<string, unknown>
): string {
  if (!data || Object.keys(data).length === 0) {
    return ''
  }

  const sortedKeys = sortFrontmatterKeys(data)
  const lines: string[] = []

  for (const key of sortedKeys) {
    const value = data[key]
    lines.push(formatYamlValue(key, value))
  }

  return lines.join('\n')
}

/**
 * Formats a single key-value pair as YAML
 */
function formatYamlValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return `${key}: null`
  }

  if (typeof value === 'string') {
    // Check if string needs quoting
    if (
      value === '' ||
      value.includes(':') ||
      value.includes('#') ||
      value.includes('\n') ||
      value.startsWith(' ') ||
      value.endsWith(' ')
    ) {
      return `${key}: "${value.replace(/"/g, '\\"')}"`
    }
    return `${key}: ${value}`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${key}: ${value}`
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${key}: []`
    }
    // Format as inline array for simple values, multi-line for complex
    const isSimple = value.every(
      (v) => typeof v === 'string' || typeof v === 'number'
    )
    if (isSimple) {
      const formatted = value.map((v) =>
        typeof v === 'string' ? `"${v}"` : String(v)
      )
      return `${key}: [${formatted.join(', ')}]`
    }
    // Multi-line array for complex objects
    const items = value.map((v) => `  - ${JSON.stringify(v)}`).join('\n')
    return `${key}:\n${items}`
  }

  if (typeof value === 'object') {
    // Format nested objects
    return `${key}: ${JSON.stringify(value)}`
  }

  return `${key}: ${String(value)}`
}

/**
 * Serializes frontmatter data and content back to a markdown file string
 *
 * @param data - Frontmatter data object
 * @param content - Markdown content (without frontmatter)
 * @returns Complete markdown file string with frontmatter
 */
export function serializeFrontmatter(
  data: Record<string, unknown>,
  content: string
): string {
  const yaml = serializeFrontmatterData(data)

  if (!yaml) {
    return content
  }

  return `---\n${yaml}\n---\n\n${content}`
}

// ============================================================================
// Wiki-Link Extraction
// ============================================================================

/**
 * Regex pattern for wiki-links: [[link-target]]
 */
const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g

/**
 * Regex patterns for code blocks and inline code
 */
const FENCED_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g
const INDENTED_CODE_BLOCK_PATTERN = /(?:^|\n)(?: {4}|\t).+/g
const INLINE_CODE_PATTERN = /`[^`]+`/g

/**
 * Extracts wiki-links from markdown content
 *
 * Wiki-links inside code blocks (fenced or indented) and inline code are ignored.
 *
 * @param markdown - Markdown content to search
 * @returns Array of unique link targets (without [[ ]])
 */
export function extractWikiLinks(markdown: string): string[] {
  if (!markdown || markdown.trim() === '') {
    return []
  }

  // Remove code blocks and inline code to avoid false matches
  let cleanedContent = markdown

  // Remove fenced code blocks first (```...```)
  cleanedContent = cleanedContent.replace(FENCED_CODE_BLOCK_PATTERN, '')

  // Remove indented code blocks
  cleanedContent = cleanedContent.replace(INDENTED_CODE_BLOCK_PATTERN, '')

  // Remove inline code
  cleanedContent = cleanedContent.replace(INLINE_CODE_PATTERN, '')

  // Extract all wiki-links
  const links: string[] = []
  let match

  while ((match = WIKI_LINK_PATTERN.exec(cleanedContent)) !== null) {
    const linkTarget = match[1].trim()
    if (linkTarget && !links.includes(linkTarget)) {
      links.push(linkTarget)
    }
  }

  return links
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Parses a complete markdown file, extracting frontmatter, title, and wiki-links
 *
 * @param rawContent - Complete markdown file content
 * @returns Parsed components of the file
 */
export function parseMarkdownFile(rawContent: string): {
  frontmatter: Record<string, unknown>
  title: string | null
  body: string
  wikiLinks: string[]
  error: string | null
} {
  const { data, content, error } = parseFrontmatter(rawContent)
  const { title, body } = parseMarkdownBody(content)
  const wikiLinks = extractWikiLinks(content)

  return {
    frontmatter: data,
    title,
    body,
    wikiLinks,
    error,
  }
}
