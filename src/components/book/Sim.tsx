import { lazy, Suspense, type ComponentType } from 'react'
import type { SimProps } from '../../sims/types'

export type SimId = 'orbit' | 'dsd' | 'curtain' | 'atten' | 'dfr' | 'class' | 'pipe' | 'india'

// Each simulator is its own chunk, loaded when its page is opened.
const SIMS: Record<SimId, ComponentType<SimProps>> = {
  orbit: lazy(() => import('../../sims/OrbitSim')),
  dsd: lazy(() => import('../../sims/DsdLab')),
  curtain: lazy(() => import('../../sims/ScanCurtain')),
  atten: lazy(() => import('../../sims/AttenuationSim')),
  dfr: lazy(() => import('../../sims/DfrSim')),
  class: lazy(() => import('../../sims/ClassifyGame')),
  pipe: lazy(() => import('../../sims/PipelineSim')),
  india: lazy(() => import('../../sims/MonsoonSim')),
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
    <Suspense fallback={<Loading id={id} title={title} hint={hint} />}>
      <S title={title} hint={hint} />
    </Suspense>
  )
}
