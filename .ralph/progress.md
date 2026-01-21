# Ralph Loop Progress

## Status
- **Current Iteration:** 19
- **Last Updated:** 2026-01-21
- **Status:** Sprint 3 Complete (All Tasks 3.1-3.6 Complete)

## Completed Tasks
- feat-0.3: Testing Infrastructure (Vitest + RTL + coverage reporting)
  - 0.3.1: Installed Vitest + React Testing Library + jsdom
  - 0.3.2: Configured test setup file with RTL matchers
  - 0.3.3: Added coverage reporting with 80% thresholds
  - 0.3.4: Created smoke test (App renders without crash)

- feat-0.9: Error Handling (Error boundaries with fallback UI)
  - 0.9.1: Created `<ErrorBoundary>` component with fallback UI
  - 0.9.2: Added error logging with console.error and stack trace
  - 0.9.3: Wrapped major app sections (sidebar, main) in AppShell

- feat-0.10: Toast Notifications (Toast system with variants and auto-dismiss)
  - 0.10.1: Created `<ToastProvider>` context with reducer-based state
  - 0.10.2: Created `useToast()` hook with toast(), success(), error(), info(), undo()
  - 0.10.3: Implemented success, error, info, undo variants with distinct styling and icons
  - 0.10.4: Added auto-dismiss with configurable duration (default 5s, undo 8s)

- feat-1.1: Node Type System (TypeScript types for all node types with type guards)
  - 1.1.1: Created NodeType enum: decision, component, task, note
  - 1.1.2: Created BaseNode interface with id, type, title, tags, dates, content
  - 1.1.3: Created DecisionNode with status, selected, options, criteria
  - 1.1.4: Created ComponentNode with status, cost, supplier, partNumber, customFields
  - 1.1.5: Created TaskNode with status, priority, dependsOn, blocks, checklist
  - 1.1.6: Created NoteNode (extends BaseNode with minimal additions)
  - 1.1.7: Created type guards: isDecisionNode(), isComponentNode(), isTaskNode(), isNoteNode()
  - 1.1.8: Created ForgeNode discriminated union that narrows correctly
  - 1.1.9: Created factory helpers: createNodeDates(), createChecklistItem(), createDecisionOption(), createDecisionCriterion()

- feat-1.2: Project & Workspace Types (TypeScript interfaces for Project and Workspace)
  - 1.2.1: Created ProjectMetadata interface with createdAt, modifiedAt, description, nodeOrder, nodePositions
  - 1.2.2: Created Project interface with id, name, path, nodes (Map<string, ForgeNode>), metadata
  - 1.2.3: Created WorkspaceConfig interface with theme, autoSaveDelay, showWelcome, defaultView, git settings
  - 1.2.4: Created Workspace interface with projects array, activeProjectId, config
  - 1.2.5: Created factory helpers: createDefaultWorkspaceConfig(), createProjectMetadata(), createProject(), createWorkspace()
  - 1.2.6: Created helper functions: getActiveProject(), getProjectById(), hasProjects(), getNodeCountsByType()
  - 1.2.7: Wrote 48 unit tests covering all types, factories, helpers, and edge cases

- feat-1.3: YAML Frontmatter Parsing & Serialization
  - 1.3.1: Installed gray-matter package with safe YAML config
  - 1.3.2: Created `parseFrontmatter(content)` returning { data, content, error }
  - 1.3.3: Handles edge cases: no frontmatter, malformed YAML, empty file
  - 1.3.4: Created `serializeFrontmatterData()` and `serializeFrontmatter()` with field ordering (type first, then status)
  - 1.3.5: Round-trip parse/serialize produces identical data (tested)
  - 1.3.6: Created `parseMarkdownBody(content)` that extracts title from first # heading
  - 1.3.7: Created `extractWikiLinks(markdown)` using regex `/\[\[([^\]]+)\]\]/g`
  - 1.3.8: Wiki-links inside code blocks (fenced, indented) and inline code are ignored
  - 1.3.9: Created `parseMarkdownFile()` convenience function combining all parsing
  - 1.3.10: Wrote 49 unit tests covering all functions and four node type samples

- feat-1.4: Runtime Validation with Zod
  - 1.4.1: Installed zod package v3
  - 1.4.2: Created Zod schemas for each node type frontmatter (decision, component, task, note)
  - 1.4.3: Created `validateNode(data)` returning `ValidationResult<ForgeNode>` with detailed error messages
  - 1.4.4: Created `validateFrontmatter(data)` for validating raw frontmatter data
  - 1.4.5: Created validation helpers: isValidDecisionNode(), isValidComponentNode(), isValidTaskNode(), isValidNoteNode()
  - 1.4.6: Handles snake_case to camelCase transformation (depends_on -> dependsOn)
  - 1.4.7: Handles date parsing from ISO strings, timestamps, and Date objects
  - 1.4.8: Provides sensible defaults for optional fields
  - 1.4.9: Wrote 57 unit tests covering all schemas, validation functions, and edge cases

