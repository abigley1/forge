/**
 * Wiki-Link Decorations for CodeMirror
 *
 * Provides visual decorations for [[wiki-links]] in the markdown editor:
 * - Underline styling with pointer cursor
 * - Cmd/Ctrl+Click navigation to linked nodes
 * - Different styling for valid vs broken links
 *
 * @module wikiLinkDecorations
 */

import { Decoration, EditorView, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import type { NodeType } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a resolved wiki-link target
 */
export interface ResolvedLink {
  /** Node ID */
  id: string
  /** Node title */
  title: string
  /** Node type */
  type: NodeType
  /** First 100 chars of content (for preview) */
  contentPreview: string
  /** Whether the link target exists */
  exists: true
}

/**
 * Information about an unresolved (broken) wiki-link
 */
export interface UnresolvedLink {
  /** The link target text as written */
  target: string
  /** Whether the link target exists */
  exists: false
}

/**
 * Link info can be either resolved or unresolved
 */
export type LinkInfo = ResolvedLink | UnresolvedLink

/**
 * Callback to resolve a wiki-link target to node info
 */
export type LinkResolver = (target: string) => LinkInfo | null

/**
 * Options for creating wiki-link decorations
 */
export interface WikiLinkDecorationOptions {
  /**
   * Function to resolve link targets to node info
   */
  resolveLink: LinkResolver
  /**
   * Callback when a link is clicked (navigates to node)
   */
  onLinkClick?: (linkInfo: ResolvedLink) => void
  /**
   * Callback when a broken link is clicked (create new node)
   */
  onBrokenLinkClick?: (target: string) => void
  /**
   * Callback when hovering over a link (for preview tooltip)
   */
  onLinkHover?: (linkInfo: LinkInfo, rect: DOMRect) => void
  /**
   * Callback when hover ends
   */
  onLinkHoverEnd?: () => void
}

// ============================================================================
// Regular Expressions
// ============================================================================

/**
 * Pattern to match [[wiki-links]] in text
 * Captures the link target (text between brackets)
 */
const WIKI_LINK_PATTERN = /\[\[([^\]]+)\]\]/g

// ============================================================================
// Decoration Marks
// ============================================================================

/**
 * Decoration for valid (resolved) wiki-links
 */
const validLinkMark = Decoration.mark({
  class: 'cm-wiki-link cm-wiki-link-valid',
  attributes: {
    'data-wiki-link': 'true',
    'data-wiki-link-valid': 'true',
  },
})

/**
 * Decoration for broken (unresolved) wiki-links
 */
