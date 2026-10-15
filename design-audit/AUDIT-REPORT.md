# Forge Visual Design Audit Report

**Date:** 2026-02-06
**Method:** Playwright-driven systematic visual inspection of every major screen
**Screenshots:** 18 captured in `design-audit/`
**Viewport:** 1440×900 (desktop) and 375×667 (mobile)

---

## Executive Summary

The Forge app's warm industrial aesthetic is **well-implemented in content views** (outline, kanban, graph, command palette, export dialog) but **significantly inconsistent in chrome/shell components** (sidebar, filters, detail panel forms, mobile header).

| Metric | Count |
|--------|-------|
| Screenshots captured | 18 |
| Total `gray-*` class occurrences | 684 across 62 files |
| Total `blue-*` class occurrences | 75 across 25 files |
| P0 (Critical) issues | 3 |
| P1 (Important) issues | 5 |
| P2 (Nice-to-have) issues | 3 |
| Fully-themed components (zero gray) | Kanban, Graph nodes, Context menu, Command palette, Export/Import dialogs, Delete confirmation |

### Key Insight

The gray-class distribution on the rendered page reveals the pattern clearly:
- **Sidebar + filters: 35 of 39** visible gray-class elements
- **Mobile header: 3** gray-class elements
- **Main content area: 0** gray-class elements

The redesign was applied thoroughly to content components but the app shell and filter/form primitives were missed.

---

## P0 — Critical Issues

### P0-1: Dark Mode Completely Non-Functional
**Screenshot:** `02-landing-dark.png`, `05-outline-dark.png`
**File:** `src/index.css:110`

Dark mode tokens are defined (`forge-paper-dark`, `forge-surface-dark`, etc.) and the CSS applies them via `dark:bg-forge-paper-dark dark:text-forge-text-dark` on line 110, but adding the `dark` class to `<html>` produces **zero visual change**. The body background stays `rgb(250, 248, 245)` (light cream) and text stays `rgb(44, 40, 37)` (dark).

**Root cause:** Likely a Tailwind v4 configuration issue — the `dark:` variant within `@apply` inside `@layer base` may not be processing correctly in Tailwind v4's CSS-first approach. This affects the entire app.

**Fix:** Investigate Tailwind v4 dark mode configuration. May need `@variant dark` or CSS-native `@media (prefers-color-scheme: dark)` approach instead of `@apply` with `dark:` prefix.

### P0-2: Sidebar Uses Raw Cool Gray
**Screenshot:** `04-outline-light.png`, `16-sidebar-filters.png`
**File:** `src/components/layout/AppShell.tsx:90-91`

```
'border-r border-gray-200 bg-gray-50',
'dark:border-gray-800 dark:bg-gray-900',
```

The sidebar `<aside>` background is `oklch(0.985 0.002 247.839)` (cool bluish-gray) while the body is `forge-paper` (`#faf8f5`, warm cream). The temperature mismatch is subtle but noticeable — the sidebar feels "cold" compared to the warm content area.

**Fix:** Replace with `border-r border-forge-border bg-forge-surface dark:border-forge-border-dark dark:bg-forge-surface-dark`

### P0-3: Mobile Header Uses Raw Gray
**Screenshot:** `17-mobile-outline.png`, `18-mobile-outline-no-sidebar.png`
**File:** `src/components/layout/AppShell.tsx:115-135`

The mobile-only header (`md:hidden`) uses:
- `border-gray-200` / `dark:border-gray-800` (line 115)
- Hamburger button: `text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800` (lines 121-122)
- Focus ring: `focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300` (lines 123-124)
- Title: `text-gray-900 dark:text-gray-100` (line 135)

**Fix:** Replace all with `forge-*` equivalents: `border-forge-border`, `text-forge-text`, `hover:bg-forge-surface`, `focus-visible:ring-forge-accent`.

---

## P1 — Important Issues

### P1-1: Filter Components All Use Raw Gray (45 occurrences)
**Screenshot:** `16-sidebar-filters.png`
**Files:** 7 files, 45 total `gray-*` occurrences

| File | Count |
|------|-------|
| `src/components/filters/NodeSearchInput.tsx` | 9 |
| `src/components/filters/ContainerFilter.tsx` | 9 |
| `src/components/filters/TagFilter.tsx` | 8 |
| `src/components/filters/StatusFilter.tsx` | 7 |
| `src/components/filters/TypeFilter.tsx` | 6 |
| `src/components/filters/SortDropdown.tsx` | 4 |
| `src/components/filters/FilterResultsAnnouncer.tsx` | 2 |

The search input, sort dropdown, type filter pills, status checkboxes, and container dropdown all use `gray-*` borders, backgrounds, text colors, and focus rings.

