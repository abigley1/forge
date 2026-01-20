# Forge

A personal project brainstorming, planning, and tracking tool for complex hardware and engineering projects.

## Overview

Forge is a connected knowledge base for managing complex projects like automated potato guns, TVC-controlled rockets, and other multi-domain engineering efforts. It combines the graph-based linking of Obsidian with the structured data capabilities of Notion, all stored as git-friendly files.

**Target User:** Solo maker/engineer working on complex hardware projects involving 3D design, PCB design, component selection, and system architecture.

## Core Concepts

### Node Types

All content in Forge is organized as **nodes** that can be linked together:

| Type | Purpose | Key Features |
|------|---------|--------------|
| **Decision** | Compare options and make choices | Side-by-side comparison table, custom spec fields, selected/pending status |
| **Component** | Track specific parts | Specs, cost, supplier links, datasheets, related components |
| **Task** | Things to do | Status, dependencies on decisions/other tasks, milestones |
| **Note** | Freeform ideas | Rich text, brainstorming, design rationale |

### Relationships & Dependencies

- **Full DAG (Directed Acyclic Graph)** dependency system
- Tasks can be blocked by unresolved decisions or incomplete tasks
- Visual critical path highlighting
- Dependency chains across node types (e.g., "Order parts" task depends on "Stepper motor choice" decision)

### Dual View System

1. **Graph View** - Visual canvas with draggable nodes and visible connections
2. **Outline View** - Hierarchical tree/list view for structured navigation

Users can switch between views freely; both reflect the same underlying data.

## Architecture

### Platform
- **Web application** (browser-based)
- **React + TypeScript**
- Online-only (no offline requirements)

### Data Storage
- **Git-based** file storage
- Human-readable formats (Markdown + YAML frontmatter, JSON)
- Each project is a folder within a workspace
- Version history via git

### File Structure
```
forge-workspace/
├── .forge/
│   ├── config.json          # Workspace settings
│   └── templates/           # Node templates
├── project-potato-gun/
│   ├── project.json         # Project metadata
│   ├── decisions/
│   │   └── stepper-motor-choice.md
│   ├── components/
│   │   └── nema17-stepper.md
│   ├── tasks/
│   │   └── order-electronics.md
│   └── notes/
│       └── firing-mechanism-ideas.md
└── project-tvc-rocket/
    └── ...
```

## Features

### Decision Nodes

Decisions use a **comparison table** format:

```markdown
---
type: decision
status: pending | selected
selected: option-2
tags: [electronics, motor]
---

# Stepper Motor Choice

## Context
Need a stepper motor for the barrel rotation mechanism. Must handle X torque at Y speed.

## Options

| Criteria | NEMA 17 (Option 1) | NEMA 23 (Option 2) | Servo Alternative |
|----------|-------------------|-------------------|-------------------|
| Torque | 0.5 Nm | 1.2 Nm | 0.8 Nm |
| Cost | $15 | $35 | $45 |
| Weight | 280g | 570g | 320g |
| Driver | A4988 | TB6600 | Included |
| **Score** | 6/10 | 8/10 | 7/10 |

## Decision
[Selected: NEMA 23 - better torque margin for reliability]

## Implications
- [[driver-choice]] - Need TB6600 driver
- [[power-supply]] - Requires 24V supply
```

### Component Nodes

```markdown
---
type: component
status: selected | considering | rejected
cost: 35.00
supplier: amazon
part_number: 17HS4401
tags: [electronics, motor]
custom_fields:
  torque: 1.2 Nm
  voltage: 24V
  weight: 570g
---

# NEMA 23 Stepper Motor

## Specs
- Torque: 1.2 Nm
- Step angle: 1.8°
- Voltage: 24V
- Current: 2A/phase

## Links
- [Datasheet](./datasheets/nema23.pdf)
- [Supplier](https://amazon.com/...)

## Related
- Requires: [[tb6600-driver]]
- Requires: [[24v-power-supply]]
- Used in: [[barrel-rotation-assembly]]
- Decided by: [[stepper-motor-choice]]
```

### Task Nodes

