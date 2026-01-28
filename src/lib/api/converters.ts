/**
 * API Type Converters
 *
 * Converts between API types (snake_case, ISO strings) and
 * application types (camelCase, Date objects).
 */

import type { ApiNode, CreateNodeInput, UpdateNodeInput } from './types.js'
import type {
  ForgeNode,
  TaskNode,
  ComponentNode,
  DecisionNode,
  NoteNode,
  SubsystemNode,
  AssemblyNode,
  ModuleNode,
  NodeDates,
  ChecklistItem,
  DecisionOption,
  DecisionCriterion,
  TaskStatus,
  TaskPriority,
  DecisionStatus,
  ComponentStatus,
  ContainerStatus,
} from '@/types/nodes'

/**
 * Comparison data stored in the API for decision nodes
 */
interface DecisionComparisonData {
  options?: DecisionOption[]
  criteria?: DecisionCriterion[]
}

/**
 * Convert ISO date string to Date object
 */
function parseDate(isoString: string): Date {
  return new Date(isoString)
}

/**
 * Convert Date object to ISO string
 */
function formatDate(date: Date): string {
  return date.toISOString()
}

/**
 * Convert API node dates to application NodeDates
 */
function apiDatesToNodeDates(createdAt: string, modifiedAt: string): NodeDates {
  return {
    created: parseDate(createdAt),
    modified: parseDate(modifiedAt),
  }
}

/**
 * Convert ApiNode to ForgeNode
 *
 * Maps snake_case API fields to camelCase application fields,
 * converts date strings to Date objects, and extracts type-specific data.
 */
export function apiNodeToForgeNode(
  apiNode: ApiNode,
  allNodes?: Map<string, ApiNode>
): ForgeNode {
  const dates = apiDatesToNodeDates(apiNode.created_at, apiNode.modified_at)
  const baseFields = {
    id: apiNode.id,
    title: apiNode.title,
    tags: apiNode.tags ?? [],
    dates,
    content: apiNode.content ?? '',
  }

  switch (apiNode.type) {
    case 'task': {
      // Compute blocks from all nodes (reverse of depends_on)
      const blocks: string[] = []
      if (allNodes) {
        allNodes.forEach((node) => {
          if (node.depends_on?.includes(apiNode.id)) {
            blocks.push(node.id)
          }
        })
      }

      const taskNode: TaskNode = {
        ...baseFields,
        type: 'task',
        status: (apiNode.status as TaskStatus) ?? 'pending',
        priority: (apiNode.priority as TaskPriority) ?? 'medium',
        dependsOn: apiNode.depends_on ?? [],
        blocks,
        checklist: (apiNode.checklist as ChecklistItem[]) ?? [],
        milestone: apiNode.milestone ?? undefined,
        parent: apiNode.parent_id,
      }
      return taskNode
    }

    case 'component': {
      const componentNode: ComponentNode = {
        ...baseFields,
        type: 'component',
        status: (apiNode.status as ComponentStatus) ?? 'considering',
        cost: apiNode.cost ?? null,
        supplier: apiNode.supplier ?? null,
        partNumber: apiNode.part_number ?? null,
        customFields: apiNode.custom_fields ?? {},
        parent: apiNode.parent_id,
      }
      return componentNode
    }

    case 'decision': {
      const comparisonData =
        apiNode.comparison_data as DecisionComparisonData | null
      const decisionNode: DecisionNode = {
        ...baseFields,
        type: 'decision',
        status: (apiNode.status as DecisionStatus) ?? 'pending',
        selected: apiNode.selected_option ?? null,
        options: comparisonData?.options ?? [],
        criteria: comparisonData?.criteria ?? [],
        rationale: apiNode.selection_rationale ?? null,
        selectedDate: apiNode.selected_date
          ? parseDate(apiNode.selected_date)
          : null,
        parent: apiNode.parent_id,
      }
      return decisionNode
    }

    case 'note': {
      const noteNode: NoteNode = {
        ...baseFields,
        type: 'note',
        parent: apiNode.parent_id,
      }
      return noteNode
    }

    case 'subsystem': {
      const subsystemNode: SubsystemNode = {
        ...baseFields,
        type: 'subsystem',
        status: (apiNode.status as ContainerStatus) ?? 'planning',
      }
      return subsystemNode
    }

    case 'assembly': {
      const assemblyNode: AssemblyNode = {
        ...baseFields,
        type: 'assembly',
        status: (apiNode.status as ContainerStatus) ?? 'planning',
        parent: apiNode.parent_id,
      }
      return assemblyNode
    }

    case 'module': {
      const moduleNode: ModuleNode = {
        ...baseFields,
        type: 'module',
        status: (apiNode.status as ContainerStatus) ?? 'planning',
        parent: apiNode.parent_id,
      }
      return moduleNode
    }

    default: {
      // Fallback for unknown types - treat as note
      const unknownNode: NoteNode = {
        ...baseFields,
        type: 'note',
        parent: apiNode.parent_id,
      }
      return unknownNode
    }
  }
}

/**
 * Convert ForgeNode to CreateNodeInput for API
 */
