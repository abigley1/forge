import { Page } from '@playwright/test'

/**
 * Test node data for E2E tests
 */
export const TEST_NODES = {
  decision1: {
    id: 'decision-motor-selection',
    type: 'decision',
    title: 'Motor Selection',
    tags: ['hardware', 'actuator'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-15'),
    },
    content:
      'Deciding between stepper and servo motors for the main actuator.\n\nSee [[task-research-motors]] for research.',
    status: 'pending',
    selected: null,
    options: [
      { id: 'opt-1', name: 'NEMA 17 Stepper', values: {} },
      { id: 'opt-2', name: 'Servo Motor', values: {} },
    ],
    criteria: [],
    rationale: null,
    selectedDate: null,
  },
  decision2: {
    id: 'decision-frame-material',
    type: 'decision',
    title: 'Frame Material',
    tags: ['hardware', 'structure'],
    dates: {
      created: new Date('2024-01-02'),
      modified: new Date('2024-01-10'),
    },
    content: 'Choosing between aluminum extrusion and steel frame.',
    status: 'selected',
    selected: 'opt-1',
    options: [
      { id: 'opt-1', name: '2020 Aluminum', values: {} },
      { id: 'opt-2', name: 'Steel Tube', values: {} },
    ],
    criteria: [],
    rationale: 'Aluminum is lighter and easier to work with.',
    selectedDate: new Date('2024-01-10'),
  },
  component1: {
    id: 'component-nema17',
    type: 'component',
    title: 'NEMA 17 Stepper Motor',
    tags: ['hardware', 'actuator', 'motor'],
    dates: {
      created: new Date('2024-01-05'),
      modified: new Date('2024-01-05'),
    },
    content: 'Standard NEMA 17 stepper motor for the main axis.',
    status: 'selected',
    cost: 15.99,
    supplier: 'Amazon',
    partNumber: 'NEMA17-48',
    customFields: { voltage: '12V', torque: '0.5Nm' },
  },
  component2: {
    id: 'component-aluminum-extrusion',
    type: 'component',
    title: '2020 Aluminum Extrusion',
    tags: ['hardware', 'structure'],
    dates: {
      created: new Date('2024-01-06'),
      modified: new Date('2024-01-06'),
    },
    content: '500mm lengths of 2020 aluminum extrusion for the frame.',
    status: 'selected',
    cost: 8.5,
    supplier: 'OpenBuilds',
    partNumber: '2020-500',
    customFields: { length: '500mm' },
  },
  task1: {
    id: 'task-research-motors',
    type: 'task',
    title: 'Research Motor Options',
    tags: ['research'],
    dates: {
      created: new Date('2024-01-03'),
      modified: new Date('2024-01-08'),
    },
    content:
      'Compare stepper vs servo motors for the project.\n\n- [ ] Check torque requirements\n- [x] Research suppliers\n- [ ] Calculate power needs',
    status: 'in_progress',
    priority: 'high',
    dependsOn: [],
    blocks: ['task-order-parts'],
    checklist: [
      { id: 'check-1', text: 'Check torque requirements', completed: false },
      { id: 'check-2', text: 'Research suppliers', completed: true },
      { id: 'check-3', text: 'Calculate power needs', completed: false },
    ],
  },
  task2: {
    id: 'task-order-parts',
    type: 'task',
    title: 'Order Parts',
    tags: ['procurement'],
    dates: {
      created: new Date('2024-01-04'),
      modified: new Date('2024-01-04'),
    },
    content: 'Order all selected components from suppliers.',
    status: 'pending',
    priority: 'medium',
    dependsOn: ['task-research-motors'],
    blocks: [],
    checklist: [],
  },
  task3: {
    id: 'task-assemble-frame',
    type: 'task',
    title: 'Assemble Frame',
    tags: ['assembly'],
    dates: {
      created: new Date('2024-01-07'),
      modified: new Date('2024-01-07'),
    },
    content: 'Build the aluminum frame structure.',
    status: 'pending',
    priority: 'low',
    dependsOn: ['task-order-parts'],
    blocks: [],
    checklist: [],
  },
  note1: {
    id: 'note-project-overview',
    type: 'note',
    title: 'Project Overview',
    tags: ['documentation'],
    dates: {
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-01'),
    },
    content:
      '# Project Overview\n\nThis project is a CNC machine build.\n\nSee [[decision-motor-selection]] for motor choice.',
  },
  note2: {
    id: 'note-meeting-2024-01-10',
    type: 'note',
    title: 'Meeting Notes - Jan 10',
    tags: ['meeting', 'documentation'],
    dates: {
      created: new Date('2024-01-10'),
      modified: new Date('2024-01-10'),
    },
    content: 'Discussed frame material options.\n\nDecided on aluminum.',
  },
}

/**
 * Initialize the app with test data by setting up Zustand stores
 */
