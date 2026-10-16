/** Reflectivity colour scale: [dBZ, colour] stops, interpolated linearly in RGB. */
export const DBZ_STOPS: [number, string][] = [
  [10, '#2d4a78'],
  [16, '#2b78ab'],
  [22, '#259a7c'],
  [28, '#74b845'],
  [34, '#ddbb33'],
  [40, '#e38539'],
  [46, '#d24733'],
  [52, '#a32c5e'],
  [58, '#6e399c'],
]

const hx = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

/** CSS colour for a reflectivity, or null below the lowest stop (no echo). */
export function dbzColor(v: number): string | null {
  if (v < DBZ_STOPS[0][0]) return null
  for (let i = 0; i < DBZ_STOPS.length - 1; i++) {
    if (v < DBZ_STOPS[i + 1][0]) {
      const t = (v - DBZ_STOPS[i][0]) / (DBZ_STOPS[i + 1][0] - DBZ_STOPS[i][0])
      const a = hx(DBZ_STOPS[i][1])
      const b = hx(DBZ_STOPS[i + 1][1])
      const c = (k: number) => Math.round(a[k] + (b[k] - a[k]) * t)
      return `rgb(${c(0)},${c(1)},${c(2)})`
    }
  }
  return DBZ_STOPS[DBZ_STOPS.length - 1][1]
}
