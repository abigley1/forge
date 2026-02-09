/**
 * AddInventoryItemModal Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddInventoryItemModal } from './AddInventoryItemModal'
import { useInventoryStore } from '@/store/useInventoryStore'
import type { InventoryCategoryWithSubcategories } from '@/types/inventory'

// Mock the store
vi.mock('@/store/useInventoryStore', () => ({
  useInventoryStore: vi.fn(),
}))

const mockUseInventoryStore = useInventoryStore as unknown as ReturnType<
  typeof vi.fn
>

// =============================================================================
// Test Data
// =============================================================================

const mockCategories: InventoryCategoryWithSubcategories[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    sortOrder: 0,
    subcategories: [
      {
        id: 'electronics-capacitors',
        categoryId: 'electronics',
        name: 'Capacitors',
        sortOrder: 0,
      },
      {
        id: 'electronics-resistors',
        categoryId: 'electronics',
        name: 'Resistors',
        sortOrder: 1,
      },
    ],
  },
  {
    id: 'fasteners',
    name: 'Fasteners',
    sortOrder: 1,
    subcategories: [
      {
        id: 'fasteners-screws',
        categoryId: 'fasteners',
        name: 'Screws',
        sortOrder: 0,
      },
    ],
  },
]

interface MockStoreState {
  categories: InventoryCategoryWithSubcategories[]
  isLoading: boolean
  error: string | null
  createItem: ReturnType<typeof vi.fn>
  fetchCategories: ReturnType<typeof vi.fn>
}

function createStoreMock(state: MockStoreState) {
  return (selector?: (s: MockStoreState) => unknown) => {
    if (selector) {
      return selector(state)
    }
    return state
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('AddInventoryItemModal', () => {
  const mockCreateItem = vi.fn()
  const mockFetchCategories = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateItem.mockResolvedValue({ id: 'new-item', name: 'Test Item' })
    mockUseInventoryStore.mockImplementation(
      createStoreMock({
        categories: mockCategories,
        isLoading: false,
        error: null,
        createItem: mockCreateItem,
        fetchCategories: mockFetchCategories,
      })
    )
  })

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe('rendering', () => {
    it('should render when open is true', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: /add.*item/i })
      ).toBeInTheDocument()
    })

    it('should not render when open is false', () => {
      render(<AddInventoryItemModal open={false} onClose={mockOnClose} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render required form fields', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      expect(screen.getByLabelText(/^name\b/i)).toBeInTheDocument()
      expect(
        screen.getByRole('combobox', { name: /^category\b/i })
      ).toBeInTheDocument()
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
    })

    it('should render optional form fields', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      expect(screen.getByLabelText(/subcategory/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/supplier/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/part number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/cost/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })

    it('should render category options from store', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      const categorySelect = screen.getByRole('combobox', {
        name: /^category\b/i,
      })
      expect(
        within(categorySelect).getByRole('option', { name: 'Electronics' })
      ).toBeInTheDocument()
      expect(
        within(categorySelect).getByRole('option', { name: 'Fasteners' })
      ).toBeInTheDocument()
    })

    it('should show submit and cancel buttons', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      expect(
        screen.getByRole('button', { name: /add item/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Form Interaction
  // ===========================================================================

  describe('form interaction', () => {
    it('should update name field on input', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      const nameInput = screen.getByLabelText(/^name\b/i)
      await user.type(nameInput, 'Test Item')

      expect(nameInput).toHaveValue('Test Item')
    })

    it('should update category and show subcategories', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      const categorySelect = screen.getByRole('combobox', {
        name: /^category\b/i,
      })
      await user.selectOptions(categorySelect, 'electronics')

      expect(categorySelect).toHaveValue('electronics')

      // Subcategories should now be populated
      const subcategorySelect = screen.getByLabelText(/subcategory/i)
      expect(
        within(subcategorySelect).getByRole('option', { name: 'Capacitors' })
      ).toBeInTheDocument()
      expect(
        within(subcategorySelect).getByRole('option', { name: 'Resistors' })
      ).toBeInTheDocument()
    })

    it('should reset subcategory when category changes', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      // Select Electronics and a subcategory
      const categorySelect = screen.getByRole('combobox', {
        name: /^category\b/i,
      })
      await user.selectOptions(categorySelect, 'electronics')

      const subcategorySelect = screen.getByLabelText(/subcategory/i)
      await user.selectOptions(subcategorySelect, 'electronics-capacitors')
      expect(subcategorySelect).toHaveValue('electronics-capacitors')

      // Change category to Fasteners
      await user.selectOptions(categorySelect, 'fasteners')

      // Subcategory should be reset
      expect(subcategorySelect).toHaveValue('')
    })

    it('should update quantity field', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      const qtyInput = screen.getByLabelText(/quantity/i)
      await user.clear(qtyInput)
      await user.type(qtyInput, '25')

      expect(qtyInput).toHaveValue(25)
    })

    it('should default quantity to 1', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      const qtyInput = screen.getByLabelText(/quantity/i)
      expect(qtyInput).toHaveValue(1)
    })
  })

  // ===========================================================================
  // Form Submission
  // ===========================================================================

  describe('form submission', () => {
    it('should call createItem with form data on submit', async () => {
      const user = userEvent.setup()
      render(
        <AddInventoryItemModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill required fields
      await user.type(screen.getByLabelText(/^name\b/i), 'New Component')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )

      // Fill optional fields
      await user.selectOptions(
        screen.getByLabelText(/subcategory/i),
        'electronics-capacitors'
      )
      await user.clear(screen.getByLabelText(/quantity/i))
      await user.type(screen.getByLabelText(/quantity/i), '10')
      await user.type(screen.getByLabelText(/location/i), 'Bin A1')
      await user.type(screen.getByLabelText(/supplier\b/i), 'DigiKey')
      await user.type(screen.getByLabelText(/part number/i), 'CAP-100')
      await user.type(screen.getByLabelText(/cost/i), '0.50')
      await user.type(screen.getByLabelText(/notes/i), 'Test notes')

      // Submit
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(mockCreateItem).toHaveBeenCalledWith({
        name: 'New Component',
        category_id: 'electronics',
        subcategory_id: 'electronics-capacitors',
        status: 'owned',
        quantity: 10,
        location: 'Bin A1',
        supplier: 'DigiKey',
        part_number: 'CAP-100',
        cost: 0.5,
        notes: 'Test notes',
        supplier_url: null,
        barcode: null,
        image_url: null,
        tags: [],
      })
    })

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup()
      render(
        <AddInventoryItemModal
          open={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      )

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(mockOnSuccess).toHaveBeenCalled()
    })

    it('should call onClose after successful creation', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should reset form after successful creation', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <AddInventoryItemModal open={true} onClose={mockOnClose} />
      )

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))

      // Re-open the modal
      rerender(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      expect(screen.getByLabelText(/^name\b/i)).toHaveValue('')
      expect(screen.getByLabelText(/quantity/i)).toHaveValue(1)
    })
  })

  // ===========================================================================
  // Validation
  // ===========================================================================

  describe('validation', () => {
    it('should show error when name is empty', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      // Select category but leave name empty
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(mockCreateItem).not.toHaveBeenCalled()
    })

    it('should show error when category is not selected', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(screen.getByText(/category is required/i)).toBeInTheDocument()
      expect(mockCreateItem).not.toHaveBeenCalled()
    })

    it('should show error when quantity is negative', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.clear(screen.getByLabelText(/quantity/i))
      await user.type(screen.getByLabelText(/quantity/i), '-5')
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(screen.getByText(/quantity.*negative/i)).toBeInTheDocument()
      expect(mockCreateItem).not.toHaveBeenCalled()
    })

    it('should show error when cost is negative', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.type(screen.getByLabelText(/cost/i), '-10')
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(screen.getByText(/cost.*negative/i)).toBeInTheDocument()
      expect(mockCreateItem).not.toHaveBeenCalled()
    })

    it('should clear errors when user corrects input', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      // Trigger validation error
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()

      // Fix the error
      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')

      // Error should be cleared
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Cancel & Close
  // ===========================================================================

  describe('cancel and close', () => {
    it('should call onClose when cancel button clicked', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when clicking outside modal', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      // Click the backdrop (the fixed overlay behind the dialog)
      const backdrop = document.querySelector('[class*="bg-black/50"]')
      await user.click(backdrop!)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should call onClose when pressing Escape', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('loading state', () => {
    it('should disable submit button while submitting', async () => {
      mockCreateItem.mockImplementation(() => new Promise(() => {})) // Never resolves
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
    })

    it('should show loading indicator while submitting', async () => {
      mockCreateItem.mockImplementation(() => new Promise(() => {}))
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(screen.getByText(/adding/i)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should show error message when createItem fails', async () => {
      mockCreateItem.mockResolvedValue(null) // null indicates failure
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.type(screen.getByLabelText(/^name\b/i), 'Test Item')
      await user.selectOptions(
        screen.getByRole('combobox', { name: /^category\b/i }),
        'electronics'
      )
      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(screen.getByText(/failed to create/i)).toBeInTheDocument()
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('accessibility', () => {
    it('should have accessible dialog', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAccessibleName(/add.*item/i)
    })

    it('should focus an element within the dialog when opened', async () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await waitFor(
        () => {
          // Either the name input or the dialog itself should have focus
          const dialog = screen.getByRole('dialog')
          expect(dialog.contains(document.activeElement)).toBe(true)
        },
        { timeout: 1000 }
      )
    })

    it('should have labels for all inputs', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      const inputs = screen.getAllByRole('textbox')
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName()
      })

      const selects = screen.getAllByRole('combobox')
      selects.forEach((select) => {
        expect(select).toHaveAccessibleName()
      })
    })
  })

  // ===========================================================================
  // Quick Add Tab
  // ===========================================================================

  describe('quick add tab', () => {
    it('should render tab navigation with Manual and Quick Add tabs', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      expect(screen.getByRole('tab', { name: /manual/i })).toBeInTheDocument()
      expect(
        screen.getByRole('tab', { name: /quick add/i })
      ).toBeInTheDocument()
    })

    it('should show Manual tab by default', () => {
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      expect(screen.getByRole('tab', { name: /manual/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      // Manual form should be visible
      expect(screen.getByLabelText(/^name\b/i)).toBeInTheDocument()
    })

    it('should switch to Quick Add tab when clicked', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))

      expect(screen.getByRole('tab', { name: /quick add/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      // Quick Add should show URL input
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
    })

    it('should show URL input and Extract button in Quick Add tab', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))

      expect(screen.getByLabelText(/url/i)).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /extract/i })
      ).toBeInTheDocument()
    })

    it('should disable Extract button when URL is empty', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))

      expect(screen.getByRole('button', { name: /extract/i })).toBeDisabled()
    })

    it('should enable Extract button when URL is entered', async () => {
      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))
      await user.type(
        screen.getByLabelText(/url/i),
        'https://amazon.com/product'
      )

      expect(
        screen.getByRole('button', { name: /extract/i })
      ).not.toBeDisabled()
    })

    it('should call API and pre-fill form when Extract is clicked', async () => {
      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              name: 'Arduino Uno',
              supplier: 'Amazon',
              supplierUrl: 'https://amazon.com/dp/B123',
              cost: 24.95,
              partNumber: null,
              imageUrl: 'https://example.com/image.jpg',
              _extractedFrom: 'amazon',
            },
          }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))
      await user.type(
        screen.getByLabelText(/url/i),
        'https://amazon.com/dp/B123'
      )
      await user.click(screen.getByRole('button', { name: /extract/i }))

      // Should switch to manual tab with pre-filled data
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /manual/i })).toHaveAttribute(
          'aria-selected',
          'true'
        )
      })

      // Form should be pre-filled
      expect(screen.getByLabelText(/^name\b/i)).toHaveValue('Arduino Uno')
      expect(screen.getByLabelText(/supplier/i)).toHaveValue('Amazon')
      expect(screen.getByLabelText(/cost/i)).toHaveValue(24.95)

      vi.unstubAllGlobals()
    })

    it('should default to wishlist status when extracting from URL', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              name: 'Test Product',
              supplier: 'Test Store',
              supplierUrl: 'https://example.com/product',
              cost: null,
              partNumber: null,
              imageUrl: null,
              _extractedFrom: 'generic',
            },
          }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))
      await user.type(
        screen.getByLabelText(/url/i),
        'https://example.com/product'
      )
      await user.click(screen.getByRole('button', { name: /extract/i }))

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /manual/i })).toHaveAttribute(
          'aria-selected',
          'true'
        )
      })

      // Status should be wishlist
      expect(screen.getByRole('combobox', { name: /status/i })).toHaveValue(
        'wishlist'
      )

      vi.unstubAllGlobals()
    })

    it('should show error when extraction fails', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch URL' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))
      await user.type(screen.getByLabelText(/url/i), 'https://invalid-url.com')
      await user.click(screen.getByRole('button', { name: /extract/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
      })

      vi.unstubAllGlobals()
    })

    it('should show loading state while extracting', async () => {
      const mockFetch = vi.fn().mockImplementation(() => new Promise(() => {}))
      vi.stubGlobal('fetch', mockFetch)

      const user = userEvent.setup()
      render(<AddInventoryItemModal open={true} onClose={mockOnClose} />)

      await user.click(screen.getByRole('tab', { name: /quick add/i }))
      await user.type(
        screen.getByLabelText(/url/i),
        'https://amazon.com/product'
      )
      await user.click(screen.getByRole('button', { name: /extract/i }))

      expect(screen.getByRole('button', { name: /extracting/i })).toBeDisabled()

      vi.unstubAllGlobals()
    })
  })
})