- feat-1.5: File System Abstraction (Adapter pattern for browser and memory file systems)
  - 1.5.1: Created `FileSystemAdapter` interface with readFile, writeFile, listDirectory, exists, mkdir, delete, watch, getRootPath
  - 1.5.2: Created custom error classes: FileNotFoundError, DirectoryNotFoundError, PermissionDeniedError, PathExistsError, InvalidPathError
  - 1.5.3: Implemented `MemoryFileSystemAdapter` for tests with full CRUD operations
  - 1.5.4: Implemented `BrowserFileSystemAdapter` using File System Access API with permission handling
  - 1.5.5: Added directory handle caching with 5-minute TTL for performance
  - 1.5.6: Implemented `FallbackFileSystemAdapter` using `<input type="file" webkitdirectory>` for Firefox/Safari
  - 1.5.7: Implemented `watch()` method with configurable debounce (default 100ms)
  - 1.5.8: Added File System Access API TypeScript type declarations
  - 1.5.9: Created `createFileSystemAdapter()` factory for environment detection
  - 1.5.10: Wrote 65 unit tests covering all adapters, error classes, and edge cases

- feat-1.6: Project Loading & Saving (Load projects from directory, save nodes)
  - 1.6.1: Created `slugify(text)` utility for URL-safe filename generation
  - 1.6.2: Created `generateNodeId(title, existingIds)` for unique ID generation with collision handling
  - 1.6.3: Created `getDirectoryForNodeType()` and `getNodeTypeForDirectory()` mapping functions
  - 1.6.4: Created `getNodeFilePath()` and `getNodeIdFromPath()` path utilities
  - 1.6.5: Created `serializeNode(node)` to convert ForgeNode to markdown with frontmatter
  - 1.6.6: Created `loadNode(adapter, path)` to load and validate a single node file
  - 1.6.7: Created `loadProject(adapter, path)` that scans decisions/, components/, tasks/, notes/
  - 1.6.8: Built nodes Map with correct types, collects parse errors without failing
  - 1.6.9: Created `saveNode(adapter, projectPath, node)` that determines subdirectory from node type
  - 1.6.10: Created `deleteNode()`, `saveProjectMetadata()`, and `initializeProject()` helpers
  - 1.6.11: Created `fixtures/sample-project/` with 2 nodes of each type and cross-node links:
    - decisions/: motor-selection.md, enclosure-material.md
    - components/: nema17-stepper.md, aluminum-extrusion.md
    - tasks/: design-frame.md, order-parts.md
    - notes/: project-overview.md, motor-research.md
  - 1.6.12: Created `<DebugProjectView>` component showing node count by type, parse errors, collapsible sections
  - 1.6.13: Wrote 57 unit tests covering all functions, round-trip serialization, and integration tests

- feat-2.1: Nodes Store (Zustand store for node CRUD operations with project integration)
  - 2.1.1: Created `useNodesStore` with nodes Map and activeNodeId state
  - 2.1.2: Implemented actions: addNode, updateNode, deleteNode, setActiveNode, setNodes, clearNodes
  - 2.1.3: Implemented dirty state tracking: markDirty, markClean, clearDirty, dirtyNodeIds Set
  - 2.1.4: Implemented selectors: getNodeById, getNodesByType, getAllNodes, hasNode, getNodeCountsByType
  - 2.1.5: Implemented dirty selectors: isNodeDirty, hasDirtyNodes, getDirtyNodeIds
  - 2.1.6: Created standalone selectors: selectNodes, selectActiveNodeId, selectActiveNode, selectNodeCount, selectHasDirtyNodes
  - 2.1.7: Created `useProjectStore` with project, adapter, isDirty, isLoading, error, parseErrors state
  - 2.1.8: Implemented loadProject(adapter, path) that integrates with file system adapter
  - 2.1.9: Implemented saveNode, saveAllDirtyNodes, deleteNode with file system integration
  - 2.1.10: Implemented updateMetadata, saveMetadata, closeProject, setAdapter actions
  - 2.1.11: Implemented selectors: getProjectName, getProjectPath, hasProject, hasAdapter
  - 2.1.12: Both stores use devtools middleware for Redux DevTools integration
  - 2.1.13: Stores are properly integrated: loadProject updates both stores, deleteNode syncs both
  - 2.1.14: Wrote 77 unit tests (41 for useNodesStore, 36 for useProjectStore)
  - 2.1.15: All 430 tests passing, lint, type-check, and build all pass

- feat-2.2: Undo/Redo System (Action history with keyboard shortcuts)
  - 2.2.1: Created `useUndoStore` with undo/redo stacks and action recording
  - 2.2.2: Implemented action types: addNode, updateNode, deleteNode with timestamps
  - 2.2.3: Implemented undo/redo actions that push/pop between stacks
  - 2.2.4: Implemented history size limit (default 50) with automatic trimming
  - 2.2.5: Created selectors: canUndo, canRedo, undoCount, redoCount, getUndoDescription, getRedoDescription
  - 2.2.6: Created `useHotkey` hook with modifier key support (ctrl/cmd, shift, alt)
  - 2.2.7: Implemented platform detection (Mac vs Windows/Linux) for modifier keys
  - 2.2.8: Created `useHotkeys` hook for registering multiple hotkeys at once
  - 2.2.9: Created utility functions: formatHotkey(), getModifierKeyLabel(), isMac()
  - 2.2.10: Created `useUndoRedo` hook integrating undo store with nodes store
  - 2.2.11: Wired up keyboard shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z (redo), Ctrl/Cmd+Y (redo)
  - 2.2.12: Created undoable operation wrappers: useUndoableAddNode, useUndoableUpdateNode, useUndoableDeleteNode
  - 2.2.13: Created `useUndoableNodeOperations` hook combining all undoable operations
  - 2.2.14: Hotkeys skip when typing in input/textarea (except Escape)
  - 2.2.15: Wrote 82 unit tests (33 for useUndoStore, 31 for useHotkey, 18 for useUndoRedo)
  - 2.2.16: All 512 tests passing, lint, type-check, and build all pass

