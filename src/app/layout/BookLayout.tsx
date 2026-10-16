import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { chapters, clampLoc, nextLoc, pathOf, prevLoc, type Loc } from '../../content/chapters'
import { useProgress } from '../../store/progress'
import { useSettings } from '../../store/settings'
import { PageView } from '../PageView'
import { BookBar } from './BookBar'
import { ChapterRail } from './ChapterRail'
import { Pager } from './Pager'
import { SvgDefs } from './SvgDefs'

function isTyping(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
}

export function BookLayout() {
  const params = useParams()
  const navigate = useNavigate()
  const visit = useProgress((s) => s.visit)
  const toggleTheme = useSettings((s) => s.toggleTheme)
  const { ch, pg } = clampLoc(Number(params.ch), Number(params.pg))
  const canonical = params.ch === String(ch) && params.pg === String(pg)

  useEffect(() => {
    if (!canonical) return
    visit({ ch, pg })
    window.scrollTo(0, 0)
    const c = chapters[ch - 1]
    document.title = `${c.pages[pg - 1].tab} · ${c.title} · Rain from Orbit`
  }, [ch, pg, canonical, visit])

  useEffect(() => {
    const go = (to: Loc | null) => to && navigate(pathOf(to))
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return
      if (e.key === 'ArrowRight') go(nextLoc({ ch, pg }))
      else if (e.key === 'ArrowLeft') go(prevLoc({ ch, pg }))
      else if (e.key === ']') go(ch < chapters.length ? { ch: ch + 1, pg: 1 } : null)
      else if (e.key === '[') go(ch > 1 ? { ch: ch - 1, pg: 1 } : null)
      else if (e.key === 't' || e.key === 'T') toggleTheme()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ch, pg, navigate, toggleTheme])

  if (!canonical) return <Navigate to={pathOf({ ch, pg })} replace />

  const loc = { ch, pg }
  return (
    <>
      <SvgDefs />
      <div className="shell">
        <ChapterRail current={ch} />
        <main>
          <BookBar loc={loc} />
          <div className="wrap">
            <PageView loc={loc} />
          </div>
          <Pager loc={loc} />
        </main>
      </div>
    </>
  )
}
