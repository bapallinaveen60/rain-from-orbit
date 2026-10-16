import { cabs2, cadd, cdiv, cmul, cscale, csqrt, csub, cx, type Complex } from './complex'
import { Ksq, waterEps } from './permittivity'

export interface MieResult {
  /** Backscattering cross-section, mm². */
  sb: number
  /** Extinction cross-section, mm². */
  se: number
}

/**
 * Mie scattering for a homogeneous sphere (Bohren–Huffman, downward recurrence for Dₙ).
 * @param D diameter, mm
 * @param lam wavelength, mm
 * @param m complex refractive index
 */
export function mie(D: number, lam: number, m: Complex): MieResult {
  const x = (Math.PI * D) / lam
  if (x < 1e-6) return { sb: 0, se: 0 }
  const y = cmul(cx(x, 0), m)
  const ymag = Math.sqrt(cabs2(y))
  const nstop = Math.max(2, Math.round(x + 4 * Math.pow(x, 1 / 3) + 2))
  const nmx = Math.max(nstop, Math.round(ymag)) + 16

  const Dn: Complex[] = new Array(nmx + 1)
  Dn[nmx] = cx(0, 0)
  for (let n = nmx; n >= 1; n--) {
    const nn = cdiv(cx(n, 0), y)
    Dn[n - 1] = csub(nn, cdiv(cx(1, 0), cadd(Dn[n], nn)))
  }

  let psi0 = Math.cos(x)
  let psi1 = Math.sin(x)
  let chi0 = -Math.sin(x)
  let chi1 = Math.cos(x)
  let xi1 = cx(psi1, -chi1)
  let qextS = 0
  let sbR = 0
  let sbI = 0
  for (let k = 1; k <= nstop; k++) {
    const psi = ((2 * k - 1) / x) * psi1 - psi0
    const chi = ((2 * k - 1) / x) * chi1 - chi0
    const xi = cx(psi, -chi)
    const kx = cx(k / x, 0)
    const ta = cadd(cdiv(Dn[k], m), kx)
    const tb = cadd(cmul(Dn[k], m), kx)
    const an = cdiv(csub(cscale(ta, psi), cx(psi1, 0)), csub(cmul(ta, xi), xi1))
    const bn = cdiv(csub(cscale(tb, psi), cx(psi1, 0)), csub(cmul(tb, xi), xi1))
    const w = 2 * k + 1
    qextS += w * (an.r + bn.r)
    const sgn = k % 2 === 0 ? 1 : -1
    sbR += w * sgn * (an.r - bn.r)
    sbI += w * sgn * (an.i - bn.i)
    psi0 = psi1
    psi1 = psi
    chi0 = chi1
    chi1 = chi
    xi1 = cx(psi1, -chi1)
  }
  const a = D / 2
  const qext = (2 / (x * x)) * qextS
  return { sb: ((lam * lam) / (4 * Math.PI)) * (sbR * sbR + sbI * sbI), se: qext * Math.PI * a * a }
}

/* ---- scattering tables over a fixed diameter grid ---- */

export const DMIN = 0.05
export const DMAX = 8.0
export const DSTEP = 0.05
export const NG = Math.round((DMAX - DMIN) / DSTEP) + 1
export const Dgrid = Float64Array.from({ length: NG }, (_, i) => DMIN + i * DSTEP)

export type Band = 'ku' | 'ka'

export const BAND_FREQ: Record<Band, number> = { ku: 13.6, ka: 35.5 }

export interface BandTable {
  f: number
  /** Wavelength, mm. */
  lam: number
  /** |K_w|² at 10 °C. */
  K2: number
  /** Radar constant λ⁴ / (π⁵ |K|²), turns Σσ_b N into Ze. */
  zc: number
  sb: Float64Array
  se: Float64Array
}

export function buildBandTable(band: Band): BandTable {
  const f = BAND_FREQ[band]
  const lam = 299.792458 / f
  const eps = waterEps(f, 10)
  const m = csqrt(eps)
  const K2 = Ksq(eps)
  const sb = new Float64Array(NG)
  const se = new Float64Array(NG)
  for (let i = 0; i < NG; i++) {
    const r = mie(Dgrid[i], lam, m)
    sb[i] = r.sb
    se[i] = r.se
  }
  return { f, lam, K2, sb, se, zc: Math.pow(lam, 4) / (Math.pow(Math.PI, 5) * K2) }
}

const tables: Partial<Record<Band, BandTable>> = {}

/** Scattering table for a band, built on first use (~1 ms each) and cached. */
export function bandTable(band: Band): BandTable {
  return (tables[band] ??= buildBandTable(band))
}

/** Install tables computed elsewhere (e.g. in the physics worker). */
export function setBandTable(band: Band, t: BandTable) {
  tables[band] = t
}
