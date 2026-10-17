import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chapters, pathOf } from '../content/chapters'
import { exportData, importData, useNotes } from '../store/notes'
import { useProgress } from '../store/progress'

const pageName = (ch: number, pg: number) => {
  const p = chapters[ch - 1].pages[pg - 1]
  return `Ch ${ch} · ${p.heading || p.tab}`
}

/** Notes, bookmarks, and export/import of everything stored in this browser. */
export function NotesPage() {
  const { notes, update, remove } = useNotes()
  const bookmarks = useProgress((s) => s.bookmarks)
  const toggleBookmark = useProgress((s) => s.toggleBookmark)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title = 'Notes · Rain from Orbit'
    window.scrollTo(0, 0)
  }, [])

  const marks = Object.keys(bookmarks)
    .map((k) => k.split('-').map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const sorted = [...notes].sort((a, b) => a.ch - b.ch || a.pg - b.pg || a.created - b.created)

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rain-from-orbit-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="wrap">
      <h3 className="ph blue">Notes &amp; bookmarks</h3>
      <div className="pgrid one">
        <div className="pbox plain">
          <h4 className="drawer-sub" style={{ marginTop: 0 }}>
            Bookmarks
          </h4>
          {marks.length === 0 ? (
            <p className="psst">Tap ☆ in the bar above any page to bookmark it.</p>
          ) : (
            <ul className="notes-list">
              {marks.map(([ch, pg]) => (
                <li key={`${ch}-${pg}`}>
                  <Link to={pathOf({ ch, pg })}>{pageName(ch, pg)}</Link>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => toggleBookmark({ ch, pg })}
                    aria-label="Remove bookmark"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h4 className="drawer-sub">Notes</h4>
          {sorted.length === 0 ? (
            <p className="psst">
              Select any passage in the book and press ✎ Note to keep it here with your own comment.
            </p>
          ) : (
            <ul className="notes-list">
              {sorted.map((n) => (
                <li key={n.id} className="note-item">
                  <Link to={pathOf({ ch: n.ch, pg: n.pg })} className="tiny">
                    {pageName(n.ch, n.pg)}
                  </Link>
                  <blockquote>“{n.quote}”</blockquote>
                  {editing === n.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        update(n.id, draft.trim())
                        setEditing(null)
                      }}
                    >
                      <textarea
                        rows={3}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        aria-label="Edit note"
                        autoFocus
                      />
                      <button type="submit" className="btn go">
                        Save
                      </button>
                    </form>
                  ) : (
                    <>
                      {n.text && <p>{n.text}</p>}
                      <span className="note-actions">
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => {
                            setEditing(n.id)
                            setDraft(n.text)
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" className="linkish" onClick={() => remove(n.id)}>
                          Delete
                        </button>
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h4 className="drawer-sub">Your data</h4>
          <p style={{ fontSize: 14.5 }}>
            Progress, notes, bookmarks, quiz answers and saved storms live only in this browser. Export them to keep a
            copy or move to another device.
          </p>
          <div className="seg">
            <button type="button" onClick={download}>
              Export my data
            </button>
            <button type="button" onClick={() => file.current?.click()}>
              Import…
            </button>
          </div>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                const n = importData(await f.text())
                setMsg(`Restored ${n} ${n === 1 ? 'store' : 'stores'} — reloading…`)
                setTimeout(() => location.reload(), 800)
              } catch (err) {
                setMsg(err instanceof Error ? err.message : 'Could not read that file.')
              }
            }}
          />
          {msg && (
            <p className="psst" role="status">
              {msg}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