export function forgeNodeToCreateInput(node: ForgeNode): CreateNodeInput {
  const base: CreateNodeInput = {
    id: node.id,
    type: node.type,
    title: node.title,
    content: node.content,
    tags: node.tags,
  }

  switch (node.type) {
    case 'task': {
      const taskNode = node as TaskNode
      return {
        ...base,
        status: taskNode.status,
        priority: taskNode.priority,
        depends_on: taskNode.dependsOn,
        milestone: taskNode.milestone,
        parent_id: taskNode.parent ?? undefined,
        checklist: taskNode.checklist,
      }
    }

    case 'component': {
      const componentNode = node as ComponentNode
      return {
        ...base,
        status: componentNode.status,
        parent_id: componentNode.parent ?? undefined,
        cost: componentNode.cost ?? undefined,
        supplier: componentNode.supplier ?? undefined,
        part_number: componentNode.partNumber ?? undefined,
        custom_fields: componentNode.customFields,
      }
    }

    case 'decision': {
      const decisionNode = node as DecisionNode
      return {
        ...base,
        status: decisionNode.status,
        parent_id: decisionNode.parent ?? undefined,
        selected_option: decisionNode.selected ?? undefined,
        selection_rationale: decisionNode.rationale ?? undefined,
        selected_date: decisionNode.selectedDate
          ? formatDate(decisionNode.selectedDate)
          : undefined,
        comparison_data: {
          options: decisionNode.options,
          criteria: decisionNode.criteria,
        },
      }
    }

    case 'note': {
      const noteNode = node as NoteNode
      return {
        ...base,
        parent_id: noteNode.parent ?? undefined,
      }
    }

    case 'subsystem': {
      const subsystemNode = node as SubsystemNode
      return {
        ...base,
        status: subsystemNode.status,
      }
    }

    case 'assembly': {
      const assemblyNode = node as AssemblyNode
      return {
        ...base,
        status: assemblyNode.status,
        parent_id: assemblyNode.parent ?? undefined,
      }
    }

    case 'module': {
      const moduleNode = node as ModuleNode
      return {
        ...base,
        status: moduleNode.status,
        parent_id: moduleNode.parent ?? undefined,
      }
    }

    default:
      return base
  }
}

/**
 * Convert ForgeNode partial updates to UpdateNodeInput for API
 */
export function forgeNodeToUpdateInput(
  node: ForgeNode,
  updates: Partial<ForgeNode>
): UpdateNodeInput {
  const input: UpdateNodeInput = {}

  // Base fields
  if (updates.title !== undefined) input.title = updates.title
  if (updates.content !== undefined) input.content = updates.content
  if (updates.tags !== undefined) input.tags = updates.tags

  // Type-specific fields based on node type
  switch (node.type) {
    case 'task': {
      const taskUpdates = updates as Partial<TaskNode>
      if (taskUpdates.status !== undefined) input.status = taskUpdates.status
      if (taskUpdates.priority !== undefined)
        input.priority = taskUpdates.priority
      if (taskUpdates.dependsOn !== undefined)
        input.depends_on = taskUpdates.dependsOn
      if (taskUpdates.milestone !== undefined)
        input.milestone = taskUpdates.milestone
      if (taskUpdates.parent !== undefined) input.parent_id = taskUpdates.parent
      if (taskUpdates.checklist !== undefined)
        input.checklist = taskUpdates.checklist
      break
    }

    case 'component': {
      const componentUpdates = updates as Partial<ComponentNode>
      if (componentUpdates.status !== undefined)
        input.status = componentUpdates.status
      if (componentUpdates.parent !== undefined)
        input.parent_id = componentUpdates.parent
      if (componentUpdates.cost !== undefined)
        input.cost = componentUpdates.cost
      if (componentUpdates.supplier !== undefined)
        input.supplier = componentUpdates.supplier
      if (componentUpdates.partNumber !== undefined)
        input.part_number = componentUpdates.partNumber
      if (componentUpdates.customFields !== undefined)
        input.custom_fields = componentUpdates.customFields
      break
    }

    case 'decision': {
      const decisionUpdates = updates as Partial<DecisionNode>
      if (decisionUpdates.status !== undefined)
        input.status = decisionUpdates.status
      if (decisionUpdates.parent !== undefined)
        input.parent_id = decisionUpdates.parent
      if (decisionUpdates.selected !== undefined)
        input.selected_option = decisionUpdates.selected
      if (decisionUpdates.rationale !== undefined)
        input.selection_rationale = decisionUpdates.rationale
      if (decisionUpdates.selectedDate !== undefined)
        input.selected_date = decisionUpdates.selectedDate
          ? formatDate(decisionUpdates.selectedDate)
          : null
      if (
        decisionUpdates.options !== undefined ||
        decisionUpdates.criteria !== undefined
      ) {
        const existingNode = node as DecisionNode
        input.comparison_data = {
          options: decisionUpdates.options ?? existingNode.options,
          criteria: decisionUpdates.criteria ?? existingNode.criteria,
        }
      }
      break
    }

    case 'note': {
      const noteUpdates = updates as Partial<NoteNode>
      if (noteUpdates.parent !== undefined) input.parent_id = noteUpdates.parent
      break
    }

    case 'subsystem':
    case 'assembly':
    case 'module': {
      const containerUpdates = updates as Partial<
        SubsystemNode | AssemblyNode | ModuleNode
      >
      if (containerUpdates.status !== undefined)
        input.status = containerUpdates.status
      if ('parent' in containerUpdates && containerUpdates.parent !== undefined)
        input.parent_id = containerUpdates.parent
      break
    }
  }

  return input
}

/**
 * Convert a map of API nodes to a map of ForgeNodes
 *
 * Processes all nodes together so blocks relationships can be computed.
 */
export function apiNodesToForgeNodes(
  apiNodes: ApiNode[]
): Map<string, ForgeNode> {
  const apiMap = new Map(apiNodes.map((n) => [n.id, n]))
  const forgeMap = new Map<string, ForgeNode>()

  for (const apiNode of apiNodes) {
    forgeMap.set(apiNode.id, apiNodeToForgeNode(apiNode, apiMap))
  }

  return forgeMap
}
