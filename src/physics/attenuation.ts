import { dB, mieZK, nwForR } from './dsd'
import type { Band } from './mie'

export interface PowerLaw {
  /** k = a · Ze^b */
  a: number
  b: number
}

let hbfit: Record<Band, PowerLaw> | null = null

/**
 * k–Ze power law for Hitschfeld–Bordan, fitted by least squares in log space along a
 * Marshall–Palmer-like path (log10 Nw = 3.9, μ = 3, Dm 0.6–2.6 mm).
 */
export function hbFit(): Record<Band, PowerLaw> {
  if (hbfit) return hbfit
  const fit = (b: Band): PowerLaw => {
    let sx = 0
    let sy = 0
    let sxx = 0
    let sxy = 0
    let n = 0
    for (let Dm = 0.6; Dm <= 2.6001; Dm += 0.05) {
      const r = mieZK(b, Dm, 3.9, 3)
      if (r.Ze <= 0 || r.k <= 0) continue
      const x = Math.log(r.Ze)
      const y = Math.log(r.k)
      sx += x
      sy += y
      sxx += x * x
      sxy += x * y
      n++
    }
    const beta = (n * sxy - sx * sy) / (n * sxx - sx * sx)
    return { a: Math.exp((sy - beta * sx) / n), b: beta }
  }
  return (hbfit = { ku: fit('ku'), ka: fit('ka') })
}

/** Detection floors used by the attenuation simulator, dBZ. */
export const DETECTION_FLOOR: Record<Band, number> = { ku: 15.5, ka: 19.2 }

export interface ColumnInput {
  /** Rain rate, mm h⁻¹. */
  R: number
  /** Rain-layer depth, km. */
  depth: number
  /** Mass-weighted mean diameter, mm. */
  Dm: number
  mu?: number
}

export interface BandColumn {
  /** True (unattenuated) reflectivity, dBZ — uniform through the layer. */
  Ze: number
  /** Specific attenuation, dB km⁻¹. */
  k: number
  /** Two-way path-integrated attenuation at the bottom of the layer, dB. */
  pia: number
}

export interface Column {
  ku: BandColumn
  ka: BandColumn
  logNw: number
}

/** A uniform rain column at a given rain rate, as in the Ch4 simulator. */
export function rainColumn({ R, depth, Dm, mu = 3 }: ColumnInput): Column {
  const logNw = nwForR(R, Dm, mu)
  const band = (b: Band): BandColumn => {
    const r = mieZK(b, Dm, logNw, mu)
    return { Ze: dB(r.Ze), k: r.k, pia: 2 * r.k * depth }
  }
  return { ku: band('ku'), ka: band('ka'), logNw }
}

/** Measured (attenuated) reflectivity at distance `s` km below the rain top. */
export function measuredAt(col: BandColumn, s: number): number {
  return col.Ze - 2 * col.k * s
}

export interface HBPoint {
  /** Height above the ground, km. */
  h: number
  /** Measured reflectivity, dBZ. */
  zm: number
  /** HB denominator 1 − 0.2 ln10 · β · ∫ α Zm^β ds; the correction blows up as it nears 0. */
  den: number
  /** HB-corrected reflectivity, dBZ (NaN once den ≤ 0). */
  ze: number
}

/** Hitschfeld–Bordan correction down the column, in `steps` increments. */
export function hbProfile(col: BandColumn, band: Band, depth: number, steps: number): HBPoint[] {
  const F = hbFit()[band]
  const out: HBPoint[] = []
  const ds = depth / steps
  let integ = 0
  for (let i = 0; i <= steps; i++) {
    const s = i * ds
    const zm = measuredAt(col, s)
    if (i > 0) integ += F.a * Math.pow(Math.pow(10, zm / 10), F.b) * ds
    const den = 1 - 0.2 * Math.LN10 * F.b * integ
    out.push({ h: depth - s, zm, den, ze: den > 0 ? zm - (10 / F.b) * Math.log10(den) : NaN })
  }
  return out
}

/** How far the fitted power law misses the true k for this column (1 = exact). */
export function powerLawMismatch(col: BandColumn, band: Band): number {
  const F = hbFit()[band]
  return (F.a * Math.pow(Math.pow(10, col.Ze / 10), F.b)) / col.k
}
