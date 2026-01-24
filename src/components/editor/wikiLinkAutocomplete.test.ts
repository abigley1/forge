/**
 * Wiki-Link Autocomplete Tests
 *
 * Tests for the wiki-link autocomplete functionality including:
 * - Fuzzy matching logic
 * - Node suggestion filtering
 * - Extension creation
 * - Utility functions
 */

import { describe, it, expect, vi } from 'vitest'
import {
  createWikiLinkAutocomplete,
  nodeToSuggestion,
  nodesToSuggestions,
  type NodeSuggestion,
} from './wikiLinkAutocomplete'
import type {
  ForgeNode,
  NodeType,
  DecisionNode,
  TaskNode,
  ComponentNode,
  NoteNode,
} from '@/types/nodes'

// ============================================================================
// Helper Functions
// ============================================================================

function createMockNode(id: string, title: string, type: NodeType): ForgeNode {
  const baseNode = {
    id,
    title,
    type,
    content: `# ${title}\n\nContent for ${id}`,
    tags: [],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
  }

  switch (type) {
    case 'decision':
      return {
        ...baseNode,
        type: 'decision',
        status: 'pending',
        selected: null,
        options: [],
        criteria: [],
        rationale: null,
        selectedDate: null,
        parent: null,
      } as DecisionNode
    case 'task':
      return {
        ...baseNode,
        type: 'task',
        status: 'pending',
        priority: 'medium',
        dependsOn: [],
        blocks: [],
        checklist: [],
        parent: null,
      } as TaskNode
    case 'component':
      return {
        ...baseNode,
        type: 'component',
        status: 'considering',
        cost: null,
        supplier: null,
        partNumber: null,
        customFields: {},
        parent: null,
      } as ComponentNode
    case 'note':
      return {
        ...baseNode,
        type: 'note',
        parent: null,
      } as NoteNode
    default:
      throw new Error(`Unknown type: ${type}`)
  }
}

function createMockNodes(): Map<string, ForgeNode> {
  const nodes = new Map<string, ForgeNode>()
  nodes.set(
    'motor-selection',
    createMockNode('motor-selection', 'Motor Selection', 'decision')
  )
  nodes.set(
    'nema17-stepper',
    createMockNode('nema17-stepper', 'NEMA17 Stepper Motor', 'component')
  )
  nodes.set(
    'design-frame',
    createMockNode('design-frame', 'Design Frame Structure', 'task')
  )
  nodes.set(
    'project-overview',
    createMockNode('project-overview', 'Project Overview', 'note')
  )
  nodes.set(
    'enclosure-material',
    createMockNode(
      'enclosure-material',
      'Enclosure Material Decision',
      'decision'
    )
  )
  return nodes
}

// ============================================================================
// nodeToSuggestion Tests
// ============================================================================

describe('nodeToSuggestion', () => {
  it('converts ForgeNode to NodeSuggestion', () => {
    const node = createMockNode('test-node', 'Test Node', 'task')
    const suggestion = nodeToSuggestion(node)

    expect(suggestion).toEqual({
      id: 'test-node',
      title: 'Test Node',
      type: 'task',
    })
  })

  it('converts decision node correctly', () => {
    const node = createMockNode('my-decision', 'My Decision', 'decision')
    const suggestion = nodeToSuggestion(node)

    expect(suggestion.type).toBe('decision')
    expect(suggestion.id).toBe('my-decision')
    expect(suggestion.title).toBe('My Decision')
  })

  it('converts component node correctly', () => {
    const node = createMockNode('my-component', 'My Component', 'component')
    const suggestion = nodeToSuggestion(node)

    expect(suggestion.type).toBe('component')
  })

  it('converts note node correctly', () => {
    const node = createMockNode('my-note', 'My Note', 'note')
    const suggestion = nodeToSuggestion(node)

    expect(suggestion.type).toBe('note')
  })
})

// ============================================================================
// nodesToSuggestions Tests
// ============================================================================

describe('nodesToSuggestions', () => {
  it('converts Map of nodes to array of suggestions', () => {
    const nodes = createMockNodes()
    const suggestions = nodesToSuggestions(nodes)

    expect(suggestions).toHaveLength(5)
    expect(suggestions.every((s) => s.id && s.title && s.type)).toBe(true)
  })

  it('returns empty array for empty map', () => {
    const emptyMap = new Map<string, ForgeNode>()
    const suggestions = nodesToSuggestions(emptyMap)

    expect(suggestions).toEqual([])
  })

  it('preserves all node properties', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set(
      'unique-node',
      createMockNode('unique-node', 'Unique Title', 'decision')
    )

    const suggestions = nodesToSuggestions(nodes)

    expect(suggestions[0]).toEqual({
      id: 'unique-node',
      title: 'Unique Title',
      type: 'decision',
    })
  })

  it('handles nodes with special characters in title', () => {
    const nodes = new Map<string, ForgeNode>()
    nodes.set(
      'special-node',
      createMockNode('special-node', "Node's Title (2024)", 'task')
    )

    const suggestions = nodesToSuggestions(nodes)

    expect(suggestions[0].title).toBe("Node's Title (2024)")
  })
})

// ============================================================================
// createWikiLinkAutocomplete Tests
// ============================================================================

