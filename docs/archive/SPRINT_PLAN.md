# Forge — Sprint Plan & Task Breakdown

> A personal project brainstorming, planning, and tracking tool for complex hardware and engineering projects.

This document breaks down the Forge project into atomic, testable tasks organized into sprints. Each sprint delivers a demoable piece of working software.

---

## Sprint Overview

| Sprint | Goal | Demo |
|--------|------|------|
| 0 | Project Infrastructure | Dev server, CI pipeline, base layout |
| 1 | Data Model & File System | Load project folder, display parsed nodes |
| 2 | Node CRUD & Editor | Create/edit/delete nodes, markdown editing |
| 3 | Outline View & Navigation | Hierarchical browsing, filtering, search |
| 4 | Wiki-Links & Backlinks | `[[links]]` with autocomplete, backlinks panel |
| 5 | Graph View | Interactive node graph with pan/zoom |
| 6 | Dependencies & Critical Path | DAG blocking, critical path highlighting |
| 7 | Decision Tools | Comparison tables, scoring, selection |
| 8 | Import/Export | JSON, Markdown, CSV export/import |
| 9 | Command Palette & Search | Quick actions, full-text search |
| 10 | Polish & Accessibility | A11y audit, dark mode, performance |
| 11 | Workspace & Git | Multi-project management, git integration |

---

## Sprint 0: Project Infrastructure & Tooling

**Goal:** Establish development environment with CI/CD, testing, and core tooling.
**Demo:** Running dev server with base layout, all CI checks passing.

### Tasks

#### 0.1 Initialize React + TypeScript Project
- Initialize Vite + React 18 + TypeScript project
- Configure `tsconfig.json` with strict mode enabled
- Set up path aliases (`@/components`, `@/lib`, `@/types`, etc.)
- **Test:** `npm run build` succeeds with zero errors

#### 0.2 Configure Tailwind CSS
- Install and configure Tailwind CSS v3+
- Set up `tailwind.config.ts` with content paths
- Install `tailwindcss-animate` for entrance animations
- Create `cn()` utility function (clsx + tailwind-merge)
- **Test:** Unit test `cn()` merging conflicting classes correctly

#### 0.3 Set Up Testing Infrastructure
- Install Vitest + React Testing Library + jsdom
- Configure test setup file with RTL matchers
- Add coverage reporting (target: 80%+)
- Create smoke test (App renders without crash)
- **Test:** `npm test` runs and all tests pass

#### 0.4a Configure ESLint
- Install ESLint with React and TypeScript plugins
- Add `eslint-plugin-jsx-a11y` for accessibility linting
- Configure rules for hooks, exhaustive deps
- **Test:** `npm run lint` passes on clean project

#### 0.4b Configure Prettier & Pre-commit
- Install Prettier with Tailwind class sorting plugin
- Set up Husky + lint-staged for pre-commit hooks
- Configure format-on-save in VSCode settings
- **Test:** Pre-commit hook runs lint and format

#### 0.5 Set Up CI Pipeline
- Create GitHub Actions workflow (`.github/workflows/ci.yml`)
- Run lint, type-check, test, build on every PR
- Cache node_modules for faster runs
- **Test:** PR triggers CI, all checks pass

#### 0.6 Create Base Layout Shell
- Create `<AppShell>` with sidebar + main content areas
- Implement skip link to main content (a11y)
- Use `h-dvh` for full-height layout (not `h-screen`)
- Add semantic landmarks: `<nav>`, `<main>`, `<aside>`
- **Test:** Skip link receives focus on Tab, activates with Enter

#### 0.7 Configure Base UI
- Install `@base-ui-components/react` (pin specific version)
- Create styling wrapper for Base UI components
- Document usage patterns in code
- **Test:** Render a Base UI Dialog component

#### 0.8 Set Up Zustand Store Skeleton
- Install Zustand
- Create root store with devtools middleware
- Set up typed store patterns
- **Test:** Store initializes, devtools shows state

#### 0.9 Create Error Boundary Component
- Create `<ErrorBoundary>` with fallback UI
- Log errors to console
- Wrap major app sections (sidebar, main, editor)
- **Test:** Catches render errors, displays fallback

#### 0.10 Create Toast Notification System
- Create `<ToastProvider>` context
- Create `useToast()` hook
- Support success, error, info, undo variants
- Auto-dismiss with configurable duration
- **Test:** Toast appears, auto-dismisses after timeout

#### 0.11 Configure Environment Variables
- Create `.env.example` with documented variables
- Set up Vite env variable handling (`import.meta.env`)
- Create `config.ts` for typed config access
- **Test:** Config loads correctly in dev and build

#### 0.12 Create Debug Logging Utility
- Create `debug()` utility with namespaces (`debug('fs')`, `debug('store')`)
- Enable via `localStorage.setItem('debug', '*')`
- Log state changes and file operations
- **Test:** Logging toggleable via localStorage

#### 0.13 Define Z-Index Scale
- Create `z-index.ts` with constants:
  - `Z_DROPDOWN = 10`
  - `Z_STICKY = 20`
  - `Z_MODAL = 30`
  - `Z_POPOVER = 40`
  - `Z_TOAST = 50`
- Use throughout app, never arbitrary z-[999]
- **Validation:** Code convention documented

#### 0.14 Create Date Formatting Utilities
- Create `formatDate()` using `Intl.DateTimeFormat`
- Create `formatRelativeTime()` for "2 hours ago"
- Support user locale detection
- **Test:** Formats dates correctly

---

## Sprint 1: Data Model & File System Foundation

**Goal:** Define TypeScript types, implement file parsing/serialization, create file system abstraction.
**Demo:** Load sample project folder, display parsed nodes as JSON in UI.

### Tasks

#### 1.1a Define NodeType Enum
- Create `NodeType` enum: `decision`, `component`, `task`, `note`
- Export from `@/types/nodes.ts`
- **Test:** Enum values accessible

#### 1.1b Define BaseNode Interface
- Define `BaseNode` interface:
  - `id: string`
  - `type: NodeType`
  - `title: string`
  - `tags: string[]`
  - `created: Date`
  - `modified: Date`
  - `content: string` (markdown body)
- **Test:** Type compiles correctly

#### 1.1c Define DecisionNode Type
- Extend `BaseNode` with:
  - `status: 'pending' | 'selected'`
  - `selected: string | null` (selected option ID)
  - `options: DecisionOption[]`
  - `criteria: Criterion[]`
