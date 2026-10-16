import { useState } from 'react'
import { useLinked, useStorm, type Storm } from '../../store/storm'

/**
 * A simulator's storm: the shared one while linked, or its own private copy.
 * Unlinking keeps the current values, so nothing jumps.
 */
export function useSimStorm(sim: string, initial: Storm) {
  const linked = useLinked(sim)
  const shared = useStorm((s) => s.storm)
  const setShared = useStorm((s) => s.set)
  const setLinkedFlag = useStorm((s) => s.setLinked)
  const [local, setLocal] = useState(initial)

  const storm = linked ? shared : local
  const set = (patch: Partial<Storm>) => (linked ? setShared(patch) : setLocal((s) => ({ ...s, ...patch })))
  const setLinked = (on: boolean) => {
    if (!on) setLocal(shared)
    setLinkedFlag(sim, on)
  }
  return { storm, set, linked, setLinked }
}
