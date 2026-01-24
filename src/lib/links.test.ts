/**
 * Link Index Tests
 *
 * Tests for the bidirectional wiki-link index functionality.
 */

import { describe, it, expect } from 'vitest'

import { NodeType, createNodeDates } from '@/types/nodes'
import type {
  ForgeNode,
  TaskNode,
  DecisionNode,
  NoteNode,
  ComponentNode,
} from '@/types/nodes'

import {
  buildLinkIndex,
  createEmptyLinkIndex,
  resolveLinkTarget,
  getOutgoingLinks,
  getIncomingLinks,
  getRelatedNodes,
  hasLinks,
  getOutgoingLinkCount,
  getIncomingLinkCount,
  findBrokenLinks,
  isValidLink,
} from './links'

// ============================================================================
// Test Data Factories
// ============================================================================

const createTaskNode = (id: string, title: string, content = ''): TaskNode => ({
  id,
  type: NodeType.Task,
  title,
  status: 'pending',
  priority: 'medium',
  content,
  tags: [],
  dates: createNodeDates(),
  dependsOn: [],
  blocks: [],
  checklist: [],
  parent: null,
})

const createDecisionNode = (
  id: string,
  title: string,
  content = ''
): DecisionNode => ({
  id,
  type: NodeType.Decision,
  title,
  status: 'pending',
  selected: null,
  content,
  tags: [],
  dates: createNodeDates(),
  options: [],
  criteria: [],
  rationale: null,
  selectedDate: null,
  parent: null,
})

const createComponentNode = (
  id: string,
  title: string,
  content = ''
): ComponentNode => ({
  id,
  type: NodeType.Component,
  title,
  status: 'considering',
  content,
  tags: [],
  dates: createNodeDates(),
  cost: null,
  supplier: null,
  partNumber: null,
  customFields: {},
  parent: null,
})

const createNoteNode = (id: string, title: string, content = ''): NoteNode => ({
  id,
  type: NodeType.Note,
  title,
  content,
  tags: [],
  dates: createNodeDates(),
  parent: null,
})

// ============================================================================
// createEmptyLinkIndex Tests
// ============================================================================

describe('createEmptyLinkIndex', () => {
  it('returns empty outgoing and incoming maps', () => {
    const index = createEmptyLinkIndex()

    expect(index.outgoing).toBeInstanceOf(Map)
    expect(index.incoming).toBeInstanceOf(Map)
    expect(index.outgoing.size).toBe(0)
    expect(index.incoming.size).toBe(0)
  })
})

// ============================================================================
// resolveLinkTarget Tests
// ============================================================================

describe('resolveLinkTarget', () => {
  it('resolves exact node ID match', () => {
    const nodes = new Map<string, ForgeNode>([
      ['my-task', createTaskNode('my-task', 'My Task')],
    ])

    expect(resolveLinkTarget('my-task', nodes)).toBe('my-task')
  })

  it('resolves case-insensitive title match', () => {
    const nodes = new Map<string, ForgeNode>([
      ['my-task', createTaskNode('my-task', 'My Awesome Task')],
    ])

    expect(resolveLinkTarget('My Awesome Task', nodes)).toBe('my-task')
    expect(resolveLinkTarget('my awesome task', nodes)).toBe('my-task')
    expect(resolveLinkTarget('MY AWESOME TASK', nodes)).toBe('my-task')
  })

  it('resolves case-insensitive ID match', () => {
    const nodes = new Map<string, ForgeNode>([
      ['My-Task', createTaskNode('My-Task', 'A Task')],
    ])

    expect(resolveLinkTarget('my-task', nodes)).toBe('My-Task')
  })

  it('returns null for non-existent link target', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task One')],
    ])

    expect(resolveLinkTarget('non-existent', nodes)).toBeNull()
    expect(resolveLinkTarget('Task Two', nodes)).toBeNull()
  })

  it('prefers exact ID match over title match', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-one', createTaskNode('task-one', 'Task One')],
      ['other', createTaskNode('other', 'task-one')], // title matches first node's ID
    ])

    // Should match by ID, not by title
    expect(resolveLinkTarget('task-one', nodes)).toBe('task-one')
  })
})

// ============================================================================
// buildLinkIndex Tests
// ============================================================================

