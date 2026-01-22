# Ralph Loop Progress

## Status
- **Current Sprint:** 8 (Import & Export)
- **Last Updated:** 2026-01-22
- **Status:** Sprint 8 Complete - Import/Export UI

## Sprint 8: Import & Export

### Task 8.1: JSON Export/Import ✓
- Created `ExportService` interface with `export(project, format, options)` method
- Created export types: `ExportFormat`, `JSONExportOptions`, `ExportMetadata`, `JSONExport`, `SerializedNode`
- Implemented `exportToJSON(project, options)`:
  - Pretty print with configurable indentation
  - Include/exclude export metadata
  - Serializes all node types with dates as ISO strings
  - Sorts nodes by type then title for consistent output
- Implemented `importFromJSON(json)`:
  - Validates with Zod schemas (structure + individual nodes)
  - Returns `ValidationResult<Project>` pattern
  - Handles all four node types
  - Converts ISO strings back to Date objects
  - Detects duplicate node IDs
  - Prepared for version migrations (placeholder for future)
- Implemented `generateExportFilename(projectName, format)`
- 32 unit tests (2087 total passing)

**Files created:**
- src/types/export.ts
- src/lib/export.ts
- src/lib/export.test.ts

**Files modified:**
- src/types/index.ts - Export types from export.ts

### Task 8.2: Markdown Export/Import ✓
- Implemented `exportNodeToMarkdown(node, options)`:
  - Outputs frontmatter + body matching spec
  - Uses snake_case for YAML fields (depends_on, selected_date)
  - Supports `includeFrontmatter` option
  - Handles all node types (Task, Decision, Component, Note)
- Implemented `exportProjectToMarkdown(project, options)`:
  - Returns `MarkdownExportResult` with files map and project.json
  - Creates correct directory structure (tasks/, decisions/, components/, notes/)
  - Uses node ID as filename (already slugified)
- Implemented `importFromMarkdown(files, projectName, options)`:
  - Returns `MarkdownImportResult` with project and parse errors
  - Parses directory structure and detects node type from path
  - Handles malformed files with detailed error collection
  - Supports `mergeMode` option for conflict resolution (skip vs overwrite)
  - Loads project metadata from project.json if present
  - Validates nodes with Zod schemas
  - Warns on type mismatch (e.g., note in tasks/ directory)
- Added new export types: `MarkdownFileEntry`, `MarkdownExportResult`, `MarkdownParseError`, `MarkdownImportResult`
- 33 new unit tests (2120 total passing)
- Full round-trip test: export then import produces equivalent project

**Files modified:**
- src/types/export.ts - Added markdown export/import types
- src/lib/export.ts - Added markdown export/import functions

### Task 8.3: CSV Export ✓
- Implemented `exportComponentsToCSV(nodes, options)`:
  - Proper CSV escaping: quotes, commas, newlines handled correctly
  - Excel-compatible output with UTF-8 BOM and CRLF line endings
  - Configurable fields selection via options
  - Formats custom fields as semicolon-separated (e.g., "voltage:12V; torque:50Nm")
  - Formats tags as semicolon-separated
  - Accepts both Map and array input, filters to component nodes only
  - Sorts by title for consistent output
- Implemented `exportBOM(project)` for Bill of Materials:
  - Groups components by part number with quantity aggregation
  - Calculates extended cost (quantity × unit cost) per line item
  - Sums total cost and tracks unknown cost count
  - Components without part numbers listed individually
  - Sorts by part number (items without part numbers listed last)
  - Includes Total row at bottom with cost summary
  - Excel-compatible with UTF-8 BOM and CRLF line endings
- Added CSV export types: `CSVExportResult`, `BOMLineItem`, `BOMExportResult`
- 32 new unit tests (2152 total passing)

### Task 8.4: Import/Export UI ✓
- Created `ExportDialog` component:
  - Format selection (JSON, Markdown, CSV) with radio buttons
  - Format-specific options (pretty print, metadata, frontmatter, BOM)
  - Live preview generation with truncation for large exports
  - Copy to clipboard functionality
  - Download button with automatic filename generation
  - CSV disabled when no components exist
  - Full accessibility: radiogroup role, aria-labels, keyboard navigation
- Created `ImportDialog` component:
  - File and folder selection buttons
  - Drag-and-drop zone with visual feedback ("Drop files here" overlay)
  - Format auto-detection from file extension and content
  - Conflict resolution options (skip, overwrite, rename) when merging
  - Merge mode option when current project exists
  - Clipboard import via Ctrl/Cmd+V with format detection
  - Error display with alert role for screen readers
  - Progress tracking during import
- Both dialogs use Base UI Dialog component with consistent styling
- 69 unit tests passing
- Full dark mode support

