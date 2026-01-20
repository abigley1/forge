# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Forge is a personal project brainstorming, planning, and tracking tool for complex hardware and engineering projects. It combines graph-based linking (like Obsidian) with structured data (like Notion), stored as git-friendly files.

**Target user:** Solo maker/engineer working on complex hardware projects (3D design, PCB design, component selection, system architecture).

## Current State

This is a greenfield project in early development. The repository contains:
- `spec.md` - Full product specification
- `SPRINT_PLAN.md` - Detailed task breakdown across 12 sprints
- `PRD.json` - Machine-readable version of the sprint plan
- `ralph.sh` - Automated development loop script

## Tech Stack (Planned)

- **Framework:** React 18+ with TypeScript (Vite)
- **Styling:** Tailwind CSS + tw-animate-css + `cn` utility (clsx + tailwind-merge)
- **Components:** Base UI for accessible primitives
- **Animation:** motion/react (only transform/opacity, max 200ms for feedback)
- **State:** Zustand or Jotai for app state; nuqs for URL state sync
- **Graph:** React Flow
- **Markdown:** MDX or Remark with gray-matter for YAML frontmatter
- **Validation:** Zod for runtime validation

## Architecture

### Node Types
All content is organized as **nodes** that link together:
- **Decision** - Compare options with scoring tables, pending/selected status
- **Component** - Parts with specs, cost, supplier links
- **Task** - Things to do with dependencies, DAG-based blocking
- **Note** - Freeform markdown content

### File Structure
```
forge-workspace/
├── .forge/
│   ├── config.json          # Workspace settings
│   └── templates/           # Node templates
├── project-name/
│   ├── project.json         # Project metadata
│   ├── decisions/           # Decision nodes as .md files
│   ├── components/          # Component nodes
│   ├── tasks/               # Task nodes
│   └── notes/               # Note nodes
```

### Data Format
Nodes are markdown files with YAML frontmatter:
```markdown
---
type: task
status: pending | in_progress | blocked | complete
priority: high | medium | low
depends_on: [node-id-1, node-id-2]
tags: [electronics, motor]
---
# Node Title
Markdown content...
```

## Development Commands

Once the project is initialized:
```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run test         # Run Vitest tests
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

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
