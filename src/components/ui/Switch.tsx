/**
 * Switch Component
 *
 * A toggle switch for boolean settings.
 * Built on Base UI Switch for accessibility.
 */

import { Switch as BaseSwitch } from '@base-ui/react/switch'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  /** Whether the switch is checked */
  checked?: boolean
  /** Default checked state for uncontrolled usage */
  defaultChecked?: boolean
  /** Callback when checked state changes */
  onCheckedChange?: (checked: boolean) => void
  /** Whether the switch is disabled */
  disabled?: boolean
  /** Accessible label for the switch */
  'aria-label'?: string
  /** ID of the label element */
  'aria-labelledby'?: string
  /** Name for form submission */
  name?: string
  /** Additional CSS classes */
  className?: string
}

export function Switch({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  name,
  className,
}: SwitchProps) {
  return (
    <BaseSwitch.Root
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      name={name}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-colors',
        'focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none',
        'dark:focus-visible:ring-gray-300',
        'disabled:cursor-not-allowed disabled:opacity-50',
        // Unchecked state
        'bg-gray-200 dark:bg-gray-700',
        // Checked state (data attribute from Base UI)
        'data-[checked]:bg-gray-900 dark:data-[checked]:bg-gray-100',
        className
      )}
    >
      <BaseSwitch.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform',
          'bg-white dark:bg-gray-900',
          // Position: left when unchecked, right when checked
          'translate-x-0 data-[checked]:translate-x-5'
        )}
      />
    </BaseSwitch.Root>
  )
}
