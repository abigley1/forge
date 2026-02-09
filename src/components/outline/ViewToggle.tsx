/**
 * ViewToggle Component
 *
 * Toggle between Outline, Graph, and Kanban views with keyboard shortcuts:
 * - Ctrl/Cmd+1: Switch to Outline view
 * - Ctrl/Cmd+2: Switch to Graph view
 * - Ctrl/Cmd+3: Switch to Kanban view
 */

import { List, GitBranch, Columns3, Package } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useHotkey } from '@/hooks'

// ============================================================================
// Types
// ============================================================================

export type ViewMode = 'outline' | 'graph' | 'kanban' | 'inventory'

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
  kanban: {
    label: 'Kanban',
    icon: Columns3,
    shortcut: '3',
    shortcutLabel: '⌘3',
  },
  inventory: {
    label: 'Inventory',
    icon: Package,
    shortcut: '4',
    shortcutLabel: '⌘4',
  },
}

// ============================================================================
// Component
// ============================================================================

/**
 * Toggle between Outline, Graph, and Kanban views.
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

  useHotkey('3', () => onChange('kanban'), { ctrl: true })

  useHotkey('4', () => onChange('inventory'), { ctrl: true })

  // Also register with meta key for Mac
  useHotkey('1', () => onChange('outline'), { meta: true })

  useHotkey('2', () => onChange('graph'), { meta: true })

  useHotkey('3', () => onChange('kanban'), { meta: true })

  useHotkey('4', () => onChange('inventory'), { meta: true })

  return (
    <div
      className={cn(
        'border-forge-border dark:border-forge-border-dark inline-flex gap-1 border-b',
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
              'flex items-center gap-1.5 px-3 py-1.5',
              'font-mono text-xs tracking-[0.08em] uppercase',
              'border-b-2 transition-colors duration-150',
              'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
              'dark:focus-visible:ring-forge-accent-dark',
              isSelected
                ? 'border-forge-accent text-forge-text dark:border-forge-accent-dark dark:text-forge-text-dark'
                : 'text-forge-muted hover:text-forge-text-secondary dark:text-forge-muted-dark dark:hover:text-forge-text-secondary-dark border-transparent'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{config.label}</span>
            {showShortcuts && (
              <kbd
                className={cn(
                  'ml-1 hidden font-mono text-[10px] tracking-[0.05em] sm:inline-block',
                  isSelected
                    ? 'text-forge-text-secondary dark:text-forge-text-secondary-dark'
                    : 'text-forge-muted dark:text-forge-muted-dark'
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
