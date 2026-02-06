import { useCallback, useMemo } from 'react'
import CodeMirror, {
  type ReactCodeMirrorProps,
  type ReactCodeMirrorRef,
} from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { getEditorTheme } from './theme'
import {
  createWikiLinkAutocomplete,
  type NodeSuggestion,
} from './wikiLinkAutocomplete'
import {
  createWikiLinkDecorations,
  type WikiLinkDecorationOptions,
} from './wikiLinkDecorations'

export type MarkdownEditorProps = {
  /**
   * The markdown content to display
   */
  value: string
  /**
   * Callback when the content changes
   */
  onChange?: (value: string) => void
  /**
   * Placeholder text when editor is empty
   */
  placeholder?: string
  /**
   * Whether the editor is read-only
   */
  readOnly?: boolean
  /**
   * Whether to use dark mode theme
   * @default false
   */
  darkMode?: boolean
  /**
   * Whether to show line numbers
   * @default false
   */
  lineNumbers?: boolean
  /**
   * Minimum height of the editor
   * @default '200px'
   */
  minHeight?: string
  /**
   * Maximum height of the editor (enables scrolling)
   */
  maxHeight?: string
  /**
   * Auto-focus the editor on mount
   * @default false
   */
  autoFocus?: boolean
  /**
   * Additional className for the container
   */
  className?: string
  /**
   * Accessible label for the editor
   */
  'aria-label'?: string
  /**
   * ID of element that labels the editor
   */
  'aria-labelledby'?: string
  /**
   * ID of element that describes the editor
   */
  'aria-describedby'?: string
  /**
   * Enable wiki-link autocomplete with [[ trigger
   * When true, nodes must be provided via the nodes prop
   * @default false
   */
  enableWikiLinks?: boolean
  /**
   * Nodes available for wiki-link autocomplete suggestions
   * Required when enableWikiLinks is true
   */
  nodes?: NodeSuggestion[]
  /**
   * Callback when a wiki-link is inserted
   */
  onLinkInserted?: (nodeId: string, nodeTitle: string) => void
  /**
   * Callback when navigating through autocomplete suggestions (for aria-live)
   */
  onAutocompleteNavigate?: (
    suggestion: NodeSuggestion | null,
    totalCount: number
  ) => void
  /**
   * Callback when autocomplete result count changes (for aria-live)
   */
  onAutocompleteResultCountChange?: (count: number) => void
  /**
   * Maximum number of autocomplete suggestions to show
   * @default 10
   */
  maxAutocompleteSuggestions?: number
  /**
   * Enable wiki-link decorations (underline, click navigation)
   * When true, wikiLinkDecorationOptions should be provided
   * @default false
   */
  enableWikiLinkDecorations?: boolean
  /**
   * Options for wiki-link decorations (link resolution, click handlers)
   * Required when enableWikiLinkDecorations is true
   */
  wikiLinkDecorationOptions?: WikiLinkDecorationOptions
}

/**
 * A markdown editor component based on CodeMirror
 *
 * Features:
 * - Markdown syntax highlighting
 * - Light and dark theme support
 * - Configurable line numbers
 * - Read-only mode
 * - Accessible with ARIA attributes
 *
 * @example
 * ```tsx
 * <MarkdownEditor
 *   value={content}
 *   onChange={setContent}
 *   placeholder="Start writing..."
 *   darkMode={isDark}
 * />
 * ```
 */
export const MarkdownEditor = forwardRef<
  ReactCodeMirrorRef,
  MarkdownEditorProps
