/**
 * Link Index for Bidirectional Wiki-Links
 *
 * Provides functionality to build and maintain an index of wiki-links between nodes.
 * The index tracks both outgoing links (from a node) and incoming links (to a node).
 */

import { extractWikiLinks } from './frontmatter'
import type { ForgeNode } from '@/types/nodes'

/**
 * Represents the bidirectional link index for a set of nodes.
 * - outgoing: Maps node IDs to the set of node IDs they link to
 * - incoming: Maps node IDs to the set of node IDs that link to them (backlinks)
 */
export interface LinkIndex {
  /** Maps source node ID to set of target node IDs it links to */
  outgoing: Map<string, Set<string>>
  /** Maps target node ID to set of source node IDs that link to it */
  incoming: Map<string, Set<string>>
}

/**
 * Creates an empty link index.
 */
export function createEmptyLinkIndex(): LinkIndex {
  return {
    outgoing: new Map(),
    incoming: new Map(),
  }
}

/**
 * Resolves a wiki-link target to a node ID.
 *
 * Wiki-links can be:
 * - Exact node ID: [[my-node-id]]
 * - Node title: [[My Node Title]]
 *
 * This function attempts to match the link target against node IDs first,
 * then falls back to matching against node titles (case-insensitive).
 *
 * @param linkTarget - The raw link target from [[linkTarget]]
 * @param nodeMap - Map of all nodes keyed by ID
 * @returns The resolved node ID, or null if no match found
 */
export function resolveLinkTarget(
  linkTarget: string,
  nodeMap: Map<string, ForgeNode>
): string | null {
  // First, check for exact ID match
  if (nodeMap.has(linkTarget)) {
    return linkTarget
  }

  // Then try case-insensitive title match
  const lowerTarget = linkTarget.toLowerCase()
  for (const [id, node] of nodeMap) {
    if (node.title.toLowerCase() === lowerTarget) {
      return id
    }
  }

  // Also try matching ID with different casing
  const lowerLinkTarget = linkTarget.toLowerCase()
  for (const [id] of nodeMap) {
    if (id.toLowerCase() === lowerLinkTarget) {
      return id
    }
  }

  return null
}

/**
 * Builds a bidirectional link index from a map of nodes.
 *
 * Extracts wiki-links from each node's content and builds two maps:
 * - outgoing: node ID -> set of node IDs it links to
 * - incoming: node ID -> set of node IDs that link to it (backlinks)
 *
 * Only resolves links to nodes that exist in the provided nodeMap.
 * Broken links (links to non-existent nodes) are not included in the index.
 *
 * @param nodes - Map of all nodes keyed by ID
 * @returns The bidirectional link index
 */
export function buildLinkIndex(nodes: Map<string, ForgeNode>): LinkIndex {
  const outgoing = new Map<string, Set<string>>()
  const incoming = new Map<string, Set<string>>()

  // Initialize empty sets for all nodes (even those with no links)
  for (const nodeId of nodes.keys()) {
    outgoing.set(nodeId, new Set())
    incoming.set(nodeId, new Set())
  }

  // Process each node's content
  for (const [sourceId, node] of nodes) {
    // Extract raw wiki-links from the markdown content
    const rawLinks = extractWikiLinks(node.content)

    // Resolve each link to a node ID
    for (const linkTarget of rawLinks) {
      const targetId = resolveLinkTarget(linkTarget, nodes)

      if (targetId && targetId !== sourceId) {
        // Add to outgoing links for source node
        outgoing.get(sourceId)!.add(targetId)

        // Add to incoming links (backlinks) for target node
        incoming.get(targetId)!.add(sourceId)
      }
    }
  }

  return { outgoing, incoming }
}

/**
 * Gets the outgoing links (links FROM this node) from the index.
 *
 * @param linkIndex - The link index
 * @param nodeId - The node ID to get outgoing links for
 * @returns Array of node IDs this node links to
 */
export function getOutgoingLinks(
  linkIndex: LinkIndex,
  nodeId: string
): string[] {
  const links = linkIndex.outgoing.get(nodeId)
  return links ? Array.from(links) : []
}

/**
 * Gets the incoming links (backlinks TO this node) from the index.
 *
 * @param linkIndex - The link index
 * @param nodeId - The node ID to get backlinks for
 * @returns Array of node IDs that link to this node
 */
export function getIncomingLinks(
  linkIndex: LinkIndex,
  nodeId: string
): string[] {
  const links = linkIndex.incoming.get(nodeId)
  return links ? Array.from(links) : []
}

/**
 * Gets all related nodes (both outgoing and incoming links).
 *
 * @param linkIndex - The link index
 * @param nodeId - The node ID to get related nodes for
 * @returns Object with outgoing and incoming arrays
 */
export function getRelatedNodes(
  linkIndex: LinkIndex,
  nodeId: string
): { outgoing: string[]; incoming: string[] } {
  return {
    outgoing: getOutgoingLinks(linkIndex, nodeId),
    incoming: getIncomingLinks(linkIndex, nodeId),
  }
}

/**
 * Checks if a node has any links (outgoing or incoming).
 *
 * @param linkIndex - The link index
 * @param nodeId - The node ID to check
 * @returns True if the node has any connections
 */
export function hasLinks(linkIndex: LinkIndex, nodeId: string): boolean {
  const outgoing = linkIndex.outgoing.get(nodeId)
  const incoming = linkIndex.incoming.get(nodeId)

  return (outgoing?.size ?? 0) > 0 || (incoming?.size ?? 0) > 0
}

/**
 * Gets count of outgoing links for a node.
 */
export function getOutgoingLinkCount(
  linkIndex: LinkIndex,
  nodeId: string
): number {
  return linkIndex.outgoing.get(nodeId)?.size ?? 0
}

/**
 * Gets count of incoming links (backlinks) for a node.
 */
export function getIncomingLinkCount(
  linkIndex: LinkIndex,
  nodeId: string
): number {
  return linkIndex.incoming.get(nodeId)?.size ?? 0
}

/**
 * Finds all broken links in a node's content.
 *
 * Returns link targets that couldn't be resolved to existing nodes.
 *
 * @param content - The markdown content to check
 * @param nodes - Map of all nodes
 * @returns Array of unresolved link targets
 */
export function findBrokenLinks(
  content: string,
  nodes: Map<string, ForgeNode>
): string[] {
  const rawLinks = extractWikiLinks(content)
  const broken: string[] = []

  for (const linkTarget of rawLinks) {
    const resolved = resolveLinkTarget(linkTarget, nodes)
    if (!resolved) {
      broken.push(linkTarget)
    }
  }

  return broken
}

/**
 * Checks if a specific link target exists in the node map.
 *
 * @param linkTarget - The link target to check
 * @param nodes - Map of all nodes
 * @returns True if the link can be resolved
 */
export function isValidLink(
  linkTarget: string,
  nodes: Map<string, ForgeNode>
): boolean {
  return resolveLinkTarget(linkTarget, nodes) !== null
}
