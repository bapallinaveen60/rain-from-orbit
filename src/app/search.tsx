import type { ReactNode } from 'react'
import { pathOf } from '../content/chapters'
import index from '../content/search-index.json'
import { explainedAt, GLOSSARY } from '../data/glossary'

export interface Hit {
  key: string
  to: string
  title: string
  kind: 'term' | 'page'
  snippet: ReactNode
  score: number
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD')

/** Wrap every query token in <mark>. */
function highlight(text: string, tokens: string[]): ReactNode {
  if (!tokens.length) return text
  const re = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
}

export function search(query: string): Hit[] {
  const tokens = norm(query)
    .split(/\s+/)
    .filter((t) => t.length > 1)
  if (!tokens.length) return []
  const hits: Hit[] = []

  for (const g of GLOSSARY) {
    const hay = norm(g.term + ' ' + g.match.join(' ') + ' ' + (g.code ?? []).join(' '))
    if (tokens.every((t) => hay.includes(t) || norm(g.def).includes(t))) {
      const inName = tokens.filter((t) => hay.includes(t)).length
      hits.push({
        key: 'g-' + g.id,
        to: pathOf({ ch: g.ch, pg: g.pg }),
        title: g.term,
        kind: 'term',
        snippet: (
          <>
            {highlight(g.def, tokens)} <span className="tiny">— {explainedAt(g)}</span>
          </>
        ),
        score: 50 + inName * 20,
      })
    }
  }

  for (const p of index) {
    const head = norm(p.heading)
    const body = norm(p.text)
    if (!tokens.every((t) => head.includes(t) || body.includes(t))) continue
    let score = 0
    for (const t of tokens) {
      if (head.includes(t)) score += 15
      let n = 0
      for (let i = body.indexOf(t); i >= 0 && n < 8; i = body.indexOf(t, i + t.length)) n++
      score += n
    }
    const at = Math.max(0, body.indexOf(tokens[0]))
    const from = Math.max(0, at - 70)
    const raw = p.text.slice(from, from + 180)
    hits.push({
      key: `p-${p.ch}-${p.pg}`,
      to: pathOf({ ch: p.ch, pg: p.pg }),
      title: `Ch ${p.ch} · ${p.heading}`,
      kind: 'page',
      snippet: (
        <>
          {from > 0 && '… '}
          {highlight(raw, tokens)} …
        </>
      ),
      score,
    })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 12)
}
