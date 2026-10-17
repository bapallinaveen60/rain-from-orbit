import { useEffect, useRef, useState, type RefObject } from 'react'
import type { Loc } from '../content/chapters'
import { useNotes } from '../store/notes'

interface Pending {
  quote: string
  x: number
  y: number
}

const MAX_QUOTE = 600

/**
 * Select text on a page and a "✎ Note" button appears beside it; click it to save the passage
 * with your own comment. Notes are listed on #/notes.
 */
export function NoteTaker({ loc, scope }: { loc: Loc; scope: RefObject<HTMLElement | null> }) {
  const add = useNotes((s) => s.add)
  const [pending, setPending] = useState<Pending | null>(null)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onUp = (e: Event) => {
      if (box.current?.contains(e.target as Node)) return
      // Let the selection settle before reading it.
      setTimeout(() => {
        const sel = window.getSelection()
        const quote = sel?.toString().replace(/\s+/g, ' ').trim() ?? ''
        if (!sel || sel.rangeCount === 0 || quote.length < 3 || !scope.current?.contains(sel.anchorNode)) {
          if (!editing) setPending(null)
          return
        }
        const r = sel.getRangeAt(0).getBoundingClientRect()
        setPending({ quote: quote.slice(0, MAX_QUOTE), x: r.left + r.width / 2, y: r.bottom + window.scrollY })
        setEditing(false)
        setText('')
      }, 10)
    }
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchend', onUp)
    return () => {
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchend', onUp)
    }
  }, [scope, editing])

  if (!pending) return null
  const left = Math.max(12, Math.min(window.innerWidth - 300, pending.x - 140))

  return (
    <div ref={box} className="note-pop" style={{ top: pending.y + 8, left }}>
      {!editing ? (
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          ✎ Note
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            add({ ch: loc.ch, pg: loc.pg, quote: pending.quote, text: text.trim() })
            setPending(null)
            setEditing(false)
            window.getSelection()?.removeAllRanges()
          }}
        >
          <blockquote>“{pending.quote}”</blockquote>
          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your note (optional)"
            aria-label="Your note"
          />
          <div className="note-pop-actions">
            <button type="button" className="btn" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button type="submit" className="btn go">
              Save note
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
