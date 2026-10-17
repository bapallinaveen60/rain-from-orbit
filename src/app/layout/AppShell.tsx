import { useEffect } from 'react'
import { Outlet, useParams, useSearchParams } from 'react-router-dom'
import { useSettings } from '../../store/settings'
import { decodeStorm, useStorm } from '../../store/storm'
import { useUi } from '../../store/ui'
import { isTyping } from '../keys'
import { KeyboardHelp, SearchDialog } from '../SearchDialog'
import { StormDrawer } from '../StormDrawer'
import { ChapterRail } from './ChapterRail'
import { SvgDefs } from './SvgDefs'

/** Rail + main column shared by book pages, the glossary, notes and review. */
export function AppShell() {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const toggleTheme = useSettings((s) => s.toggleTheme)
  const replaceStorm = useStorm((s) => s.replace)
  const { stormOpen, setStormOpen, searchOpen, setSearchOpen, helpOpen, setHelpOpen } = useUi()

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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(!useUi.getState().searchOpen)
        return
      }
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e)) return
      if (e.key === 't' || e.key === 'T') toggleTheme()
      else if (e.key === 's' || e.key === 'S') setStormOpen(!useUi.getState().stormOpen)
      else if (e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key === '?') setHelpOpen(!useUi.getState().helpOpen)
      else if (e.key === 'Escape') {
        setHelpOpen(false)
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleTheme, setStormOpen, setSearchOpen, setHelpOpen])

  return (
    <>
      <a
        className="skip-link"
        href="#content"
        onClick={(e) => (e.preventDefault(), document.getElementById('content')?.focus())}
      >
        Skip to the page
      </a>
      <SvgDefs />
      <div className="shell">
        <ChapterRail current={params.ch ? Number(params.ch) : 0} />
        <main id="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <StormDrawer open={stormOpen} onClose={() => setStormOpen(false)} />
      {searchOpen && <SearchDialog open onClose={() => setSearchOpen(false)} />}
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
