import { dB, nwForZ, Rrate, Zray } from './dsd'

/*
 * Western Ghats wet-spell vs dry-spell drop size distributions (Ch8), after
 * Murali Krishna et al., ACP 21, 4741–4757 (2021).
 */

export const MONSOON_MU = 3

export interface Spell {
  name: string
  Dm: number
  logNw: number
}

export const WET_SPELL: Spell = { name: 'Wet spell', Dm: 1.3, logNw: 3.9 }
export const DRY_SPELL: Spell = { name: 'Dry spell', Dm: 0.9, logNw: 5.0 }

/** The dry-spell DSD rescaled so its Z equals the wet spell's. */
export function dryMatchedToWet(): Spell {
  const zWet = dB(Zray(WET_SPELL.Dm, WET_SPELL.logNw, MONSOON_MU))
  return { name: 'Dry spell (Z matched)', Dm: DRY_SPELL.Dm, logNw: nwForZ(zWet, DRY_SPELL.Dm, MONSOON_MU) }
}

export interface SpellReadout {
  dbz: number
  /** True rain rate from the DSD, mm h⁻¹. */
  R: number
  /** Rain rate from a fixed Z = 200 R^1.6 (Marshall–Palmer), mm h⁻¹. */
  Rz: number
  /** (Rz − R) / R, percent. */
  errPct: number
}

export function spellReadout(s: Spell): SpellReadout {
  const Z = Zray(s.Dm, s.logNw, MONSOON_MU)
  const R = Rrate(s.Dm, s.logNw, MONSOON_MU)
  const Rz = Math.pow(Z / 200, 1 / 1.6)
  return { dbz: dB(Z), R, Rz, errPct: ((Rz - R) / R) * 100 }
}