**Fix:** Systematic find-and-replace across all 7 files. Map: `gray-50`→`forge-surface`, `gray-100`→`forge-surface`, `gray-200`/`gray-300`→`forge-border`, `gray-500`→`forge-muted`, `gray-700`→`forge-text-secondary`, `gray-900`/`gray-950`→`forge-text`.

### P1-2: Blue Focus Rings Instead of Amber (21 files)
**Screenshot:** (visible when tabbing through elements)
**Files:** 21 unique locations across components

Key offenders:
- `src/components/filters/SortDropdown.tsx:53,82` — `focus:ring-blue-500`
- `src/components/filters/ContainerFilter.tsx:120` — `focus:border-blue-500 focus:ring-blue-500`
- `src/components/filters/TagFilter.tsx:106` — `focus-visible:ring-blue-500`
- `src/components/layout/SkipLink.tsx:24` — `focus-visible:ring-blue-500`
- `src/components/decision/ComparisonTable.tsx` — 8 separate `ring-blue-500` references
- `src/components/detail/DependencyEditor.tsx:387` — `ring-blue-400`
- `src/components/detail/ParentSelector.tsx:320` — `ring-blue-500`
- `src/components/nodes/BlockedIndicator.tsx:199` — `ring-blue-500`
- `src/components/nodes/SortableNodeListItem.tsx:114,130` — `ring-blue-500`

**Fix:** Global replace `ring-blue-500` → `ring-forge-accent` and `ring-blue-400` → `ring-forge-accent`.

### P1-3: Detail Panel Forms Use Raw Gray (218 occurrences)
**Screenshot:** `06-detail-panel-task.png`, `07-detail-panel-decision.png`, `08-detail-panel-component.png`
**Files:** 14 detail component files

| File | Count |
|------|-------|
| `src/components/detail/ComponentFields.tsx` | 41 |
| `src/components/detail/MilestoneSelector.tsx` | 27 |
| `src/components/detail/ParentSelector.tsx` | 22 |
| `src/components/detail/ChecklistEditor.tsx` | 20 |
| `src/components/detail/TagInput.tsx` | 19 |
| `src/components/detail/DependencyEditor.tsx` | 18 |
| `src/components/detail/ContainerFields.tsx` | 15 |
| `src/components/detail/RelatedNodesSection.tsx` | 14 |
| `src/components/detail/StatusSelect.tsx` | 14 |
| `src/components/detail/PrioritySelector.tsx` | 8 |
| `src/components/detail/ChildNodesSection.tsx` | 8 |
| `src/components/detail/FrontmatterEditor.tsx` | 8 |
| `src/components/detail/NodeTitleEditor.tsx` | 2 |
| `src/components/detail/ImageViewer.tsx` | 2 |

When the detail panel opens, **27 elements** render with gray classes. Every label uses `gray-700`, every input uses `gray-100`/`gray-300`/`gray-900`, and every helper text uses `gray-500`.

**Fix:** These share common patterns. Creating a small set of shared input/label utility classes using `forge-*` tokens and applying them across all 14 files would be efficient.

### P1-4: ComparisonTable Is the Most Un-Themed Component (54 gray, 18 blue)
**Screenshot:** `07-detail-panel-decision.png`
**File:** `src/components/decision/ComparisonTable.tsx`

54 `gray-*` and 18 `blue-*` references make this the single most un-themed component in the app. It uses raw blue for buttons (`bg-blue-600 hover:bg-blue-700`) and blue focus rings throughout.

**Fix:** Replace `bg-blue-600`→`bg-forge-accent`, `hover:bg-blue-700`→`hover:bg-forge-accent-hover`, and all gray references with forge equivalents.

### P1-5: QuickProjectSwitcher Uses Blue Accent (20 gray, 2 blue)
**File:** `src/components/workspace/QuickProjectSwitcher.tsx`

The project switcher dropdown uses `blue-*` for selection/focus states instead of `forge-accent`.

**Fix:** Replace `blue-*` → `forge-accent-*`.

---

## P2 — Nice-to-Have

### P2-1: Inventory Components (155+ gray across 6 files)
**Files:** `src/components/inventory/*.tsx`

| File | Count |
|------|-------|
| `AddInventoryItemModal.tsx` | 40 |
| `InventoryList.tsx` | 36 |
| `InventorySidebar.tsx` | 21 |
| `CategoryManagement.tsx` | 21 |
| `InventoryView.tsx` | 8 |
| `BarcodeScanner.tsx` | 3 |

This is documented as in-progress feature work in CLAUDE.md. Not worth fixing until the feature stabilizes.

