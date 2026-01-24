import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  ImplicationsSection,
  extractImplicationsContent,
  parseImplications,
} from './ImplicationsSection'
import type { DecisionNode, ForgeNode } from '@/types/nodes'
import { NodeType, createNodeDates } from '@/types/nodes'

function createMockDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: 'test-decision',
    type: NodeType.Decision,
    title: 'Test Decision',
    content: '',
    tags: [],
    dates: createNodeDates(),
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    parent: null,
    ...overrides,
  }
}

function createMockNodesMap(nodes: ForgeNode[]): Map<string, ForgeNode> {
  const map = new Map<string, ForgeNode>()
  nodes.forEach((node) => map.set(node.id, node))
  return map
}

describe('ImplicationsSection', () => {
  describe('extractImplicationsContent', () => {
    it('extracts content under ## Implications header', () => {
      const content = `# Decision Title

Some intro text.

## Implications

- First implication
- Second implication

## Other Section

More content.`

      const result = extractImplicationsContent(content)
      expect(result).toBe('- First implication\n- Second implication')
    })

    it('returns null when no Implications section exists', () => {
      const content = `# Decision Title

Just regular content here.`

      const result = extractImplicationsContent(content)
      expect(result).toBeNull()
    })

    it('handles Implications as last section', () => {
      const content = `# Decision Title

## Implications

The only implication here.`

      const result = extractImplicationsContent(content)
      expect(result).toBe('The only implication here.')
    })

    it('is case-insensitive for header matching', () => {
      const content = `## IMPLICATIONS

Upper case works too.`

      const result = extractImplicationsContent(content)
      expect(result).toBe('Upper case works too.')
    })
  })

  describe('parseImplications', () => {
    it('parses bullet points into implications', () => {
      const content = `## Implications

- First point
- Second point
* Third point`

      const result = parseImplications(content)
      expect(result).toHaveLength(3)
      expect(result[0].text).toBe('First point')
      expect(result[1].text).toBe('Second point')
      expect(result[2].text).toBe('Third point')
    })

    it('parses numbered list items', () => {
      const content = `## Implications

1. First item
2. Second item`

      const result = parseImplications(content)
      expect(result).toHaveLength(2)
      expect(result[0].text).toBe('First item')
      expect(result[1].text).toBe('Second item')
    })

    it('extracts wiki-links from text', () => {
      const content = `## Implications

Affects [[Motor Selection]] and [[Power Budget]]`

      const result = parseImplications(content)
      expect(result[0].links).toHaveLength(2)
      expect(result[0].links[0].title).toBe('Motor Selection')
      expect(result[0].links[1].title).toBe('Power Budget')
    })

    it('resolves wiki-links to existing nodes', () => {
      const content = `## Implications

Related to [[Motor Selection]]`

      const nodes = createMockNodesMap([
        {
          id: 'motor-decision',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      const result = parseImplications(content, nodes)
      expect(result[0].links[0].exists).toBe(true)
      expect(result[0].links[0].id).toBe('motor-decision')
    })

    it('marks non-existent links as broken', () => {
      const content = `## Implications

Related to [[Non Existent Node]]`

      const result = parseImplications(content, new Map())
      expect(result[0].links[0].exists).toBe(false)
    })

    it('matches nodes by ID as well as title', () => {
      const content = `## Implications

Related to [[motor-123]]`

      const nodes = createMockNodesMap([
        {
          id: 'motor-123',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      const result = parseImplications(content, nodes)
      expect(result[0].links[0].exists).toBe(true)
      expect(result[0].links[0].id).toBe('motor-123')
    })

    it('returns empty array when no implications section', () => {
      const content = `# Just a title

No implications here.`

      const result = parseImplications(content)
      expect(result).toEqual([])
    })
  })

  describe('rendering', () => {
    it('renders nothing when no implications exist', () => {
      const node = createMockDecisionNode({
        content: 'No implications section',
      })
      const { container } = render(<ImplicationsSection node={node} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders implications header', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Test implication`,
      })

      render(<ImplicationsSection node={node} />)
      expect(screen.getByText('Implications')).toBeInTheDocument()
    })

    it('renders implications as list items', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- First implication\n- Second implication`,
      })

      render(<ImplicationsSection node={node} />)
      expect(screen.getByText('First implication')).toBeInTheDocument()
      expect(screen.getByText('Second implication')).toBeInTheDocument()
    })

    it('renders wiki-links as clickable buttons', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Affects [[Motor Selection]]`,
      })
      const nodes = createMockNodesMap([
        {
          id: 'motor-1',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      render(<ImplicationsSection node={node} nodes={nodes} />)

      const linkButton = screen.getByRole('button', {
        name: /navigate to motor selection/i,
      })
      expect(linkButton).toBeInTheDocument()
    })

    it('calls onNodeClick when link is clicked', () => {
      const onNodeClick = vi.fn()
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Affects [[Motor Selection]]`,
      })
      const nodes = createMockNodesMap([
        {
          id: 'motor-1',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      render(
        <ImplicationsSection
          node={node}
          nodes={nodes}
          onNodeClick={onNodeClick}
        />
      )

      const linkButton = screen.getByRole('button', {
        name: /navigate to motor selection/i,
      })
      fireEvent.click(linkButton)

      expect(onNodeClick).toHaveBeenCalledWith('motor-1')
    })

    it('disables broken link buttons', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Affects [[Non Existent]]`,
      })

      render(<ImplicationsSection node={node} nodes={new Map()} />)

      const linkButton = screen.getByRole('button', { name: /broken link/i })
      expect(linkButton).toBeDisabled()
    })

    it('shows broken links warning when links are unresolved', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Affects [[Non Existent Node]]`,
      })

      render(<ImplicationsSection node={node} nodes={new Map()} />)

      expect(screen.getByText('Broken links')).toBeInTheDocument()
    })

    it('does not show broken links warning when all links resolve', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Affects [[Motor Selection]]`,
      })
      const nodes = createMockNodesMap([
        {
          id: 'motor-1',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      render(<ImplicationsSection node={node} nodes={nodes} />)

      expect(screen.queryByText('Broken links')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Test`,
      })

      const { container } = render(
        <ImplicationsSection node={node} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('has accessible list structure', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- First\n- Second`,
      })

      render(<ImplicationsSection node={node} />)

      expect(
        screen.getByRole('list', { name: /decision implications/i })
      ).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('provides accessible labels for link buttons', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Affects [[Motor Selection]]`,
      })
      const nodes = createMockNodesMap([
        {
          id: 'motor-1',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      render(<ImplicationsSection node={node} nodes={nodes} />)

      const linkButton = screen.getByRole('button', {
        name: /navigate to motor selection/i,
      })
      expect(linkButton).toHaveAttribute('title', 'Navigate to Motor Selection')
    })

    it('provides accessible labels for broken links', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Affects [[Missing Node]]`,
      })

      render(<ImplicationsSection node={node} nodes={new Map()} />)

      const linkButton = screen.getByRole('button', {
        name: /broken link: missing node not found/i,
      })
      expect(linkButton).toHaveAttribute('title', '"Missing Node" not found')
    })
  })

  describe('edge cases', () => {
    it('handles multiple links in one line', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- Connects [[Node A]] to [[Node B]]`,
      })

      const result = parseImplications(node.content)
      expect(result[0].links).toHaveLength(2)
      expect(result[0].links[0].title).toBe('Node A')
      expect(result[0].links[1].title).toBe('Node B')
    })

    it('handles text before and after links', () => {
      const node = createMockDecisionNode({
        content: `## Implications\n\n- The [[Motor Selection]] affects the [[Power Budget]] significantly`,
      })
      const nodes = createMockNodesMap([
        {
          id: 'motor-1',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
        {
          id: 'power-1',
          type: NodeType.Decision,
          title: 'Power Budget',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      render(<ImplicationsSection node={node} nodes={nodes} />)

      expect(screen.getByText(/The/)).toBeInTheDocument()
      expect(screen.getByText(/affects the/)).toBeInTheDocument()
      expect(screen.getByText(/significantly/)).toBeInTheDocument()
    })

    it('handles empty lines in implications', () => {
      const content = `## Implications

- First point

- Second point with space before`

      const result = parseImplications(content)
      expect(result).toHaveLength(2)
    })

    it('handles case-insensitive node title matching', () => {
      const content = `## Implications\n\n- Related to [[motor selection]]`

      const nodes = createMockNodesMap([
        {
          id: 'motor-1',
          type: NodeType.Decision,
          title: 'Motor Selection',
          content: '',
          tags: [],
          dates: createNodeDates(),
          status: 'pending',
          selected: null,
          options: [],
          criteria: [],
          rationale: null,
          selectedDate: null,
          parent: null,
        },
      ])

      const result = parseImplications(content, nodes)
      expect(result[0].links[0].exists).toBe(true)
    })
  })
})