describe('buildLinkIndex', () => {
  it('returns empty index for empty nodes', () => {
    const nodes = new Map<string, ForgeNode>()
    const index = buildLinkIndex(nodes)

    expect(index.outgoing.size).toBe(0)
    expect(index.incoming.size).toBe(0)
  })

  it('initializes empty sets for nodes with no links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'No links here')],
      ['task-2', createTaskNode('task-2', 'Task 2', 'Also no links')],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(new Set())
    expect(index.outgoing.get('task-2')).toEqual(new Set())
    expect(index.incoming.get('task-1')).toEqual(new Set())
    expect(index.incoming.get('task-2')).toEqual(new Set())
  })

  it('builds outgoing links from wiki-link syntax', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode(
          'task-1',
          'Task 1',
          'This links to [[task-2]] and [[task-3]]'
        ),
      ],
      ['task-2', createTaskNode('task-2', 'Task 2')],
      ['task-3', createTaskNode('task-3', 'Task 3')],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(new Set(['task-2', 'task-3']))
    expect(index.outgoing.get('task-2')).toEqual(new Set())
    expect(index.outgoing.get('task-3')).toEqual(new Set())
  })

  it('builds incoming links (backlinks)', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-3]]')],
      [
        'task-2',
        createTaskNode('task-2', 'Task 2', 'Also links to [[task-3]]'),
      ],
      ['task-3', createTaskNode('task-3', 'Task 3')],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.incoming.get('task-3')).toEqual(new Set(['task-1', 'task-2']))
    expect(index.incoming.get('task-1')).toEqual(new Set())
    expect(index.incoming.get('task-2')).toEqual(new Set())
  })

  it('resolves links by title', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode('task-1', 'First Task', 'Links to [[Second Task]]'),
      ],
      ['task-2', createTaskNode('task-2', 'Second Task')],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(new Set(['task-2']))
    expect(index.incoming.get('task-2')).toEqual(new Set(['task-1']))
  })

  it('ignores self-links', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode('task-1', 'Task 1', 'Links to itself [[task-1]]'),
      ],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(new Set())
    expect(index.incoming.get('task-1')).toEqual(new Set())
  })

  it('ignores broken links (non-existent targets)', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode(
          'task-1',
          'Task 1',
          'Links to [[non-existent]] and [[task-2]]'
        ),
      ],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])

    const index = buildLinkIndex(nodes)

    // Should only include the valid link
    expect(index.outgoing.get('task-1')).toEqual(new Set(['task-2']))
  })

  it('handles bidirectional links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-2]]')],
      [
        'task-2',
        createTaskNode('task-2', 'Task 2', 'Links back to [[task-1]]'),
      ],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(new Set(['task-2']))
    expect(index.outgoing.get('task-2')).toEqual(new Set(['task-1']))
    expect(index.incoming.get('task-1')).toEqual(new Set(['task-2']))
    expect(index.incoming.get('task-2')).toEqual(new Set(['task-1']))
  })

  it('handles multiple links to same target', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode(
          'task-1',
          'Task 1',
          'Links [[task-2]] and again [[task-2]]'
        ),
      ],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])

    const index = buildLinkIndex(nodes)

    // Should deduplicate
    expect(index.outgoing.get('task-1')).toEqual(new Set(['task-2']))
  })

  it('works with different node types', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'decision-1',
        createDecisionNode(
          'decision-1',
          'Motor Selection',
          'See [[component-1]] for specs'
        ),
      ],
      [
        'component-1',
        createComponentNode(
          'component-1',
          'NEMA 17',
          'Used for [[task-1]] frame'
        ),
      ],
      [
        'task-1',
        createTaskNode('task-1', 'Design Frame', 'Based on [[decision-1]]'),
      ],
      [
        'note-1',
        createNoteNode('note-1', 'Research', 'For [[decision-1]] analysis'),
      ],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('decision-1')).toEqual(new Set(['component-1']))
    expect(index.outgoing.get('component-1')).toEqual(new Set(['task-1']))
    expect(index.outgoing.get('task-1')).toEqual(new Set(['decision-1']))
    expect(index.outgoing.get('note-1')).toEqual(new Set(['decision-1']))

    expect(index.incoming.get('decision-1')).toEqual(
      new Set(['task-1', 'note-1'])
    )
    expect(index.incoming.get('component-1')).toEqual(new Set(['decision-1']))
    expect(index.incoming.get('task-1')).toEqual(new Set(['component-1']))
  })
})

// ============================================================================
// getOutgoingLinks Tests
// ============================================================================

