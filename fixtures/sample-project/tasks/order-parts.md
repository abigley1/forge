---
type: task
status: blocked
priority: medium
depends_on: ["design-frame", "motor-selection"]
tags: ["procurement"]
created: "2026-01-14T14:00:00Z"
modified: "2026-01-18T11:00:00Z"
checklist:
  - {"id": "chk-1", "text": "Finalize BOM from frame design", "completed": false}
  - {"id": "chk-2", "text": "Get quotes from suppliers", "completed": false}
  - {"id": "chk-3", "text": "Place order for aluminum extrusion", "completed": false}
  - {"id": "chk-4", "text": "Place order for motors", "completed": false}
  - {"id": "chk-5", "text": "Order fasteners and hardware", "completed": false}
---

# Order Parts

Place orders for all mechanical and electrical components.

## Status

Currently **blocked** waiting on:
- [[design-frame]] - Need final BOM
- [[motor-selection]] - Need to know which motor to order

## Components to Order

### From Decision: [[enclosure-material]]
- [[aluminum-extrusion]] - Main frame material

### From Decision: [[motor-selection]]
- Motor (TBD) - Waiting on decision

### Hardware
- T-nuts and bolts
- Corner brackets
- End caps

## Budget

| Category | Estimate |
|----------|----------|
| Frame | $150 |
| Motors | $50-200 |
| Hardware | $30 |
| **Total** | **$230-380** |

## Notes

See [[project-overview]] for overall budget constraints.