- Create `isDecisionNode()` type guard
- **Test:** Type guard correctly identifies DecisionNode

#### 1.1d Define ComponentNode Type
- Extend `BaseNode` with:
  - `status: 'selected' | 'considering' | 'rejected'`
  - `cost: number | null`
  - `supplier: string | null`
  - `partNumber: string | null`
  - `customFields: Record<string, string | number>`
- Create `isComponentNode()` type guard
- **Test:** Type guard correctly identifies ComponentNode

#### 1.1e Define TaskNode Type
- Extend `BaseNode` with:
  - `status: 'pending' | 'in_progress' | 'blocked' | 'complete'`
  - `priority: 'high' | 'medium' | 'low'`
  - `dependsOn: string[]` (node IDs)
  - `blocks: string[]` (node IDs)
  - `checklist: ChecklistItem[]`
- Create `isTaskNode()` type guard
- **Test:** Type guard correctly identifies TaskNode

#### 1.1f Define NoteNode Type & Union
- Extend `BaseNode` (minimal additions)
- Create `isNoteNode()` type guard
- Create discriminated union: `ForgeNode = DecisionNode | ComponentNode | TaskNode | NoteNode`
- **Test:** Discriminated union narrows correctly

#### 1.2 Define Project & Workspace Types
- Define `Project` interface:
  - `id: string`
  - `name: string`
  - `path: string`
  - `nodes: Map<string, ForgeNode>`
  - `metadata: ProjectMetadata`
- Define `Workspace` interface:
  - `projects: Project[]`
  - `activeProjectId: string | null`
  - `config: WorkspaceConfig`
- Define `WorkspaceConfig` interface
- **Test:** Types instantiate correctly

#### 1.3 Implement YAML Frontmatter Parser
- Install `gray-matter` (with safe YAML config)
- Create `parseFrontmatter(content: string): FrontmatterResult`
- Handle: no frontmatter, malformed YAML, empty file
- Return `{ data, content, error }` shape
- **Test:** Parse all four node type samples correctly

#### 1.4 Create Runtime Type Validators
- Install `zod` for runtime validation
- Create schema for each node type frontmatter
- Create `validateNode(data: unknown): Result<ForgeNode, ValidationError>`
- Return detailed error messages for invalid data
- **Test:** Invalid frontmatter returns descriptive error

#### 1.5 Implement YAML Frontmatter Serializer
- Create `serializeFrontmatter(node: ForgeNode): string`
- Preserve field ordering (type first, then status)
- Handle custom_fields serialization
- **Test:** Round-trip parse → serialize → parse produces identical data

#### 1.6 Implement Markdown Body Parser
- Create `parseMarkdownBody(content: string): MarkdownBody`
- Extract title from first `# heading`
- Preserve raw markdown content
- **Test:** Extract title from sample files

#### 1.7 Implement Wiki-Link Extractor
- Create `extractWikiLinks(markdown: string): string[]`
- Regex: `/\[\[([^\]]+)\]\]/g`
- Ignore links inside code blocks and inline code
- **Test:** Extract links, ignore false positives in code

#### 1.8 Create File System Abstraction Layer
- Define `FileSystemAdapter` interface:
  - `readFile(path: string): Promise<string>`
  - `writeFile(path: string, content: string): Promise<void>`
  - `listDirectory(path: string): Promise<FileEntry[]>`
  - `exists(path: string): Promise<boolean>`
  - `mkdir(path: string): Promise<void>`
  - `watch(path: string, callback: WatchCallback): Unsubscribe`
- Create `MemoryFileSystemAdapter` for tests
- **Test:** Memory adapter CRUD operations work

#### 1.9a Implement Browser File System Adapter
- Create `BrowserFileSystemAdapter` using File System Access API
- Handle permission requests with user prompt
- Cache directory handles for performance
- **Test:** Unit test with mocked API

#### 1.9b Create Fallback File Input Adapter
- Create fallback using `<input type="file" webkitdirectory>`
- For Firefox/Safari support
- Same interface as BrowserFileSystemAdapter
- **Test:** Fallback works in non-Chromium browsers

#### 1.10 Create Project Loader
- Create `loadProject(adapter, path): Promise<Project>`
- Scan directory structure: `decisions/`, `components/`, `tasks/`, `notes/`
- Parse all `.md` files in subdirectories
- Build nodes Map with correct types
- **Test:** Load mock project, verify node count and types

#### 1.11 Create Project Saver
- Create `saveNode(adapter, projectPath, node): Promise<void>`
- Determine subdirectory from node type
- Generate filename via slugify
- Write frontmatter + markdown content
- **Test:** Save node, read back, verify equality

#### 1.12 Implement File Watcher
- Add `watch()` method to adapter
- Detect external file additions/modifications/deletions
- Debounce rapid changes (100ms)
- Trigger callback with change type and path
- **Test:** External file change triggers callback

#### 1.13 Create Sample Project Fixture
- Create `fixtures/sample-project/` with all four node types
- Include realistic data matching spec examples
- At least 2 nodes of each type
- Include cross-node links
- **Validation:** Files match spec format exactly

#### 1.14 Build Debug View Component
- Create `<DebugProjectView>` showing raw JSON
- Display node count by type
- Show parse errors if any
- Collapsible sections per node type
- **Test:** Renders loaded project data correctly

---

## Sprint 2: Node CRUD & Basic Editor

**Goal:** Create, read, update, delete nodes through UI with markdown editing.
**Demo:** Create a new Task node, edit content, see it persist and reload.

### Tasks

#### 2.1 Create Zustand Nodes Store
- Create `useNodesStore` with state:
  - `nodes: Map<string, ForgeNode>`
  - `activeNodeId: string | null`
- Add actions: `addNode`, `updateNode`, `deleteNode`, `setActiveNode`
- Add selectors: `getNodeById`, `getNodesByType`, `getAllNodes`
- **Test:** All CRUD operations update state correctly

#### 2.2 Create Zustand Project Store
- Create `useProjectStore` with state:
  - `project: Project | null`
  - `isDirty: boolean`
  - `isLoading: boolean`
  - `error: Error | null`
- Add actions: `loadProject`, `saveProject`, `setDirty`
- Integrate with file system adapter
- **Test:** Load/save project updates store state

#### 2.3 Implement Undo/Redo System
- Create undo stack with action history
- Zustand middleware for action recording
- Support: node create, update, delete
- `Ctrl/Cmd+Z` triggers undo, `Ctrl/Cmd+Shift+Z` redo
- **Test:** Undo reverses last action, redo re-applies