describe('getOutgoingLinks', () => {
  it('returns array of outgoing link IDs', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode('task-1', 'Task 1', 'Links to [[task-2]] [[task-3]]'),
      ],
      ['task-2', createTaskNode('task-2', 'Task 2')],
      ['task-3', createTaskNode('task-3', 'Task 3')],
    ])

    const index = buildLinkIndex(nodes)
    const links = getOutgoingLinks(index, 'task-1')

    expect(links).toHaveLength(2)
    expect(links).toContain('task-2')
    expect(links).toContain('task-3')
  })

  it('returns empty array for node with no outgoing links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])

    const index = buildLinkIndex(nodes)

    expect(getOutgoingLinks(index, 'task-1')).toEqual([])
  })

  it('returns empty array for non-existent node', () => {
    const index = createEmptyLinkIndex()

    expect(getOutgoingLinks(index, 'non-existent')).toEqual([])
  })
})

// ============================================================================
// getIncomingLinks Tests
// ============================================================================

describe('getIncomingLinks', () => {
  it('returns array of incoming link IDs (backlinks)', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-3]]')],
      ['task-2', createTaskNode('task-2', 'Task 2', 'Also to [[task-3]]')],
      ['task-3', createTaskNode('task-3', 'Task 3')],
    ])

    const index = buildLinkIndex(nodes)
    const backlinks = getIncomingLinks(index, 'task-3')

    expect(backlinks).toHaveLength(2)
    expect(backlinks).toContain('task-1')
    expect(backlinks).toContain('task-2')
  })

  it('returns empty array for node with no incoming links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-2]]')],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])

    const index = buildLinkIndex(nodes)

    expect(getIncomingLinks(index, 'task-1')).toEqual([])
  })

  it('returns empty array for non-existent node', () => {
    const index = createEmptyLinkIndex()

    expect(getIncomingLinks(index, 'non-existent')).toEqual([])
  })
})

// ============================================================================
// getRelatedNodes Tests
// ============================================================================

describe('getRelatedNodes', () => {
  it('returns both outgoing and incoming links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-2]]')],
      ['task-2', createTaskNode('task-2', 'Task 2', 'Links to [[task-3]]')],
      [
        'task-3',
        createTaskNode('task-3', 'Task 3', 'Links back to [[task-2]]'),
      ],
    ])

    const index = buildLinkIndex(nodes)
    const related = getRelatedNodes(index, 'task-2')

    expect(related.outgoing).toContain('task-3')
    expect(related.incoming).toContain('task-1')
    expect(related.incoming).toContain('task-3')
  })

  it('returns empty arrays for isolated node', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])

    const index = buildLinkIndex(nodes)
    const related = getRelatedNodes(index, 'task-1')

    expect(related.outgoing).toEqual([])
    expect(related.incoming).toEqual([])
  })
})

// ============================================================================
// hasLinks Tests
// ============================================================================

describe('hasLinks', () => {
  it('returns true if node has outgoing links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-2]]')],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])

    const index = buildLinkIndex(nodes)

    expect(hasLinks(index, 'task-1')).toBe(true)
  })

  it('returns true if node has incoming links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-2]]')],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])

    const index = buildLinkIndex(nodes)

    expect(hasLinks(index, 'task-2')).toBe(true)
  })

  it('returns false for isolated node', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])

    const index = buildLinkIndex(nodes)

    expect(hasLinks(index, 'task-1')).toBe(false)
  })

  it('returns false for non-existent node', () => {
    const index = createEmptyLinkIndex()

    expect(hasLinks(index, 'non-existent')).toBe(false)
  })
})

// ============================================================================
// getOutgoingLinkCount / getIncomingLinkCount Tests
// ============================================================================

describe('getOutgoingLinkCount', () => {
  it('returns count of outgoing links', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode('task-1', 'Task 1', '[[task-2]] [[task-3]] [[task-4]]'),
      ],
      ['task-2', createTaskNode('task-2', 'Task 2')],
      ['task-3', createTaskNode('task-3', 'Task 3')],
      ['task-4', createTaskNode('task-4', 'Task 4')],
    ])

    const index = buildLinkIndex(nodes)

    expect(getOutgoingLinkCount(index, 'task-1')).toBe(3)
    expect(getOutgoingLinkCount(index, 'task-2')).toBe(0)
  })

  it('returns 0 for non-existent node', () => {
    const index = createEmptyLinkIndex()

    expect(getOutgoingLinkCount(index, 'non-existent')).toBe(0)
  })
})

