import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SkipLink } from './SkipLink'
import { Sidebar } from './Sidebar'

interface AppShellProps {
  children: ReactNode
  sidebar?: ReactNode
  className?: string
}

/**
 * AppShell provides the main application layout with:
 * - Skip link for keyboard accessibility
 * - Collapsible sidebar navigation
 * - Main content area with semantic landmarks
 *
 * Uses h-dvh (dynamic viewport height) for proper mobile browser support.
 */
export function AppShell({ children, sidebar, className }: AppShellProps) {
  return (
    <div className={cn('flex h-dvh flex-col', className)}>
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      <div className="flex min-h-0 flex-1">
        <aside
          className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          aria-label="Sidebar navigation"
        >
          {sidebar ?? <Sidebar />}
        </aside>

        <main
          id="main-content"
          className="flex min-w-0 flex-1 flex-col overflow-auto"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
