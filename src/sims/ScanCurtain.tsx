import { useEffect, useRef, useState, type PointerEvent } from 'react'
import {
  angleOf,
  clutterFreeBottom,
  dbzColor,
  heightOf,
  NBEAM,
  NZ,
  scene,
  stormTop,
  ZTOP,
  type SceneKind,
} from '../physics'
import { axes, gridline, label, MONOS, poly, yTitle, type Frame, type Pt } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Readout, Slider, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

/* Plot margins — the curtain's are also used to map a pointer x to a beam. */
const CL = 46
const CR = 12

function drawCurtain({ ctx, w: W, h: H, c }: Frame, kind: SceneKind, ray: number) {
  const x0 = CL
  const x1 = W - CR
  const y0 = 12
  const y1 = H - 34
  const g = scene(kind)
  const bw = (x1 - x0) / NBEAM
  const bh = (y1 - y0) / NZ
  ctx.fillStyle = c.surface3
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  for (let b = 0; b < NBEAM; b++)
    for (let k = 0; k < NZ; k++) {
      const col = dbzColor(g[b][k])
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x0 + b * bw, y0 + k * bh, bw + 0.7, bh + 0.7)
    }

  const blindY = (b: number) => y1 - (clutterFreeBottom(Math.min(NBEAM - 1, b)) / ZTOP) * (y1 - y0)
  ctx.save()
  ctx.fillStyle = c.ink
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(x0, y1)
  for (let b = 0; b <= NBEAM; b++) ctx.lineTo(x0 + b * bw, blindY(b))
  ctx.lineTo(x1, y1)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = c.surface
  ctx.lineWidth = 1.3
  ctx.setLineDash([4, 3])
  ctx.beginPath()
  for (let b = 0; b <= NBEAM; b++) (b === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x0 + b * bw, blindY(b))
  ctx.stroke()
  ctx.restore()
  label(ctx, 'clutter blind layer', x0 + (x1 - x0) / 2, y1 - 7, c.surface, MONOS, 'center')

  ctx.save()
  ctx.strokeStyle = c.ink
  ctx.lineWidth = 2
  ctx.strokeRect(x0 + ray * bw - 1, y0, bw + 2, y1 - y0)
  ctx.strokeStyle = c.surface
  ctx.lineWidth = 1
  ctx.strokeRect(x0 + ray * bw, y0, bw, y1 - y0)
  ctx.restore()

  axes(ctx, x0, y0, x1, y1, c)
  for (let z = 0; z <= 16; z += 4) label(ctx, z, x0 - 7, y1 - (z / ZTOP) * (y1 - y0), c.ink3, MONOS, 'right')
  yTitle(ctx, 'height (km)', 12, (y0 + y1) / 2, c.ink2)
  label(ctx, '−17°', x0 + 2, y1 + 13, c.ink3, MONOS, 'left')
  label(ctx, 'nadir', x0 + (x1 - x0) / 2, y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, '+17°', x1 - 2, y1 + 13, c.ink3, MONOS, 'right')
  label(ctx, '49 beams across a 245 km swath', (x0 + x1) / 2, y1 + 27, c.ink2, MONOS, 'center')
}

/**
 * The selected ray. With `pulse` (0–1) set, only the echo received so far is drawn: the
 * pulse front is at height ZTOP·(1 − pulse), and everything above it has already come back.
 */
function drawRay({ ctx, w: W, h: H, c }: Frame, kind: SceneKind, ray: number, pulse: number | null = null) {
  const x0 = 44
  const x1 = W - 16
  const y0 = 14
  const y1 = H - 34
  const col = scene(kind)[ray]
  const ZMIN = 5
  const ZMAXD = 60
  const X = (v: number) => x0 + ((v - ZMIN) / (ZMAXD - ZMIN)) * (x1 - x0)
  const Y = (z: number) => y1 - (z / ZTOP) * (y1 - y0)
  for (let z = 0; z <= 16; z += 4) gridline(ctx, x0, x1, Y(z), c)
  const cb = clutterFreeBottom(ray)
  ctx.fillStyle = c.ink
  ctx.globalAlpha = 0.1
  ctx.fillRect(x0, Y(cb), x1 - x0, y1 - Y(cb))
  ctx.globalAlpha = 1
  ctx.save()
  ctx.setLineDash([4, 3])
  ctx.strokeStyle = c.ink3
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x0, Y(cb))
  ctx.lineTo(x1, Y(cb))
  ctx.stroke()
  ctx.restore()
  label(ctx, 'clutter-free bottom', x1 - 4, Y(cb) - 8, c.ink3, MONOS, 'right')

  const pts: Pt[] = []
  const front = pulse === null ? -1 : ZTOP * (1 - pulse)
  for (let k = 0; k < NZ; k++)
    if (col[k] > ZMIN && heightOf(k) >= front) pts.push([X(Math.min(col[k], ZMAXD)), Y(heightOf(k))])
  if (pts.length > 1) poly(ctx, pts, c.ku, 2.2)
  if (pulse !== null && front >= 0) {
    ctx.save()
    ctx.strokeStyle = c.accent
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, Y(front))
    ctx.lineTo(x1, Y(front))
    ctx.stroke()
    ctx.restore()
    label(ctx, `pulse at ${front.toFixed(1)} km`, x0 + 6, Y(front) + 11, c.accent, MONOS)
  }
  const top = stormTop(col)
  ctx.save()
  ctx.setLineDash([3, 3])
  ctx.strokeStyle = c.accent
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(x0, Y(top))
  ctx.lineTo(x1, Y(top))
  ctx.stroke()
  ctx.restore()
  label(ctx, 'storm top', x1 - 4, Y(top) - 8, c.accent, MONOS, 'right')

  axes(ctx, x0, y0, x1, y1, c)
  for (let v = 10; v <= 60; v += 10) label(ctx, v, X(v), y1 + 13, c.ink3, MONOS, 'center')
  label(ctx, 'Z  (dBZ)', (x0 + x1) / 2, y1 + 27, c.ink2, MONOS, 'center')
  for (let z = 0; z <= 16; z += 4) label(ctx, z, x0 - 7, Y(z), c.ink3, MONOS, 'right')
  label(ctx, 'ray ' + (ray + 1) + '  ·  ' + angleOf(ray).toFixed(1) + '°', x1 - 4, y0 + 8, c.ink2, MONOS, 'right')
}

