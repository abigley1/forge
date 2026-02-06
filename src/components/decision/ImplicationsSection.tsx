import { useMemo } from 'react'
import { ArrowRight, Link2, AlertTriangle } from 'lucide-react'
import type { DecisionNode, ForgeNode } from '@/types/nodes'
import { cn } from '@/lib/utils'

export interface ImplicationsSectionProps {
  node: DecisionNode
  /** Map of all nodes for resolving wiki-links */
  nodes?: Map<string, ForgeNode>
  /** Callback when a linked node is clicked */
  onNodeClick?: (nodeId: string) => void
  className?: string
}

interface ParsedImplication {
  text: string
  links: Array<{
    id: string
    title: string
    exists: boolean
    startIndex: number
    endIndex: number
  }>
}

/**
 * Extracts the content under ## Implications header
 */
function extractImplicationsContent(content: string): string | null {
  // Match ## Implications followed by content until the next ## heading or end of string
  const regex = /##\s*Implications\s*\n([\s\S]*?)(?=\n##\s|$)/i
  const match = content.match(regex)
  return match ? match[1].trim() : null
}

/**
 * Parses wiki-links [[...]] from text
 */
function parseWikiLinks(
  text: string
): Array<{ title: string; startIndex: number; endIndex: number }> {
  const links: Array<{ title: string; startIndex: number; endIndex: number }> =
    []
  const regex = /\[\[([^\]]+)\]\]/g
  let match

  while ((match = regex.exec(text)) !== null) {
    links.push({
      title: match[1],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return links
}

/**
 * Parses implications text into structured data
 */
function parseImplications(
  content: string,
  nodes?: Map<string, ForgeNode>
): ParsedImplication[] {
  const implicationsContent = extractImplicationsContent(content)
  if (!implicationsContent) return []

  // Split into lines/paragraphs
  const lines = implicationsContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((line) => {
    // Remove leading bullet/number if present
    const cleanLine = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '')
    const rawLinks = parseWikiLinks(cleanLine)

    const links = rawLinks.map((link) => {
      // Find node by title (case-insensitive)
      let nodeId: string | null = null
      let exists = false

      if (nodes) {
        for (const [id, node] of nodes) {
          if (node.title.toLowerCase() === link.title.toLowerCase()) {
            nodeId = id
            exists = true
            break
          }
          // Also check if the link matches the node ID
          if (id.toLowerCase() === link.title.toLowerCase()) {
            nodeId = id
            exists = true
            break
          }
        }
      }

      return {
        id: nodeId ?? link.title,
        title: link.title,
        exists,
        startIndex: link.startIndex,
        endIndex: link.endIndex,
      }
    })

    return { text: cleanLine, links }
  })
}

/**
 * ImplicationsSection component displaying decision implications
 *
 * Features:
 * - Parses ## Implications section from node content
 * - Renders wiki-links as clickable navigation
 * - Shows warning for broken links
 */
export function ImplicationsSection({
  node,
  nodes,
  onNodeClick,
  className,
}: ImplicationsSectionProps) {
  const implications = useMemo(
    () => parseImplications(node.content, nodes),
    [node.content, nodes]
  )

  // Don't render if no implications
  if (implications.length === 0) {
    return null
  }

  const hasBrokenLinks = implications.some((imp) =>
    imp.links.some((link) => !link.exists)
  )

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-forge-muted dark:text-forge-muted-dark text-xs font-medium tracking-wider uppercase">
          Implications
        </h4>
        {hasBrokenLinks && (
          <span
            className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
            title="Some linked nodes could not be found"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Broken links
          </span>
        )}
      </div>

      <ul className="space-y-2" aria-label="Decision implications">
        {implications.map((implication, idx) => (
          <li
            key={idx}
            className="text-forge-text-secondary dark:text-forge-text-secondary-dark flex items-start gap-2 text-sm"
          >
            <ArrowRight
              className="text-forge-muted mt-0.5 h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{renderImplicationText(implication, onNodeClick)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Renders implication text with clickable wiki-links
 */
function renderImplicationText(
  implication: ParsedImplication,
  onNodeClick?: (nodeId: string) => void
) {
  const { text, links } = implication

  if (links.length === 0) {
    return text
  }

  const parts: React.ReactNode[] = []
  let lastIndex = 0

  links.forEach((link, idx) => {
    // Add text before the link
    if (link.startIndex > lastIndex) {
      parts.push(text.slice(lastIndex, link.startIndex))
    }

    // Add the link
    parts.push(
      <button
        key={`link-${idx}`}
        type="button"
        onClick={() => onNodeClick?.(link.id)}
        disabled={!link.exists || !onNodeClick}
        className={cn(
          // min-h-[44px] ensures touch target compliance while inline-flex keeps it in text flow
          'inline-flex min-h-[44px] items-center gap-0.5 rounded px-1.5 font-medium',
          link.exists
            ? 'text-forge-accent hover:text-forge-accent-hover dark:text-forge-accent-dark dark:hover:text-forge-accent-hover-dark hover:underline'
            : 'cursor-not-allowed text-red-500 line-through dark:text-red-400',
          'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none'
        )}
        title={
          link.exists
            ? `Navigate to ${link.title}`
            : `"${link.title}" not found`
        }
        aria-label={
          link.exists
            ? `Navigate to ${link.title}`
            : `Broken link: ${link.title} not found`
        }
      >
        <Link2 className="h-3 w-3" aria-hidden="true" />
        {link.title}
      </button>
    )

    lastIndex = link.endIndex
  })

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}

// eslint-disable-next-line react-refresh/only-export-components
export { extractImplicationsContent, parseImplications }