#### 2.4 Implement Node ID Generation
- Create `generateNodeId(title: string, type: NodeType): string`
- Slugify title (lowercase, hyphens, no special chars)
- Ensure uniqueness with numeric suffix if needed
- **Test:** Generates valid, unique IDs for duplicate titles

#### 2.5 Create Sidebar Structure
- Create `<Sidebar>` component with sections:
  - Project switcher (placeholder)
  - Quick create buttons
  - Node type filters
  - Tag cloud
- Collapsible on mobile
- **Test:** All sections render

#### 2.6 Create Node List Component
- Create `<NodeList>` displaying all nodes as list items
- Show: node type icon, title, status badge
- Highlight active node
- Keyboard navigable (arrow keys, Enter to select)
- **Test:** Renders nodes, keyboard navigation works

#### 2.7 Create Node Type Icon Component
- Create `<NodeTypeIcon type={NodeType}>` component
- Install `lucide-react` for icons
- Decision: `GitBranch`, Component: `Box`, Task: `CheckSquare`, Note: `FileText`
- Include `aria-hidden="true"` (decorative)
- **Test:** Renders correct icon for each type

#### 2.8 Create Status Badge Component
- Create `<StatusBadge status={string} type={NodeType}>`
- Color + text (not color-only for a11y):
  - pending: yellow + "Pending"
  - in_progress: blue + "In Progress"
  - blocked: red + "Blocked"
  - complete: green + "Complete"
  - selected: green + "Selected"
- **Test:** Renders correct color + text for each status

#### 2.9 Create Node Detail Panel Shell
- Create `<NodeDetailPanel nodeId={string}>`
- Slide-out panel or split view layout
- Close button with keyboard support (Escape key)
- `overscroll-behavior: contain` to prevent scroll bleed
- Focus trap when open
- **Test:** Opens/closes, focus trapped

#### 2.10a Set Up CodeMirror Editor
- Install `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`
- Install `@uiw/react-codemirror` for React bindings
- Create `<MarkdownEditor>` wrapper component
- Set up extension architecture for future plugins
- **Test:** Editor renders, value changes trigger onChange

#### 2.10b Add Markdown Syntax Highlighting
- Add markdown language extension
- Configure theme to match app
- Support code blocks, headings, bold, italic, links
- **Test:** Markdown syntax highlighted correctly

#### 2.11 Create Node Title Editor
- Create `<NodeTitleEditor>` with large heading input
- Auto-focus on new node creation
- Validate non-empty
- **Test:** Title updates propagate to store

#### 2.12a Create Status Dropdown Component
- Create `<StatusSelect>` using Base UI Select
- Options based on node type
- Keyboard accessible
- **Test:** Selection updates store

#### 2.12b Create Tags Multi-Select Component
- Create `<TagInput>` with autocomplete from existing tags
- Add new tags inline by typing and Enter
- Remove tags with X button or backspace
- **Test:** Tags add/remove correctly

#### 2.12c Create Priority Selector Component
- Create `<PrioritySelector>` as segmented control
- Options: High, Medium, Low
- Keyboard accessible (arrow keys)
- **Test:** Priority updates store

#### 2.12d Compose Frontmatter Editor
- Create `<FrontmatterEditor node={ForgeNode}>`
- Render appropriate fields based on node type
- Use components from 2.12a-c
- **Test:** Correct fields shown per type

#### 2.13 Create Decision-Specific Fields
- Add `selected` option dropdown
- Display current status (pending/selected)
- Link to comparison table (stub for Sprint 7)
- **Test:** Selection updates node correctly

#### 2.14 Create Component-Specific Fields
- Cost input (number, formatted with `tabular-nums`)
- Supplier text input
- Part number input
- Custom fields key-value editor
- **Test:** All fields persist correctly

#### 2.15 Create Task-Specific Fields
- Priority selector (from 2.12c)
- Depends-on multi-select (other node titles)
- Blocks display (derived, read-only)
- **Test:** Dependencies save correctly

#### 2.16 Implement Checklist Parser
- Parse `- [ ]` and `- [x]` syntax from markdown
- Return `ChecklistItem[]` array
- **Test:** Parses mixed checked/unchecked items

#### 2.17 Create Checklist Editor Component
- Create `<ChecklistEditor>` with toggleable items
- Space to toggle, Enter to add new item
- Delete item with backspace on empty
- **Test:** Toggle updates markdown, keyboard works

#### 2.18 Create "New Node" Dialog
- Create `<CreateNodeDialog>` using Base UI Dialog
- Type selector (4 buttons with icons)
- Title input with validation
- Template dropdown (stub for Sprint 7)
- **Test:** Creates node of correct type with title

#### 2.19 Create Quick Create Buttons
- Add buttons to sidebar: + Decision, + Component, + Task, + Note
- Open CreateNodeDialog with type pre-selected
- Keyboard shortcut: `Ctrl+Shift+N`
- **Test:** Buttons create correct node types

#### 2.20 Implement Delete Node with Confirmation
- Create `<DeleteNodeDialog>` using Base UI AlertDialog
- Show node title and type
- Warn about incoming links that will break
- Show undo toast after deletion
- **Test:** Deletion removes node, undo restores it

#### 2.21 Implement Auto-Save with Dirty Tracking
- Track dirty state per node
- Debounced auto-save (2 second delay after last change)
- Show "Saving…" indicator during save
- **Test:** Changes trigger single save after debounce

#### 2.22 Implement Unsaved Changes Warning
- Add `beforeunload` handler when dirty
- Show warning dialog on internal navigation
- **Test:** Warning appears when navigating with unsaved changes

#### 2.23 Create Empty State for No Nodes
- Create `<EmptyState>` component
- Single clear CTA: "Create Your First Node"
- Illustration or icon
- **Test:** Renders when nodes array empty

---

## Sprint 3: Outline View & Navigation

**Goal:** Hierarchical outline view with filtering, sorting, and keyboard navigation.
**Demo:** Browse project in outline, filter by type/tag, collapse/expand sections.

### Tasks

#### 3.1 Create Outline View Container
- Create `<OutlineView>` as main view component
- Collapsible sections by node type
- Persist collapse state in localStorage
- **Test:** Sections expand/collapse, state persists

#### 3.2 Implement Node Grouping Logic
- Create `groupNodesByType(nodes: ForgeNode[]): Record<NodeType, ForgeNode[]>`
- Handle empty groups
- **Test:** Groups correctly with mixed node types

