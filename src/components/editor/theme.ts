import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

/**
 * Light theme colors matching Tailwind gray palette
 */
const lightColors = {
  background: '#ffffff', // bg-white
  foreground: '#111827', // text-gray-900
  selection: '#e5e7eb', // bg-gray-200
  cursor: '#111827', // text-gray-900
  lineHighlight: '#f9fafb', // bg-gray-50
  gutterBackground: '#f9fafb', // bg-gray-50
  gutterForeground: '#9ca3af', // text-gray-400
  border: '#e5e7eb', // border-gray-200
}

/**
 * Dark theme colors matching Tailwind gray palette
 */
const darkColors = {
  background: '#030712', // bg-gray-950
  foreground: '#f3f4f6', // text-gray-100
  selection: '#374151', // bg-gray-700
  cursor: '#f3f4f6', // text-gray-100
  lineHighlight: '#111827', // bg-gray-900
  gutterBackground: '#030712', // bg-gray-950
  gutterForeground: '#6b7280', // text-gray-500
  border: '#374151', // border-gray-700
}

/**
 * Syntax highlighting colors for light mode
 */
const lightSyntax = {
  heading: '#1f2937', // gray-800 - bold
  emphasis: '#374151', // gray-700 - italic
  strong: '#111827', // gray-900 - bold
  keyword: '#2563eb', // blue-600
  link: '#2563eb', // blue-600
  url: '#6b7280', // gray-500
  string: '#059669', // emerald-600
  code: '#dc2626', // red-600
  codeBackground: '#f3f4f6', // gray-100
  quote: '#6b7280', // gray-500
  list: '#374151', // gray-700
  hr: '#d1d5db', // gray-300
}

/**
 * Syntax highlighting colors for dark mode
 */
const darkSyntax = {
  heading: '#f9fafb', // gray-50 - bold
  emphasis: '#d1d5db', // gray-300 - italic
  strong: '#f3f4f6', // gray-100 - bold
  keyword: '#60a5fa', // blue-400
  link: '#60a5fa', // blue-400
  url: '#9ca3af', // gray-400
  string: '#34d399', // emerald-400
  code: '#f87171', // red-400
  codeBackground: '#1f2937', // gray-800
  quote: '#9ca3af', // gray-400
  list: '#d1d5db', // gray-300
  hr: '#4b5563', // gray-600
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