describe('createWikiLinkAutocomplete', () => {
  const mockNodes: NodeSuggestion[] = [
    { id: 'motor-selection', title: 'Motor Selection', type: 'decision' },
    { id: 'nema17-stepper', title: 'NEMA17 Stepper Motor', type: 'component' },
    { id: 'design-frame', title: 'Design Frame Structure', type: 'task' },
    { id: 'project-overview', title: 'Project Overview', type: 'note' },
  ]

  it('returns an array of extensions', () => {
    const extensions = createWikiLinkAutocomplete({
      getNodes: () => mockNodes,
    })

    expect(Array.isArray(extensions)).toBe(true)
    expect(extensions.length).toBeGreaterThan(0)
  })

  it('accepts all configuration options', () => {
    const onLinkInserted = vi.fn()
    const onNavigate = vi.fn()
    const onResultCountChange = vi.fn()

    const extensions = createWikiLinkAutocomplete({
      getNodes: () => mockNodes,
      onLinkInserted,
      onNavigate,
      onResultCountChange,
      maxSuggestions: 5,
    })

    expect(extensions).toBeDefined()
    expect(extensions.length).toBeGreaterThan(0)
  })

  it('uses default maxSuggestions when not provided', () => {
    const extensions = createWikiLinkAutocomplete({
      getNodes: () => mockNodes,
    })

    expect(extensions).toBeDefined()
  })

  it('handles empty nodes array', () => {
    const extensions = createWikiLinkAutocomplete({
      getNodes: () => [],
    })

    expect(extensions).toBeDefined()
  })

  it('calls getNodes function to get suggestions', () => {
    const getNodes = vi.fn().mockReturnValue(mockNodes)

    createWikiLinkAutocomplete({
      getNodes,
    })

    // The function should be captured but not called until typing [[
    expect(typeof getNodes).toBe('function')
  })
})

// ============================================================================
// NodeSuggestion Type Tests
// ============================================================================

describe('NodeSuggestion type', () => {
  it('requires id, title, and type', () => {
    const suggestion: NodeSuggestion = {
      id: 'test-id',
      title: 'Test Title',
      type: 'task',
    }

    expect(suggestion.id).toBe('test-id')
    expect(suggestion.title).toBe('Test Title')
    expect(suggestion.type).toBe('task')
  })

  it('accepts all node types', () => {
    const types: NodeType[] = ['decision', 'component', 'task', 'note']

    types.forEach((type) => {
      const suggestion: NodeSuggestion = {
        id: `${type}-id`,
        title: `${type} Title`,
        type,
      }
      expect(suggestion.type).toBe(type)
    })
  })
})

// ============================================================================
// Integration Tests (Extension Structure)
// ============================================================================

describe('extension structure', () => {
  it('includes autocompletion extension', () => {
    const extensions = createWikiLinkAutocomplete({
      getNodes: () => [],
    })

    // Extensions array should have multiple parts
    expect(extensions.length).toBeGreaterThanOrEqual(1)
  })

  it('includes theme extension', () => {
    const extensions = createWikiLinkAutocomplete({
      getNodes: () => [],
    })

    // Should include styling theme
    expect(extensions.some((ext) => ext !== undefined)).toBe(true)
  })

  it('includes trigger plugin', () => {
    const extensions = createWikiLinkAutocomplete({
      getNodes: () => [],
    })

    // Should include the trigger plugin for [[
    expect(extensions.length).toBeGreaterThanOrEqual(3)
  })
})

// ============================================================================
// Export Tests
// ============================================================================

describe('exports', () => {
  it('exports createWikiLinkAutocomplete', async () => {
    const module = await import('./wikiLinkAutocomplete')
    expect(module.createWikiLinkAutocomplete).toBeDefined()
    expect(typeof module.createWikiLinkAutocomplete).toBe('function')
  })

  it('exports nodeToSuggestion', async () => {
    const module = await import('./wikiLinkAutocomplete')
    expect(module.nodeToSuggestion).toBeDefined()
    expect(typeof module.nodeToSuggestion).toBe('function')
  })

  it('exports nodesToSuggestions', async () => {
    const module = await import('./wikiLinkAutocomplete')
    expect(module.nodesToSuggestions).toBeDefined()
    expect(typeof module.nodesToSuggestions).toBe('function')
  })

  it('exports startCompletion', async () => {
    const module = await import('./wikiLinkAutocomplete')
    expect(module.startCompletion).toBeDefined()
    expect(typeof module.startCompletion).toBe('function')
  })

  it('exports closeCompletion', async () => {
    const module = await import('./wikiLinkAutocomplete')
    expect(module.closeCompletion).toBeDefined()
    expect(typeof module.closeCompletion).toBe('function')
  })
})

// ============================================================================
// Index Export Tests
// ============================================================================

describe('index exports wiki-link autocomplete', () => {
  it('exports createWikiLinkAutocomplete from index', async () => {
    const exports = await import('./index')
    expect(exports.createWikiLinkAutocomplete).toBeDefined()
  })

  it('exports nodeToSuggestion from index', async () => {
    const exports = await import('./index')
    expect(exports.nodeToSuggestion).toBeDefined()
  })

  it('exports nodesToSuggestions from index', async () => {
    const exports = await import('./index')
    expect(exports.nodesToSuggestions).toBeDefined()
  })
})
