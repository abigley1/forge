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
        'bg-gray-900 text-white hover:bg-gray-800',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        'dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200',
        'dark:focus-visible:ring-gray-300',
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
        'w-full max-w-lg rounded-lg bg-white p-6 shadow-lg',
        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
        'transition-[transform,opacity] duration-150',
        'dark:bg-gray-900 dark:text-gray-100',
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
        'text-lg font-semibold text-gray-900 dark:text-gray-100',
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
      className={cn('mt-2 text-sm text-gray-600 dark:text-gray-400', className)}
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
        'border border-gray-300 bg-white text-gray-700',
        'hover:bg-gray-50',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
        'dark:hover:bg-gray-700 dark:focus-visible:ring-gray-300',
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
