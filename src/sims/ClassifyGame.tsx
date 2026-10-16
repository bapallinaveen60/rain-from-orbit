import { useMemo, useState } from 'react'
import {
  buildProfile,
  CLASS_LABEL,
  CLASSIFY_ZTOP as ZTOP,
  diagnose,
  KA_FLOOR,
  KU_FLOOR,
  PROFILE_SPECS,
  type Profile,
  type RainClass,
} from '../physics'
import { axes, gridline, label, MONOS, poly, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Legend, Readout, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

function drawProfile({ ctx, w: W, h: H, c }: Frame, P: Profile) {
  const N = P.z.length
  const x0 = 46
  const x1 = W - 62
  const y0 = 28
  const y1 = H - 38
  const X = (v: number) => x0 + (v / 60) * (x1 - x0)
  const Y = (z: number) => y1 - (z / ZTOP) * (y1 - y0)
  const XD = (v: number) => x0 + ((v + 2) / 20) * (x1 - x0)
  for (let z = 0; z <= 15; z += 3) gridline(ctx, x0, x1, Y(z), c)

  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = c.ink3
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(x0, Y(P.spec.t0))
  ctx.lineTo(x1, Y(P.spec.t0))
  ctx.stroke()
  ctx.restore()
  label(ctx, '0 °C', x1 - 3, Y(P.spec.t0) - 9, c.ink3, MONOS, 'right')
  ctx.fillStyle = c.ink
  ctx.globalAlpha = 0.1
  ctx.fillRect(x0, Y(0.7), x1 - x0, y1 - Y(0.7))
  ctx.globalAlpha = 1

  const series = (arr: number[], col: string, wd: number, floor: number) => {
    let pts: Pt[] = []
    for (let i = 0; i < N; i++) {
      if (arr[i] < floor) {
        if (pts.length > 1) break
        pts = []
        continue
      }
      pts.push([X(Math.max(0, Math.min(60, arr[i]))), Y(P.z[i])])
    }
    if (pts.length > 1) poly(ctx, pts, col, wd)
    return pts
  }
  series(P.ku, c.ku, 2.4, KU_FLOOR)
  const kaPts = series(P.ka, c.ka, 2.0, KA_FLOOR)
  let dfrPts: Pt[] = []
  for (let i = 0; i < N; i++) {
    if (P.ku[i] < KU_FLOOR || P.ka[i] < KA_FLOOR) {
      if (dfrPts.length > 1) break
      dfrPts = []
      continue
    }
    dfrPts.push([XD(Math.max(-2, Math.min(18, P.ku[i] - P.ka[i]))), Y(P.z[i])])
  }
  if (dfrPts.length > 1) poly(ctx, dfrPts, c.accent, 1.8, [4, 3])
  if (kaPts.length > 1 && kaPts.length < N - 4) {
    const e = kaPts[kaPts.length - 1]
    ctx.fillStyle = c.ka
    ctx.beginPath()
    ctx.arc(e[0], e[1], 3.5, 0, 7)
    ctx.fill()
    label(ctx, 'Ka lost', e[0] - 7, e[1], c.ka, MONOS, 'right')
  }

  axes(ctx, x0, y0, x1, y1, c)
  for (let v = 0; v <= 60; v += 15) label(ctx, v, X(v), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'Z (dBZ)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (let z = 0; z <= 15; z += 3) label(ctx, z, x0 - 7, Y(z), c.ink3, MONOS, 'right')
  yTitle(ctx, 'height (km)', 12, (y0 + y1) / 2, c.ink2)
  ctx.save()
  ctx.strokeStyle = c.accent
  ctx.globalAlpha = 0.4
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y0)
  for (const d of [0, 5, 10, 15]) {
    ctx.moveTo(XD(d), y0)
    ctx.lineTo(XD(d), y0 + 4)
  }
  ctx.stroke()
  ctx.restore()
  for (const d of [0, 5, 10, 15]) label(ctx, d, XD(d), y0 - 7, c.accent, MONOS, 'center')
  label(ctx, 'DFRm (dB)', x1 + 4, y0 - 7, c.accent, MONOS, 'left')
}

const ANSWERS: RainClass[] = ['strat', 'conv', 'snow', 'shallow']
const BUTTON: Record<RainClass, string> = {
  strat: 'Stratiform',
  conv: 'Convective',
  snow: 'Snow',
  shallow: 'Shallow / warm',
}

export default function ClassifyGame({ title, hint }: SimProps) {
  const profiles = useMemo(() => PROFILE_SPECS.map(buildProfile), [])
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<RainClass | null>(null)
  const [score, setScore] = useState(0)
  const P = profiles[idx]
  const d = diagnose(P)
  const ref = usePlot((f) => drawProfile(f, P), 420 / 760)
  const truth = P.spec.a
  const last = idx >= profiles.length - 1

  const answer = (a: RainClass) => {
    if (picked) return
    setPicked(a)
    if (a === truth) setScore((s) => s + 1)
  }

  return (
    <Widget id="class" title={title} hint={hint}>
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label={`Radar profile ${idx + 1} of ${profiles.length}`} />
          <Legend
            items={[
              {
                color: 'var(--ku)',
                label: (
                  <>
                    Ku Z<sub>m</sub>
                  </>
                ),
              },
              {
                color: 'var(--ka)',
                label: (
                  <>
                    Ka Z<sub>m</sub>
                  </>
                ),
              },
              {
                color: 'var(--flow)',
                label: (
                  <>
                    DFR<sub>m</sub>
                  </>
                ),
              },
              { plain: true, label: 'dashed: 0 °C level' },
            ]}
          />
        </div>
        <div>
          <div className="reads" style={{ marginBottom: 12 }}>
            <Readout k="Z max (Ku, measured)">
              <U v={d.zmax.toFixed(1)} u="dBZ" />
            </Readout>
            <Readout k="Storm top">
              <U v={d.top.toFixed(1)} u="km" />
            </Readout>
            <Readout k="BB peak">
              {d.bb !== null ? <U v={d.bb.toFixed(1)} u="km" /> : <small style={{ fontSize: 13 }}>none found</small>}
            </Readout>
            <Readout
              k={
                <>
                  DFR<sub>m</sub> slope
                </>
              }
            >
              <small style={{ fontSize: 13 }}>{d.slope !== null ? d.slope.toFixed(2) + ' dB/km' : '—'}</small>
            </Readout>
          </div>
          <p style={{ fontSize: 15, margin: '0 0 10px' }}>
            Profile <b>{idx + 1}</b> of {profiles.length}. What is it?
          </p>
          <div className="seg">
            {ANSWERS.map((a) => (
              <Toggle
                key={a}
                pressed={picked !== null && a === truth}
                disabled={picked !== null}
                onClick={() => answer(a)}
                style={picked && a !== truth && a !== picked ? { opacity: 0.45 } : picked ? { opacity: 1 } : undefined}
              >
                {BUTTON[a]}
              </Toggle>
            ))}
          </div>
          {picked && (
            <div className="fb" role="status">
              <b>
                {picked === truth ? 'Correct — ' : 'Not this one — '}
                {CLASS_LABEL[truth]}.
              </b>{' '}
              {P.spec.why}
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn"
              type="button"
              disabled={!picked || last}
              onClick={() => {
                setIdx((i) => Math.min(profiles.length - 1, i + 1))
                setPicked(null)
              }}
            >
              Next profile →
            </button>
            <span className="tiny">
              {!picked
                ? idx === 0
                  ? '0 correct'
                  : `${score} of ${idx} correct`
                : last
                  ? `${score} of ${profiles.length} correct — done`
                  : `${score} of ${idx + 1} correct`}
            </span>
          </div>
        </div>
      </div>
    </Widget>
  )
}
