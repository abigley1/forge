import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SkipLinkProps {
  href: string
  children: ReactNode
  className?: string
}

/**
 * SkipLink provides keyboard users a way to skip repetitive navigation.
 * Hidden by default, becomes visible on focus (Tab key).
 *
 * Usage: Place at the very beginning of the page, targeting the main content area.
 */
export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only',
        'fixed top-4 left-4 z-50',
        'rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none',
        'dark:bg-white dark:text-gray-900',
        className
      )}
    >
      {children}
    </a>
  )
}
