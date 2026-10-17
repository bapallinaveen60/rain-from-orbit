import { Link } from 'react-router-dom'
import { chapters, nextLoc, pathOf, prevLoc, type Loc } from '../../content/chapters'
import { useSettings } from '../../store/settings'
import { PDF } from './ChapterRail'

export function Pager({ loc }: { loc: Loc }) {
  const story = useSettings((s) => s.mode) === 'story'
  const prev = prevLoc(loc, story)
  const next = nextLoc(loc, story)
  const lastOfChapter = next !== null && next.ch !== loc.ch

  return (
    <div className="wrap" style={{ paddingTop: 0 }}>
      <div className="pnav">
        {prev ? (
          <Link className="btn" to={pathOf(prev)}>
            {prev.ch !== loc.ch ? `← Chapter ${prev.ch}` : '← Back'}
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
      <nav className="book-foot" aria-label="More">
        <Link to="/explore">Granule explorer</Link>
        <Link to="/notes">Notes</Link>
        <Link to="/glossary">Glossary</Link>
        <Link to="/review">Review missed questions</Link>
        <a href={PDF} download>
          PDF edition
        </a>
      </nav>
    </div>
  )
}
