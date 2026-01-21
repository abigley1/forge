---
type: decision
status: selected
selected: opt-2
tags: ["mechanical", "frame"]
created: "2026-01-10T08:00:00Z"
modified: "2026-01-17T16:45:00Z"
options:
  - {"id": "opt-1", "name": "3D Printed ABS", "values": {"strength": 3, "cost": 10, "weight": "light"}}
  - {"id": "opt-2", "name": "Aluminum Extrusion", "values": {"strength": 9, "cost": 50, "weight": "medium"}}
  - {"id": "opt-3", "name": "Steel Frame", "values": {"strength": 10, "cost": 80, "weight": "heavy"}}
criteria:
  - {"id": "crit-1", "name": "Strength", "weight": 9}
  - {"id": "crit-2", "name": "Cost", "weight": 7, "unit": "$"}
  - {"id": "crit-3", "name": "Weight", "weight": 5}
---

# Enclosure Material

Decision on what material to use for the main enclosure and frame structure.

## Selected Option

We've selected **Aluminum Extrusion** as the best balance of strength, cost, and ease of assembly.

## Rationale

- Provides excellent structural rigidity
- Easy to modify and extend
- Standard T-slot allows easy mounting of components
- Reasonable cost for the strength provided

## Related

- [[aluminum-extrusion]] - The selected component
- [[design-frame]] - Frame design task
- [[project-overview]] - Overall project context
