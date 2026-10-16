import { useMemo, useState } from 'react'
import {
  buildChainRay,
  CHAIN_STEPS,
  PIPE_CFB as CFB,
  PIPE_NODES,
  PIPE_T0 as T0,
  PIPE_ZTOP as ZTOP,
  type ChainRay,
  type ChainStep,
} from '../physics'
import { axes, gridline, label, MONOB, MONOS, poly, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Widget } from './shared/ui'
import type { SimProps } from './types'

function drawChain({ ctx, w: W, h: H, c }: Frame, P: ChainRay, step: number) {
  const N = P.z.length
  const x0 = 46
  const x1 = W - 66
  const y0 = 18
  const y1 = H - 38
  const X = (v: number) => x0 + (v / 55) * (x1 - x0)
  const Y = (h: number) => y1 - (h / ZTOP) * (y1 - y0)
  const XR = (v: number) => x0 + (v / 30) * (x1 - x0)
  const after = (k: ChainStep['k']) => CHAIN_STEPS.findIndex((s) => s.k === k) <= step
  for (let h = 0; h <= 12; h += 3) gridline(ctx, x0, x1, Y(h), c)

  const hline = (h: number, col: string, dash: number[], w: number) => {
    ctx.save()
    ctx.setLineDash(dash)
    ctx.strokeStyle = col
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(x0, Y(h))
    ctx.lineTo(x1, Y(h))
    ctx.stroke()
    ctx.restore()
  }
  if (after('VER')) {
    hline(T0, c.ink3, [5, 4], 1.3)
    label(ctx, '0 °C', x1 - 3, Y(T0) - 9, c.ink3, MONOS, 'right')
  }
  if (after('PRE')) {
    ctx.fillStyle = c.ink
    ctx.globalAlpha = 0.11
    ctx.fillRect(x0, Y(CFB), x1 - x0, y1 - Y(CFB))
    ctx.globalAlpha = 1
    hline(CFB, c.ink3, [3, 3], 1.1)
    label(ctx, 'clutter-free bottom', x0 + 5, Y(CFB) + 11, c.ink3, MONOS)
    hline(9.0, c.accent, [3, 3], 1.1)
    label(ctx, 'binStormTop', x0 + 5, Y(9.0) - 9, c.accent, MONOS)
  }
  if (after('DSD')) {
    for (const [name, h] of PIPE_NODES) {
      ctx.fillStyle = c.ka
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.arc(x1 + 13, Y(h), 3.2, 0, 7)
      ctx.fill()
      ctx.globalAlpha = 1
      label(ctx, name, x1 + 20, Y(h), c.ka, MONOB, 'left')
    }
    label(ctx, 'nodes', x1 + 8, y0 + 4, c.ka, MONOS, 'left')
  }
  if (after('CSF')) {
    ctx.save()
    ctx.fillStyle = c.ku
    ctx.globalAlpha = 0.14
    ctx.fillRect(x0, Y(T0 - 0.1), x1 - x0, Y(T0 - 1.0) - Y(T0 - 0.1))
    ctx.restore()
    label(ctx, 'bright band → stratiform', x0 + 5, Y(T0 - 0.55), c.ku, MONOS)
  }

  const series = (arr: number[], col: string, wd: number, dash: number[] | null, proj = X) => {
    const pts: Pt[] = []
    for (let i = 0; i < N; i++) if (arr[i] > 0) pts.push([proj(Math.min(55, arr[i])), Y(P.z[i])])
    if (pts.length > 1) poly(ctx, pts, col, wd, dash)
  }
  const keys: [string, string, number[] | null][] = []
  if (step === 0) {
    const pts: Pt[] = []
    for (let i = 0; i < N; i++)
      if (P.zm[i] > 0) pts.push([X(Math.min(55, P.zm[i] - 20 * Math.log10(Math.max(1, ZTOP - P.z[i] + 2)))), Y(P.z[i])])
    if (pts.length > 1) poly(ctx, pts, c.ink3, 2.2)
    keys.push([c.ink3, 'echo power (arbitrary scale)', null])
  } else {
    series(P.zm, c.ku, 2.4, null)
    keys.push([c.ku, 'Zm  measured', null])
  }
  if (after('SLV')) {
    series(P.ze, c.ku, 1.6, [4, 3])
    keys.push([c.ku, 'Ze  attenuation-corrected', [4, 3]])
    series(P.rr, c.ka, 2.2, null, XR)
    keys.push([c.ka, 'precipRate  (0–30 mm/h)', null])
  }
  if (after('SRT')) {
    const pia = P.ze[N - 1] - P.zm[N - 1]
    const yb = Y(0.22)
    ctx.save()
    ctx.strokeStyle = c.bad
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(X(P.zm[N - 1]), yb)
    ctx.lineTo(X(P.ze[N - 1]), yb)
    ctx.moveTo(X(P.zm[N - 1]), yb - 4)
    ctx.lineTo(X(P.zm[N - 1]), yb + 4)
    ctx.moveTo(X(P.ze[N - 1]), yb - 4)
    ctx.lineTo(X(P.ze[N - 1]), yb + 4)
    ctx.stroke()
    ctx.restore()
    keys.push([c.bad, 'PIA from SRT ≈ ' + pia.toFixed(1) + ' dB', null])
  }
  let ky = y0 + 9
  for (const [col, text, dash] of keys) {
    ctx.save()
    ctx.strokeStyle = col
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    if (dash) ctx.setLineDash(dash)
    ctx.beginPath()
    ctx.moveTo(x0 + 7, ky)
    ctx.lineTo(x0 + 21, ky)
    ctx.stroke()
    ctx.restore()
    label(ctx, text, x0 + 27, ky, c.ink2, MONOS)
    ky += 14
  }

  axes(ctx, x0, y0, x1, y1, c)
  for (let v = 0; v <= 50; v += 10) label(ctx, v, X(v), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'Z (dBZ)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (let h = 0; h <= 12; h += 3) label(ctx, h, x0 - 7, Y(h), c.ink3, MONOS, 'right')
  yTitle(ctx, 'height (km)', 12, (y0 + y1) / 2, c.ink2)
}

export default function PipelineSim({ title, hint }: SimProps) {
  const ray = useMemo(() => buildChainRay(), [])
  const [step, setStep] = useState(0)
  const ref = usePlot((f) => drawChain(f, ray, step), 430 / 760)
  const S = CHAIN_STEPS[step]

  return (
    <Widget id="pipe" title={title} hint={hint}>
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label={`One ray after ${S.name}`} />
        </div>
        <div>
          <div style={{ display: 'grid', gap: 5 }}>
            {CHAIN_STEPS.map((s, i) => (
              <button
                key={s.k}
                type="button"
                className={'opt' + (i === step ? ' cur' : '')}
                style={{ opacity: i <= step ? 1 : 0.5 }}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => setStep(i)}
              >
                <span className="mk">{i === 0 ? '·' : i}</span>
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          <div className="fb" style={{ marginTop: 12 }} role="status">
            <b>{S.name}.</b> {S.desc}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 9 }}>
            <button
              className="btn"
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← Back
            </button>
            <button
              className="btn go"
              type="button"
              disabled={step === CHAIN_STEPS.length - 1}
              onClick={() => setStep((s) => Math.min(CHAIN_STEPS.length - 1, s + 1))}
            >
              Next module →
            </button>
          </div>
        </div>
      </div>
    </Widget>
  )
}
