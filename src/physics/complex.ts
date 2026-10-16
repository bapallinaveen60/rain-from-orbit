/** Minimal complex arithmetic on plain {r, i} objects. */
export interface Complex {
  r: number
  i: number
}

export const cx = (r: number, i: number): Complex => ({ r, i })
export const cmul = (a: Complex, b: Complex): Complex => ({ r: a.r * b.r - a.i * b.i, i: a.r * b.i + a.i * b.r })
export const cadd = (a: Complex, b: Complex): Complex => ({ r: a.r + b.r, i: a.i + b.i })
export const csub = (a: Complex, b: Complex): Complex => ({ r: a.r - b.r, i: a.i - b.i })
export const cabs2 = (a: Complex): number => a.r * a.r + a.i * a.i
export const cscale = (a: Complex, s: number): Complex => ({ r: a.r * s, i: a.i * s })

export function cdiv(a: Complex, b: Complex): Complex {
  const d = b.r * b.r + b.i * b.i
  return { r: (a.r * b.r + a.i * b.i) / d, i: (a.i * b.r - a.r * b.i) / d }
}

/** Principal square root (non-negative real and imaginary parts, as used for the refractive index). */
export function csqrt(e: Complex): Complex {
  const m = Math.sqrt(e.r * e.r + e.i * e.i)
  return { r: Math.sqrt(Math.max(0, (m + e.r) / 2)), i: Math.sqrt(Math.max(0, (m - e.r) / 2)) }
}
