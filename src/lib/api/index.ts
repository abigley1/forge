/**
 * API Module
 *
 * Exports the API client, types, and converters for the Forge server.
 */

export { createApiClient, api } from './client.js'
export type { ApiClient, ApiClientConfig } from './client.js'
export type {
  NodeType,
  ApiProject,
  ApiProjectWithStats,
  ApiNode,
  CreateProjectInput,
  UpdateProjectInput,
  CreateNodeInput,
  UpdateNodeInput,
  NodeFilters,
  NodeDependencies,
  ApiResponse,
  ApiError,
  ApiResult,
} from './types.js'
export {
  apiNodeToForgeNode,
  apiNodesToForgeNodes,
  forgeNodeToCreateInput,
  forgeNodeToUpdateInput,
} from './converters.js'
