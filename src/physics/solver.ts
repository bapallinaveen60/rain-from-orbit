import { mieZK, nwForZ, Rrate, Zray } from './dsd'
import { PIPE_DM, PIPE_ZTOP, type ChainRay } from './pipeline'

/*
 * A teaching version of the Level-2 Solver (Ch7): the R–Dm plane and the ε sweep.
 *
 * The ATBD's R–Dm relation has the form R = ε^r · p · Dm^q with coefficients tabulated per
 * rain type. The book does not print them, so this module uses a relation fitted to the
 * book's own gamma-DSD model instead: the rain rate of a μ = 3 distribution with
 * log10 Nw = 4.4, scaled by ε (so r = 1, q = 4.67). It reproduces the geometry of the
 * retrieval faithfully; it is not the operational coefficient set.
 */

export const RDM_MU = 3
/** log10 Nw of the reference relation (ε = 1). */
export const RDM_LOGNW = 4.4
export const RDM_Q = 4.67
export const RDM_P = Rrate(1, RDM_LOGNW, RDM_MU)
/** ε range swept by the Solver. */
export const EPS_MIN = 0.2
export const EPS_MAX = 5.0

/** The assumed relation: R = ε · p · Dm^q (mm h⁻¹). */
export const rdmRelation = (Dm: number, eps: number) => eps * RDM_P * Math.pow(Dm, RDM_Q)

/** Rain rate along the reflectivity contour: every (Dm, R) that gives `dbz` (Rayleigh, μ = 3). */
export const zContourR = (Dm: number, dbz: number) => Rrate(Dm, nwForZ(dbz, Dm, RDM_MU), RDM_MU)

/** Where the relation and the contour cross: Dm (mm) and R. One crossing in this model. */
export function solveBin(dbz: number, eps: number): { Dm: number; R: number; logNw: number } {
  // On the relation, Nw is fixed at 10^RDM_LOGNW · ε; the contour then fixes Dm analytically (Z ∝ Nw Dm⁷).
  const logNw = RDM_LOGNW + Math.log10(eps)
  const Dm = Math.pow(Math.pow(10, dbz / 10) / Zray(1, logNw, RDM_MU), 1 / 7)
  return { Dm, R: rdmRelation(Dm, eps), logNw }
}

export interface SweepPoint {
  eps: number
  /** Path-integrated attenuation implied by this ε's solution, dB. */
  pia: number
  /** Cost terms: prior on ε, and mismatch with the SRT. */
  prior: number
  srt: number
  cost: number
}

export interface SweepResult {
  points: SweepPoint[]
  best: SweepPoint
  /** The ε that reproduces the true PIA exactly (where the truth sits on this family). */
  truthPia: number
}

/**
 * Sweep ε over the liquid bins of a chain ray. For each ε every bin is solved on the R–Dm
 * plane, the attenuation it implies is integrated, and the cost compares that with the SRT.
 * @param piaSrt PIA reported by the surface reference, dB
 * @param sigmaSrt SRT uncertainty, dB
 * @param sigmaPrior width of the prior on log10 ε
 */
export function epsSweep(ray: ChainRay, piaSrt: number, sigmaSrt = 0.3, sigmaPrior = 0.5, n = 61): SweepResult {
  const dz = PIPE_ZTOP / (ray.z.length - 1)
  const liquid = ray.rr.map((r, i) => (r > 0 ? i : -1)).filter((i) => i >= 0)
  const points: SweepPoint[] = []
  for (let k = 0; k < n; k++) {
    const eps = EPS_MIN * Math.pow(EPS_MAX / EPS_MIN, k / (n - 1))
    let pia = 0
    for (const i of liquid) {
      const s = solveBin(ray.ze[i], eps)
      pia += 2 * mieZK('ku', s.Dm, s.logNw, RDM_MU).k * dz
    }
    const prior = Math.pow(Math.log10(eps) / sigmaPrior, 2)
    const srt = Math.pow((pia - piaSrt) / sigmaSrt, 2)
    points.push({ eps, pia, prior, srt, cost: prior + srt })
  }
  const best = points.reduce((a, b) => (b.cost < a.cost ? b : a))
  // Only the liquid layer is solved here, so compare against its share of the true PIA.
  let truthPia = 0
  for (const i of liquid) truthPia += 2 * mieZK('ku', PIPE_DM, nwForZ(ray.ze[i], PIPE_DM, RDM_MU), RDM_MU).k * dz
  return { points, best, truthPia }
}
