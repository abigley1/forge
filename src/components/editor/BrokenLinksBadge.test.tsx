import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrokenLinksBadge, type BrokenLinkInfo } from './BrokenLinksBadge'

describe('BrokenLinksBadge', () => {
  const mockBrokenLinks: BrokenLinkInfo[] = [
    { target: 'non-existent-node' },
    { target: 'another-broken' },
  ]

  describe('rendering', () => {
    it('should render nothing when there are no broken links', () => {
      const { container } = render(<BrokenLinksBadge brokenLinks={[]} />)

      expect(container.firstChild).toBeNull()
    })

    it('should render badge with count when there are broken links', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should render with single link', () => {
      render(<BrokenLinksBadge brokenLinks={[{ target: 'broken' }]} />)

      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <BrokenLinksBadge
          brokenLinks={mockBrokenLinks}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should have correct aria-label for single broken link', () => {
      render(<BrokenLinksBadge brokenLinks={[{ target: 'broken' }]} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', '1 broken link')
    })

    it('should have correct aria-label for multiple broken links', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', '2 broken links')
    })

    it('should have aria-describedby pointing to dropdown', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-describedby',
        'broken-links-description'
      )
    })

    it('should have role="tooltip" on dropdown', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    it('should have list element for broken links', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      // ul element has implicit list role
      expect(screen.getByRole('list')).toBeInTheDocument()
    })
  })

  describe('dropdown content', () => {
    it('should show "Broken Links" header', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      expect(screen.getByText('Broken Links')).toBeInTheDocument()
    })

    it('should list all broken links with brackets', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      expect(screen.getByText('[[non-existent-node]]')).toBeInTheDocument()
      expect(screen.getByText('[[another-broken]]')).toBeInTheDocument()
    })
  })

  describe('click handling', () => {
    it('should call onBrokenLinkClick when link is clicked', () => {
      const onBrokenLinkClick = vi.fn()
      render(
        <BrokenLinksBadge
          brokenLinks={mockBrokenLinks}
          onBrokenLinkClick={onBrokenLinkClick}
        />
      )

      // Click on the first broken link
      fireEvent.click(screen.getByText('[[non-existent-node]]'))

      expect(onBrokenLinkClick).toHaveBeenCalledWith('non-existent-node')
    })

    it('should call onBrokenLinkClick with correct target', () => {
      const onBrokenLinkClick = vi.fn()
      render(
        <BrokenLinksBadge
          brokenLinks={mockBrokenLinks}
          onBrokenLinkClick={onBrokenLinkClick}
        />
      )

      fireEvent.click(screen.getByText('[[another-broken]]'))

      expect(onBrokenLinkClick).toHaveBeenCalledWith('another-broken')
    })

    it('should render links as buttons when onBrokenLinkClick is provided', () => {
      render(
        <BrokenLinksBadge
          brokenLinks={mockBrokenLinks}
          onBrokenLinkClick={() => {}}
        />
      )

      const buttons = screen.getAllByRole('button')
      // Main badge button + 2 link buttons
      expect(buttons).toHaveLength(3)
    })

    it('should render links as text when onBrokenLinkClick is not provided', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      // Only the main badge button
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(1)
    })
  })

  describe('styling', () => {
    it('should have warning styling (red/orange colors)', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-red-50', 'text-red-700')
    })

    it('should have AlertTriangle icon', () => {
      render(<BrokenLinksBadge brokenLinks={mockBrokenLinks} />)

      // The icon should be rendered (aria-hidden)
      const button = screen.getByRole('button')
      expect(button.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle links with special characters in target', () => {
      render(
        <BrokenLinksBadge brokenLinks={[{ target: 'Some Node (Draft)' }]} />
      )

      expect(screen.getByText('[[Some Node (Draft)]]')).toBeInTheDocument()
    })

    it('should handle duplicate link targets', () => {
      render(
        <BrokenLinksBadge
          brokenLinks={[{ target: 'broken' }, { target: 'broken' }]}
        />
      )

      expect(screen.getByText('2')).toBeInTheDocument()
      // Both should be rendered (list items)
      const links = screen.getAllByText('[[broken]]')
      expect(links).toHaveLength(2)
    })
  })
})
