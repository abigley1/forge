/**
 * Full-text search service using MiniSearch
 *
 * Provides full-text search across node titles and content with:
 * - Fast indexing and searching
 * - Context snippets around matches
 * - Highlighted match terms
 */

import MiniSearch, { type SearchResult as MiniSearchResult } from 'minisearch'
import type { ForgeNode, NodeType } from '@/types/nodes'

/** Document structure for indexing */
export interface SearchDocument {
  id: string
  title: string
  content: string
  type: NodeType
  tags: string[]
}

/** A single match location within text */
export interface MatchLocation {
  /** Start index of match in text */
  start: number
  /** End index of match (exclusive) */
  end: number
  /** The matched term */
  term: string
}

/** Context snippet with match highlighting info */
export interface ContextSnippet {
  /** The snippet text */
  text: string
  /** Match locations within the snippet (adjusted for snippet start) */
  matches: MatchLocation[]
  /** Whether this snippet is from title or content */
  source: 'title' | 'content'
}

/** Highlighted segment for rendering */
export interface HighlightSegment {
  /** Text content of the segment */
  text: string
  /** Whether this segment is a match highlight */
  isHighlight: boolean
}

/** Search result with context and highlighting */
export interface FullTextSearchResult {
  /** The node ID */
  id: string
  /** Node title */
  title: string
  /** Node type */
  type: NodeType
  /** Search relevance score */
  score: number
  /** Context snippets with match info */
  snippets: ContextSnippet[]
  /** Terms that matched */
  matchedTerms: string[]
}

/** Options for creating the search index */
export interface SearchIndexOptions {
  /** Fields to search (default: ['title', 'content', 'tags']) */
  fields?: string[]
  /** Fields to boost in ranking (default: { title: 2, tags: 1.5 }) */
  boost?: Record<string, number>
}

/** Options for searching */
export interface SearchOptions {
  /** Maximum number of results (default: 50) */
  limit?: number
  /** Whether to use fuzzy matching (default: true) */
  fuzzy?: boolean | number
  /** Whether to use prefix matching (default: true) */
  prefix?: boolean
  /** Filter by node types */
  filterTypes?: NodeType[]
}

/** Options for snippet extraction */
export interface SnippetOptions {
  /** Maximum length of snippet (default: 150) */
  maxLength?: number
  /** Characters before match to include (default: 30) */
  contextBefore?: number
  /** Characters after match to include (default: 100) */
  contextAfter?: number
}

const DEFAULT_INDEX_OPTIONS: Required<SearchIndexOptions> = {
  fields: ['title', 'content', 'tags'],
  boost: { title: 2, tags: 1.5 },
}

const DEFAULT_SEARCH_OPTIONS: Required<Omit<SearchOptions, 'filterTypes'>> = {
  limit: 50,
  fuzzy: 0.2,
  prefix: true,
}

const DEFAULT_SNIPPET_OPTIONS: Required<SnippetOptions> = {
  maxLength: 150,
  contextBefore: 30,
  contextAfter: 100,
}

/**
 * Convert a ForgeNode to a searchable document
 */
export function nodeToDocument(node: ForgeNode): SearchDocument {
  return {
    id: node.id,
    title: node.title,
    content: node.content,
    type: node.type,
    tags: node.tags,
  }
}

/**
 * Create a new MiniSearch index configured for node searching
 */
export function createSearchIndex(
  options: SearchIndexOptions = {}
): MiniSearch<SearchDocument> {
  const { fields, boost } = { ...DEFAULT_INDEX_OPTIONS, ...options }

  return new MiniSearch<SearchDocument>({
    fields,
    storeFields: ['title', 'type', 'tags'],
    searchOptions: {
      boost,
    },
  })
}

/**
 * Build a search index from a collection of nodes
 */