>(function MarkdownEditor(
  {
    value,
    onChange,
    placeholder = 'Start writing...',
    readOnly = false,
    darkMode = false,
    lineNumbers = false,
    minHeight = '200px',
    maxHeight,
    autoFocus = false,
    className,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    enableWikiLinks = false,
    nodes,
    onLinkInserted,
    onAutocompleteNavigate,
    onAutocompleteResultCountChange,
    maxAutocompleteSuggestions = 10,
    enableWikiLinkDecorations = false,
    wikiLinkDecorationOptions,
  },
  ref
) {
  // Memoize the nodes array for stable reference
  // This avoids recreating the getNodes function on every render
  const memoizedNodes = useMemo(() => nodes ?? [], [nodes])

  // Memoize extensions to avoid recreating on every render
  const extensions = useMemo(() => {
    const exts = [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      getEditorTheme(darkMode),
    ]

    // Add aria-label to the content element for accessibility
    // This ensures axe-core recognizes the textbox has an accessible name
    if (ariaLabel) {
      exts.push(EditorView.contentAttributes.of({ 'aria-label': ariaLabel }))
    } else if (ariaLabelledBy) {
      exts.push(
        EditorView.contentAttributes.of({ 'aria-labelledby': ariaLabelledBy })
      )
    }

    // Add wiki-link autocomplete if enabled
    if (enableWikiLinks) {
      exts.push(
        ...createWikiLinkAutocomplete({
          getNodes: () => memoizedNodes,
          onLinkInserted,
          onNavigate: onAutocompleteNavigate,
          onResultCountChange: onAutocompleteResultCountChange,
          maxSuggestions: maxAutocompleteSuggestions,
        })
      )
    }

    // Add wiki-link decorations if enabled
    if (enableWikiLinkDecorations && wikiLinkDecorationOptions) {
      exts.push(...createWikiLinkDecorations(wikiLinkDecorationOptions))
    }

    return exts
  }, [
    darkMode,
    ariaLabel,
    ariaLabelledBy,
    enableWikiLinks,
    memoizedNodes,
    onLinkInserted,
    onAutocompleteNavigate,
    onAutocompleteResultCountChange,
    maxAutocompleteSuggestions,
    enableWikiLinkDecorations,
    wikiLinkDecorationOptions,
  ])

  // Handle content changes
  const handleChange = useCallback(
    (newValue: string) => {
      onChange?.(newValue)
    },
    [onChange]
  )

  // Build basic setup options
  const basicSetup: ReactCodeMirrorProps['basicSetup'] = useMemo(
    () => ({
      lineNumbers,
      highlightActiveLineGutter: lineNumbers,
      highlightSpecialChars: true,
      history: true,
      foldGutter: false,
      drawSelection: true,
      dropCursor: true,
      allowMultipleSelections: true,
      indentOnInput: true,
      syntaxHighlighting: true,
      bracketMatching: false,
      closeBrackets: false,
      // Disable built-in autocompletion - we use our own wiki-link autocomplete
      autocompletion: false,
      rectangularSelection: true,
      crosshairCursor: false,
      highlightActiveLine: true,
      highlightSelectionMatches: true,
      closeBracketsKeymap: false,
      defaultKeymap: true,
      searchKeymap: true,
      historyKeymap: true,
      foldKeymap: false,
      // Enable completion keymap when wiki-links are enabled for Enter/Escape handling
      completionKeymap: enableWikiLinks,
      lintKeymap: false,
    }),
    [lineNumbers, enableWikiLinks]
  )

  return (
    <div
      className={cn(
        'border-forge-border dark:border-forge-border-dark overflow-hidden rounded-md border',
        'focus-within:ring-forge-accent focus-within:ring-2 focus-within:ring-offset-2',
        'dark:focus-within:ring-forge-accent-dark',
        readOnly && 'bg-forge-surface dark:bg-forge-paper-dark',
        className
      )}
      aria-describedby={ariaDescribedBy}
    >
      <CodeMirror
        ref={ref}
        value={value}
        onChange={handleChange}
        extensions={extensions}
        basicSetup={basicSetup}
        placeholder={placeholder}
        readOnly={readOnly}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- CodeMirror editor needs autoFocus for UX
        autoFocus={autoFocus}
        minHeight={minHeight}
        maxHeight={maxHeight}
        theme="none" // We apply our own theme via extensions
      />
    </div>
  )
})
