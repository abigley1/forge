/**
 * Edge types registry for React Flow
 * Separated to comply with React fast refresh requirements
 */

import { DependencyEdge } from './DependencyEdge'
import { ReferenceEdge } from './ReferenceEdge'
import { ContainmentEdge } from './ContainmentEdge'

/**
 * Edge types registry mapping type names to components
 *
 * - dependency: Solid blue line with arrow (for task dependencies)
 * - reference: Dashed gray line with circle (for wiki-link references)
 * - containment: Dashed emerald line (for parent-child container relationships)
 */
export const forgeEdgeTypes = {
  dependency: DependencyEdge,
  reference: ReferenceEdge,
  containment: ContainmentEdge,
}
