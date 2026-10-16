import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { pathOf } from '../../content/chapters'
import { BY_ID, explainedAt } from '../../data/glossary'

/**
 * A glossary term in running text (inserted automatically by the MDX build).
 * Hover, focus or tap for a one-line definition and a link to where it's explained.
 */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const g = BY_ID.get(id)
  const [open, setOpen] = useState(false)
  const timer = useRef(0)
  const box = useRef<HTMLSpanElement>(null)
  const tipId = useId()
  const params = useParams()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: Event) => !box.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!g) return <>{children}</>
  const here = Number(params.ch) === g.ch && Number(params.pg) === g.pg
  const hover = (on: boolean) => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(on), on ? 250 : 200)
  }

  return (
    <span className="term" ref={box} onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)}>
      <span
        className="term-word"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((o) => !o)
          }
        }}
      >
        {children}
      </span>
      {open && (
        <span className="term-tip" role="tooltip" id={tipId}>
          <b>{g.term}</b> {g.def}
          {!here && (
            <Link className="term-link" to={pathOf({ ch: g.ch, pg: g.pg })} onClick={() => setOpen(false)}>
              {explainedAt(g)} →
            </Link>
          )}
        </span>
      )}
    </span>
  )
}
