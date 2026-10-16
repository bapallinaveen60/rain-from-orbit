import { chapters } from '../content/chapters'
import glossary from './glossary.json'

export interface GlossaryEntry {
  id: string
  term: string
  match: string[]
  code?: string[]
  def: string
  ch: number
  pg: number
}

export const GLOSSARY: GlossaryEntry[] = glossary
export const BY_ID = new Map(GLOSSARY.map((g) => [g.id, g]))

/** Where a term is explained, as link text. */
export function explainedAt(g: GlossaryEntry) {
  const c = chapters[g.ch - 1]
  return `Ch ${g.ch} · ${c.pages[g.pg - 1].heading || c.pages[g.pg - 1].tab}`
}
