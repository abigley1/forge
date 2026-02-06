import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const Z_MODAL = 30

type DialogRootProps = ComponentPropsWithoutRef<typeof BaseDialog.Root>

function DialogRoot({ children, modal = true, ...props }: DialogRootProps) {
  return (
    <BaseDialog.Root modal={modal} {...props}>
      {children}
    </BaseDialog.Root>
  )
}

type DialogTriggerProps = ComponentPropsWithoutRef<
  typeof BaseDialog.Trigger
> & {
  className?: string
}

function DialogTrigger({ className, children, ...props }: DialogTriggerProps) {
  return (
    <BaseDialog.Trigger
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2',
        'bg-forge-text text-forge-paper hover:bg-forge-text/90',
        'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        'dark:bg-forge-text-dark dark:text-forge-paper-dark dark:hover:bg-forge-text-dark/90',
        'dark:focus-visible:ring-forge-accent-dark',
        className
      )}
      {...props}
    >
      {children}
    </BaseDialog.Trigger>
  )
}

type DialogPortalProps = ComponentPropsWithoutRef<typeof BaseDialog.Portal>

function DialogPortal({ children, ...props }: DialogPortalProps) {
  return <BaseDialog.Portal {...props}>{children}</BaseDialog.Portal>
}

type DialogBackdropProps = ComponentPropsWithoutRef<
  typeof BaseDialog.Backdrop
> & {
  className?: string
}

function DialogBackdrop({ className, ...props }: DialogBackdropProps) {
  return (
    <BaseDialog.Backdrop
      className={cn(
        'fixed inset-0 bg-black/50',
        'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        'transition-opacity duration-150',
        className
      )}
      style={{ zIndex: Z_MODAL - 1 }}
      {...props}
    />
  )
}

type DialogPopupProps = ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {
  className?: string
}

function DialogPopup({ className, children, ...props }: DialogPopupProps) {
  return (
    <BaseDialog.Popup
      className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-forge-paper w-full max-w-lg rounded-lg p-6 shadow-lg',
        'border-forge-border border',
        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
        'transition-[transform,opacity] duration-150',
        'dark:bg-forge-paper-dark dark:text-forge-text-dark dark:border-forge-border-dark',
        'focus:outline-none',
        className
      )}
      style={{ zIndex: Z_MODAL }}
      {...props}
    >
      {children}
    </BaseDialog.Popup>
  )
}

type DialogTitleProps = ComponentPropsWithoutRef<typeof BaseDialog.Title> & {
  className?: string
}

function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <BaseDialog.Title
      className={cn(
        'text-forge-text dark:text-forge-text-dark text-lg font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </BaseDialog.Title>
  )
}

type DialogDescriptionProps = ComponentPropsWithoutRef<
  typeof BaseDialog.Description
> & {
  className?: string
}

function DialogDescription({
  className,
  children,
  ...props
}: DialogDescriptionProps) {
  return (
    <BaseDialog.Description
      className={cn(
        'text-forge-text-secondary dark:text-forge-text-secondary-dark mt-2 text-sm',
        className
      )}
      {...props}
    >
      {children}
    </BaseDialog.Description>
  )
}

type DialogCloseProps = ComponentPropsWithoutRef<typeof BaseDialog.Close> & {
  className?: string
}

function DialogClose({ className, children, ...props }: DialogCloseProps) {
  return (
    <BaseDialog.Close
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2',
        'border-forge-border bg-forge-surface text-forge-text border',
        'hover:bg-forge-border-subtle',
        'focus-visible:ring-forge-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
        'dark:hover:bg-forge-border-dark dark:focus-visible:ring-forge-accent-dark',
        className
      )}
      {...props}
    >
      {children}
    </BaseDialog.Close>
  )
}

type DialogFooterProps = {
  className?: string
  children: ReactNode
}

function DialogFooter({ className, children }: DialogFooterProps) {
  return (
    <div className={cn('mt-6 flex justify-end gap-3', className)}>
      {children}
    </div>
  )
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Popup: DialogPopup,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
  Footer: DialogFooter,
}
