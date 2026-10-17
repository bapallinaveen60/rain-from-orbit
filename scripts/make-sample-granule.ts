// Writes public/data/sample-granule.h5: a SYNTHETIC granule in the real V07 2A-Ku layout
// (group FS, the same dataset names, shapes, 1-based bins and missing values), built from the
// book's storm scenes so the explorer can be tried without downloading real data.
// Run: node scripts/make-sample-granule.ts   (Node ≥ 23 strips the types)
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import h5wasm from 'h5wasm/node'
import { buildScene, NZ, ZTOP, type SceneKind } from '../src/physics/scan.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'public/data/sample-granule.h5')
mkdirSync(dirname(out), { recursive: true })

const NS = 90
const NR = 49
const NB = 176
const MISS = -9999.9
const T0 = 4.6 // freezing level, km

// Along-track: stratiform deck → squall line → shallow orographic rain.
const kindAt = (s: number): SceneKind => (s < 30 ? 'strat' : s < 62 ? 'squall' : 'shallow')
const scenes = { strat: buildScene('strat'), squall: buildScene('squall'), shallow: buildScene('shallow') }
/** Smooth along-track envelope so each storm grows and decays. */
const env = (s: number) => {
  const [a, b] = s < 30 ? [0, 30] : s < 62 ? [30, 62] : [62, NS]
  return Math.sin((Math.PI * (s - a + 0.5)) / (b - a))
}

/** Synthetic reflectivity (dBZ) at height h for scan s, ray r, from the 96-level scene grid. */
function zAt(s: number, r: number, h: number): number {
  if (h < 0 || h > ZTOP) return NaN
  const col = scenes[kindAt(s)][r]
  const kf = (1 - h / ZTOP) * (NZ - 1)
  const k = Math.min(NZ - 2, Math.floor(kf))
  const v = col[k] + (col[k + 1] - col[k]) * (kf - k)
  const e = env(s)
  const dbz = v - (1 - e) * 25
  return dbz > 12 ? dbz : NaN
}

const f32 = (n: number) => new Float32Array(n).fill(MISS)
const zf = f32(NS * NR * NB)
const zm = f32(NS * NR * NB)
const hgt = new Float32Array(NS * NR * NB)
const rate = f32(NS * NR * NB)
const eps = f32(NS * NR * NB)
const dsd = f32(NS * NR * NB * 2)
const lat = new Float32Array(NS * NR)
const lon = new Float32Array(NS * NR)
const rateNS = new Float32Array(NS * NR)
const zNS = f32(NS * NR)
const type = new Int32Array(NS * NR).fill(-1111)
const flagBB = new Int32Array(NS * NR)
const heightBB = f32(NS * NR)
const shallow = new Int32Array(NS * NR)
const stormTop = f32(NS * NR)
const zeroDeg = new Float32Array(NS * NR).fill(T0 * 1000)
const cfb = new Int16Array(NS * NR)
const elev = new Float32Array(NS * NR)
const lza = new Float32Array(NS * NR)
const pia = f32(NS * NR)
const srt = f32(NS * NR)

