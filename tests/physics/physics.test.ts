/*
 * Physics checks against the claims the book makes in print.
 */
import { describe, expect, it } from 'vitest'
import {
  bandTable,
  buildChainRay,
  epsSweep,
  rdmRelation,
  solveBin,
  boxR,
  boxZ,
  BOX_A,
  concentrationRatio,
  csqrt,
  dB,
  diagnose,
  explainProfile,
  EXTRA_PROFILE_SPECS,
  buildProfile,
  dfrCurve,
  dfrOf,
  dfrSolutions,
  fallSpeed,
  hbConstrained,
  hbProfile,
  meltDensity,
  meltDiameter,
  meltSpeed,
  mie,
  mixingU,
  nwForZ,
  PROFILE_SPECS,
  rainColumn,
  Rrate,
  spellReadout,
  WET_SPELL,
  waterEps,
  Zray,
  zShares,
  type Band,
} from '../../src/physics'

describe('Ch2 — three drops in a box (by hand)', () => {
  it('Z = 794 mm⁶ m⁻³ = 29.0 dBZ', () => {
    expect(boxZ(BOX_A)).toBe(794)
    expect(dB(boxZ(BOX_A)).toFixed(1)).toBe('29.0')
  })
  it('the 3 mm drop makes 91.8 % of the echo', () => {
    expect((zShares(BOX_A)[2] * 100).toFixed(1)).toBe('91.8')
  })
  it('fall speeds 3.78 / 6.01 / 7.89 m/s and R = 0.50 mm/h', () => {
    expect(BOX_A.map((D) => fallSpeed(D).toFixed(2))).toEqual(['3.78', '6.01', '7.89'])
    expect(boxR(BOX_A).toFixed(2)).toBe('0.50')
  })
  it('3× wider: 729× the echo but only 56× the rain', () => {
    expect(3 ** 6).toBe(729)
    expect(Math.round((27 * fallSpeed(3)) / fallSpeed(1))).toBe(56)
  })
})

describe('Mie scattering', () => {
  it('matches the Rayleigh limit within 0.01 dB for small drops', () => {
    for (const b of ['ku', 'ka'] as Band[]) {
      const B = bandTable(b)
      const m = csqrt(waterEps(B.f, 10))
      for (const D of [0.05, 0.1, 0.2]) {
        const sb = mie(D, B.lam, m).sb
        // Rayleigh: σ_b = π⁵ |K|² D⁶ / λ⁴
        const ray = (Math.pow(Math.PI, 5) * B.K2 * Math.pow(D, 6)) / Math.pow(B.lam, 4)
        expect(Math.abs(dB(sb) - dB(ray))).toBeLessThan(0.01)
      }
    }
  })
  it('Ka departs from Rayleigh well before Ku as drops grow', () => {
    const dev = (b: Band, D: number) => {
      const B = bandTable(b)
      const sb = mie(D, B.lam, csqrt(waterEps(B.f, 10))).sb
      return Math.abs(dB(sb) - dB((Math.pow(Math.PI, 5) * B.K2 * D ** 6) / B.lam ** 4))
    }
    expect(dev('ka', 2)).toBeGreaterThan(5 * dev('ku', 2))
  })
})

describe('gamma DSD', () => {
  it('nwForZ inverts Zray', () => {
    for (const Dm of [0.5, 1.5, 2.72]) {
      expect(dB(Zray(Dm, nwForZ(29, Dm, 3), 3))).toBeCloseTo(29, 10)
    }
  })
  it('Box A and Box B: same 29 dBZ, rain rates an order of magnitude apart', () => {
    const rA = Rrate(2.72, nwForZ(29, 2.72, 3), 3)
    const rB = Rrate(1.0, nwForZ(29, 1.0, 3), 3)
    expect(rB / rA).toBeGreaterThan(5)
  })
})

describe('Ch5 — DFR', () => {
  it('has a trough below zero and two Dm solutions there (μ = 3)', () => {
    const c = dfrCurve(3)
    const min = Math.min(...c.map((p) => p[1]))
    expect(min).toBeLessThan(0)
    expect(dfrSolutions(c, min / 2).length).toBe(2)
  })
  it('grows monotonically once drops are large', () => {
    const c = dfrCurve(3).filter((p) => p[0] >= 1.5)
    for (let i = 1; i < c.length; i++) expect(c[i][1]).toBeGreaterThan(c[i - 1][1])
  })
  it('counts a crossing that lands exactly on a sample once', () => {
    const c = dfrCurve(3)
    for (const Dm of [2.2, 3.0, 1.52]) expect(dfrSolutions(c, dfrOf(Dm, 3))).toHaveLength(1)
    expect(dfrSolutions(c, dfrOf(2.2, 3))[0]).toBeCloseTo(2.2, 10)
  })
})