#### 3.3 Create Collapsible Section Component
- Create `<CollapsibleSection title count>` using Base UI Collapsible
- Animate height with `motion/react` (transform/opacity only)
- Keyboard: Enter/Space to toggle
- **Test:** Expand/collapse with animation, respects reduced-motion

#### 3.4 Install and Configure nuqs
- Install `nuqs` v2+
- Configure `NuqsAdapter` at app root
- Create typed param parsers
- **Test:** URL params sync with state

#### 3.5 Implement Type Filter
- Create `<TypeFilter>` with toggle buttons per type
- Store filter state in URL via nuqs
- **Test:** Filtering updates URL and displayed nodes

#### 3.6 Implement Tag Filter
- Create `<TagFilter>` showing all unique tags
- Multi-select with AND logic
- Store in URL params
- **Test:** Tag filtering works with multiple tags

#### 3.7 Implement Status Filter
- Create `<StatusFilter>` for node statuses
- Checkboxes for each status value
- Store in URL
- **Test:** Status filter shows/hides correctly

#### 3.8 Implement Sort Options
- Create `<SortDropdown>` with options:
  - Type, Status, Modified, Title, Created
- Ascending/descending toggle
- Store in URL
- **Test:** Sorting changes node order

#### 3.9 Create Sort Implementation
- Create `sortNodes(nodes, sortBy, direction): ForgeNode[]`
- Handle each sort type correctly
- Stable sort to preserve order of equal items
- **Test:** Sorts correctly for each option

#### 3.10 Implement Keyboard Navigation in Outline
- Arrow up/down moves focus between nodes
- Enter opens node detail
- Home/End jump to first/last
- Type-ahead search (type letter to jump)
- **Test:** Keyboard navigation cycles correctly

#### 3.11 Create Search/Filter Input
- Create `<NodeSearchInput>` with search icon
- Filter nodes by title match (case-insensitive)
- Debounced input (150ms)
- Clear button
- `aria-live="polite"` announcement for result count
- **Test:** Search filters list, announces count

#### 3.12 Implement Quick Status Toggle
- Add inline status toggle button on task nodes in list
- Single click cycles: pending → in_progress → complete
- Skip blocked (system-managed)
- Keyboard: Enter or Space on focused toggle
- **Test:** Status updates on click/keypress

#### 3.13 Create Tag Cloud Component
- Create `<TagCloud>` showing all tags with counts
- Click tag to add to filter
- Visual weight by frequency (font-size or opacity)
- **Test:** Displays tags with correct counts, click filters

#### 3.14a Set Up DnD Kit
- Install `@dnd-kit/core` and `@dnd-kit/sortable`
- Create DnD context provider
- **Test:** Provider mounts without error

#### 3.14b Implement Outline Drag-and-Drop
- Make node list items draggable
- Visual feedback during drag (opacity, placeholder)
- Disable text selection during drag
- **Test:** Items can be dragged within section

#### 3.14c Persist Custom Order
- Save custom order to project metadata
- Load order on mount
- Fall back to default sort if no custom order
- **Test:** Custom order persists after reload

#### 3.15 Create Breadcrumb Navigation
- Create `<Breadcrumbs>` showing: Project > Node Type > Node
- Each segment clickable for navigation
- Use `<nav aria-label="Breadcrumb">`
- **Test:** Navigation works at each level

#### 3.16 Implement URL-Based Node Selection
- Sync active node ID to URL (`?node=stepper-motor-choice`)
- Deep-linking support (load URL, select node)
- Browser back/forward works
- **Test:** URL changes update active node, direct URL works

#### 3.17 Create View Toggle (Outline/Graph)
- Create `<ViewToggle>` button group
- Persist view preference in localStorage
- Keyboard shortcuts: `Ctrl+1` outline, `Ctrl+2` graph
- **Test:** Toggle switches view, shortcut works

#### 3.18 Implement List Virtualization
- Install `@tanstack/react-virtual` (virtua)
- Apply to NodeList for >50 items
- Maintain keyboard navigation with virtualization
- **Test:** 200+ nodes render without frame drops

---

## Sprint 4: Wiki-Links & Backlinks

**Goal:** Full wiki-link support with autocomplete, navigation, and backlinks.
**Demo:** Type `[[`, see suggestions, click link to navigate, view backlinks panel.

### Tasks

#### 4.1 Create Link Index
- Create `buildLinkIndex(nodes): LinkIndex`
- Index outgoing links per node
- Index incoming links (backlinks) per node
- Return: `{ outgoing: Map<nodeId, nodeId[]>, incoming: Map<nodeId, nodeId[]> }`
- **Test:** Index maps both directions correctly

#### 4.2 Add Link Index to Store
- Add `linkIndex` to nodes store
- Rebuild index on node add/update/delete
- Memoize with `useMemo` for performance
- **Test:** Index updates when nodes change

#### 4.3 Create Wiki-Link Autocomplete Provider
- Create CodeMirror autocomplete source
- Filter nodes by typed text after `[[`
- Return node title + type icon
- Sort by relevance (title match quality)
- **Test:** Returns filtered suggestions

#### 4.4 Integrate Autocomplete into Editor
- Add CodeMirror autocomplete extension
- Trigger on `[[` characters
- Insert `[[selected-node]]` on selection with Enter
- Dismiss on Escape
- **Test:** Autocomplete triggers, inserts, dismisses

#### 4.5 Create Clickable Wiki-Links in Editor
- Add CodeMirror decoration for `[[links]]`
- Style: underline, pointer cursor
- `Cmd/Ctrl+Click` to navigate to linked node
- **Test:** Click navigates to linked node

#### 4.6 Create Wiki-Link Preview on Hover
- Show tooltip with: node title, type badge, first 100 chars
- Use Base UI Tooltip
- Delay 300ms before showing
- **Test:** Hover shows preview, dismiss on mouse leave

#### 4.7 Create Backlinks Panel
- Create `<BacklinksPanel nodeId={string}>`
- List all nodes that link to current node
- Show link context (surrounding text snippet)
- Click to navigate
- **Test:** Displays correct backlinks with context

#### 4.8 Implement Link Validation
- Detect broken links (link to non-existent node)
- Style broken links: red color, dashed underline
- Show warning count badge in editor toolbar
- **Test:** Broken links detected and styled

#### 4.9 Create "Create Linked Node" Action
- When `[[New Node Name]]` doesn't exist
- Show inline "Create?" link
- Click creates node with that title (prompt for type)
- **Test:** Creates node with correct title

