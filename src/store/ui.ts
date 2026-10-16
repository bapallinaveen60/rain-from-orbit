import { create } from 'zustand'

/** Transient UI state (not persisted). */
interface UiState {
  stormOpen: boolean
  setStormOpen: (open: boolean) => void
}

export const useUi = create<UiState>()((set) => ({
  stormOpen: false,
  setStormOpen: (stormOpen) => set({ stormOpen }),
}))
