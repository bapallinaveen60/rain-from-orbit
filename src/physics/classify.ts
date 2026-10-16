import { dB, mieZK, nwForZ } from './dsd'

/*
 * Synthetic Ku/Ka profiles for the Ch6 "Classify the profile" game.
 * Below the melting level Ka comes from Mie scattering plus accumulated two-way attenuation;
 * the ice region above uses a prescribed aggregation DFR that grows downward.
 */

export type RainClass = 'strat' | 'conv' | 'snow' | 'shallow'

export const CLASS_LABEL: Record<RainClass, string> = {
  strat: 'stratiform',
  conv: 'convective',
  snow: 'snow',
  shallow: 'shallow / warm',
}

export interface ProfileSpec {
  a: RainClass
  /** Freezing level, km. */
  t0: number
  /** Storm top, km. */
  top: number
  /** Peak Ku reflectivity, dBZ. */
  peak: number
  /** Reflectivity in the rain below the bright band, dBZ. */
  rain: number
  bb: boolean
  /** Dm in the rain layer, mm (0 = no liquid layer). */
  dm: number
  /** Hand-written explanation; empty to generate one from the diagnostics. */
  why: string
}

export const PROFILE_SPECS: ProfileSpec[] = [
  {
    a: 'strat',
    t0: 4.8,
    top: 8.4,
    peak: 35,
    rain: 24,
    bb: true,
    dm: 1.05,
    why: 'A bright band at 4.3 km, half a kilometre below the freezing level, peaking near 34 dBZ — under the 46 dBZ ceiling the V-method applies when a bright band is present. Below it the DFR slope is about half a decibel per kilometre, essentially flat: at these reflectivities there is almost no Ka attenuation to accumulate. The bright band alone settles this one.',
  },
  {
    a: 'conv',
    t0: 4.9,
    top: 14.4,
    peak: 53,
    rain: 53,
    bb: false,
    dm: 2.1,
    why: 'Storm top near 13 km, a measured Ku maximum past the 40 dBZ convective threshold, and no bright band anywhere near the freezing level. The DFR slope is over 20 dB per kilometre — more than twenty times the stratiform case — and the Ka trace stops partway down, attenuated below its own detection floor. Every one of the three methods calls this convective.',
  },
  {
    a: 'snow',
    t0: 0.3,
    top: 5.6,
    peak: 21,
    rain: 21,
    bb: false,
    dm: 0,
    why: 'Ku reflectivity never reaches 23 dBZ, and the freezing level is at the ground — there is no melting layer in this column, so no bright band is possible. The DFR still grows about 1 dB per kilometre downward, which here is aggregation rather than attenuation: the snowflakes are getting larger as they fall. Low Ku with a rising DFR slope is exactly what the surface snowfall index is built from.',
  },
  {
    a: 'shallow',
    t0: 4.9,
    top: 3.0,
    peak: 31,
    rain: 31,
    bb: false,
    dm: 1.0,
    why: 'The whole echo sits below the freezing level — there is no ice phase in this column at all, so nothing melts and no bright band can form. Storm top is 2.5 km and the DFR slope is about 1 dB per kilometre, so the diagnostics look much like the snow case; what separates them is where the 0 °C line sits and how much brighter this echo is. Flagged by flagShallowRain independently of rain type. Note how much of it falls inside the grey blind layer.',
  },
  {
    a: 'strat',
    t0: 4.3,
    top: 7.6,
    peak: 30,
    rain: 21,
    bb: true,
    dm: 0.95,
    why: 'A weaker bright band, but still an unmistakable peak just under the 0 °C level with reflectivity falling away on both sides, and the flattest DFR profile of the six, a quarter of a decibel per kilometre. Comfortably below 46 dBZ, so stratiform.',
  },
  {
    a: 'conv',
    t0: 4.7,
    top: 11.8,
    peak: 48,
    rain: 48,
    bb: false,
    dm: 1.75,
    why: 'No bright band, storm top near 12 km, and a DFR slope of about 16 dB per kilometre. The measured Ku maximum is just under 40 dBZ — but the V-method applies that threshold to the attenuation-corrected reflectivity, not the measured one, which is precisely why the single-frequency chain runs classification a second time on the Solver output. Corrected, this profile is well past 40.',
  },
]

