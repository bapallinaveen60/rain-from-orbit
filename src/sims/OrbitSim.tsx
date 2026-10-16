import { useEffect, useRef, useState } from 'react'
import { groundTrack, HALF_SWATH_DPR, HALF_SWATH_GMI, offset, PERIOD_S, type LonLat } from '../physics'
import { LAND } from './land'
import { label, MONOS, type Frame } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Legend, Slider, Toggle, Widget } from './shared/ui'
import type { SimProps } from './types'

const LATMAX = 78
const DAY_MIN = 1440

function drawOrbit({ ctx, w: W, h: H, c }: Frame, minutes: number, showSwath: boolean) {
  const pad = 22
  const mw = W - pad * 2
  const mh = H - pad * 2
  const X = (lon: number) => pad + ((lon + 180) / 360) * mw
  const Y = (lat: number) => pad + ((LATMAX - lat) / (2 * LATMAX)) * mh

  ctx.fillStyle = c.surface3
  ctx.fillRect(pad, pad, mw, mh)
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1
  for (let g = -60; g <= 60; g += 30) {
    ctx.beginPath()
    ctx.moveTo(pad, Y(g))
    ctx.lineTo(pad + mw, Y(g))
    ctx.stroke()
  }
  for (let g = -120; g <= 120; g += 60) {
    ctx.beginPath()
    ctx.moveTo(X(g), pad)
    ctx.lineTo(X(g), pad + mh)
    ctx.stroke()
  }
  ctx.fillStyle = c.surface2
  ctx.strokeStyle = c.rule
  for (const poly of LAND) {
    ctx.beginPath()
    poly.forEach(([lo, la], i) => (i === 0 ? ctx.moveTo(X(lo), Y(la)) : ctx.lineTo(X(lo), Y(la))))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = c.ink3
  ctx.lineWidth = 1.2
  for (const l of [65, -65]) {
    ctx.beginPath()
    ctx.moveTo(pad, Y(l))
    ctx.lineTo(pad + mw, Y(l))
    ctx.stroke()
  }
  ctx.restore()
  label(ctx, '65°N coverage limit', pad + 6, Y(65) - 8, c.ink3, MONOS)
  label(ctx, '65°S', pad + 6, Y(-65) + 9, c.ink3, MONOS)

  ctx.fillStyle = c.ku
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.arc(X(78), Y(21), 3.2, 0, 7)
  ctx.fill()
  ctx.globalAlpha = 1
  label(ctx, 'India', X(78) + 7, Y(21), c.ku, MONOS)

  const pts = groundTrack(minutes * 60, 20)
  if (pts.length < 2) {
    ctx.strokeStyle = c.rule
    ctx.strokeRect(pad + 0.5, pad + 0.5, mw - 1, mh - 1)
    return
  }

  const swath = (dDeg: number, col: string, alpha: number) => {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = col
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      if (Math.abs(a[0] - b[0]) > 120) continue
      const l1 = offset(a, b, dDeg)
      const r1 = offset(a, b, -dDeg)
      const l2 = offset(b, a, -dDeg)
      const r2 = offset(b, a, dDeg)
      if (Math.abs(l1[0] - l2[0]) > 120 || Math.abs(r1[0] - r2[0]) > 120) continue
      ctx.beginPath()
      const q: LonLat[] = [l1, l2, r2, r1]
      q.forEach(([lo, la], k) => (k === 0 ? ctx.moveTo(X(lo), Y(la)) : ctx.lineTo(X(lo), Y(la))))
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  if (showSwath) {
    swath(HALF_SWATH_GMI, c.ka, 0.16)
    swath(HALF_SWATH_DPR, c.ku, 0.42)
  }

  ctx.save()
  ctx.strokeStyle = c.accent
  ctx.lineWidth = 1.3
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  let pen = false
  pts.forEach((p, i) => {
    if (i > 0 && Math.abs(p[0] - pts[i - 1][0]) > 120) pen = false
    if (!pen) {
      ctx.moveTo(X(p[0]), Y(p[1]))
      pen = true
    } else ctx.lineTo(X(p[0]), Y(p[1]))
  })
  ctx.stroke()
  ctx.restore()

  const last = pts[pts.length - 1]
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.arc(X(last[0]), Y(last[1]), 4.5, 0, 7)
  ctx.fill()
  ctx.strokeStyle = c.surface
  ctx.lineWidth = 1.6
  ctx.stroke()

  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1
  ctx.strokeRect(pad + 0.5, pad + 0.5, mw - 1, mh - 1)
  label(ctx, ((minutes * 60) / PERIOD_S).toFixed(1) + ' orbits', pad + mw - 6, pad + mh - 10, c.ink3, MONOS, 'right')
}

const fmt = (v: number) => `${Math.floor(v / 60)} h ${String(Math.round(v % 60)).padStart(2, '0')} m`

export default function OrbitSim({ title, hint }: SimProps) {
  const [minutes, setMinutes] = useState(186)
  const [showSwath, setShowSwath] = useState(true)
  const [playing, setPlaying] = useState(false)
  const ref = usePlot((f) => drawOrbit(f, minutes, showSwath), 500 / 1000)
  const raf = useRef(0)

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let v = minutes >= DAY_MIN ? 0 : minutes
    const loop = (now: number) => {
      v += (now - last) * 0.011
      last = now
      if (v >= DAY_MIN) {
        setMinutes(DAY_MIN)
        setPlaying(false)
        return
      }
      setMinutes(v)
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [playing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Widget id="orbit" title={title} hint={hint}>
      <div className="plotbox">
        <canvas ref={ref} role="img" aria-label={`GPM ground track after ${fmt(minutes)}`} />
      </div>
      <Legend
        items={[
          { color: 'var(--flow)', label: 'ground track' },
          { color: 'var(--ku)', opacity: 0.5, label: 'DPR swath (≈245 km)' },
          { color: 'var(--ka)', opacity: 0.35, label: 'GMI swath (904 km)' },
          { plain: true, label: 'dashed: 65° coverage limit' },
        ]}
      />
      <div className="ctrls" style={{ marginTop: 14 }}>
        <Slider
          label="Elapsed time"
          value={minutes}
          min={0}
          max={DAY_MIN}
          step={1}
          display={fmt(minutes)}
          onChange={(v) => {
            setPlaying(false)
            setMinutes(v)
          }}
        />
        <div className="seg">
          <Toggle onClick={() => setPlaying((p) => !p)}>{playing ? '❚❚ Pause' : '▶ Play 24 h'}</Toggle>
          <Toggle pressed={showSwath} onClick={() => setShowSwath((s) => !s)}>
            Show swaths
          </Toggle>
        </div>
      </div>
    </Widget>
  )
}
