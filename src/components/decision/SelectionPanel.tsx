import { useState, useCallback, useRef } from 'react'
import { Check, RotateCcw, Trophy, AlertCircle } from 'lucide-react'
import type { DecisionNode, DecisionOption } from '@/types/nodes'
import { cn } from '@/lib/utils'
import { AlertDialog } from '@/components/ui'

export interface SelectionPanelProps {
  node: DecisionNode
  onChange: (updates: Partial<DecisionNode>) => void
  disabled?: boolean
  className?: string
}

/**
 * SelectionPanel component for managing decision option selection
 *
 * Features:
 * - Select button for each option to mark as chosen
 * - Rationale text area (auto-populated with option name, editable)
 * - Reopen Decision button to revert to pending status
 */
export function SelectionPanel({
  node,
  onChange,
  disabled = false,
  className,
}: SelectionPanelProps) {
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false)
  const rationaleRef = useRef<HTMLTextAreaElement>(null)

  const selectedOption = node.options.find((opt) => opt.id === node.selected)

  const handleSelectOption = useCallback(
    (option: DecisionOption) => {
      if (disabled) return

      // Auto-populate rationale with a default message
      const defaultRationale = `Selected "${option.name}" as the best option.`

      onChange({
        selected: option.id,
        status: 'selected',
        rationale: defaultRationale,
        selectedDate: new Date(),
      })

      // Focus the rationale textarea for editing
      setTimeout(() => {
        rationaleRef.current?.focus()
        rationaleRef.current?.select()
      }, 100)
    },
    [disabled, onChange]
  )

  const handleRationaleChange = useCallback(
    (value: string) => {
      onChange({
        rationale: value || null,
      })
    },
    [onChange]
  )

  const handleReopenDecision = useCallback(() => {
    if (disabled) return

    // Revert to pending status. We omit rationale and selectedDate from the update,
    // relying on the parent's merge behavior to preserve them for history reference.
    onChange({
      status: 'pending',
      selected: null,
    })
    setIsReopenDialogOpen(false)
  }, [disabled, onChange])

  // If no options exist, show empty state
  if (node.options.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-gray-300 p-6 text-center',
          className
        )}
      >
        <AlertCircle
          className="mx-auto h-8 w-8 text-gray-400"
          aria-hidden="true"
        />
        <p className="mt-2 text-sm text-gray-600">
          Add options to the comparison table before selecting.
        </p>
      </div>
    )
  }

  // Decision is already selected - show selected state with reopen option
  if (node.status === 'selected' && selectedOption) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Selected Option Display */}
        <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 dark:border-green-600 dark:bg-green-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Decision Made
              </p>
              <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                {selectedOption.name}
              </p>
            </div>
          </div>
        </div>

        {/* Rationale Section */}
        <div>
          <label
            htmlFor="selection-rationale"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Selection Rationale
          </label>
          <textarea
            ref={rationaleRef}
            id="selection-rationale"
            value={node.rationale ?? ''}
            onChange={(e) => handleRationaleChange(e.target.value)}
            disabled={disabled}
            placeholder="Explain why this option was selected..."
            className={cn(
              'w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
              'focus:border-blue-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
              'disabled:cursor-not-allowed disabled:bg-gray-100',
              'dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-blue-400'
            )}
            rows={3}
            aria-describedby="rationale-hint"
          />
          <p
            id="rationale-hint"
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            Document why this option was chosen for future reference.
          </p>
        </div>

        {/* Reopen Decision Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsReopenDialogOpen(true)}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
              'text-amber-700 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'dark:text-amber-400 dark:hover:bg-amber-950'
            )}
            aria-label="Reopen this decision"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reopen Decision
          </button>
        </div>

        {/* Reopen Confirmation Dialog */}
        <AlertDialog.Root
          open={isReopenDialogOpen}
          onOpenChange={setIsReopenDialogOpen}
        >
          <AlertDialog.Portal>
            <AlertDialog.Backdrop />
            <AlertDialog.Popup
              role="alertdialog"
              aria-labelledby="reopen-dialog-title"
              aria-describedby="reopen-dialog-description"
            >
              <AlertDialog.Title id="reopen-dialog-title">
                Reopen Decision
              </AlertDialog.Title>
              <AlertDialog.Description id="reopen-dialog-description">
                This will change the decision status back to pending. The
                selection history will be preserved for reference.
              </AlertDialog.Description>
              <AlertDialog.Footer>
                <AlertDialog.Close variant="cancel">Cancel</AlertDialog.Close>
                <AlertDialog.Close
                  variant="destructive"
                  onClick={handleReopenDecision}
                >
                  Reopen
                </AlertDialog.Close>
              </AlertDialog.Footer>
            </AlertDialog.Popup>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    )
  }

  // Pending state - show option selection buttons
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Select an Option
        </h3>
        <div className="space-y-2">
          {node.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectOption(option)}
              disabled={disabled}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border p-3 text-left',
                'transition-colors motion-reduce:transition-none',
                'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:bg-white',
                'dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-950'
              )}
              aria-label={`Select ${option.name} as the decision`}
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {option.name}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Check className="h-4 w-4" aria-hidden="true" />
                Select
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Show previous selection if reopened */}
      {node.rationale && (
        <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Previous Selection Notes
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {node.rationale}
          </p>
        </div>
      )}
    </div>
  )
}