describe('getIncomingLinkCount', () => {
  it('returns count of incoming links', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', 'Links to [[task-4]]')],
      ['task-2', createTaskNode('task-2', 'Task 2', 'Links to [[task-4]]')],
      ['task-3', createTaskNode('task-3', 'Task 3', 'Links to [[task-4]]')],
      ['task-4', createTaskNode('task-4', 'Task 4')],
    ])

    const index = buildLinkIndex(nodes)

    expect(getIncomingLinkCount(index, 'task-4')).toBe(3)
    expect(getIncomingLinkCount(index, 'task-1')).toBe(0)
  })

  it('returns 0 for non-existent node', () => {
    const index = createEmptyLinkIndex()

    expect(getIncomingLinkCount(index, 'non-existent')).toBe(0)
  })
})

// ============================================================================
// findBrokenLinks Tests
// ============================================================================

describe('findBrokenLinks', () => {
  it('returns array of unresolved link targets', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])

    const content = 'Links to [[task-1]] and [[missing]] and [[also-missing]]'
    const broken = findBrokenLinks(content, nodes)

    expect(broken).toHaveLength(2)
    expect(broken).toContain('missing')
    expect(broken).toContain('also-missing')
  })

  it('returns empty array when all links are valid', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
      ['task-2', createTaskNode('task-2', 'Task 2')],
    ])

    const content = 'Links to [[task-1]] and [[task-2]]'
    const broken = findBrokenLinks(content, nodes)

    expect(broken).toEqual([])
  })

  it('returns empty array for content with no links', () => {
    const nodes = new Map<string, ForgeNode>()
    const content = 'No links here'

    expect(findBrokenLinks(content, nodes)).toEqual([])
  })
})

// ============================================================================
// isValidLink Tests
// ============================================================================

describe('isValidLink', () => {
  it('returns true for valid link by ID', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])

    expect(isValidLink('task-1', nodes)).toBe(true)
  })

  it('returns true for valid link by title', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'My Task')],
    ])

    expect(isValidLink('My Task', nodes)).toBe(true)
  })

  it('returns false for invalid link', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1')],
    ])

    expect(isValidLink('non-existent', nodes)).toBe(false)
  })
})

// ============================================================================
// Edge Cases and Integration
// ============================================================================

describe('edge cases', () => {
  it('handles empty content', () => {
    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Task 1', '')],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(new Set())
  })

  it('handles links in code blocks (should be ignored)', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode(
          'task-1',
          'Task 1',
          '```\n[[task-2]]\n```\nReal link: [[task-3]]'
        ),
      ],
      ['task-2', createTaskNode('task-2', 'Task 2')],
      ['task-3', createTaskNode('task-3', 'Task 3')],
    ])

    const index = buildLinkIndex(nodes)

    // Should only include task-3, not task-2 (which is in code block)
    expect(index.outgoing.get('task-1')).toEqual(new Set(['task-3']))
  })

  it('handles links in inline code (should be ignored)', () => {
    const nodes = new Map<string, ForgeNode>([
      [
        'task-1',
        createTaskNode(
          'task-1',
          'Task 1',
          'Code: `[[task-2]]` and real [[task-3]]'
        ),
      ],
      ['task-2', createTaskNode('task-2', 'Task 2')],
      ['task-3', createTaskNode('task-3', 'Task 3')],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(new Set(['task-3']))
  })

  it('handles complex content with multiple sections', () => {
    const content = `# Overview

This task depends on [[decision-1]] for motor selection.

## Details

We need the [[component-1]] component from the BOM.

## Checklist
- [ ] Review [[note-1]]
- [x] Complete [[task-2]]`

    const nodes = new Map<string, ForgeNode>([
      ['task-1', createTaskNode('task-1', 'Main Task', content)],
      ['decision-1', createDecisionNode('decision-1', 'Motor Decision')],
      ['component-1', createComponentNode('component-1', 'Motor')],
      ['note-1', createNoteNode('note-1', 'Research Notes')],
      ['task-2', createTaskNode('task-2', 'Sub Task')],
    ])

    const index = buildLinkIndex(nodes)

    expect(index.outgoing.get('task-1')).toEqual(
      new Set(['decision-1', 'component-1', 'note-1', 'task-2'])
    )
  })
})
