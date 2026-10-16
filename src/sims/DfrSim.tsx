import { useMemo, useState } from 'react'
import { dB, dfrCurve, dfrOf, dfrSolutions, mieZK } from '../physics'
import { axes, gridline, label, MONOS, poly, yTitle, type Frame } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Readout, Slider, U, Widget } from './shared/ui'
import type { SimProps } from './types'

function drawDfr({ ctx, w: W, h: H, c }: Frame, cur: [number, number][], Dm: number, dfr: number, sols: number[]) {
  const x0 = 48
  const x1 = W - 16
  const y0 = 18
  const y1 = H - 38
  const ymax = Math.max(10, Math.ceil(Math.max(...cur.map((p) => p[1])) + 1))
  const ymin = -2.2
  const X = (d: number) => x0 + ((d - 0.2) / 3.8) * (x1 - x0)
  const Y = (v: number) => y1 - ((v - ymin) / (ymax - ymin)) * (y1 - y0)
  for (let g = -2; g <= ymax; g += 2) gridline(ctx, x0, x1, Y(g), c)
  poly(
    ctx,
    cur.map(([d, v]) => [X(d), Y(v)]),
    c.accent,
    2.4,
  )

  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = c.ink3
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x0, Y(dfr))
  ctx.lineTo(x1, Y(dfr))
  ctx.stroke()
  ctx.restore()
  for (const s of sols) {
    ctx.fillStyle = c.surface
    ctx.strokeStyle = c.ink2
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(X(s), Y(dfr), 4.5, 0, 7)
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = c.ku
  ctx.beginPath()
  ctx.arc(X(Dm), Y(dfr), 5.5, 0, 7)
  ctx.fill()
  ctx.strokeStyle = c.surface
  ctx.lineWidth = 1.8
  ctx.stroke()
  label(ctx, 'your Dm', X(Dm), Y(dfr) - 14, c.ku, MONOS, 'center')

  ctx.save()
  ctx.fillStyle = c.ink
  ctx.globalAlpha = 0.07
  ctx.fillRect(x0, y0, X(1.35) - x0, y1 - y0)
  ctx.restore()
  label(ctx, 'DFR within ~1 dB of zero —', X(1.36) + 4, y0 + 12, c.ink3, MONOS)
  label(ctx, 'and double-valued', X(1.36) + 4, y0 + 25, c.ink3, MONOS)

  axes(ctx, x0, y0, x1, y1, c)
  for (let d = 0.5; d <= 4; d += 0.5) label(ctx, d.toFixed(1), X(d), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'Dm  (mm)', (x0 + x1) / 2, y1 + 28, c.ink2, MONOS, 'center')
  for (let g = -2; g <= ymax; g += 2) label(ctx, g, x0 - 7, Y(g), c.ink3, MONOS, 'right')
  yTitle(ctx, 'DFR  Ku − Ka  (dB)', 13, (y0 + y1) / 2, c.ink2)
}

export default function DfrSim({ title, hint }: SimProps) {
  const [Dm, setDm] = useState(1.5)
  const [nw, setNw] = useState(4)
  const [mu, setMu] = useState(3)
  const cur = useMemo(() => dfrCurve(mu), [mu])
  const dfr = dfrOf(+Dm.toFixed(2), mu)
  const sols = dfrSolutions(cur, dfr)
  const ref = usePlot((f) => drawDfr(f, cur, Dm, dfr, sols), 420 / 760)
  const zk = mieZK('ku', Dm, nw, mu)
  const za = mieZK('ka', Dm, nw, mu)

  return (
    <Widget id="dfr" title={title} hint={hint}>
      <div className="split">
        <div className="plotbox">
          <canvas ref={ref} role="img" aria-label="Dual-frequency ratio against Dm" />
        </div>
        <div>
          <div className="ctrls">
            <Slider
              label={
                <>
                  D<sub>m</sub>
                </>
              }
              value={Dm}
              min={0.2}
              max={4.0}
              step={0.01}
              display={Dm.toFixed(2) + ' mm'}
              onChange={setDm}
            />
            <Slider
              label={
                <>
                  log₁₀ N<sub>w</sub> — move it, watch DFR not care
                </>
              }
              value={nw}
              min={2}
              max={6}
              step={0.01}
              display={nw.toFixed(2)}
              onChange={setNw}
            />
            <Slider label="μ" value={mu} min={-1} max={10} step={0.1} display={mu.toFixed(1)} onChange={setMu} />
          </div>
          <div className="reads" style={{ marginTop: 14 }}>
            <Readout k="DFR (effective)">
              <U v={dfr.toFixed(2)} u="dB" />
            </Readout>
            <Readout
              k={
                <>
                  Z<sub>e</sub> Ku
                </>
              }
              tone="ku"
            >
              <U v={dB(zk.Ze).toFixed(1)} u="dBZ" />
            </Readout>
            <Readout
              k={
                <>
                  Z<sub>e</sub> Ka
                </>
              }
              tone="ka"
            >
              <U v={dB(za.Ze).toFixed(1)} u="dBZ" />
            </Readout>
            <Readout k="DFR solutions" bad={sols.length > 1}>
              {sols.length}
            </Readout>
          </div>
        </div>
      </div>
    </Widget>
  )
}
