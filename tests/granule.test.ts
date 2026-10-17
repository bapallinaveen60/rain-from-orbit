/*
 * The granule reader, against the bundled sample and (when present on this machine) a real
 * V07B 2A-Ku granule. Set GPM_GRANULE to a granule path to run the real-data checks.
 */
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  alongTrack,
  crossTrack,
  NBIN,
  NRAY,
  precipClass,
  readProfile,
  readSummary,
  type H5Source,
} from '../src/granule/reader'

const REAL =
  process.env.GPM_GRANULE ??
  'D:/1thesis/GPM/RS/V07/RADAR/2A-Ku/2023/08/20/2A.GPM.Ku.V9-20230112.20230820-S183436-E200708.053845.V07B.HDF5'

async function open(path: string): Promise<{ src: H5Source; close: () => void }> {
  const h5wasm = (await import('h5wasm/node')).default
  await h5wasm.ready
  const f = new h5wasm.File(path, 'r')
  return { src: f as unknown as H5Source, close: () => f.close() }
}

describe('precipClass', () => {
  it('decodes the leading digit of typePrecip', () => {
    expect(precipClass(10022000)).toBe('stratiform')
    expect(precipClass(20022000)).toBe('convective')
    expect(precipClass(30000000)).toBe('other')
    expect(precipClass(-1111)).toBe('none')
    expect(precipClass(0)).toBe('none')
  })
})

describe.skipIf(!existsSync(REAL))('real 2A-Ku granule', () => {
  it('reads the summary, a cross-track curtain, an along-track curtain and a profile', async () => {
    const { src, close } = await open(REAL)
    try {
      const s = readSummary(src, REAL.split('/').pop())
      expect(s.nscan).toBeGreaterThan(7000)
      expect(s.dual).toBe(false)
      expect(s.product).toMatch(/2A\.GPM\.Ku · orbit 053845 · V07B/)
      expect(s.start).toMatch(/^2023-08-20 18:3/)
      expect(s.maxRate).toBeGreaterThan(50)

      const x = crossTrack(src, s.maxScan)
      expect(x.ncol).toBe(NRAY)
      expect(x.z.length).toBe(NRAY * NBIN)
      // clutter-free bottom rises off nadir
      expect(x.cfb[0] - x.surface[0]).toBeGreaterThan(x.cfb[24] - x.surface[24])

      const a = alongTrack(src, s.maxRay, s.maxScan - 50, s.maxScan + 50)
      expect(a.ncol).toBe(100)

      const p = readProfile(src, s.maxScan, s.maxRay)
      expect(p.rateNearSurface).toBeCloseTo(s.maxRate, 3)
      expect(p.h.length).toBe(NBIN)
      // the clutter-free bottom sits a few hundred metres to ~2 km above the terrain
      expect(p.heightClutterFree - p.elevation).toBeGreaterThan(0.2)
      expect(p.heightClutterFree - p.elevation).toBeLessThan(2.5)
      expect(p.dm.some((v) => v > 0.5 && v < 4)).toBe(true)
      expect(p.epsilon.length).toBe(NBIN)
    } finally {
      close()
    }
  }, 120_000)
})

describe('bundled synthetic sample', () => {
  const SAMPLE = fileURLToPath(new URL('../public/data/sample-granule.h5', import.meta.url))
  it('follows the real layout: 1-based bins, missing values, typePrecip codes', async () => {
    const { src, close } = await open(SAMPLE)
    try {
      const s = readSummary(src, 'sample-granule.h5')
      expect(s.nscan).toBe(90)
      expect(s.dual).toBe(false)
      expect(s.rainyPixels).toBeGreaterThan(500)
      expect(new Set(s.klass)).toEqual(new Set([0, 1, 2]))
      const x = crossTrack(src, s.maxScan)
      expect(x.cfb[0] - x.surface[0]).toBeGreaterThan(x.cfb[24] - x.surface[24])
      const p = readProfile(src, s.maxScan, s.maxRay)
      expect(p.zFinal.some(Number.isNaN)).toBe(true)
      expect(p.heightZeroDeg).toBeCloseTo(4.6, 5)
      expect(Number.isFinite(p.heightClutterFree)).toBe(true)
    } finally {
      close()
    }
  })
})
