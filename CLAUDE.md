# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forge is a personal project brainstorming, planning, and tracking tool for complex hardware and engineering projects. It combines graph-based linking (like Obsidian) with structured data (like Notion), stored as git-friendly files.

**Target user:** Solo maker/engineer working on complex hardware projects (3D design, PCB design, component selection, system architecture).

## Development Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript build + Vite production build
npm run build:prod   # Production build with NODE_ENV=production
npm run test         # Run all Vitest tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run E2E tests with Playwright UI
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run type-check   # TypeScript type check (no emit)
npm run format       # Prettier format all files
npm run format:check # Check formatting without writing
```

Run a single test file:
```bash
npx vitest run src/lib/validation.test.ts
npx vitest src/lib/validation.test.ts  # watch mode for single file
npx playwright test e2e/node-operations.spec.ts  # single E2E test
```

Server commands (in `server/` directory):
```bash
cd server && npm run dev    # Start Express server with tsx watch
cd server && npm run build  # Build TypeScript
cd server && npm test       # Run server tests
```

## Architecture

### Layered Structure

```
src/
├── types/           # TypeScript interfaces & Zod-validated types
│   ├── nodes.ts     # ForgeNode discriminated union (7 types, see below)
│   └── project.ts   # Project, Workspace, WorkspaceConfig
├── lib/             # Core logic (no React dependencies)
│   ├── validation.ts      # Zod schemas, validateNode() returns Result type
│   ├── frontmatter.ts     # YAML parsing (gray-matter), wiki-link extraction
│   ├── project.ts         # loadProject(), saveNode(), initializeProject()
│   ├── links.ts           # Bidirectional wiki-link index (outgoing/incoming)
│   ├── dependencyGraph.ts # DAG for task dependencies with cycle detection
│   ├── blockedStatus.ts   # Calculate blocked status from dependencies
│   ├── criticalPath.ts    # Longest path through incomplete tasks
│   └── filesystem/        # Adapter pattern for file I/O
│       ├── types.ts                    # FileSystemAdapter interface
│       ├── MemoryFileSystemAdapter.ts  # For tests
│       ├── BrowserFileSystemAdapter.ts # File System Access API
│       ├── IndexedDBAdapter.ts         # IndexedDB storage
│       ├── FallbackFileSystemAdapter.ts # Fallback when no FS access
│       ├── HybridPersistenceService.ts # Combines IndexedDB + File System
│       ├── SyncService.ts              # Sync between adapters
│       └── ConflictService.ts          # Handle sync conflicts
├── store/           # Zustand stores with devtools
│   ├── useNodesStore.ts      # Node CRUD, dirty tracking, link index
│   ├── useProjectStore.ts    # Project metadata and file system adapter
│   ├── useWorkspaceStore.ts  # Multi-project workspace management
│   ├── useAppStore.ts        # UI state (sidebar, activeView)
│   ├── useUndoStore.ts       # Undo/redo history
│   ├── useTemplatesStore.ts  # Node templates management
│   └── useCommandRegistry.ts # Command palette commands
├── hooks/           # React hooks for business logic
│   ├── useHybridPersistence.ts # Manage hybrid storage
│   ├── useBlockedStatus.ts     # Compute blocked status for nodes
│   ├── useCriticalPath.ts      # Compute critical path through tasks
│   ├── useFilters.ts           # URL-synced filtering (uses nuqs)
│   ├── useSorting.ts           # URL-synced sorting (uses nuqs)
│   └── useCommands.ts          # Command palette registration
└── components/
    ├── ui/          # Base UI primitives (Dialog, Button, Toast, AlertDialog)
    └── layout/      # App shell, Sidebar, SkipLink

