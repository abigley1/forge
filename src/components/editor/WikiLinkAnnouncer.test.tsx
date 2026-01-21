/**
 * WikiLinkAnnouncer Tests
 *
 * Tests for the aria-live announcer component used with wiki-link autocomplete
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WikiLinkAnnouncer } from './WikiLinkAnnouncer'

// ============================================================================
// Rendering Tests
// ============================================================================

describe('WikiLinkAnnouncer', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<WikiLinkAnnouncer announcement="" />)
      expect(screen.getByTestId('wiki-link-announcer')).toBeInTheDocument()
    })

    it('renders announcement text', () => {
      render(
        <WikiLinkAnnouncer announcement="Link inserted to Motor Selection" />
      )
      expect(
        screen.getByText('Link inserted to Motor Selection')
      ).toBeInTheDocument()
    })

    it('renders empty string when no announcement', () => {
      render(<WikiLinkAnnouncer announcement="" />)
      const announcer = screen.getByTestId('wiki-link-announcer')
      expect(announcer).toHaveTextContent('')
    })

    it('updates announcement text when prop changes', () => {
      const { rerender } = render(
        <WikiLinkAnnouncer announcement="First announcement" />
      )
      expect(screen.getByText('First announcement')).toBeInTheDocument()

      rerender(<WikiLinkAnnouncer announcement="Second announcement" />)
      expect(screen.getByText('Second announcement')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<WikiLinkAnnouncer announcement="" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has aria-live="polite" by default', () => {
      render(<WikiLinkAnnouncer announcement="" />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })

    it('can set aria-live to assertive', () => {
      render(<WikiLinkAnnouncer announcement="" politeness="assertive" />)
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-live',
        'assertive'
      )
    })

    it('has aria-atomic="true"', () => {
      render(<WikiLinkAnnouncer announcement="" />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true')
    })

    it('is visually hidden with sr-only class', () => {
      render(<WikiLinkAnnouncer announcement="" />)
      expect(screen.getByRole('status')).toHaveClass('sr-only')
    })
  })

  // ============================================================================
  // Announcement Content Tests
  // ============================================================================

  describe('announcement content', () => {
    it('announces link insertion', () => {
      render(
        <WikiLinkAnnouncer announcement="Link inserted to Motor Selection" />
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        'Link inserted to Motor Selection'
      )
    })

    it('announces result count', () => {
      render(<WikiLinkAnnouncer announcement="5 suggestions available" />)
      expect(screen.getByRole('status')).toHaveTextContent(
        '5 suggestions available'
      )
    })

    it('announces no results', () => {
      render(<WikiLinkAnnouncer announcement="No matching nodes found" />)
      expect(screen.getByRole('status')).toHaveTextContent(
        'No matching nodes found'
      )
    })

    it('announces navigation selection', () => {
      render(
        <WikiLinkAnnouncer announcement="Motor Selection, decision, 3 results" />
      )
      expect(screen.getByRole('status')).toHaveTextContent(
        'Motor Selection, decision, 3 results'
      )
    })

    it('handles special characters in announcement', () => {
      render(<WikiLinkAnnouncer announcement="Link to NEMA17's Motor (2024)" />)
      expect(screen.getByRole('status')).toHaveTextContent(
        "Link to NEMA17's Motor (2024)"
      )
    })

    it('handles long announcements', () => {
      const longAnnouncement =
        'This is a very long announcement that contains many words and should still be readable by screen readers without any issues'
      render(<WikiLinkAnnouncer announcement={longAnnouncement} />)
      expect(screen.getByRole('status')).toHaveTextContent(longAnnouncement)
    })
  })

  // ============================================================================
  // Politeness Level Tests
  // ============================================================================

  describe('politeness levels', () => {
    it('uses polite by default', () => {
      render(<WikiLinkAnnouncer announcement="Test" />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })

    it('accepts polite explicitly', () => {
      render(<WikiLinkAnnouncer announcement="Test" politeness="polite" />)
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    })

    it('accepts assertive for urgent announcements', () => {
      render(
        <WikiLinkAnnouncer
          announcement="Error occurred"
          politeness="assertive"
        />
      )
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-live',
        'assertive'
      )
    })
  })

  // ============================================================================
  // Data Attributes Tests
  // ============================================================================

  describe('data attributes', () => {
    it('has data-testid for testing', () => {
      render(<WikiLinkAnnouncer announcement="" />)
      expect(screen.getByTestId('wiki-link-announcer')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// Export Tests
// ============================================================================

describe('WikiLinkAnnouncer exports', () => {
  it('exports WikiLinkAnnouncer component', async () => {
    const module = await import('./WikiLinkAnnouncer')
    expect(module.WikiLinkAnnouncer).toBeDefined()
  })

  it('is exported from index', async () => {
    const exports = await import('./index')
    expect(exports.WikiLinkAnnouncer).toBeDefined()
  })
})
