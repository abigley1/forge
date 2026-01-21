# Ralph Loop Progress

## Status
- **Current Iteration:** 9
- **Last Updated:** 2026-01-20
- **Status:** Completed

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

## Current Focus
_feat-1.6 completed - Sprint 1 complete! Ready for Sprint 2 (Node CRUD & Basic Editor)_

## Blockers
_None_

## Notes
Project Loading & Saving (task 1.6) is complete:
- `slugify()` and `generateNodeId()` for URL-safe filename generation
- `loadProject(adapter, path)` scans decisions/, components/, tasks/, notes/ directories
- Builds nodes Map<string, ForgeNode> with correct types using Zod validation
- `saveNode(adapter, projectPath, node)` determines subdirectory from node type
- Node serialization preserves frontmatter field ordering and handles snake_case conversion
- `fixtures/sample-project/` contains 8 nodes (2 of each type) with cross-node wiki-links
- `<DebugProjectView>` displays node counts, parse errors with details, collapsible sections
- 57 new unit tests (353 total tests passing)
- All verification checks pass: lint, type-check, test, build
