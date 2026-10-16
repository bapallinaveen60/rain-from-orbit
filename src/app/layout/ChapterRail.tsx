import { Link } from 'react-router-dom'
import { chapters, pathOf } from '../../content/chapters'
import { chaptersStarted, useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'

const PDF = `${import.meta.env.BASE_URL}pdf/Rain-from-Orbit.pdf`

export function ChapterRail({ current }: { current: number }) {
  const seen = useProgress((s) => s.seen)
  const toggleTheme = useSettings((s) => s.toggleTheme)

  return (
    <nav className="rail" aria-label="Chapters">
      <span className="brand">
        <b>Rain from Orbit</b>
        <small>an illustrated guide to GPM</small>
      </span>
      <div className="rail-nav">
        {chapters.map((c) => (
          <Link
            key={c.n}
            to={pathOf({ ch: c.n, pg: 1 })}
            className="chlink"
            aria-current={c.n === current ? 'true' : 'false'}
          >
            <span className="n">{String(c.n).padStart(2, '0')}</span>
            <span className="t">{c.title}</span>
          </Link>
        ))}
      </div>
      <div className="rail-foot">
        <span className="tiny" title="Chapters started">
          {chaptersStarted(seen)} / {chapters.length}
        </span>
        <a className="tbtn" href={PDF} download title="Download the PDF edition" aria-label="Download the PDF edition">
          ⤓
        </a>
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
