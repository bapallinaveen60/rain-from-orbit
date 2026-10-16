import { mieZK, nwForZ, Rrate } from './dsd'

/*
 * One synthetic stratiform ray carried through the Level-2 chain (Ch7).
 */

export interface ChainStep {
  k: 'L1B' | 'PRE' | 'VER' | 'CSF' | 'DSD' | 'SRT' | 'SLV' | 'OUT'
  name: string
  desc: string
}

export const CHAIN_STEPS: ChainStep[] = [
  {
    k: 'L1B',
    name: 'Level-1B',
    desc: 'What arrives is received echo power per range bin, per beam, plus the geolocation, local zenith angle and the DEM. No meteorology yet — just power against range.',
  },
  {
    k: 'PRE',
    name: 'PRE — Preparation',
    desc: 'Converts echo power to the measured reflectivity Zm′ with no attenuation correction, decides rain / no-rain per ray, and fixes the three key bins: binStormTop, binRealSurface and binClutterFreeBottom. Side-lobe clutter is filtered here.',
  },
  {
    k: 'VER',
    name: 'VER — Vertical Profile',
    desc: 'Reads the ancillary analysis fields (JMA GANAL, interpolated in space and time to each range bin) and removes attenuation by the things that are not precipitation: water vapour, molecular oxygen and cloud liquid water. Also flags the 0 °C range bin. The output is zFactorNPCorrected.',
  },
  {
    k: 'CSF',
    name: 'CSF — Classification',
    desc: 'Searches the bright-band window around the freezing level, finds the peak and its top and bottom edges, and classifies the ray as stratiform, convective or other — by the V-method and H-method at single frequency, and additionally by the DFRm method where both bands exist.',
  },
  {
    k: 'DSD',
    name: 'DSD — Drop Size Distribution',
    desc: 'Places five nodes A–E through the profile and assigns each range bin a particle temperature and phase — solid above node A, melting between B and D, liquid below. Then selects the density, dielectric constant, fall speed, N(D) parameterisation and the R–Dm relation appropriate to that phase and rain type.',
  },
  {
    k: 'SRT',
    name: 'SRT — Surface Reference',
    desc: 'Estimates path-integrated attenuation from the drop in surface cross-section inside the rain relative to rain-free references: along-track, cross-track and climatological. Weights them by inverse variance into one effective PIA, with a reliability flag.',
  },
  {
    k: 'SLV',
    name: 'SLV — Solver',
    desc: 'The retrieval. Works the R–Dm plane bin by bin, sweeping ε from 0.2 to 5.0 and picking the value that best reconciles the ε prior, the SRT PIA, the reflectivity residual and — in dual frequency — the Ka observation. Below the clutter-free bottom it holds Ze constant.',
  },
  {
    k: 'OUT',
    name: 'Output',
    desc: 'zFactorFinal, precipRate, paramDSD (Nw and Dm), typePrecip, flagBB, pathAtten and the rest are written to the Level-2 standard product. The dual-frequency algorithm then runs over both single-frequency products to produce 2A.GPM.DPR.',
  },
]

export const PIPE_ZTOP = 13
export const PIPE_N = 130
/** Freezing level, km. */
export const PIPE_T0 = 4.6
/** Clutter-free bottom, km. */
export const PIPE_CFB = 0.75
/** DSD nodes A–E, km. */
export const PIPE_NODES: [string, number][] = [
  ['A', 7.9],
  ['B', PIPE_T0 - 0.05],
  ['C', PIPE_T0 - 0.5],
  ['D', PIPE_T0 - 0.95],
  ['E', 1.5],
]

export interface ChainRay {
  /** Heights, km, top to bottom. */
  z: number[]
  /** True (attenuation-corrected) Ku reflectivity, dBZ. */
  ze: number[]
  /** Measured Ku reflectivity, dBZ. */
  zm: number[]
  /** Rain rate, mm h⁻¹. */
  rr: number[]
}

export function buildChainRay(): ChainRay {
  const N = PIPE_N
  const T0 = PIPE_T0
  const z: number[] = []
  const ze: number[] = []
  const zm: number[] = []
  const rr: number[] = []
  const dz = PIPE_ZTOP / (N - 1)
  for (let i = 0; i < N; i++) {
    const h = PIPE_ZTOP * (1 - i / (N - 1))
    let v = -99
    if (h <= 9.0) {
      v =
        29 -
        0.85 * h +
        9 * Math.exp(-Math.pow((h - 2.0) / 3.4, 2)) +
        9.5 * Math.exp(-Math.pow((h - (T0 - 0.5)) / 0.32, 2))
      if (h > T0 + 0.2) v -= (h - T0 - 0.2) * 3.3
    }
    z.push(h)
    ze.push(v)
  }
  let acc = 0
  for (let j = 0; j < N; j++) {
    if (ze[j] < 0) {
      zm.push(-99)
      rr.push(0)
      continue
    }
    const dm = z[j] < T0 - 0.4 ? 1.15 : 0.0
    let k = 0.02
    if (dm > 0) {
      const nw = nwForZ(ze[j], dm, 3)
      k = mieZK('ku', dm, nw, 3).k
      rr.push(Rrate(dm, nw, 3))
    } else rr.push(0)
    acc += 2 * k * dz
    zm.push(ze[j] - acc)
  }
  return { z, ze, zm, rr }
}
