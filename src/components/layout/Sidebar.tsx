import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

/**
 * Sidebar provides the main navigation area.
 * Contains project switcher, quick create buttons, filters, and tag cloud.
 *
 * This is a placeholder implementation - full functionality comes in Sprint 2.
 */
export function Sidebar({ className }: SidebarProps) {
  return (
    <nav
      className={cn('flex h-full flex-col', className)}
      aria-label="Main navigation"
    >
      {/* Header section with project name */}
      <div className="flex items-center border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Forge
        </h1>
      </div>

      {/* Navigation content area */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Project navigation will appear here.
        </p>
      </div>

      {/* Footer section */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500">v0.0.1</p>
      </div>
    </nav>
  )
}
