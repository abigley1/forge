import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  findMatchedIndices,
  fuzzyMatchScore,
  fuzzySearch,
  fuzzySearchObjects,
  highlightMatches,
} from './fuzzySearch'

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
    expect(levenshteinDistance('', '')).toBe(0)
  })

  it('returns string length for empty comparison', () => {
    expect(levenshteinDistance('hello', '')).toBe(5)
    expect(levenshteinDistance('', 'hello')).toBe(5)
  })

  it('calculates correct distance for single edits', () => {
    expect(levenshteinDistance('hello', 'hallo')).toBe(1) // substitution
    expect(levenshteinDistance('hello', 'hellos')).toBe(1) // insertion
    expect(levenshteinDistance('hello', 'hell')).toBe(1) // deletion
  })

  it('calculates correct distance for multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
    expect(levenshteinDistance('saturday', 'sunday')).toBe(3)
  })

  it('is case-insensitive', () => {
    expect(levenshteinDistance('Hello', 'hello')).toBe(0)
    expect(levenshteinDistance('HELLO', 'hello')).toBe(0)
  })
})

describe('findMatchedIndices', () => {
  it('finds sequential character matches', () => {
    expect(findMatchedIndices('hello world', 'hwo')).toEqual([0, 6, 7])
    expect(findMatchedIndices('foobar', 'fbr')).toEqual([0, 3, 5])
  })

  it('returns empty array when query cannot be matched', () => {
    expect(findMatchedIndices('hello', 'xyz')).toEqual([])
    expect(findMatchedIndices('abc', 'abcd')).toEqual([])
  })

  it('finds consecutive character matches', () => {
    expect(findMatchedIndices('hello', 'hel')).toEqual([0, 1, 2])
    expect(findMatchedIndices('hello', 'hello')).toEqual([0, 1, 2, 3, 4])
  })

  it('is case-insensitive', () => {
    expect(findMatchedIndices('Hello World', 'hwo')).toEqual([0, 6, 7])
    expect(findMatchedIndices('FooBar', 'FB')).toEqual([0, 3])
  })

  it('handles empty query', () => {
    expect(findMatchedIndices('hello', '')).toEqual([])
  })

  it('handles empty target', () => {
    expect(findMatchedIndices('', 'abc')).toEqual([])
  })
})

describe('fuzzyMatchScore', () => {
  it('returns 1 for exact match', () => {
    expect(fuzzyMatchScore('hello', 'hello')).toBe(1)
  })

  it('returns 1 for empty query', () => {
    expect(fuzzyMatchScore('hello', '')).toBe(1)
  })

  it('returns high score for prefix match', () => {
    const score = fuzzyMatchScore('hello world', 'hello')
    expect(score).toBeGreaterThan(0.9)
  })

  it('returns good score for substring match', () => {
    const score = fuzzyMatchScore('hello world', 'world')
    expect(score).toBeGreaterThan(0.8)
    expect(score).toBeLessThan(0.95)
  })

  it('returns moderate score for character sequence match', () => {
    const score = fuzzyMatchScore('hello world', 'hlwrd')
    expect(score).toBeGreaterThan(0.5)
  })

  it('returns 0 for completely non-matching strings', () => {
    const score = fuzzyMatchScore('hello', 'xyz123')
    expect(score).toBe(0)
  })

  it('is case-insensitive', () => {
    expect(fuzzyMatchScore('Hello', 'HELLO')).toBe(1)
    expect(fuzzyMatchScore('HELLO WORLD', 'hello')).toBeGreaterThan(0.9)
  })

  it('scores consecutive matches higher than spread matches', () => {
    const consecutiveScore = fuzzyMatchScore('abcdefgh', 'abc')
    const spreadScore = fuzzyMatchScore('a1b2c3d4', 'abc')
    expect(consecutiveScore).toBeGreaterThan(spreadScore)
  })
})

