import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  ALT_AFTER,
  ALT_BEFORE,
  groundTrack,
  HALF_SWATH_DPR,
  HALF_SWATH_GMI,
  halfSwathAt,
  longestGapHours,
  offset,
  passTimes,
  periodAt,
  type LonLat,
} from '../physics'
import { LAND } from './land'
import { label, MONOS, type Colors, type Frame } from './shared/draw'
import { usePlot } from './shared/usePlot'
import { Legend, Readout, Slider, Toggle, U, Widget } from './shared/ui'
import type { SimProps } from './types'

const LATMAX = 78
const DAY_MIN = 1440
const PAD = 22
const RAD = Math.PI / 180

type View = 'map' | 'globe'
interface Place {
  lonlat: LonLat
  name: string
}
interface Scene {
  minutes: number
  showSwath: boolean
  alt: number
  place: Place
}

/* ---------- flat map (the original view) ---------- */

function drawMap({ ctx, w: W, h: H, c }: Frame, s: Scene) {
  const mw = W - PAD * 2
  const mh = H - PAD * 2
  const X = (lon: number) => PAD + ((lon + 180) / 360) * mw
  const Y = (lat: number) => PAD + ((LATMAX - lat) / (2 * LATMAX)) * mh

  ctx.fillStyle = c.surface3
  ctx.fillRect(PAD, PAD, mw, mh)
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1
  for (let g = -60; g <= 60; g += 30) {
    ctx.beginPath()
    ctx.moveTo(PAD, Y(g))
    ctx.lineTo(PAD + mw, Y(g))
    ctx.stroke()
  }
  for (let g = -120; g <= 120; g += 60) {
    ctx.beginPath()
    ctx.moveTo(X(g), PAD)
    ctx.lineTo(X(g), PAD + mh)
    ctx.stroke()
  }
  ctx.fillStyle = c.surface2
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
    ctx.moveTo(PAD, Y(l))
    ctx.lineTo(PAD + mw, Y(l))
    ctx.stroke()
  }
  ctx.restore()
  label(ctx, '65°N coverage limit', PAD + 6, Y(65) - 8, c.ink3, MONOS)
  label(ctx, '65°S', PAD + 6, Y(-65) + 9, c.ink3, MONOS)
  placeMarker(ctx, c, X(s.place.lonlat[0]), Y(s.place.lonlat[1]), s.place.name)

  const period = periodAt(s.alt)
  const pts = groundTrack(s.minutes * 60, 20, period)
  if (pts.length >= 2) {
    const swath = (dDeg: number, col: string, alpha: number) => {
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = col
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]
        const b = pts[i + 1]
        if (Math.abs(a[0] - b[0]) > 120) continue
        const q: LonLat[] = [offset(a, b, dDeg), offset(b, a, -dDeg), offset(b, a, dDeg), offset(a, b, -dDeg)]
        if (Math.abs(q[0][0] - q[1][0]) > 120 || Math.abs(q[3][0] - q[2][0]) > 120) continue
        ctx.beginPath()
        q.forEach(([lo, la], k) => (k === 0 ? ctx.moveTo(X(lo), Y(la)) : ctx.lineTo(X(lo), Y(la))))
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }
    if (s.showSwath) {
      swath(halfSwathAt(HALF_SWATH_GMI, s.alt), c.ka, 0.16)
      swath(halfSwathAt(HALF_SWATH_DPR, s.alt), c.ku, 0.42)
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
    satellite(ctx, c, X(pts.at(-1)![0]), Y(pts.at(-1)![1]))
  }
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1
  ctx.strokeRect(PAD + 0.5, PAD + 0.5, mw - 1, mh - 1)
  label(ctx, ((s.minutes * 60) / period).toFixed(1) + ' orbits', PAD + mw - 6, PAD + mh - 10, c.ink3, MONOS, 'right')
}

/* ---------- orthographic globe ---------- */

interface Ortho {
  cx: number
  cy: number
  R: number
  lon0: number
  lat0: number
}

function project(o: Ortho, [lon, lat]: LonLat): [number, number, boolean] {
  const l = lat * RAD
  const dl = (lon - o.lon0) * RAD
  const l0 = o.lat0 * RAD
  const cosc = Math.sin(l0) * Math.sin(l) + Math.cos(l0) * Math.cos(l) * Math.cos(dl)
  const x = o.cx + o.R * Math.cos(l) * Math.sin(dl)
  const y = o.cy - o.R * (Math.cos(l0) * Math.sin(l) - Math.sin(l0) * Math.cos(l) * Math.cos(dl))
  return [x, y, cosc > 0]
}