```markdown
---
type: task
status: pending | in_progress | blocked | complete
priority: high | medium | low
depends_on:
  - stepper-motor-choice
  - driver-choice
blocks:
  - assemble-electronics
tags: [procurement]
---

# Order Electronics

## Description
Order all electronic components once selections are finalized.

## Checklist
- [ ] Stepper motor
- [ ] Driver board
- [ ] Power supply
- [ ] Wiring/connectors

## Notes
Check if supplier has bundle deals.
```

### Note Nodes

```markdown
---
type: note
tags: [design, brainstorm]
---

# Firing Mechanism Ideas

Freeform markdown content...

## Option A: Pneumatic
...

## Option B: Spring-loaded
...

## Related
- [[air-compressor-choice]]
- [[barrel-design]]
```

### Auto-Linking

- When typing `[[`, suggest existing nodes
- Detect mentions of node names in text and suggest converting to links
- Backlinks section shows all nodes that link to current node

### Graph View Features

- Draggable node positioning (positions saved per-project)
- Color coding by node type
- Visual distinction for dependency vs. reference links
- Filter by node type, tag, or status
- Zoom and pan
- Critical path highlighting for tasks
- Cluster related nodes

### Outline View Features

- Collapsible tree structure
- Sort by: type, status, date modified, custom
- Filter by tags, status, type
- Quick status toggles
- Drag-and-drop reorganization

## Import/Export

| Format | Export | Import | Use Case |
|--------|--------|--------|----------|
| Markdown | Yes | Yes | Human-readable docs, sharing |
| JSON | Yes | Yes | Backup, migration, programmatic access |
| CSV | Yes | No | BOMs, spreadsheet analysis, part ordering |

### CSV Export for Components
```csv
name,type,status,cost,supplier,part_number,torque,voltage
NEMA 23 Stepper,component,selected,35.00,amazon,17HS4401,1.2 Nm,24V
TB6600 Driver,component,selected,12.00,amazon,TB6600,,,
```

## User Interface

### Inspiration
- **Obsidian**: Graph view, `[[wiki-links]]`, local-first philosophy
- **Notion**: Clean UI, flexible structured data, comparison tables

### Key UI Elements

1. **Sidebar**
   - Project switcher
   - Node type filters
   - Tag cloud
   - Quick create buttons
   - Fully keyboard navigable

2. **Main Canvas**
   - Toggle between Graph/Outline views
   - Node detail panel (slide-out or split view)
   - Skip link to main content area
   - Keyboard shortcuts for common actions

3. **Node Editor**
   - Rich markdown editor
   - Frontmatter UI for structured fields
   - Link autocomplete with `aria-live` announcements
   - Comparison table builder (for decisions)
   - Inline error display next to fields
   - Unsaved changes warning on navigation

4. **Command Palette** (Base UI Dialog)
   - Quick node creation
   - Navigation
   - View switching
   - Full keyboard support (arrow keys, Enter, Escape)
   - `aria-label` and proper focus management

5. **Graph View**
   - Minimum 44×44px touch targets for nodes
   - Keyboard navigation between nodes
   - Screen reader announcements for connections
   - `prefers-reduced-motion` respected for animations

6. **Confirmations**
   - AlertDialog for destructive actions (delete node, clear data)
   - Undo available for bulk operations

## Technical Implementation

### Frontend Stack
See **UI Implementation Standards → Frontend Stack (Expanded)** for complete details.

- React 18+ with TypeScript
- Tailwind CSS + tw-animate-css + cn utility
- Base UI for accessible primitives
- motion/react for JS animation
- React Flow for graph visualization
- Zustand/Jotai for state + nuqs for URL state
- MDX or Remark for markdown

### Data Layer
- File-based storage (no database)
- Read/write via File System Access API or local server
- Parse markdown + YAML frontmatter
- Build in-memory graph on load
- Watch for file changes

### Git Integration
- Files designed for clean diffs
- Optional: built-in git commit on save
- Works with any git workflow (manual commits, auto-commit, etc.)

## UI Implementation Standards