export function buildSearchIndex(
  nodes: Map<string, ForgeNode> | ForgeNode[],
  options: SearchIndexOptions = {}
): MiniSearch<SearchDocument> {
  const index = createSearchIndex(options)
  const documents: SearchDocument[] = []

  const nodeArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes
  for (const node of nodeArray) {
    documents.push(nodeToDocument(node))
  }

  index.addAll(documents)
  return index
}

/**
 * Find all positions where a term appears in text (case-insensitive)
 */
export function findTermPositions(text: string, term: string): MatchLocation[] {
  const positions: MatchLocation[] = []
  const lowerText = text.toLowerCase()
  const lowerTerm = term.toLowerCase()

  let pos = 0
  while (pos < lowerText.length) {
    const index = lowerText.indexOf(lowerTerm, pos)
    if (index === -1) break

    positions.push({
      start: index,
      end: index + term.length,
      term,
    })
    pos = index + 1
  }

  return positions
}

/**
 * Merge overlapping match locations
 */
export function mergeMatchLocations(
  locations: MatchLocation[]
): MatchLocation[] {
  if (locations.length === 0) return []

  // Sort by start position
  const sorted = [...locations].sort((a, b) => a.start - b.start)
  const merged: MatchLocation[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]
    const last = merged[merged.length - 1]

    if (current.start <= last.end) {
      // Overlapping - merge
      last.end = Math.max(last.end, current.end)
      last.term = last.term + '|' + current.term
    } else {
      merged.push(current)
    }
  }

  return merged
}

/**
 * Extract a context snippet around matches
 */
export function extractSnippet(
  text: string,
  matches: MatchLocation[],
  source: 'title' | 'content',
  options: SnippetOptions = {}
): ContextSnippet | null {
  const { maxLength, contextBefore, contextAfter } = {
    ...DEFAULT_SNIPPET_OPTIONS,
    ...options,
  }

  if (matches.length === 0) {
    // No matches - return beginning of content as snippet
    if (source === 'content' && text.length > 0) {
      const snippetText = text.slice(0, maxLength)
      return {
        text: snippetText + (text.length > maxLength ? '...' : ''),
        matches: [],
        source,
      }
    }
    return null
  }

  // Use first match as anchor
  const firstMatch = matches[0]
  let start = Math.max(0, firstMatch.start - contextBefore)
  let end = Math.min(text.length, firstMatch.end + contextAfter)

  // Adjust to word boundaries if possible
  if (start > 0) {
    const spaceIndex = text.lastIndexOf(' ', start + 10)
    if (spaceIndex > start - 10) {
      start = spaceIndex + 1
    }
  }

  if (end < text.length) {
    const spaceIndex = text.indexOf(' ', end - 10)
    if (spaceIndex !== -1 && spaceIndex < end + 10) {
      end = spaceIndex
    }
  }

  // Ensure we don't exceed maxLength
  if (end - start > maxLength) {
    end = start + maxLength
  }

  const snippetText = text.slice(start, end)

  // Adjust match positions for snippet
  const adjustedMatches: MatchLocation[] = matches
    .filter((m) => m.start >= start && m.start < end)
    .map((m) => ({
      start: m.start - start,
      end: Math.min(m.end - start, snippetText.length),
      term: m.term,
    }))

  const prefix = start > 0 ? '...' : ''
  const suffix = end < text.length ? '...' : ''

  return {
    text: prefix + snippetText + suffix,
    matches: adjustedMatches.map((m) => ({
      ...m,
      start: m.start + prefix.length,
      end: m.end + prefix.length,
    })),
    source,
  }
}

/**
 * Convert snippet text and matches into highlighted segments for rendering
 */