- feat-2.3: Sidebar Navigation (Sidebar with project switcher, filters, tag cloud, and quick create)
  - 2.3.1: Installed lucide-react for node type icons
  - 2.3.2: Created `<Sidebar>` component with collapsible sections structure
  - 2.3.3: Created `<SidebarSection>` component with expand/collapse toggle and aria-expanded
  - 2.3.4: Created `<ProjectSwitcher>` placeholder component (full implementation in Sprint 11)
  - 2.3.5: Created `<QuickCreateButton>` with node-type-specific icons and colors
  - 2.3.6: Implemented +Decision, +Component, +Task, +Note quick create buttons
  - 2.3.7: Quick create uses `useUndoableAddNode` for undo support and sets newly created node as active
  - 2.3.8: Created `<FilterSection>` placeholder component (full implementation in Sprint 3)
  - 2.3.9: Created `<TagCloud>` component that extracts tags from all nodes with counts
  - 2.3.10: Tag cloud shows top 10 tags sorted by count, with clickable buttons
  - 2.3.11: Updated `<AppShell>` with mobile responsive sidebar collapse behavior
  - 2.3.12: Added mobile header with hamburger menu toggle button
  - 2.3.13: Added backdrop overlay when sidebar open on mobile (click to close)
  - 2.3.14: Sidebar uses CSS transform for slide-in/out animation (no layout shift)
  - 2.3.15: Desktop: sidebar is static; Mobile: sidebar is fixed with transform
  - 2.3.16: All icons have aria-hidden="true", buttons have descriptive aria-labels
  - 2.3.17: Wrote 25 unit tests for Sidebar (rendering, sections, quick create, tag cloud, accessibility)
  - 2.3.18: Wrote 8 additional unit tests for AppShell mobile responsive behavior
  - 2.3.19: All 545 tests passing, lint, type-check, and build all pass

- feat-2.4: Node List View (List with type icons, status badges, and keyboard navigation)
  - 2.4.1: Created `src/components/nodes/config.ts` with shared configuration for node icons and status badges
  - 2.4.2: Created `NODE_TYPE_ICON_CONFIG` mapping NodeType to lucide-react icon, color, and label
  - 2.4.3: Created `STATUS_CONFIG` mapping all status types to label, bgColor, textColor, and dotColor
  - 2.4.4: Created `<NodeTypeIcon>` component displaying correct lucide-react icon per node type
  - 2.4.5: NodeTypeIcon has aria-hidden="true" for accessibility and supports sm/md/lg sizes
  - 2.4.6: Created `<StatusBadge>` component with color dot AND text label (not color-only)
  - 2.4.7: StatusBadge supports all status types: pending, selected, considering, rejected, in_progress, blocked, complete
  - 2.4.8: StatusBadge handles unknown status gracefully with gray fallback styling
  - 2.4.9: Created `<EmptyState>` component with icon, title, description, and optional CTA button
  - 2.4.10: Created `<NodeListItem>` component displaying icon, title, and status badge
  - 2.4.11: NodeListItem uses forwardRef for keyboard navigation, supports active state with distinct styling
  - 2.4.12: Active NodeListItem has ring-2 ring-inset and bg-gray-100 with aria-current="true"
  - 2.4.13: Created `<NodeList>` component with full keyboard navigation support
  - 2.4.14: Keyboard navigation: Arrow Up/Down (with wrap-around), Home/End (first/last), Enter (select)
  - 2.4.15: NodeList has role="listbox" with aria-label and aria-activedescendant
  - 2.4.16: NodeList shows EmptyState when no nodes, with optional onCreateNode CTA
  - 2.4.17: Created `src/components/nodes/index.ts` with clean public exports
  - 2.4.18: Wrote 34 unit tests covering all components (NodeTypeIcon, StatusBadge, EmptyState, NodeListItem, NodeList)
  - 2.4.19: All 579 tests passing, lint, type-check, and build all pass

- feat-2.5: Markdown Editor (CodeMirror-based markdown editing with syntax highlighting)
  - 2.5.1: Installed CodeMirror packages (@codemirror/state, @codemirror/view, @codemirror/lang-markdown, @codemirror/language, @uiw/react-codemirror, @lezer/highlight)
  - 2.5.2: Created `src/components/editor/` directory for editor components
  - 2.5.3: Created `theme.ts` with light and dark themes matching app's Tailwind color scheme
  - 2.5.4: Light theme uses gray-50/900 palette, dark theme uses gray-950/100 palette
  - 2.5.5: Syntax highlighting for headings, emphasis, strong, links, code, quotes, lists
  - 2.5.6: Created `<MarkdownEditor>` component wrapping CodeMirror with React integration
  - 2.5.7: Component props: value, onChange, placeholder, readOnly, darkMode, lineNumbers, minHeight, maxHeight, autoFocus
  - 2.5.8: Full ARIA support: aria-label, aria-labelledby, aria-describedby, aria-readonly, aria-multiline
  - 2.5.9: Focus-within ring styling consistent with other app components
  - 2.5.10: Markdown language support with syntax highlighting via @codemirror/lang-markdown
  - 2.5.11: Line wrapping enabled by default, optional line numbers
  - 2.5.12: Created `index.ts` with clean exports: MarkdownEditor, lightTheme, darkTheme, getEditorTheme
  - 2.5.13: Wrote 42 unit tests covering rendering, props, themes, accessibility, content, and exports
  - 2.5.14: All 621 tests passing, lint, type-check, and build all pass

