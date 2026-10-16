/*
 * DPR cross-track scan geometry and the synthetic storm scenes for the Ch3 scan curtain.
 */

/** Angle bins across the swath. */
export const NBEAM = 49
/** Range bins in the synthetic curtain (top to bottom). */
export const NZ = 96
/** Curtain top, km. */
export const ZTOP = 16

export type SceneKind = 'squall' | 'strat' | 'shallow'

/** Incidence angle of beam `b` (0–48), degrees; nadir is beam 24. */
export const angleOf = (b: number) => ((b - 24) / 24) * 17

/** Height of the clutter-free bottom for beam `b`, km — the blind layer grows off-nadir. */
export const clutterFreeBottom = (b: number) => 0.42 + 1.25 * Math.pow(Math.abs(b - 24) / 24, 1.35)

/** Height of range bin k, km. */
export const heightOf = (k: number) => ZTOP * (1 - k / (NZ - 1))

/** Highest bin above 15 dBZ, km (0 if none). */
export function stormTop(col: ArrayLike<number>): number {
  for (let k = 0; k < NZ; k++) if (col[k] > 15) return heightOf(k)
  return 0
}

/** Synthetic curtain: NBEAM columns of NZ reflectivities (dBZ, −99 = no echo). */
export function buildScene(kind: SceneKind): Float64Array[] {
  const g: Float64Array[] = []
  for (let b = 0; b < NBEAM; b++) {
    const col = new Float64Array(NZ)
    const x = (b - 24) / 24
    for (let k = 0; k < NZ; k++) {
      const z = heightOf(k)
      let v = -99
      if (kind === 'squall') {
        const core = Math.exp(-Math.pow((x + 0.18) / 0.17, 2))
        const trail = Math.exp(-Math.pow((x - 0.42) / 0.38, 2))
        const top = 4.5 + 9.5 * core + 2.8 * trail
        if (z < top) {
          v =
            20 +
            26 * core * Math.exp(-Math.pow((z - 2.2) / 5.6, 2)) +
            13 * trail * Math.exp(-Math.pow((z - 2.6) / 3.0, 2))
          if (trail > 0.25 && Math.abs(z - 4.35) < 0.42) v += 7.5 * trail
          v -= Math.max(0, (z - 9) * 2.2)
        }
      } else if (kind === 'strat') {
        const amp = 0.72 + 0.3 * Math.exp(-Math.pow((x - 0.1) / 0.5, 2))
        if (z < 7.6) {
          v = 16 + 13 * amp * Math.exp(-Math.pow((z - 2.4) / 3.6, 2))
          if (Math.abs(z - 4.35) < 0.4) v += 9.5 * amp * (1 - Math.abs(z - 4.35) / 0.4)
          if (z > 4.75) v -= (z - 4.75) * 2.4
        }
      } else {
        const ridge = Math.exp(-Math.pow((x + 0.05) / 0.3, 2))
        if (z < 2.5 + 1.1 * ridge) v = 19 + 20 * ridge * Math.exp(-Math.pow((z - 0.9) / 1.5, 2))
      }
      col[k] = v + Math.sin(b * 2.3) * 0.7 + Math.sin(k * 0.19 + b * 0.4) * 0.6
    }
    g.push(col)
  }
  return g
}

const scenes: Partial<Record<SceneKind, Float64Array[]>> = {}
export const scene = (kind: SceneKind) => (scenes[kind] ??= buildScene(kind))
