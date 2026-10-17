import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Note {
  id: string
  ch: number
  pg: number
  /** The highlighted passage. */
  quote: string
  /** The reader's own words. */
  text: string
  created: number
}

interface NotesState {
  notes: Note[]
  add: (n: Omit<Note, 'id' | 'created'>) => void
  update: (id: string, text: string) => void
  remove: (id: string) => void
}

export const useNotes = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      add: (n) =>
        set((s) => ({
          notes: [...s.notes, { ...n, id: Math.random().toString(36).slice(2, 10), created: Date.now() }],
        })),
      update: (id, text) => set((s) => ({ notes: s.notes.map((n) => (n.id === id ? { ...n, text } : n)) })),
      remove: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: 'rfo-notes' },
  ),
)

/** Everything the app keeps in this browser, for export and import. */
export const DATA_KEYS = ['rfo-progress', 'rfo-notes', 'rfo-quiz', 'rfo-storm', 'rfo-dropbox', 'rfo-settings']

export function exportData(): string {
  const out: Record<string, unknown> = { app: 'rain-from-orbit', version: 1, exported: new Date().toISOString() }
  for (const k of DATA_KEYS) {
    const v = localStorage.getItem(k)
    if (v) out[k] = JSON.parse(v)
  }
  return JSON.stringify(out, null, 2)
}

/** Restore an export. Returns the number of stores restored; throws on a file that isn't ours. */
export function importData(text: string): number {
  const data = JSON.parse(text)
  if (data?.app !== 'rain-from-orbit') throw new Error('This file is not a Rain from Orbit export.')
  let n = 0
  for (const k of DATA_KEYS)
    if (data[k] && typeof data[k] === 'object') {
      localStorage.setItem(k, JSON.stringify(data[k]))
      n++
    }
  return n
}
