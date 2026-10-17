/*
 * Reads a GPM Level-2 radar granule (2A.GPM.Ku, 2A.GPM.Ka or 2A.GPM.DPR, V07, full swath "FS")
 * through any HDF5 backend that can slice datasets — h5wasm in the browser worker, h5wasm/node
 * in tests. Only the slices needed for the current view are read, so a 600 MB granule is fine.
 *
 * Conventions verified against a real V07B 2A-Ku granule:
 *  - bin numbers (binRealSurface, binClutterFreeBottom, binStormTop, …) are 1-based, so the
 *    array index is bin − 1 (reading them 0-based puts the surface one bin, 125 m, too low);
 *  - PRE/height gives every bin's height in metres, slant path already accounted for;
 *  - missing values are large negatives (−9999.9, −1111.1): anything below −1000 is "no data";
 *  - typePrecip is an 8-digit code whose leading digit is the class (1 strat, 2 conv, 3 other);
 *  - in 2A.DPR some fields carry a trailing frequency axis of 2 (Ku, Ka); paramDSD's trailing
 *    axis is (Nw as 10·log10, Dm in mm).
 */

/** Minimal view of an HDF5 dataset. */
export interface H5Dataset {
  shape: number[] | null
  slice(ranges: ([number, number] | [])[]): ArrayLike<number | bigint> | null
}
/** Minimal view of an open HDF5 file. */
export interface H5Source {
  get(path: string): H5Dataset | null
}

export const NRAY = 49
export const NBIN = 176
export const MISSING = -1000

export type PrecipClass = 'stratiform' | 'convective' | 'other' | 'none'

export function precipClass(typePrecip: number): PrecipClass {
  if (!(typePrecip > 0)) return 'none'
  const major = Math.floor(typePrecip / 1e7)
  return major === 1 ? 'stratiform' : major === 2 ? 'convective' : 'other'
}

const clean = (v: number) => (v > MISSING ? v : NaN)

function ds(src: H5Source, path: string): H5Dataset {
  const d = src.get('FS/' + path)
  if (!d) throw new Error(`This file has no FS/${path} — is it a V07 2A radar granule?`)
  return d
}
const tryDs = (src: H5Source, path: string) => {
  try {
    return src.get('FS/' + path)
  } catch {
    return null
  }
}

/** Read a slice into a Float32Array, with missing values as NaN. */
function read(d: H5Dataset, ranges: ([number, number] | [])[]): Float32Array {
  const raw = d.slice(ranges)
  const out = new Float32Array(raw ? raw.length : 0)
  if (raw) for (let i = 0; i < raw.length; i++) out[i] = clean(Number(raw[i]))
  return out
}

/** Index of the Ku (or Ka) layer if the dataset has a trailing frequency axis, else null. */
function freqAxis(d: H5Dataset, rank3: number): boolean {
  return (d.shape?.length ?? 0) > rank3
}

export type Band = 'ku' | 'ka'

export interface GranuleSummary {
  product: string
  nscan: number
  /** Dual-frequency product (has a Ka layer). */
  dual: boolean
  start: string
  end: string
  lat: Float32Array
  lon: Float32Array
  /** Near-surface rain rate, mm/h (NaN missing), nscan × 49. */
  rate: Float32Array
  /** Precip class per pixel: 0 none, 1 strat, 2 conv, 3 other. */
  klass: Uint8Array
  rainyPixels: number
  maxRate: number
  /** Scan of the heaviest rain, a good place to start. */
  maxScan: number
  maxRay: number
}

function timeAt(src: H5Source, s: number): string {
  const v = (k: string) => Number(ds(src, 'ScanTime/' + k).slice([[s, s + 1]])![0])
  const p = (n: number) => String(n).padStart(2, '0')
  return `${v('Year')}-${p(v('Month'))}-${p(v('DayOfMonth'))} ${p(v('Hour'))}:${p(v('Minute'))}:${p(v('Second'))} UTC`
}