- feat-2.6: Node Detail Panel (Slide-out panel for node editing with frontmatter fields)
  - 2.6.1: Created `src/components/detail/` directory for panel components
  - 2.6.2: Created `<NodeDetailPanel>` component as slide-out panel with slide-in animation
  - 2.6.3: Panel renders as slide-out from right with responsive width (full on mobile, 480px sm, 560px lg)
  - 2.6.4: Close button works, Escape key closes panel via useHotkey hook
  - 2.6.5: Implemented focus trapping - focus stays within panel when open
  - 2.6.6: Focus returns to previously focused element when panel closes
  - 2.6.7: Added `overscroll-behavior: contain` to prevent scroll bleed
  - 2.6.8: Created `<NodeTitleEditor>` with large heading input (text-2xl font-semibold)
  - 2.6.9: NodeTitleEditor supports focusOnMount prop for auto-focus on new nodes
  - 2.6.10: Created `<StatusSelect>` using Base UI Select component
  - 2.6.11: StatusSelect shows node-type-appropriate statuses with color dots
  - 2.6.12: StatusSelect is fully keyboard accessible (arrow keys, Enter, Escape)
  - 2.6.13: Created `<TagInput>` with Enter to add, Backspace to remove last tag
  - 2.6.14: TagInput shows autocomplete suggestions from available tags
  - 2.6.15: TagInput uses comma as alternate add trigger, filters duplicates
  - 2.6.16: Created `<PrioritySelector>` as segmented control (High/Medium/Low)
  - 2.6.17: PrioritySelector supports keyboard navigation with arrow keys
  - 2.6.18: Created `<ChecklistEditor>` for task checklists with keyboard controls
  - 2.6.19: ChecklistEditor: Space at start to toggle, Enter to add, Backspace on empty to delete
  - 2.6.20: Created `parseChecklist()` and `serializeChecklist()` in `src/lib/checklist.ts`
  - 2.6.21: Checklist parser handles `- [ ]` and `- [x]` syntax (case-insensitive)
  - 2.6.22: Created `<ComponentFields>` for cost, supplier, part number, custom key-value fields
  - 2.6.23: ComponentFields supports adding/removing custom fields dynamically
  - 2.6.24: Created `<FrontmatterEditor>` that renders type-specific fields
  - 2.6.25: FrontmatterEditor shows Decision fields: status, selected option dropdown
  - 2.6.26: FrontmatterEditor shows Component fields: cost ($), supplier, part number, custom fields
  - 2.6.27: FrontmatterEditor shows Task fields: status, priority, depends-on chips, checklist
  - 2.6.28: FrontmatterEditor shows Note fields: (title and tags only, no additional fields)
  - 2.6.29: Created `src/components/detail/index.ts` with clean exports for all components
  - 2.6.30: Wrote 53 unit tests for detail components (panel, title, status, tags, priority, checklist, etc.)
  - 2.6.31: Wrote 17 unit tests for checklist parsing/serialization utilities
  - 2.6.32: All 691 tests passing, lint, type-check, and build all pass

- feat-2.7: Node Creation Dialog (Dialog for creating new nodes with type selection)
  - 2.7.1: Created `<CreateNodeDialog>` component using Base UI Dialog
  - 2.7.2: Implemented node type selector with 2x2 grid of radio buttons (Decision, Component, Task, Note)
  - 2.7.3: Type selector uses proper fieldset/legend for accessibility
  - 2.7.4: Each type button shows icon from NODE_TYPE_ICON_CONFIG with correct color
  - 2.7.5: Created title input with auto-focus when dialog opens
  - 2.7.6: Title input shows type-appropriate placeholder (e.g., "My Decision")
  - 2.7.7: Created template dropdown with type-specific templates
  - 2.7.8: Templates include: Blank, Component Selection, Design Choice (Decision); Blank, Electronic Part, Mechanical Part (Component); Blank, Task with Checklist (Task); Blank, Research Note (Note)
  - 2.7.9: Template selection shows description for non-blank templates
  - 2.7.10: Template resets to Blank when node type changes
  - 2.7.11: Create button disabled when title is empty
  - 2.7.12: Created node uses `generateNodeId()` for unique slug-based ID
  - 2.7.13: Node creation uses `useUndoableAddNode` for undo support
  - 2.7.14: Created node is set as active via `setActiveNode`
  - 2.7.15: Dialog closes after successful creation
  - 2.7.16: Form resets when dialog reopens
  - 2.7.17: Wired up Ctrl/Cmd+Shift+N keyboard shortcut to open dialog
  - 2.7.18: Keyboard shortcut hint displayed at bottom of dialog
  - 2.7.19: Integrated `<CreateNodeDialog>` into `<AppShell>` for global hotkey
  - 2.7.20: Created `useCreateNodeDialog` hook for external control of dialog state
  - 2.7.21: Hook moved to `src/hooks/useCreateNodeDialog.ts` for fast-refresh compliance
  - 2.7.22: Proper accessibility: radiogroup with aria-label, labels for all inputs, dialog role
  - 2.7.23: Wrote 46 unit tests covering rendering, type selection, title input, templates, creation, controls, keyboard shortcuts, accessibility
  - 2.7.24: All 737 tests passing, lint, type-check, and build all pass

