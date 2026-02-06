import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const Z_MODAL = 30

type AlertDialogRootProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Root
>

function AlertDialogRoot({ children, ...props }: AlertDialogRootProps) {
  return <BaseAlertDialog.Root {...props}>{children}</BaseAlertDialog.Root>
}

type AlertDialogTriggerProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Trigger
> & {
  className?: string
}

function AlertDialogTrigger({
  className,
  children,
  ...props
}: AlertDialogTriggerProps) {
  return (
    <BaseAlertDialog.Trigger
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2',
        'bg-red-600 text-white hover:bg-red-700',
        'focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </BaseAlertDialog.Trigger>
  )
}

type AlertDialogPortalProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Portal
>

function AlertDialogPortal({ children, ...props }: AlertDialogPortalProps) {
  return <BaseAlertDialog.Portal {...props}>{children}</BaseAlertDialog.Portal>
}

type AlertDialogBackdropProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Backdrop
> & {
  className?: string
}

function AlertDialogBackdrop({
  className,
  ...props
}: AlertDialogBackdropProps) {
  return (
    <BaseAlertDialog.Backdrop
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

type AlertDialogPopupProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Popup
> & {
  className?: string
}

function AlertDialogPopup({
  className,
  children,
  ...props
}: AlertDialogPopupProps) {
  return (
    <BaseAlertDialog.Popup
      className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'bg-forge-paper w-full max-w-md rounded-lg p-6 shadow-lg',
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
    </BaseAlertDialog.Popup>
  )
}

type AlertDialogTitleProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Title
> & {
  className?: string
}

function AlertDialogTitle({
  className,
  children,
  ...props
}: AlertDialogTitleProps) {
  return (
    <BaseAlertDialog.Title
      className={cn(
        'text-forge-text dark:text-forge-text-dark text-lg font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </BaseAlertDialog.Title>
  )
}

type AlertDialogDescriptionProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Description
> & {
  className?: string
}

function AlertDialogDescription({
  className,
  children,
  ...props
}: AlertDialogDescriptionProps) {
  return (
    <BaseAlertDialog.Description
      className={cn(
        'text-forge-text-secondary dark:text-forge-text-secondary-dark mt-2 text-sm',
        className
      )}
      {...props}
    >
      {children}
    </BaseAlertDialog.Description>
  )
}

type AlertDialogCloseProps = ComponentPropsWithoutRef<
  typeof BaseAlertDialog.Close
> & {
  className?: string
  variant?: 'cancel' | 'destructive'
}

function AlertDialogClose({
  className,
  children,
  variant = 'cancel',
  ...props
}: AlertDialogCloseProps) {
  return (
    <BaseAlertDialog.Close
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'cancel' && [
          'border-forge-border bg-forge-surface text-forge-text border',
          'hover:bg-forge-border-subtle',
          'focus-visible:ring-forge-accent',
          'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
          'dark:hover:bg-forge-border-dark dark:focus-visible:ring-forge-accent-dark',
        ],
        variant === 'destructive' && [
          'bg-red-600 text-white',
          'hover:bg-red-700',
          'focus-visible:ring-red-600',
        ],
        className
      )}
      {...props}
    >
      {children}
    </BaseAlertDialog.Close>
  )
}

type AlertDialogFooterProps = {
  className?: string
  children: ReactNode
}

function AlertDialogFooter({ className, children }: AlertDialogFooterProps) {
  return (
    <div className={cn('mt-6 flex justify-end gap-3', className)}>
      {children}
    </div>
  )
}

export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Backdrop: AlertDialogBackdrop,
  Popup: AlertDialogPopup,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Close: AlertDialogClose,
  Footer: AlertDialogFooter,
}
