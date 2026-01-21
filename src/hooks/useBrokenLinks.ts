import { useMemo } from 'react'
import type { ForgeNode } from '@/types/nodes'
import { findBrokenLinks } from '@/lib/links'

export type BrokenLink = {
  /** The raw link target text (from [[target]]) */
  target: string
  /** Whether this is a title-based link vs ID-based */
  isTitle: boolean
}

export type UseBrokenLinksOptions = {
  /** The markdown content to scan for broken links */
  content: string
  /** All available nodes for link resolution */
  nodes: Map<string, ForgeNode>
}

export type UseBrokenLinksResult = {
  /** Array of broken link targets */
  brokenLinks: BrokenLink[]
  /** Count of broken links */
  brokenLinkCount: number
  /** Whether there are any broken links */
  hasBrokenLinks: boolean
}

/**
 * Hook to detect broken wiki-links in markdown content.
 * Uses the findBrokenLinks utility from lib/links.ts
 */
export function useBrokenLinks({
  content,
  nodes,
}: UseBrokenLinksOptions): UseBrokenLinksResult {
  const brokenLinks = useMemo(() => {
    if (!content || nodes.size === 0) {
      return []
    }

    const brokenTargets = findBrokenLinks(content, nodes)

    return brokenTargets.map((target) => ({
      target,
      // A link is title-based if it doesn't match the slug pattern
      isTitle: !/^[a-z0-9-]+$/.test(target),
    }))
  }, [content, nodes])

  return {
    brokenLinks,
    brokenLinkCount: brokenLinks.length,
    hasBrokenLinks: brokenLinks.length > 0,
  }
}