- feat-2.8: Node Deletion & Auto-Save (Delete confirmation and debounced auto-save)
  - 2.8.1: Created `<DeleteNodeDialog>` component using AlertDialog
  - 2.8.2: Dialog shows node title, type icon, and type label
  - 2.8.3: Dialog warns about broken links - shows list of nodes that link to the node being deleted
  - 2.8.4: Broken links warning truncates to 3 items with "and X more..." for long lists
  - 2.8.5: Delete action shows undo toast with restore capability
  - 2.8.6: Undo toast restores deleted node and sets it as active
  - 2.8.7: Created `useDeleteNodeDialog` hook for controlling dialog state
  - 2.8.8: Hook moved to `src/hooks/useDeleteNodeDialog.ts` for fast-refresh compliance
  - 2.8.9: Created `useAutoSave` hook with configurable delay (default 2 seconds)
  - 2.8.10: Auto-save monitors dirty state from useNodesStore
  - 2.8.11: Auto-save only triggers when adapter and project are available
  - 2.8.12: Auto-save provides callbacks: onSaveStart, onSaveSuccess, onSaveError
  - 2.8.13: Created `saveNow()` function for manual immediate save
  - 2.8.14: Created `<SaveIndicator>` component showing save status
  - 2.8.15: SaveIndicator shows: idle, saving (with spinner), saved (with checkmark), unsaved, error
  - 2.8.16: SaveIndicator has role="status" with aria-live="polite" for accessibility
  - 2.8.17: Created `useSaveIndicator` hook combining auto-save with status tracking
  - 2.8.18: "Saved" status auto-hides after configurable duration (default 2 seconds)
  - 2.8.19: Created `useBeforeUnload` hook for unsaved changes warning
  - 2.8.20: useBeforeUnload shows browser's native "Leave site?" dialog
  - 2.8.21: Created `useUnsavedChangesWarning` convenience hook using nodes store dirty state
  - 2.8.22: Exported all new components and hooks from their respective index files
  - 2.8.23: Wrote 34 unit tests for DeleteNodeDialog (rendering, broken links, interactions, accessibility)
  - 2.8.24: Wrote 17 unit tests for useAutoSave (initialization, auto-save behavior, saveNow, callbacks, isSaving)
  - 2.8.25: Wrote 11 unit tests for useBeforeUnload (event listener management, handler behavior)
  - 2.8.26: Wrote 27 unit tests for SaveIndicator (rendering, styling, accessibility, useSaveIndicator)
  - 2.8.27: Wrote 9 unit tests for useDeleteNodeDialog (initialization, openForNode, close, state transitions)
  - 2.8.28: All 819 tests passing, lint, type-check, and build all pass

- feat-3.1: Outline View (Hierarchical collapsible outline by node type with keyboard navigation)
  - 3.1.1: Created `groupNodesByType(nodes)` utility function in `src/lib/outline.ts`
  - 3.1.2: Handles empty groups, returns groups in consistent NODE_TYPE_ORDER
  - 3.1.3: Created `<CollapsibleSection>` component with animated height transition
  - 3.1.4: Animates height using transform-based CSS transitions (200ms ease-in-out)
  - 3.1.5: Enter/Space toggle on section headers
  - 3.1.6: Respects prefers-reduced-motion media query
  - 3.1.7: Created `<OutlineView>` component with collapsible sections by node type
  - 3.1.8: Collapse state persists in localStorage via `getPersistedCollapseState()` and `persistCollapseState()`
  - 3.1.9: Full keyboard navigation: Arrow up/down, Home/End, Enter to select
  - 3.1.10: Type-ahead search - typing characters focuses first matching node title
  - 3.1.11: Quick status toggle on task nodes: pending -> in_progress -> complete cycle
  - 3.1.12: Status toggle button shows Circle/CircleDot/CheckCircle2 icons
  - 3.1.13: Created `<ViewToggle>` component to switch between Outline/Graph views
  - 3.1.14: Ctrl/Cmd+1 switches to Outline view, Ctrl/Cmd+2 switches to Graph view
  - 3.1.15: ViewToggle shows keyboard shortcut hints (⌘1, ⌘2)
  - 3.1.16: Tab-style segmented control with aria-selected states
  - 3.1.17: Added matchMedia mock to test setup for prefers-reduced-motion testing
  - 3.1.18: Wrote 56 unit tests (18 for outline utilities, 38 for outline components)
  - 3.1.19: All 892 tests passing, lint, type-check, and build all pass

