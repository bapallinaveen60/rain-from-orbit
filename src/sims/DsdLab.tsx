import { useState } from 'react'
import { DMIN, dB, LWC, nd, nwForZ, Rrate, Zray } from '../physics'
import { axes, gridline, label, MONOS, poly, pow10, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Legend, Readout, Slider, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

interface Dsd {
  Dm: number
  nw: number
  mu: number
}
interface Lock extends Dsd {
  dbz: number
}

const START: Dsd = { Dm: 1.5, nw: 4, mu: 3 }
const clampNw = (v: number) => Math.max(1, Math.min(6.5, v))

function drawDsd({ ctx, w: W, h: H, c }: Frame, st: Dsd, lock: Lock | null) {
  const x0 = 52
  const x1 = W - 14
  const y0 = 16
  const y1 = H - 38
  const DMAXP = 6.5
  const LOmin = -1
  const LOmax = 6
  const X = (d: number) => x0 + (d / DMAXP) * (x1 - x0)
  const Y = (lg: number) => y1 - ((lg - LOmin) / (LOmax - LOmin)) * (y1 - y0)

  for (let g = LOmin; g <= LOmax; g++) gridline(ctx, x0, x1, Y(g), c)
  axes(ctx, x0, y0, x1, y1, c)
  for (let g = LOmin; g <= LOmax; g++) label(ctx, pow10(g), x0 - 7, Y(g), c.ink3, MONOS, 'right')
  for (let d = 0; d <= 6; d++) label(ctx, d, X(d), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'drop diameter D  (mm)', (x0 + x1) / 2, y1 + 29, c.ink2, MONOS, 'center')
  yTitle(ctx, 'N(D)   mm⁻¹ m⁻³', 13, (y0 + y1) / 2, c.ink2)

  const curve = (s: Dsd, col: string, wd: number, dash?: number[]) => {
    const pts: Pt[] = []
    for (let i = 0; i <= 200; i++) {
      const D = DMIN + (i / 200) * DMAXP
      const v = nd(D, s.Dm, s.nw, s.mu)
      if (v <= 0) continue
      const lg = Math.log10(v)
      if (lg < LOmin) {
        if (pts.length) break
        continue
      }
      pts.push([X(D), Y(Math.min(lg, LOmax))])
    }
    if (pts.length > 1) poly(ctx, pts, col, wd, dash)
  }
  if (lock) curve(lock, c.ink3, 1.6, [4, 3])
  curve(st, c.accent, 2.4)

  ctx.save()
  ctx.setLineDash([3, 3])
  ctx.strokeStyle = c.ku
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(X(st.Dm), y0)
  ctx.lineTo(X(st.Dm), y1)
  ctx.stroke()
  ctx.restore()
  label(ctx, 'Dm', X(st.Dm) + 5, y0 + 9, c.ku, MONOS)

  if (lock) {
    label(ctx, 'locked: Dm ' + lock.Dm.toFixed(2) + ' mm', x1 - 6, y0 + 10, c.ink3, MONOS, 'right')
    label(ctx, 'R ' + Rrate(lock.Dm, lock.nw, lock.mu).toFixed(1) + ' mm/h', x1 - 6, y0 + 24, c.ink3, MONOS, 'right')
  }
}

/** Box A / Box B: both 29.0 dBZ, μ = 3; Box A (Dm 2.72 mm) becomes the locked reference. */
function boxPreset(dm: number): { st: Dsd; lock: Lock } {
  const at = (d: number) => ({ Dm: d, nw: clampNw(nwForZ(29.0, d, 3)), mu: 3 })
  return { st: at(dm), lock: { ...at(2.72), dbz: 29.0 } }
}

export default function DsdLab({ title }: SimProps) {
  const [st, setSt] = useState<Dsd>(START)
  const [lock, setLock] = useState<Lock | null>(null)
  const ref = usePlot((f) => drawDsd(f, st, lock), 430 / 760)

  /** Move Dm or μ; with Z locked, re-solve Nw to hold it. Moving Nw itself releases the lock. */
  const set = (key: keyof Dsd, v: number) => {
    const next = { ...st, [key]: v }
    if (lock && key !== 'nw') next.nw = clampNw(nwForZ(lock.dbz, next.Dm, next.mu))
    if (lock && key === 'nw') setLock(null)
    setSt(next)
  }

  const Z = Zray(st.Dm, st.nw, st.mu)
  const R = Rrate(st.Dm, st.nw, st.mu)
  const W = LWC(st.Dm, st.nw)

  return (
    <Widget
      id="dsd"
      title={title}
      hint={
        <>
          lock Z, then move D<sub>m</sub>
        </>
      }
    >
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label="Drop size distribution N(D)" />
          <Legend
            items={[
              { color: 'var(--flow)', label: 'N(D), current' },
              { color: 'var(--ink3)', opacity: 0.55, label: 'locked reference' },
            ]}
          />
        </div>
        <div>
          <div className="ctrls">
            <Slider
              label={
                <>
                  D<sub>m</sub> — mean drop size
                </>
              }
              value={st.Dm}
              min={0.3}
              max={3.5}
              step={0.01}
              display={st.Dm.toFixed(2) + ' mm'}
              onChange={(v) => set('Dm', v)}
            />
            <Slider
              label={
                <>
                  log₁₀ N<sub>w</sub> — how many
                </>
              }
              value={st.nw}
              min={1}
              max={6.5}
              step={0.01}
              display={st.nw.toFixed(2)}
              onChange={(v) => set('nw', v)}
            />
            <Slider
              label="μ — shape (assumed, not retrieved)"
              value={st.mu}
              min={-1}
              max={10}
              step={0.1}
              display={st.mu.toFixed(1)}
              onChange={(v) => set('mu', v)}
            />
            <div className="seg">
              <Toggle
                pressed={!!lock}
                onClick={() => setLock(lock ? null : { ...st, dbz: dB(Zray(st.Dm, st.nw, st.mu)) })}
              >
                {lock ? (
                  `Z locked at ${lock.dbz.toFixed(1)} dBZ`
                ) : (
                  <>
                    Lock Z — solve N<sub>w</sub>
                  </>
                )}
              </Toggle>
              <Toggle
                onClick={() => {
                  const p = boxPreset(2.72)
                  setSt(p.st)
                  setLock(p.lock)
                }}
              >
                Box A
              </Toggle>
              <Toggle
                onClick={() => {
                  const p = boxPreset(1.0)
                  setSt(p.st)
                  setLock(p.lock)
                }}
              >
                Box B
              </Toggle>
              <Toggle
                onClick={() => {
                  setSt(START)
                  setLock(null)
                }}
              >
                Reset
              </Toggle>
            </div>
          </div>
          <div className="reads" style={{ marginTop: 14 }}>
            <Readout k="Z (Rayleigh)">
              <U v={dB(Z).toFixed(1)} u="dBZ" />
            </Readout>
            <Readout k="Rain rate R">
              <U v={R < 10 ? R.toFixed(2) : R.toFixed(1)} u="mm/h" />
            </Readout>
            <Readout k="a in Z=aR^1.4">{R > 1e-4 ? (Z / Math.pow(R, 1.4)).toFixed(0) : '—'}</Readout>
            <Readout k="Liquid water">
              <U v={W < 0.1 ? W.toFixed(3) : W.toFixed(2)} u="g/m³" />
            </Readout>
          </div>
        </div>
      </div>
    </Widget>
  )
}