describe('fuzzySearch', () => {
  const items = [
    'apple',
    'banana',
    'cherry',
    'date',
    'elderberry',
    'fig',
    'grape',
  ]

  it('returns all items for empty query', () => {
    const results = fuzzySearch(items, '')
    expect(results).toHaveLength(items.length)
    results.forEach((r) => expect(r.score).toBe(1))
  })

  it('finds exact matches', () => {
    const results = fuzzySearch(items, 'apple')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item).toBe('apple')
    expect(results[0].score).toBe(1)
  })

  it('finds prefix matches', () => {
    const results = fuzzySearch(items, 'app')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item).toBe('apple')
  })

  it('finds substring matches', () => {
    const results = fuzzySearch(items, 'nan')
    expect(results.some((r) => r.item === 'banana')).toBe(true)
  })

  it('finds fuzzy matches', () => {
    const results = fuzzySearch(items, 'bnn')
    expect(results.some((r) => r.item === 'banana')).toBe(true)
  })

  it('respects threshold', () => {
    const looseResults = fuzzySearch(items, 'xyz', { threshold: 0 })
    const strictResults = fuzzySearch(items, 'xyz', { threshold: 0.5 })
    expect(strictResults.length).toBeLessThanOrEqual(looseResults.length)
  })

  it('respects limit', () => {
    const results = fuzzySearch(items, '', { limit: 3 })
    expect(results.length).toBe(3)
  })

  it('sorts by score descending', () => {
    const results = fuzzySearch(['apple', 'application', 'app'], 'app')
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
    }
  })

  it('includes matched indices', () => {
    const results = fuzzySearch(['hello'], 'hlo')
    expect(results[0].matchedIndices).toEqual([0, 2, 4])
  })
})

describe('fuzzySearchObjects', () => {
  interface TestItem {
    id: number
    name: string
    description: string
  }

  const items: TestItem[] = [
    { id: 1, name: 'Create Task', description: 'Create a new task node' },
    { id: 2, name: 'Delete Node', description: 'Delete the selected node' },
    { id: 3, name: 'Export JSON', description: 'Export project as JSON' },
    {
      id: 4,
      name: 'Toggle Theme',
      description: 'Switch between light and dark',
    },
  ]

  it('searches by extracted text', () => {
    const results = fuzzySearchObjects(items, 'create', (item) => item.name)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.name).toBe('Create Task')
  })

  it('returns full objects', () => {
    const results = fuzzySearchObjects(items, 'json', (item) => item.name)
    expect(results[0].item).toEqual({
      id: 3,
      name: 'Export JSON',
      description: 'Export project as JSON',
    })
  })

  it('returns all items for empty query', () => {
    const results = fuzzySearchObjects(items, '', (item) => item.name)
    expect(results.length).toBe(items.length)
  })

  it('respects limit option', () => {
    const results = fuzzySearchObjects(items, '', (item) => item.name, {
      limit: 2,
    })
    expect(results.length).toBe(2)
  })
})

describe('highlightMatches', () => {
  it('returns single non-highlighted segment for empty indices', () => {
    const result = highlightMatches('hello', [])
    expect(result).toEqual([{ text: 'hello', highlighted: false }])
  })

  it('highlights single character', () => {
    const result = highlightMatches('hello', [0])
    expect(result).toEqual([
      { text: 'h', highlighted: true },
      { text: 'ello', highlighted: false },
    ])
  })

  it('highlights consecutive characters as single segment', () => {
    const result = highlightMatches('hello', [0, 1, 2])
    expect(result).toEqual([
      { text: 'hel', highlighted: true },
      { text: 'lo', highlighted: false },
    ])
  })

  it('highlights non-consecutive characters as separate segments', () => {
    const result = highlightMatches('hello', [0, 2, 4])
    expect(result).toEqual([
      { text: 'h', highlighted: true },
      { text: 'e', highlighted: false },
      { text: 'l', highlighted: true },
      { text: 'l', highlighted: false },
      { text: 'o', highlighted: true },
    ])
  })

  it('handles highlight at end of string', () => {
    const result = highlightMatches('hello', [4])
    expect(result).toEqual([
      { text: 'hell', highlighted: false },
      { text: 'o', highlighted: true },
    ])
  })

  it('handles full string highlighted', () => {
    const result = highlightMatches('hi', [0, 1])
    expect(result).toEqual([{ text: 'hi', highlighted: true }])
  })

  it('handles mixed consecutive and non-consecutive', () => {
    const result = highlightMatches('abcdefg', [0, 1, 3, 4, 6])
    expect(result).toEqual([
      { text: 'ab', highlighted: true },
      { text: 'c', highlighted: false },
      { text: 'de', highlighted: true },
      { text: 'f', highlighted: false },
      { text: 'g', highlighted: true },
    ])
  })
})
