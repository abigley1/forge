import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * UI state for the application shell
 */
export interface UIState {
  sidebarOpen: boolean
  activeView: 'outline' | 'graph' | 'kanban'
}

/**
 * Actions for UI state management
 */
export interface UIActions {
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setActiveView: (view: UIState['activeView']) => void
}

/**
 * Combined app store state and actions
 */
export interface AppState extends UIState, UIActions {}

/**
 * Initial UI state values
 */
const initialUIState: UIState = {
  sidebarOpen: true,
  activeView: 'outline',
}

/**
 * Root application store using Zustand with devtools middleware.
 *
 * Usage:
 * ```tsx
 * const sidebarOpen = useAppStore((state) => state.sidebarOpen)
 * const toggleSidebar = useAppStore((state) => state.toggleSidebar)
 * ```
 */
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // State
      ...initialUIState,

      // Actions
      setSidebarOpen: (open) =>
        set({ sidebarOpen: open }, false, 'setSidebarOpen'),

      toggleSidebar: () =>
        set(
          (state) => ({ sidebarOpen: !state.sidebarOpen }),
          false,
          'toggleSidebar'
        ),

      setActiveView: (view) =>
        set({ activeView: view }, false, 'setActiveView'),
    }),
    {
      name: 'forge-app-store',
      enabled: import.meta.env.DEV,
    }
  )
)