function unproject(o: Ortho, px: number, py: number): LonLat | null {
  const x = (px - o.cx) / o.R
  const y = (o.cy - py) / o.R
  const rho = Math.hypot(x, y)
  if (rho > 1) return null
  if (rho < 1e-9) return [o.lon0, o.lat0]
  const c = Math.asin(rho)
  const l0 = o.lat0 * RAD
  const lat = Math.asin(Math.cos(c) * Math.sin(l0) + (y * Math.sin(c) * Math.cos(l0)) / rho)
  const lon =
    o.lon0 * RAD + Math.atan2(x * Math.sin(c), rho * Math.cos(l0) * Math.cos(c) - y * Math.sin(l0) * Math.sin(c))
  return [((((lon / RAD + 180) % 360) + 360) % 360) - 180, lat / RAD]
}

const orthoFor = (W: number, H: number, lon0: number, lat0: number): Ortho => ({
  cx: W / 2,
  cy: H / 2,
  R: Math.min(W, H) / 2 - 14,
  lon0,
  lat0,
})

/** Stroke a lon/lat path, lifting the pen where it goes behind the globe. */
function strokeOnGlobe(ctx: CanvasRenderingContext2D, o: Ortho, pts: LonLat[]) {
  ctx.beginPath()
  let pen = false
  for (const p of pts) {
    const [x, y, vis] = project(o, p)
    if (!vis) {
      pen = false
      continue
    }
    if (pen) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
    pen = true
  }
  ctx.stroke()
}

