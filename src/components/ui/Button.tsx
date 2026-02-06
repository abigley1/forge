import { Button as BaseButton } from '@base-ui/react/button'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ComponentPropsWithoutRef<typeof BaseButton> & {
  className?: string
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-forge-accent text-white hover:bg-forge-accent-hover',
    'dark:bg-forge-accent-dark dark:text-forge-paper-dark dark:hover:bg-forge-accent-hover-dark',
    'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark'
  ),
  secondary: cn(
    'border border-forge-border bg-forge-surface text-forge-text',
    'hover:bg-forge-border-subtle',
    'dark:border-forge-border-dark dark:bg-forge-surface-dark dark:text-forge-text-dark',
    'dark:hover:bg-forge-border-dark',
    'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark'
  ),
  destructive: cn(
    'bg-red-600 text-white hover:bg-red-700',
    'focus-visible:ring-red-600'
  ),
  ghost: cn(
    'text-forge-text hover:bg-forge-surface',
    'dark:text-forge-text-dark dark:hover:bg-forge-surface-dark',
    'focus-visible:ring-forge-accent dark:focus-visible:ring-forge-accent-dark'
  ),
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4',
  lg: 'h-12 px-6 text-lg',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        'transition-colors duration-150',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
}