const brokenLinkMark = Decoration.mark({
  class: 'cm-wiki-link cm-wiki-link-broken',
  attributes: {
    'data-wiki-link': 'true',
    'data-wiki-link-broken': 'true',
  },
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if text position is inside a code block or inline code
 */
function isInsideCode(text: string, position: number): boolean {
  // Check for fenced code blocks
  // Use fresh regex each time to avoid lastIndex state issues
  const fencedMatches = text.matchAll(/```[\s\S]*?```/g)
  for (const match of fencedMatches) {
    const start = match.index!
    const end = start + match[0].length
    if (position >= start && position < end) {
      return true
    }
  }

  // Check for indented code blocks (4+ spaces at line start)
  const lines = text.split('\n')
  let currentPos = 0
  for (const line of lines) {
    const lineEnd = currentPos + line.length
    if (position >= currentPos && position <= lineEnd) {
      if (/^(?: {4}|\t)/.test(line)) {
        return true
      }
    }
    currentPos = lineEnd + 1 // +1 for newline
  }

  // Check for inline code (single backticks, not triple)
  // Match content that is surrounded by single backticks but not part of fenced blocks
  const inlineMatches = text.matchAll(/(?<!`)`(?!``)([^`]+)`(?!`)/g)
  for (const match of inlineMatches) {
    const start = match.index!
    const end = start + match[0].length
    if (position >= start && position < end) {
      return true
    }
  }

  return false
}

/**
 * Extracts link target from a matched wiki-link
 */
export function extractLinkTarget(match: RegExpExecArray): string {
  return match[1].trim()
}

/**
 * Finds all wiki-links in the document text
 */
export function findWikiLinks(
  text: string
): Array<{ from: number; to: number; target: string }> {
  const links: Array<{ from: number; to: number; target: string }> = []
  const pattern = new RegExp(WIKI_LINK_PATTERN.source, 'g')

  let match
  while ((match = pattern.exec(text)) !== null) {
    // Skip links inside code blocks/inline code
    if (!isInsideCode(text, match.index)) {
      links.push({
        from: match.index,
        to: match.index + match[0].length,
        target: extractLinkTarget(match),
      })
    }
  }

  return links
}

// ============================================================================
// View Plugin for Decorations
// ============================================================================

/**
 * Creates the wiki-link decoration view plugin
 */
function createWikiLinkDecorationPlugin(options: WikiLinkDecorationOptions) {
  return ViewPlugin.fromClass(
    class WikiLinkDecorationPlugin {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>()
        const text = view.state.doc.toString()
        const links = findWikiLinks(text)

        for (const link of links) {
          // Resolve the link to determine if it's valid or broken
          const linkInfo = options.resolveLink(link.target)

          if (linkInfo) {
            if (linkInfo.exists) {
              builder.add(link.from, link.to, validLinkMark)
            } else {
              builder.add(link.from, link.to, brokenLinkMark)
            }
          } else {
            // Link could not be resolved at all - treat as broken
            builder.add(link.from, link.to, brokenLinkMark)
          }
        }

        return builder.finish()
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  )
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Creates a click handler for wiki-links
 * Handles Cmd/Ctrl+Click to navigate
 */
function createClickHandler(options: WikiLinkDecorationOptions) {
  return EditorView.domEventHandlers({
    click(event: MouseEvent, view: EditorView) {
      // Only handle Cmd+Click (Mac) or Ctrl+Click (Windows/Linux)
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey

      if (!modifierPressed) {
        return false
      }

      // Find the wiki-link element
      const target = event.target as HTMLElement
      const linkElement = target.closest('[data-wiki-link="true"]')

      if (!linkElement) {
        return false
      }

      // Get the position in the document
      const pos = view.posAtDOM(linkElement)
      if (pos === null) {
        return false
      }

      // Find the wiki-link at this position
      const text = view.state.doc.toString()
      const links = findWikiLinks(text)
      const clickedLink = links.find((l) => pos >= l.from && pos <= l.to)

      if (!clickedLink) {
        return false
      }

      // Resolve the link
      const linkInfo = options.resolveLink(clickedLink.target)

      if (linkInfo?.exists) {
        // Navigate to the linked node
        options.onLinkClick?.(linkInfo)
      } else {
        // Offer to create a new node
        options.onBrokenLinkClick?.(clickedLink.target)
      }

      event.preventDefault()
      return true
    },
  })
}

/**
 * Creates mouse event handlers for hover preview
 */
function createHoverHandlers(options: WikiLinkDecorationOptions) {
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null
  let currentHoveredLink: string | null = null

  return EditorView.domEventHandlers({
    mouseover(event: MouseEvent, view: EditorView) {
      const target = event.target as HTMLElement
      const linkElement = target.closest(
        '[data-wiki-link="true"]'
      ) as HTMLElement

      if (!linkElement) {
        return false
      }

      // Get the position in the document
      const pos = view.posAtDOM(linkElement)
      if (pos === null) {
        return false
      }

      // Find the wiki-link at this position
      const text = view.state.doc.toString()
      const links = findWikiLinks(text)
      const hoveredLink = links.find((l) => pos >= l.from && pos <= l.to)

      if (!hoveredLink) {
        return false
      }

      // Don't re-trigger for the same link
      if (currentHoveredLink === hoveredLink.target) {
        return false
      }

      currentHoveredLink = hoveredLink.target

      // Clear any pending timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
      }

      // Delay showing the preview to avoid flicker
      hoverTimeout = setTimeout(() => {
        const linkInfo = options.resolveLink(hoveredLink.target)
        if (linkInfo) {
          const rect = linkElement.getBoundingClientRect()
          options.onLinkHover?.(linkInfo, rect)
        }
      }, 300)

      return false
    },

    mouseout(event: MouseEvent) {
      const target = event.target as HTMLElement
      const linkElement = target.closest('[data-wiki-link="true"]')
      const relatedTarget = event.relatedTarget as HTMLElement

      // Check if we're moving to another part of the same link
      if (relatedTarget?.closest('[data-wiki-link="true"]') === linkElement) {
        return false
      }

      // Clear timeout and reset state
      if (hoverTimeout) {
        clearTimeout(hoverTimeout)
        hoverTimeout = null
      }
      currentHoveredLink = null
      options.onLinkHoverEnd?.()

      return false
    },
  })
}

// ============================================================================
// Theme Extension
// ============================================================================

/**
 * Base theme for wiki-link decorations
 */
export const wikiLinkDecorationTheme = EditorView.baseTheme({
  // Base wiki-link styles
  '.cm-wiki-link': {
    textDecoration: 'underline',
    textDecorationStyle: 'solid',
    cursor: 'pointer',
  },

  // Valid link styles (blue underline)
  '.cm-wiki-link-valid': {
    color: '#2563eb', // blue-600
    textDecorationColor: '#2563eb',
  },

  // Broken link styles (red dashed underline)
  '.cm-wiki-link-broken': {
    color: '#dc2626', // red-600
    textDecorationColor: '#dc2626',
    textDecorationStyle: 'dashed',
  },

  // Dark mode variants
  '&.dark .cm-wiki-link-valid, .dark & .cm-wiki-link-valid': {
    color: '#60a5fa', // blue-400
    textDecorationColor: '#60a5fa',
  },

  '&.dark .cm-wiki-link-broken, .dark & .cm-wiki-link-broken': {
    color: '#f87171', // red-400
    textDecorationColor: '#f87171',
  },
})

// ============================================================================
// Main Extension Factory
// ============================================================================

/**
 * Creates CodeMirror extensions for wiki-link decorations
 *
 * Features:
 * - Underline styling with pointer cursor
 * - Different colors for valid vs broken links
 * - Cmd/Ctrl+Click navigation
 * - Hover events for preview tooltip
 *
 * @param options - Configuration options
 * @returns Array of CodeMirror extensions
 *
 * @example
 * ```typescript
 * const extensions = createWikiLinkDecorations({
 *   resolveLink: (target) => {
 *     const node = nodes.get(target)
 *     if (node) {
 *       return {
 *         id: node.id,
 *         title: node.title,
 *         type: node.type,
 *         contentPreview: node.content.slice(0, 100),
 *         exists: true,
 *       }
 *     }
 *     return { target, exists: false }
 *   },
 *   onLinkClick: (linkInfo) => navigateToNode(linkInfo.id),
 *   onBrokenLinkClick: (target) => openCreateNodeDialog(target),
 * })
 * ```
 */
export function createWikiLinkDecorations(
  options: WikiLinkDecorationOptions
): Extension[] {
  const extensions: Extension[] = [
    wikiLinkDecorationTheme,
    createWikiLinkDecorationPlugin(options),
    createClickHandler(options),
  ]

  // Only add hover handlers if callbacks are provided
  if (options.onLinkHover || options.onLinkHoverEnd) {
    extensions.push(createHoverHandlers(options))
  }

  return extensions
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Creates a truncated content preview (first 100 chars)
 */
export function createContentPreview(
  content: string,
  maxLength: number = 100
): string {
  if (!content) return ''

  // Remove frontmatter if present
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '')

  // Remove the first heading (title)
  const withoutTitle = withoutFrontmatter.replace(/^#\s+[^\n]+\n?/, '')

  // Get clean text
  const cleanText = withoutTitle.trim()

  if (cleanText.length <= maxLength) {
    return cleanText
  }

  // Truncate at word boundary
  const truncated = cleanText.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...'
  }

  return truncated + '...'
}
