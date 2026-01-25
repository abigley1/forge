/**
 * AppShell Component
 *
 * Main application layout with:
 * - Skip link for keyboard accessibility
 * - Collapsible sidebar navigation (responsive)
 * - Main content area with semantic landmarks
 *
 * Uses h-dvh (dynamic viewport height) for proper mobile browser support.
 */

import { type ReactNode, useState, useCallback } from 'react'
import { Menu, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ui'
import { CreateNodeDialog } from '@/components/nodes'
import { QuickCaptureModal } from '@/components/capture'
import { useAppStore, useNodesStore } from '@/store'
import { useHotkey } from '@/hooks'
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
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)

  // Quick capture modal state
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const setActiveNode = useNodesStore((state) => state.setActiveNode)

  // Handle quick capture note created - navigate to the new note
  const handleNoteCreated = useCallback(
    (noteId: string) => {
      setActiveNode(noteId)
    },
    [setActiveNode]
  )

  // Global hotkey for quick capture (Cmd/Ctrl+Shift+N)
  useHotkey('n', () => setQuickCaptureOpen(true), {
    ctrl: true,
    shift: true,
    preventDefault: true,
  })

  return (
    <div className={cn('flex h-dvh flex-col', className)}>
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      <div className="flex min-h-0 flex-1">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            // Base styles
            'fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 flex-col',
            'border-r border-gray-200 bg-gray-50',
            'dark:border-gray-800 dark:bg-gray-900',
            // Transform for mobile
            'transform transition-transform duration-200 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
            // Desktop: static positioning
            'md:static md:translate-x-0'
          )}
          aria-label="Sidebar navigation"
        >
          <ErrorBoundary section="sidebar" className="h-full">
            {sidebar ?? <Sidebar />}
          </ErrorBoundary>
        </aside>

        {/* Main content area */}
        <main
          id="main-content"
          className="flex min-w-0 flex-1 flex-col overflow-auto"
          tabIndex={-1}
        >
          {/* Mobile header with menu toggle */}
          <header className="flex items-center border-b border-gray-200 px-4 py-2 md:hidden dark:border-gray-800">
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-md',
                'text-gray-700 hover:bg-gray-100',
                'dark:text-gray-300 dark:hover:bg-gray-800',
                'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none',
                'dark:focus-visible:ring-gray-300'
              )}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <h1 className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Forge
            </h1>
          </header>

          <ErrorBoundary section="main" className="flex-1">
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global create node dialog (accessible via command palette) */}
      <CreateNodeDialog enableHotkey={false} />

      {/* Quick capture modal (Cmd/Ctrl+Shift+N) */}
      <QuickCaptureModal
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onNoteCreated={handleNoteCreated}
      />
    </div>
  )
}
