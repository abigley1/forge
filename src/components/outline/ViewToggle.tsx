/**
 * ViewToggle Component
 *
 * Toggle between Outline and Graph views with keyboard shortcuts:
 * - Ctrl/Cmd+1: Switch to Outline view
 * - Ctrl/Cmd+2: Switch to Graph view
 */

import { List, GitBranch } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useHotkey } from '@/hooks'

// ============================================================================
// Types
// ============================================================================

export type ViewMode = 'outline' | 'graph'

export interface ViewToggleProps {
  /** Current view mode */
  value: ViewMode
  /** Called when view mode changes */
  onChange: (view: ViewMode) => void
  /** Additional CSS classes */
  className?: string
  /** Whether to show keyboard hints */
  showShortcuts?: boolean
}

// ============================================================================
// View Config
// ============================================================================

const VIEW_CONFIG: Record<
  ViewMode,
  {
    label: string
    icon: typeof List
    shortcut: string
    shortcutLabel: string
  }
> = {
  outline: {
    label: 'Outline',
    icon: List,
    shortcut: '1',
    shortcutLabel: '⌘1',
  },
  graph: {
    label: 'Graph',
    icon: GitBranch,
    shortcut: '2',
    shortcutLabel: '⌘2',
  },
}

// ============================================================================
// Component
// ============================================================================

/**
 * Toggle between Outline and Graph views.
 *
 * @example
 * <ViewToggle
 *   value={activeView}
 *   onChange={setActiveView}
 *   showShortcuts
 * />
 */
export function ViewToggle({
  value,
  onChange,
  className,
  showShortcuts = true,
}: ViewToggleProps) {
  // Register keyboard shortcuts
  useHotkey('1', () => onChange('outline'), { ctrl: true })

  useHotkey('2', () => onChange('graph'), { ctrl: true })

  // Also register with meta key for Mac
  useHotkey('1', () => onChange('outline'), { meta: true })

  useHotkey('2', () => onChange('graph'), { meta: true })

  return (
    <div
      className={cn(
        'inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800',
        className
      )}
      role="tablist"
      aria-label="View mode"
    >
      {(
        Object.entries(VIEW_CONFIG) as [ViewMode, typeof VIEW_CONFIG.outline][]
      ).map(([mode, config]) => {
        const Icon = config.icon
        const isSelected = value === mode

        return (
          <button
            key={mode}
            id={`${mode}-tab`}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`${mode}-panel`}
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5',
              'text-sm font-medium transition-colors duration-150',
              'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none focus-visible:ring-inset',
              isSelected
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{config.label}</span>
            {showShortcuts && (
              <kbd
                className={cn(
                  'ml-1 hidden rounded px-1 py-0.5 text-xs font-normal sm:inline-block',
                  isSelected
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                {config.shortcutLabel}
              </kbd>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default ViewToggle
