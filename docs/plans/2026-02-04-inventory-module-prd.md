# Inventory Module PRD

**Date:** 2026-02-04
**Status:** Draft
**Author:** Andrew Bigley + Claude

---

## Problem Statement

Solo makers and engineers accumulate many components, fasteners, and parts across projects. Without a quick way to check what's already owned, they frequently buy duplicates of items they already have but forgot about.

## Solution

A dedicated Inventory module within Forge that provides:
1. Fast entry of parts with minimal manual data input (URL paste, barcode scan)
2. Searchable, organized storage of what you own
3. LLM-accessible inventory via MCP so Claude can check your stock when brainstorming

## Goals

- **Speed of entry**: Adding a newly purchased part should take <30 seconds
- **Findability**: "Do I have M3 screws?" should be answerable in <5 seconds
- **LLM integration**: Claude can search inventory during project brainstorming

## Non-Goals

- Project-specific allocation tracking (deducting parts when used)
- Purchase order / reorder automation
- Multi-user / team inventory
- Integration with supplier ordering systems

---

## Data Model

### InventoryItem

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | UUID |
| name | string | Yes | Human-readable name |
| category | string | Yes | Top-level category ID |
| subcategory | string | No | Second-level category ID |
| quantity | number | Yes | Current stock count |
| location | string | No | Physical storage location ("Bin A3") |
| supplier | string | No | Where purchased |
| supplierUrl | string | No | Link to product page |
| partNumber | string | No | Manufacturer or supplier part number |
| cost | number | No | Price per unit |
| barcode | string | No | UPC/EAN if scanned |
| notes | string | No | Freeform text |
| tags | string[] | No | Flexible tagging |
| imageUrl | string | No | Photo or product image |
| createdAt | Date | Yes | Creation timestamp |
| updatedAt | Date | Yes | Last modified timestamp |

### InventoryCategory

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Slug ID |
| name | string | Yes | Display name |
| sortOrder | number | Yes | Display ordering |

### InventorySubcategory

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Slug ID |
| categoryId | string | Yes | Parent category |
| name | string | Yes | Display name |
| sortOrder | number | Yes | Display ordering |

### Default Categories

1. **Electronics**: Capacitors, Resistors, ICs, Connectors, Sensors, LEDs, Other
2. **Fasteners**: Screws, Nuts, Bolts, Washers, Standoffs, Other
3. **Mechanical**: Bearings, Gears, Pulleys, Shafts, Motors, Other
4. **Raw Materials**: Sheet, Rod, Tube, Wire, Other
5. **Tools**: (no subcategories)
6. **Consumables**: Solder, Tape, Adhesives, Other
7. **Other**: (no subcategories)

Categories and subcategories are user-editable.

---

## API Design

### Items

```
GET    /api/inventory                    # List items with filters
POST   /api/inventory                    # Create item
GET    /api/inventory/:id                # Get single item
PUT    /api/inventory/:id                # Update item
DELETE /api/inventory/:id                # Delete item
PATCH  /api/inventory/:id/quantity       # Quick quantity adjustment
```

**Query params for GET /api/inventory:**
- `category` — filter by category ID
- `subcategory` — filter by subcategory ID
- `location` — filter by storage location
- `low_stock=true` — items at/below threshold
- `q` — full-text search
- `sort` — name, category, quantity, updated_at

### Categories

```
GET    /api/inventory/categories         # List all categories with subcategories
POST   /api/inventory/categories         # Create category
PUT    /api/inventory/categories/:id     # Update category
DELETE /api/inventory/categories/:id     # Delete (only if empty)
POST   /api/inventory/categories/:id/subcategories    # Add subcategory
PUT    /api/inventory/subcategories/:id               # Update subcategory
DELETE /api/inventory/subcategories/:id               # Delete subcategory
```

### Smart Input

```
POST   /api/inventory/extract-from-url   # Scrape product URL → pre-filled item
POST   /api/inventory/lookup-barcode     # Barcode → product info
```

### Search

```
GET    /api/inventory/search?q=...       # Full-text search
```

---

## Smart Input Features

### URL Paste Extraction

**Supported domains (with extraction strategies):**
- **Amazon**: Product title, price, images from meta tags / JSON-LD structured data
- **DigiKey**: Part number, description, price, specs from product page HTML
- **Mouser**: Similar to DigiKey
- **LCSC**: Similar to DigiKey
- **McMaster-Carr**: Best-effort from URL (they block scraping); may require manual entry
- **Generic fallback**: Open Graph / meta tags (title, description, image)

**Flow:**
1. User pastes URL into Quick Add form
2. Client sends `POST /api/inventory/extract-from-url`
3. Server scrapes page and extracts structured data
4. Returns pre-filled InventoryItem (name, supplier, supplierUrl, cost, partNumber, imageUrl)
5. User reviews, adjusts, adds location/quantity, saves

### Barcode Scanning

