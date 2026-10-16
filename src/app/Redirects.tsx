import { Navigate, useLocation } from 'react-router-dom'
import { clampLoc, pathOf } from '../content/chapters'
import { useProgress } from '../store/progress'

/** "/" resumes where the reader left off. */
export function Home() {
  const last = useProgress.getState().last
  return <Navigate to={pathOf(last ?? { ch: 1, pg: 1 })} replace />
}

/** Old single-file links used "#c3p2"; anything else unknown goes home. */
export function Fallback() {
  const m = /^\/?c(\d+)p(\d+)$/.exec(useLocation().pathname)
  return <Navigate to={m ? pathOf(clampLoc(+m[1], +m[2])) : '/'} replace />
}