function drawGlobe({ ctx, w: W, h: H, c }: Frame, s: Scene, lon0: number, lat0: number) {
  const o = orthoFor(W, H, lon0, lat0)
  ctx.fillStyle = c.surface3
  ctx.beginPath()
  ctx.arc(o.cx, o.cy, o.R, 0, 7)
  ctx.fill()

  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1
  for (let la = -60; la <= 60; la += 30) {
    const pts: LonLat[] = []
    for (let lo = -180; lo <= 180; lo += 3) pts.push([lo, la])
    strokeOnGlobe(ctx, o, pts)
  }
  for (let lo = -180; lo < 180; lo += 30) {
    const pts: LonLat[] = []
    for (let la = -90; la <= 90; la += 3) pts.push([lo, la])
    strokeOnGlobe(ctx, o, pts)
  }
  for (const poly of LAND) {
    const pr = poly.map((p) => project(o, p))
    if (pr.every((p) => p[2])) {
      ctx.fillStyle = c.surface2
      ctx.beginPath()
      pr.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = c.ink3
    strokeOnGlobe(ctx, o, [...poly, poly[0]])
  }
  ctx.save()
  ctx.setLineDash([5, 4])
  ctx.strokeStyle = c.ink3
  for (const la of [65, -65]) {
    const pts: LonLat[] = []
    for (let lo = -180; lo <= 180; lo += 3) pts.push([lo, la])
    strokeOnGlobe(ctx, o, pts)
  }
  ctx.restore()

  const period = periodAt(s.alt)
  const pts = groundTrack(s.minutes * 60, 20, period)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const band = (half: number, col: string, alpha: number) => {
    ctx.globalAlpha = alpha
    ctx.strokeStyle = col
    ctx.lineWidth = 2 * o.R * Math.sin(half * RAD)
    strokeOnGlobe(ctx, o, pts)
  }
  if (s.showSwath && pts.length > 1) {
    band(halfSwathAt(HALF_SWATH_GMI, s.alt), c.ka, 0.16)
    band(halfSwathAt(HALF_SWATH_DPR, s.alt), c.ku, 0.42)
  }
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = c.accent
  ctx.lineWidth = 1.3
  strokeOnGlobe(ctx, o, pts)
  ctx.restore()

  const [px, py, pv] = project(o, s.place.lonlat)
  if (pv) placeMarker(ctx, c, px, py, s.place.name)
  if (pts.length) {
    const [sx, sy, sv] = project(o, pts.at(-1)!)
    if (sv) satellite(ctx, c, sx, sy)
  }
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(o.cx, o.cy, o.R, 0, 7)
  ctx.stroke()
  label(ctx, 'drag to turn the globe', 8, H - 10, c.ink3, MONOS)
  label(ctx, ((s.minutes * 60) / period).toFixed(1) + ' orbits', W - 8, H - 10, c.ink3, MONOS, 'right')
}

function placeMarker(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number, name: string) {
  ctx.fillStyle = c.ku
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(x, y, 3.4, 0, 7)
  ctx.fill()
  ctx.globalAlpha = 1
  label(ctx, name, x + 7, y, c.ku, MONOS)
}

function satellite(ctx: CanvasRenderingContext2D, c: Colors, x: number, y: number) {
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.arc(x, y, 4.5, 0, 7)
  ctx.fill()
  ctx.strokeStyle = c.surface
  ctx.lineWidth = 1.6
  ctx.stroke()
}

const fmt = (v: number) => `${Math.floor(v / 60)} h ${String(Math.round(v % 60)).padStart(2, '0')} m`
const fmtPlace = ([lo, la]: LonLat) =>
  `${Math.abs(la).toFixed(0)}°${la >= 0 ? 'N' : 'S'} ${Math.abs(lo).toFixed(0)}°${lo >= 0 ? 'E' : 'W'}`

export default function OrbitSim({ title, hint }: SimProps) {
  const [minutes, setMinutes] = useState(186)
  const [showSwath, setShowSwath] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<View>('map')
  const [alt, setAlt] = useState(ALT_BEFORE)
  const [place, setPlace] = useState<Place>({ lonlat: [78, 21], name: 'India' })
  const [rot, setRot] = useState<[number, number]>([78, 15])
  const raf = useRef(0)
  const drag = useRef<{ x: number; y: number; rot: [number, number]; moved: boolean } | null>(null)

  const scene: Scene = { minutes, showSwath, alt, place }
  const ref = usePlot(
    (f) => (view === 'globe' ? drawGlobe(f, scene, rot[0], rot[1]) : drawMap(f, scene)),
    view === 'globe' ? 560 / 1000 : 500 / 1000,
  )

  const passes = useMemo(() => {
    const period = periodAt(alt)
    const dpr = passTimes(place.lonlat, halfSwathAt(HALF_SWATH_DPR, alt), 86400, period)
    const gmi = passTimes(place.lonlat, halfSwathAt(HALF_SWATH_GMI, alt), 86400, period)
    return { dpr, gmi, gap: longestGapHours(dpr) }
  }, [place, alt])

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

  /** Canvas point → lon/lat in the current view. */
  const pick = (e: PointerEvent<HTMLCanvasElement>): LonLat | null => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    if (view === 'globe') return unproject(orthoFor(r.width, r.height, rot[0], rot[1]), px, py)
    const lon = ((px - PAD) / (r.width - 2 * PAD)) * 360 - 180
    const lat = LATMAX - ((py - PAD) / (r.height - 2 * PAD)) * 2 * LATMAX
    return Math.abs(lon) <= 180 && Math.abs(lat) <= LATMAX ? [lon, lat] : null
  }

  return (
    <Widget id="orbit" title={title} hint={hint}>
      <div className="seg" style={{ marginBottom: 10 }}>
        <Toggle pressed={view === 'map'} onClick={() => setView('map')}>
          Map
        </Toggle>
        <Toggle pressed={view === 'globe'} onClick={() => setView('globe')}>
          Globe
        </Toggle>
      </div>
      <div className="plotbox">
        <canvas
          ref={ref}
          role="img"
          aria-label={`GPM ground track after ${fmt(minutes)}, ${view} view. Click to choose a place.`}
          style={{ touchAction: view === 'globe' ? 'none' : 'auto', cursor: view === 'globe' ? 'grab' : 'crosshair' }}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, rot, moved: false }
            if (view === 'globe') e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d || view !== 'globe') return
            const dx = e.clientX - d.x
            const dy = e.clientY - d.y
            if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true
            if (d.moved) setRot([d.rot[0] - dx * 0.4, Math.max(-80, Math.min(80, d.rot[1] + dy * 0.4))])
          }}
          onPointerUp={(e) => {
            const d = drag.current
            drag.current = null
            if (d && !d.moved) {
              const ll = pick(e)
              if (ll) setPlace({ lonlat: ll, name: fmtPlace(ll) })
            }
          }}
          onPointerCancel={() => (drag.current = null)}
        />
      </div>
      <Legend
        items={[
          { color: 'var(--flow)', label: 'ground track' },
          { color: 'var(--ku)', opacity: 0.5, label: `DPR swath (≈${Math.round((245 * alt) / ALT_BEFORE)} km)` },
          { color: 'var(--ka)', opacity: 0.35, label: `GMI swath (≈${Math.round((904 * alt) / ALT_BEFORE)} km)` },
          { plain: true, label: 'dashed: 65° coverage limit · click to pick a place' },
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
          <Toggle pressed={alt === ALT_BEFORE} onClick={() => setAlt(ALT_BEFORE)}>
            407 km (to 2023)
          </Toggle>
          <Toggle pressed={alt === ALT_AFTER} onClick={() => setAlt(ALT_AFTER)}>
            442 km (after boost)
          </Toggle>
        </div>
      </div>
      <div className="reads" style={{ marginTop: 12 }}>
        <Readout k={`DPR passes · ${place.name}`} tone="ku">
          <U v={passes.dpr.length} u="in 24 h" />
        </Readout>
        <Readout k="GMI passes" tone="ka">
          <U v={passes.gmi.length} u="in 24 h" />
        </Readout>
        <Readout k="Longest DPR gap">
          <U v={passes.gap.toFixed(1)} u="h" />
        </Readout>
        <Readout k="Orbit period">
          <U v={(periodAt(alt) / 60).toFixed(1)} u="min" />
        </Readout>
      </div>
    </Widget>
  )
}
