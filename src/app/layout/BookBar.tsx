import { Link } from 'react-router-dom'
import { chapters, isDetail, pageKey, pathOf, type Loc } from '../../content/chapters'
import { useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import { StormChip } from '../StormDrawer'

export function BookBar({ loc }: { loc: Loc }) {
  const seen = useProgress((s) => s.seen)
  const bookmarks = useProgress((s) => s.bookmarks)
  const toggleBookmark = useProgress((s) => s.toggleBookmark)
  const { mode, setMode } = useSettings()
  const openStorm = useUi((s) => s.setStormOpen)
  const pages = chapters[loc.ch - 1].pages
  const marked = !!bookmarks[pageKey(loc)]

  return (
    <div className="bookbar">
      <span className="where">
        Ch {loc.ch} · {loc.pg} of {pages.length}
      </span>
      <div className="dots">
        {pages.map((p, i) => {
          const at = { ch: loc.ch, pg: i + 1 }
          const skipped = mode === 'story' && isDetail(p)
          return (
            <Link
              key={i}
              to={pathOf(at)}
              className={'dot-i' + (seen[pageKey(at)] ? ' seen' : '') + (skipped ? ' skip' : '')}
              title={p.tab + (skipped ? ' (skipped in Story mode)' : '')}
              aria-label={`Page ${i + 1} — ${p.tab}`}
              aria-current={i + 1 === loc.pg ? 'true' : 'false'}
            />
          )
        })}
      </div>
      <button
        type="button"
        className="bar-btn"
        aria-pressed={marked}
        onClick={() => toggleBookmark(loc)}
        title={marked ? 'Remove bookmark' : 'Bookmark this page'}
        aria-label={marked ? 'Remove bookmark' : 'Bookmark this page'}
      >
        {marked ? '★' : '☆'}
      </button>
      <button
        type="button"
        className="bar-btn mode-btn"
        aria-pressed={mode === 'story'}
        onClick={() => setMode(mode === 'story' ? 'full' : 'story')}
        title={
          mode === 'story'
            ? 'Story mode: Details pages are skipped. Click for every page.'
            : 'Read in Story mode (skip Details pages)'
        }
      >
        {mode === 'story' ? 'Story' : 'Full'}
      </button>
      <StormChip onOpen={() => openStorm(true)} />
    </div>
  )
}
