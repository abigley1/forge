import { AlertTriangle, Link2Off } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BrokenLinkInfo = {
  /** The raw link target text */
  target: string
  /** Optional callback when clicking a broken link to create it */
  onCreate?: () => void
}

export type BrokenLinksBadgeProps = {
  /** Array of broken link targets */
  brokenLinks: BrokenLinkInfo[]
  /** Callback when a broken link is clicked (for navigation/creation) */
  onBrokenLinkClick?: (target: string) => void
  /** Additional className for the container */
  className?: string
}

/**
 * Badge component showing the count of broken wiki-links in the editor.
 * Displays as a warning indicator with a dropdown listing the broken links.
 *
 * Part of Sprint 4 Task 4.5: Link Validation
 */
export function BrokenLinksBadge({
  brokenLinks,
  onBrokenLinkClick,
  className,
}: BrokenLinksBadgeProps) {
  const count = brokenLinks.length

  if (count === 0) {
    return null
  }

  return (
    <div className={cn('relative inline-flex', className)}>
      <div className="group relative">
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium',
            'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
            'hover:bg-red-100 dark:hover:bg-red-900',
            'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none'
          )}
          aria-label={`${count} broken link${count === 1 ? '' : 's'}`}
          aria-describedby="broken-links-description"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>{count}</span>
        </button>

        {/* Dropdown on hover */}
        <div
          className={cn(
            'invisible absolute top-full right-0 z-50 mt-1 max-w-[300px] min-w-[200px]',
            'rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800',
            'opacity-0 transition-opacity duration-150',
            'group-hover:visible group-hover:opacity-100',
            'focus-within:visible focus-within:opacity-100'
          )}
          role="tooltip"
          id="broken-links-description"
        >
          <div className="p-2">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              <Link2Off className="h-3 w-3" aria-hidden="true" />
              Broken Links
            </h3>
            <ul className="space-y-1">
              {brokenLinks.map((link, index) => (
                <li key={`${link.target}-${index}`}>
                  {onBrokenLinkClick ? (
                    <button
                      type="button"
                      onClick={() => onBrokenLinkClick(link.target)}
                      className={cn(
                        'w-full rounded px-2 py-1 text-left text-sm',
                        'text-red-600 dark:text-red-400',
                        'hover:bg-gray-100 dark:hover:bg-gray-700',
                        'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none'
                      )}
                    >
                      <span className="font-mono">[[{link.target}]]</span>
                    </button>
                  ) : (
                    <span
                      className={cn(
                        'block rounded px-2 py-1 text-sm',
                        'text-red-600 dark:text-red-400'
                      )}
                    >
                      <span className="font-mono">[[{link.target}]]</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
