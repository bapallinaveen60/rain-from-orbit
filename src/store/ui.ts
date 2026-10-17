import { create } from 'zustand'

/** Transient UI state (not persisted). */
interface UiState {
  stormOpen: boolean
  setStormOpen: (open: boolean) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  helpOpen: boolean
  setHelpOpen: (open: boolean) => void
}

export const useUi = create<UiState>()((set) => ({
  stormOpen: false,
  setStormOpen: (stormOpen) => set({ stormOpen }),
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  helpOpen: false,
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}))