### Frontend Stack (Expanded)
- React 18+ with TypeScript
- **Styling:** Tailwind CSS + `tw-animate-css` for entrance/micro-animations
- **Class Logic:** `cn` utility (`clsx` + `tailwind-merge`)
- **Accessible Primitives:** Base UI for keyboard/focus behaviors (dialogs, menus, tooltips)
- **Animation:** `motion/react` when JS animation required
- **State:** Zustand or Jotai for app state; `nuqs` for URL state sync
- **Graph:** React Flow
- **Markdown:** MDX or Remark

### Accessibility (WCAG 2.1)

#### Required
- All `<img>` elements require `alt` attribute (empty `alt=""` for decorative)
- Icon-only buttons require `aria-label`
- Form inputs require associated `<label>` or `aria-label`
- Use semantic HTML (`<button>`, `<a>`, `<nav>`, `<main>`) before ARIA
- Heading hierarchy must be sequential (no h1 → h3 skips)
- Skip link to main content
- Touch targets minimum 44×44px
- Color-only status indication prohibited—pair with icon/text

#### Keyboard Navigation
- All interactive elements keyboard-accessible
- Visible focus states using `focus-visible:ring-*`
- Never remove `outline` without visible replacement
- Use `:focus-visible` over `:focus` (avoid focus ring on click)
- Interactive elements need `onKeyDown`/`onKeyUp` handlers

#### Screen Readers
- Async updates (toasts, validation) use `aria-live="polite"`
- Decorative icons use `aria-hidden="true"`
- Use Base UI primitives—never rebuild keyboard/focus behavior by hand

### Animation Constraints

- **Only animate compositor properties:** `transform`, `opacity`
- **Never animate layout properties:** `width`, `height`, `top`, `left`, `margin`, `padding`
- **Avoid paint properties** except for small UI (text, icons): `background`, `color`
- Maximum **200ms** for interaction feedback
- Use `ease-out` for entrances (Tailwind default)
- Honor `prefers-reduced-motion` (provide reduced variant or disable)
- No custom easing curves unless explicitly requested
- Pause looping animations when off-screen
- Never apply `will-change` outside active animation
- Animations must be interruptible—respond to user input mid-animation
- Never use `transition: all`—list properties explicitly

### Visual Design

- **No gradients** unless explicitly requested
- **No purple or multicolor gradients**
- **No glow effects** as primary affordances
- Use Tailwind CSS default shadow scale
- Limit accent color to one per view
- Use existing theme/Tailwind color tokens before introducing new ones

### Forms

- Inputs need `autocomplete` and meaningful `name` attributes
- Use correct `type` (`email`, `tel`, `url`, `number`) and `inputmode`
- Never block paste (`onPaste` + `preventDefault`)
- Labels clickable via `htmlFor` or wrapping control
- Disable spellcheck on codes/usernames (`spellCheck={false}`)
- Checkboxes/radios: label + control share single hit target (no dead zones)
- Submit button stays enabled until request starts; show spinner during request
- **Errors inline** next to fields; focus first error on submit
- Placeholders end with `…` and show example pattern
- Warn before navigation with unsaved changes (`beforeunload` or router guard)

### Destructive Actions

- Use `AlertDialog` (Base UI) for irreversible actions (delete node, clear project)
- Provide confirmation modal or undo window—never immediate delete
- Destructive buttons visually distinct (red/danger styling)

### Loading & Empty States

- Use **structural skeletons** for loading (not spinners)
- Empty states must include **one clear next action**
- Loading text ends with `…`: "Loading…", "Saving…"
- Handle empty arrays/strings gracefully—never render broken UI

### Layout

- Use `h-dvh` not `h-screen` for full-height layouts
- Fixed/sticky elements must respect `env(safe-area-inset-*)`
- Use a **fixed z-index scale** (no arbitrary `z-[999]` values)
- Use `size-*` for square elements instead of `w-*` + `h-*`
- Flex children need `min-w-0` to allow text truncation
- Avoid unwanted scrollbars: fix content overflow
- Use `overscroll-behavior: contain` in modals/drawers

### Typography