export const CLASSIFY_ZTOP = 15
export const CLASSIFY_N = 110
export const KU_FLOOR = 12.0
export const KA_FLOOR = 13.7

export interface Profile {
  /** Heights, km, top to bottom. */
  z: number[]
  /** Measured Ku and Ka, dBZ (−99 = no echo). */
  ku: number[]
  ka: number[]
  spec: ProfileSpec
}

export function buildProfile(s: ProfileSpec): Profile {
  const N = CLASSIFY_N
  const ZTOP = CLASSIFY_ZTOP
  const zs: number[] = []
  const ze: number[] = []
  for (let i = 0; i < N; i++) {
    const z = ZTOP * (1 - i / (N - 1))
    let v = -99
    if (z <= s.top) {
      if (s.a === 'snow') v = s.peak - 1.7 * z + 2.4 * Math.exp(-Math.pow((z - 1.1) / 1.7, 2))
      else if (s.a === 'shallow') v = (s.peak - 6) * Math.exp(-Math.pow((z - 0.8) / 1.45, 2)) + 6
      else if (s.a === 'conv') v = (s.peak - 4) * Math.exp(-Math.pow(z / 9.4, 1.9)) + 4
      else {
        v = s.rain + (s.peak - s.rain) * Math.exp(-Math.pow((z - (s.t0 - 0.5)) / 0.38, 2))
        if (z > s.t0 + 0.1) v -= (z - s.t0 - 0.1) * 3.0
      }
    }
    zs.push(z)
    ze.push(v)
  }

  const ku: number[] = []
  const ka: number[] = []
  const dz = ZTOP / (N - 1)
  let accKu = 0
  let accKa = 0
  for (let j = 0; j < N; j++) {
    const z = zs[j]
    const zk = ze[j]
    if (zk < 0) {
      ku.push(-99)
      ka.push(-99)
      continue
    }
    let dfr: number, kku: number, kka: number
    if (z < s.t0 - 0.45 && s.a !== 'snow') {
      const dm = Math.max(0.4, s.dm * (1 - 0.05 * z))
      const nw = nwForZ(zk, dm, 3)
      const A = mieZK('ku', dm, nw, 3)
      const B = mieZK('ka', dm, nw, 3)
      dfr = dB(A.Ze) - dB(B.Ze)
      kku = A.k
      kka = B.k
    } else {
      const agg = Math.max(0.25, 1.0 - 0.1 * Math.max(0, z - s.t0))
      dfr = 0.5 + (3.6 * agg * Math.max(0, zk - 8)) / 24
      kku = 0.004 * Math.max(0, zk - 10)
      kka = 0.035 * Math.max(0, zk - 10)
    }
    accKu += 2 * kku * dz
    accKa += 2 * kka * dz
    ku.push(zk - accKu)
    ka.push(zk - dfr - accKa)
  }
  return { z: zs, ku, ka, spec: s }
}

export interface Diagnostics {
  /** Max measured Ku, dBZ. */
  zmax: number
  /** Highest bin above the Ku floor, km. */
  top: number
  /** Bright-band peak height, km (null when the profile has none). */
  bb: number | null
  /** DFRm slope below the melting layer, dB km⁻¹ (null when not measurable). */
  slope: number | null
}

