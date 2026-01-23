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
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  useWorkspaceStore,
  useProjectStore,
  useNodesStore,
  type ProjectSummary,
} from '@/store'
import { fuzzySearch } from '@/lib/fuzzySearch'
import { Z_DROPDOWN } from '@/lib/z-index'

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
        <mark className="bg-yellow-200 dark:bg-yellow-900">
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
        'text-sm text-gray-700 dark:text-gray-300',
        'transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300',
        isActive
          ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
    >
      <FolderOpen
        className={cn(
          'h-4 w-4 shrink-0',
          isActive ? 'text-blue-500' : 'text-gray-400'
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-medium">{highlightedName}</div>
        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
          {project.nodeCount} node{project.nodeCount === 1 ? '' : 's'}
        </div>
      </div>
      {isActive && (
        <Check
          className="h-4 w-4 shrink-0 text-blue-500"
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
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Store state
  const projects = useWorkspaceStore((state) => state.projects)
  const activeProjectId = useWorkspaceStore((state) => state.activeProjectId)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)
  const getSortedProjects = useWorkspaceStore(
    (state) => state.getSortedProjects
  )

  // Current project info from project store
  const currentProject = useProjectStore((state) => state.project)
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

  // Handle project selection
  const handleSelectProject = useCallback(
    (projectId: string) => {
      setActiveProject(projectId)
      setIsOpen(false)
      setSearchQuery('')

      // TODO: Trigger actual project loading
      // For now, just update the workspace state
    },
    [setActiveProject]
  )

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
        'relative border-b border-gray-200 dark:border-gray-800',
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
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none focus-visible:ring-inset dark:focus-visible:ring-gray-300',
          'transition-colors duration-150'
        )}
      >
        <FolderOpen className="h-5 w-5 text-gray-500" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-left">
          <h1 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
            {displayName}
          </h1>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {currentProject
              ? `${displayCount} node${displayCount === 1 ? '' : 's'}`
              : 'No project loaded'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200',
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
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none dark:focus-visible:ring-gray-300',
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
            'rounded-lg border border-gray-200 bg-white shadow-lg',
            'dark:border-gray-700 dark:bg-gray-900',
            'max-h-80 overflow-hidden'
          )}
          style={{ zIndex: Z_DROPDOWN }}
        >
          {/* Search Input */}
          {projects.length > 3 && (
            <div className="border-b border-gray-200 p-2 dark:border-gray-700">
              <div className="relative">
                <Search
                  className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full rounded-md border border-gray-200 py-2 pr-3 pl-10',
                    'text-sm placeholder:text-gray-400',
                    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
                    'focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
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
              <p className="px-3 py-4 text-center text-sm text-gray-500">
                No projects matching "{searchQuery}"
              </p>
            ) : (
              <p className="px-3 py-4 text-center text-sm text-gray-500">
                No projects in workspace
              </p>
            )}
          </div>

          {/* Create New Project Button */}
          {onCreateClick && (
            <div className="border-t border-gray-200 p-1 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onCreateClick()
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2',
                  'text-sm font-medium text-blue-600 dark:text-blue-400',
                  'hover:bg-blue-50 dark:hover:bg-blue-950/50',
                  'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none'
                )}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create New Project
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