**Files created:**
- src/components/export/ExportDialog.tsx
- src/components/export/ExportDialog.test.tsx
- src/components/export/ImportDialog.tsx
- src/components/export/ImportDialog.test.tsx
- src/components/export/index.ts

## Sprint 7: Decision Support

### Task 7.1: Comparison Table ✓
- Created `<ComparisonTable>` component with rows=criteria, columns=options
- Table displays options as column headers with delete buttons
- Table displays criteria as row labels with name, unit, and weight slider
- 'Add Option' column shows input on click, focuses automatically, adds on Enter
- 'Add Criterion' row with name input, unit dropdown, weight slider 0-10
- Cell editing: click to edit, Tab to commit and move, Escape to cancel
- Option/criterion deletion with AlertDialog confirmation
- Full keyboard accessibility and dark mode support
- 35 unit tests

**Files created:**
- src/components/decision/ComparisonTable.tsx
- src/components/decision/ComparisonTable.test.tsx
- src/components/decision/index.ts

### Task 7.2: Scoring & Ranking
- *Not started*

### Task 7.3: Option Selection & Status ✓
- Extended DecisionNode type with `rationale` and `selectedDate` fields
- Updated Zod validation schema with nullableDateSchema
- Created SelectionPanel component:
  - Select buttons for each option to mark as chosen
  - Rationale textarea (auto-populated on selection, editable)
  - Selected state display with trophy icon
  - Reopen Decision button with AlertDialog confirmation
- Created DecisionTimeline component:
  - Shows Created, Last Updated, Selected dates
  - Relative time display (e.g., "4 days ago")
  - Green highlighting for selected decisions
- Created ImplicationsSection component:
  - Parses ## Implications from content
  - Renders wiki-links as clickable navigation
  - Shows broken link warnings
- 78 new unit tests (1996 total passing)

**Files created:**
- src/components/decision/SelectionPanel.tsx
- src/components/decision/SelectionPanel.test.tsx
- src/components/decision/DecisionTimeline.tsx
- src/components/decision/DecisionTimeline.test.tsx
- src/components/decision/ImplicationsSection.tsx
- src/components/decision/ImplicationsSection.test.tsx

**Files modified:**
- src/types/nodes.ts - Added rationale, selectedDate, createDecisionNode
- src/lib/validation.ts - Added nullableDateSchema
- src/components/decision/index.ts - Added exports
- 29+ test files - Updated mock factories

### Task 7.4: Templates ✓
- Created `NodeTemplate` type with id, name, description, type, content, frontmatter, isBuiltIn
- Created `TemplateFrontmatter` interface for pre-filling node fields (tags, status, priority, etc.)
- Built-in templates for all node types:
  - Decision: Blank, Component Selection, Design Choice, Vendor Selection
  - Component: Blank, Electronic Part, Mechanical Part
  - Task: Blank, Task with Checklist
  - Note: Blank, Research Note, Meeting Notes
- Created `useTemplatesStore` Zustand store with:
  - CRUD operations (add, update, delete, duplicate)
  - Built-in template lookup by ID
  - Filter by node type
  - LocalStorage persistence with Map serialization
- Created `TemplateManager` component:
  - List all templates with type filtering
  - Create new custom templates
  - Edit/delete custom templates (built-in templates are read-only)
  - Duplicate any template (creates custom copy)
  - Template count footer
- Integrated templates into `CreateNodeDialog`:
  - Template dropdown pre-fills content when creating nodes
  - Supports both built-in and custom templates
  - Applies frontmatter values to new nodes
- 54 new unit tests

**Files created:**
- src/types/templates.ts
- src/store/useTemplatesStore.ts
- src/store/useTemplatesStore.test.ts
- src/components/templates/TemplateManager.tsx
- src/components/templates/TemplateManager.test.tsx
- src/components/templates/index.ts

**Files modified:**
- src/components/nodes/CreateNodeDialog.tsx - Template integration
- src/components/nodes/CreateNodeDialog.test.tsx - Updated template IDs
- src/store/index.ts - Export useTemplatesStore
- src/types/index.ts - Export template types

## Current Focus
Sprint 8 complete. All Import/Export features implemented:
- JSON export/import with validation
- Markdown export/import with directory structure
- CSV export for components and BOM
- Full UI dialogs with drag-drop, clipboard support, and accessibility

## Blockers
None

## Archived Sprints
See `.ralph/archive/` for completed sprint details:
- [Sprint 0: Infrastructure](archive/sprint-0.md)
- [Sprint 1: Type System](archive/sprint-1.md)
- [Sprint 2: Core UI](archive/sprint-2.md)
- [Sprint 3: Filtering & Navigation](archive/sprint-3.md)
- [Sprint 4: Wiki-Links](archive/sprint-4.md)
- [Sprint 5: Graph View](archive/sprint-5.md)
- [Sprint 6: Dependencies](archive/sprint-6.md)
