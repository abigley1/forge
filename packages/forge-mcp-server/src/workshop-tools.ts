/**
 * Workshop tools: inventory and per-project parts lists.
 *
 * Project knowledge (tasks, decisions, briefs, session notes) lives in the
 * vault; Forge keeps only what the workshop owns. `project` arguments are the
 * vault project slug.
 */

import type { ApiClient, ApiInventoryItem } from './api-client.js'

type Args = Record<string, unknown>
export type ToolResult = { content: Array<{ type: string; text: string }> }

export const workshopTools = [
  {
    name: 'search_inventory',
    description:
      'Search the personal inventory for items. Use this to check what parts, components, or materials you already own before recommending purchases.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text search in name, notes, part number',
        },
        category: {
          type: 'string',
          description:
            'Filter by category ID (e.g., "electronics", "fasteners")',
        },
        subcategory: {
          type: 'string',
          description: 'Filter by subcategory ID',
        },
        status: {
          type: 'string',
          enum: ['owned', 'wishlist', 'on_order'],
          description: 'Filter by item status',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default 50)',
        },
      },
    },
  },
  {
    name: 'get_inventory_item',
    description: 'Get full details of a specific inventory item by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the inventory item' },
      },
      required: ['id'],
    },
  },
  {
    name: 'add_inventory_item',
    description:
      'Add a new item to the personal inventory. Filament lives in category "consumables", subcategory "consumables-filament", keyed by part_number = material id, quantity in grams.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the item' },
        category_id: {
          type: 'string',
          description:
            'Category ID (e.g., "electronics", "fasteners", "mechanical")',
        },
        subcategory_id: {
          type: 'string',
          description: 'Optional subcategory ID',
        },
        status: {
          type: 'string',
          enum: ['owned', 'wishlist', 'on_order'],
          description: 'Item status (default: "owned")',
        },
        quantity: {
          type: 'number',
          description: 'Quantity in stock (default: 1)',
        },
        location: {
          type: 'string',
          description: 'Physical storage location (e.g., "Bin A3")',
        },
        supplier: {
          type: 'string',
          description: 'Where the item was purchased',
        },
        supplier_url: { type: 'string', description: 'URL to product page' },
        part_number: {
          type: 'string',
          description: 'Manufacturer or supplier part number',
        },
        cost: { type: 'number', description: 'Price per unit' },
        notes: {
          type: 'string',
          description: 'Additional notes about the item',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for organization',
        },
      },
      required: ['name', 'category_id'],
    },
  },
  {
    name: 'update_inventory_quantity',
    description: 'Adjust the quantity of an inventory item (add or subtract).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the inventory item' },
        delta: {
          type: 'number',
          description: 'Amount to add (positive) or subtract (negative)',
        },
      },
      required: ['id', 'delta'],
    },
  },
  {
    name: 'list_inventory_categories',
    description: 'List all inventory categories and their subcategories.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_project_parts',
    description:
      "List a project's parts list: what it needs, linked to inventory items. project is the vault project slug (omit for every project).",
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Vault project slug' },
      },
    },
  },
  {
    name: 'project_parts_shortfall',
    description:
      'Parts a project needs but does not own enough of: [{name, itemId, needed, owned}]. A part with no inventory link counts as owned 0. Only owned stock counts, not wishlist or on-order.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Vault project slug' },
      },
      required: ['project'],
    },
  },
  {
    name: 'upsert_project_part',
    description:
      'Add a part to a project, or update it if the project already lists a part with that name. Link it to an inventory item with item_id so shortfall can compare against stock.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Vault project slug' },
        name: { type: 'string', description: 'Part name' },
        quantity_needed: {
          type: 'number',
          description: 'Whole number, 1 or more',
        },
        item_id: {
          type: 'string',
          description: 'Inventory item ID this part is satisfied from',
        },
      },
      required: ['project', 'name', 'quantity_needed'],
    },
  },
]

const json = (value: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
})

function unwrap<T>(
  result: { success: true; data: T } | { success: false; error: string }
): T {
  if (!result.success) throw new Error(result.error)
  return result.data
}

function requireString(args: Args, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || !value) throw new Error(`${key} is required`)
  return value
}

