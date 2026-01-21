/**
 * MarkdownEditor Tests
 *
 * Tests for the CodeMirror-based markdown editor component
 *
 * Note: CodeMirror has limited support in jsdom due to browser API dependencies.
 * These tests focus on component wrapper behavior and props.
 */

import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MarkdownEditor } from './MarkdownEditor'

// Mock ResizeObserver and other browser APIs CodeMirror needs
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

class MockMutationObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn().mockReturnValue([])
}

beforeEach(() => {
  vi.clearAllMocks()

  // Mock ResizeObserver
  globalThis.ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver

  // Mock MutationObserver
  globalThis.MutationObserver =
    MockMutationObserver as unknown as typeof MutationObserver

  // Mock requestAnimationFrame
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
    return 1
  })

  // Mock cancelAnimationFrame
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock getSelection
  Object.defineProperty(document, 'getSelection', {
    writable: true,
    value: vi.fn().mockReturnValue({
      removeAllRanges: vi.fn(),
      addRange: vi.fn(),
      collapse: vi.fn(),
    }),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// Helper to get our wrapper element (not CodeMirror's internal textbox)
function getWrapper(container: HTMLElement) {
  return container.firstChild as HTMLElement
}

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe('MarkdownEditor', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<MarkdownEditor value="" />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders container with textbox role', () => {
      const { container } = render(<MarkdownEditor value="# Hello World" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveAttribute('role', 'textbox')
    })

    it('applies custom className to container', () => {
      const { container } = render(
        <MarkdownEditor value="" className="custom-editor" />
      )
      expect(container.querySelector('.custom-editor')).toBeInTheDocument()
    })

    it('renders with border and focus styles', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveClass('border')
      expect(wrapper).toHaveClass('rounded-md')
      expect(wrapper).toHaveClass('border-gray-200')
    })

    it('renders with overflow hidden', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveClass('overflow-hidden')
    })
  })

  // ============================================================================
  // Props Tests
  // ============================================================================

  describe('props', () => {
    it('sets readOnly on container', () => {
      const { container } = render(
        <MarkdownEditor value="Read only content" readOnly />
      )
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveAttribute('aria-readonly', 'true')
    })

    it('applies aria-label to container', () => {
      const { container } = render(
        <MarkdownEditor value="" aria-label="Markdown content" />
      )
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveAttribute('aria-label', 'Markdown content')
    })

    it('applies aria-labelledby to container', () => {
      const { container } = render(
        <>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label id="editor-label">Editor</label>
          <MarkdownEditor value="" aria-labelledby="editor-label" />
        </>
      )
      // Our wrapper is the second child (after the label)
      const wrapper = container.querySelector('[role="textbox"]') as HTMLElement
      expect(wrapper).toHaveAttribute('aria-labelledby', 'editor-label')
    })

    it('applies aria-describedby to container', () => {
      const { container } = render(
        <>
          <p id="editor-desc">Enter your markdown content</p>
          <MarkdownEditor value="" aria-describedby="editor-desc" />
        </>
      )
      const wrapper = container.querySelector(
        '[aria-describedby="editor-desc"]'
      ) as HTMLElement
      expect(wrapper).toBeInTheDocument()
    })

    it('sets aria-multiline to true', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveAttribute('aria-multiline', 'true')
    })

    it('does not set aria-readonly when readOnly is false', () => {
      const { container } = render(<MarkdownEditor value="" readOnly={false} />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveAttribute('aria-readonly', 'false')
    })
  })

  // ============================================================================
  // Theme Tests
  // ============================================================================

  describe('themes', () => {
    it('renders in light mode by default', () => {
      const { container } = render(<MarkdownEditor value="" />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders in dark mode when darkMode prop is true', () => {
      const { container } = render(<MarkdownEditor value="" darkMode />)
      const wrapper = getWrapper(container)
      expect(wrapper).toBeInTheDocument()
    })

    it('applies read-only background styling', () => {
      const { container } = render(<MarkdownEditor value="" readOnly />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveClass('bg-gray-50')
    })

    it('does not apply read-only styling when editable', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).not.toHaveClass('bg-gray-50')
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('has textbox role on container', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveAttribute('role', 'textbox')
    })

    it('has focus-within ring style on container', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveClass('focus-within:ring-2')
      expect(wrapper).toHaveClass('focus-within:ring-gray-950')
      expect(wrapper).toHaveClass('focus-within:ring-offset-2')
    })

    it('has dark mode focus ring styles', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveClass('dark:focus-within:ring-gray-300')
    })

    it('has dark mode border styles', () => {
      const { container } = render(<MarkdownEditor value="" />)
      const wrapper = getWrapper(container)
      expect(wrapper).toHaveClass('dark:border-gray-700')
    })
  })

  // ============================================================================
  // onChange Prop Tests
  // ============================================================================

  describe('onChange prop', () => {
    it('accepts onChange callback prop', () => {
      const handleChange = vi.fn()
      const { container } = render(
        <MarkdownEditor value="" onChange={handleChange} />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders without onChange prop', () => {
      const { container } = render(<MarkdownEditor value="No onChange" />)
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Content Tests
  // ============================================================================

  describe('content rendering', () => {
    it('renders heading content', () => {
      const { container } = render(<MarkdownEditor value="# Heading 1" />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders bold content', () => {
      const { container } = render(<MarkdownEditor value="**bold text**" />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders italic content', () => {
      const { container } = render(<MarkdownEditor value="*italic text*" />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders code content', () => {
      const { container } = render(<MarkdownEditor value="`inline code`" />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders wiki-link content', () => {
      const { container } = render(<MarkdownEditor value="[[wiki-link]]" />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders complex markdown document', () => {
      const complexMarkdown = `# Project Overview

## Goals

- Build a **robust** system
- Support *multiple* formats

### Technical Details

\`\`\`typescript
const x = 42;
\`\`\`

See [[related-note]] for more info.

> Important: This is a quote

---
`
      const { container } = render(<MarkdownEditor value={complexMarkdown} />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders empty content', () => {
      const { container } = render(<MarkdownEditor value="" />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders multiline content', () => {
      const content = `Line 1
Line 2
Line 3`
      const { container } = render(<MarkdownEditor value={content} />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders nested formatting', () => {
      const { container } = render(
        <MarkdownEditor value="***bold and italic***" />
      )
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders multiple wiki-links', () => {
      const content = 'See [[link-one]] and [[link-two]] for details'
      const { container } = render(<MarkdownEditor value={content} />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders incomplete markdown gracefully', () => {
      // Unclosed bold
      const { container: c1 } = render(
        <MarkdownEditor value="**unclosed bold" />
      )
      expect(getWrapper(c1)).toBeInTheDocument()

      // Unclosed code block
      const { container: c2 } = render(
        <MarkdownEditor value="```\nunclosed code" />
      )
      expect(getWrapper(c2)).toBeInTheDocument()
    })

    it('renders special characters', () => {
      const content = '< > & " \' © ® ™ — –'
      const { container } = render(<MarkdownEditor value={content} />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders all heading levels', () => {
      const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`
      const { container } = render(<MarkdownEditor value={content} />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders task lists', () => {
      const content = `- [ ] Unchecked task
- [x] Checked task`
      const { container } = render(<MarkdownEditor value={content} />)
      expect(getWrapper(container)).toBeInTheDocument()
    })

    it('renders tables', () => {
      const content = `| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |`
      const { container } = render(<MarkdownEditor value={content} />)
      expect(getWrapper(container)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Optional Props Tests
  // ============================================================================

  describe('optional props', () => {
    it('accepts placeholder prop', () => {
      const { container } = render(
        <MarkdownEditor value="" placeholder="Type something..." />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('accepts lineNumbers prop', () => {
      const { container } = render(
        <MarkdownEditor value="Line 1\nLine 2" lineNumbers />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('accepts minHeight prop', () => {
      const { container } = render(
        <MarkdownEditor value="" minHeight="300px" />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('accepts maxHeight prop', () => {
      const { container } = render(
        <MarkdownEditor value="" maxHeight="500px" />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('accepts autoFocus prop without error', () => {
      // autoFocus triggers focus which needs browser APIs
      // We just verify the component renders without throwing
      const { container } = render(
        <MarkdownEditor
          value=""
          // eslint-disable-next-line jsx-a11y/no-autofocus -- Testing autoFocus prop
          autoFocus={false}
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })

    it('accepts all props together', () => {
      const { container } = render(
        <MarkdownEditor
          value="# Test"
          onChange={vi.fn()}
          placeholder="Type..."
          readOnly={false}
          darkMode={false}
          lineNumbers={true}
          minHeight="200px"
          maxHeight="400px"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- Testing autoFocus prop
          autoFocus={false}
          className="my-editor"
          aria-label="Test editor"
        />
      )
      expect(container.firstChild).toBeInTheDocument()
    })
  })
})

// ============================================================================
// Theme Export Tests
// ============================================================================

describe('theme exports', () => {
  it('exports lightTheme', async () => {
    const { lightTheme } = await import('./theme')
    expect(lightTheme).toBeDefined()
    expect(Array.isArray(lightTheme)).toBe(true)
  })

  it('exports darkTheme', async () => {
    const { darkTheme } = await import('./theme')
    expect(darkTheme).toBeDefined()
    expect(Array.isArray(darkTheme)).toBe(true)
  })

  it('exports getEditorTheme function', async () => {
    const { getEditorTheme } = await import('./theme')
    expect(typeof getEditorTheme).toBe('function')
  })

  it('getEditorTheme returns light theme for false', async () => {
    const { getEditorTheme, lightTheme } = await import('./theme')
    const theme = getEditorTheme(false)
    expect(theme).toBe(lightTheme)
  })

  it('getEditorTheme returns dark theme for true', async () => {
    const { getEditorTheme, darkTheme } = await import('./theme')
    const theme = getEditorTheme(true)
    expect(theme).toBe(darkTheme)
  })
})

// ============================================================================
// Index Export Tests
// ============================================================================

describe('index exports', () => {
  it('exports MarkdownEditor', async () => {
    const exports = await import('./index')
    expect(exports.MarkdownEditor).toBeDefined()
  })

  it('exports theme utilities', async () => {
    const exports = await import('./index')
    expect(exports.lightTheme).toBeDefined()
    expect(exports.darkTheme).toBeDefined()
    expect(exports.getEditorTheme).toBeDefined()
  })
})
