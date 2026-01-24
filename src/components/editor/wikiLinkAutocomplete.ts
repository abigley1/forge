/**
 * Wiki-Link Autocomplete Extension for CodeMirror
 *
 * Provides autocomplete functionality for wiki-links in markdown content.
 * - Triggers on `[[` characters
 * - Filters nodes by typed text
 * - Inserts completed wiki-link on selection
 * - Supports keyboard navigation (Enter to select, Escape to dismiss)
 */

import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
  type Completion,
  startCompletion,
  closeCompletion,
} from '@codemirror/autocomplete'
import {
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  keymap,
} from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import type { ForgeNode, NodeType } from '@/types/nodes'

/**
 * Node suggestion for autocomplete
 */
export interface NodeSuggestion {
  id: string
  title: string
  type: NodeType
}

/**
 * Options for the wiki-link autocomplete extension
 */
export interface WikiLinkAutocompleteOptions {
  /** Function that returns nodes to suggest */
  getNodes: () => NodeSuggestion[]
  /** Callback when a link is inserted */
  onLinkInserted?: (nodeId: string, nodeTitle: string) => void
  /** Callback when navigating through suggestions (for aria-live) */
  onNavigate?: (suggestion: NodeSuggestion | null, totalCount: number) => void
  /** Callback when result count changes (for aria-live) */
  onResultCountChange?: (count: number) => void
  /** Maximum number of suggestions to show */
  maxSuggestions?: number
}

/**
 * Type icon characters for display in autocomplete
 */
const TYPE_ICONS: Record<NodeType, string> = {
  decision: '◇',
  component: '□',
  task: '○',
  note: '▫',
  subsystem: '◈',
  assembly: '◉',
  module: '▣',
}

/**
 * Type labels for display
 */
const TYPE_LABELS: Record<NodeType, string> = {
  decision: 'Decision',
  component: 'Component',
  task: 'Task',
  note: 'Note',
  subsystem: 'Subsystem',
  assembly: 'Assembly',
  module: 'Module',
}

/**
 * Checks if the cursor is at a wiki-link trigger position ([[)
 *
 * Returns the position info if inside a wiki-link, null otherwise
 */
function getWikiLinkContext(context: CompletionContext): {
  from: number
  to: number
  query: string
} | null {
  const { state, pos } = context
  const line = state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  // Find the last [[ that isn't closed
  const lastOpenBracket = textBefore.lastIndexOf('[[')
  if (lastOpenBracket === -1) return null

  // Check if there's a ]] between the [[ and cursor
  const textAfterOpen = textBefore.slice(lastOpenBracket + 2)
  if (textAfterOpen.includes(']]')) return null

  // Get the query (text after [[)
  const query = textAfterOpen

  return {
    from: line.from + lastOpenBracket,
    to: pos,
    query,
  }
}

/**
 * Fuzzy match scoring for autocomplete
 *
 * Higher score = better match
 * - Exact prefix match: highest score
 * - Word boundary match: high score
 * - Contains match: medium score
 * - No match: -1
 */
function fuzzyScore(query: string, text: string): number {
  if (!query) return 0 // Empty query matches everything with neutral score

  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  // Exact prefix match (highest priority)
  if (lowerText.startsWith(lowerQuery)) {
    return 100 + (query.length / text.length) * 50
  }

  // Word boundary match
  const words = lowerText.split(/\s+/)
  for (const word of words) {
    if (word.startsWith(lowerQuery)) {
      return 75 + (query.length / text.length) * 25
    }
  }

  // Contains match
  if (lowerText.includes(lowerQuery)) {
    const index = lowerText.indexOf(lowerQuery)
    return 50 - index * 0.5
  }

  return -1 // No match
}

/**
 * Creates an autocomplete source for wiki-links
 */
