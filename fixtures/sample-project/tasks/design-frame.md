---
type: task
status: in_progress
priority: high
depends_on: ["enclosure-material"]
blocks: ["order-parts"]
tags: ["mechanical", "cad"]
created: "2026-01-11T10:00:00Z"
modified: "2026-01-19T08:30:00Z"
checklist:
  - {"id": "chk-1", "text": "Create initial sketch with dimensions", "completed": true}
  - {"id": "chk-2", "text": "Model frame in CAD", "completed": true}
  - {"id": "chk-3", "text": "Add motor mounts", "completed": false}
  - {"id": "chk-4", "text": "Design cable routing", "completed": false}
  - {"id": "chk-5", "text": "Generate BOM", "completed": false}
---

# Design Frame

Design the main frame structure using the selected [[aluminum-extrusion]] material.

## Objectives

1. Create a rigid frame that minimizes vibration
2. Allow easy access for maintenance
3. Provide mounting points for all components
4. Keep overall footprint under 24" x 24"

## Progress

- [x] Initial sketch complete
- [x] Basic CAD model done
- [ ] Need to add motor mounts after [[motor-selection]] is finalized
- [ ] Cable routing channels

## Blocking

This task blocks [[order-parts]] because we need the final BOM before ordering.

## Dependencies

Depends on [[enclosure-material]] being decided (now complete).

## Files

- `frame-v1.step` - Current CAD model
- `frame-sketch.pdf` - Initial hand sketch
