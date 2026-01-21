---
type: decision
status: pending
tags: ["electronics", "motor"]
created: "2026-01-15T10:00:00Z"
modified: "2026-01-18T14:30:00Z"
options:
  - {"id": "opt-1", "name": "NEMA 17 Stepper", "values": {"torque": 45, "cost": 15, "availability": "high"}}
  - {"id": "opt-2", "name": "NEMA 23 Stepper", "values": {"torque": 85, "cost": 35, "availability": "medium"}}
  - {"id": "opt-3", "name": "Servo Motor", "values": {"torque": 60, "cost": 120, "availability": "low"}}
criteria:
  - {"id": "crit-1", "name": "Torque", "weight": 8, "unit": "Nm"}
  - {"id": "crit-2", "name": "Cost", "weight": 6, "unit": "$"}
  - {"id": "crit-3", "name": "Availability", "weight": 5}
---

# Motor Selection

We need to select a motor for the main axis drive system. The motor will be responsible for moving the gantry along the X axis.

## Requirements

- Minimum torque: 40 Nm
- Budget: Under $50
- Must be readily available

## Research

See [[motor-research]] for detailed research notes on each option.

## Implications

This decision will affect:
- [[design-frame]] - Frame dimensions depend on motor size
- [[order-parts]] - Need to order the selected motor

## Notes

The NEMA 17 seems like a good balance of cost and torque for our application. The [[nema17-stepper]] component has been added for reference.
