/**
 * Link Context Extraction Utilities
 *
 * Functions for extracting context snippets around wiki-links in content.
 */

import type { ForgeNode } from '@/types/nodes'

/**
 * Extracts a context snippet around a wiki-link in content.
 * Shows approximately 50 characters before and after the link.
 *
 * @param content - The full content to search
 * @param linkTarget - The link target to find (node ID or title)
 * @param contextChars - Number of characters to show before/after (default 50)
 * @returns Array of context snippets where the link appears
 */
export function extractLinkContexts(
  content: string,
  linkTarget: string,
  contextChars = 50
): string[] {
  if (!content || !linkTarget) return []

  const contexts: string[] = []
  const lowerTarget = linkTarget.toLowerCase()

  // Find all wiki-link occurrences (case-insensitive)
  const linkPattern = /\[\[([^\]]+)\]\]/g
  let match

  while ((match = linkPattern.exec(content)) !== null) {
    const foundTarget = match[1].trim()

    // Check if this link matches (by ID or title, case-insensitive)
    if (foundTarget.toLowerCase() === lowerTarget) {
      const start = Math.max(0, match.index - contextChars)
      const end = Math.min(
        content.length,
        match.index + match[0].length + contextChars
      )

      let snippet = content.slice(start, end)

      // Add ellipsis if truncated
      if (start > 0) snippet = '…' + snippet.trimStart()
      if (end < content.length) snippet = snippet.trimEnd() + '…'

      // Clean up newlines for display
      snippet = snippet.replace(/\n/g, ' ').replace(/\s+/g, ' ')

      contexts.push(snippet)
    }
  }

  return contexts
}

/**
 * Finds the first context where a node links to another.
 * Tries to match by node ID first, then by title.
 */
export function findLinkContext(
  sourceNode: ForgeNode,
  targetNode: ForgeNode,
  contextChars = 50
): string[] {
  // Try matching by ID first
  let contexts = extractLinkContexts(
    sourceNode.content,
    targetNode.id,
    contextChars
  )

  // If no matches, try by title
  if (contexts.length === 0) {
    contexts = extractLinkContexts(
      sourceNode.content,
      targetNode.title,
      contextChars
    )
  }

  return contexts
}