#### 4.10 Implement Link Renaming
- When node title changes
- Detect all nodes that link to it
- Offer to update all links (dialog with count)
- Batch update with single save operation
- **Test:** Rename updates all references

#### 4.11 Implement Auto-Link Suggestions
- Scan editor content for exact node title mentions
- Highlight with subtle underline
- Click or keyboard shortcut to convert to `[[link]]`
- **Test:** Detects mentions, converts on action

#### 4.12 Create Related Nodes Section
- Create `<RelatedNodes nodeId={string}>`
- Show: linked nodes (outgoing) + backlinks (incoming)
- Group by relationship type
- **Test:** Shows all related nodes correctly

#### 4.13 Add aria-live Announcements
- Announce "Link inserted: Node Title"
- Announce "Navigating to: Node Title"
- Announce autocomplete result count
- **Test:** Screen reader announcements fire

---

## Sprint 5: Graph View Foundation

**Goal:** Interactive graph visualization with nodes and edges.
**Demo:** View project as graph, pan/zoom, click nodes, see link connections.

### Tasks

#### 5.1 Set Up React Flow
- Install `reactflow`
- Create `<GraphView>` container component
- Configure with: controls, minimap (off initially), grid background
- **Test:** Renders empty graph without errors

#### 5.2 Create Custom Node Component
- Create `<GraphNode>` as custom React Flow node
- Display: title, type icon, status badge
- Min 44×44px touch target
- **Test:** Renders with correct content

#### 5.3 Implement Node Type Styling
- Different background colors per type:
  - Decision: blue-100/blue-500
  - Component: green-100/green-500
  - Task: orange-100/orange-500
  - Note: gray-100/gray-500
- Use Tailwind color tokens
- **Test:** Correct colors applied per type

#### 5.4 Create Graph Data Transformer
- Create `nodesToGraphData(nodes, linkIndex): { nodes, edges }`
- Return React Flow node and edge arrays
- Calculate initial positions (grid layout, 200px spacing)
- **Test:** Transforms correctly with edges

#### 5.5a Implement Edge Types
- Create custom edge for dependencies (solid line, arrow marker)
- Create custom edge for references (dashed line, circle marker)
- **Test:** Correct edge type rendered

#### 5.5b Style Edges
- Dependency edges: blue color
- Reference edges: gray color
- Selected edge: thicker stroke
- **Test:** Edge styles match design

#### 5.6 Implement Node Selection
- Click node to select (update `activeNodeId` in store)
- Visual selection state (ring border)
- Sync with outline view selection
- Click empty space to deselect
- **Test:** Selection syncs between views

#### 5.7 Implement Node Positioning Persistence
- Store positions in `project.json` under `layout.graph`
- Save position on drag end (debounced)
- Load positions on graph mount
- **Test:** Positions persist across reload

#### 5.8a Create Layout Algorithm
- Install `elkjs` for layout calculations
- Create `calculateLayout(nodes, edges): PositionMap`
- Use layered/hierarchical layout for DAG
- **Test:** Returns valid positions respecting DAG

#### 5.8b Add Auto-Layout UI
- "Reset Layout" button in graph toolbar
- Apply calculated positions with animation
- **Test:** Button repositions nodes logically

#### 5.9 Add Pan and Zoom Controls
- Enable mouse wheel zoom
- Enable click-drag pan
- Zoom controls UI (+/−/fit buttons)
- Fit-to-view button centers all nodes
- **Test:** Pan/zoom works smoothly

#### 5.10 Implement Graph Filtering
- Connect to same filters as outline view (type, tag, status)
- Hide/show nodes based on filters
- Fade out (not remove) filtered edges
- **Test:** Filters work in graph view

#### 5.11 Add Minimap
- Enable React Flow minimap
- Style to match theme
- Click minimap to navigate
- Toggle minimap visibility
- **Test:** Minimap reflects graph state

#### 5.12 Implement Keyboard Navigation (Graph)
- Tab to focus graph container
- Arrow keys move between connected nodes
- Enter opens node detail panel
- Escape deselects
- **Test:** Keyboard navigation works

#### 5.13 Add Screen Reader Support for Graph
- `aria-label` on graph container describing content
- Announce node title and connections on focus
- Provide accessible alternative (outline view)
- **Test:** VoiceOver/NVDA can navigate

#### 5.14 Respect prefers-reduced-motion
- Detect media query preference
- Disable/reduce pan/zoom animations
- Instant position changes instead of animated
- **Test:** Animations disabled when preference set

#### 5.15 Create Node Context Menu
- Right-click or long-press shows menu
- Options: Edit, Delete, View in Outline, Add Link From, Add Link To
- Keyboard: `Shift+F10` or context menu key
- **Test:** Menu shows with correct options

#### 5.16 Implement Node Clustering
- Group related nodes by tag (optional)
- Visual cluster boundary
- Expand/collapse clusters
- **Test:** Clusters display and toggle correctly

---

## Sprint 6: DAG Dependencies & Critical Path

**Goal:** Full dependency tracking with blocking logic and critical path highlighting.
**Demo:** Create task dependencies, see blocked status propagate, highlight critical path.

### Tasks

#### 6.1 Create Dependency Graph Data Structure
- Create `DependencyGraph` class
- Methods: `addNode`, `addEdge`, `removeNode`, `removeEdge`, `getEdges`
- Validate DAG (no cycles allowed)
- **Test:** Rejects cyclic dependencies

#### 6.2 Implement Cycle Detection
- Create `wouldCreateCycle(graph, fromId, toId): boolean`
- DFS-based cycle detection
- **Test:** Detects direct cycles (A→B→A), indirect (A→B→C→A), self-ref (A→A)

#### 6.3 Implement Topological Sort
- Create `topologicalSort(graph): string[]`
- Return nodes in dependency order
- Handle disconnected subgraphs
- **Test:** Correct ordering for complex graph

#### 6.4 Create Blocked Status Calculator
- Create `calculateBlockedStatus(node, allNodes): boolean`
- Blocked if any `depends_on` Task is not `complete`
- Blocked if any `depends_on` Decision is `pending`
- **Test:** Correctly identifies blocked nodes

#### 6.5 Implement Automatic Status Propagation
- When node status changes to `complete` or `selected`
- Recalculate downstream blocked status
- Update affected nodes in store
- Show toast: "Unblocked: Task A, Task B"
- **Test:** Status change cascades correctly