/** The readouts the game shows alongside each profile. */
export function diagnose(P: Profile): Diagnostics {
  const N = P.z.length
  let zmax = -99
  let top = 0
  let bbH: number | null = null
  let bbV = -99
  for (let k = 0; k < N; k++) {
    if (P.ku[k] > zmax) zmax = P.ku[k]
    if (P.ku[k] > KU_FLOOR && P.z[k] > top) top = P.z[k]
    if (P.z[k] > P.spec.t0 - 1.4 && P.z[k] < P.spec.t0 + 0.3 && P.ku[k] > bbV) {
      bbV = P.ku[k]
      bbH = P.z[k]
    }
  }
  const slopeTop = P.spec.t0 > 1.5 ? P.spec.t0 - 0.7 : Math.min(3.6, P.spec.top)
  let lo: number | null = null
  let hi: number | null = null
  for (let q = 0; q < N; q++) {
    if (P.z[q] < slopeTop && P.z[q] > 0.8 && P.ku[q] > KU_FLOOR && P.ka[q] > KA_FLOOR) {
      if (hi === null) hi = q
      lo = q
    }
  }
  let slope: number | null = null
  if (lo !== null && hi !== null && lo !== hi && P.z[hi] - P.z[lo] > 0.4) {
    const d1 = P.ku[hi] - P.ka[hi]
    const d2 = P.ku[lo] - P.ka[lo]
    slope = (d2 - d1) / (P.z[hi] - P.z[lo])
  }
  return { zmax, top, bb: P.spec.bb ? bbH : null, slope }
}

/**
 * Six more profiles for repeat play. Their explanations are generated from each profile's own
 * diagnostics (see explainProfile), so the numbers quoted always match the plot.
 */
export const EXTRA_PROFILE_SPECS: ProfileSpec[] = [
  { a: 'strat', t0: 5.2, top: 9.0, peak: 38, rain: 26, bb: true, dm: 1.2, why: '' },
  { a: 'conv', t0: 5.0, top: 13.0, peak: 50, rain: 50, bb: false, dm: 1.9, why: '' },
  { a: 'snow', t0: 0.2, top: 4.8, peak: 19, rain: 19, bb: false, dm: 0, why: '' },
  { a: 'shallow', t0: 5.0, top: 2.4, peak: 34, rain: 34, bb: false, dm: 1.1, why: '' },
  { a: 'strat', t0: 3.6, top: 6.8, peak: 33, rain: 23, bb: true, dm: 1.0, why: '' },
  { a: 'conv', t0: 4.5, top: 14.8, peak: 55, rain: 55, bb: false, dm: 2.3, why: '' },
]

export const ALL_PROFILE_SPECS = [...PROFILE_SPECS, ...EXTRA_PROFILE_SPECS]

/** The explanation shown after answering: the hand-written one if present, else built from the diagnostics. */
export function explainProfile(P: Profile, d: Diagnostics = diagnose(P)): string {
  if (P.spec.why) return P.spec.why
  const s = P.spec
  const slope = d.slope === null ? 'not measurable' : `${d.slope.toFixed(1)} dB per kilometre`
  switch (s.a) {
    case 'strat':
      return `A bright band at ${d.bb?.toFixed(1)} km, just below the ${s.t0.toFixed(1)} km freezing level, with reflectivity falling away above and below it. The DFR slope underneath is ${slope} — nearly flat, so there is little Ka attenuation to accumulate — and the ${d.zmax.toFixed(0)} dBZ peak stays under the 46 dBZ bright-band ceiling. Stratiform.`
    case 'conv':
      return `Storm top near ${d.top.toFixed(1)} km, no bright band at the ${s.t0.toFixed(1)} km freezing level, a measured Ku maximum of ${d.zmax.toFixed(0)} dBZ and a DFR slope of ${slope}: heavy attenuation all the way down.${d.zmax < 40 ? ' The measured peak is under 40 dBZ only because of that attenuation; corrected, it is well past the threshold.' : ''} Convective.`
    case 'snow':
      return `The freezing level is at ${s.t0.toFixed(1)} km, so there is no melting layer and no bright band. Ku stays near ${d.zmax.toFixed(0)} dBZ while the DFR still grows downward (${slope}) — aggregation, snowflakes growing as they fall, not attenuation. Snow.`
    case 'shallow':
      return `The echo tops out at ${d.top.toFixed(1)} km, entirely below the ${s.t0.toFixed(1)} km freezing level: no ice phase, so nothing melts and no bright band can form. Warm rain — and much of it sits inside the grey blind layer near the ground. Shallow.`
  }
}