const summary = (item: ApiInventoryItem) => ({
  id: item.id,
  name: item.name,
  quantity: item.quantity,
  location: item.location,
  category: item.category_id,
  subcategory: item.subcategory_id,
  status: item.status,
  supplier: item.supplier,
  partNumber: item.part_number,
  cost: item.cost,
})

export const workshopToolNames = new Set(workshopTools.map((t) => t.name))

export async function callWorkshopTool(
  api: ApiClient,
  name: string,
  args: Args
): Promise<ToolResult> {
  switch (name) {
    case 'search_inventory': {
      const items = unwrap(
        await api.searchInventory({
          q: args.query as string | undefined,
          category: args.category as string | undefined,
          subcategory: args.subcategory as string | undefined,
          status: args.status as 'owned' | 'wishlist' | 'on_order' | undefined,
          limit: (args.limit as number | undefined) ?? 50,
        })
      )
      return json({
        success: true,
        count: items.length,
        items: items.map(summary),
      })
    }
    case 'get_inventory_item': {
      const item = unwrap(await api.getInventoryItem(requireString(args, 'id')))
      return json({
        success: true,
        item: {
          ...summary(item),
          supplierUrl: item.supplier_url,
          barcode: item.barcode,
          notes: item.notes,
          imageUrl: item.image_url,
          tags: item.tags,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        },
      })
    }
    case 'add_inventory_item': {
      const item = unwrap(
        await api.createInventoryItem({
          name: requireString(args, 'name'),
          category_id: requireString(args, 'category_id'),
          subcategory_id: args.subcategory_id as string | undefined,
          status: args.status as 'owned' | 'wishlist' | 'on_order' | undefined,
          quantity: args.quantity as number | undefined,
          location: args.location as string | undefined,
          supplier: args.supplier as string | undefined,
          supplier_url: args.supplier_url as string | undefined,
          part_number: args.part_number as string | undefined,
          cost: args.cost as number | undefined,
          notes: args.notes as string | undefined,
          tags: args.tags as string[] | undefined,
        })
      )
      return json({
        success: true,
        message: `Added "${item.name}" to inventory`,
        item: {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          category: item.category_id,
          status: item.status,
        },
      })
    }
    case 'update_inventory_quantity': {
      if (typeof args.delta !== 'number') throw new Error('delta is required')
      const item = unwrap(
        await api.updateInventoryQuantity(requireString(args, 'id'), {
          delta: args.delta,
        })
      )
      return json({
        success: true,
        message: `Updated quantity of "${item.name}" to ${item.quantity}`,
        item: { id: item.id, name: item.name, quantity: item.quantity },
      })
    }
    case 'list_inventory_categories': {
      const categories = unwrap(await api.listInventoryCategories())
      return json({
        success: true,
        categories: categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          subcategories: cat.subcategories.map((s) => ({
            id: s.id,
            name: s.name,
          })),
        })),
      })
    }
    case 'list_project_parts': {
      const parts = unwrap(
        await api.listProjectParts(
          typeof args.project === 'string' ? args.project : undefined
        )
      )
      return json({ success: true, count: parts.length, parts })
    }
    case 'project_parts_shortfall': {
      const short = unwrap(
        await api.projectPartsShortfall(requireString(args, 'project'))
      )
      return json({ success: true, count: short.length, shortfall: short })
    }
    case 'upsert_project_part': {
      const project = requireString(args, 'project')
      const partName = requireString(args, 'name')
      if (typeof args.quantity_needed !== 'number')
        throw new Error('quantity_needed is required')
      const input = {
        project,
        name: partName,
        quantityNeeded: args.quantity_needed,
        itemId: typeof args.item_id === 'string' ? args.item_id : null,
      }
      const existing = unwrap(await api.listProjectParts(project)).find(
        (p) => p.name.toLowerCase() === partName.trim().toLowerCase()
      )
      const part = unwrap(
        existing
          ? await api.updateProjectPart(existing.id, {
              ...input,
              name: existing.name,
            })
          : await api.createProjectPart(input)
      )
      return json({ success: true, created: !existing, part })
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