#### 6.6 Create Dependencies Editor UI
- Create `<DependencyEditor nodeId={string}>`
- Multi-select dropdown for `depends_on`
- Show current dependencies as removable chips
- Prevent selecting self or creating cycles (show error)
- **Test:** Can add/remove dependencies, cycles prevented

#### 6.7 Create "Blocks" Display
- Show which nodes this node blocks (inverse of depends_on)
- Computed from dependency graph
- Link to blocked nodes
- **Test:** Shows correct blocking relationships

#### 6.8 Implement Critical Path Calculation
- Create `calculateCriticalPath(nodes, graph): string[]`
- Find longest chain through incomplete tasks
- Start from tasks with no dependents
- **Test:** Identifies correct critical path

#### 6.9 Visualize Critical Path in Graph
- Highlight critical path edges (thicker, colored red/orange)
- Highlight critical path nodes (badge or glow)
- Toggle visibility in graph toolbar
- **Test:** Visual highlighting correct

#### 6.10 Visualize Critical Path in Outline
- Show "Critical" badge on critical path nodes
- Optional: filter to show only critical path
- **Test:** Badge shows on correct nodes

#### 6.11 Create Dependency Visualization in Graph
- Dependency edges visually distinct from reference edges
- Arrow direction indicates "depends on" direction
- Optional: animated flow indicator
- **Test:** Dependencies visually distinct

#### 6.12 Create Blocked Indicator UI
- Create `<BlockedIndicator>` component
- Show on blocked task nodes
- Tooltip lists blocking nodes
- Click tooltip item to navigate to blocker
- **Test:** Shows correct blocking info

#### 6.13 Implement Dependency Impact Preview
- When hovering "Mark Complete" button
- Show tooltip: "This will unblock: Task A, Task B"
- **Test:** Preview shows correct unblocked nodes

#### 6.14a Add Milestone Field to Data Model
- Add optional `milestone: string` field to TaskNode
- Update zod schema
- **Test:** Field parses/serializes correctly

#### 6.14b Create Milestone Selector UI
- Create `<MilestoneSelector>` dropdown
- Auto-complete existing milestones
- Create new milestone inline
- **Test:** Milestone saves correctly

#### 6.14c Display Milestone Grouping
- Group tasks by milestone in outline
- Show milestone progress: "3 of 5 complete"
- Collapse/expand milestone groups
- **Test:** Grouping and progress correct

---

## Sprint 7: Decision Node Tools

**Goal:** Full decision workflow with comparison tables, scoring, and implications.
**Demo:** Create decision, add options, score criteria, select winner, see implications.

### Tasks

#### 7.1 Create Comparison Table Data Model
- Define `DecisionOption` type: `{ id, name, values: Record<criterionId, string | number> }`
- Define `Criterion` type: `{ id, name, weight, unit }`
- Store in DecisionNode as structured data
- **Test:** Parse/serialize comparison data correctly

#### 7.2 Create Comparison Table Component
- Create `<ComparisonTable decision={DecisionNode}>`
- Rows = criteria, Columns = options
- Header row with option names
- **Test:** Renders table with correct data

#### 7.3 Implement Add Option Column
- "+ Add Option" button adds new column
- Default name "Option N"
- Initialize all criteria cells empty
- Focus new name cell for editing
- **Test:** New column appears and persists

#### 7.4 Implement Add Criterion Row
- "+ Add Criterion" button adds new row
- Name input, optional unit dropdown, weight slider
- Initialize all option cells empty
- **Test:** New row appears and persists

#### 7.5 Implement Cell Editing
- Click cell to edit (contenteditable or input)
- Support text, number values
- Tab navigation between cells
- Escape to cancel edit
- **Test:** Edits save correctly

#### 7.6 Implement Option Deletion
- Delete button (trash icon) on column header
- Confirmation dialog: "Delete Option X?"
- Remove from all criteria values
- **Test:** Column removed from data

#### 7.7 Implement Criterion Deletion
- Delete button on criterion row
- Confirmation dialog
- Remove criterion entirely
- **Test:** Row removed from data

#### 7.8 Implement Weighted Scoring
- Weight slider per criterion (0–10)
- Calculate normalized score per option
- Formula: `Σ(value × weight) / Σ(weight)`
- **Test:** Scoring math correct for sample data

#### 7.9 Create Score Visualization
- Score bar at bottom of each option column
- Percentage width representing score
- Use `tabular-nums` for score display
- Highlight highest score (green, checkmark)
- **Test:** Visualization matches calculated scores

#### 7.10 Implement Option Selection
- "Select This Option" button on highest score column
- Also selectable on any column
- Updates decision status to `selected`
- Records selected option ID
- **Test:** Selection updates status correctly

#### 7.11 Create Selection Rationale Editor
- Text area for explaining decision rationale
- Appears after selection
- Auto-populated with: "Selected [Option] based on highest score (X)"
- Editable
- **Test:** Rationale persists

#### 7.12 Implement Implications Section
- Parse `## Implications` section from markdown
- Display as list of links
- "Add Implication" button creates new `[[link]]`
- **Test:** Implications parsed and editable

#### 7.13 Create Decision Status Timeline
- Show key dates: Created, Last Updated, Selected
- Display selection date prominently
- **Test:** Timeline shows correct dates

#### 7.14 Implement "Reopen Decision" Action
- Button to change status from `selected` back to `pending`
- Preserve previous selection in rationale as note
- Confirm action with AlertDialog
- **Test:** Status reverts, history preserved

#### 7.15 Create Decision Templates
- Pre-defined templates:
  - "Component Selection" (cost, weight, availability, specs)
  - "Design Choice" (complexity, maintainability, performance)
  - "Vendor Selection" (price, support, reputation)
- **Test:** Template populates correctly

#### 7.16 Create Template Data Model
- Define `Template` type: `{ id, type, name, frontmatter, content }`
- Store in `.forge/templates/`
- **Test:** Templates load and apply

#### 7.17 Create Template Manager UI
- List templates in settings
- Create/edit/delete templates
- Duplicate existing template
- **Test:** CRUD operations work

#### 7.18 Integrate Templates with Node Creation
- Template dropdown in CreateNodeDialog
- Filter by selected node type
- Pre-fill content from template
- **Test:** New node populated from template

---

## Sprint 8: Import & Export

**Goal:** Full import/export for Markdown, JSON, and CSV formats.
**Demo:** Export project as JSON, re-import, export components as CSV BOM.