function createWikiLinkCompletionSource(
  options: WikiLinkAutocompleteOptions
): (context: CompletionContext) => CompletionResult | null {
  const { getNodes, maxSuggestions = 10 } = options

  return (context: CompletionContext): CompletionResult | null => {
    const wikiContext = getWikiLinkContext(context)
    if (!wikiContext) return null

    const { from, query } = wikiContext
    const nodes = getNodes()

    // Score and filter nodes
    const scored = nodes
      .map((node) => ({
        node,
        titleScore: fuzzyScore(query, node.title),
        idScore: fuzzyScore(query, node.id),
      }))
      .filter(({ titleScore, idScore }) => titleScore >= 0 || idScore >= 0)
      .map((item) => ({
        ...item,
        score: Math.max(item.titleScore, item.idScore),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)

    // Notify about result count for accessibility
    if (options.onResultCountChange) {
      options.onResultCountChange(scored.length)
    }

    // Map to CodeMirror completions
    const completions: Completion[] = scored.map(({ node }) => ({
      label: node.title,
      detail: `${TYPE_ICONS[node.type]} ${TYPE_LABELS[node.type]}`,
      info:
        node.id !== node.title.toLowerCase().replace(/\s+/g, '-')
          ? `ID: ${node.id}`
          : undefined,
      apply: (
        view: EditorView,
        _completion: Completion,
        from: number,
        to: number
      ) => {
        // Insert the wiki-link using the node title
        const linkText = `[[${node.title}]]`
        view.dispatch({
          changes: { from, to, insert: linkText },
          selection: { anchor: from + linkText.length },
        })
        // Notify about insertion
        if (options.onLinkInserted) {
          options.onLinkInserted(node.id, node.title)
        }
      },
      // Store node data for navigation callback
      type: node.type,
    }))

    if (completions.length === 0) return null

    return {
      from,
      options: completions,
      filter: false, // We handle filtering ourselves
    }
  }
}

/**
 * Creates the autocomplete keymap for wiki-links
 *
 * - Enter: Select current completion
 * - Escape: Close completion menu
 * - Ctrl+Space / Cmd+Space: Trigger completion manually
 */
function createWikiLinkKeymap(): Extension {
  return keymap.of([
    {
      key: 'Escape',
      run: (view) => {
        // Close the completion menu if open
        closeCompletion(view)
        return true
      },
    },
    {
      key: 'Ctrl-Space',
      mac: 'Cmd-Space',
      run: (view) => {
        startCompletion(view)
        return true
      },
    },
  ])
}

/**
 * Plugin to detect [[ input and trigger autocomplete
 */
function createWikiLinkTriggerPlugin(): Extension {
  return ViewPlugin.fromClass(
    class {
      update(update: ViewUpdate) {
        // Check if user just typed '['
        if (!update.docChanged) return

        const { state } = update
        const pos = state.selection.main.head
        const line = state.doc.lineAt(pos)
        const textBefore = line.text.slice(0, pos - line.from)

        // If text ends with [[, trigger autocomplete
        if (textBefore.endsWith('[[')) {
          // Schedule autocomplete trigger for next tick
          setTimeout(() => {
            startCompletion(update.view)
          }, 0)
        }
      }
    }
  )
}

/**
 * Styles for the autocomplete popup
 */
const autocompleteTheme = EditorView.theme({
  '.cm-tooltip-autocomplete': {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow:
      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    backgroundColor: '#ffffff',
    maxHeight: '300px',
    overflow: 'auto',
  },
  '.cm-tooltip-autocomplete ul': {
    fontFamily: 'inherit',
    padding: '4px',
  },
  '.cm-tooltip-autocomplete li': {
    padding: '6px 10px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  '.cm-tooltip-autocomplete li[aria-selected="true"]': {
    backgroundColor: '#f3f4f6',
  },
  '.cm-completionLabel': {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-completionDetail': {
    marginLeft: '12px',
    fontSize: '12px',
    color: '#6b7280',
  },
  // Dark mode styles
  '&.dark .cm-tooltip-autocomplete, .dark & .cm-tooltip-autocomplete': {
    border: '1px solid #374151',
    backgroundColor: '#1f2937',
  },
  '&.dark .cm-tooltip-autocomplete li[aria-selected="true"], .dark & .cm-tooltip-autocomplete li[aria-selected="true"]':
    {
      backgroundColor: '#374151',
    },
  '&.dark .cm-completionDetail, .dark & .cm-completionDetail': {
    color: '#9ca3af',
  },
})

/**
 * Creates the wiki-link autocomplete extension
 *
 * @param options - Configuration options
 * @returns CodeMirror extension array
 *
 * @example
 * ```tsx
 * const extensions = [
 *   ...createWikiLinkAutocomplete({
 *     getNodes: () => nodes.map(n => ({ id: n.id, title: n.title, type: n.type })),
 *     onLinkInserted: (id, title) => console.log('Inserted link to', title),
 *   }),
 * ]
 * ```
 */
export function createWikiLinkAutocomplete(
  options: WikiLinkAutocompleteOptions
): Extension[] {
  const completionSource = createWikiLinkCompletionSource(options)

  return [
    autocompletion({
      override: [completionSource],
      activateOnTyping: true,
      closeOnBlur: true,
      maxRenderedOptions: options.maxSuggestions ?? 10,
      icons: false,
    }),
    createWikiLinkKeymap(),
    createWikiLinkTriggerPlugin(),
    autocompleteTheme,
  ]
}

/**
 * Utility to convert ForgeNode to NodeSuggestion
 */
export function nodeToSuggestion(node: ForgeNode): NodeSuggestion {
  return {
    id: node.id,
    title: node.title,
    type: node.type,
  }
}

/**
 * Creates NodeSuggestion array from a Map of ForgeNodes
 */
export function nodesToSuggestions(
  nodes: Map<string, ForgeNode>
): NodeSuggestion[] {
  return Array.from(nodes.values()).map(nodeToSuggestion)
}

// Re-export for convenience
export { startCompletion, closeCompletion }
