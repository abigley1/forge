import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBrokenLinks } from './useBrokenLinks'
import type { ForgeNode } from '@/types/nodes'
import { createNodeDates } from '@/types/nodes'

// Helper to create test nodes
function createTestNode(id: string, title: string, content: string): ForgeNode {
  return {
    id,
    type: 'note' as const,
    title,
    content,
    tags: [],
    dates: createNodeDates(),
  }
}

describe('useBrokenLinks', () => {
  let nodes: Map<string, ForgeNode>

  beforeEach(() => {
    nodes = new Map()
    nodes.set(
      'motor-selection',
      createTestNode(
        'motor-selection',
        'Motor Selection',
        '# Motor Selection\n\nContent here'
      )
    )
    nodes.set(
      'frame-design',
      createTestNode(
        'frame-design',
        'Frame Design',
        '# Frame Design\n\nContent here'
      )
    )
  })

  describe('initialization', () => {
    it('should return empty brokenLinks for empty content', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({ content: '', nodes })
      )

      expect(result.current.brokenLinks).toEqual([])
      expect(result.current.brokenLinkCount).toBe(0)
      expect(result.current.hasBrokenLinks).toBe(false)
    })

    it('should return empty brokenLinks when nodes map is empty', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Link to [[some-node]]',
          nodes: new Map(),
        })
      )

      expect(result.current.brokenLinks).toEqual([])
      expect(result.current.brokenLinkCount).toBe(0)
    })

    it('should return empty brokenLinks for content without wiki-links', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: '# Hello World\n\nNo links here.',
          nodes,
        })
      )

      expect(result.current.brokenLinks).toEqual([])
      expect(result.current.hasBrokenLinks).toBe(false)
    })
  })

  describe('broken link detection', () => {
    it('should detect broken links to non-existent nodes', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Link to [[non-existent-node]]',
          nodes,
        })
      )

      expect(result.current.brokenLinkCount).toBe(1)
      expect(result.current.brokenLinks[0].target).toBe('non-existent-node')
      expect(result.current.hasBrokenLinks).toBe(true)
    })

    it('should detect multiple broken links', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Links to [[foo]], [[bar]], and [[baz]]',
          nodes,
        })
      )

      expect(result.current.brokenLinkCount).toBe(3)
      expect(result.current.brokenLinks.map((l) => l.target)).toEqual([
        'foo',
        'bar',
        'baz',
      ])
    })

    it('should not report valid links as broken', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Link to [[motor-selection]] and [[frame-design]]',
          nodes,
        })
      )

      expect(result.current.brokenLinkCount).toBe(0)
      expect(result.current.hasBrokenLinks).toBe(false)
    })

    it('should detect mixed valid and broken links', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Valid: [[motor-selection]], broken: [[unknown-node]]',
          nodes,
        })
      )

      expect(result.current.brokenLinkCount).toBe(1)
      expect(result.current.brokenLinks[0].target).toBe('unknown-node')
    })
  })

  describe('isTitle classification', () => {
    it('should mark slug-like links as not title-based', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Link to [[my-broken-slug]]',
          nodes,
        })
      )

      expect(result.current.brokenLinks[0].isTitle).toBe(false)
    })

    it('should mark title-like links as title-based', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Link to [[My Broken Title]]',
          nodes,
        })
      )

      expect(result.current.brokenLinks[0].isTitle).toBe(true)
    })

    it('should mark links with special characters as title-based', () => {
      const { result } = renderHook(() =>
        useBrokenLinks({
          content: 'Link to [[Motor Selection (Draft)]]',
          nodes,
        })
      )

      expect(result.current.brokenLinks[0].isTitle).toBe(true)
    })
  })

  describe('memoization', () => {
    it('should return same array reference for unchanged inputs', () => {
      const content = 'Link to [[broken-link]]'
      const { result, rerender } = renderHook(
        ({ content, nodes }) => useBrokenLinks({ content, nodes }),
        { initialProps: { content, nodes } }
      )

      const firstResult = result.current.brokenLinks
      rerender({ content, nodes })
      expect(result.current.brokenLinks).toBe(firstResult)
    })

    it('should return new array when content changes', () => {
      const { result, rerender } = renderHook(
        ({ content, nodes }) => useBrokenLinks({ content, nodes }),
        { initialProps: { content: 'Link to [[foo]]', nodes } }
      )

      const firstResult = result.current.brokenLinks
      rerender({ content: 'Link to [[bar]]', nodes })
      expect(result.current.brokenLinks).not.toBe(firstResult)
      expect(result.current.brokenLinks[0].target).toBe('bar')
    })
  })
})