export function readSummary(src: H5Source, fileName = ''): GranuleSummary {
  const latD = ds(src, 'Latitude')
  const nscan = latD.shape![0]
  const all: ([number, number] | [])[] = [[0, nscan], []]
  const lat = read(latD, all)
  const lon = read(ds(src, 'Longitude'), all)
  const rate = read(ds(src, 'SLV/precipRateNearSurface'), all)
  const tp = ds(src, 'CSF/typePrecip').slice(all)!
  const klass = new Uint8Array(tp.length)
  let rainy = 0
  let maxRate = 0
  let maxIdx = 0
  for (let i = 0; i < tp.length; i++) {
    const c = precipClass(Number(tp[i]))
    klass[i] = c === 'stratiform' ? 1 : c === 'convective' ? 2 : c === 'other' ? 3 : 0
    if (rate[i] > 0) rainy++
    if (rate[i] > maxRate) {
      maxRate = rate[i]
      maxIdx = i
    }
  }
  const z = ds(src, 'SLV/zFactorFinal')
  const m = /2A\.GPM\.(Ku|Ka|DPR)\..*?\.(\d{8})-S(\d{6})-E(\d{6})\.(\d{6})\.(V\w+)/.exec(fileName)
  return {
    product: m ? `2A.GPM.${m[1]} · orbit ${m[5]} · ${m[6]}` : fileName || 'GPM Level-2 radar granule',
    nscan,
    dual: freqAxis(z, 3),
    start: timeAt(src, 0),
    end: timeAt(src, nscan - 1),
    lat,
    lon,
    rate,
    klass,
    rainyPixels: rainy,
    maxRate,
    maxScan: Math.floor(maxIdx / NRAY),
    maxRay: maxIdx % NRAY,
  }
}

/** A 2-D field of reflectivity with each bin's height, for a curtain. */
export interface Curtain {
  /** Number of columns (rays across track, or scans along track). */
  ncol: number
  /** Final (attenuation-corrected) reflectivity, dBZ, ncol × 176 (NaN missing). */
  z: Float32Array
  /** Bin heights above the ellipsoid, km, ncol × 176. */
  h: Float32Array
  /** Height of the clutter-free bottom per column, km. */
  cfb: Float32Array
  /** Surface elevation per column, km. */
  surface: Float32Array
  /** First column's scan and ray, and the direction of travel. */
  scan0: number
  ray0: number
  along: boolean
}

function curtain(src: H5Source, ranges: [[number, number], [number, number]], along: boolean, band: Band): Curtain {
  const [sr, rr] = ranges
  const ncol = along ? sr[1] - sr[0] : rr[1] - rr[0]
  const zD = ds(src, 'SLV/zFactorFinal')
  const dual = freqAxis(zD, 3)
  const zAll = read(zD, dual ? [sr, rr, [], band === 'ka' ? [1, 2] : [0, 1]] : [sr, rr, []])
  const h = read(ds(src, 'PRE/height'), [sr, rr, []]).map((v) => v / 1000)
  const cfbD = ds(src, 'PRE/binClutterFreeBottom')
  const cfbBin = read(cfbD, freqAxis(cfbD, 2) ? [sr, rr, band === 'ka' ? [1, 2] : [0, 1]] : [sr, rr])
  const elev = read(ds(src, 'PRE/elevation'), [sr, rr])
  const cfb = new Float32Array(ncol)
  for (let c = 0; c < ncol; c++) {
    const b = cfbBin[c]
    cfb[c] = b >= 1 && b <= NBIN ? h[c * NBIN + b - 1] : NaN
  }
  return {
    ncol,
    z: zAll,
    h,
    cfb,
    surface: elev.map((v) => (Number.isFinite(v) ? v / 1000 : 0)),
    scan0: sr[0],
    ray0: rr[0],
    along,
  }
}