### P2-2: Editor/Node Misc Gray Usage (~50 across 15 files)
**Files:** Various under `src/components/editor/`, `src/components/nodes/`

Scattered gray references in markdown editor theming (`theme.ts`: 32), wiki link preview, broken links badge, node list items, empty states. Lower visibility than detail panel/sidebar issues.

### P2-3: Debug Component (28 gray, 2 blue)
**File:** `src/components/debug/DebugProjectView.tsx`

Debug view is dev-only, not user-facing. Lowest priority.

---

## Positive Findings (Well-Themed Components)

These components have **zero raw gray/blue classes** and serve as the gold standard:

| Component | Screenshot | Notes |
|-----------|-----------|-------|
| **Kanban View** | `12-kanban-view.png` | Recently redesigned. Warm columns, monospace headers, amber badges. Perfect. |
| **Graph Nodes** | `09-graph-view.png`, `10-graph-fitted.png` | Type-colored borders, warm status badges, engineering grid background. |
| **Context Menu** | `11-graph-context-menu.png` | Warm cream background, monospace label, red delete option. |
| **Command Palette** | `13-command-palette.png` | Type-colored icons, warm backdrop, warm status badges, keyboard hints. |
| **Export Dialog** | `14-export-dialog.png` | Amber selection border, monospace labels, amber download button, themed checkboxes. |
| **Delete Confirmation** | `15-delete-confirmation.png` | Warm cream background, node type icon, red destructive button. |
| **Create Project Dialog** | `03-create-project-dialog.png` | Amber focus ring, warm background, monospace labels. |
| **Landing Page** | `01-landing-light.png` | Amber left-border accents, warm cream background, monospace headings. |
| **Outline Section Headers** | `04-outline-light.png` | Warm section headers with type icons, status badges use warm colors. |

---

## Recommended Fix Order

1. **AppShell.tsx sidebar + mobile header** (P0-2, P0-3) — 8 line changes, highest visual impact
2. **Dark mode investigation** (P0-1) — Root cause analysis needed for Tailwind v4 `dark:` in `@layer base`
3. **Filter components** (P1-1) — 45 gray→forge replacements across 7 files
4. **Blue→amber focus rings** (P1-2) — Global `ring-blue-500`→`ring-forge-accent` across ~21 locations
5. **Detail panel forms** (P1-3) — 218 replacements across 14 files (consider shared utility classes)
6. **ComparisonTable** (P1-4) — 72 replacements in one file
7. **QuickProjectSwitcher** (P1-5) — 22 replacements in one file

Steps 1-4 would fix all visually obvious inconsistencies. Steps 5-7 address forms that only appear when editing nodes.

---

## Screenshot Index

| # | Filename | Description |
|---|----------|-------------|
| 1 | `01-landing-light.png` | Landing page, light mode |
| 2 | `02-landing-dark.png` | Landing page, dark mode (identical — broken) |
| 3 | `03-create-project-dialog.png` | Create project dialog |
| 4 | `04-outline-light.png` | Outline view with sidebar |
| 5 | `05-outline-dark.png` | Outline dark mode (identical — broken) |
| 6 | `06-detail-panel-task.png` | Task detail panel |
| 7 | `07-detail-panel-decision.png` | Decision detail panel with comparison table |
| 8 | `08-detail-panel-component.png` | Component detail panel with cost/supplier fields |
| 9 | `09-graph-view.png` | Graph view, close-up of nodes |
| 10 | `10-graph-fitted.png` | Graph view, all 19 nodes fitted |
| 11 | `11-graph-context-menu.png` | Graph node context menu |
| 12 | `12-kanban-view.png` | Kanban board with 4 columns |
| 13 | `13-command-palette.png` | Command palette with search results |
| 14 | `14-export-dialog.png` | Export dialog with format selection |
| 15 | `15-delete-confirmation.png` | Delete node confirmation alert |
| 16 | `16-sidebar-filters.png` | Sidebar with filters expanded |
| 17 | `17-mobile-outline.png` | Mobile 375px with sidebar overlay |
| 18 | `18-mobile-outline-no-sidebar.png` | Mobile outline without sidebar |

---

## Additional Notes

### React Console Errors
When opening the delete confirmation dialog, 4 React DOM nesting errors were logged:
- "In HTML, `<p>` cannot be a descendant of `<p>`"
- "`<div>` cannot contain a nested `<button>`"

These are not design issues but should be addressed for correctness.

### Sidebar Overlay on Mobile
At 375px width, the sidebar opens as a fixed overlay but intercepts pointer events for the hamburger close button, making it difficult to dismiss. This is a UX bug separate from the design token issue.
