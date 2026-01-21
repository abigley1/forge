/**
 * Links Component Tests
 *
 * Tests for BacklinksPanel, RelatedNodes, and context extraction utilities.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { NodeType, createNodeDates } from '@/types/nodes'
import type {
  TaskNode,
  DecisionNode,
  NoteNode,
  ComponentNode,
} from '@/types/nodes'
import { BacklinksPanel, extractLinkContexts, findLinkContext } from './index'
import type { BacklinkItem } from './BacklinksPanel'
import { RelatedNodes } from './RelatedNodes'

// ============================================================================
// Test Fixtures
// ============================================================================

function createTaskNode(id: string, title: string, content = ''): TaskNode {
  return {
    id,
    type: NodeType.Task,
    title,
    tags: [],
    dates: createNodeDates(),
    content,
    status: 'pending',
    priority: 'medium',
    dependsOn: [],
    blocks: [],
    checklist: [],
  }
}

function createDecisionNode(
  id: string,
  title: string,
  content = ''
): DecisionNode {
  return {
    id,
    type: NodeType.Decision,
    title,
    tags: [],
    dates: createNodeDates(),
    content,
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
  }
}

function createNoteNode(id: string, title: string, content = ''): NoteNode {
  return {
    id,
    type: NodeType.Note,
    title,
    tags: [],
    dates: createNodeDates(),
    content,
  }
}

function createComponentNode(
  id: string,
  title: string,
  content = ''
): ComponentNode {
  return {
    id,
    type: NodeType.Component,
    title,
    tags: [],
    dates: createNodeDates(),
    content,
    status: 'considering',
    cost: null,
    supplier: null,
    partNumber: null,
    customFields: {},
  }
}

// ============================================================================
// extractLinkContexts Tests
// ============================================================================

describe('extractLinkContexts', () => {
  describe('basic extraction', () => {
    it('extracts context around a wiki-link', () => {
      const content =
        'This is some text that mentions [[my-node]] in the middle.'
      const contexts = extractLinkContexts(content, 'my-node')

      expect(contexts).toHaveLength(1)
      expect(contexts[0]).toContain('[[my-node]]')
      expect(contexts[0]).toContain('mentions')
      expect(contexts[0]).toContain('middle')
    })

    it('extracts multiple contexts for repeated links', () => {
      const content =
        'First [[target]] mention. Later another [[target]] appears.'
      const contexts = extractLinkContexts(content, 'target')

      expect(contexts).toHaveLength(2)
      expect(contexts[0]).toContain('First')
      expect(contexts[1]).toContain('Later')
    })

    it('matches links case-insensitively', () => {
      const content = 'Check out [[My-Task]] for more info.'
      const contexts = extractLinkContexts(content, 'my-task')

      expect(contexts).toHaveLength(1)
      expect(contexts[0]).toContain('[[My-Task]]')
    })

    it('returns empty array for no matches', () => {
      const content = 'No links here.'
      const contexts = extractLinkContexts(content, 'missing')

      expect(contexts).toHaveLength(0)
    })

    it('returns empty array for empty content', () => {
      expect(extractLinkContexts('', 'target')).toHaveLength(0)
    })

    it('returns empty array for empty target', () => {
      expect(extractLinkContexts('[[link]]', '')).toHaveLength(0)
    })
  })

  describe('context truncation', () => {
    it('adds ellipsis when content is truncated at start', () => {
      const content = 'A'.repeat(100) + '[[target]]' + 'B'.repeat(10)
      const contexts = extractLinkContexts(content, 'target', 50)

      expect(contexts[0].startsWith('…')).toBe(true)
    })

    it('adds ellipsis when content is truncated at end', () => {
      const content = 'A'.repeat(10) + '[[target]]' + 'B'.repeat(100)
      const contexts = extractLinkContexts(content, 'target', 50)

      expect(contexts[0].endsWith('…')).toBe(true)
    })

    it('no ellipsis when content fits', () => {
      const content = 'Short [[target]] text'
      const contexts = extractLinkContexts(content, 'target', 50)

      expect(contexts[0]).not.toContain('…')
    })
  })

  describe('newline handling', () => {
    it('replaces newlines with spaces', () => {
      const content = 'Line one\n[[target]]\nLine two'
      const contexts = extractLinkContexts(content, 'target', 50)

      expect(contexts[0]).not.toContain('\n')
      expect(contexts[0]).toContain(' ')
    })
  })
})

// ============================================================================
// findLinkContext Tests
// ============================================================================

describe('findLinkContext', () => {
  it('finds context by node ID', () => {
    const sourceNode = createTaskNode(
      'source',
      'Source Task',
      'Check [[target-task]] for details.'
    )
    const targetNode = createTaskNode('target-task', 'Target Task')

    const contexts = findLinkContext(sourceNode, targetNode)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]).toContain('[[target-task]]')
  })

  it('finds context by node title if ID fails', () => {
    const sourceNode = createTaskNode(
      'source',
      'Source Task',
      'Check [[Target Task]] for details.'
    )
    const targetNode = createTaskNode('target-task', 'Target Task')

    const contexts = findLinkContext(sourceNode, targetNode)

    expect(contexts).toHaveLength(1)
    expect(contexts[0]).toContain('[[Target Task]]')
  })

  it('returns empty array when no link found', () => {
    const sourceNode = createTaskNode('source', 'Source Task', 'No links here.')
    const targetNode = createTaskNode('target', 'Target Task')

    const contexts = findLinkContext(sourceNode, targetNode)

    expect(contexts).toHaveLength(0)
  })
})

// ============================================================================
// BacklinksPanel Tests
// ============================================================================

describe('BacklinksPanel', () => {
  describe('rendering', () => {
    it('renders panel header with backlinks title', () => {
      render(<BacklinksPanel backlinks={[]} />)

      expect(screen.getByText('Backlinks')).toBeInTheDocument()
    })

    it('renders count badge with zero', () => {
      render(<BacklinksPanel backlinks={[]} />)

      expect(screen.getByText('0')).toBeInTheDocument()
      expect(screen.getByLabelText('0 backlinks')).toBeInTheDocument()
    })

    it('renders count badge with backlink count', () => {
      const backlinks: BacklinkItem[] = [
        { node: createTaskNode('a', 'Task A'), contexts: [] },
        { node: createDecisionNode('b', 'Decision B'), contexts: [] },
      ]

      render(<BacklinksPanel backlinks={backlinks} />)

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByLabelText('2 backlinks')).toBeInTheDocument()
    })

    it('renders empty state when no backlinks', () => {
      render(<BacklinksPanel backlinks={[]} />)

      expect(screen.getByText('No backlinks yet')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Other nodes will appear here when they link to this one'
        )
      ).toBeInTheDocument()
    })

    it('renders backlink items', () => {
      const backlinks: BacklinkItem[] = [
        {
          node: createTaskNode('task-1', 'My Task'),
          contexts: ['mentions [[current]]'],
        },
        { node: createDecisionNode('dec-1', 'My Decision'), contexts: [] },
      ]

      render(<BacklinksPanel backlinks={backlinks} />)

      expect(screen.getByText('My Task')).toBeInTheDocument()
      expect(screen.getByText('My Decision')).toBeInTheDocument()
    })

    it('renders context snippets', () => {
      const backlinks: BacklinkItem[] = [
        {
          node: createTaskNode('task-1', 'My Task'),
          contexts: ['This mentions [[current]] in context'],
        },
      ]

      render(<BacklinksPanel backlinks={backlinks} />)

      expect(screen.getByText(/This mentions/)).toBeInTheDocument()
    })

    it('shows count for multiple contexts', () => {
      const backlinks: BacklinkItem[] = [
        {
          node: createTaskNode('task-1', 'My Task'),
          contexts: [
            'First [[current]]',
            'Second [[current]]',
            'Third [[current]]',
          ],
        },
      ]

      render(<BacklinksPanel backlinks={backlinks} />)

      expect(screen.getByText('+1 more mentions')).toBeInTheDocument()
    })
  })

  describe('collapse/expand', () => {
    it('starts expanded by default', () => {
      const backlinks: BacklinkItem[] = [
        { node: createTaskNode('a', 'Task A'), contexts: [] },
      ]

      render(<BacklinksPanel backlinks={backlinks} />)

      expect(
        screen.getByRole('button', { name: /backlinks/i })
      ).toHaveAttribute('aria-expanded', 'true')
    })

    it('can start collapsed', () => {
      render(<BacklinksPanel backlinks={[]} defaultExpanded={false} />)

      expect(
        screen.getByRole('button', { name: /backlinks/i })
      ).toHaveAttribute('aria-expanded', 'false')
    })

    it('toggles on click', async () => {
      const user = userEvent.setup()

      render(<BacklinksPanel backlinks={[]} />)

      const header = screen.getByRole('button', { name: /backlinks/i })
      expect(header).toHaveAttribute('aria-expanded', 'true')

      await user.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'false')

      await user.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'true')
    })

    it('toggles on Enter key', async () => {
      const user = userEvent.setup()

      render(<BacklinksPanel backlinks={[]} />)

      const header = screen.getByRole('button', { name: /backlinks/i })
      header.focus()

      await user.keyboard('{Enter}')
      expect(header).toHaveAttribute('aria-expanded', 'false')
    })

    it('toggles on Space key', async () => {
      const user = userEvent.setup()

      render(<BacklinksPanel backlinks={[]} />)

      const header = screen.getByRole('button', { name: /backlinks/i })
      header.focus()

      await user.keyboard(' ')
      expect(header).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('navigation', () => {
    it('calls onNavigate when backlink is clicked', async () => {
      const user = userEvent.setup()
      const onNavigate = vi.fn()

      const backlinks: BacklinkItem[] = [
        { node: createTaskNode('task-1', 'My Task'), contexts: [] },
      ]

      render(<BacklinksPanel backlinks={backlinks} onNavigate={onNavigate} />)

      await user.click(screen.getByText('My Task'))
      expect(onNavigate).toHaveBeenCalledWith('task-1')
    })

    it('does not crash without onNavigate', async () => {
      const user = userEvent.setup()

      const backlinks: BacklinkItem[] = [
        { node: createTaskNode('task-1', 'My Task'), contexts: [] },
      ]

      render(<BacklinksPanel backlinks={backlinks} />)

      // Should not throw
      await user.click(screen.getByText('My Task'))
    })
  })

  describe('accessibility', () => {
    it('has proper aria attributes', () => {
      render(<BacklinksPanel backlinks={[]} />)

      const header = screen.getByRole('button', { name: /backlinks/i })
      expect(header).toHaveAttribute('aria-expanded')
      expect(header).toHaveAttribute('aria-controls')
    })

    it('backlink items are buttons', () => {
      const backlinks: BacklinkItem[] = [
        { node: createTaskNode('a', 'Task A'), contexts: [] },
      ]

      render(<BacklinksPanel backlinks={backlinks} />)

      const item = screen.getByRole('button', { name: /Task A/i })
      expect(item).toBeInTheDocument()
    })
  })
})

// ============================================================================
// RelatedNodes Tests
// ============================================================================

describe('RelatedNodes', () => {
  describe('rendering', () => {
    it('renders empty state when no related nodes', () => {
      render(<RelatedNodes outgoingNodes={[]} incomingNodes={[]} />)

      expect(screen.getByText('No related nodes')).toBeInTheDocument()
      expect(
        screen.getByText('Use [[wiki-links]] to connect nodes')
      ).toBeInTheDocument()
    })

    it('renders outgoing links section', () => {
      const outgoing = [createDecisionNode('dec', 'My Decision')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={[]} />)

      expect(screen.getByText('Links from here')).toBeInTheDocument()
      expect(screen.getByText('My Decision')).toBeInTheDocument()
    })

    it('renders incoming links section', () => {
      const incoming = [createNoteNode('note', 'My Note')]

      render(<RelatedNodes outgoingNodes={[]} incomingNodes={incoming} />)

      expect(screen.getByText('Links to here')).toBeInTheDocument()
      expect(screen.getByText('My Note')).toBeInTheDocument()
    })

    it('renders both sections when both have links', () => {
      const outgoing = [createDecisionNode('dec', 'Test Decision')]
      const incoming = [createComponentNode('comp', 'Test Component')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={incoming} />)

      expect(screen.getByText('Links from here')).toBeInTheDocument()
      expect(screen.getByText('Links to here')).toBeInTheDocument()
      expect(screen.getByText('Test Decision')).toBeInTheDocument()
      expect(screen.getByText('Test Component')).toBeInTheDocument()
    })

    it('shows counts for each section', () => {
      const outgoing = [
        createDecisionNode('dec1', 'Decision 1'),
        createDecisionNode('dec2', 'Decision 2'),
      ]
      const incoming = [createNoteNode('note', 'Note')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={incoming} />)

      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('shows empty message in section with no links', () => {
      const outgoing = [createDecisionNode('dec', 'Decision')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={[]} />)

      expect(screen.getByText('No incoming links')).toBeInTheDocument()
    })
  })

  describe('collapse/expand', () => {
    it('sections start expanded by default', () => {
      const outgoing = [createDecisionNode('dec', 'Decision')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={[]} />)

      const outgoingHeader = screen.getByRole('button', {
        name: /links from here/i,
      })
      expect(outgoingHeader).toHaveAttribute('aria-expanded', 'true')
    })

    it('toggles section on click', async () => {
      const user = userEvent.setup()
      const outgoing = [createDecisionNode('dec', 'Decision')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={[]} />)

      const header = screen.getByRole('button', { name: /links from here/i })

      await user.click(header)
      expect(header).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('navigation', () => {
    it('calls onNavigate for outgoing node click', async () => {
      const user = userEvent.setup()
      const onNavigate = vi.fn()
      const outgoing = [createDecisionNode('dec-1', 'My Decision')]

      render(
        <RelatedNodes
          outgoingNodes={outgoing}
          incomingNodes={[]}
          onNavigate={onNavigate}
        />
      )

      await user.click(screen.getByText('My Decision'))
      expect(onNavigate).toHaveBeenCalledWith('dec-1')
    })

    it('calls onNavigate for incoming node click', async () => {
      const user = userEvent.setup()
      const onNavigate = vi.fn()
      const incoming = [createNoteNode('note-1', 'My Note')]

      render(
        <RelatedNodes
          outgoingNodes={[]}
          incomingNodes={incoming}
          onNavigate={onNavigate}
        />
      )

      await user.click(screen.getByText('My Note'))
      expect(onNavigate).toHaveBeenCalledWith('note-1')
    })
  })

  describe('accessibility', () => {
    it('section headers have aria-expanded', () => {
      const outgoing = [createDecisionNode('dec', 'Test Decision')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={[]} />)

      // Check section headers specifically (not the node items inside)
      const outgoingHeader = screen.getByRole('button', {
        name: /links from here/i,
      })
      const incomingHeader = screen.getByRole('button', {
        name: /links to here/i,
      })

      expect(outgoingHeader).toHaveAttribute('aria-expanded')
      expect(incomingHeader).toHaveAttribute('aria-expanded')
    })

    it('node items in list have role list', () => {
      const outgoing = [createDecisionNode('dec', 'Decision')]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={[]} />)

      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('different node types', () => {
    it('renders all node types correctly', () => {
      const outgoing = [
        createTaskNode('task', 'Task Node'),
        createDecisionNode('decision', 'Decision Node'),
        createComponentNode('component', 'Component Node'),
        createNoteNode('note', 'Note Node'),
      ]

      render(<RelatedNodes outgoingNodes={outgoing} incomingNodes={[]} />)

      expect(screen.getByText('Task Node')).toBeInTheDocument()
      expect(screen.getByText('Decision Node')).toBeInTheDocument()
      expect(screen.getByText('Component Node')).toBeInTheDocument()
      expect(screen.getByText('Note Node')).toBeInTheDocument()
    })
  })
})
