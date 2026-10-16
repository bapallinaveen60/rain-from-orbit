import { Link } from 'react-router-dom'
import { chapters, nextLoc, pathOf, prevLoc, type Loc } from '../../content/chapters'

export function Pager({ loc }: { loc: Loc }) {
  const prev = prevLoc(loc)
  const next = nextLoc(loc)
  const lastOfChapter = loc.pg === chapters[loc.ch - 1].pages.length

  return (
    <div className="wrap" style={{ paddingTop: 0 }}>
      <div className="pnav">
        {prev ? (
          <Link className="btn" to={pathOf(prev)}>
            {loc.pg === 1 ? `← Chapter ${prev.ch}` : '← Back'}
          </Link>
        ) : (
          <span />
        )}
        <span className="mid">{chapters[loc.ch - 1].pages[loc.pg - 1].tab}</span>
        {next ? (
          <Link className="btn go" to={pathOf(next)}>
            {lastOfChapter ? `Chapter ${next.ch} →` : 'Next →'}
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}
