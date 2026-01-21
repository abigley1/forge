/**
 * useSorting Hook Tests
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'

import { NodeType, createNodeDates } from '@/types/nodes'
import type { ForgeNode, NoteNode } from '@/types/nodes'

import { useSorting } from './useSorting'

// ============================================================================
// Test Setup
// ============================================================================

const wrapper = ({ children }: { children: ReactNode }) => (
  <NuqsTestingAdapter>{children}</NuqsTestingAdapter>
)

// ============================================================================
// Test Data
// ============================================================================

const createNoteNode = (
  id: string,
  title: string,
  dates?: { created: Date; modified: Date }
): NoteNode => ({
  id,
  type: NodeType.Note,
  title,
  content: '',
  tags: [],
  dates: dates || createNodeDates(),
})

// ============================================================================
// Tests
// ============================================================================

describe('useSorting', () => {
  describe('initial state', () => {
    it('returns default sort config', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      expect(result.current.sortBy).toBe('modified')
      expect(result.current.direction).toBe('desc')
    })

    it('provides sortConfig object', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      expect(result.current.sortConfig).toEqual({
        sortBy: 'modified',
        direction: 'desc',
      })
    })

    it('provides sort options', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      expect(result.current.sortOptions).toHaveLength(5)
      expect(result.current.sortOptions.map((o) => o.value)).toContain(
        'modified'
      )
      expect(result.current.sortOptions.map((o) => o.value)).toContain('title')
      expect(result.current.sortOptions.map((o) => o.value)).toContain('type')
    })
  })

  describe('setSortBy', () => {
    it('changes sort criteria', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      act(() => {
        result.current.setSortBy('title')
      })

      expect(result.current.sortBy).toBe('title')
    })

    it('can set to all valid options', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      const options = [
        'modified',
        'created',
        'title',
        'type',
        'status',
      ] as const

      options.forEach((option) => {
        act(() => {
          result.current.setSortBy(option)
        })
        expect(result.current.sortBy).toBe(option)
      })
    })
  })

  describe('setDirection', () => {
    it('changes sort direction', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      act(() => {
        result.current.setDirection('asc')
      })

      expect(result.current.direction).toBe('asc')
    })
  })

  describe('toggleDirection', () => {
    it('toggles from desc to asc', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      expect(result.current.direction).toBe('desc')

      act(() => {
        result.current.toggleDirection()
      })

      expect(result.current.direction).toBe('asc')
    })

    it('toggles from asc to desc', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      act(() => {
        result.current.setDirection('asc')
      })

      expect(result.current.direction).toBe('asc')

      act(() => {
        result.current.toggleDirection()
      })

      expect(result.current.direction).toBe('desc')
    })
  })

  describe('resetSort', () => {
    it('resets to default values', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      act(() => {
        result.current.setSortBy('title')
        result.current.setDirection('asc')
      })

      expect(result.current.sortBy).toBe('title')
      expect(result.current.direction).toBe('asc')

      act(() => {
        result.current.resetSort()
      })

      expect(result.current.sortBy).toBe('modified')
      expect(result.current.direction).toBe('desc')
    })
  })

  describe('sortNodes', () => {
    it('sorts nodes by current criteria', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      const nodes: ForgeNode[] = [
        createNoteNode('b', 'Beta'),
        createNoteNode('a', 'Alpha'),
        createNoteNode('c', 'Charlie'),
      ]

      act(() => {
        result.current.setSortBy('title')
        result.current.setDirection('asc')
      })

      const sorted = result.current.sortNodes(nodes)

      expect(sorted.map((n) => n.title)).toEqual(['Alpha', 'Beta', 'Charlie'])
    })

    it('sorts by modified date descending by default', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      const jan1 = new Date('2024-01-01')
      const jan15 = new Date('2024-01-15')
      const jan30 = new Date('2024-01-30')

      const nodes: ForgeNode[] = [
        createNoteNode('oldest', 'Oldest', { created: jan1, modified: jan1 }),
        createNoteNode('newest', 'Newest', { created: jan1, modified: jan30 }),
        createNoteNode('middle', 'Middle', { created: jan1, modified: jan15 }),
      ]

      const sorted = result.current.sortNodes(nodes)

      expect(sorted.map((n) => n.id)).toEqual(['newest', 'middle', 'oldest'])
    })

    it('does not mutate original array', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      const nodes: ForgeNode[] = [
        createNoteNode('b', 'Beta'),
        createNoteNode('a', 'Alpha'),
      ]

      act(() => {
        result.current.setSortBy('title')
      })

      const sorted = result.current.sortNodes(nodes)

      expect(sorted).not.toBe(nodes)
      expect(nodes[0].id).toBe('b') // Original unchanged
    })
  })

  describe('sortConfig updates', () => {
    it('sortConfig reflects current state', () => {
      const { result } = renderHook(() => useSorting(), { wrapper })

      act(() => {
        result.current.setSortBy('created')
        result.current.setDirection('asc')
      })

      expect(result.current.sortConfig).toEqual({
        sortBy: 'created',
        direction: 'asc',
      })
    })
  })
})
