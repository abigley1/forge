// Hotkey hooks
export {
  useHotkey,
  useHotkeys,
  isMac,
  getModifierKeyLabel,
  formatHotkey,
} from './useHotkey'
export type {
  HotkeyModifiers,
  UseHotkeyOptions,
  HotkeyCallback,
} from './useHotkey'

// Undo/Redo hooks
export {
  useUndoRedo,
  useUndoableAddNode,
  useUndoableUpdateNode,
  useUndoableDeleteNode,
  useUndoableNodeOperations,
} from './useUndoRedo'
export type { UseUndoRedoReturn } from './useUndoRedo'

// Create node dialog hook
export { useCreateNodeDialog } from './useCreateNodeDialog'

// Delete node dialog hook
export { useDeleteNodeDialog } from './useDeleteNodeDialog'
export type { UseDeleteNodeDialogReturn } from './useDeleteNodeDialog'

// Auto-save hook
export { useAutoSave, DEFAULT_AUTO_SAVE_DELAY } from './useAutoSave'
export type { UseAutoSaveOptions, UseAutoSaveReturn } from './useAutoSave'

// Before unload hook (unsaved changes warning)
export { useBeforeUnload, useUnsavedChangesWarning } from './useBeforeUnload'
export type { UseBeforeUnloadOptions } from './useBeforeUnload'

// Filter hooks (URL-synced state)
export { useFilters } from './useFilters'
export type { FilterState, UseFiltersReturn } from './useFilters'

// Sorting hooks (URL-synced state)
export { useSorting } from './useSorting'
export type { UseSortingReturn } from './useSorting'

// Node ordering hooks (drag and drop reordering)
export {
  useNodeOrder,
  applyNodeOrder,
  reconcileNodeOrder,
} from './useNodeOrder'
export type { UseNodeOrderOptions, UseNodeOrderResult } from './useNodeOrder'

// Node navigation hooks (URL-synced navigation)
export { useNodeNavigation } from './useNodeNavigation'
export type { UseNodeNavigationReturn } from './useNodeNavigation'

// Wiki-link autocomplete hooks
export { useWikiLinkAutocomplete } from './useWikiLinkAutocomplete'
export type {
  UseWikiLinkAutocompleteOptions,
  UseWikiLinkAutocompleteReturn,
} from './useWikiLinkAutocomplete'

// Wiki-link navigation hooks
export { useWikiLinkNavigation } from './useWikiLinkNavigation'
export type {
  WikiLinkNavigationState,
  UseWikiLinkNavigationOptions,
  UseWikiLinkNavigationReturn,
} from './useWikiLinkNavigation'

// Broken links detection hook
export { useBrokenLinks } from './useBrokenLinks'
export type {
  BrokenLink,
  UseBrokenLinksOptions,
  UseBrokenLinksResult,
} from './useBrokenLinks'

// Link renaming hooks (title change reference updates)
export {
  useLinkRenaming,
  updateWikiLinkReferences,
  countWikiLinkReferences,
} from './useLinkRenaming'
export type {
  ReferencingNodeInfo,
  LinkRenamingState,
  UseLinkRenamingOptions,
  UseLinkRenamingResult,
} from './useLinkRenaming'

// Graph preferences hooks (minimap, background visibility)
export { useGraphPreferences } from './useGraphPreferences'
export type {
  GraphPreferences,
  UseGraphPreferencesReturn,
} from './useGraphPreferences'

// Reduced motion preference hook
export { useReducedMotion, prefersReducedMotion } from './useReducedMotion'

// Graph keyboard navigation hook
export { useGraphKeyboardNavigation } from './useGraphKeyboardNavigation'
export type {
  UseGraphKeyboardNavigationProps,
  UseGraphKeyboardNavigationReturn,
} from './useGraphKeyboardNavigation'