### Tasks

#### 8.1 Create Export Service Interface
- Define `ExportService` interface
- Method: `export(project, format, options): Promise<ExportResult>`
- Supported formats: `json`, `markdown`, `csv`, `bom`
- **Test:** Interface implementation exists

#### 8.2 Implement JSON Export
- Create `exportToJSON(project): string`
- Include all nodes with full data
- Pretty-print with 2-space indent
- Include export metadata (date, version)
- **Test:** Valid JSON, all data present, metadata included

#### 8.3 Implement JSON Import
- Create `importFromJSON(json: string): Project`
- Validate structure with zod schema
- Handle version differences gracefully (migrations)
- **Test:** Round-trip export/import preserves data

#### 8.4 Implement Markdown Export (Single Node)
- Create `exportNodeToMarkdown(node): string`
- Frontmatter + body format matching spec
- Preserve all fields
- **Test:** Output matches spec format exactly

#### 8.5 Implement Markdown Export (Full Project)
- Create `exportProjectToMarkdown(project): FileMap`
- Generate all files with correct directory structure
- Return `Map<path, content>`
- **Test:** File structure matches spec

#### 8.6 Implement Markdown Import
- Create `importFromMarkdown(files: FileList): Project`
- Parse directory structure
- Handle malformed files gracefully (skip with warning)
- Merge with existing project option
- **Test:** Imports spec-format files correctly

#### 8.7 Implement CSV Export (Components)
- Create `exportComponentsToCSV(nodes): string`
- Columns: name, status, cost, supplier, part_number, + custom_fields
- Proper CSV escaping (quotes, commas)
- **Test:** Valid CSV, Excel-compatible

#### 8.8 Implement CSV Export (BOM)
- Create `exportBOM(project): string`
- Bill of Materials format for ordering
- Sum costs by category
- Include quantities (default 1)
- **Test:** BOM totals correct

#### 8.9 Create Export Dialog UI
- Create `<ExportDialog>` using Base UI Dialog
- Format selection radio group
- Options checkboxes per format
- Preview of what will be exported (file count, size estimate)
- Download button
- **Test:** Dialog shows options, triggers download

#### 8.10 Create Import Dialog UI
- Create `<ImportDialog>` with file/folder picker
- Format auto-detection from file extension/content
- Preview of what will be imported (node count by type)
- Conflict resolution: merge or replace
- **Test:** Import flow works end-to-end

#### 8.11 Implement Drag-and-Drop Import
- Drop zone overlay on app
- Support .md, .json files and folders
- Visual feedback during drag (border highlight)
- **Test:** Drag-drop triggers import flow

#### 8.12 Implement Clipboard Import
- `Ctrl/Cmd+V` in app (not in editor) triggers
- Detect format from clipboard content
- Paste JSON or Markdown to import
- **Test:** Paste imports correctly

#### 8.13 Create Export Progress Indicator
- Show progress bar for large exports
- Node count processed
- Allow cancellation
- **Test:** Progress updates, cancel works

---

## Sprint 9: Command Palette & Search

**Goal:** Command palette for quick actions and global full-text search.
**Demo:** Press Cmd+K, search for node, execute action, navigate instantly.

### Tasks

#### 9.1 Create Command Palette Component
- Create `<CommandPalette>` using Base UI Dialog
- Input field with search icon
- Results list below
- Keyboard navigation (arrow keys, Enter to select)
- **Test:** Opens/closes, keyboard navigation works

