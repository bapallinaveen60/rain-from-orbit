import { cadd, cdiv, cscale, csub, cx, type Complex } from './complex'

/*
 * The ATBD melting-particle model as the book presents it in Ch6 (Details Parts 2–5).
 * Densities in g cm⁻³, diameters in mm, speeds in m s⁻¹.
 */

/** Air density, g cm⁻³. */
export const RHO_AIR = 0.0012
/** Solid ice density, g cm⁻³. */
export const RHO_ICE = 0.917
/**
 * Relative permittivity of ice. Not given in the book; a standard microwave value,
 * nearly frequency-independent from 10 to 40 GHz.
 */
export const EPS_ICE: Complex = { r: 3.17, i: 0.001 }

/** Bulk density of a mixed-phase particle from its melted volume fraction: ρ_b = √P_w. */
export const meltDensity = (Pw: number) => Math.sqrt(Pw)

/**
 * Mixing-rule shape parameter U, exactly as printed in the ATBD: it steps from 12.0 to
 * 2.0 across ρ_b = 0.09 (two regimes joined without a smooth transition).
 */
export function mixingU(rho: number): number {
  return rho <= 0.09 ? 12.0 : 2.0 * Math.exp(13 * (rho - 0.09))
}

/**
 * Effective permittivity of a water–ice–air mixture:
 * (ε_b − 1)/(ε_b + U) = P_w (ε_w − 1)/(ε_w + U) + P_i (ε_i − 1)/(ε_i + U).
 * @param Pw water volume fraction
 * @param Pi ice volume fraction (air fills the rest)
 */
export function mixedEps(epsW: Complex, Pw: number, Pi: number, U: number, epsI: Complex = EPS_ICE): Complex {
  const one = cx(1, 0)
  const term = (e: Complex, p: number) => cscale(cdiv(csub(e, one), cadd(e, cx(U, 0))), p)
  const A = cadd(term(epsW, Pw), term(epsI, Pi))
  // Solve (ε − 1)/(ε + U) = A  →  ε = (1 + U·A)/(1 − A)
  return cdiv(cadd(one, cscale(A, U)), csub(one, A))
}

/** Volume fractions for a particle with melted fraction Pw and ρ_b = √P_w (mass balance gives the ice). */
export function meltFractions(Pw: number): { rho: number; Pw: number; Pi: number; Pair: number } {
  const rho = meltDensity(Pw)
  const Pi = Math.max(0, (rho - Pw) / RHO_ICE)
  return { rho, Pw, Pi, Pair: Math.max(0, 1 - Pw - Pi) }
}

/** Diameter of a particle of density ρ_b holding the mass of a D_melt raindrop: D_b = D_melt · ρ_b^(−1/3). */
export const meltDiameter = (Dmelt: number, rho: number) => Dmelt * Math.pow(rho, -1 / 3)

/** Raindrop terminal speed, the same v = 3.78 D^0.67 used for rain rate. */
export const rainSpeed = (D: number) => 3.78 * Math.pow(D, 0.67)

/**
 * Fall speed of a melting particle in the ATBD's three density regimes.
 * The third regime is printed only as "interpolate to the raindrop speed"; here it is linear
 * in ρ_b between the 0.30 regime's speed (for this particle) and the raindrop speed at D_b,
 * which reproduces the book's table to within 0.01 m s⁻¹.
 */
export function meltSpeed(Dmelt: number, rho: number): number {
  const Db = meltDiameter(Dmelt, rho)
  if (rho <= 0.05) return 3.3 * Math.sqrt(rho - RHO_AIR)
  const snow = (r: number) => 8.8 * Math.sqrt(0.1 * meltDiameter(Dmelt, r) * (r - RHO_AIR))
  if (rho <= 0.3) return snow(rho)
  const t = (rho - 0.3) / 0.7
  return snow(0.3) + t * (rainSpeed(Db) - snow(0.3))
}

/**
 * N/N model (no breakup, no coalescence): number flux is conserved, so concentration
 * scales as V_R(D_melt) / V_b(D_b). Returns that ratio.
 */
export const concentrationRatio = (Dmelt: number, rho: number) => rainSpeed(Dmelt) / meltSpeed(Dmelt, rho)
