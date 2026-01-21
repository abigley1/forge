/**
 * Tests for Wiki-Link Decorations
 *
 * Tests the CodeMirror decorations for wiki-links including:
 * - Link finding and extraction
 * - Content preview generation
 * - Code block exclusion
 */

import { describe, it, expect, vi } from 'vitest'
import {
  findWikiLinks,
  extractLinkTarget,
  createContentPreview,
  createWikiLinkDecorations,
  type WikiLinkDecorationOptions,
  type ResolvedLink,
  type UnresolvedLink,
} from './wikiLinkDecorations'

// ============================================================================
// extractLinkTarget Tests
// ============================================================================

describe('extractLinkTarget', () => {
  it('extracts target from regex match', () => {
    const pattern = /\[\[([^\]]+)\]\]/g
    const text = '[[my-link]]'
    const match = pattern.exec(text)!
    expect(extractLinkTarget(match)).toBe('my-link')
  })

  it('trims whitespace from target', () => {
    const pattern = /\[\[([^\]]+)\]\]/g
    const text = '[[  my-link  ]]'
    const match = pattern.exec(text)!
    expect(extractLinkTarget(match)).toBe('my-link')
  })
})

// ============================================================================
// findWikiLinks Tests
// ============================================================================

describe('findWikiLinks', () => {
  it('finds single wiki-link', () => {
    const text = 'See [[my-node]] for details'
    const links = findWikiLinks(text)

    expect(links).toHaveLength(1)
    expect(links[0]).toEqual({
      from: 4,
      to: 15,
      target: 'my-node',
    })
  })

  it('finds multiple wiki-links', () => {
    const text = '[[first]] and [[second]] are related'
    const links = findWikiLinks(text)

    expect(links).toHaveLength(2)
    expect(links[0].target).toBe('first')
    expect(links[1].target).toBe('second')
  })

  it('returns empty array for no links', () => {
    const text = 'No wiki links here'
    const links = findWikiLinks(text)

    expect(links).toHaveLength(0)
  })

  it('handles empty string', () => {
    const links = findWikiLinks('')
    expect(links).toHaveLength(0)
  })

  it('handles links with spaces in target', () => {
    const text = '[[My Node Title]]'
    const links = findWikiLinks(text)

    expect(links).toHaveLength(1)
    expect(links[0].target).toBe('My Node Title')
  })

  it('excludes links inside fenced code blocks', () => {
    const text = `
Some text
\`\`\`
[[code-link]]
\`\`\`
[[real-link]]
`
    const links = findWikiLinks(text)

    expect(links).toHaveLength(1)
    expect(links[0].target).toBe('real-link')
  })

  it('excludes links inside indented code blocks', () => {
    const text = `
Normal text
    [[indented-code-link]]
[[real-link]]
`
    const links = findWikiLinks(text)

    expect(links).toHaveLength(1)
    expect(links[0].target).toBe('real-link')
  })

  it('excludes links inside inline code', () => {
    const text = 'Use `[[code-link]]` for example and [[real-link]]'
    const links = findWikiLinks(text)

    expect(links).toHaveLength(1)
    expect(links[0].target).toBe('real-link')
  })

  it('handles multiple code blocks and links', () => {
    const text = `
\`\`\`
[[code1]]
\`\`\`
[[link1]]
\`[[inline]]\`
[[link2]]
`
    const links = findWikiLinks(text)

    expect(links).toHaveLength(2)
    expect(links[0].target).toBe('link1')
    expect(links[1].target).toBe('link2')
  })

  it('returns correct positions', () => {
    const text = 'abc [[link]] def'
    const links = findWikiLinks(text)

    expect(links).toHaveLength(1)
    expect(links[0].from).toBe(4)
    expect(links[0].to).toBe(12)
  })
})

// ============================================================================
// createContentPreview Tests
// ============================================================================

describe('createContentPreview', () => {
  it('returns content as-is if under max length', () => {
    const content = 'Short content'
    const preview = createContentPreview(content)

    expect(preview).toBe('Short content')
  })

  it('truncates long content at word boundary', () => {
    const content =
      'This is a very long piece of content that should be truncated at a reasonable word boundary to create a clean preview'
    const preview = createContentPreview(content, 50)

    expect(preview.length).toBeLessThanOrEqual(53) // 50 + '...'
    expect(preview).toMatch(/\.\.\.$/s)
  })

  it('removes frontmatter', () => {
    const content = `---
type: task
status: pending
---
Actual content here`

    const preview = createContentPreview(content)
    expect(preview).toBe('Actual content here')
  })

  it('removes first heading (title)', () => {
    const content = `# My Title

This is the actual content`

    const preview = createContentPreview(content)
    expect(preview).toBe('This is the actual content')
  })

  it('removes both frontmatter and title', () => {
    const content = `---
type: note
---
# Note Title

The body content here`

    const preview = createContentPreview(content)
    expect(preview).toBe('The body content here')
  })

  it('returns empty string for empty content', () => {
    expect(createContentPreview('')).toBe('')
  })

  it('handles content with only whitespace', () => {
    expect(createContentPreview('   \n\n   ')).toBe('')
  })

  it('respects custom max length', () => {
    const content = 'A B C D E F G H I J K L M N O P Q R S T'
    const preview = createContentPreview(content, 20)

    expect(preview.length).toBeLessThanOrEqual(23) // 20 + '...'
  })
})

// ============================================================================
// createWikiLinkDecorations Tests
// ============================================================================

describe('createWikiLinkDecorations', () => {
  it('returns array of extensions', () => {
    const options: WikiLinkDecorationOptions = {
      resolveLink: () => null,
    }

    const extensions = createWikiLinkDecorations(options)

    expect(Array.isArray(extensions)).toBe(true)
    expect(extensions.length).toBeGreaterThan(0)
  })

  it('includes hover handlers when callbacks provided', () => {
    const options: WikiLinkDecorationOptions = {
      resolveLink: () => null,
      onLinkHover: vi.fn(),
      onLinkHoverEnd: vi.fn(),
    }

    const extensions = createWikiLinkDecorations(options)

    // Should have more extensions with hover handlers
    const withoutHover = createWikiLinkDecorations({
      resolveLink: () => null,
    })

    expect(extensions.length).toBeGreaterThan(withoutHover.length)
  })
})

// ============================================================================
// Type Tests
// ============================================================================

describe('LinkInfo types', () => {
  it('ResolvedLink has correct shape', () => {
    const resolved: ResolvedLink = {
      id: 'node-id',
      title: 'Node Title',
      type: 'task',
      contentPreview: 'Preview text...',
      exists: true,
    }

    expect(resolved.exists).toBe(true)
    expect(resolved.id).toBe('node-id')
  })

  it('UnresolvedLink has correct shape', () => {
    const unresolved: UnresolvedLink = {
      target: 'broken-link',
      exists: false,
    }

    expect(unresolved.exists).toBe(false)
    expect(unresolved.target).toBe('broken-link')
  })
})
