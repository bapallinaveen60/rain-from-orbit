import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { chapters, clampLoc, nextLoc, pathOf, prevLoc, type Loc } from '../../content/chapters'
import { useProgress } from '../../store/progress'
import { PageView } from '../PageView'
import { isTyping } from '../keys'
import { BookBar } from './BookBar'
import { Pager } from './Pager'

/** One book page: progress dots, the page itself, and the pager. */
export function BookLayout() {
  const params = useParams()
  const navigate = useNavigate()
  const visit = useProgress((s) => s.visit)
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
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e)) return
      if (e.key === 'ArrowRight') go(nextLoc({ ch, pg }))
      else if (e.key === 'ArrowLeft') go(prevLoc({ ch, pg }))
      else if (e.key === ']') go(ch < chapters.length ? { ch: ch + 1, pg: 1 } : null)
      else if (e.key === '[') go(ch > 1 ? { ch: ch - 1, pg: 1 } : null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ch, pg, navigate])

  if (!canonical) return <Navigate to={pathOf({ ch, pg })} replace />

  const loc = { ch, pg }
  return (
    <>
      <BookBar loc={loc} />
      <div className="wrap">
        <PageView loc={loc} />
      </div>
      <Pager loc={loc} />
    </>
  )
}
