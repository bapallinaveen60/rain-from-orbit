import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { search, type Hit } from './search'

/** Ctrl+K / "/" search across every page and the glossary. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const navigate = useNavigate()
  const list = useRef<HTMLUListElement>(null)
  const hits = useMemo(() => search(q), [q])

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null
  const go = (h: Hit | undefined) => {
    if (!h) return
    navigate(h.to)
    onClose()
  }

  return (
    <div className="drawer-scrim search-scrim" onClick={onClose}>
      <div className="search" role="dialog" aria-label="Search the book" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="search"
          value={q}
          placeholder="Search pages and terms — e.g. bright band, SRT, epsilon"
          aria-label="Search"
          aria-controls="search-results"
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setSel((s) => Math.min(hits.length - 1, s + 1))
            else if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1))
            else if (e.key === 'Enter') go(hits[sel])
            else if (e.key === 'Escape') onClose()
            else return
            e.preventDefault()
          }}
        />
        <ul id="search-results" ref={list} role="listbox">
          {hits.map((h, i) => (
            <li
              key={h.key}
              role="option"
              aria-selected={i === sel}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(h)}
            >
              <b>
                {h.kind === 'term' && <span className="search-kind">term</span>}
                {h.title}
              </b>
              <span className="search-snip">{h.snippet}</span>
            </li>
          ))}
          {q.trim().length > 1 && hits.length === 0 && <li className="psst">Nothing found for “{q}”.</li>}
        </ul>
        <p className="tiny search-foot">↑ ↓ to choose · Enter to open · Esc to close</p>
      </div>
    </div>
  )
}

const KEYS: [string, string][] = [
  ['← →', 'previous / next page'],
  ['[ ]', 'previous / next chapter'],
  ['Ctrl K or /', 'search'],
  ['S', 'your storm'],
  ['T', 'light / dark theme'],
  ['?', 'this help'],
  ['Esc', 'close a panel'],
]

export function KeyboardHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="drawer-scrim search-scrim" onClick={onClose}>
      <div className="search" role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()}>
        <h4 className="drawer-sub" style={{ marginTop: 0 }}>
          Keyboard shortcuts
        </h4>
        <table className="t">
          <tbody>
            {KEYS.map(([k, d]) => (
              <tr key={k}>
                <td className="n">
                  <kbd>{k}</kbd>
                </td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="psst">Select any passage to save it as a note.</p>
      </div>
    </div>
  )
}