for (let s = 0; s < NS; s++)
  for (let r = 0; r < NR; r++) {
    const p = s * NR + r
    // a track heading north-east over the Arabian Sea towards the Western Ghats
    lat[p] = 14 + s * 0.045 + (r - 24) * 0.02
    lon[p] = 70 + s * 0.02 - (r - 24) * 0.045
    const zen = Math.abs(r - 24) * (17 / 24) * 1.08
    lza[p] = zen
    elev[p] = s >= 62 ? 400 * Math.max(0, Math.sin(((r + s) / 20) * Math.PI)) : 0
    // bin heights: 125 m range bins, bin 176 at the ellipsoid, shortened by cos(zenith)
    for (let k = 0; k < NB; k++) hgt[p * NB + k] = (NB - 1 - k) * 125 * Math.cos((zen * Math.PI) / 180)
    // clutter-free bottom (1-based bin), higher off nadir — as in the curtain simulator
    const cfbKm = elev[p] / 1000 + 0.42 + 1.25 * Math.pow(Math.abs(r - 24) / 24, 1.35)
    let cb = NB
    for (let k = NB - 1; k >= 0; k--)
      if (hgt[p * NB + k] >= cfbKm * 1000) {
        cb = k + 1
        break
      }
    cfb[p] = cb

    let acc = 0
    let top = NaN
    let lowestZ = NaN
    let lowestR = 0
    for (let k = 0; k < NB; k++) {
      const i = p * NB + k
      const hkm = hgt[i] / 1000
      if (hkm < elev[p] / 1000) continue
      const z = zAt(s, r, hkm)
      if (!Number.isFinite(z)) continue
      if (!Number.isFinite(top)) top = hkm
      const liquid = hkm < T0 - 0.4
      const kdb = (liquid ? 2.8e-4 : 3e-5) * Math.pow(10, (0.75 * z) / 10) // Ku specific attenuation, dB/km
      acc += 2 * kdb * 0.125
      zf[i] = z
      zm[i] = z - acc
      if (k + 1 <= cb && liquid) {
        const R = Math.pow(Math.pow(10, z / 10) / 300, 1 / 1.4)
        const Dm = Math.min(3, 0.9 + 0.035 * (z - 20))
        rate[i] = R
        eps[i] = 1
        dsd[i * 2] = 10 * Math.log10(Math.max(1, Math.pow(10, z / 10) / (Math.pow(Dm, 7) * 2.2)))
        dsd[i * 2 + 1] = Dm
        lowestZ = z
        lowestR = R
      }
    }
    rateNS[p] = lowestR
    zNS[p] = Number.isFinite(lowestZ) ? lowestZ : MISS
    pia[p] = acc
    srt[p] = acc + 0.3 * Math.sin(p)
    if (Number.isFinite(top)) {
      stormTop[p] = top * 1000
      const kind = kindAt(s)
      type[p] =
        kind === 'strat'
          ? 10000000
          : kind === 'squall' && Math.abs(r - 24 + 4) < 8
            ? 20000000
            : kind === 'squall'
              ? 10000000
              : 20000000
      if (kind === 'strat' || (kind === 'squall' && r > 30)) {
        flagBB[p] = 1
        heightBB[p] = 4350
      }
      if (kind === 'shallow') shallow[p] = 10
    }
  }

await h5wasm.ready
const f = new h5wasm.File(out, 'w')
const fs = f.create_group('FS')
for (const g of ['ScanTime', 'PRE', 'VER', 'CSF', 'SRT', 'SLV']) fs.create_group(g)
const put = (name: string, data: ArrayLike<number> & { length: number }, shape: number[], dtype = '<f') =>
  fs.create_dataset({ name, data: data as Float32Array, shape, dtype, compression: 9, chunks: shape })
const S2 = [NS, NR]
const S3 = [NS, NR, NB]
put('Latitude', lat, S2)
put('Longitude', lon, S2)
const fill = (v: number) => new Int16Array(NS).fill(v)
put('ScanTime/Year', fill(2023), [NS], '<h')
put('ScanTime/Month', new Int8Array(NS).fill(8), [NS], '<b')
put('ScanTime/DayOfMonth', new Int8Array(NS).fill(20), [NS], '<b')
put('ScanTime/Hour', new Int8Array(NS).fill(18), [NS], '<b')
put(
  'ScanTime/Minute',
  Int8Array.from({ length: NS }, (_, s) => 40 + Math.floor((s * 0.6) / 60)),
  [NS],
  '<b',
)
put(
  'ScanTime/Second',
  Int8Array.from({ length: NS }, (_, s) => Math.floor((s * 0.6) % 60)),
  [NS],
  '<b',
)
put('PRE/height', hgt, S3)
put('PRE/zFactorMeasured', zm, S3)
put('PRE/binClutterFreeBottom', cfb, S2, '<h')
put('PRE/elevation', elev, S2)
put('PRE/localZenithAngle', lza, S2)
put('PRE/heightStormTop', stormTop, S2)
put('VER/heightZeroDeg', zeroDeg, S2)
put('CSF/typePrecip', type, S2, '<i')
put('CSF/flagBB', flagBB, S2, '<i')
put('CSF/heightBB', heightBB, S2)
put('CSF/flagShallowRain', shallow, S2, '<i')
put('SRT/pathAtten', srt, S2)
put('SLV/zFactorFinal', zf, S3)
put('SLV/precipRate', rate, S3)
put('SLV/epsilon', eps, S3)
put('SLV/paramDSD', dsd, [NS, NR, NB, 2])
put('SLV/precipRateNearSurface', rateNS, S2)
put('SLV/zFactorFinalNearSurface', zNS, S2)
put('SLV/piaFinal', pia, S2)
f.create_attribute('Note', 'SYNTHETIC sample for the Rain from Orbit explorer. Not real GPM data.')
f.close()
console.log('wrote public/data/sample-granule.h5')
