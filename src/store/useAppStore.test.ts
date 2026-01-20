import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAppStore.setState({
      sidebarOpen: true,
      activeView: 'outline',
    })
  })

  describe('initial state', () => {
    it('should have sidebar open by default', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('should have outline as default active view', () => {
      expect(useAppStore.getState().activeView).toBe('outline')
    })
  })

  describe('setSidebarOpen', () => {
    it('should set sidebar open to true', () => {
      useAppStore.getState().setSidebarOpen(false)
      expect(useAppStore.getState().sidebarOpen).toBe(false)

      useAppStore.getState().setSidebarOpen(true)
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('should set sidebar open to false', () => {
      useAppStore.getState().setSidebarOpen(false)
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })
  })

  describe('toggleSidebar', () => {
    it('should toggle sidebar from open to closed', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true)

      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })

    it('should toggle sidebar from closed to open', () => {
      useAppStore.getState().setSidebarOpen(false)
      expect(useAppStore.getState().sidebarOpen).toBe(false)

      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('should toggle sidebar multiple times correctly', () => {
      useAppStore.getState().toggleSidebar() // true -> false
      useAppStore.getState().toggleSidebar() // false -> true
      useAppStore.getState().toggleSidebar() // true -> false
      expect(useAppStore.getState().sidebarOpen).toBe(false)
    })
  })

  describe('setActiveView', () => {
    it('should set active view to graph', () => {
      useAppStore.getState().setActiveView('graph')
      expect(useAppStore.getState().activeView).toBe('graph')
    })

    it('should set active view to outline', () => {
      useAppStore.getState().setActiveView('graph')
      useAppStore.getState().setActiveView('outline')
      expect(useAppStore.getState().activeView).toBe('outline')
    })
  })

  describe('store subscription', () => {
    it('should notify subscribers when state changes', () => {
      const states: boolean[] = []

      const unsubscribe = useAppStore.subscribe((state) => {
        states.push(state.sidebarOpen)
      })

      useAppStore.getState().toggleSidebar()
      useAppStore.getState().toggleSidebar()

      expect(states).toEqual([false, true])

      unsubscribe()
    })
  })
})