- `text-balance` for headings
- `text-pretty` for body paragraphs
- `tabular-nums` for numeric data (costs, scores, dates)
- Use `truncate` or `line-clamp-*` for dense UI
- Never modify `letter-spacing` unless explicitly requested
- **Punctuation:** proper ellipsis `…` not `...`, curly quotes `"` `"` not straight `"`
- Non-breaking spaces for units: `10&nbsp;MB`, `⌘&nbsp;K`

### Content & Copy

- Active voice: "Create a node" not "A node will be created"
- Title Case for headings/buttons (Chicago style)
- Numerals for counts: "8 tasks" not "eight tasks"
- Specific button labels: "Save Component" not "Continue"
- Error messages include fix/next step, not just problem
- Second person ("you"); avoid first person ("I", "we")
- `&` over "and" where space-constrained

### Performance

- **Virtualize lists >50 items** (node lists, search results) using `virtua` or `content-visibility: auto`
- No layout reads in render (`getBoundingClientRect`, `offsetHeight`, `scrollTop`)
- Batch DOM reads/writes; avoid interleaving
- Prefer uncontrolled inputs; controlled inputs must be cheap per keystroke
- Never animate large `blur()` or `backdrop-filter` surfaces
- Never use `useEffect` for anything expressible as render logic

### Images

- Explicit `width` and `height` on `<img>` (prevents CLS)
- Below-fold images: `loading="lazy"`
- Above-fold critical images: `priority` or `fetchpriority="high"`
- `<link rel="preconnect">` for CDN/asset domains

### URL State

- URL reflects app state: active project, selected node, view mode, filters
- All stateful UI deep-linkable (if it uses `useState`, consider URL sync)
- Use `<a>`/`<Link>` for navigation (supports Cmd/Ctrl+click, middle-click)
- Filters, tabs, pagination, expanded panels in query params

### Touch & Mobile

- `touch-action: manipulation` (prevents double-tap zoom delay)
- Set `-webkit-tap-highlight-color` intentionally
- `autoFocus` sparingly—desktop only, single primary input; avoid on mobile
- During drag: disable text selection, `inert` on dragged elements

### Dark Mode

- `color-scheme: dark` on `<html>` when dark theme active
- `<meta name="theme-color">` matches page background
- Native `<select>`: explicit `background-color` and `color` (Windows dark mode fix)

### Internationalization

- Dates via `Intl.DateTimeFormat` (no hardcoded formats)
- Numbers/currency via `Intl.NumberFormat`
- Detect language via `Accept-Language` / `navigator.languages`, not IP

### Anti-Patterns (Prohibited)

- `user-scalable=no` or `maximum-scale=1` disabling zoom
- `onPaste` with `preventDefault`
- `transition: all`
- `outline-none` without `focus-visible` replacement
- `<div onClick>` or `<span onClick>` for buttons (use `<button>`)
- Images without dimensions
- Form inputs without labels
- Icon buttons without `aria-label`
- Hardcoded date/number formats
- Mixing primitive systems (e.g., Radix + React Aria in same component)

## Project Organization

**Workspace Model:**
- Single Forge instance manages multiple projects
- Each project is a folder
- Projects can be in same or different git repos
- Workspace config stored in `.forge/` directory

## MVP Scope

Building the full vision from the start:

### Phase 1: Foundation
- [ ] Project/workspace structure
- [ ] All four node types with frontmatter
- [ ] Basic markdown editor
- [ ] Wiki-link syntax and parsing
- [ ] Outline view with filtering

### Phase 2: Graph & Dependencies
- [ ] Graph visualization
- [ ] Drag-and-drop positioning
- [ ] DAG dependency logic
- [ ] Blocked status propagation
- [ ] Critical path calculation

### Phase 3: Decision Tools
- [ ] Comparison table builder
- [ ] Custom field definitions
- [ ] Option scoring

### Phase 4: Polish
- [ ] Auto-link suggestions
- [ ] All export formats
- [ ] Templates
- [ ] Command palette
- [ ] Search

## Future Considerations (Post-MVP)

- Offline support via service worker
- Sharing/export as static site
- Plugin system for custom node types
- Mobile companion app
- AI-assisted linking suggestions

---

*Forge: Where ideas get shaped into reality.*