/** All 49 rays of one scan: the across-track curtain (Chapter 3's view, from real data). */
export const crossTrack = (src: H5Source, scan: number, band: Band = 'ku') =>
  curtain(
    src,
    [
      [scan, scan + 1],
      [0, NRAY],
    ],
    false,
    band,
  )

/** One ray over a run of scans: the along-track curtain. */
export function alongTrack(src: H5Source, ray: number, s0: number, s1: number, band: Band = 'ku') {
  return curtain(
    src,
    [
      [s0, s1],
      [ray, ray + 1],
    ],
    true,
    band,
  )
}

export interface Profile {
  scan: number
  ray: number
  lat: number
  lon: number
  /** Heights, km. */
  h: Float32Array
  zMeasured: Float32Array
  zFinal: Float32Array
  /** Rain rate, mm/h. */
  rate: Float32Array
  /** Solver ε per bin (V07), or empty if absent. */
  epsilon: Float32Array
  /** paramDSD: Nw as 10·log10(Nw) and Dm in mm, per bin. */
  nwDb: Float32Array
  dm: Float32Array
  klass: PrecipClass
  typePrecip: number
  /** km, NaN when absent. */
  heightStormTop: number
  heightZeroDeg: number
  heightBB: number
  heightClutterFree: number
  elevation: number
  flagBB: number
  flagShallowRain: number
  localZenithAngle: number
  piaFinal: number
  pathAtten: number
  rateNearSurface: number
  zNearSurface: number
}

export function readProfile(src: H5Source, scan: number, ray: number, band: Band = 'ku'): Profile {
  const px: [[number, number], [number, number]] = [
    [scan, scan + 1],
    [ray, ray + 1],
  ]
  const one = (p: string, pick = 0) => {
    const d = tryDs(src, p)
    if (!d) return NaN
    const extra = (d.shape?.length ?? 2) > 2 ? [[pick, pick + 1] as [number, number]] : []
    return read(d, [...px, ...extra])[0]
  }
  const prof = (p: string, layer?: number) => {
    const d = tryDs(src, p)
    if (!d) return new Float32Array(0)
    const extra = (d.shape?.length ?? 3) > 3 ? [[layer ?? 0, (layer ?? 0) + 1] as [number, number]] : []
    return read(d, [...px, [], ...extra])
  }
  const bandIdx = band === 'ka' ? 1 : 0
  const h = prof('PRE/height').map((v) => v / 1000)
  const cfbBin = one('PRE/binClutterFreeBottom', bandIdx)
  const typePrecip = one('CSF/typePrecip')
  const km = (v: number) => (v > 0 ? v / 1000 : NaN)
  return {
    scan,
    ray,
    lat: one('Latitude'),
    lon: one('Longitude'),
    h,
    zMeasured: prof('PRE/zFactorMeasured', bandIdx),
    zFinal: prof('SLV/zFactorFinal', bandIdx),
    rate: prof('SLV/precipRate'),
    epsilon: prof('SLV/epsilon'),
    nwDb: prof('SLV/paramDSD', 0),
    dm: prof('SLV/paramDSD', 1),
    klass: precipClass(typePrecip),
    typePrecip,
    heightStormTop: km(one('PRE/heightStormTop', bandIdx)),
    heightZeroDeg: km(one('VER/heightZeroDeg')),
    heightBB: km(one('CSF/heightBB')),
    heightClutterFree: cfbBin >= 1 && cfbBin <= NBIN ? h[cfbBin - 1] : NaN,
    elevation: one('PRE/elevation') / 1000,
    flagBB: one('CSF/flagBB'),
    flagShallowRain: one('CSF/flagShallowRain'),
    localZenithAngle: one('PRE/localZenithAngle'),
    piaFinal: one('SLV/piaFinal', bandIdx),
    pathAtten: one('SRT/pathAtten', bandIdx),
    rateNearSurface: one('SLV/precipRateNearSurface'),
    zNearSurface: one('SLV/zFactorFinalNearSurface', bandIdx),
  }
}
