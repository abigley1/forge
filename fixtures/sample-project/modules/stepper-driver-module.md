---
type: module
status: planning
parent: motion-system
tags: ["electronics", "control"]
created: "2026-01-14T10:00:00Z"
modified: "2026-01-18T09:15:00Z"
requirements:
  - "Drive 4 stepper motors simultaneously"
  - "Support microstepping up to 1/32"
  - "Current rating: 2A per phase minimum"
---

# Stepper Driver Module

Electronics module for driving all stepper motors in the motion system.

## Overview

This module handles the interface between the motion controller and the physical stepper motors.

## Key Specifications

| Parameter | Requirement |
|-----------|-------------|
| Channels | 4 |
| Max current | 2A/phase |
| Microstepping | 1/32 |
| Input voltage | 12-24V |

## Component Options

Considering:
- TMC2209 drivers (quiet, good microstepping)
- A4988 drivers (budget option)
- DRV8825 drivers (higher current)

## Integration

Connects to:
- [[motion-system]] - Parent subsystem
- All axis motors including [[nema17-stepper]]

## Parent

Part of [[motion-system]] subsystem.
