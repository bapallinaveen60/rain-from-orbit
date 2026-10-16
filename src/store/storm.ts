import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dB, dfrOf, LWC, nwForZ, Rrate, Zray } from '../physics'

/**
 * "Your storm": one drop size distribution and rain layer shared by every linked simulator.
 * Nw is log10(Nw), as everywhere in the physics.
 */
export interface Storm {
  /** Mass-weighted mean diameter, mm. */
  Dm: number
  /** log10 Nw. */
  logNw: number
  /** Gamma shape. */
  mu: number
  /** Rain-layer depth, km. */
  depth: number
}

/** Wide enough to hold any value a linked simulator's own sliders can set. */
export const STORM_LIMITS = {
  Dm: [0.2, 4.0, 0.01],
  logNw: [1, 6.5, 0.01],
  mu: [-1, 10, 0.1],
  depth: [1, 8, 0.1],
} as const satisfies Record<keyof Storm, readonly [number, number, number]>

export const DEFAULT_STORM: Storm = { Dm: 1.5, logNw: 4, mu: 3, depth: 4 }

/** Illustrative starting points (μ = 3). Box A and B are the book's two 29 dBZ boxes. */
export const STORM_PRESETS: { name: string; storm: Storm }[] = [
  { name: 'Drizzle', storm: { Dm: 0.7, logNw: 4.3, mu: 3, depth: 2 } },
  { name: 'Stratiform', storm: { Dm: 1.4, logNw: 3.6, mu: 3, depth: 4 } },
  { name: 'Convective', storm: { Dm: 2.2, logNw: 3.8, mu: 3, depth: 6 } },
  { name: 'Monsoon wet spell', storm: { Dm: 1.3, logNw: 3.9, mu: 3, depth: 5 } },
  { name: 'Box A', storm: { Dm: 2.72, logNw: nwForZ(29, 2.72, 3), mu: 3, depth: 4 } },
  { name: 'Box B', storm: { Dm: 1.0, logNw: nwForZ(29, 1.0, 3), mu: 3, depth: 4 } },
]

const clamp = (k: keyof Storm, v: number) => {
  const [lo, hi] = STORM_LIMITS[k]
  return Math.min(hi, Math.max(lo, v))
}

export function clampStorm(s: Storm): Storm {
  return {
    Dm: clamp('Dm', s.Dm),
    logNw: clamp('logNw', s.logNw),
    mu: clamp('mu', s.mu),
    depth: clamp('depth', s.depth),
  }
}

/** Compact, URL-safe encoding: "Dm_logNw_mu_depth". */
export function encodeStorm(s: Storm): string {
  return [s.Dm.toFixed(2), s.logNw.toFixed(2), s.mu.toFixed(1), s.depth.toFixed(1)].join('_')
}

export function decodeStorm(text: string | null | undefined): Storm | null {
  if (!text) return null
  const v = text.split('_').map(Number)
  if (v.length !== 4 || v.some((x) => !Number.isFinite(x))) return null
  return clampStorm({ Dm: v[0], logNw: v[1], mu: v[2], depth: v[3] })
}

interface StormState {
  storm: Storm
  /** Per-simulator link to the shared storm (default on). */
  unlinked: Record<string, true>
  saved: { name: string; storm: Storm }[]
  set: (patch: Partial<Storm>) => void
  replace: (s: Storm) => void
  setLinked: (sim: string, linked: boolean) => void
  save: (name: string) => void
  remove: (name: string) => void
}

export const useStorm = create<StormState>()(
  persist(
    (set) => ({
      storm: DEFAULT_STORM,
      unlinked: {},
      saved: [],
      set: (patch) => set((s) => ({ storm: clampStorm({ ...s.storm, ...patch }) })),
      replace: (storm) => set({ storm: clampStorm(storm) }),
      setLinked: (sim, linked) =>
        set((s) => {
          const unlinked = { ...s.unlinked }
          if (linked) delete unlinked[sim]
          else unlinked[sim] = true
          return { unlinked }
        }),
      save: (name) => set((s) => ({ saved: [...s.saved.filter((x) => x.name !== name), { name, storm: s.storm }] })),
      remove: (name) => set((s) => ({ saved: s.saved.filter((x) => x.name !== name) })),
    }),
    { name: 'rfo-storm' },
  ),
)

export const useLinked = (sim: string) => useStorm((s) => !s.unlinked[sim])

/** Headline numbers for a storm. */
export function stormSummary(s: Storm) {
  const R = Rrate(s.Dm, s.logNw, s.mu)
  return { dbz: dB(Zray(s.Dm, s.logNw, s.mu)), R, lwc: LWC(s.Dm, s.logNw), dfr: dfrOf(+s.Dm.toFixed(2), s.mu) }
}
