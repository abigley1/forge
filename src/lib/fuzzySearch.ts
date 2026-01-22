/**
 * Fuzzy search utilities with Levenshtein distance matching
 */

/**
 * Represents a fuzzy match result with score and matched character indices
 */
export interface FuzzyMatchResult {
  /** The item that matched */
  item: string
  /** Match score (0-1, higher is better) */
  score: number
  /** Indices of matched characters in the original string */
  matchedIndices: number[]
}

/**
 * Calculate Levenshtein distance between two strings
 * This measures the minimum number of single-character edits (insertions,
 * deletions, or substitutions) required to change one string into another.
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()

  if (aLower.length === 0) return bLower.length
  if (bLower.length === 0) return aLower.length

  // Create matrix
  const matrix: number[][] = []

  // Initialize first column
  for (let i = 0; i <= bLower.length; i++) {
    matrix[i] = [i]
  }

  // Initialize first row
  for (let j = 0; j <= aLower.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= bLower.length; i++) {
    for (let j = 1; j <= aLower.length; j++) {
      if (bLower[i - 1] === aLower[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[bLower.length][aLower.length]
}

/**
 * Find indices of query characters that appear in sequence in the target string.
 * This enables highlighting matched characters in results.
 */
export function findMatchedIndices(target: string, query: string): number[] {
  const targetLower = target.toLowerCase()
  const queryLower = query.toLowerCase()
  const indices: number[] = []

  let queryIndex = 0
  for (
    let i = 0;
    i < targetLower.length && queryIndex < queryLower.length;
    i++
  ) {
    if (targetLower[i] === queryLower[queryIndex]) {
      indices.push(i)
      queryIndex++
    }
  }

  // Only return indices if we matched all query characters
  return queryIndex === queryLower.length ? indices : []
}

/**
 * Calculate a fuzzy match score between a target string and a query.
 * Higher scores indicate better matches.
 *
 * Scoring factors:
 * - Exact substring match: bonus
 * - Prefix match: bonus
 * - Character sequence match: bonus
 * - Levenshtein distance: penalty for differences
 * - Consecutive matches: bonus
 */
export function fuzzyMatchScore(target: string, query: string): number {
  if (!query) return 1 // Empty query matches everything

  const targetLower = target.toLowerCase()
  const queryLower = query.toLowerCase()

  // Exact match
  if (targetLower === queryLower) return 1

  // Exact substring match
  if (targetLower.includes(queryLower)) {
    // Prefix match is best
    if (targetLower.startsWith(queryLower)) {
      return 0.95 - (queryLower.length / targetLower.length) * 0.05
    }
    // Substring match
    return 0.85 - (queryLower.length / targetLower.length) * 0.1
  }

  // Check for character sequence match (fuzzy)
  const matchedIndices = findMatchedIndices(target, query)
  if (matchedIndices.length === 0) {
    // No sequence match, use Levenshtein
    const distance = levenshteinDistance(target, query)
    const maxLen = Math.max(target.length, query.length)
    const normalizedDistance = distance / maxLen

    // Low similarity threshold - if too different, return 0
    if (normalizedDistance > 0.8) return 0

    return Math.max(0, 0.3 * (1 - normalizedDistance))
  }

  // Score based on matched indices
  let score = 0.7 // Base score for character sequence match

  // Bonus for consecutive matches
  let consecutiveCount = 0
  for (let i = 1; i < matchedIndices.length; i++) {
    if (matchedIndices[i] === matchedIndices[i - 1] + 1) {
      consecutiveCount++
    }
  }
  score += (consecutiveCount / (matchedIndices.length - 1 || 1)) * 0.15

  // Penalty for spread-out matches
  const spread = matchedIndices[matchedIndices.length - 1] - matchedIndices[0]
  const idealSpread = query.length - 1
  score -= Math.min(0.1, ((spread - idealSpread) / target.length) * 0.1)

  // Bonus for early match start
  score += (1 - matchedIndices[0] / target.length) * 0.05

  return Math.max(0, Math.min(1, score))
}

/**
 * Perform fuzzy search on an array of strings
 */
export function fuzzySearch(
  items: string[],
  query: string,
  options: {
    threshold?: number
    limit?: number
  } = {}
): FuzzyMatchResult[] {
  const { threshold = 0.1, limit = 50 } = options

  if (!query.trim()) {
    // Return all items with neutral score when query is empty
    return items.slice(0, limit).map((item) => ({
      item,
      score: 1,
      matchedIndices: [],
    }))
  }

  const results: FuzzyMatchResult[] = []

  for (const item of items) {
    const score = fuzzyMatchScore(item, query)
    if (score >= threshold) {
      const matchedIndices = findMatchedIndices(item, query)
      results.push({ item, score, matchedIndices })
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, limit)
}

/**
 * Generic fuzzy search on objects with a key extraction function
 */
export function fuzzySearchObjects<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
  options: {
    threshold?: number
    limit?: number
  } = {}
): Array<{ item: T; score: number; matchedIndices: number[] }> {
  const { threshold = 0.1, limit = 50 } = options

  if (!query.trim()) {
    return items.slice(0, limit).map((item) => ({
      item,
      score: 1,
      matchedIndices: [],
    }))
  }

  const results: Array<{ item: T; score: number; matchedIndices: number[] }> =
    []

  for (const item of items) {
    const text = getSearchText(item)
    const score = fuzzyMatchScore(text, query)
    if (score >= threshold) {
      const matchedIndices = findMatchedIndices(text, query)
      results.push({ item, score, matchedIndices })
    }
  }

  results.sort((a, b) => b.score - a.score)

  return results.slice(0, limit)
}

/**
 * Highlight matched characters in a string by wrapping them in a component.
 * Returns an array of strings and highlighted segments.
 */
export function highlightMatches(
  text: string,
  matchedIndices: number[]
): Array<{ text: string; highlighted: boolean }> {
  if (matchedIndices.length === 0) {
    return [{ text, highlighted: false }]
  }

  const result: Array<{ text: string; highlighted: boolean }> = []
  let lastIndex = 0

  // Group consecutive indices
  const groups: number[][] = []
  let currentGroup: number[] = []

  for (const index of matchedIndices) {
    if (
      currentGroup.length === 0 ||
      index === currentGroup[currentGroup.length - 1] + 1
    ) {
      currentGroup.push(index)
    } else {
      groups.push(currentGroup)
      currentGroup = [index]
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  for (const group of groups) {
    const start = group[0]
    const end = group[group.length - 1]

    // Add non-highlighted text before this group
    if (start > lastIndex) {
      result.push({ text: text.slice(lastIndex, start), highlighted: false })
    }

    // Add highlighted text
    result.push({ text: text.slice(start, end + 1), highlighted: true })
    lastIndex = end + 1
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), highlighted: false })
  }

  return result
}
