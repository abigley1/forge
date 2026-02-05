/**
 * useServerPersistence Hook Tests
 *
 * Tests for the server persistence hook types and LoadResult discriminated union.
 * The actual hook behavior is tested via E2E tests due to complex store interactions.
 */

import { describe, it, expect } from 'vitest'

import type { LoadResult } from './useServerPersistence'

describe('LoadResult type', () => {
  describe('discriminated union structure', () => {
    it('should have correct type structure for success with data', () => {
      const result: LoadResult = { status: 'success', hasData: true }
      expect(result.status).toBe('success')
      if (result.status === 'success') {
        expect(result.hasData).toBe(true)
      }
    })

    it('should have correct type structure for success without data', () => {
      const result: LoadResult = { status: 'success', hasData: false }
      expect(result.status).toBe('success')
      if (result.status === 'success') {
        expect(result.hasData).toBe(false)
      }
    })

    it('should have correct type structure for error', () => {
      const result: LoadResult = { status: 'error', error: 'test error' }
      expect(result.status).toBe('error')
      if (result.status === 'error') {
        expect(result.error).toBe('test error')
      }
    })

    it('should have correct type structure for stale', () => {
      const result: LoadResult = { status: 'stale' }
      expect(result.status).toBe('stale')
    })
  })

  describe('type narrowing', () => {
    it('should narrow types correctly for success', () => {
      const result: LoadResult = { status: 'success', hasData: true }

      if (result.status === 'success') {
        // TypeScript should know hasData exists here
        const hasData: boolean = result.hasData
        expect(hasData).toBe(true)
      }
    })

    it('should narrow types correctly for error', () => {
      const result: LoadResult = { status: 'error', error: 'test' }

      if (result.status === 'error') {
        // TypeScript should know error exists here
        const error: string = result.error
        expect(error).toBe('test')
      }
    })

    it('should narrow types correctly for stale', () => {
      const result: LoadResult = { status: 'stale' }

      if (result.status === 'stale') {
        // No additional properties for stale
        expect(result.status).toBe('stale')
      }
    })

    it('should allow exhaustive switch statement', () => {
      const handleResult = (result: LoadResult): string => {
        switch (result.status) {
          case 'success':
            return result.hasData ? 'has data' : 'no data'
          case 'error':
            return `error: ${result.error}`
          case 'stale':
            return 'stale'
        }
      }

      expect(handleResult({ status: 'success', hasData: true })).toBe(
        'has data'
      )
      expect(handleResult({ status: 'success', hasData: false })).toBe(
        'no data'
      )
      expect(handleResult({ status: 'error', error: 'test' })).toBe(
        'error: test'
      )
      expect(handleResult({ status: 'stale' })).toBe('stale')
    })
  })
})
