/**
 * Quick Project Switcher Component
 *
 * Command palette-style dialog for quickly switching between projects.
 * Opened with Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux).
 *
 * Features:
 * - Fuzzy search across project names
 * - Recent projects shown first
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Highlighted matched characters
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { FolderOpen, Clock, Search, Folder } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Dialog } from '@/components/ui'
import { useWorkspaceStore, type ProjectSummary } from '@/store'
import { fuzzySearch, findMatchedIndices } from '@/lib/fuzzySearch'
import { Z_MODAL } from '@/lib/z-index'

// ============================================================================
// Types
// ============================================================================

interface QuickProjectSwitcherProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Called when a project is selected */
  onSelectProject?: (projectId: string) => void
}

interface ProjectResultProps {
  project: ProjectSummary
  isSelected: boolean
  isRecent: boolean
  searchQuery: string
  onClick: () => void
}

/** Segment of text for highlighting */
interface HighlightSegment {
  text: string
  isMatch: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Highlight matched characters in text
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text

  const indices = findMatchedIndices(text, query)
  if (indices.length === 0) return text

  const segments: HighlightSegment[] = []
  let lastIndex = 0

  indices.forEach((index) => {
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), isMatch: false })
    }
    segments.push({ text: text[index], isMatch: true })
    lastIndex = index + 1
  })

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false })
  }

  return segments.map((seg, i) =>
    seg.isMatch ? (
      <mark key={i} className="rounded-sm bg-yellow-200 dark:bg-yellow-900">
        {seg.text}
      </mark>
    ) : (
      <span key={i}>{seg.text}</span>
    )
  )
}

// ============================================================================
// ProjectResult Component
// ============================================================================

function ProjectResult({
  project,
  isSelected,
  isRecent,
  searchQuery,
  onClick,
}: ProjectResultProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2',
        'text-sm text-gray-700 dark:text-gray-300',
        'transition-colors duration-100',
        isSelected
          ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      )}
    >
      <FolderOpen
        className={cn(
          'h-5 w-5 shrink-0',
          isSelected ? 'text-blue-500' : 'text-gray-400'
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate font-medium">
          {highlightText(project.name, searchQuery)}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>{project.nodeCount} nodes</span>
          {project.description && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{project.description}</span>
            </>
          )}
        </div>
      </div>
      {isRecent && (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>Recent</span>
        </div>
      )}
    </button>
  )
}

// ============================================================================
// QuickProjectSwitcher Component
// ============================================================================

export function QuickProjectSwitcher({
  open,
  onOpenChange,
  onSelectProject,
}: QuickProjectSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Store state
  const projects = useWorkspaceStore((state) => state.projects)
  const recentProjectIds = useWorkspaceStore((state) => state.recentProjectIds)
  const setActiveProject = useWorkspaceStore((state) => state.setActiveProject)
  const getSortedProjects = useWorkspaceStore(
    (state) => state.getSortedProjects
  )

  // Filter and sort projects
  // Note: Include `projects` in deps to re-render when store updates
  const filteredProjects = useMemo(() => {
    const sorted = getSortedProjects()
    if (!searchQuery.trim()) return sorted

    // Use fuzzy search - returns FuzzyMatchResult[]
    const results = fuzzySearch(
      sorted.map((p) => p.name),
      searchQuery
    )
    // Map back to project objects using the item property
    return results
      .map((result) => sorted.find((p) => p.name === result.item)!)
      .filter(Boolean)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- projects triggers re-render when store updates
  }, [getSortedProjects, searchQuery, projects])

  // Track previous open state
  const prevOpenRef = useRef(open)

  // Check if project is recent
  const isRecent = useCallback(
    (id: string) => recentProjectIds.includes(id),
    [recentProjectIds]
  )

  // Reset state when dialog opens (transition from closed to open)
  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    if (open && !wasOpen) {
      // Dialog just opened - reset state and focus
      setSearchQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredProjects.length > 0) {
      const selectedItem = listRef.current.children[
        selectedIndex
      ] as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, filteredProjects.length])

  // Handle search input change - reset selection to first item
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setSelectedIndex(0)
  }, [])

  // Handle project selection
  const handleSelectProject = useCallback(
    (projectId: string) => {
      setActiveProject(projectId)
      onSelectProject?.(projectId)
      onOpenChange(false)
    },
    [setActiveProject, onSelectProject, onOpenChange]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredProjects.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          event.preventDefault()
          if (filteredProjects[selectedIndex]) {
            handleSelectProject(filteredProjects[selectedIndex].id)
          }
          break
        case 'Home':
          event.preventDefault()
          setSelectedIndex(0)
          break
        case 'End':
          event.preventDefault()
          setSelectedIndex(Math.max(0, filteredProjects.length - 1))
          break
      }
    },
    [filteredProjects, selectedIndex, handleSelectProject]
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          className={cn(
            'fixed top-[20%] left-1/2 -translate-x-1/2',
            'w-full max-w-lg rounded-xl bg-white shadow-2xl',
            'dark:border dark:border-gray-800 dark:bg-gray-900',
            'overflow-hidden',
            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            'transition-[transform,opacity] duration-150'
          )}
          style={{ zIndex: Z_MODAL + 1 }}
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">Switch Project</Dialog.Title>

          {/* Search Input */}
          <div className="relative border-b border-gray-200 dark:border-gray-800">
            <Search
              className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls="project-list"
              aria-activedescendant={
                filteredProjects[selectedIndex]
                  ? `project-${filteredProjects[selectedIndex].id}`
                  : undefined
              }
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={cn(
                'w-full py-4 pr-4 pl-12',
                'text-base text-gray-900 placeholder:text-gray-400',
                'dark:bg-gray-900 dark:text-gray-100',
                'focus:outline-none'
              )}
            />
          </div>

          {/* Results */}
          <div
            ref={listRef}
            id="project-list"
            role="listbox"
            aria-label="Projects"
            className="max-h-80 overflow-y-auto p-2"
          >
            {filteredProjects.length > 0 ? (
              <>
                {/* Recent Section Label */}
                {!searchQuery && recentProjectIds.length > 0 && (
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Recent Projects
                  </div>
                )}

                {/* Project List */}
                {filteredProjects.map((project, index) => (
                  <div key={project.id} id={`project-${project.id}`}>
                    {/* Add "All Projects" label after recent section */}
                    {!searchQuery &&
                      index > 0 &&
                      recentProjectIds.includes(
                        filteredProjects[index - 1]?.id
                      ) &&
                      !recentProjectIds.includes(project.id) && (
                        <div className="mt-2 border-t border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400">
                          All Projects
                        </div>
                      )}
                    <ProjectResult
                      project={project}
                      isSelected={index === selectedIndex}
                      isRecent={isRecent(project.id)}
                      searchQuery={searchQuery}
                      onClick={() => handleSelectProject(project.id)}
                    />
                  </div>
                ))}
              </>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Folder
                  className="mb-2 h-8 w-8 text-gray-300"
                  aria-hidden="true"
                />
                <p className="text-sm">No projects matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Folder
                  className="mb-2 h-8 w-8 text-gray-300"
                  aria-hidden="true"
                />
                <p className="text-sm">No projects in workspace</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <span>
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  ↑↓
                </kbd>{' '}
                to navigate
              </span>
              <span>
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  ↵
                </kbd>{' '}
                to select
              </span>
              <span>
                <kbd className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  esc
                </kbd>{' '}
                to close
              </span>
            </div>
            {filteredProjects.length > 0 && (
              <span>
                {filteredProjects.length} project
                {filteredProjects.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