- feat-3.2: Filtering System (Filter by type, tag, status with URL sync)
  - 3.2.1: Installed nuqs v2+ and configured NuqsAdapter at app root in main.tsx
  - 3.2.2: Created `useFilters` hook with URL-synced state via nuqs
  - 3.2.3: Hook manages types, tags, statuses, and search filters in URL query params
  - 3.2.4: Created `<TypeFilter>` with toggle buttons (aria-pressed) for node types
  - 3.2.5: Toggle buttons show selected state, stored in URL (?types=task,decision)
  - 3.2.6: Created `<TagFilter>` with multi-select AND logic
  - 3.2.7: Selected tags shown as removable chips, available tags as clickable buttons
  - 3.2.8: AND logic hint displayed when multiple tags selected
  - 3.2.9: Created `<StatusFilter>` with checkboxes organized by category (Task, Decision/Component)
  - 3.2.10: All statuses have colored dots and labels for accessibility
  - 3.2.11: Created `<NodeSearchInput>` with 150ms debounce via custom useDebounce hook
  - 3.2.12: Search input has clear button (X), Escape key clears, type="search" for semantics
  - 3.2.13: Created `<FilterResultsAnnouncer>` with aria-live="polite" for screen reader announcements
  - 3.2.14: Announces result counts on filter changes with 300ms debounce
  - 3.2.15: Created `<FilterResultsCount>` visual display with "Clear filters" button
  - 3.2.16: Updated `<TagCloud>` to integrate with filters - click toggles tag filter
  - 3.2.17: TagCloud shows selected tags with different styling (aria-pressed)
  - 3.2.18: Updated `<FilterSection>` in Sidebar to use all filter components
  - 3.2.19: Filters section title shows count when filters active
  - 3.2.20: filterNodes() function supports all filter combinations (type OR, tag AND, status OR, search)
  - 3.2.21: Created `src/components/filters/` directory with index.ts exports
  - 3.2.22: Updated `src/hooks/index.ts` to export useFilters hook
  - 3.2.23: Wrote 48 unit tests for filter components (TypeFilter, TagFilter, StatusFilter, NodeSearchInput, FilterResultsAnnouncer, FilterResultsCount)
  - 3.2.24: Wrote 15 unit tests for useFilters filterNodes logic
  - 3.2.25: Updated Sidebar.test.tsx and AppShell.test.tsx with NuqsTestingAdapter wrapper
  - 3.2.26: All 940 tests passing, lint, type-check, and build all pass

- feat-3.3: Sorting (Sort by type, status, modified, title, created with URL sync)
  - 3.3.1: Created `sortNodes(nodes, sortBy, direction)` utility function in `src/lib/sorting.ts`
  - 3.3.2: Implements stable sort preserving original order for equal elements
  - 3.3.3: Sort options: type, status, modified, created, title
  - 3.3.4: Type sort order: Decision > Component > Task > Note
  - 3.3.5: Status sort order: in_progress > pending > blocked > complete > considering > selected > rejected
  - 3.3.6: Created `DEFAULT_SORT` config (modified, desc) and `SORT_OPTIONS` array
  - 3.3.7: Created `<SortDropdown>` component with select and direction toggle button
  - 3.3.8: Direction toggle shows ArrowUp/ArrowDown icons with accessible labels
  - 3.3.9: Created `useSorting` hook with URL-synced state via nuqs
  - 3.3.10: Sort criteria stored in URL (?sort=title&dir=asc)
  - 3.3.11: Default values don't appear in URL (modified, desc)
  - 3.3.12: Integrated SortDropdown into Sidebar FilterSectionContent
  - 3.3.13: Updated hooks/index.ts to export useSorting hook
  - 3.3.14: Updated filters/index.ts to export SortDropdown component
  - 3.3.15: Wrote 21 unit tests for sorting utility (stable sort, all criteria, edge cases)
  - 3.3.16: Wrote 13 unit tests for useSorting hook
  - 3.3.17: Wrote 9 unit tests for SortDropdown component
  - 3.3.18: All 983 tests passing, lint, type-check, and build all pass

- feat-3.4: Drag and Drop Reordering (Manual node ordering with persistence)
  - 3.4.1: Installed @dnd-kit packages (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, @dnd-kit/modifiers)
  - 3.4.2: Created `<SortableNodeListItem>` component wrapping node items with drag functionality
  - 3.4.3: SortableNodeListItem uses useSortable hook for drag state and transform handling
  - 3.4.4: Separate drag handle (GripVertical icon) and main clickable content area
  - 3.4.5: Visual feedback during drag: shadow, ring-2, opacity-90, z-50
  - 3.4.6: Drag handle has aria-label for accessibility ("Drag to reorder {title}")
  - 3.4.7: Created `<SortableNodeList>` component with DnD context provider
  - 3.4.8: Uses PointerSensor with 5px distance activation constraint
  - 3.4.9: Uses KeyboardSensor with sortableKeyboardCoordinates for keyboard drag
  - 3.4.10: Implements closestCenter collision detection strategy
  - 3.4.11: DragOverlay renders dragged item preview
  - 3.4.12: Keyboard navigation: Arrow up/down, Home/End for list navigation
  - 3.4.13: Created `useNodeOrder` hook for managing order state with persistence
  - 3.4.14: Hook reads nodeOrder from project.metadata.nodeOrder
  - 3.4.15: orderedNodes computed property sorts nodes by stored order
  - 3.4.16: New nodes not in stored order appended at end
  - 3.4.17: reorder(newOrder) updates project metadata and auto-saves
  - 3.4.18: resetOrder() clears custom order (returns to default)
  - 3.4.19: hasCustomOrder boolean indicates if custom order exists
  - 3.4.20: Created `applyNodeOrder(nodes, order)` utility for sorting filtered nodes
  - 3.4.21: Created `reconcileNodeOrder(nodes, storedOrder)` for handling additions/deletions
  - 3.4.22: Exported new components from `src/components/nodes/index.ts`
  - 3.4.23: Exported useNodeOrder from `src/hooks/index.ts`
  - 3.4.24: Wrote 23 unit tests for SortableNodeList and SortableNodeListItem
  - 3.4.25: Wrote 19 unit tests for useNodeOrder hook and utility functions
  - 3.4.26: All 1025 tests passing, lint, type-check, and build all pass

