import { useMemo, useState } from 'react'
import {
  buildProfile,
  CLASS_LABEL,
  CLASSIFY_ZTOP as ZTOP,
  diagnose,
  KA_FLOOR,
  KU_FLOOR,
  ALL_PROFILE_SPECS,
  explainProfile,
  type Diagnostics,
  type Profile,
  type RainClass,
} from '../physics'
import { axes, gridline, label, MONOS, poly, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Legend, Readout, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

function drawProfile({ ctx, w: W, h: H, c }: Frame, P: Profile, reveal: Diagnostics | null) {
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

  if (!reveal) return
  // After answering: mark the evidence the classifier would use.
  const band = (z0: number, z1: number, col: string, alpha: number) => {
    ctx.save()
    ctx.fillStyle = col
    ctx.globalAlpha = alpha
    ctx.fillRect(x0, Y(z1), x1 - x0, Y(z0) - Y(z1))
    ctx.restore()
  }
  if (reveal.bb !== null) {
    band(reveal.bb - 0.3, reveal.bb + 0.3, c.ku, 0.18)
    label(ctx, 'bright band', x0 + 6, Y(reveal.bb + 0.45), c.ku, MONOS)
  }
  ctx.save()
  ctx.setLineDash([2, 3])
  ctx.strokeStyle = c.bad
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(X(40), y0)
  ctx.lineTo(X(40), y1)
  ctx.stroke()
  ctx.restore()
  label(ctx, '40 dBZ', X(40) + 4, y1 - 10, c.bad, MONOS)
  ctx.save()
  ctx.setLineDash([4, 3])
  ctx.strokeStyle = c.ink2
  ctx.beginPath()
  ctx.moveTo(x0, Y(reveal.top))
  ctx.lineTo(x1, Y(reveal.top))
  ctx.stroke()
  ctx.restore()
  label(ctx, 'storm top ' + reveal.top.toFixed(1) + ' km', x1 - 3, Y(reveal.top) - 8, c.ink2, MONOS, 'right')
}

const ANSWERS: RainClass[] = ['strat', 'conv', 'snow', 'shallow']
const BUTTON: Record<RainClass, string> = {
  strat: 'Stratiform',
  conv: 'Convective',
  snow: 'Snow',
  shallow: 'Shallow / warm',
}

/** First round: the book's six in order, then the six extras. Later rounds are shuffled. */
function deck(round: number): number[] {
  const idx = ALL_PROFILE_SPECS.map((_, i) => i)
  if (round === 0) return idx
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

export default function ClassifyGame({ title, hint }: SimProps) {
  const profiles = useMemo(() => ALL_PROFILE_SPECS.map(buildProfile), [])
  const [round, setRound] = useState(0)
  const [order, setOrder] = useState(() => deck(0))
  const [pos, setPos] = useState(0)
  const [picked, setPicked] = useState<RainClass | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)

  const P = profiles[order[pos]]
  const d = diagnose(P)
  const truth = P.spec.a
  const last = pos >= order.length - 1
  const ref = usePlot((f) => drawProfile(f, P, picked ? d : null), 420 / 760)

  const answer = (a: RainClass) => {
    if (picked) return
    setPicked(a)
    if (a === truth) {
      setScore((s) => s + 1)
      setStreak((s) => {
        setBest((b) => Math.max(b, s + 1))
        return s + 1
      })
    } else setStreak(0)
  }
  const playAgain = () => {
    const r = round + 1
    setRound(r)
    setOrder(deck(r))
    setPos(0)
    setPicked(null)
    setScore(0)
    setStreak(0)
  }

  return (
    <Widget id="class" title={title} hint={hint}>
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label={`Radar profile ${pos + 1} of ${order.length}`} />
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
              { plain: true, label: picked ? 'shaded: the evidence' : 'dashed: 0 °C level' },
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
            Profile <b>{pos + 1}</b> of {order.length}. What is it?
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
              {explainProfile(P, d)}
            </div>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            {picked && last ? (
              <button className="btn go" type="button" onClick={playAgain}>
                Play again (shuffled) ↻
              </button>
            ) : (
              <button
                className="btn"
                type="button"
                disabled={!picked}
                onClick={() => {
                  setPos((p) => Math.min(order.length - 1, p + 1))
                  setPicked(null)
                }}
              >
                Next profile →
              </button>
            )}
            <span className="tiny">
              {picked ? `${score} of ${pos + 1}` : pos === 0 ? '0' : `${score} of ${pos}`} correct
              {picked && last ? ' — done' : ''} · streak {streak} · best {best}
            </span>
          </div>
        </div>
      </div>
    </Widget>
  )
}