**Implementation:**
- Client-side camera access via `html5-qrcode` or `quagga2` library
- Supports UPC, EAN, QR codes
- Lookup via Open Food Facts API, UPC Database API, or similar free services

**Limitations:**
- Individual electronic components rarely have barcodes
- Best for retail-packaged items (Amazon boxes, etc.)
- Falls back to manual entry if lookup fails

---

## MCP Integration

### New MCP Tools

```typescript
// Search inventory
search_inventory(query?: string, category?: string, subcategory?: string, limit?: number)
→ Array<{ id, name, quantity, location, category, subcategory }>

// Get item details
get_inventory_item(id: string)
→ Full InventoryItem

// Add item (for quick capture during conversation)
add_inventory_item(name, category, quantity, location?, supplier?, supplierUrl?, partNumber?, notes?, tags?)
→ Created InventoryItem

// Adjust quantity
update_inventory_quantity(id: string, delta: number)
→ { id, newQuantity }

// List categories
list_inventory_categories()
→ Array<{ id, name, subcategories: Array<{ id, name }> }>
```

### Use Case

When user asks Claude: *"I need to attach a stepper motor to my frame. What do I need?"*

Claude can call `search_inventory({ query: "stepper" })` and `search_inventory({ query: "motor bracket" })` to check existing stock before recommending purchases.

---

## UI Design

### Sidebar

- "Inventory" appears as a top-level entry (below or alongside project list)
- Optional badge showing total item count or low-stock alerts
- Clicking opens the inventory view

### Inventory List View

**Layout:** Compact list with expandable rows

**Left sidebar:** Category tree (collapsible)
- Click category to filter
- Click subcategory for further filtering
- "All Items" at top to clear filter

**Main area:**
- Search bar at top
- Sortable columns: Name, Qty, Location, Category, Updated
- Each row shows minimal info; click to expand inline for full details
- Quick +/- quantity buttons in each row
- "Add Item" button (opens modal)

### Add Item Modal

**Two tabs:**

1. **Manual**: Standard form with all fields
2. **Quick Add**:
   - URL input field + "Extract" button
   - "Scan Barcode" button (opens camera)
   - After extraction: shows pre-filled form for review/save

### Item Detail (Expanded Row)

- Full item details with inline edit
- Photo thumbnail if available
- Clickable supplier link
- Edit / Delete actions

### Category Management

- Accessible from settings or "Manage Categories" link
- CRUD for categories and subcategories
- Drag-and-drop reordering

---

## Database Schema

```sql
CREATE TABLE inventory_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE inventory_subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES inventory_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES inventory_categories(id),
  subcategory_id TEXT REFERENCES inventory_subcategories(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  supplier TEXT,
  supplier_url TEXT,
  part_number TEXT,
  cost REAL,
  barcode TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE inventory_item_tags (
  item_id TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (item_id, tag)
);

CREATE VIRTUAL TABLE inventory_items_fts USING fts5(
  name, notes, part_number,
  content='inventory_items',
  content_rowid='rowid'
);

CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_subcategory ON inventory_items(subcategory_id);
CREATE INDEX idx_inventory_items_location ON inventory_items(location);
```

---

## Implementation Phases

### Phase 1: Core CRUD + Manual Entry

**Scope:**
- Database schema + migrations
- API endpoints for items and categories
- UI: category sidebar, compact list with expandable rows, add/edit forms
- Category management UI
- Full-text search

**Deliverable:** Functional inventory with manual entry

### Phase 2: URL Paste Extraction

**Scope:**
- `POST /api/inventory/extract-from-url` endpoint
- Server-side scraping for Amazon, DigiKey, Mouser, LCSC, McMaster, generic
- Quick Add UI tab with URL paste
- Pre-fill review flow

**Deliverable:** Paste a URL, get 80% auto-filled

### Phase 3: Barcode Scanning

**Scope:**
- Client-side barcode scanning (camera access)
- `POST /api/inventory/lookup-barcode` endpoint
- UPC/EAN database lookup integration
- Scan button in Quick Add UI

**Deliverable:** Scan barcode, get product info

### Phase 4: MCP Integration

**Scope:**
- MCP tools: search_inventory, get_inventory_item, add_inventory_item, update_inventory_quantity, list_inventory_categories
- Connect MCP server to inventory API
- Documentation for prompting

**Deliverable:** Claude can search inventory during brainstorming

### Phase 5: Polish & Future Enhancements

**Potential scope:**
- Low-stock alerts (threshold per item)
- Quantity change history / audit log
- Bulk CSV import
- Mobile-friendly quick entry
- Image upload (not just URL)

---

## Open Questions

1. **Image storage**: Store images locally (attachments folder) or keep as URLs only?
2. **Export**: CSV/JSON export for backup or external tools?

---

## Success Metrics

- Time to add a new item: <30 seconds (with URL paste)
- Time to find an item: <5 seconds
- Duplicate purchases reduced (qualitative)
