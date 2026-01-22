import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DecisionTimeline } from './DecisionTimeline'
import type { DecisionNode } from '@/types/nodes'
import { NodeType } from '@/types/nodes'

function createMockDecisionNode(
  overrides: Partial<DecisionNode> = {}
): DecisionNode {
  return {
    id: 'test-decision',
    type: NodeType.Decision,
    title: 'Test Decision',
    content: '',
    tags: [],
    dates: {
      created: new Date('2024-01-01T10:00:00'),
      modified: new Date('2024-01-15T14:30:00'),
    },
    status: 'pending',
    selected: null,
    options: [],
    criteria: [],
    rationale: null,
    selectedDate: null,
    ...overrides,
  }
}

describe('DecisionTimeline', () => {
  beforeEach(() => {
    // Mock the current date for consistent relative time tests
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-20T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders timeline header', () => {
      const node = createMockDecisionNode()
      render(<DecisionTimeline node={node} />)

      expect(screen.getByText('Timeline')).toBeInTheDocument()
    })

    it('renders all three timeline events', () => {
      const node = createMockDecisionNode()
      render(<DecisionTimeline node={node} />)

      expect(screen.getByText('Created')).toBeInTheDocument()
      expect(screen.getByText('Last Updated')).toBeInTheDocument()
      expect(screen.getByText('Decision Made')).toBeInTheDocument()
    })

    it('shows created date formatted correctly', () => {
      const node = createMockDecisionNode()
      render(<DecisionTimeline node={node} />)

      // Check that the formatted date appears
      expect(screen.getByText(/jan 1, 2024/i)).toBeInTheDocument()
    })

    it('shows modified date formatted correctly', () => {
      const node = createMockDecisionNode()
      render(<DecisionTimeline node={node} />)

      // Check that the modified date appears
      expect(screen.getByText(/jan 15, 2024/i)).toBeInTheDocument()
    })
  })

  describe('pending state', () => {
    it('shows pending selection text for unselected decision', () => {
      const node = createMockDecisionNode()
      render(<DecisionTimeline node={node} />)

      expect(screen.getByText('Pending selection')).toBeInTheDocument()
    })

    it('dims the decision made section when pending', () => {
      const node = createMockDecisionNode()
      const { container } = render(<DecisionTimeline node={node} />)

      // The decision made section should have opacity-50 class
      const timelineItems = container.querySelectorAll('[class*="opacity-50"]')
      expect(timelineItems.length).toBeGreaterThan(0)
    })
  })

  describe('selected state', () => {
    it('shows selected date when decision is made', () => {
      const node = createMockDecisionNode({
        status: 'selected',
        selected: 'opt-a',
        selectedDate: new Date('2024-01-18T09:00:00'),
      })

      render(<DecisionTimeline node={node} />)

      expect(screen.getByText(/jan 18, 2024/i)).toBeInTheDocument()
    })

    it('shows "Option was selected" text', () => {
      const node = createMockDecisionNode({
        status: 'selected',
        selected: 'opt-a',
        selectedDate: new Date('2024-01-18T09:00:00'),
      })

      render(<DecisionTimeline node={node} />)

      // The description should change from "Pending selection" to showing the date
      expect(screen.queryByText('Pending selection')).not.toBeInTheDocument()
    })

    it('highlights the decision made section with green styling', () => {
      const node = createMockDecisionNode({
        status: 'selected',
        selected: 'opt-a',
        selectedDate: new Date('2024-01-18T09:00:00'),
      })

      const { container } = render(<DecisionTimeline node={node} />)

      // Check for green color classes
      const greenElements = container.querySelectorAll('[class*="green"]')
      expect(greenElements.length).toBeGreaterThan(0)
    })
  })

  describe('relative time', () => {
    it('shows "4 days ago" for modified date', () => {
      const node = createMockDecisionNode()
      render(<DecisionTimeline node={node} />)

      // Jan 15 14:30 to Jan 20 12:00 is 4 days and ~21.5 hours, floors to 4 days
      expect(screen.getByText('4 days ago')).toBeInTheDocument()
    })

    it('shows relative time for recent dates', () => {
      const node = createMockDecisionNode({
        dates: {
          created: new Date('2024-01-19T10:00:00'),
          modified: new Date('2024-01-20T11:30:00'),
        },
      })

      render(<DecisionTimeline node={node} />)

      expect(screen.getByText('30 min ago')).toBeInTheDocument()
    })

    it('shows "yesterday" for one day old dates', () => {
      const node = createMockDecisionNode({
        dates: {
          created: new Date('2024-01-01T10:00:00'),
          modified: new Date('2024-01-19T12:00:00'),
        },
      })

      render(<DecisionTimeline node={node} />)

      expect(screen.getByText('yesterday')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      const node = createMockDecisionNode()
      const { container } = render(
        <DecisionTimeline node={node} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('renders vertical connecting line', () => {
      const node = createMockDecisionNode()
      const { container } = render(<DecisionTimeline node={node} />)

      // Check for the vertical line element
      const line = container.querySelector('[class*="w-px"][class*="bg-gray"]')
      expect(line).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles null selectedDate gracefully', () => {
      const node = createMockDecisionNode({
        status: 'selected',
        selected: 'opt-a',
        selectedDate: null,
      })

      render(<DecisionTimeline node={node} />)

      // Should still render without crashing
      expect(screen.getByText('Decision Made')).toBeInTheDocument()
    })

    it('handles invalid date objects', () => {
      const node = createMockDecisionNode({
        dates: {
          created: new Date('invalid'),
          modified: new Date('2024-01-15T14:30:00'),
        },
      })

      render(<DecisionTimeline node={node} />)

      // Should show dash for invalid date
      expect(screen.getByText('—')).toBeInTheDocument()
    })
  })
})
