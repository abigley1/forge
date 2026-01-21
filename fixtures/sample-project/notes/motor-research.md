---
type: note
tags: ["research", "electronics", "motor"]
created: "2026-01-15T09:00:00Z"
modified: "2026-01-18T15:30:00Z"
---

# Motor Research

Research notes comparing different motor options for the [[motor-selection]] decision.

## NEMA 17 Steppers

### Pros
- Low cost ($10-20)
- Widely available
- Good community support
- Simple control (step/dir)

### Cons
- Lower torque (40-60 Ncm)
- Can miss steps under load
- Runs hot at high current

### Candidate: [[nema17-stepper]]

The 17HS4401 from StepperOnline looks like a good option.

## NEMA 23 Steppers

### Pros
- Higher torque (85-190 Ncm)
- Better for heavier loads
- More holding power

### Cons
- Larger size
- Higher cost ($30-50)
- Requires bigger drivers

## Servo Motors

### Pros
- Closed loop control
- No missed steps
- High speed capability

### Cons
- Much higher cost ($100+)
- Complex control
- Overkill for this application?

## Recommendation

For this project's requirements (see [[project-overview]]), I recommend starting with NEMA 17 steppers:

1. Meets torque requirements
2. Within budget
3. Simple to control
4. Can upgrade to NEMA 23 later if needed

## References

- [Stepper Motor Basics](https://example.com/stepper-basics)
- [NEMA Standards](https://example.com/nema-standards)
- [CNC Router Motor Sizing](https://example.com/motor-sizing)
