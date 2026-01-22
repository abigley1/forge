// Main app store
export { useAppStore } from './useAppStore'
export type { AppState, UIState, UIActions } from './useAppStore'

// Nodes store
export { useNodesStore } from './useNodesStore'
export type {
  NodesState,
  NodesActions,
  NodesSelectors,
  NodesStore,
} from './useNodesStore'
export {
  selectNodes,
  selectActiveNodeId,
  selectActiveNode,
  selectNodeCount,
  selectHasDirtyNodes,
  selectLinkIndex,
} from './useNodesStore'

// Project store
export { useProjectStore } from './useProjectStore'
export type {
  ProjectState,
  ProjectActions,
  ProjectSelectors,
  ProjectStore,
} from './useProjectStore'
export {
  selectProject,
  selectIsLoading,
  selectIsDirty,
  selectError,
  selectParseErrors,
} from './useProjectStore'

// Undo store
export { useUndoStore } from './useUndoStore'
export type {
  UndoState,
  UndoActions,
  UndoSelectors,
  UndoStore,
  UndoAction,
  UndoActionType,
  UndoActionInput,
  AddNodeAction,
  UpdateNodeAction,
  DeleteNodeAction,
  AddNodeActionInput,
  UpdateNodeActionInput,
  DeleteNodeActionInput,
} from './useUndoStore'
export {
  selectCanUndo,
  selectCanRedo,
  selectUndoCount,
  selectRedoCount,
} from './useUndoStore'

// Templates store
export { useTemplatesStore } from './useTemplatesStore'
export type {
  TemplatesState,
  TemplatesActions,
  TemplatesSelectors,
  TemplatesStore,
} from './useTemplatesStore'
export { selectCustomTemplates, selectTemplateCount } from './useTemplatesStore'

// Store type utilities
export type { ExtractState, Selector, StateCreator, AsyncState } from './types'
export { initialAsyncState } from './types'
