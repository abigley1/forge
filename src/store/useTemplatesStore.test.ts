import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplatesStore } from './useTemplatesStore'
import { NodeType } from '@/types/nodes'
import {
  getAllBuiltInTemplates,
  DECISION_TEMPLATES,
  COMPONENT_TEMPLATES,
  TASK_TEMPLATES,
  NOTE_TEMPLATES,
} from '@/types/templates'

describe('useTemplatesStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTemplatesStore.setState({ customTemplates: new Map() })
  })

  describe('initial state', () => {
    it('starts with empty custom templates', () => {
      const { customTemplates } = useTemplatesStore.getState()
      expect(customTemplates.size).toBe(0)
    })
  })

  describe('getTemplatesForType', () => {
    it('returns built-in templates for Decision type', () => {
      const { getTemplatesForType } = useTemplatesStore.getState()
      const templates = getTemplatesForType(NodeType.Decision)

      expect(templates.length).toBeGreaterThanOrEqual(DECISION_TEMPLATES.length)
      expect(templates.some((t) => t.name === 'Blank Decision')).toBe(true)
      expect(templates.some((t) => t.name === 'Component Selection')).toBe(true)
      expect(templates.some((t) => t.name === 'Design Choice')).toBe(true)
      expect(templates.some((t) => t.name === 'Vendor Selection')).toBe(true)
    })

    it('returns built-in templates for Component type', () => {
      const { getTemplatesForType } = useTemplatesStore.getState()
      const templates = getTemplatesForType(NodeType.Component)

      expect(templates.length).toBeGreaterThanOrEqual(
        COMPONENT_TEMPLATES.length
      )
      expect(templates.some((t) => t.name === 'Blank Component')).toBe(true)
      expect(templates.some((t) => t.name === 'Electronic Part')).toBe(true)
      expect(templates.some((t) => t.name === 'Mechanical Part')).toBe(true)
    })

    it('returns built-in templates for Task type', () => {
      const { getTemplatesForType } = useTemplatesStore.getState()
      const templates = getTemplatesForType(NodeType.Task)

      expect(templates.length).toBeGreaterThanOrEqual(TASK_TEMPLATES.length)
      expect(templates.some((t) => t.name === 'Blank Task')).toBe(true)
      expect(templates.some((t) => t.name === 'Task with Checklist')).toBe(true)
    })

    it('returns built-in templates for Note type', () => {
      const { getTemplatesForType } = useTemplatesStore.getState()
      const templates = getTemplatesForType(NodeType.Note)

      expect(templates.length).toBeGreaterThanOrEqual(NOTE_TEMPLATES.length)
      expect(templates.some((t) => t.name === 'Blank Note')).toBe(true)
      expect(templates.some((t) => t.name === 'Research Note')).toBe(true)
    })

    it('includes custom templates for the type', () => {
      const { addTemplate, getTemplatesForType } = useTemplatesStore.getState()

      addTemplate({
        name: 'Custom Task Template',
        description: 'A custom task',
        type: NodeType.Task,
        content: '## Custom Content',
      })

      const templates = getTemplatesForType(NodeType.Task)
      expect(templates.some((t) => t.name === 'Custom Task Template')).toBe(
        true
      )
    })

    it('does not include custom templates from other types', () => {
      const { addTemplate, getTemplatesForType } = useTemplatesStore.getState()

      addTemplate({
        name: 'Custom Task Template',
        description: 'A custom task',
        type: NodeType.Task,
        content: '## Custom Content',
      })

      const templates = getTemplatesForType(NodeType.Note)
      expect(templates.some((t) => t.name === 'Custom Task Template')).toBe(
        false
      )
    })
  })

  describe('addTemplate', () => {
    it('creates a custom template with generated ID', () => {
      const { addTemplate, getTemplateById } = useTemplatesStore.getState()

      const template = addTemplate({
        name: 'My Custom Template',
        description: 'Description here',
        type: NodeType.Decision,
        content: '## Custom',
      })

      expect(template.id).toMatch(/^custom-/)
      expect(template.name).toBe('My Custom Template')
      expect(template.description).toBe('Description here')
      expect(template.type).toBe(NodeType.Decision)
      expect(template.content).toBe('## Custom')
      expect(template.isBuiltIn).toBe(false)

      const retrieved = getTemplateById(template.id)
      expect(retrieved).toEqual(template)
    })

    it('generates unique IDs for templates with similar names', () => {
      const { addTemplate } = useTemplatesStore.getState()

      const template1 = addTemplate({
        name: 'Same Name',
        description: 'First',
        type: NodeType.Task,
      })

      const template2 = addTemplate({
        name: 'Same Name',
        description: 'Second',
        type: NodeType.Task,
      })

      expect(template1.id).not.toBe(template2.id)
    })

    it('handles empty content', () => {
      const { addTemplate } = useTemplatesStore.getState()

      const template = addTemplate({
        name: 'No Content',
        description: 'Empty',
        type: NodeType.Note,
      })

      expect(template.content).toBeUndefined()
    })

    it('stores frontmatter values', () => {
      const { addTemplate, getTemplateById } = useTemplatesStore.getState()

      const template = addTemplate({
        name: 'With Frontmatter',
        description: 'Has tags',
        type: NodeType.Task,
        frontmatter: {
          tags: ['urgent', 'important'],
          priority: 'high',
        },
      })

      const retrieved = getTemplateById(template.id)
      expect(retrieved?.frontmatter?.tags).toEqual(['urgent', 'important'])
      expect(retrieved?.frontmatter?.priority).toBe('high')
    })
  })

  describe('updateTemplate', () => {
    it('updates an existing custom template', () => {
      const { addTemplate, updateTemplate, getTemplateById } =
        useTemplatesStore.getState()

      const template = addTemplate({
        name: 'Original Name',
        description: 'Original description',
        type: NodeType.Note,
      })

      const result = updateTemplate(template.id, {
        name: 'Updated Name',
        description: 'Updated description',
        content: '## New content',
      })

      expect(result).toBe(true)

      const updated = getTemplateById(template.id)
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.description).toBe('Updated description')
      expect(updated?.content).toBe('## New content')
    })

    it('returns false for non-existent template', () => {
      const { updateTemplate } = useTemplatesStore.getState()

      const result = updateTemplate('non-existent-id', {
        name: 'New Name',
      })

      expect(result).toBe(false)
    })

    it('preserves unchanged fields', () => {
      const { addTemplate, updateTemplate, getTemplateById } =
        useTemplatesStore.getState()

      const template = addTemplate({
        name: 'Original',
        description: 'Desc',
        type: NodeType.Task,
        content: '## Content',
      })

      updateTemplate(template.id, {
        name: 'New Name',
      })

      const updated = getTemplateById(template.id)
      expect(updated?.name).toBe('New Name')
      expect(updated?.description).toBe('Desc')
      expect(updated?.content).toBe('## Content')
    })
  })

  describe('deleteTemplate', () => {
    it('deletes a custom template', () => {
      const { addTemplate, deleteTemplate, getTemplateById } =
        useTemplatesStore.getState()

      const template = addTemplate({
        name: 'To Delete',
        description: 'Will be deleted',
        type: NodeType.Note,
      })

      const result = deleteTemplate(template.id)
      expect(result).toBe(true)

      const deleted = getTemplateById(template.id)
      expect(deleted).toBeUndefined()
    })

    it('returns false for non-existent template', () => {
      const { deleteTemplate } = useTemplatesStore.getState()

      const result = deleteTemplate('non-existent-id')
      expect(result).toBe(false)
    })

    it('cannot delete built-in templates', () => {
      const { getTemplatesForType, deleteTemplate } =
        useTemplatesStore.getState()

      const builtIn = getTemplatesForType(NodeType.Decision)[0]
      // Built-in templates are not in customTemplates, so deleteTemplate returns false
      const result = deleteTemplate(builtIn.id)
      expect(result).toBe(false)
    })
  })

  describe('duplicateTemplate', () => {
    it('duplicates a custom template', () => {
      const { addTemplate, duplicateTemplate, getTemplateById } =
        useTemplatesStore.getState()

      const original = addTemplate({
        name: 'Original',
        description: 'Original description',
        type: NodeType.Task,
        content: '## Original content',
      })

      const duplicate = duplicateTemplate(original.id)

      expect(duplicate).not.toBeNull()
      expect(duplicate?.id).not.toBe(original.id)
      expect(duplicate?.name).toBe('Original (Copy)')
      expect(duplicate?.description).toBe(original.description)
      expect(duplicate?.content).toBe(original.content)
      expect(duplicate?.type).toBe(original.type)
      expect(duplicate?.isBuiltIn).toBe(false)

      const retrieved = getTemplateById(duplicate!.id)
      expect(retrieved).toEqual(duplicate)
    })

    it('duplicates a built-in template as a custom one', () => {
      const { duplicateTemplate, getTemplateById } =
        useTemplatesStore.getState()

      const builtInId = 'decision-component-selection'
      const duplicate = duplicateTemplate(builtInId)

      expect(duplicate).not.toBeNull()
      expect(duplicate?.name).toBe('Component Selection (Copy)')
      expect(duplicate?.isBuiltIn).toBe(false)

      const retrieved = getTemplateById(duplicate!.id)
      expect(retrieved?.isBuiltIn).toBe(false)
    })

    it('returns null for non-existent template', () => {
      const { duplicateTemplate } = useTemplatesStore.getState()

      const result = duplicateTemplate('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getTemplateById', () => {
    it('finds custom templates', () => {
      const { addTemplate, getTemplateById } = useTemplatesStore.getState()

      const template = addTemplate({
        name: 'Custom',
        description: 'A custom template',
        type: NodeType.Note,
      })

      const found = getTemplateById(template.id)
      expect(found).toEqual(template)
    })

    it('finds built-in templates', () => {
      const { getTemplateById } = useTemplatesStore.getState()

      const found = getTemplateById('decision-blank')
      expect(found?.name).toBe('Blank Decision')
      expect(found?.isBuiltIn).toBe(true)
    })

    it('returns undefined for non-existent template', () => {
      const { getTemplateById } = useTemplatesStore.getState()

      const found = getTemplateById('non-existent-id')
      expect(found).toBeUndefined()
    })
  })

  describe('getCustomTemplates', () => {
    it('returns only custom templates', () => {
      const { addTemplate, getCustomTemplates } = useTemplatesStore.getState()

      addTemplate({ name: 'Custom 1', description: '', type: NodeType.Task })
      addTemplate({ name: 'Custom 2', description: '', type: NodeType.Note })

      const custom = getCustomTemplates()
      expect(custom.length).toBe(2)
      expect(custom.every((t) => t.isBuiltIn === false)).toBe(true)
    })

    it('returns empty array when no custom templates', () => {
      const { getCustomTemplates } = useTemplatesStore.getState()

      const custom = getCustomTemplates()
      expect(custom).toEqual([])
    })
  })

  describe('templateExists', () => {
    it('returns true for existing custom template', () => {
      const { addTemplate, templateExists } = useTemplatesStore.getState()

      const template = addTemplate({
        name: 'Custom',
        description: '',
        type: NodeType.Note,
      })

      expect(templateExists(template.id)).toBe(true)
    })

    it('returns true for built-in template', () => {
      const { templateExists } = useTemplatesStore.getState()

      expect(templateExists('decision-blank')).toBe(true)
      expect(templateExists('task-with-checklist')).toBe(true)
    })

    it('returns false for non-existent template', () => {
      const { templateExists } = useTemplatesStore.getState()

      expect(templateExists('non-existent-id')).toBe(false)
    })
  })

  describe('built-in templates', () => {
    it('all built-in templates have isBuiltIn flag', () => {
      const builtIn = getAllBuiltInTemplates()
      expect(builtIn.every((t) => t.isBuiltIn === true)).toBe(true)
    })

    it('decision templates include Vendor Selection', () => {
      expect(
        DECISION_TEMPLATES.some((t) => t.name === 'Vendor Selection')
      ).toBe(true)
    })

    it('all built-in templates have required fields', () => {
      const builtIn = getAllBuiltInTemplates()
      for (const template of builtIn) {
        expect(template.id).toBeTruthy()
        expect(template.name).toBeTruthy()
        expect(template.description).toBeTruthy()
        expect(template.type).toBeTruthy()
      }
    })

    it('blank templates have no content', () => {
      const builtIn = getAllBuiltInTemplates()
      const blanks = builtIn.filter((t) => t.id.endsWith('-blank'))
      expect(blanks.length).toBeGreaterThan(0)
      for (const blank of blanks) {
        expect(blank.content).toBeUndefined()
      }
    })
  })

  describe('persistence', () => {
    it('persists custom templates to localStorage', () => {
      const { addTemplate } = useTemplatesStore.getState()
      addTemplate({
        name: 'Persisted Template',
        description: 'Test',
        type: NodeType.Task,
      })

      // Verify localStorage was written
      const stored = localStorage.getItem('forge-templates')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed.state.customTemplates).toBeDefined()
      expect(parsed.state.customTemplates.length).toBeGreaterThan(0)
    })

    it('handles corrupted localStorage data gracefully', () => {
      // Set corrupted data
      localStorage.setItem('forge-templates', 'not valid json')

      // Reset store to trigger hydration - this should not throw
      useTemplatesStore.setState({ customTemplates: new Map() })

      // Store should still be functional
      const { getCustomTemplates } = useTemplatesStore.getState()
      expect(getCustomTemplates()).toEqual([])
    })

    it('handles malformed localStorage state gracefully', () => {
      // Set malformed data (valid JSON but wrong structure)
      localStorage.setItem('forge-templates', JSON.stringify({ state: null }))

      // Reset store - should not throw
      useTemplatesStore.setState({ customTemplates: new Map() })

      const { getCustomTemplates } = useTemplatesStore.getState()
      expect(getCustomTemplates()).toEqual([])
    })
  })
})
