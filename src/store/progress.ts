import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pageKey, type Loc } from '../content/chapters'

interface ProgressState {
  /** Pages the reader has opened, keyed "ch-pg". */
  seen: Record<string, true>
  last: Loc | null
  visit: (loc: Loc) => void
  reset: () => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      seen: {},
      last: null,
      visit: (loc) => set((s) => ({ seen: { ...s.seen, [pageKey(loc)]: true }, last: loc })),
      reset: () => set({ seen: {}, last: null }),
    }),
    { name: 'rfo-progress' },
  ),
)

export function chaptersStarted(seen: Record<string, true>): number {
  return new Set(Object.keys(seen).map((k) => k.split('-')[0])).size
}
