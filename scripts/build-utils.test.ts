import { describe, it, expect } from 'vitest'
import {
  getGitHash,
  getGitHashFull,
  getGitBranch,
  generateVersionInfo,
  generateVersionJson,
  VersionInfo,
} from './build-utils'

describe('build-utils', () => {
  describe('getGitHash', () => {
    it('returns a short git hash in a git repository', () => {
      const result = getGitHash()

      // In a git repo, should return a valid short hash
      // Short hashes are typically 7-8 hex characters
      expect(result).toMatch(/^[a-f0-9]{7,8}$/)
    })
  })

  describe('getGitHashFull', () => {
    it('returns a full git hash in a git repository', () => {
      const result = getGitHashFull()

      // Full hashes are exactly 40 hex characters
      expect(result).toMatch(/^[a-f0-9]{40}$/)
    })
  })

  describe('getGitBranch', () => {
    it('returns a branch name in a git repository', () => {
      const result = getGitBranch()

      // Should return a non-empty branch name
      expect(result.length).toBeGreaterThan(0)
      // Branch names don't contain spaces
      expect(result).not.toContain(' ')
    })
  })

  describe('generateVersionInfo', () => {
    it('generates version info for production build', () => {
      const beforeTime = new Date().toISOString()
      const result = generateVersionInfo('1.2.3', true)
      const afterTime = new Date().toISOString()

      expect(result.version).toBe('1.2.3')
      expect(result.buildEnvironment).toBe('production')
      // Check timestamp is within valid range
      expect(result.buildTimestamp >= beforeTime).toBe(true)
      expect(result.buildTimestamp <= afterTime).toBe(true)
    })

    it('generates version info for development build', () => {
      const result = generateVersionInfo('0.0.1', false)

      expect(result.version).toBe('0.0.1')
      expect(result.buildEnvironment).toBe('development')
    })

    it('includes all required fields', () => {
      const result = generateVersionInfo('1.0.0', true)

      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('buildTimestamp')
      expect(result).toHaveProperty('gitHash')
      expect(result).toHaveProperty('gitHashFull')
      expect(result).toHaveProperty('gitBranch')
      expect(result).toHaveProperty('buildEnvironment')
    })

    it('returns valid git information', () => {
      const result = generateVersionInfo('1.0.0', true)

      // In a git repo, git info should be valid
      expect(result.gitHash).toMatch(/^[a-f0-9]{7,8}$/)
      expect(result.gitHashFull).toMatch(/^[a-f0-9]{40}$/)
      expect(result.gitBranch.length).toBeGreaterThan(0)
    })
  })

  describe('generateVersionJson', () => {
    it('generates valid JSON string', () => {
      const result = generateVersionJson('2.0.0', true)

      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('contains correct version info when parsed', () => {
      const result = generateVersionJson('2.0.0', true)
      const parsed: VersionInfo = JSON.parse(result)

      expect(parsed.version).toBe('2.0.0')
      expect(parsed.buildEnvironment).toBe('production')
    })

    it('formats JSON with 2-space indentation', () => {
      const result = generateVersionJson('1.0.0', true)

      // Should have proper indentation (2 spaces)
      expect(result).toContain('  "version"')
    })

    it('contains valid ISO timestamp', () => {
      const result = generateVersionJson('1.0.0', true)
      const parsed: VersionInfo = JSON.parse(result)

      const timestamp = new Date(parsed.buildTimestamp)
      expect(timestamp.toString()).not.toBe('Invalid Date')
    })

    it('produces development environment when isProduction is false', () => {
      const result = generateVersionJson('1.0.0', false)
      const parsed: VersionInfo = JSON.parse(result)

      expect(parsed.buildEnvironment).toBe('development')
    })
  })
})
