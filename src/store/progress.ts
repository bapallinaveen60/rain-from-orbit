import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { chapters, pageKey, type Loc } from '../content/chapters'

interface ProgressState {
  /** Pages the reader has opened, keyed "ch-pg". */
  seen: Record<string, true>
  last: Loc | null
  /** Bookmarked pages, keyed "ch-pg". */
  bookmarks: Record<string, true>
  visit: (loc: Loc) => void
  toggleBookmark: (loc: Loc) => void
  reset: () => void
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      seen: {},
      last: null,
      bookmarks: {},
      toggleBookmark: (loc) =>
        set((s) => {
          const bookmarks = { ...s.bookmarks }
          if (bookmarks[pageKey(loc)]) delete bookmarks[pageKey(loc)]
          else bookmarks[pageKey(loc)] = true
          return { bookmarks }
        }),
      visit: (loc) => set((s) => ({ seen: { ...s.seen, [pageKey(loc)]: true }, last: loc })),
      reset: () => set({ seen: {}, last: null, bookmarks: {} }),
    }),
    { name: 'rfo-progress' },
  ),
)

export function chaptersStarted(seen: Record<string, true>): number {
  return new Set(Object.keys(seen).map((k) => k.split('-')[0])).size
}

/** Fraction of a chapter's pages opened, 0–1. */
export function chapterProgress(seen: Record<string, true>, ch: number): number {
  const n = chapters[ch - 1].pages.length
  let k = 0
  for (let pg = 1; pg <= n; pg++) if (seen[pageKey({ ch, pg })]) k++
  return k / n
}
