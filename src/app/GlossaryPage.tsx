import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { pathOf } from '../content/chapters'
import { explainedAt, GLOSSARY } from '../data/glossary'

const sortKey = (t: string) => t.replace(/^[^\p{L}]+/u, '').toLowerCase()

/** Every glossary term, A–Z, filterable. */
export function GlossaryPage() {
  const [q, setQ] = useState('')
  useEffect(() => {
    document.title = 'Glossary · Rain from Orbit'
    window.scrollTo(0, 0)
  }, [])
  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return [...GLOSSARY]
      .sort((a, b) => sortKey(a.term).localeCompare(sortKey(b.term)))
      .filter((g) => !needle || g.term.toLowerCase().includes(needle) || g.def.toLowerCase().includes(needle))
  }, [q])

  return (
    <div className="wrap">
      <h3 className="ph blue">Glossary</h3>
      <div className="pgrid one">
        <div className="pbox plain">
          <input
            className="glossary-search"
            type="search"
            placeholder="Filter terms…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Filter glossary terms"
          />
          <dl className="glossary">
            {items.map((g) => (
              <div key={g.id} id={`g-${g.id}`}>
                <dt>{g.term}</dt>
                <dd>
                  {g.def}{' '}
                  <Link to={pathOf({ ch: g.ch, pg: g.pg })} className="term-link">
                    {explainedAt(g)} →
                  </Link>
                </dd>
              </div>
            ))}
            {items.length === 0 && <p className="psst">Nothing matches “{q}”.</p>}
          </dl>
        </div>
      </div>
    </div>
  )
}