#### 9.2 Implement Hotkey Registration
- Create `useHotkey(key, callback, options)` hook
- Register `Cmd+K` / `Ctrl+K` for palette
- Handle context (don't trigger when in text input)
- **Test:** Hotkey triggers palette from non-input context

#### 9.3 Create Command Registry
- Define `Command` type: `{ id, label, action, shortcut?, category, keywords? }`
- Create registry: `registerCommand`, `getCommands`, `executeCommand`
- **Test:** Commands register and execute

#### 9.4 Implement Node Search
- Search nodes by title (fuzzy match)
- Show: type icon, title, status
- Enter navigates to node
- **Test:** Search finds nodes, navigation works

#### 9.5 Implement Action Commands
- Register commands:
  - "Create Decision/Component/Task/Note" → opens dialog
  - "Switch to Graph/Outline View" → switches view
  - "Export Project" → opens export dialog
  - "Toggle Dark Mode" → toggles theme
- **Test:** Actions execute correctly

#### 9.6 Implement Navigation Commands
- "Recent Nodes" section (last 5 viewed)
- "Go to Project: [name]" switching
- "Go to Settings"
- **Test:** Navigation works

#### 9.7 Add Fuzzy Search
- Implement fuzzy matching (Levenshtein or similar)
- Highlight matched characters in results
- Score by match quality (exact > prefix > fuzzy)
- **Test:** Fuzzy matching ranks correctly

#### 9.8 Implement Command Categories
- Group commands: Navigation, Create, View, Actions
- Show category headers in results
- Category filter tabs (optional)
- **Test:** Categories display correctly

#### 9.9 Add Keyboard Shortcut Display
- Show shortcut badge next to commands
- Platform-aware symbols: `⌘` Mac, `Ctrl` Windows
- **Test:** Correct symbols per platform

#### 9.10 Implement Recent Commands
- Track last 10 used commands
- Show at top when query empty
- Persist in localStorage
- **Test:** Recents update and persist

#### 9.11a Create Full-Text Search Index
- Index node titles and body content
- Update index on node create/update/delete
- Use lightweight in-memory index (e.g., minisearch)
- **Test:** Index contains all node content

#### 9.11b Implement Full-Text Search
- Search across all nodes by content
- Show context snippet with highlighted match
- Enter navigates to node
- **Test:** Content search finds matches

#### 9.12 Implement Search Result Highlighting
- Bold matched characters in results
- Show match location (title vs body)
- **Test:** Highlighting visible and accurate

#### 9.13 Add Filter Commands
- "Filter by type: Task/Decision/Component/Note"
- "Filter by tag: [tag]" with autocomplete
- "Filter by status: [status]"
- Applies filter to current view
- **Test:** Filters apply correctly

---

## Sprint 10: Polish & Accessibility Audit

**Goal:** Production-ready UI with full WCAG 2.1 compliance.
**Demo:** Pass accessibility audit, demonstrate with screen reader.

### Tasks

#### 10.1 Conduct Accessibility Audit
- Install axe-core, run on all views
- Test with VoiceOver (Mac) and NVDA (Windows)
- Test keyboard-only navigation
- Document all issues in spreadsheet
- **Test:** Audit report completed

#### 10.2 Fix Heading Hierarchy
- Ensure sequential levels (h1 → h2 → h3, no skips)
- Add missing headings where needed
- Single h1 per page
- **Test:** No heading level violations (axe)

#### 10.3 Fix Form Labels
- All inputs have associated `<label>` via `htmlFor` or wrapping
- Add `aria-label` where visual label not possible
- **Test:** No label violations (axe)

#### 10.4 Fix Focus Management
- Logical focus order (tab through page)
- Return focus after dialog/panel close
- Focus first error on form submit failure
- **Test:** Focus flows logically through all interactions

#### 10.5 Add Missing ARIA Labels
- Icon-only buttons: `aria-label="Delete node"`
- Landmark regions: `aria-label="Main navigation"`
- Busy states: `aria-busy="true"` during loads
- **Test:** No missing label violations

#### 10.6 Implement Focus Visible Styles
- Visible focus ring on all interactive elements
- Use `:focus-visible` (not `:focus`) to avoid ring on click
- Never remove outline without replacement
- Consistent ring color/style throughout
- **Test:** Focus ring visible on Tab navigation

#### 10.7 Fix Color Contrast
- Text: 4.5:1 minimum contrast ratio
- UI components: 3:1 minimum
- Test with browser devtools
- **Test:** No contrast violations

#### 10.8 Add Error Message Improvements
- Error messages include fix/next step
- Inline display next to fields
- `aria-describedby` links input to error
- `aria-invalid="true"` on invalid inputs
- **Test:** Errors accessible and actionable

#### 10.9 Implement Loading States
- Structural skeletons (not spinners) for content loading
- Loading text with ellipsis: "Loading…"
- `aria-busy="true"` on loading containers
- **Test:** Loading states accessible

#### 10.10 Implement Touch Targets
- Verify 44×44px minimum on all interactive elements
- Add padding where needed
- Test on touch device (phone/tablet)
- **Test:** All targets meet minimum size

#### 10.11a Create Dark Mode Theme
- Implement dark color scheme with Tailwind dark:
- Ensure all components support both themes
- **Test:** All components visible in dark mode

#### 10.11b Configure Dark Mode Toggle
- Add `color-scheme: dark` on `<html>` when active
- Update `<meta name="theme-color">` dynamically
- Persist preference in localStorage
- Respect system preference by default
- **Test:** Dark mode toggle works, persists

#### 10.12 Implement prefers-reduced-motion
- Detect `prefers-reduced-motion: reduce`
- Disable/reduce all animations
- Provide instant transitions instead
- **Test:** Animations respect preference

#### 10.13 Performance Audit
- Run Lighthouse performance audit
- Target: 90+ performance score
- Fix identified bottlenecks
- Verify list virtualization working
- **Test:** Lighthouse score ≥ 90

#### 10.14 Create Onboarding/Help
- First-run welcome dialog with quick tips
- Keyboard shortcuts reference (? shortcut)
- Help link in UI footer
- **Test:** Onboarding shows for new users

#### 10.15 Final Cross-Browser Testing
- Test in Chrome, Firefox, Safari
- Test in Edge (Windows)
- Fix any browser-specific issues
- **Test:** Core functionality works in all browsers

---

## Sprint 11: Workspace Management & Git Integration

**Goal:** Multi-project workspace and optional git integration.
**Demo:** Switch between projects, see git status, auto-commit on save.

### Tasks

#### 11.1 Create Workspace Loader
- Load workspace from `.forge/config.json`
- Discover projects in workspace folder
- Handle missing/corrupted config gracefully
- **Test:** Loads multi-project workspace

#### 11.2 Create Project Switcher Component
- Create `<ProjectSwitcher>` dropdown in sidebar
- List all projects with active indicator
- Search/filter projects
- **Test:** Can switch between projects

#### 11.3 Create Project Creation Flow
- Create `<CreateProjectDialog>`
- Project name input, folder selection
- Initialize folder structure (decisions/, components/, tasks/, notes/)
- Create project.json
- **Test:** Creates project with correct structure

#### 11.4 Create Project Settings Panel
- Edit project name, description
- View/edit project metadata
- Delete project (with confirmation)
- **Test:** Settings save correctly

#### 11.5 Implement Git Status Detection
- Detect if workspace is a git repo
- Read current branch name
- Detect uncommitted changes (staged/unstaged)
- **Test:** Status reflects actual git state

#### 11.6 Create Git Status Indicator
- Show in sidebar/header:
  - Branch name
  - Uncommitted changes count
  - Clean/dirty state icon
- **Test:** Indicator updates on file changes

#### 11.7 Implement Auto-Commit on Save (Optional)
- Add setting in workspace config: `git.autoCommit: boolean`
- On save: stage changed file, commit with message
- Commit message: "Update [node title]"
- **Test:** Save triggers commit when enabled

#### 11.8 Create Git Settings UI
- Toggle auto-commit
- View recent commits
- Manual commit button with message input
- **Test:** Settings persist, manual commit works

---

## Appendix: Technical Decisions

### Package Versions (Pin These)
- React: 18.x
- TypeScript: 5.x
- Vite: 5.x
- Tailwind CSS: 3.x
- tailwindcss-animate: latest
- @base-ui-components/react: pin exact version (alpha)
- Zustand: 4.x
- nuqs: 2.x
- gray-matter: latest (with safe YAML config)
- zod: 3.x
- reactflow: 11.x
- elkjs: latest
- CodeMirror: 6.x (@codemirror/* packages)
- lucide-react: latest

### File System Fallback Strategy
1. Primary: File System Access API (Chrome/Edge)
2. Fallback: `<input type="file" webkitdirectory>` (Firefox/Safari)
3. Future: Local server adapter for Electron/Tauri

### Z-Index Scale
```
Z_DROPDOWN   = 10
Z_STICKY     = 20
Z_MODAL      = 30
Z_POPOVER    = 40
Z_TOAST      = 50
Z_TOOLTIP    = 60
```

### Color Tokens (Node Types)
| Type | Light BG | Dark BG | Accent |
|------|----------|---------|--------|
| Decision | blue-50 | blue-950 | blue-500 |
| Component | green-50 | green-950 | green-500 |
| Task | orange-50 | orange-950 | orange-500 |
| Note | gray-50 | gray-900 | gray-500 |

---

*Last updated: Generated from spec.md*