const SCENES: [SceneKind, string][] = [
  ['squall', 'Squall line'],
  ['strat', 'Stratiform deck'],
  ['shallow', 'Shallow orographic'],
]
const SWATCH = Array.from({ length: 47 }, (_, i) => dbzColor(12 + i) ?? 'transparent')

export default function ScanCurtain({ title, hint }: SimProps) {
  const [kind, setKind] = useState<SceneKind>('squall')
  const [ray, setRay] = useState(24)
  const curtain = usePlot((f) => drawCurtain(f, kind, ray), 380 / 760)
  const [pulse, setPulse] = useState<number | null>(null)
  const rayPlot = usePlot((f) => drawRay(f, kind, ray, pulse), 380 / 420)

  // Send a pulse: the echo builds up from storm top to the ground over ~2 s (really ~0.1 ms).
  useEffect(() => {
    if (pulse === null || pulse >= 1) return
    const start = performance.now() - pulse * 2000
    let id = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 2000)
      setPulse(p >= 1 ? null : p)
      if (p < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [pulse === null]) // eslint-disable-line react-hooks/exhaustive-deps
  const dragging = useRef(false)

  const pick = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const b = Math.floor((e.clientX - r.left - CL) / ((r.width - CL - CR) / NBEAM))
    setRay(Math.max(0, Math.min(NBEAM - 1, b)))
  }

  const col = scene(kind)[ray]
  let zmax = -99
  for (let k = 0; k < NZ; k++) if (col[k] > 5 && col[k] > zmax) zmax = col[k]
  const cb = clutterFreeBottom(ray)
  const a = angleOf(ray)

  return (
    <Widget id="curtain" title={title} hint={hint}>
      <div className="split">
        <div className="plotbox">
          <canvas
            ref={curtain}
            role="img"
            aria-label="Cross-track scan curtain of reflectivity"
            style={{ touchAction: 'none', cursor: 'crosshair' }}
            onPointerDown={(e) => {
              dragging.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              pick(e)
            }}
            onPointerMove={(e) => dragging.current && pick(e)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          />
          <div className="swatchbar">
            {SWATCH.map((bg, i) => (
              <div key={i} style={{ background: bg }} />
            ))}
          </div>
          <div className="swatchlab">
            <span>15 dBZ</span>
            <span>30</span>
            <span>45</span>
            <span>55+</span>
          </div>
        </div>
        <div className="plotbox">
          <canvas ref={rayPlot} role="img" aria-label={`Reflectivity profile of ray ${ray + 1}`} />
        </div>
      </div>
      <div className="ctrls" style={{ marginTop: 14 }}>
        <div className="seg">
          <Toggle pressed={pulse !== null} onClick={() => setPulse(pulse === null ? 0 : null)}>
            {pulse === null ? 'Send a pulse' : 'Stop'}
          </Toggle>
          {SCENES.map(([k, name]) => (
            <Toggle key={k} pressed={kind === k} onClick={() => setKind(k)}>
              {name}
            </Toggle>
          ))}
        </div>
        <Slider
          label="Which ray — and its incidence angle"
          value={ray}
          min={0}
          max={48}
          step={1}
          display={Math.abs(a) < 0.05 ? '0.0° (nadir)' : a.toFixed(1) + '°'}
          onChange={setRay}
        />
      </div>
      <div className="reads" style={{ marginTop: 12 }}>
        <Readout k="Storm top">
          <U v={stormTop(col).toFixed(1)} u="km" />
        </Readout>
        <Readout k="Clutter-free bottom">
          <U v={cb.toFixed(2)} u="km" />
        </Readout>
        <Readout k="Blind layer">
          <U v={(cb * 1000).toFixed(0)} u="m" />
        </Readout>
        <Readout k="Z max in ray">
          <U v={zmax > 0 ? zmax.toFixed(1) : '—'} u="dBZ" />
        </Readout>
      </div>
    </Widget>
  )
}
