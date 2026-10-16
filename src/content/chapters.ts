import manifest from './manifest.json'

export interface PageMeta {
  /** Short tab label, e.g. "Details Part 2". */
  tab: string
  /** Full header-bar text, e.g. "Computing Z by Hand: Details Part 2". */
  heading: string
}

export interface ChapterMeta {
  n: number
  title: string
  pages: PageMeta[]
}

export const chapters: ChapterMeta[] = manifest

export interface Loc {
  /** 1-based chapter number. */
  ch: number
  /** 1-based page number within the chapter. */
  pg: number
}

export function clampLoc(ch: number, pg: number): Loc {
  const c = Math.min(chapters.length, Math.max(1, Math.trunc(ch) || 1))
  const n = chapters[c - 1].pages.length
  return { ch: c, pg: Math.min(n, Math.max(1, Math.trunc(pg) || 1)) }
}

export function nextLoc({ ch, pg }: Loc): Loc | null {
  if (pg < chapters[ch - 1].pages.length) return { ch, pg: pg + 1 }
  if (ch < chapters.length) return { ch: ch + 1, pg: 1 }
  return null
}

export function prevLoc({ ch, pg }: Loc): Loc | null {
  if (pg > 1) return { ch, pg: pg - 1 }
  if (ch > 1) return { ch: ch - 1, pg: chapters[ch - 2].pages.length }
  return null
}

export const pathOf = ({ ch, pg }: Loc) => `/ch/${ch}/${pg}`
export const pageKey = ({ ch, pg }: Loc) => `${ch}-${pg}`
