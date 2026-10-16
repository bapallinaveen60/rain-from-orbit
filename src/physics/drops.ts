/*
 * The by-hand arithmetic of Ch2: a box of individual drops (diameters in mm) in one cubic metre.
 */

/** Raindrop terminal speed, m s⁻¹: v(D) = 3.78 D^0.67. */
export const fallSpeed = (D: number) => 3.78 * Math.pow(D, 0.67)

/** Rayleigh reflectivity Z = Σ D⁶, mm⁶ m⁻³. */
export const boxZ = (diams: number[]) => diams.reduce((s, D) => s + Math.pow(D, 6), 0)

/** Rain rate R = 6π × 10⁻⁴ Σ D³ v(D), mm h⁻¹. */
export const boxR = (diams: number[]) => 6 * Math.PI * 1e-4 * diams.reduce((s, D) => s + D ** 3 * fallSpeed(D), 0)

/** Each drop's share of Z, 0–1. */
export function zShares(diams: number[]): number[] {
  const Z = boxZ(diams)
  return diams.map((D) => Math.pow(D, 6) / Z)
}

/** Box A from the book: three drops of 1, 2 and 3 mm. */
export const BOX_A = [1, 2, 3]
