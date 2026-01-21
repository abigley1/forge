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
    'bg-gray-900 text-white hover:bg-gray-800',
    'dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200',
    'focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300'
  ),
  secondary: cn(
    'border border-gray-300 bg-white text-gray-700',
    'hover:bg-gray-50',
    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    'dark:hover:bg-gray-700',
    'focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300'
  ),
  destructive: cn(
    'bg-red-600 text-white hover:bg-red-700',
    'focus-visible:ring-red-600'
  ),
  ghost: cn(
    'text-gray-700 hover:bg-gray-100',
    'dark:text-gray-300 dark:hover:bg-gray-800',
    'focus-visible:ring-gray-950 dark:focus-visible:ring-gray-300'
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
