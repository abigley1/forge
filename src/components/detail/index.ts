// Main panel component
export { NodeDetailPanel } from './NodeDetailPanel'
export type { NodeDetailPanelProps } from './NodeDetailPanel'

// Field editors
export { NodeTitleEditor } from './NodeTitleEditor'
export type { NodeTitleEditorProps } from './NodeTitleEditor'

export { StatusSelect } from './StatusSelect'
export type {
  StatusSelectProps,
  StatusOption,
  NodeStatus,
} from './StatusSelect'

export { TagInput } from './TagInput'
export type { TagInputProps } from './TagInput'

export { PrioritySelector } from './PrioritySelector'
export type { PrioritySelectorProps } from './PrioritySelector'

export { ChecklistEditor } from './ChecklistEditor'
export type { ChecklistEditorProps } from './ChecklistEditor'

// Re-export checklist utilities from lib
export { parseChecklist, serializeChecklist } from '@/lib/checklist'

export { ComponentFields } from './ComponentFields'
export type { ComponentFieldsProps } from './ComponentFields'

export { ContainerFields } from './ContainerFields'
export type { ContainerFieldsProps } from './ContainerFields'

export { ChildNodesSection } from './ChildNodesSection'
export type { ChildNodesSectionProps } from './ChildNodesSection'

export { ParentSelector } from './ParentSelector'
export type { ParentSelectorProps } from './ParentSelector'

export { DependencyEditor } from './DependencyEditor'
export type {
  DependencyEditorProps,
  DependencyNodeInfo,
} from './DependencyEditor'

export { MilestoneSelector, extractMilestones } from './MilestoneSelector'
export type { MilestoneSelectorProps } from './MilestoneSelector'

export { AttachmentsPanel } from './AttachmentsPanel'
export type { AttachmentsPanelProps } from './AttachmentsPanel'

export { ImageViewer } from './ImageViewer'

// Main frontmatter editor
export { FrontmatterEditor } from './FrontmatterEditor'
export type { FrontmatterEditorProps } from './FrontmatterEditor'
