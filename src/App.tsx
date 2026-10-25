import { useState, useEffect } from 'react'
import { PrintQueueView } from '@/components/print-queue/PrintQueueView'
import { DesignProjectsView } from '@/components/design-projects/DesignProjectsView'
import { AppShell } from '@/components/layout'
import { CommandPalette } from '@/components/command'
import { InventoryView } from '@/components/inventory'
import { cn } from '@/lib/utils'

/**
 * Landing page: Forge is the workshop app (inventory, filament, parts lists,
 * print queue). Project knowledge lives in the vault.
 */
function WelcomeScreen({
  onOpenInventory,
  onOpenPrintQueue,
  onOpenDesign,
}: {
  onOpenInventory: () => void
  onOpenPrintQueue: () => void
  onOpenDesign: () => void
}) {
  const toolClass = cn(
    'text-forge-text-secondary dark:text-forge-text-secondary-dark hover:text-forge-accent',
    'flex min-h-11 w-full items-center py-2 text-left font-mono text-sm font-medium',
    'focus-visible:ring-forge-accent focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none',
    'dark:focus-visible:ring-forge-accent-dark'
  )
  return (
    <div
      className="bg-forge-paper dark:bg-forge-paper-dark flex flex-1 flex-col"
      data-testid="welcome-screen"
    >
      <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-forge-text dark:text-forge-text-dark font-mono text-lg font-semibold tracking-[0.15em] uppercase">
          Forge
        </h1>
        <span className="text-forge-muted dark:text-forge-muted-dark font-mono text-xs">
          Workshop
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-forge-muted dark:text-forge-muted-dark mb-4 font-mono text-xs font-medium tracking-[0.1em] uppercase">
            Tools
          </h2>
          <button type="button" onClick={onOpenDesign} className={toolClass}>
            3D Design
          </button>
          <button
            type="button"
            onClick={onOpenPrintQueue}
            className={toolClass}
          >
            Print queue
          </button>
          <button type="button" onClick={onOpenInventory} className={toolClass}>
            Inventory
          </button>
          <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-8 text-sm">
            Project notes, tasks and decisions live in the vault.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Standalone inventory view — full-page, no project context
 */
function StandaloneInventory({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-forge-paper dark:bg-forge-paper-dark flex flex-1 flex-col">
      {/* Header bar with back navigation */}
      <div className="border-forge-border dark:border-forge-border-dark flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'text-forge-muted font-mono text-xs tracking-[0.08em] uppercase',
              'transition-colors duration-150',
              'hover:text-forge-accent',
              'dark:text-forge-muted-dark dark:hover:text-forge-accent-dark',
              'focus-visible:ring-forge-accent focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none',
              'dark:focus-visible:ring-forge-accent-dark'
            )}
          >
            ← Forge
          </button>
          <span className="text-forge-border dark:text-forge-border-dark">
            /
          </span>
          <span className="text-forge-text dark:text-forge-text-dark font-mono text-sm font-medium tracking-[0.1em] uppercase">
            Inventory
          </span>
        </div>
      </div>

      {/* Inventory content */}
      <div className="min-h-0 flex-1 overflow-auto">
        <InventoryView />
      </div>
    </div>
  )
}

/** Forge workshop app: landing page plus standalone tools. */
function App() {
  const [standaloneTool, setStandaloneTool] = useState<
    'inventory' | 'print-queue' | '3d-design' | null
  >(() => {
    const tool = new URLSearchParams(window.location.search).get('tool')
    return tool === 'print-queue' || tool === '3d-design' ? tool : null
  })
  const openTool = (tool: 'print-queue' | '3d-design') => {
    setStandaloneTool(tool)
    window.history.replaceState(null, '', `?tool=${tool}`)
  }
  const closeTool = () => {
    setStandaloneTool(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  // Sync dark mode class with system preference on mount
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (dark: boolean) =>
      document.documentElement.classList.toggle('dark', dark)
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const renderContent = () => {
    if (standaloneTool === '3d-design') {
      return (
        <DesignProjectsView
          onBack={closeTool}
          onOpenQueue={() => openTool('print-queue')}
        />
      )
    }
    if (standaloneTool === 'print-queue') {
      return <PrintQueueView onBack={closeTool} />
    }
    if (standaloneTool === 'inventory') {
      return <StandaloneInventory onBack={closeTool} />
    }
    return (
      <WelcomeScreen
        onOpenInventory={() => setStandaloneTool('inventory')}
        onOpenPrintQueue={() => openTool('print-queue')}
        onOpenDesign={() => openTool('3d-design')}
      />
    )
  }

  return (
    <AppShell hideSidebar>
      {renderContent()}
      <CommandPalette />
    </AppShell>
  )
}

export default App
