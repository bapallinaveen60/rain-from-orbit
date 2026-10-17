import { Link } from 'react-router-dom'
import { chapters, pathOf } from '../../content/chapters'
import { chapterProgress, chaptersStarted, useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'

export const PDF = `${import.meta.env.BASE_URL}pdf/Rain-from-Orbit.pdf`

export function ChapterRail({ current }: { current: number }) {
  const seen = useProgress((s) => s.seen)
  const toggleTheme = useSettings((s) => s.toggleTheme)
  const openSearch = useUi((s) => s.setSearchOpen)

  return (
    <nav className="rail" aria-label="Chapters">
      <span className="brand">
        <b>Rain from Orbit</b>
        <small>an illustrated guide to GPM</small>
      </span>
      <div className="rail-nav">
        {chapters.map((c) => {
          const pct = Math.round(chapterProgress(seen, c.n) * 100)
          return (
            <Link
              key={c.n}
              to={pathOf({ ch: c.n, pg: 1 })}
              className="chlink"
              aria-current={c.n === current ? 'true' : 'false'}
              title={`${pct}% read`}
            >
              <span className="n">{String(c.n).padStart(2, '0')}</span>
              <span className="t">
                {c.title}
                <span className="ch-bar" aria-hidden="true">
                  <i style={{ width: `${pct}%` }} />
                </span>
              </span>
            </Link>
          )
        })}
      </div>
      <div className="rail-tools rail-extra">
        <button type="button" className="linkish" onClick={() => openSearch(true)}>
          Search <kbd>Ctrl K</kbd>
        </button>
        <Link to="/notes">Notes &amp; bookmarks</Link>
        <Link to="/explore">Granule explorer</Link>
        <Link to="/glossary">Glossary</Link>
        <Link to="/review">Review</Link>
        <a href={PDF} download>
          PDF edition
        </a>
      </div>
      <div className="rail-foot">
        <span className="tiny" title="Chapters started">
          {chaptersStarted(seen)} / {chapters.length}
        </span>
        <button
          className="tbtn"
          type="button"
          onClick={() => openSearch(true)}
          title="Search (Ctrl K)"
          aria-label="Search"
        >
          ⌕
        </button>
        <button
          className="tbtn"
          type="button"
          onClick={toggleTheme}
          title="Switch light / dark"
          aria-label="Switch light or dark theme"
        >
          ◐
        </button>
      </div>
    </nav>
  )
}
