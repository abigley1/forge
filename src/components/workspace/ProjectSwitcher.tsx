/**
 * Project Switcher Component
 *
 * Interactive dropdown for switching between projects in the workspace.
 * Features:
 * - Current project display with name and node count
 * - Dropdown with all projects in workspace
 * - Search/filter functionality
 * - Visual indicator for active project
 * - Settings button access
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  FolderOpen,
  ChevronDown,
  Check,
  Settings,
  Plus,
  Search,
  AlertTriangle,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  useWorkspaceStore,
  useProjectStore,
  useNodesStore,
  type ProjectSummary,
} from '@/store'
import { fuzzySearch } from '@/lib/fuzzySearch'
import { Z_DROPDOWN, Z_MODAL } from '@/lib/z-index'

// ============================================================================
// Types
// ============================================================================

interface ProjectSwitcherProps {
  /** Called when settings button is clicked */
  onSettingsClick?: () => void
  /** Called when create project is clicked */
  onCreateClick?: () => void
  className?: string
}

interface ProjectItemProps {
  project: ProjectSummary
  isActive: boolean
  onSelect: (id: string) => void
  searchQuery?: string
}

// ============================================================================
// ProjectItem Component
// ============================================================================

function ProjectItem({
  project,
  isActive,
  onSelect,
  searchQuery,
}: ProjectItemProps) {
  // Highlight matched characters if search query exists
  const highlightedName = useMemo(() => {
    if (!searchQuery) return project.name

    const lowerName = project.name.toLowerCase()
    const lowerQuery = searchQuery.toLowerCase()
    const matchIndex = lowerName.indexOf(lowerQuery)

    if (matchIndex === -1) return project.name

    return (
      <>
        {project.name.slice(0, matchIndex)}
        <mark className="bg-forge-accent-subtle dark:bg-forge-accent-subtle-dark">
          {project.name.slice(matchIndex, matchIndex + searchQuery.length)}
        </mark>
        {project.name.slice(matchIndex + searchQuery.length)}
      </>
    )
  }, [project.name, searchQuery])

  return (
    <button
      type="button"
      role="option"
      aria-selected={isActive}
      onClick={() => onSelect(project.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2',
        'text-forge-text dark:text-forge-text-dark text-sm',
        'transition-colors duration-150',
        'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
        isActive
          ? 'bg-forge-accent-subtle text-forge-accent dark:bg-forge-accent-subtle-dark dark:text-forge-accent-dark'
          : 'hover:bg-forge-surface dark:hover:bg-forge-surface-dark'
      )}
    >
      <FolderOpen
        className={cn(
          'h-4 w-4 shrink-0',
          isActive
            ? 'text-forge-accent dark:text-forge-accent-dark'
            : 'text-forge-muted dark:text-forge-muted-dark'
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-medium">{highlightedName}</div>
        <div className="text-forge-text-secondary dark:text-forge-text-secondary-dark truncate text-xs">
          {project.nodeCount} node{project.nodeCount === 1 ? '' : 's'}
        </div>
      </div>
      {isActive && (
        <Check
          className="text-forge-accent dark:text-forge-accent-dark h-4 w-4 shrink-0"
          aria-label="Active project"
        />
      )}
    </button>
  )
}

// ============================================================================
// ProjectSwitcher Component
// ============================================================================

export function ProjectSwitcher({
  onSettingsClick,
  onCreateClick,
  className,
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Store state
  const projects = useWorkspaceStore((state) => state.projects)
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)
  const getSortedProjects = useWorkspaceStore(
    (state) => state.getSortedProjects
  )

  // Current project info from project store
  const currentProject = useProjectStore((state) => state.project)
  const isDirty = useProjectStore((state) => state.isDirty)
  const nodeCount = useNodesStore((state) => state.nodes.size)

  // Get display name and count
  const displayName = currentProject?.name || 'No Project'
  const displayCount = currentProject ? nodeCount : 0

  // Filter projects by search query
  // Note: Include `projects` in deps to re-render when store updates
  const filteredProjects = useMemo(() => {
    const sorted = getSortedProjects()
    if (!searchQuery.trim()) return sorted

    // fuzzySearch returns FuzzyMatchResult[] with item property
    const results = fuzzySearch(
      sorted.map((p) => p.name),
      searchQuery
    )
    return results
      .map((result) => sorted.find((p) => p.name === result.item)!)
      .filter(Boolean)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- projects triggers re-render when store updates
  }, [getSortedProjects, searchQuery, projects])

  // Actually perform the project switch
  // The useServerPersistence hook handles loading data when activeProjectId changes
  const performProjectSwitch = useCallback(
    (projectId: string) => {
      const targetProject = projects.find((p) => p.id === projectId)
      if (!targetProject) return

      // In E2E mode (development without real file system), dispatch event for test hooks
      // This allows E2E tests to control what nodes are loaded
      if (
        import.meta.env.DEV &&
        typeof window !== 'undefined' &&
        (window as Window & { __e2eReady?: boolean }).__e2eReady
      ) {
        // Get stored project nodes from E2E test setup
        const e2eNodes = (window as Window & { __e2eProject2Nodes?: unknown[] })
          .__e2eProject2Nodes
        const e2eProject = (
          window as Window & { __e2eProject2?: { id: string } }
        ).__e2eProject2

        // Only use E2E path if test data is actually set up for this project
        if (e2eNodes && e2eProject && e2eProject.id === projectId) {
          const event = new CustomEvent('e2e-switch-project', {
            detail: { projectId, nodes: e2eNodes },
          })
          window.dispatchEvent(event)
        }
      }

      // Update workspace state - useServerPersistence will handle loading project data
      setActiveProject(projectId)
    },
    [projects, setActiveProject]
  )

  // Handle project selection
  const handleSelectProject = useCallback(
    (projectId: string) => {
      // Don't switch if already on this project
      if (projectId === activeProjectId) {
        setIsOpen(false)
        setSearchQuery('')
        return
      }

      // Check for unsaved changes
      if (isDirty) {
        setPendingProjectId(projectId)
        setShowUnsavedDialog(true)
        setIsOpen(false)
        setSearchQuery('')
        return
      }

      // Perform the switch
      setIsOpen(false)
      setSearchQuery('')
      performProjectSwitch(projectId)
    },
    [activeProjectId, isDirty, performProjectSwitch]
  )

  // Handle discard changes and switch
  const handleDiscardAndSwitch = useCallback(() => {
    if (pendingProjectId) {
      performProjectSwitch(pendingProjectId)
    }
    setShowUnsavedDialog(false)
    setPendingProjectId(null)
  }, [pendingProjectId, performProjectSwitch])

  // Handle cancel switch
  const handleCancelSwitch = useCallback(() => {
    setShowUnsavedDialog(false)
    setPendingProjectId(null)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Focus cancel button and handle Escape when unsaved dialog opens
  useEffect(() => {
    if (!showUnsavedDialog) return

    if (cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelSwitch()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showUnsavedDialog, handleCancelSwitch])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setSearchQuery('')
      triggerRef.current?.focus()
    }
  }, [])

  return (
    <div
      className={cn(
        'border-forge-border dark:border-forge-border-dark relative border-b',
        className
      )}
    >
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Switch project, current: ${displayName}`}
        className={cn(
          'flex w-full items-center gap-2 px-4 py-3',
          'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
          'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
          'transition-colors duration-150'
        )}
      >
        <FolderOpen
          className="text-forge-muted dark:text-forge-muted-dark h-5 w-5"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 text-left">
          <h1 className="text-forge-text dark:text-forge-text-dark truncate text-lg font-semibold">
            {displayName}
          </h1>
          <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark truncate text-xs">
            {currentProject
              ? `${displayCount} node${displayCount === 1 ? '' : 's'}`
              : 'No project loaded'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'text-forge-muted dark:text-forge-muted-dark h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Settings Button */}
      {currentProject && onSettingsClick && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSettingsClick()
          }}
          aria-label="Project settings"
          className={cn(
            'absolute top-1/2 right-12 -translate-y-1/2',
            'rounded-md p-2',
            'text-forge-muted hover:text-forge-text dark:text-forge-muted-dark dark:hover:text-forge-text-dark',
            'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
            'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none',
            'transition-colors duration-150'
          )}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Project list"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={cn(
            'absolute top-full right-0 left-0 mt-1',
            'border-forge-border bg-forge-paper rounded-lg border shadow-lg',
            'dark:border-forge-border-dark dark:bg-forge-paper-dark',
            'max-h-80 overflow-hidden'
          )}
          style={{ zIndex: Z_DROPDOWN }}
        >
          {/* Search Input */}
          {projects.length > 3 && (
            <div className="border-forge-border dark:border-forge-border-dark border-b p-2">
              <div className="relative">
                <Search
                  className="text-forge-muted dark:text-forge-muted-dark absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'border-forge-border w-full rounded-md border py-2 pr-3 pl-10',
                    'placeholder:text-forge-muted text-sm',
                    'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
                    'focus:border-forge-accent focus:ring-forge-accent focus:ring-1 focus:outline-none',
                    'dark:focus:border-forge-accent-dark dark:focus:ring-forge-accent-dark'
                  )}
                />
              </div>
            </div>
          )}

          {/* Project List */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  isActive={project.id === activeProjectId}
                  onSelect={handleSelectProject}
                  searchQuery={searchQuery}
                />
              ))
            ) : searchQuery ? (
              <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark px-3 py-4 text-center text-sm">
                No projects matching "{searchQuery}"
              </p>
            ) : (
              <p className="text-forge-text-secondary dark:text-forge-text-secondary-dark px-3 py-4 text-center text-sm">
                No projects in workspace
              </p>
            )}
          </div>

          {/* Create New Project Button */}
          {onCreateClick && (
            <div className="border-forge-border dark:border-forge-border-dark border-t p-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onCreateClick()
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2',
                  'text-forge-accent dark:text-forge-accent-dark text-sm font-medium',
                  'hover:bg-forge-accent-subtle dark:hover:bg-forge-accent-subtle-dark',
                  'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none'
                )}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create New Project
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: Z_MODAL - 1 }}
            onClick={handleCancelSwitch}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div
            role="alertdialog"
            aria-labelledby="unsaved-dialog-title"
            aria-describedby="unsaved-dialog-description"
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'bg-forge-paper w-full max-w-md rounded-lg p-6 shadow-xl',
              'border-forge-border border',
              'dark:border-forge-border-dark dark:bg-forge-paper-dark'
            )}
            style={{ zIndex: Z_MODAL }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle
                  className="h-5 w-5 text-yellow-600 dark:text-yellow-500"
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1">
                <h2
                  id="unsaved-dialog-title"
                  className="text-forge-text dark:text-forge-text-dark text-lg font-semibold"
                >
                  Unsaved Changes
                </h2>
                <p
                  id="unsaved-dialog-description"
                  className="text-forge-text-secondary dark:text-forge-text-secondary-dark mt-2 text-sm"
                >
                  You have unsaved changes in the current project. Switching
                  projects will discard these changes.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={handleCancelSwitch}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  'text-forge-text dark:text-forge-text-dark',
                  'border-forge-border dark:border-forge-border-dark border',
                  'hover:bg-forge-surface dark:hover:bg-forge-surface-dark',
                  'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark focus-visible:ring-2 focus-visible:outline-none'
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDiscardAndSwitch}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  'bg-red-600 text-white',
                  'hover:bg-red-700',
                  'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none'
                )}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
