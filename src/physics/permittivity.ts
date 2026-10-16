import { cabs2, cadd, cdiv, csub, cx, type Complex } from './complex'

/**
 * Debye relative permittivity of liquid water (Ray 1972 style).
 * @param fGHz frequency in GHz
 * @param T temperature in °C
 */
export function waterEps(fGHz: number, T: number): Complex {
  const es = 78.54 * (1 - 4.579e-3 * (T - 25) + 1.19e-5 * Math.pow(T - 25, 2) - 2.8e-8 * Math.pow(T - 25, 3))
  const einf = 5.27137 + 0.0216474 * T - 0.00131198 * T * T
  const alpha = -16.8129 / (T + 273) + 0.0609265
  const lamS = 0.00033836 * Math.exp(2513.98 / (T + 273)) // relaxation wavelength, cm
  const lam = 30 / fGHz // wavelength, cm
  const x = Math.pow(lamS / lam, 1 - alpha)
  const sinA = Math.sin((alpha * Math.PI) / 2)
  const cosA = Math.cos((alpha * Math.PI) / 2)
  const den = 1 + 2 * x * sinA + x * x
  // Ionic conductivity is negligible for pure water at these frequencies.
  return {
    r: einf + ((es - einf) * (1 + x * sinA)) / den,
    i: ((es - einf) * x * cosA) / den,
  }
}

/** Dielectric factor |K|² = |(ε − 1)/(ε + 2)|². */
export function Ksq(e: Complex): number {
  return cabs2(cdiv(csub(e, cx(1, 0)), cadd(e, cx(2, 0))))
}
