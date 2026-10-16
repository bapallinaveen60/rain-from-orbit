import { lgamma } from './gamma'
import { bandTable, Dgrid, DSTEP, NG, type Band } from './mie'

/*
 * Normalised gamma drop size distribution.
 * Throughout, Nw is passed as log10(Nw) ("logNw"), Dm in mm, μ dimensionless.
 */

/** f(μ) = 6/4⁴ · (4 + μ)^(μ+4) / Γ(μ + 4). */
export function fmu(mu: number): number {
  return Math.exp(Math.log(6 / 256) + (mu + 4) * Math.log(4 + mu) - lgamma(mu + 4))
}

/** N(D) in mm⁻¹ m⁻³. */
export function nd(D: number, Dm: number, logNw: number, mu: number): number {
  return Math.pow(10, logNw) * fmu(mu) * Math.pow(D / Dm, mu) * Math.exp((-(4 + mu) * D) / Dm)
}

/** Analytic Rayleigh reflectivity Z, mm⁶ m⁻³. */
export function Zray(Dm: number, logNw: number, mu: number): number {
  const lnZ = logNw * Math.LN10 + Math.log(fmu(mu)) + 7 * Math.log(Dm) + lgamma(7 + mu) - (7 + mu) * Math.log(4 + mu)
  return Math.exp(lnZ)
}

/** Analytic rain rate, mm h⁻¹, with fall speed v = 3.78 D^0.67 m s⁻¹. */
export function Rrate(Dm: number, logNw: number, mu: number): number {
  const p = 4.67
  const lnI = logNw * Math.LN10 + Math.log(fmu(mu)) + p * Math.log(Dm) + lgamma(p + mu) - (p + mu) * Math.log(4 + mu)
  return 6 * Math.PI * 1e-4 * 3.78 * Math.exp(lnI)
}

/** Liquid water content, g m⁻³. */
export function LWC(Dm: number, logNw: number, _mu?: number): number {
  return (Math.PI * 1e-3 * Math.pow(10, logNw) * Math.pow(Dm, 4)) / 256
}

/** log10 Nw that makes the Rayleigh Z equal `dbz`. */
export function nwForZ(dbz: number, Dm: number, mu: number): number {
  return Math.log10(Math.pow(10, dbz / 10) / Zray(Dm, 0, mu))
}

/** log10 Nw that makes the rain rate equal `R` (mm h⁻¹). */
export function nwForR(R: number, Dm: number, mu: number): number {
  return Math.log10(R / Rrate(Dm, 0, mu))
}

/** 10·log10, floored so zero never produces −∞. */
export function dB(z: number): number {
  return 10 * Math.log10(Math.max(z, 1e-12))
}

export interface ZK {
  /** Effective reflectivity, mm⁶ m⁻³. */
  Ze: number
  /** Specific (one-way) attenuation, dB km⁻¹. */
  k: number
}

/** Mie integrals over the DSD: effective Ze and specific attenuation k. */
export function mieZK(band: Band, Dm: number, logNw: number, mu: number): ZK {
  const B = bandTable(band)
  const Nw = Math.pow(10, logNw)
  const f = fmu(mu)
  let sumB = 0
  let sumE = 0
  for (let i = 0; i < NG; i++) {
    const D = Dgrid[i]
    const n = Nw * f * Math.pow(D / Dm, mu) * Math.exp((-(4 + mu) * D) / Dm)
    sumB += B.sb[i] * n
    sumE += B.se[i] * n
  }
  sumB *= DSTEP
  sumE *= DSTEP
  return { Ze: B.zc * sumB, k: (0.01 / Math.LN10) * sumE }
}

const dfrCache = new Map<string, number>()

/** Dual-frequency ratio Ze(Ku) − Ze(Ka) in dB. Independent of Nw, so evaluated at logNw = 4. */
export function dfrOf(Dm: number, mu: number): number {
  const key = Dm.toFixed(3) + '|' + mu.toFixed(2)
  const hit = dfrCache.get(key)
  if (hit !== undefined) return hit
  const v = dB(mieZK('ku', Dm, 4, mu).Ze) - dB(mieZK('ka', Dm, 4, mu).Ze)
  dfrCache.set(key, v)
  return v
}

/** The DFR-vs-Dm curve the Ch5 simulator draws: Dm from 0.2 to 4.0 mm in 0.04 mm steps. */
export function dfrCurve(mu: number): [number, number][] {
  const pts: [number, number][] = []
  for (let d = 0.2; d <= 4.0001; d += 0.04) pts.push([d, dfrOf(+d.toFixed(2), mu)])
  return pts
}

/** Every Dm where the curve crosses `dfr` (linear interpolation between samples). */
export function dfrSolutions(curve: [number, number][], dfr: number): number[] {
  const sols: number[] = []
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i][1] - dfr
    const b = curve[i + 1][1] - dfr
    if (a === 0 || a < 0 !== b < 0) {
      const t = a / (a - b)
      sols.push(curve[i][0] + t * (curve[i + 1][0] - curve[i][0]))
    }
  }
  return sols
}
