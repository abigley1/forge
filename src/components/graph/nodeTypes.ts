/**
 * Node types registry for React Flow
 * Separated to comply with React fast refresh requirements
 */

import { ForgeGraphNode } from './ForgeGraphNode'
import { TagCluster } from './TagCluster'

/**
 * Node types registry mapping type names to components
 */
export const forgeNodeTypes = {
  forgeNode: ForgeGraphNode,
  tagCluster: TagCluster,
}
