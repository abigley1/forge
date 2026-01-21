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
  },
  ref
) {
  // Memoize extensions to avoid recreating on every render
  const extensions = useMemo(() => {
    const exts = [
      markdown({ base: markdownLanguage }),
      EditorView.lineWrapping,
      getEditorTheme(darkMode),
    ]
    return exts
  }, [darkMode])

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
      completionKeymap: false,
      lintKeymap: false,
    }),
    [lineNumbers]
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-gray-200 dark:border-gray-700',
        'focus-within:ring-2 focus-within:ring-gray-950 focus-within:ring-offset-2',
        'dark:focus-within:ring-gray-300',
        readOnly && 'bg-gray-50 dark:bg-gray-900',
        className
      )}
      role="textbox"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-readonly={readOnly}
      aria-multiline="true"
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
