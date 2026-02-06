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
          'border-forge-border rounded-lg border border-dashed p-6 text-center',
          className
        )}
      >
        <AlertCircle
          className="text-forge-muted mx-auto h-8 w-8"
          aria-hidden="true"
        />
        <p className="text-forge-text-secondary mt-2 text-sm">
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
            className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-1 block font-mono text-xs tracking-wider uppercase"
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
              'border-forge-border w-full rounded-md border px-3 py-2 text-sm',
              'focus:border-forge-accent focus-visible:ring-forge-accent focus:outline-none focus-visible:ring-1',
              'disabled:bg-forge-surface disabled:cursor-not-allowed',
              'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:text-forge-text-dark dark:focus:border-forge-accent-dark'
            )}
            rows={3}
            aria-describedby="rationale-hint"
          />
          <p
            id="rationale-hint"
            className="text-forge-muted dark:text-forge-muted-dark mt-1 text-xs"
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
        <h3 className="text-forge-text-secondary dark:text-forge-text-secondary-dark mb-2 font-mono text-xs tracking-wider uppercase">
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
                'border-forge-border bg-forge-paper hover:border-forge-accent hover:bg-forge-surface',
                'focus-visible:ring-forge-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                'disabled:hover:border-forge-border disabled:hover:bg-forge-paper disabled:cursor-not-allowed disabled:opacity-50',
                'dark:border-forge-border-dark dark:bg-forge-paper-dark dark:hover:border-forge-accent-dark dark:hover:bg-forge-surface-dark'
              )}
              aria-label={`Select ${option.name} as the decision`}
            >
              <span className="text-forge-text dark:text-forge-text-dark font-medium">
                {option.name}
              </span>
              <span className="text-forge-muted dark:text-forge-muted-dark flex items-center gap-1 text-sm">
                <Check className="h-4 w-4" aria-hidden="true" />
                Select
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Show previous selection if reopened */}
      {node.rationale && (
        <div className="bg-forge-surface dark:bg-forge-surface-dark rounded-md p-3">
          <p className="text-forge-muted dark:text-forge-muted-dark text-xs font-medium">
            Previous Selection Notes
          </p>
          <p className="text-forge-text dark:text-forge-text-dark mt-1 text-sm">
            {node.rationale}
          </p>
        </div>
      )}
    </div>
  )
}
