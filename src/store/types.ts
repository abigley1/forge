import type { StoreApi, UseBoundStore } from 'zustand'

/**
 * Helper type to extract state type from a Zustand store
 */
export type ExtractState<S> =
  S extends UseBoundStore<StoreApi<infer T>> ? T : never

/**
 * Helper type for store selectors
 */
export type Selector<S, R> = (state: S) => R

/**
 * Helper type for creating store slices
 * Used when composing multiple slices into a single store
 */
export type StateCreator<T, U = T> = (
  set: (
    partial: Partial<T> | ((state: T) => Partial<T>),
    replace?: boolean,
    name?: string
  ) => void,
  get: () => T,
  api: StoreApi<T>
) => U

/**
 * Common loading/error state pattern for async operations
 */
export interface AsyncState {
  isLoading: boolean
  error: Error | null
}

/**
 * Helper to create initial async state
 */
export const initialAsyncState: AsyncState = {
  isLoading: false,
  error: null,
}
