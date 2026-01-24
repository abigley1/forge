---
type: assembly
status: planning
parent: motion-system
tags: ["mechanical", "linear-motion"]
created: "2026-01-12T14:00:00Z"
modified: "2026-01-19T16:30:00Z"
requirements:
  - "Travel distance: 300mm"
  - "Support gantry weight: 5kg"
  - "Backlash under 0.02mm"
---

# X-Axis Assembly

The X-axis assembly provides linear motion for the gantry along the machine's width.

## Components

- [[nema17-stepper]] - Drive motor
- [[aluminum-extrusion]] - Rail mounting
- Linear rail (to be selected)
- Lead screw or belt drive (to be decided)

## Design Considerations

1. Belt vs lead screw drive
2. Supported vs unsupported rail
3. Motor mounting position

## Related Tasks

- [[design-frame]] - Frame must accommodate this assembly

## Parent

Part of [[motion-system]] subsystem.
