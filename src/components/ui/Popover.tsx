/**
 * Popover Component
 *
 * A floating panel that appears next to a trigger element.
 * Uses @base-ui/react for accessible popover behavior.
 */

import { Popover as BasePopover } from '@base-ui/react/popover'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Z_POPOVER } from '@/lib/z-index'

type PopoverRootProps = ComponentPropsWithoutRef<typeof BasePopover.Root>

function PopoverRoot({ children, ...props }: PopoverRootProps) {
  return <BasePopover.Root {...props}>{children}</BasePopover.Root>
}

type PopoverTriggerProps = ComponentPropsWithoutRef<
  typeof BasePopover.Trigger
> & {
  className?: string
}

function PopoverTrigger({
  className,
  children,
  ...props
}: PopoverTriggerProps) {
  return (
    <BasePopover.Trigger
      className={cn(
        'inline-flex items-center justify-center',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
        'dark:focus-visible:ring-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </BasePopover.Trigger>
  )
}

type PopoverPortalProps = ComponentPropsWithoutRef<typeof BasePopover.Portal>

function PopoverPortal({ children, ...props }: PopoverPortalProps) {
  return <BasePopover.Portal {...props}>{children}</BasePopover.Portal>
}

type PopoverPositionerProps = ComponentPropsWithoutRef<
  typeof BasePopover.Positioner
> & {
  className?: string
}

function PopoverPositioner({
  className,
  children,
  ...props
}: PopoverPositionerProps) {
  return (
    <BasePopover.Positioner
      className={cn('outline-none', className)}
      style={{ zIndex: Z_POPOVER }}
      {...props}
    >
      {children}
    </BasePopover.Positioner>
  )
}

type PopoverPopupProps = ComponentPropsWithoutRef<typeof BasePopover.Popup> & {
  className?: string
}

function PopoverPopup({ className, children, ...props }: PopoverPopupProps) {
  return (
    <BasePopover.Popup
      className={cn(
        'w-72 rounded-lg bg-white p-4 shadow-lg',
        'border border-gray-200',
        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
        'origin-[var(--transform-origin)] transition-[transform,opacity] duration-150',
        'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </BasePopover.Popup>
  )
}

type PopoverArrowProps = ComponentPropsWithoutRef<typeof BasePopover.Arrow> & {
  className?: string
}

function PopoverArrow({ className, ...props }: PopoverArrowProps) {
  return (
    <BasePopover.Arrow
      className={cn(
        'data-[side=bottom]:top-[-8px] data-[side=top]:bottom-[-8px]',
        'data-[side=left]:right-[-8px] data-[side=right]:left-[-8px]',
        className
      )}
      {...props}
    >
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
        <path
          d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
          className="fill-white dark:fill-gray-900"
        />
        <path
          d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.80757 6.97318L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
          className="fill-gray-200 dark:fill-gray-700"
        />
      </svg>
    </BasePopover.Arrow>
  )
}

type PopoverTitleProps = {
  className?: string
  children: ReactNode
}

function PopoverTitle({ className, children }: PopoverTitleProps) {
  return (
    <h3
      className={cn(
        'text-sm font-semibold text-gray-900 dark:text-gray-100',
        className
      )}
    >
      {children}
    </h3>
  )
}

type PopoverCloseProps = ComponentPropsWithoutRef<typeof BasePopover.Close> & {
  className?: string
}

function PopoverClose({ className, children, ...props }: PopoverCloseProps) {
  return (
    <BasePopover.Close
      className={cn(
        'absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded',
        'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:outline-none',
        'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
        'dark:focus-visible:ring-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </BasePopover.Close>
  )
}

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Portal: PopoverPortal,
  Positioner: PopoverPositioner,
  Popup: PopoverPopup,
  Arrow: PopoverArrow,
  Title: PopoverTitle,
  Close: PopoverClose,
}
