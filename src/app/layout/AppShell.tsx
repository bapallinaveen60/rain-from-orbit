import { useEffect } from 'react'
import { Outlet, useParams, useSearchParams } from 'react-router-dom'
import { useSettings } from '../../store/settings'
import { decodeStorm, useStorm } from '../../store/storm'
import { useUi } from '../../store/ui'
import { StormDrawer } from '../StormDrawer'
import { ChapterRail } from './ChapterRail'
import { SvgDefs } from './SvgDefs'
import { isTyping } from '../keys'

/** Rail + main column shared by book pages, the glossary and the review page. */
export function AppShell() {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const toggleTheme = useSettings((s) => s.toggleTheme)
  const replaceStorm = useStorm((s) => s.replace)
  const { stormOpen, setStormOpen } = useUi()

  // A shared link carries "?storm=Dm_logNw_mu_depth": adopt it once, then tidy the URL.
  useEffect(() => {
    const s = decodeStorm(search.get('storm'))
    if (!s) return
    replaceStorm(s)
    search.delete('storm')
    setSearch(search, { replace: true })
    setStormOpen(true)
  }, [search, setSearch, replaceStorm, setStormOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e)) return
      if (e.key === 't' || e.key === 'T') toggleTheme()
      else if (e.key === 's' || e.key === 'S') setStormOpen(!useUi.getState().stormOpen)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleTheme, setStormOpen])

  return (
    <>
      <SvgDefs />
      <div className="shell">
        <ChapterRail current={params.ch ? Number(params.ch) : 0} />
        <main>
          <Outlet />
        </main>
      </div>
      <StormDrawer open={stormOpen} onClose={() => setStormOpen(false)} />
    </>
  )
}
