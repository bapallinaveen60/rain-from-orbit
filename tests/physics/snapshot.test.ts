/*
 * Snapshot parity: every number here was produced by the ORIGINAL code in
 * web/Rain from Orbit.html (see scripts/capture-reference.mjs). The port must match it.
 */
import { describe, expect, it } from 'vitest'
import {
  bandTable,
  buildChainRay,
  buildProfile,
  angleOf,
  clutterFreeBottom,
  csqrt,
  dbzColor,
  dfrOf,
  fmu,
  hbFit,
  Ksq,
  lgamma,
  LWC,
  mie,
  mieZK,
  nd,
  nwForR,
  nwForZ,
  offset,
  PROFILE_SPECS,
  Rrate,
  scene,
  track,
  waterEps,
  Zray,
  type Band,
  type LonLat,
  type SceneKind,
} from '../../src/physics'
import ref from './reference.json'

/** Reference values were rounded to 12 significant figures. */
function close(actual: number, expected: number | null, rel = 1e-10) {
  if (expected === null) {
    // JSON stores NaN/±Infinity as null
    expect(Number.isFinite(actual)).toBe(false)
    return
  }
  const tol = Math.max(Math.abs(expected) * rel, 1e-300)
  expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThanOrEqual(tol)
}
const closeAll = (a: ArrayLike<number>, e: (number | null)[]) => {
  expect(a.length).toBe(e.length)
  for (let i = 0; i < e.length; i++) close(a[i], e[i])
}

describe('parity with the original book code', () => {
  it('lgamma', () => {
    for (const [z, v] of ref.lgamma) close(lgamma(z), v)
  })

  it('water permittivity and |K|²', () => {
    for (const [f, T, er, ei, k2] of ref.waterEps) {
      const e = waterEps(f, T)
      close(e.r, er)
      close(e.i, ei)
      close(Ksq(e), k2)
    }
  })

  it('Mie cross-sections', () => {
    for (const [b, D, sb, se] of ref.mie as [Band, number, number, number][]) {
      const B = bandTable(b)
      const r = mie(D, B.lam, csqrt(waterEps(B.f, 10)))
      close(r.sb, sb)
      close(r.se, se)
    }
  })

  it('scattering tables', () => {
    for (const b of ['ku', 'ka'] as Band[]) {
      const B = bandTable(b)
      const R = ref.bands[b]
      close(B.lam, R.lam)
      close(B.K2, R.K2)
      close(B.zc, R.zc)
      closeAll(B.sb, R.sb)
      closeAll(B.se, R.se)
    }
  })

  it('gamma DSD moments', () => {
    for (const [Dm, nw, mu, Z, R, W, n12, f] of ref.dsd) {
      close(Zray(Dm, nw, mu), Z)
      close(Rrate(Dm, nw, mu), R)
      close(LWC(Dm, nw, mu), W)
      close(nd(1.2, Dm, nw, mu), n12)
      close(fmu(mu), f)
    }
  })

  it('Nw solvers', () => {
    for (const [Dm, mu, nz, nr] of ref.nwFor) {
      close(nwForZ(29, Dm, mu), nz)
      close(nwForR(10, Dm, mu), nr)
    }
  })

  it('Mie Ze and k integrals', () => {
    for (const [b, Dm, mu, Ze, k] of ref.mieZK as [Band, number, number, number, number][]) {
      const r = mieZK(b, Dm, 4, mu)
      close(r.Ze, Ze)
      close(r.k, k)
    }
  })

  it('DFR', () => {
    for (const [Dm, mu, v] of ref.dfr) close(dfrOf(Dm, mu), v)
  })

  it('Hitschfeld–Bordan power-law fit', () => {
    const F = hbFit()
    close(F.ku.a, ref.hbfit.ku[0])
    close(F.ku.b, ref.hbfit.ku[1])
    close(F.ka.a, ref.hbfit.ka[0])
    close(F.ka.b, ref.hbfit.ka[1])
  })

  it('dBZ colour scale', () => {
    for (const [v, c] of ref.dbzColor as [number, string | null][]) expect(dbzColor(v)).toBe(c)
  })

  it('orbit ground track and swath offsets', () => {
    for (const [t, lon, lat] of ref.orbit.track) {
      const p = track(t)
      close(p[0], lon)
      close(p[1], lat)
    }
    for (const [p, q, d, lon, lat] of ref.orbit.offset as [LonLat, LonLat, number, number, number][]) {
      const o = offset(p, q, d)
      close(o[0], lon)
      close(o[1], lat)
    }
  })

  it('scan geometry and curtain scenes', () => {
    for (const [b, a] of ref.scan.angOf) close(angleOf(b), a)
    for (const [b, c] of ref.scan.cfbOf) close(clutterFreeBottom(b), c)
    for (const [k, cols] of Object.entries(ref.scan.scenes) as [SceneKind, [number, number[]][]][]) {
      for (const [b, col] of cols) closeAll(scene(k)[b], col)
    }
  })

  it('classify profiles', () => {
    ref.classify.forEach((R, i) => {
      const P = buildProfile(PROFILE_SPECS[i])
      expect(P.spec.a).toBe(R.a)
      closeAll(P.ku, R.ku)
      closeAll(P.ka, R.ka)
    })
  })

  it('Level-2 chain ray', () => {
    const P = buildChainRay()
    closeAll(P.zm, ref.pipeline.zm)
    closeAll(P.ze, ref.pipeline.ze)
    closeAll(P.rr, ref.pipeline.rr)
  })
})