describe('Ch4 — attenuation', () => {
  it('Ka attenuates far more than Ku', () => {
    const col = rainColumn({ R: 10, depth: 4, Dm: 1.5 })
    expect(col.ka.pia).toBeGreaterThan(5 * col.ku.pia)
  })
  it('Hitschfeld–Bordan blows up in heavy, deep rain', () => {
    const light = rainColumn({ R: 2, depth: 3, Dm: 1.2 })
    const heavy = rainColumn({ R: 100, depth: 6, Dm: 2.2 })
    expect(hbProfile(light.ku, 'ku', 3, 60).at(-1)!.den).toBeGreaterThan(0.5)
    expect(hbProfile(heavy.ku, 'ku', 6, 60).at(-1)!.den).toBeLessThan(0.25)
  })
})

describe('Ch6 — melting model as printed', () => {
  it('ρ_b = √P_w table: 0.10 / 0.50 / 0.80 / 1.00', () => {
    expect([0.01, 0.25, 0.64, 1].map((p) => meltDensity(p).toFixed(2))).toEqual(['0.10', '0.50', '0.80', '1.00'])
  })
  it('U steps from 12.0 to 2.0 across ρ_b = 0.09 (the quirk is preserved)', () => {
    expect(mixingU(0.09)).toBe(12)
    expect(mixingU(0.0900001)).toBeCloseTo(2.0, 4)
  })
  it('one particle melting to a 1 mm drop: D_b and V_b table', () => {
    const rows: [number, string, string][] = [
      [0.05, '2.71', '0.73'],
      [0.1, '2.15', '1.28'],
      [0.3, '1.49', '1.86'],
      [1.0, '1.00', '3.78'],
    ]
    for (const [rho, D, V] of rows) {
      expect(meltDiameter(1, rho).toFixed(2)).toBe(D)
      expect(meltSpeed(1, rho).toFixed(2)).toBe(V)
    }
    // ρ = 0.50: printed 2.58 m/s; "interpolate" is not specified exactly
    expect(Math.abs(meltSpeed(1, 0.5) - 2.58)).toBeLessThan(0.015)
  })
  it('N/N model: a raindrop is ~5× sparser than the loose aggregate it came from', () => {
    expect(concentrationRatio(1, 0.05)).toBeGreaterThan(4.5)
  })
})

describe('Ch6 — classify diagnostics', () => {
  it('only the stratiform profiles show a bright band', () => {
    const d = PROFILE_SPECS.map((s) => diagnose(buildProfile(s)))
    PROFILE_SPECS.forEach((s, i) => expect(d[i].bb !== null).toBe(s.a === 'strat'))
  })
})

describe('Ch8 — monsoon', () => {
  it('a fixed Z–R relation misreads the wet spell', () => {
    expect(Math.abs(spellReadout(WET_SPELL).errPct)).toBeGreaterThan(0)
  })
})

describe('Ch7 — teaching Solver', () => {
  it('a solution on the R–Dm plane reproduces the bin reflectivity', () => {
    const s = solveBin(36.5, 1.7)
    expect(dB(Zray(s.Dm, s.logNw, 3))).toBeCloseTo(36.5, 8)
    expect(s.R).toBeCloseTo(rdmRelation(s.Dm, 1.7), 10)
  })
  it('with a perfect SRT the ε sweep lands within 0.1 dB of the true PIA', () => {
    const ray = buildChainRay()
    const t = epsSweep(ray, 0).truthPia
    expect(Math.abs(epsSweep(ray, t).best.pia - t)).toBeLessThan(0.1)
  })
  it('a biased SRT drags ε with it', () => {
    const ray = buildChainRay()
    const t = epsSweep(ray, 0).truthPia
    expect(epsSweep(ray, t + 1).best.eps).toBeGreaterThan(epsSweep(ray, t).best.eps)
    expect(epsSweep(ray, t - 1).best.eps).toBeLessThan(epsSweep(ray, t).best.eps)
  })
})

describe('Ch4 — HB constrained by the SRT', () => {
  it('leaves only the calibration offset, however heavy the rain', () => {
    for (const [R, d, Dm] of [
      [10, 4, 1.5],
      [80, 6, 2],
    ]) {
      const m = rainColumn({ R, depth: d, Dm })
      for (const cal of [-1, 0, 1]) {
        const ze = hbConstrained(m.ku, 'ku', d, 60, m.ku.pia, cal).profile.at(-1)!.ze
        expect(ze - m.ku.Ze).toBeCloseTo(cal, 6)
      }
    }
  })
  it('while plain HB goes badly wrong in heavy rain', () => {
    const m = rainColumn({ R: 80, depth: 6, Dm: 2 })
    expect(Math.abs(hbProfile(m.ku, 'ku', 6, 60).at(-1)!.ze - m.ku.Ze)).toBeGreaterThan(10)
  })
})

describe('Ch6 — extra classify profiles', () => {
  it('each shows the evidence its class needs', () => {
    for (const s of EXTRA_PROFILE_SPECS) {
      const P = buildProfile(s)
      const d = diagnose(P)
      expect(d.bb !== null).toBe(s.a === 'strat')
      if (s.a === 'conv') expect(d.top).toBeGreaterThan(10)
      if (s.a === 'shallow') expect(d.top).toBeLessThan(s.t0)
      if (s.a === 'snow') expect(d.zmax).toBeLessThan(25)
      expect(explainProfile(P, d)).not.toMatch(/undefined|NaN/)
    }
  })
})
