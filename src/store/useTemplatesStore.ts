import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  NodeTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '@/types/templates'
import { BUILT_IN_TEMPLATES, getAllBuiltInTemplates } from '@/types/templates'
import type { NodeType } from '@/types/nodes'

// ============================================================================
// Types
// ============================================================================

export interface TemplatesState {
  /** Custom templates created by the user (keyed by ID) */
  customTemplates: Map<string, NodeTemplate>
}

export interface TemplatesActions {
  /** Add a new custom template */
  addTemplate: (input: CreateTemplateInput) => NodeTemplate
  /** Update an existing custom template */
  updateTemplate: (id: string, input: UpdateTemplateInput) => boolean
  /** Delete a custom template (cannot delete built-in) */
  deleteTemplate: (id: string) => boolean
  /** Duplicate a template (creates a custom copy) */
  duplicateTemplate: (id: string) => NodeTemplate | null
}

export interface TemplatesSelectors {
  /** Get all templates for a specific node type (built-in + custom) */
  getTemplatesForType: (type: NodeType) => NodeTemplate[]
  /** Get a template by ID */
  getTemplateById: (id: string) => NodeTemplate | undefined
  /** Get all custom templates */
  getCustomTemplates: () => NodeTemplate[]
  /** Check if a template ID exists */
  templateExists: (id: string) => boolean
}

export type TemplatesStore = TemplatesState &
  TemplatesActions &
  TemplatesSelectors

// ============================================================================
// Initial State
// ============================================================================

const initialState: TemplatesState = {
  customTemplates: new Map(),
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a unique template ID
 */
function generateTemplateId(name: string, existingIds: Set<string>): string {
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  let id = `custom-${baseId}`
  let counter = 1

  while (existingIds.has(id)) {
    id = `custom-${baseId}-${counter}`
    counter++
  }

  return id
}

/**
 * Get all existing template IDs (built-in + custom)
 */
function getAllTemplateIds(
  customTemplates: Map<string, NodeTemplate>
): Set<string> {
  const ids = new Set<string>()
  getAllBuiltInTemplates().forEach((t) => ids.add(t.id))
  customTemplates.forEach((_, id) => ids.add(id))
  return ids
}

// ============================================================================
// Store
// ============================================================================

export const useTemplatesStore = create<TemplatesStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...initialState,

        // Actions
        addTemplate: (input) => {
          const existingIds = getAllTemplateIds(get().customTemplates)
          const id = generateTemplateId(input.name, existingIds)

          const template: NodeTemplate = {
            id,
            name: input.name,
            description: input.description,
            type: input.type,
            content: input.content,
            frontmatter: input.frontmatter,
            isBuiltIn: false,
          }

          set(
            (state) => ({
              customTemplates: new Map(state.customTemplates).set(id, template),
            }),
            false,
            'addTemplate'
          )

          return template
        },

        updateTemplate: (id, input) => {
          const template = get().customTemplates.get(id)
          if (!template) return false

          // Cannot update built-in templates
          if (template.isBuiltIn) return false

          const updated: NodeTemplate = {
            ...template,
            name: input.name ?? template.name,
            description: input.description ?? template.description,
            content: input.content ?? template.content,
            frontmatter: input.frontmatter ?? template.frontmatter,
          }

          set(
            (state) => ({
              customTemplates: new Map(state.customTemplates).set(id, updated),
            }),
            false,
            'updateTemplate'
          )

          return true
        },

        deleteTemplate: (id) => {
          const template = get().customTemplates.get(id)
          if (!template) return false

          // Cannot delete built-in templates
          if (template.isBuiltIn) return false

          set(
            (state) => {
              const newTemplates = new Map(state.customTemplates)
              newTemplates.delete(id)
              return { customTemplates: newTemplates }
            },
            false,
            'deleteTemplate'
          )

          return true
        },

        duplicateTemplate: (id) => {
          // Try to find in custom templates first
          let template = get().customTemplates.get(id)

          // If not found, check built-in templates
          if (!template) {
            template = getAllBuiltInTemplates().find((t) => t.id === id)
          }

          if (!template) return null

          const existingIds = getAllTemplateIds(get().customTemplates)
          const newId = generateTemplateId(`${template.name} Copy`, existingIds)

          const duplicate: NodeTemplate = {
            ...template,
            id: newId,
            name: `${template.name} (Copy)`,
            isBuiltIn: false,
          }

          set(
            (state) => ({
              customTemplates: new Map(state.customTemplates).set(
                newId,
                duplicate
              ),
            }),
            false,
            'duplicateTemplate'
          )

          return duplicate
        },

        // Selectors
        getTemplatesForType: (type) => {
          const builtIn = BUILT_IN_TEMPLATES[type]
          const custom = Array.from(get().customTemplates.values()).filter(
            (t) => t.type === type
          )
          return [...builtIn, ...custom]
        },

        getTemplateById: (id) => {
          // Check custom templates first
          const custom = get().customTemplates.get(id)
          if (custom) return custom

          // Check built-in templates
          return getAllBuiltInTemplates().find((t) => t.id === id)
        },

        getCustomTemplates: () => {
          return Array.from(get().customTemplates.values())
        },

        templateExists: (id) => {
          return (
            get().customTemplates.has(id) ||
            getAllBuiltInTemplates().some((t) => t.id === id)
          )
        },
      }),
      {
        name: 'forge-templates',
        // Custom serialization for Map with error handling
        storage: {
          getItem: (name) => {
            try {
              const str = localStorage.getItem(name)
              if (!str) return null
              const parsed = JSON.parse(str)
              return {
                ...parsed,
                state: {
                  ...(parsed.state || {}),
                  customTemplates: new Map(parsed.state?.customTemplates || []),
                },
              }
            } catch (error) {
              // Log error for debugging but don't crash - return null to use defaults
              console.error(
                'Failed to load templates from localStorage:',
                error
              )
              return null
            }
          },
          setItem: (name, value) => {
            try {
              const toStore = {
                ...value,
                state: {
                  ...value.state,
                  customTemplates: Array.from(
                    value.state.customTemplates.entries()
                  ),
                },
              }
              localStorage.setItem(name, JSON.stringify(toStore))
            } catch (error) {
              // Log error - could be QuotaExceededError or SecurityError
              console.error('Failed to save templates to localStorage:', error)
            }
          },
          removeItem: (name) => {
            try {
              localStorage.removeItem(name)
            } catch (error) {
              console.error(
                'Failed to remove templates from localStorage:',
                error
              )
            }
          },
        },
      }
    ),
    {
      name: 'forge-templates-store',
      enabled: import.meta.env.DEV,
    }
  )
)

// ============================================================================
// Standalone Selectors
// ============================================================================

export const selectCustomTemplates = (state: TemplatesStore) =>
  Array.from(state.customTemplates.values())

export const selectTemplateCount = (state: TemplatesStore) =>
  state.customTemplates.size + getAllBuiltInTemplates().length
