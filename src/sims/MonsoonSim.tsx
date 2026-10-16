import { useState } from 'react'
import { DMIN, DRY_SPELL, dryMatchedToWet, MONSOON_MU as MU, nd, spellReadout, WET_SPELL, type Spell } from '../physics'
import { axes, DISP, gridline, label, MONOS, poly, pow10, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Readout, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

type Mode = 'wet' | 'dry' | 'both'

function drawSpells({ ctx, w: W, h: H, c }: Frame, mode: Mode, dry: Spell) {
  const x0 = 52
  const x1 = W - 16
  const y0 = 18
  const y1 = H - 38
  const DMAXP = 5.0
  const LOmin = 0
  const LOmax = 7
  const X = (d: number) => x0 + (d / DMAXP) * (x1 - x0)
  const Y = (lg: number) => y1 - ((lg - LOmin) / (LOmax - LOmin)) * (y1 - y0)
  for (let g = LOmin; g <= LOmax; g++) gridline(ctx, x0, x1, Y(g), c)

  const one = (s: Spell, col: string, em: boolean) => {
    const pts: Pt[] = []
    for (let i = 0; i <= 200; i++) {
      const d = DMIN + (i / 200) * DMAXP
      const v = nd(d, s.Dm, s.logNw, MU)
      if (v <= 0) continue
      const lg = Math.log10(v)
      if (lg < LOmin) {
        if (pts.length) break
        continue
      }
      pts.push([X(d), Y(Math.min(lg, LOmax))])
    }
    if (pts.length > 1) poly(ctx, pts, col, em ? 2.8 : 1.6, em ? null : [5, 4])
  }
  const wetEm = mode === 'wet' || mode === 'both'
  const dryEm = mode === 'dry' || mode === 'both'
  one(WET_SPELL, c.ka, wetEm)
  one(dry, c.ku, dryEm)

  let ly = y0 + 14
  const lx = x0 + (x1 - x0) * 0.4
  for (const [col, s, em] of [
    [c.ka, WET_SPELL, wetEm],
    [c.ku, dry, dryEm],
  ] as [string, Spell, boolean][]) {
    const r = spellReadout(s)
    ctx.save()
    ctx.strokeStyle = col
    ctx.lineWidth = em ? 2.8 : 1.6
    ctx.lineCap = 'round'
    if (!em) ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(lx, ly)
    ctx.lineTo(lx + 16, ly)
    ctx.stroke()
    ctx.restore()
    label(ctx, s.name, lx + 23, ly, col, DISP)
    label(ctx, 'Z ' + r.dbz.toFixed(1) + ' dBZ    R ' + r.R.toFixed(1) + ' mm/h', lx + 23, ly + 15, c.ink2, MONOS)
    ly += 36
  }

  axes(ctx, x0, y0, x1, y1, c)
  for (let d = 0; d <= 5; d++) label(ctx, d, X(d), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'drop diameter D  (mm)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (let g = LOmin; g <= LOmax; g++) label(ctx, pow10(g), x0 - 7, Y(g), c.ink3, MONOS, 'right')
  yTitle(ctx, 'N(D)   mm⁻¹ m⁻³', 13, (y0 + y1) / 2, c.ink2)
  label(ctx, 'Western Ghats, Indian summer monsoon', x0 + 6, y0 + 6, c.ink3, MONOS, 'left')
}

const MODES: [Mode, string][] = [
  ['wet', 'Wet spell'],
  ['dry', 'Dry spell'],
  ['both', 'Match Z'],
]

export default function MonsoonSim({ title, hint }: SimProps) {
  const [mode, setMode] = useState<Mode>('wet')
  const dry = mode === 'both' ? dryMatchedToWet() : DRY_SPELL
  const active = mode === 'wet' ? WET_SPELL : dry
  const r = spellReadout(active)
  const ref = usePlot((f) => drawSpells(f, mode, dry), 400 / 760)

  return (
    <Widget id="india" title={title} hint={hint}>
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label="Wet-spell and dry-spell drop size distributions" />
        </div>
        <div>
          <div className="seg" style={{ marginBottom: 12 }}>
            {MODES.map(([m, name]) => (
              <Toggle key={m} pressed={mode === m} onClick={() => setMode(m)}>
                {name}
              </Toggle>
            ))}
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--ink2)', margin: '0 0 9px', fontWeight: 700 }}>
            Readouts below: {active.name}.
          </p>
          <div className="reads">
            <Readout
              k={
                <>
                  D<sub>m</sub>
                </>
              }
            >
              <U v={active.Dm.toFixed(2)} u="mm" />
            </Readout>
            <Readout
              k={
                <>
                  log₁₀ N<sub>w</sub>
                </>
              }
            >
              {active.logNw.toFixed(2)}
            </Readout>
            <Readout k="Z">
              <U v={r.dbz.toFixed(1)} u="dBZ" />
            </Readout>
            <Readout k="True R">
              <U v={r.R.toFixed(1)} u="mm/h" />
            </Readout>
            <Readout k="R from Z=200R^1.6">
              <U v={r.Rz.toFixed(1)} u="mm/h" />
            </Readout>
            <Readout k="Error" bad={Math.abs(r.errPct) > 20}>
              <U v={(r.errPct > 0 ? '+' : '') + r.errPct.toFixed(0)} u="%" />
            </Readout>
          </div>
        </div>
      </div>
    </Widget>
  )
}
