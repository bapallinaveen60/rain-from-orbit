import { Link } from 'react-router-dom'
import { chapters, pageKey, pathOf, type Loc } from '../../content/chapters'
import { useProgress } from '../../store/progress'
import { useUi } from '../../store/ui'
import { StormChip } from '../StormDrawer'

export function BookBar({ loc }: { loc: Loc }) {
  const seen = useProgress((s) => s.seen)
  const openStorm = useUi((s) => s.setStormOpen)
  const pages = chapters[loc.ch - 1].pages

  return (
    <div className="bookbar">
      <span className="where">
        Ch {loc.ch} · {loc.pg} of {pages.length}
      </span>
      <div className="dots">
        {pages.map((p, i) => {
          const at = { ch: loc.ch, pg: i + 1 }
          return (
            <Link
              key={i}
              to={pathOf(at)}
              className={'dot-i' + (seen[pageKey(at)] ? ' seen' : '')}
              title={p.tab}
              aria-label={`Page ${i + 1} — ${p.tab}`}
              aria-current={i + 1 === loc.pg ? 'true' : 'false'}
            />
          )
        })}
      </div>
      <StormChip onOpen={() => openStorm(true)} />
    </div>
  )
}
