/**
 * Wiki-Link Announcer Component
 *
 * Provides an aria-live region for announcing wiki-link autocomplete
 * events to screen readers. This component renders a visually hidden
 * element that announces:
 * - Link insertions
 * - Navigation through suggestions
 * - Result count changes
 */

import { memo } from 'react'

export interface WikiLinkAnnouncerProps {
  /** The announcement to read to screen readers */
  announcement: string
  /**
   * Politeness level for the aria-live region
   * @default 'polite'
   */
  politeness?: 'polite' | 'assertive'
}

/**
 * Component that provides accessibility announcements for wiki-link autocomplete
 *
 * This renders a visually hidden aria-live region that announces autocomplete
 * events to screen readers. The announcement text is passed as a prop and
 * should be updated by the useWikiLinkAutocomplete hook.
 *
 * @example
 * ```tsx
 * function Editor() {
 *   const { announcement } = useWikiLinkAutocomplete()
 *
 *   return (
 *     <>
 *       <MarkdownEditor enableWikiLinks ... />
 *       <WikiLinkAnnouncer announcement={announcement} />
 *     </>
 *   )
 * }
 * ```
 */
export const WikiLinkAnnouncer = memo(function WikiLinkAnnouncer({
  announcement,
  politeness = 'polite',
}: WikiLinkAnnouncerProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
      data-testid="wiki-link-announcer"
    >
      {announcement}
    </div>
  )
})