export function highlightSnippet(snippet: ContextSnippet): HighlightSegment[] {
  const { text, matches } = snippet

  if (matches.length === 0) {
    return [{ text, isHighlight: false }]
  }

  const merged = mergeMatchLocations(matches)
  const segments: HighlightSegment[] = []
  let lastEnd = 0

  for (const match of merged) {
    // Add non-highlighted segment before match
    if (match.start > lastEnd) {
      segments.push({
        text: text.slice(lastEnd, match.start),
        isHighlight: false,
      })
    }

    // Add highlighted match
    segments.push({
      text: text.slice(match.start, match.end),
      isHighlight: true,
    })

    lastEnd = match.end
  }

  // Add remaining text after last match
  if (lastEnd < text.length) {
    segments.push({
      text: text.slice(lastEnd),
      isHighlight: false,
    })
  }

  return segments
}

/**
 * Search the index and return results with context snippets
 */
export function searchNodes(
  index: MiniSearch<SearchDocument>,
  query: string,
  nodes: Map<string, ForgeNode>,
  options: SearchOptions = {},
  snippetOptions: SnippetOptions = {}
): FullTextSearchResult[] {
  const { limit, fuzzy, prefix, filterTypes } = {
    ...DEFAULT_SEARCH_OPTIONS,
    ...options,
  }

  if (!query.trim()) {
    return []
  }

  // Search with minisearch
  const searchResults: MiniSearchResult[] = index.search(query, {
    fuzzy,
    prefix,
  })

  // Process results
  const results: FullTextSearchResult[] = []

  for (const result of searchResults) {
    if (results.length >= limit) break

    const node = nodes.get(result.id)
    if (!node) continue

    // Filter by type if specified
    if (
      filterTypes &&
      filterTypes.length > 0 &&
      !filterTypes.includes(node.type)
    ) {
      continue
    }

    // Get matched terms
    const matchedTerms = Object.keys(result.match)

    // Find match positions in title and content
    const titleMatches: MatchLocation[] = []
    const contentMatches: MatchLocation[] = []

    for (const term of matchedTerms) {
      titleMatches.push(...findTermPositions(node.title, term))
      contentMatches.push(...findTermPositions(node.content, term))
    }

    // Build snippets
    const snippets: ContextSnippet[] = []

    // Title snippet (always include if matched)
    if (titleMatches.length > 0) {
      const titleSnippet = extractSnippet(
        node.title,
        mergeMatchLocations(titleMatches),
        'title',
        { ...snippetOptions, maxLength: 200 }
      )
      if (titleSnippet) {
        snippets.push(titleSnippet)
      }
    }

    // Content snippet
    const contentSnippet = extractSnippet(
      node.content,
      mergeMatchLocations(contentMatches),
      'content',
      snippetOptions
    )
    if (contentSnippet) {
      snippets.push(contentSnippet)
    }

    results.push({
      id: node.id,
      title: node.title,
      type: node.type,
      score: result.score,
      snippets,
      matchedTerms,
    })
  }

  return results
}

/**
 * Add a single node to an existing index
 */
export function addNodeToIndex(
  index: MiniSearch<SearchDocument>,
  node: ForgeNode
): void {
  const doc = nodeToDocument(node)
  index.add(doc)
}

/**
 * Remove a node from an existing index
 */
export function removeNodeFromIndex(
  index: MiniSearch<SearchDocument>,
  nodeId: string
): void {
  index.discard(nodeId)
}

/**
 * Update a node in an existing index (remove and re-add)
 */
export function updateNodeInIndex(
  index: MiniSearch<SearchDocument>,
  node: ForgeNode
): void {
  // MiniSearch requires remove then add for updates
  try {
    index.discard(node.id)
  } catch (error) {
    // MiniSearch throws when discarding a non-existent document
    // Only suppress this specific expected case
    if (
      !(error instanceof Error) ||
      !error.message.includes('not in the index')
    ) {
      console.error(
        `Unexpected error discarding node ${node.id} from search index:`,
        error
      )
    }
  }
  index.add(nodeToDocument(node))
}

/**
 * Vacuum the index to reclaim space from discarded documents
 */
export function vacuumIndex(index: MiniSearch<SearchDocument>): void {
  index.vacuum()
}
