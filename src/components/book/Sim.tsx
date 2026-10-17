import { Suspense, type ComponentType } from 'react'
import { ErrorBoundary } from '../../app/ErrorScreen'
import { lazyWithReload } from '../../app/staleChunks'
import type { SimProps } from '../../sims/types'

export type SimId = 'orbit' | 'dsd' | 'curtain' | 'atten' | 'dfr' | 'class' | 'pipe' | 'india'

// Each simulator is its own chunk, loaded when its page is opened.
const SIMS: Record<SimId, ComponentType<SimProps>> = {
  orbit: lazyWithReload(() => import('../../sims/OrbitSim')),
  dsd: lazyWithReload(() => import('../../sims/DsdLab')),
  curtain: lazyWithReload(() => import('../../sims/ScanCurtain')),
  atten: lazyWithReload(() => import('../../sims/AttenuationSim')),
  dfr: lazyWithReload(() => import('../../sims/DfrSim')),
  class: lazyWithReload(() => import('../../sims/ClassifyGame')),
  pipe: lazyWithReload(() => import('../../sims/PipelineSim')),
  india: lazyWithReload(() => import('../../sims/MonsoonSim')),
}

function Loading({ id, title, hint }: SimProps & { id: SimId }) {
  return (
    <div className="wgt" id={`p-${id}`}>
      <div className="wgt-h">
        {title}
        {hint && <span>{hint}</span>}
      </div>
      <p className="psst" style={{ margin: '24px 0', textAlign: 'center' }}>
        Loading the simulator…
      </p>
    </div>
  )
}

/** A live simulator, placed in a page with <Sim id="…" title="…" hint="…" />. */
export function Sim({ id, title, hint }: { id: SimId; title: string; hint?: string }) {
  const S = SIMS[id]
  return (
    <ErrorBoundary inline>
      <Suspense fallback={<Loading id={id} title={title} hint={hint} />}>
        <S title={title} hint={hint} />
      </Suspense>
    </ErrorBoundary>
  )
}
