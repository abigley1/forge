/**
 * InventoryList Tests
 *
 * Following TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InventoryList } from './InventoryList'
import { useInventoryStore } from '@/store/useInventoryStore'
import type { InventoryItem } from '@/types/inventory'

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

const mockItems: InventoryItem[] = [
  {
    id: 'item-1',
    name: 'Arduino Uno',
    category: 'electronics',
    subcategory: 'electronics-microcontrollers',
    status: 'owned',
    quantity: 5,
    lowStockThreshold: null,
    location: 'Bin A1',
    supplier: 'DigiKey',
    supplierUrl: 'https://digikey.com/arduino',
    partNumber: 'ARD-UNO-R3',
    cost: 25.0,
    barcode: null,
    notes: 'Popular microcontroller board',
    imageUrl: null,
    tags: ['microcontroller', 'arduino'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'item-2',
    name: '10uF Capacitor',
    category: 'electronics',
    subcategory: 'electronics-capacitors',
    status: 'owned',
    quantity: 100,
    lowStockThreshold: null,
    location: 'Bin B2',
    supplier: 'Mouser',
    supplierUrl: null,
    partNumber: 'CAP-10UF-25V',
    cost: 0.1,
    barcode: '123456789012',
    notes: null,
    imageUrl: null,
    tags: ['capacitor', 'passive'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'item-3',
    name: 'M3x10 Screws',
    category: 'fasteners',
    subcategory: 'fasteners-screws',
    status: 'owned',
    quantity: 2,
    lowStockThreshold: 5,
    location: 'Drawer 1',
    supplier: null,
    supplierUrl: null,
    partNumber: null,
    cost: null,
    barcode: null,
    notes: 'Running low!',
    imageUrl: null,
    tags: [],
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
]

// Helper to create store mock
interface MockStoreState {
  items: InventoryItem[]
  isLoading: boolean
  error: string | null
  adjustQuantity: (id: string, delta: number) => Promise<boolean>
  deleteItem: (id: string) => Promise<boolean>
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

describe('InventoryList', () => {
  const mockAdjustQuantity = vi.fn().mockResolvedValue(true)
  const mockDeleteItem = vi.fn().mockResolvedValue(true)

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseInventoryStore.mockImplementation(
      createStoreMock({
        items: mockItems,
        isLoading: false,
        error: null,
        adjustQuantity: mockAdjustQuantity,
        deleteItem: mockDeleteItem,
      })
    )
  })

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe('rendering', () => {
    it('should render the list with items', () => {
      render(<InventoryList />)

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Arduino Uno')).toBeInTheDocument()
      expect(screen.getByText('10uF Capacitor')).toBeInTheDocument()
      expect(screen.getByText('M3x10 Screws')).toBeInTheDocument()
    })

    it('should render table headers', () => {
      render(<InventoryList />)

      expect(
        screen.getByRole('columnheader', { name: /name/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('columnheader', { name: /category/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('columnheader', { name: /quantity/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('columnheader', { name: /location/i })
      ).toBeInTheDocument()
    })

    it('should show item quantities', () => {
      render(<InventoryList />)

      // Find the row with Arduino Uno and check quantity
      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      expect(within(arduinoRow!).getByText('5')).toBeInTheDocument()

      const capacitorRow = screen.getByText('10uF Capacitor').closest('tr')
      expect(within(capacitorRow!).getByText('100')).toBeInTheDocument()
    })

    it('should show item locations', () => {
      render(<InventoryList />)

      expect(screen.getByText('Bin A1')).toBeInTheDocument()
      expect(screen.getByText('Bin B2')).toBeInTheDocument()
      expect(screen.getByText('Drawer 1')).toBeInTheDocument()
    })

    it('should highlight low stock items', () => {
      render(<InventoryList lowStockThreshold={5} />)

      // M3x10 Screws has quantity 2, should be highlighted
      const screwsRow = screen.getByText('M3x10 Screws').closest('tr')
      expect(screwsRow).toHaveClass('bg-red-50')

      // Arduino has quantity 5, at threshold, should also be highlighted
      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      expect(arduinoRow).toHaveClass('bg-red-50')

      // Capacitor has 100, should not be highlighted
      const capacitorRow = screen.getByText('10uF Capacitor').closest('tr')
      expect(capacitorRow).not.toHaveClass('bg-red-50')
    })

    it('should show loading state', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          items: [],
          isLoading: true,
          error: null,
          adjustQuantity: mockAdjustQuantity,
          deleteItem: mockDeleteItem,
        })
      )

      render(<InventoryList />)
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should show empty state when no items', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          items: [],
          isLoading: false,
          error: null,
          adjustQuantity: mockAdjustQuantity,
          deleteItem: mockDeleteItem,
        })
      )

      render(<InventoryList />)
      expect(screen.getByText(/no items/i)).toBeInTheDocument()
    })

    it('should show error state', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          items: [],
          isLoading: false,
          error: 'Failed to load items',
          adjustQuantity: mockAdjustQuantity,
          deleteItem: mockDeleteItem,
        })
      )

      render(<InventoryList />)
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe('filtering', () => {
    it('should filter items by category', () => {
      render(<InventoryList categoryFilter="electronics" />)

      expect(screen.getByText('Arduino Uno')).toBeInTheDocument()
      expect(screen.getByText('10uF Capacitor')).toBeInTheDocument()
      expect(screen.queryByText('M3x10 Screws')).not.toBeInTheDocument()
    })

    it('should filter items by subcategory', () => {
      render(<InventoryList subcategoryFilter="electronics-capacitors" />)

      expect(screen.queryByText('Arduino Uno')).not.toBeInTheDocument()
      expect(screen.getByText('10uF Capacitor')).toBeInTheDocument()
      expect(screen.queryByText('M3x10 Screws')).not.toBeInTheDocument()
    })

    it('should show empty state when filter matches nothing', () => {
      render(<InventoryList categoryFilter="non-existent" />)

      expect(screen.getByText(/no items/i)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Expandable Rows
  // ===========================================================================

  describe('expandable rows', () => {
    it('should expand row to show details on click', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      // Click expand button on Arduino row
      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const expandButton = within(arduinoRow!).getByRole('button', {
        name: /expand/i,
      })
      await user.click(expandButton)

      // Details should be visible
      expect(
        screen.getByText('Popular microcontroller board')
      ).toBeInTheDocument()
      expect(screen.getByText('DigiKey')).toBeInTheDocument()
      expect(screen.getByText('ARD-UNO-R3')).toBeInTheDocument()
      expect(screen.getByText('$25.00')).toBeInTheDocument()
    })

    it('should collapse row on second click', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const expandButton = within(arduinoRow!).getByRole('button', {
        name: /expand/i,
      })

      // Expand
      await user.click(expandButton)
      expect(
        screen.getByText('Popular microcontroller board')
      ).toBeInTheDocument()

      // Collapse
      const collapseButton = within(arduinoRow!).getByRole('button', {
        name: /collapse/i,
      })
      await user.click(collapseButton)
      expect(
        screen.queryByText('Popular microcontroller board')
      ).not.toBeInTheDocument()
    })

    it('should show tags in expanded view', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const expandButton = within(arduinoRow!).getByRole('button', {
        name: /expand/i,
      })
      await user.click(expandButton)

      expect(screen.getByText('microcontroller')).toBeInTheDocument()
      expect(screen.getByText('arduino')).toBeInTheDocument()
    })

    it('should show supplier link when available', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const expandButton = within(arduinoRow!).getByRole('button', {
        name: /expand/i,
      })
      await user.click(expandButton)

      const supplierLink = screen.getByRole('link', { name: /digikey/i })
      expect(supplierLink).toHaveAttribute(
        'href',
        'https://digikey.com/arduino'
      )
    })
  })

  // ===========================================================================
  // Quantity Adjustment
  // ===========================================================================

  describe('quantity adjustment', () => {
    it('should increment quantity when + button clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const incrementButton = within(arduinoRow!).getByRole('button', {
        name: /increase/i,
      })
      await user.click(incrementButton)

      expect(mockAdjustQuantity).toHaveBeenCalledWith('item-1', 1)
    })

    it('should decrement quantity when - button clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const decrementButton = within(arduinoRow!).getByRole('button', {
        name: /decrease/i,
      })
      await user.click(decrementButton)

      expect(mockAdjustQuantity).toHaveBeenCalledWith('item-1', -1)
    })

    it('should disable decrement button when quantity is 0', () => {
      mockUseInventoryStore.mockImplementation(
        createStoreMock({
          items: [{ ...mockItems[0], quantity: 0 }],
          isLoading: false,
          error: null,
          adjustQuantity: mockAdjustQuantity,
          deleteItem: mockDeleteItem,
        })
      )

      render(<InventoryList />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const decrementButton = within(arduinoRow!).getByRole('button', {
        name: /decrease/i,
      })
      expect(decrementButton).toBeDisabled()
    })
  })

  // ===========================================================================
  // Sorting
  // ===========================================================================

  describe('sorting', () => {
    it('should sort by name ascending by default', () => {
      render(<InventoryList />)

      const rows = screen.getAllByRole('row').slice(1) // Skip header row
      expect(within(rows[0]).getByText('10uF Capacitor')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Arduino Uno')).toBeInTheDocument()
      expect(within(rows[2]).getByText('M3x10 Screws')).toBeInTheDocument()
    })

    it('should sort by name descending when header clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      await user.click(nameHeader)

      const rows = screen.getAllByRole('row').slice(1)
      expect(within(rows[0]).getByText('M3x10 Screws')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Arduino Uno')).toBeInTheDocument()
      expect(within(rows[2]).getByText('10uF Capacitor')).toBeInTheDocument()
    })

    it('should sort by quantity when header clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const qtyHeader = screen.getByRole('columnheader', { name: /quantity/i })
      await user.click(qtyHeader)

      const rows = screen.getAllByRole('row').slice(1)
      // Ascending: 2, 5, 100
      expect(within(rows[0]).getByText('M3x10 Screws')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Arduino Uno')).toBeInTheDocument()
      expect(within(rows[2]).getByText('10uF Capacitor')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Selection & Actions
  // ===========================================================================

  describe('selection and actions', () => {
    it('should call onItemSelect when row clicked', async () => {
      const onItemSelect = vi.fn()
      const user = userEvent.setup()
      render(<InventoryList onItemSelect={onItemSelect} />)

      const arduinoName = screen.getByText('Arduino Uno')
      await user.click(arduinoName)

      expect(onItemSelect).toHaveBeenCalledWith('item-1')
    })

    it('should highlight selected item', () => {
      render(<InventoryList selectedItemId="item-1" />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      expect(arduinoRow).toHaveAttribute('aria-selected', 'true')
    })

    it('should call onItemEdit when edit button clicked', async () => {
      const onItemEdit = vi.fn()
      const user = userEvent.setup()
      render(<InventoryList onItemEdit={onItemEdit} />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const editButton = within(arduinoRow!).getByRole('button', {
        name: /edit/i,
      })
      await user.click(editButton)

      expect(onItemEdit).toHaveBeenCalledWith('item-1')
    })

    it('should call deleteItem when delete button clicked', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const arduinoRow = screen.getByText('Arduino Uno').closest('tr')
      const deleteButton = within(arduinoRow!).getByRole('button', {
        name: /delete/i,
      })
      await user.click(deleteButton)

      expect(mockDeleteItem).toHaveBeenCalledWith('item-1')
    })
  })

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe('accessibility', () => {
    it('should have accessible table structure', () => {
      render(<InventoryList />)

      const table = screen.getByRole('table')
      expect(table).toHaveAccessibleName(/inventory/i)
    })

    it('should have row headers for item names', () => {
      render(<InventoryList />)

      const rowHeaders = screen.getAllByRole('rowheader')
      expect(rowHeaders.length).toBe(3)
    })

    it('should announce sort order changes', async () => {
      const user = userEvent.setup()
      render(<InventoryList />)

      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')

      await user.click(nameHeader)
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    })
  })
})
