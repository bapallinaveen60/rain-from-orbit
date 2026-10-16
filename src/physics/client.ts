import * as Comlink from 'comlink'
import { setBandTable } from './mie'
import type { PhysicsWorkerApi } from './worker'

let remote: Comlink.Remote<PhysicsWorkerApi> | null = null

/** The physics worker, started on first use. */
export function physicsWorker(): Comlink.Remote<PhysicsWorkerApi> {
  if (!remote) {
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    remote = Comlink.wrap<PhysicsWorkerApi>(w)
  }
  return remote
}

/**
 * Build the Ku and Ka scattering tables in the worker and install them on the main
 * thread, so the first slider drag doesn't pay for the Mie sums. Safe to call repeatedly.
 */
let warming: Promise<void> | null = null
export function warmUpPhysics(): Promise<void> {
  return (warming ??= Promise.all([physicsWorker().bandTable('ku'), physicsWorker().bandTable('ka')]).then(
    ([ku, ka]) => {
      setBandTable('ku', ku)
      setBandTable('ka', ka)
    },
  ))
}