export async function setupTestData(page: Page): Promise<void> {
  await page.evaluate((nodes) => {
    // Access the stores from the window (exposed in dev mode via Zustand devtools)
    // We need to use a different approach - directly manipulate the store

    // Create a Map of nodes
    const nodesMap = new Map()

    // Convert date strings back to Date objects and add to map
    Object.values(nodes).forEach((node: unknown) => {
      const n = node as Record<string, unknown>
      const processedNode = {
        ...n,
        dates: {
          created: new Date(
            (n.dates as Record<string, string>).created as string
          ),
          modified: new Date(
            (n.dates as Record<string, string>).modified as string
          ),
        },
      }

      // Handle selectedDate for decisions
      if (n.selectedDate) {
        ;(processedNode as Record<string, unknown>).selectedDate = new Date(
          n.selectedDate as string
        )
      }

      nodesMap.set(n.id, processedNode)
    })

    // Get the Zustand store from window
    // Zustand stores with devtools expose their state
    const stores = (window as unknown as Record<string, unknown>).__ZUSTAND__
    if (stores) {
      // Try to find and update the nodes store
      const nodesStore = Object.values(stores as Record<string, unknown>).find(
        (s: unknown) =>
          Object.prototype.hasOwnProperty.call(
            (s as Record<string, unknown>)?.getState?.(),
            'nodes'
          )
      )
      if (nodesStore) {
        ;(nodesStore as { setState: (state: unknown) => void }).setState({
          nodes: nodesMap,
        })
      }
    }
  }, TEST_NODES)
}

/**
 * Alternative: Set up test data by triggering store actions via exposed window functions
 * This is more reliable as it goes through the proper store actions
 */
export async function setupTestDataViaActions(page: Page): Promise<void> {
  // Serialize nodes with dates as ISO strings
  const serializedNodes = Object.values(TEST_NODES).map((node) => ({
    ...node,
    dates: {
      created: (node.dates.created as Date).toISOString(),
      modified: (node.dates.modified as Date).toISOString(),
    },
    selectedDate:
      'selectedDate' in node && node.selectedDate
        ? (node.selectedDate as Date).toISOString()
        : null,
  }))

  await page.evaluate((nodes) => {
    // Dispatch a custom event that our app can listen for
    const event = new CustomEvent('e2e-setup-nodes', {
      detail: { nodes },
    })
    window.dispatchEvent(event)
  }, serializedNodes)

  // Wait for the project workspace to appear (indicates data was set up)
  await page.waitForSelector('text=/\\d+ nodes?/', {
    state: 'visible',
    timeout: 5000,
  })

  // Wait for IndexedDB writes to complete
  // The hybrid persistence hook writes nodes to IndexedDB async after store changes
  // We need to wait long enough for all async writes to complete
  await page.waitForTimeout(1000)

  // Verify IndexedDB has data before returning
  const hasData = await page.evaluate(async () => {
    return new Promise<boolean>((resolve) => {
      const request = indexedDB.open('forge-db')
      request.onerror = () => resolve(false)
      request.onsuccess = async () => {
        const db = request.result
        const transaction = db.transaction('directories', 'readonly')
        const store = transaction.objectStore('directories')
        const countRequest = store.count()
        countRequest.onsuccess = () => resolve(countRequest.result > 0)
        countRequest.onerror = () => resolve(false)
      }
    })
  })

  if (!hasData) {
    console.warn('[E2E] Warning: IndexedDB appears to have no data after setup')
  }
}

/**
 * Clear all test data from stores
 */
export async function clearTestData(page: Page): Promise<void> {
  await page.evaluate(() => {
    const event = new CustomEvent('e2e-clear-nodes')
    window.dispatchEvent(event)
  })
  await page.waitForTimeout(100)
}

/**
 * Get the current node count from the store
 */
export async function getNodeCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const event = new CustomEvent('e2e-get-node-count')
    window.dispatchEvent(event)
    return (window as unknown as Record<string, number>).__e2eNodeCount || 0
  })
}

/**
 * Wait for the app to be fully loaded and interactive
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the main content to be visible
  await page.waitForSelector('main#main-content', { state: 'visible' })

  // Wait for the E2E hooks to be ready
  await page.waitForFunction(
    () => (window as unknown as { __e2eReady?: boolean }).__e2eReady === true,
    {
      timeout: 5000,
    }
  )

  // Wait for hybrid persistence to be ready
  await page.waitForFunction(
    () =>
      (window as unknown as { __e2eHybridPersistenceReady?: boolean })
        .__e2eHybridPersistenceReady === true,
    {
      timeout: 5000,
    }
  )

  // Wait for any loading states to complete
  await page.waitForTimeout(200)
}

/**
 * Open the command palette
 */
export async function openCommandPalette(page: Page): Promise<void> {
  // Use Cmd+K on Mac, Ctrl+K on others
  const isMac = process.platform === 'darwin'
  await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k')
  // Wait for dialog to appear
  await page.waitForSelector('[role="dialog"]', { state: 'visible' })
}

/**
 * Close any open dialogs
 */
export async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
}

/**
 * Set mobile viewport
 */
export async function setMobileViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 375, height: 667 })
}

/**
 * Set tablet viewport
 */
export async function setTabletViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 768, height: 1024 })
}

/**
 * Set desktop viewport
 */
export async function setDesktopViewport(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 })
}

/**
 * Close any open dialogs/panels
 */
export async function closeOpenDialogs(page: Page): Promise<void> {
  const closeButton = page.getByRole('button', { name: /close/i })
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click()
    await page.waitForTimeout(200)
  }

  // Also try pressing Escape
  const dialog = page.getByRole('dialog')
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
  }
}
