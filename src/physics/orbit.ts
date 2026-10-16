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
