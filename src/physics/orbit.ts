/** [longitude, latitude] in degrees. */
export type LonLat = [number, number]

/** GPM Core: 65° inclination, 92.7 min period (pre-boost, 407 km). */
export const INCLINATION = (65 * Math.PI) / 180
export const PERIOD_S = 92.7 * 60
/** Earth rotation rate, rad s⁻¹ (sidereal day). */
export const EARTH_RATE = (2 * Math.PI) / 86164
/** Half-swath widths as great-circle degrees. */
export const HALF_SWATH_DPR = 1.1
export const HALF_SWATH_GMI = 4.06

/** Sub-satellite point `tsec` seconds after the reference epoch (circular orbit). */
export function track(tsec: number, period = PERIOD_S): LonLat {
  const u = (2 * Math.PI * tsec) / period
  const lat = Math.asin(Math.sin(INCLINATION) * Math.sin(u))
  let lon = Math.atan2(Math.cos(INCLINATION) * Math.sin(u), Math.cos(u)) - EARTH_RATE * tsec + 1.4
  lon = ((((lon + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI]
}

/** The point `dDeg` great-circle degrees from p, perpendicular to the heading p → q. */
export function offset(p: LonLat, q: LonLat, dDeg: number): LonLat {
  const R = Math.PI / 180
  const l1 = p[1] * R
  const n1 = p[0] * R
  const l2 = q[1] * R
  const n2 = q[0] * R
  const y = Math.sin(n2 - n1) * Math.cos(l2)
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(n2 - n1)
  const brg = Math.atan2(y, x) + Math.PI / 2
  const d = dDeg * R
  const la = Math.asin(Math.sin(l1) * Math.cos(d) + Math.cos(l1) * Math.sin(d) * Math.cos(brg))
  const lo = n1 + Math.atan2(Math.sin(brg) * Math.sin(d) * Math.cos(l1), Math.cos(d) - Math.sin(l1) * Math.sin(la))
  return [((lo / R + 540) % 360) - 180, la / R]
}

/** Ground track sampled every `step` seconds from 0 to `tEnd`. */
export function groundTrack(tEnd: number, step = 20, period = PERIOD_S): LonLat[] {
  const pts: LonLat[] = []
  for (let t = 0; t <= tEnd; t += step) pts.push(track(t, period))
  return pts
}

/** Circular-orbit period from altitude (km), for the 407 → 442 km boost comparison. */
export function periodForAltitude(altKm: number): number {
  const MU = 398600.4418 // km³ s⁻²
  const a = 6371 + altKm
  return 2 * Math.PI * Math.sqrt((a * a * a) / MU)
}

/** Altitudes before and after the November 2023 orbit boost, km. */
export const ALT_BEFORE = 407
export const ALT_AFTER = 442

/**
 * Period at an altitude, scaled from the book's 92.7 min at 407 km by Kepler's third law
 * (so the 407 km case is exactly the original simulator's).
 */
export const periodAt = (altKm: number) => PERIOD_S * Math.pow((6371 + altKm) / (6371 + ALT_BEFORE), 1.5)

/** A fixed scan angle sweeps a wider swath from higher up: half-swath scales with altitude. */
export const halfSwathAt = (halfSwath: number, altKm: number) => (halfSwath * altKm) / ALT_BEFORE

/** Great-circle distance between two points, degrees. */
export function greatCircleDeg(a: LonLat, b: LonLat): number {
  const R = Math.PI / 180
  const s =
    Math.sin(a[1] * R) * Math.sin(b[1] * R) + Math.cos(a[1] * R) * Math.cos(b[1] * R) * Math.cos((a[0] - b[0]) * R)
  return Math.acos(Math.min(1, Math.max(-1, s))) / R
}

/**
 * Times (s) at which the swath passes over `place` within `tEnd` seconds: one entry per
 * pass, at its closest approach. Sampled every 5 s (≈ 35 km along track).
 */
export function passTimes(place: LonLat, halfSwath: number, tEnd = 86400, period = PERIOD_S): number[] {
  const out: number[] = []
  let inPass = false
  let bestT = 0
  let bestD = Infinity
  for (let t = 0; t <= tEnd; t += 5) {
    const d = greatCircleDeg(track(t, period), place)
    if (d <= halfSwath) {
      if (!inPass || d < bestD) {
        bestD = d
        bestT = t
      }
      inPass = true
    } else if (inPass) {
      out.push(bestT)
      inPass = false
      bestD = Infinity
    }
  }
  if (inPass) out.push(bestT)
  return out
}

/** Longest stretch without a pass in [0, tEnd], hours. */
export function longestGapHours(times: number[], tEnd = 86400): number {
  const pts = [0, ...times, tEnd]
  let gap = 0
  for (let i = 1; i < pts.length; i++) gap = Math.max(gap, pts[i] - pts[i - 1])
  return gap / 3600
}
