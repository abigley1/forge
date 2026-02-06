import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * Light theme colors using Forge design tokens (CSS custom properties)
 * These reference --color-forge-* vars defined in index.css @theme block
 */
const lightColors = {
  background: 'var(--color-forge-paper)',
  foreground: 'var(--color-forge-text)',
  selection: 'var(--color-forge-border)',
  cursor: 'var(--color-forge-text)',
  lineHighlight: 'var(--color-forge-surface)',
  gutterBackground: 'var(--color-forge-surface)',
  gutterForeground: 'var(--color-forge-muted)',
  border: 'var(--color-forge-border)',
}

/**
 * Dark theme colors using Forge design tokens (CSS custom properties)
 */
const darkColors = {
  background: 'var(--color-forge-paper-dark)',
  foreground: 'var(--color-forge-text-dark)',
  selection: 'var(--color-forge-border-dark)',
  cursor: 'var(--color-forge-text-dark)',
  lineHighlight: 'var(--color-forge-surface-dark)',
  gutterBackground: 'var(--color-forge-paper-dark)',
  gutterForeground: 'var(--color-forge-muted-dark)',
  border: 'var(--color-forge-border-dark)',
}

/**
 * Syntax highlighting colors for light mode
 * Gray tones use forge tokens; blue/emerald/red kept for syntax readability
 */
const lightSyntax = {
  heading: 'var(--color-forge-text)',
  emphasis: 'var(--color-forge-text-secondary)',
  strong: 'var(--color-forge-text)',
  keyword: '#2563eb', // blue-600 — syntax color, keep as-is
  link: '#2563eb', // blue-600 — syntax color, keep as-is
  url: 'var(--color-forge-text-secondary)',
  string: '#059669', // emerald-600 — syntax color, keep as-is
  code: '#dc2626', // red-600 — syntax color, keep as-is
  codeBackground: 'var(--color-forge-surface)',
  quote: 'var(--color-forge-muted)',
  list: 'var(--color-forge-text-secondary)',
  hr: 'var(--color-forge-border)',
}

/**
 * Syntax highlighting colors for dark mode
 * Gray tones use forge tokens; blue/emerald/red kept for syntax readability
 */
const darkSyntax = {
  heading: 'var(--color-forge-text-dark)',
  emphasis: 'var(--color-forge-text-secondary-dark)',
  strong: 'var(--color-forge-text-dark)',
  keyword: '#60a5fa', // blue-400 — syntax color, keep as-is
  link: '#60a5fa', // blue-400 — syntax color, keep as-is
  url: 'var(--color-forge-muted-dark)',
  string: '#34d399', // emerald-400 — syntax color, keep as-is
  code: '#f87171', // red-400 — syntax color, keep as-is
  codeBackground: 'var(--color-forge-surface-dark)',
  quote: 'var(--color-forge-muted-dark)',
  list: 'var(--color-forge-text-secondary-dark)',
  hr: 'var(--color-forge-border-dark)',
}

/**
 * Creates the base editor theme (layout, not syntax)
 */
function createBaseTheme(colors: typeof lightColors): Extension {
  return EditorView.theme(
    {
      '&': {
        backgroundColor: colors.background,
        color: colors.foreground,
      },
      '.cm-content': {
        caretColor: colors.cursor,
        fontFamily: 'inherit',
        padding: '0.75rem 0',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: colors.cursor,
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        {
          backgroundColor: colors.selection,
        },
      '.cm-activeLine': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-gutters': {
        backgroundColor: colors.gutterBackground,
        color: colors.gutterForeground,
        borderRight: `1px solid ${colors.border}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: colors.lineHighlight,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 0.5rem 0 0.75rem',
      },
      '.cm-scroller': {
        fontFamily:
          "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
        fontSize: '0.875rem',
        lineHeight: '1.5rem',
      },
      '&.cm-focused': {
        outline: 'none',
      },
      '.cm-line': {
        padding: '0 1rem',
      },
      // Placeholder styling
      '.cm-placeholder': {
        color:
          colors === lightColors
            ? 'var(--color-forge-muted)'
            : 'var(--color-forge-muted-dark)',
      },
    },
    { dark: colors === darkColors }
  )
}

/**
 * Creates syntax highlighting for markdown
 */
function createHighlightStyle(syntax: typeof lightSyntax): Extension {
  return syntaxHighlighting(
    HighlightStyle.define([
      // Headings
      { tag: tags.heading1, fontWeight: 'bold', fontSize: '1.5em' },
      { tag: tags.heading2, fontWeight: 'bold', fontSize: '1.25em' },
      { tag: tags.heading3, fontWeight: 'bold', fontSize: '1.125em' },
      { tag: tags.heading4, fontWeight: 'bold' },
      { tag: tags.heading5, fontWeight: 'bold' },
      { tag: tags.heading6, fontWeight: 'bold' },
      {
        tag: [
          tags.heading1,
          tags.heading2,
          tags.heading3,
          tags.heading4,
          tags.heading5,
          tags.heading6,
        ],
        color: syntax.heading,
      },

      // Emphasis
      { tag: tags.emphasis, fontStyle: 'italic', color: syntax.emphasis },
      { tag: tags.strong, fontWeight: 'bold', color: syntax.strong },
      { tag: tags.strikethrough, textDecoration: 'line-through' },

      // Links
      { tag: tags.link, color: syntax.link, textDecoration: 'underline' },
      { tag: tags.url, color: syntax.url },

      // Code
      {
        tag: tags.monospace,
        color: syntax.code,
        backgroundColor: syntax.codeBackground,
        borderRadius: '0.25rem',
        padding: '0.125rem 0.25rem',
      },

      // Quotes
      { tag: tags.quote, color: syntax.quote, fontStyle: 'italic' },

      // Lists
      { tag: tags.list, color: syntax.list },

      // Separators
      { tag: tags.separator, color: syntax.hr },

      // Meta (frontmatter markers, etc.)
      { tag: tags.meta, color: syntax.url },
      { tag: tags.processingInstruction, color: syntax.url },

      // Content (default)
      { tag: tags.content, color: syntax.list },
    ])
  )
}

/**
 * Light theme for the markdown editor
 * Matches the app's light mode color scheme
 */
export const lightTheme: Extension = [
  createBaseTheme(lightColors),
  createHighlightStyle(lightSyntax),
]

/**
 * Dark theme for the markdown editor
 * Matches the app's dark mode color scheme
 */
export const darkTheme: Extension = [
  createBaseTheme(darkColors),
  createHighlightStyle(darkSyntax),
]

/**
 * Returns the appropriate theme based on the dark mode preference
 */
export function getEditorTheme(isDark: boolean): Extension {
  return isDark ? darkTheme : lightTheme
}