server/              # Express server for production deployment
├── src/
│   ├── index.ts              # Server entry point
│   ├── routes/               # API endpoints (health, files)
│   ├── adapters/             # ServerFileSystemAdapter
│   └── middleware/           # CORS, etc.
```

### Key Patterns

**Node Type System:** Uses discriminated unions with type guards. Seven node types:
- **Leaf nodes:** Decision, Component, Task, Note (all have `parent` field)
- **Container nodes:** Subsystem, Assembly, Module (organize other nodes hierarchically)

Always narrow with `isTaskNode(node)`, `isContainerNode(node)`, etc. before accessing type-specific fields.

**File System Abstraction:** All file I/O goes through `FileSystemAdapter` interface. Implementations:
- `MemoryFileSystemAdapter` - For tests
- `BrowserFileSystemAdapter` - File System Access API (full read/write)
- `IndexedDBAdapter` - Browser IndexedDB storage
- `FallbackFileSystemAdapter` - When File System Access unavailable

The `HybridPersistenceService` combines IndexedDB (fast, always available) with File System Access (optional sync to disk).

**Validation:** `validateNode()` in `src/lib/validation.ts` returns `ValidationResult<ForgeNode>` - a Result type that's either `{ success: true, data: ForgeNode }` or `{ success: false, error: ValidationError }`. Never throw on validation failure.

**Frontmatter Conventions:** YAML uses snake_case (`depends_on`), TypeScript uses camelCase (`dependsOn`). The validation layer handles conversion.

**URL State with nuqs:** Filter and sort state is synced to URL query params via `nuqs`. Hooks like `useFilters` and `useSorting` use `parseAsString`, `parseAsArrayOf` for type-safe URL state.

**Dependency System:** Task dependencies use a DAG (`DependencyGraph` class) with cycle detection. The `dependsOn` field on TaskNode creates edges. `blockedStatus.ts` computes which nodes are blocked; `criticalPath.ts` finds the longest chain of incomplete tasks.

### Node Data Format

Nodes are markdown files with YAML frontmatter stored in type-specific directories:
```
project-name/
├── project.json     # Project metadata
├── decisions/       # Decision nodes as .md files
├── components/      # Component nodes
├── tasks/           # Task nodes
├── notes/           # Note nodes
├── subsystems/      # Container: high-level functional areas
├── assemblies/      # Container: physical component groupings
├── modules/         # Container: logical feature groupings
└── attachments/     # Binary files (PDFs, images) organized by node ID
```

### Path Alias

`@/` maps to `src/` - use `import { cn } from '@/lib/utils'`

### Z-Index Scale

Import from `@/lib/z-index`: `Z_DROPDOWN=10`, `Z_STICKY=20`, `Z_MODAL=30`, `Z_POPOVER=40`, `Z_TOAST=50`, `Z_TOOLTIP=60`

## Test Patterns

### Unit Tests (Vitest)

Tests use `MemoryFileSystemAdapter` for isolation. Test fixtures can be created inline:
```typescript
const adapter = new MemoryFileSystemAdapter()
await adapter.writeFile('/project/tasks/my-task.md', `---
type: task
status: pending
---
# My Task
Content here`)
```

### E2E Tests (Playwright)

E2E tests are in `e2e/` and use helper utilities from `e2e/test-utils.ts`. Key helpers:
- `waitForAppReady(page)` - Wait for app initialization
- `setupTestDataViaActions(page)` - Populate stores with test nodes
- `openCommandPalette(page)` - Opens command palette (Cmd/Ctrl+K)
- `TEST_NODES` - Pre-defined test fixtures for decisions, components, tasks, notes

E2E tests communicate with Zustand stores via custom events (`e2e-setup-nodes`, `e2e-clear-nodes`).

The app exposes `window.__e2eReady` and `window.__e2eHybridPersistenceReady` flags that tests wait for before interacting.

## Ralph Loop (Automated Development)

The `ralph.sh` script runs an iterative development loop:
```bash
./ralph.sh                    # Run with default 50 iterations
MAX_ITERATIONS=100 ./ralph.sh # Custom iteration limit
RALPH_INTERACTIVE=1 ./ralph.sh # Pause for approval each iteration
```

Progress is tracked in `.ralph/progress.md`. The loop completes when `[RALPH_COMPLETE]` appears in that file.

## UI Implementation Standards

### Accessibility (WCAG 2.1)
- All `<img>` require `alt`, icon-only buttons require `aria-label`
- Use semantic HTML before ARIA; sequential heading hierarchy
- Focus states: `focus-visible:ring-*`, never remove outline without replacement
- 44×44px minimum touch targets
- No color-only status indicators—pair with icon/text

### Animation Constraints
- Only animate `transform` and `opacity` (compositor properties)
- Never animate `width`, `height`, `top`, `left`, `margin`, `padding`
- Max 200ms for interaction feedback
- Honor `prefers-reduced-motion`
- Never use `transition: all`

### Visual Design
- No gradients unless explicitly requested
- No purple/multicolor gradients or glow effects
- Use Tailwind default shadow scale
- Limit accent color to one per view

### Layout
- Use `h-dvh` not `h-screen` for full-height
- Fixed z-index scale: dropdown=10, sticky=20, modal=30, popover=40, toast=50, tooltip=60
- Flex children need `min-w-0` for text truncation
- `overscroll-behavior: contain` in modals/drawers

### Forms
- Inputs need `autocomplete`, correct `type`/`inputmode`
- Never block paste
- Errors inline next to fields; focus first error on submit
- Warn before navigation with unsaved changes

### Performance
- Virtualize lists >50 items
- No layout reads in render (`getBoundingClientRect`, `offsetHeight`)
- Prefer uncontrolled inputs