- feat-3.5: URL-Based Navigation (Deep linking with nuqs for node selection and breadcrumbs)
  - 3.5.1: Created `useNodeNavigation` hook in `src/hooks/useNodeNavigation.ts`
  - 3.5.2: Hook syncs activeNodeId with URL query parameter (?node=id) via nuqs
  - 3.5.3: `navigateToNode(id)` function updates both URL and Zustand store
  - 3.5.4: Validates node exists before navigation (warns for non-existent nodes)
  - 3.5.5: Browser back/forward navigation works via URL sync with nuqs
  - 3.5.6: `goBack()` and `goForward()` helper functions for programmatic navigation
  - 3.5.7: `canGoBack` and `canGoForward` boolean properties
  - 3.5.8: Created `<Breadcrumbs>` component in `src/components/navigation/Breadcrumbs.tsx`
  - 3.5.9: Breadcrumbs shows Project > Node Type > Node path
  - 3.5.10: Project segment is always clickable, navigates to null (clears node)
  - 3.5.11: Node type segment shows pluralized label (Tasks, Decisions, Components, Notes)
  - 3.5.12: Type segment clickable when `onTypeClick` prop provided (for filtering)
  - 3.5.13: Current node segment has `aria-current="page"` for accessibility
  - 3.5.14: Home icon in project segment, chevron separators between segments
  - 3.5.15: Long titles truncated with CSS (max-w-[150px]/[200px])
  - 3.5.16: Created `src/components/navigation/index.ts` with clean exports
  - 3.5.17: Exported `useNodeNavigation` from `src/hooks/index.ts`
  - 3.5.18: Wrote 16 unit tests for useNodeNavigation hook
  - 3.5.19: Wrote 23 unit tests for Breadcrumbs component
  - 3.5.20: All 1064 tests passing, lint, type-check, and build all pass

- feat-3.6: List Virtualization (Virtualize node lists for performance)
  - 3.6.1: Installed @tanstack/react-virtual package
  - 3.6.2: Created `<VirtualizedNodeList>` component using useVirtualizer hook
  - 3.6.3: Virtualizer renders only visible items plus overscan buffer (5 items)
  - 3.6.4: Estimated item height of 44px for smooth scrolling
  - 3.6.5: Full keyboard navigation support (Arrow Up/Down, Home/End, Enter)
  - 3.6.6: Active node automatically scrolled into view when changed
  - 3.6.7: Focus state maintained across virtual renders using data-node-id attribute
  - 3.6.8: Container uses `contain: strict` for layout isolation performance
  - 3.6.9: Created `<AutoNodeList>` component that auto-switches based on count
  - 3.6.10: VIRTUALIZATION_THRESHOLD constant set to 50 items
  - 3.6.11: AutoNodeList uses regular NodeList for <=50 items, VirtualizedNodeList for >50
  - 3.6.12: `forceVirtualized` prop available to always use virtualization
  - 3.6.13: Empty state rendering supported with onCreateNode callback
  - 3.6.14: Updated NodeListItem to accept additional HTML attributes via spread
  - 3.6.15: Exported VirtualizedNodeList, AutoNodeList, VIRTUALIZATION_THRESHOLD from index
  - 3.6.16: Wrote 28 unit tests covering rendering, keyboard nav, performance
  - 3.6.17: Performance tests verify 200+ nodes render in <500ms
  - 3.6.18: All 1092 tests passing, lint, type-check, and build all pass

## Current Focus
_Sprint 3 complete - All tasks 3.1-3.6 implemented_

## Blockers
_None_

## Notes
Sprint 3 is now complete! Task 3.6 (List Virtualization) is the final task.

Task 3.6 (List Virtualization) is complete:
- Installed @tanstack/react-virtual for efficient windowing
- VirtualizedNodeList only renders visible items + overscan buffer
- AutoNodeList auto-switches: regular for <=50, virtualized for >50 items
- Full keyboard navigation preserved (Arrow keys, Home/End, Enter)
- Active node auto-scrolled into view on selection changes
- Performance verified: 200+ nodes render without frame drops (<500ms)
- 28 new unit tests (1092 total tests passing)
- All verification checks pass: lint, type-check, test, build

Files created:
- src/components/nodes/VirtualizedNodeList.tsx - Virtualized list component
- src/components/nodes/AutoNodeList.tsx - Auto-switching wrapper
- src/components/nodes/virtualization.test.tsx - 28 unit tests

Files modified:
- src/components/nodes/NodeListItem.tsx - Accept additional HTML attributes
- src/components/nodes/index.ts - Export virtualization components
- package.json - Added @tanstack/react-virtual

---

Task 3.5 (URL-Based Navigation) is complete:
- useNodeNavigation hook syncs activeNodeId with URL (?node=id) via nuqs
- Browser back/forward navigation works automatically through URL sync
- Breadcrumbs component shows Project > Node Type > Node navigation path
- Project segment always clickable (navigates to project root)
- Type segment optionally clickable (for filtering integration)
- Current node marked with aria-current="page" for accessibility
- 39 new unit tests (1064 total tests passing)
- All verification checks pass: lint, type-check, test, build

Files created:
- src/hooks/useNodeNavigation.ts - URL-synced node navigation hook
- src/hooks/useNodeNavigation.test.tsx - 16 unit tests
- src/components/navigation/Breadcrumbs.tsx - Breadcrumbs navigation component
- src/components/navigation/index.ts - Clean exports
- src/components/navigation/navigation.test.tsx - 23 unit tests

Files modified:
- src/hooks/index.ts - Added useNodeNavigation export

