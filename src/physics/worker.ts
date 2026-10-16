import * as Comlink from 'comlink'
import { buildProfile, PROFILE_SPECS } from './classify'
import { dfrCurve } from './dsd'
import { bandTable, type Band } from './mie'

/*
 * Off-main-thread physics. The heavy, slider-independent work (scattering tables,
 * full DFR curves, the six classify profiles) runs here so the UI never stutters.
 * Results are structured-cloned back, so the worker keeps its own caches intact.
 */
const api = {
  bandTable: (band: Band) => bandTable(band),
  dfrCurve: (mu: number) => dfrCurve(mu),
  classifyProfiles: () => PROFILE_SPECS.map(buildProfile),
}

export type PhysicsWorkerApi = typeof api

Comlink.expose(api)
