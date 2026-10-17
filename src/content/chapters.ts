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

/** Details pages carry the derivations; Story mode skips them. */
export const isDetail = (p: PageMeta) => p.tab.startsWith('Details') || p.tab === 'The Real Diagram'
const skip = (l: Loc, story: boolean) => story && isDetail(chapters[l.ch - 1].pages[l.pg - 1])

function step({ ch, pg }: Loc, dir: 1 | -1): Loc | null {
  if (dir > 0) {
    if (pg < chapters[ch - 1].pages.length) return { ch, pg: pg + 1 }
    return ch < chapters.length ? { ch: ch + 1, pg: 1 } : null
  }
  if (pg > 1) return { ch, pg: pg - 1 }
  return ch > 1 ? { ch: ch - 1, pg: chapters[ch - 2].pages.length } : null
}

/** The next page, skipping Details pages in Story mode. */
export function nextLoc(loc: Loc, story = false): Loc | null {
  let l = step(loc, 1)
  while (l && skip(l, story)) l = step(l, 1)
  return l
}

/** The previous page, skipping Details pages in Story mode. */
export function prevLoc(loc: Loc, story = false): Loc | null {
  let l = step(loc, -1)
  while (l && skip(l, story)) l = step(l, -1)
  return l
}

export const pathOf = ({ ch, pg }: Loc) => `/ch/${ch}/${pg}`
export const pageKey = ({ ch, pg }: Loc) => `${ch}-${pg}`
