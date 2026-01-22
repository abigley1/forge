import { NodeType } from './nodes'
import type {
  DecisionStatus,
  ComponentStatus,
  TaskStatus,
  TaskPriority,
} from './nodes'

/**
 * Frontmatter values that can be pre-filled by a template.
 * Uses Partial types to allow templates to specify only some fields.
 *
 * NOTE: Fields should match the template's node type:
 * - Decision templates: use `status` (DecisionStatus)
 * - Component templates: use `componentStatus`, `cost`, `supplier`, `partNumber`
 * - Task templates: use `taskStatus`, `priority`
 * - Note templates: only `tags` is applicable
 *
 * Mixing fields from different types is allowed but has no effect.
 */
export interface TemplateFrontmatter {
  // Common fields
  tags?: string[]

  // Decision-specific (use only for type: 'decision')
  status?: DecisionStatus

  // Component-specific (use only for type: 'component')
  componentStatus?: ComponentStatus
  cost?: number | null
  supplier?: string | null
  partNumber?: string | null

  // Task-specific (use only for type: 'task')
  taskStatus?: TaskStatus
  priority?: TaskPriority
}

/**
 * A template for creating new nodes.
 * Templates can specify both content and initial frontmatter values.
 */
export interface NodeTemplate {
  /** Unique identifier for the template */
  id: string
  /** Display name */
  name: string
  /** Brief description of what this template is for */
  description: string
  /** The node type this template applies to */
  type: NodeType
  /** Initial markdown content for the node body */
  content?: string
  /** Initial frontmatter values to pre-fill */
  frontmatter?: TemplateFrontmatter
  /** Whether this is a built-in template (cannot be deleted or modified) */
  isBuiltIn: boolean
}

/**
 * Input for creating a new custom template
 */
export interface CreateTemplateInput {
  name: string
  description: string
  type: NodeType
  content?: string
  frontmatter?: TemplateFrontmatter
}

/**
 * Input for updating an existing template
 */
export interface UpdateTemplateInput {
  name?: string
  description?: string
  content?: string
  frontmatter?: TemplateFrontmatter
}

// ============================================================================
// Built-in Templates
// ============================================================================

/**
 * Pre-defined decision templates
 */
export const DECISION_TEMPLATES: NodeTemplate[] = [
  {
    id: 'decision-blank',
    name: 'Blank Decision',
    description: 'Start with an empty decision',
    type: NodeType.Decision,
    isBuiltIn: true,
  },
  {
    id: 'decision-component-selection',
    name: 'Component Selection',
    description: 'Compare components or parts',
    type: NodeType.Decision,
    isBuiltIn: true,
    content: `## Context

Describe the problem or need this decision addresses.

## Options

List the options being considered.

## Criteria

What factors matter for this decision?

## Conclusion

Document the final decision and rationale.
`,
  },
  {
    id: 'decision-design-choice',
    name: 'Design Choice',
    description: 'Evaluate design alternatives',
    type: NodeType.Decision,
    isBuiltIn: true,
    content: `## Background

What design challenge are you solving?

## Alternatives

1. Option A
2. Option B
3. Option C

## Analysis

Compare the tradeoffs of each alternative.

## Decision

Selected approach and reasoning.
`,
  },
  {
    id: 'decision-vendor-selection',
    name: 'Vendor Selection',
    description: 'Compare vendors or suppliers',
    type: NodeType.Decision,
    isBuiltIn: true,
    content: `## Requirements

What are the key requirements for the vendor?

## Candidates

### Vendor A
- Website:
- Pricing:
- Lead time:
- Notes:

### Vendor B
- Website:
- Pricing:
- Lead time:
- Notes:

### Vendor C
- Website:
- Pricing:
- Lead time:
- Notes:

## Evaluation Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Price | | |
| Quality | | |
| Lead Time | | |
| Support | | |
| Reliability | | |

## Recommendation

Selected vendor and rationale.
`,
  },
]

/**
 * Pre-defined component templates
 */
export const COMPONENT_TEMPLATES: NodeTemplate[] = [
  {
    id: 'component-blank',
    name: 'Blank Component',
    description: 'Start with an empty component',
    type: NodeType.Component,
    isBuiltIn: true,
  },
  {
    id: 'component-electronic',
    name: 'Electronic Part',
    description: 'Template for electronic components',
    type: NodeType.Component,
    isBuiltIn: true,
    content: `## Specifications

- Voltage:
- Current:
- Package:

## Datasheet

[Link to datasheet]

## Notes

`,
  },
  {
    id: 'component-mechanical',
    name: 'Mechanical Part',
    description: 'Template for mechanical parts',
    type: NodeType.Component,
    isBuiltIn: true,
    content: `## Dimensions

- Length:
- Width:
- Height:
- Weight:

## Material

## Notes

`,
  },
]

/**
 * Pre-defined task templates
 */
export const TASK_TEMPLATES: NodeTemplate[] = [
  {
    id: 'task-blank',
    name: 'Blank Task',
    description: 'Start with an empty task',
    type: NodeType.Task,
    isBuiltIn: true,
  },
  {
    id: 'task-with-checklist',
    name: 'Task with Checklist',
    description: 'Task with subtasks',
    type: NodeType.Task,
    isBuiltIn: true,
    content: `## Description

What needs to be done?

## Checklist

- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

## Notes

`,
  },
]

/**
 * Pre-defined note templates
 */
export const NOTE_TEMPLATES: NodeTemplate[] = [
  {
    id: 'note-blank',
    name: 'Blank Note',
    description: 'Start with an empty note',
    type: NodeType.Note,
    isBuiltIn: true,
  },
  {
    id: 'note-research',
    name: 'Research Note',
    description: 'Document research findings',
    type: NodeType.Note,
    isBuiltIn: true,
    content: `## Summary

Brief overview of the topic.

## Key Findings

- Finding 1
- Finding 2

## Sources

- [Source 1]()
- [Source 2]()

## Related

Link to related nodes.
`,
  },
]

/**
 * All built-in templates organized by type
 */
export const BUILT_IN_TEMPLATES: Record<NodeType, NodeTemplate[]> = {
  [NodeType.Decision]: DECISION_TEMPLATES,
  [NodeType.Component]: COMPONENT_TEMPLATES,
  [NodeType.Task]: TASK_TEMPLATES,
  [NodeType.Note]: NOTE_TEMPLATES,
}

/**
 * Get all built-in templates as a flat array
 */
export function getAllBuiltInTemplates(): NodeTemplate[] {
  return [
    ...DECISION_TEMPLATES,
    ...COMPONENT_TEMPLATES,
    ...TASK_TEMPLATES,
    ...NOTE_TEMPLATES,
  ]
}

/**
 * Get built-in templates for a specific node type
 */
export function getBuiltInTemplatesForType(type: NodeType): NodeTemplate[] {
  return BUILT_IN_TEMPLATES[type]
}

/**
 * Find a built-in template by ID
 */
export function findBuiltInTemplate(id: string): NodeTemplate | undefined {
  return getAllBuiltInTemplates().find((t) => t.id === id)
}