Task 3.4 (Drag and Drop Reordering) is complete:
- Installed @dnd-kit packages for drag and drop functionality
- SortableNodeListItem with drag handle and visual feedback during drag
- SortableNodeList with DnD context, keyboard support, and drag overlay
- useNodeOrder hook persists custom order to project.metadata.nodeOrder
- Order survives reload (stored in project metadata)
- New nodes appended to end of custom order
- Deleted nodes automatically removed from stored order
- applyNodeOrder() and reconcileNodeOrder() utility functions for advanced use cases
- 42 new unit tests (1025 total tests passing)
- All verification checks pass: lint, type-check, test, build

Files created:
- src/components/nodes/SortableNodeListItem.tsx - Draggable node item with handle
- src/components/nodes/SortableNodeList.tsx - DnD context wrapper with keyboard navigation
- src/hooks/useNodeOrder.ts - Order management hook with persistence
- src/hooks/useNodeOrder.test.ts - 19 unit tests
- src/components/nodes/sortable.test.tsx - 23 unit tests

Files modified:
- src/components/nodes/index.ts - Added exports for sortable components
- src/hooks/index.ts - Added exports for useNodeOrder hook
- package.json - Added @dnd-kit dependencies

Task 3.2 (Filtering System) is complete:
- URL-synced filter state using nuqs v2 (?types=task&tags=electronics&statuses=pending&q=motor)
- TypeFilter with toggle buttons for all node types
- TagFilter with multi-select AND logic (node must have ALL selected tags)
- StatusFilter with checkboxes organized by category
- NodeSearchInput with 150ms debounce and clear button
- aria-live announcements for screen readers
- TagCloud integration - click adds/removes tags from filter
- FilterResultsCount with "Clear filters" button
- 48 new filter component tests + 15 filter logic tests (940 total tests passing)
- All verification checks pass: lint, type-check, test, build

Files created:
- src/hooks/useFilters.ts - URL-synced filter state hook
- src/hooks/useFilters.test.ts - 15 unit tests for filter logic
- src/components/filters/TypeFilter.tsx - Toggle buttons for node types
- src/components/filters/TagFilter.tsx - Multi-select tag chips
- src/components/filters/StatusFilter.tsx - Checkbox filter with categories
- src/components/filters/NodeSearchInput.tsx - Debounced search input
- src/components/filters/FilterResultsAnnouncer.tsx - aria-live + visual count
- src/components/filters/index.ts - Clean exports
- src/components/filters/filters.test.tsx - 48 unit tests

Files modified:
- src/main.tsx - Added NuqsAdapter provider
- src/hooks/index.ts - Added useFilters export
- src/components/layout/Sidebar.tsx - Integrated filter components
- src/components/layout/Sidebar.test.tsx - Added NuqsTestingAdapter wrapper
- src/components/layout/AppShell.test.tsx - Added NuqsTestingAdapter wrapper

Task 3.3 (Sorting) is complete:
- sortNodes utility with stable sort (preserves order for equal elements)
- Sort options: Type, Status, Modified, Created, Title
- SortDropdown component with select and direction toggle
- URL-synced sort state via nuqs (?sort=title&dir=asc)
- Default (modified desc) not shown in URL
- 21 sorting utility tests + 13 useSorting tests + 9 SortDropdown tests
- All verification checks pass: lint, type-check, test, build

Files created:
- src/lib/sorting.ts - sortNodes, SORT_OPTIONS, DEFAULT_SORT
- src/lib/sorting.test.ts - 21 unit tests
- src/hooks/useSorting.ts - URL-synced sorting state hook
- src/hooks/useSorting.test.tsx - 13 unit tests
- src/components/filters/SortDropdown.tsx - Sort dropdown component

Files modified:
- src/hooks/index.ts - Added useSorting export
- src/components/filters/index.ts - Added SortDropdown export
- src/components/layout/Sidebar.tsx - Integrated SortDropdown
- src/components/filters/filters.test.tsx - Added 9 SortDropdown tests

Task 3.1 (Outline View) is complete:
- OutlineView with collapsible sections by node type (Tasks, Decisions, Components, Notes)
- CollapsibleSection with animated height transitions (respects prefers-reduced-motion)
- Collapse state persists in localStorage
- Full keyboard navigation: Arrow up/down, Home/End, Enter, type-ahead
- Quick status toggle for task nodes: pending -> in_progress -> complete
- ViewToggle component with Ctrl+1/Ctrl+2 keyboard shortcuts
- 56 new unit tests (892 total tests passing)
- All verification checks pass: lint, type-check, test, build

Files created:
- src/lib/outline.ts - groupNodesByType, localStorage persistence utilities
- src/lib/outline.test.ts - 18 unit tests
- src/components/outline/CollapsibleSection.tsx - Animated collapsible section
- src/components/outline/OutlineView.tsx - Main outline view component
- src/components/outline/ViewToggle.tsx - View mode toggle component
- src/components/outline/index.ts - Clean exports
- src/components/outline/outline.test.tsx - 38 unit tests

Sprint 2 is complete with all 8 tasks implemented:
- 2.1: Nodes Store (Zustand store for node CRUD)
- 2.2: Undo/Redo System (Action history with Ctrl+Z/Y)
- 2.3: Sidebar Navigation (Quick create, tag cloud)
- 2.4: Node List View (Icons, badges, keyboard nav)
- 2.5: Markdown Editor (CodeMirror with syntax highlighting)
- 2.6: Node Detail Panel (Slide-out panel with frontmatter fields)
- 2.7: Node Creation Dialog (Type selector, templates)
- 2.8: Node Deletion & Auto-Save (Delete confirmation, auto-save)
