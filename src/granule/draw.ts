import { dbzColor } from '../physics'
import { axes, label, MONOS, yTitle, type Frame } from '../sims/shared/draw'
import { NBIN, NRAY, type Curtain, type GranuleSummary, type Profile } from './reader'

/** Rain-rate colours, log scale 0.1–100 mm/h (transparent below 0.1). */
const RATE_STOPS: [number, string][] = [
  [0.1, '#9ecae1'],
  [0.5, '#4292c6'],
  [1, '#41ab5d'],
  [3, '#c7e9c0'],
  [5, '#fee391'],
  [10, '#fe9929'],
  [25, '#ec7014'],
  [50, '#cb181d'],
  [100, '#7a0177'],
]
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
export function rateColor(r: number): string | null {
  if (!(r >= 0.1)) return null
  const lr = Math.log10(r)
  for (let i = 0; i < RATE_STOPS.length - 1; i++) {
    const a = Math.log10(RATE_STOPS[i][0])
    const b = Math.log10(RATE_STOPS[i + 1][0])
    if (lr < b) {
      const t = (lr - a) / (b - a)
      const ca = hex(RATE_STOPS[i][1])
      const cb = hex(RATE_STOPS[i + 1][1])
      return `rgb(${ca.map((v, k) => Math.round(v + (cb[k] - v) * t)).join(',')})`
    }
  }
  return RATE_STOPS[RATE_STOPS.length - 1][1]
}
export const RATE_LEGEND = RATE_STOPS.map(([v, c]) => ({ v, c }))

/** Near-surface rain for a window of scans: x = scan (along track), y = ray (across track). */
export function drawStrip(
  { ctx, w: W, h: H, c }: Frame,
  s: GranuleSummary,
  s0: number,
  s1: number,
  pick: { scan: number; ray: number } | null,
) {
  const x0 = 36
  const x1 = W - 8
  const y0 = 8
  const y1 = H - 26
  const cw = (x1 - x0) / (s1 - s0)
  const rh = (y1 - y0) / NRAY
  ctx.fillStyle = c.surface3
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  for (let sc = s0; sc < s1; sc++)
    for (let r = 0; r < NRAY; r++) {
      const col = rateColor(s.rate[sc * NRAY + r])
      if (!col) continue
      ctx.fillStyle = col
      ctx.fillRect(x0 + (sc - s0) * cw, y0 + r * rh, cw + 0.6, rh + 0.6)
    }
  if (pick && pick.scan >= s0 && pick.scan < s1) {
    ctx.strokeStyle = c.ink
    ctx.lineWidth = 1.5
    ctx.strokeRect(x0 + (pick.scan - s0) * cw - 2, y0 + pick.ray * rh - 2, cw + 4, rh + 4)
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(x0 + (pick.scan - s0 + 0.5) * cw, y0)
    ctx.lineTo(x0 + (pick.scan - s0 + 0.5) * cw, y1)
    ctx.moveTo(x0, y0 + (pick.ray + 0.5) * rh)
    ctx.lineTo(x1, y0 + (pick.ray + 0.5) * rh)
    ctx.stroke()
    ctx.setLineDash([])
  }
  axes(ctx, x0, y0, x1, y1, c)
  label(ctx, 'ray 1', x0 - 4, y0 + 4, c.ink3, MONOS, 'right')
  label(ctx, '49', x0 - 4, y1 - 4, c.ink3, MONOS, 'right')
  label(ctx, `scan ${s0}`, x0, y1 + 13, c.ink3, MONOS, 'left')
  label(ctx, `${s1 - 1}`, x1, y1 + 13, c.ink3, MONOS, 'right')
  label(ctx, 'near-surface rain rate · click a pixel', (x0 + x1) / 2, y1 + 13, c.ink2, MONOS, 'center')
}

export const STRIP_MARGIN = { left: 36, right: 8, top: 8, bottom: 26 }

/** A curtain from real bins: each cell drawn at its own height from PRE/height. */
export function drawCurtain(
  { ctx, w: W, h: H, c }: Frame,
  cu: Curtain,
  top: number,
  marker: number | null,
  title: string,
) {
  const x0 = 40
  const x1 = W - 10
  const y0 = 18
  const y1 = H - 30
  const Y = (km: number) => y1 - (km / top) * (y1 - y0)
  const cw = (x1 - x0) / cu.ncol
  ctx.fillStyle = c.surface3
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  for (let col = 0; col < cu.ncol; col++)
    for (let k = 0; k < NBIN; k++) {
      const z = cu.z[col * NBIN + k]
      const fill = Number.isFinite(z) ? dbzColor(z) : null
      if (!fill) continue
      const hk = cu.h[col * NBIN + k]
      if (!(hk < top)) continue
      ctx.fillStyle = fill
      ctx.fillRect(x0 + col * cw, Y(hk + 0.0625), cw + 0.6, Y(hk - 0.0625) - Y(hk + 0.0625) + 0.6)
    }
  // blind layer and surface
  ctx.save()
  ctx.fillStyle = c.ink
  ctx.globalAlpha = 0.28
  ctx.beginPath()
  ctx.moveTo(x0, y1)
  for (let col = 0; col < cu.ncol; col++) {
    const v = Number.isFinite(cu.cfb[col]) ? cu.cfb[col] : 0
    ctx.lineTo(x0 + col * cw, Y(v))
    ctx.lineTo(x0 + (col + 1) * cw, Y(v))
  }
  ctx.lineTo(x1, y1)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = c.surface
  ctx.setLineDash([4, 3])
  ctx.lineWidth = 1.3
  ctx.beginPath()
  for (let col = 0; col < cu.ncol; col++) {
    const v = cu.cfb[col]
    if (!Number.isFinite(v)) continue
    ctx.moveTo(x0 + col * cw, Y(v))
    ctx.lineTo(x0 + (col + 1) * cw, Y(v))
  }
  ctx.stroke()
  ctx.restore()
  if (marker !== null) {
    ctx.strokeStyle = c.ink
    ctx.lineWidth = 2
    ctx.strokeRect(x0 + marker * cw - 1, y0, cw + 2, y1 - y0)
  }
  axes(ctx, x0, y0, x1, y1, c)
  for (let z = 0; z <= top; z += top > 12 ? 4 : 2) label(ctx, z, x0 - 6, Y(z), c.ink3, MONOS, 'right')
  yTitle(ctx, 'height (km)', 11, (y0 + y1) / 2, c.ink2)
  label(ctx, title, x0 + 4, y0 - 8, c.ink2, MONOS, 'left')
  label(
    ctx,
    cu.along ? `scans ${cu.scan0}–${cu.scan0 + cu.ncol - 1}` : 'ray 1 → 49 across the swath',
    (x0 + x1) / 2,
    y1 + 14,
    c.ink3,
    MONOS,
    'center',
  )
  label(ctx, 'dashed: clutter-free bottom', x1 - 4, y0 - 8, c.ink3, MONOS, 'right')
}

export const CURTAIN_MARGIN = { left: 40, right: 10 }

/** One ray: measured and corrected Ku reflectivity, and the retrieved rain rate. */
export function drawProfile({ ctx, w: W, h: H, c }: Frame, p: Profile, top: number) {
  const x0 = 40
  const x1 = W - 12
  const y0 = 18
  const y1 = H - 34
  const ZL = 0
  const ZH = 60
  const X = (v: number) => x0 + ((v - ZL) / (ZH - ZL)) * (x1 - x0)
  const Y = (km: number) => y1 - (km / top) * (y1 - y0)
  const XR = (r: number) => x0 + ((Math.log10(Math.max(0.1, r)) + 1) / 3.3) * (x1 - x0)
  ctx.strokeStyle = c.rule
  for (let z = 0; z <= top; z += 2) {
    ctx.beginPath()
    ctx.moveTo(x0, Y(z))
    ctx.lineTo(x1, Y(z))
    ctx.stroke()
  }
  const hline = (km: number, col: string, text: string) => {
    if (!Number.isFinite(km) || km <= 0 || km > top) return
    ctx.save()
    ctx.setLineDash([4, 3])
    ctx.strokeStyle = col
    ctx.beginPath()
    ctx.moveTo(x0, Y(km))
    ctx.lineTo(x1, Y(km))
    ctx.stroke()
    ctx.restore()
    label(ctx, text, x1 - 3, Y(km) - 7, col, MONOS, 'right')
  }
  if (Number.isFinite(p.heightClutterFree)) {
    ctx.fillStyle = c.ink
    ctx.globalAlpha = 0.1
    ctx.fillRect(x0, Y(p.heightClutterFree), x1 - x0, y1 - Y(p.heightClutterFree))
    ctx.globalAlpha = 1
  }
  hline(p.heightZeroDeg, c.ink3, '0 °C')
  hline(p.heightBB, c.ku, 'bright band')
  hline(p.heightClutterFree, c.ink3, 'clutter-free bottom')
  const series = (arr: Float32Array, col: string, w: number, proj: (v: number) => number, dash?: number[]) => {
    ctx.save()
    ctx.strokeStyle = col
    ctx.lineWidth = w
    if (dash) ctx.setLineDash(dash)
    ctx.beginPath()
    let pen = false
    for (let k = 0; k < arr.length; k++) {
      const v = arr[k]
      const hk = p.h[k]
      if (!Number.isFinite(v) || !(hk < top) || v <= 0) {
        pen = false
        continue
      }
      const x = proj(v)
      if (pen) ctx.lineTo(x, Y(hk))
      else ctx.moveTo(x, Y(hk))
      pen = true
    }
    ctx.stroke()
    ctx.restore()
  }
  series(p.rate, c.ka, 2, XR)
  series(p.zMeasured, c.ku, 1.6, X, [4, 3])
  series(p.zFinal, c.ku, 2.4, X)
  axes(ctx, x0, y0, x1, y1, c)
  for (let v = 0; v <= 60; v += 10) label(ctx, v, X(v), y1 + 12, c.ink3, MONOS, 'center')
  label(ctx, 'Z (dBZ)', (x0 + x1) / 2, y1 + 25, c.ink2, MONOS, 'center')
  for (let z = 0; z <= top; z += 2) label(ctx, z, x0 - 6, Y(z), c.ink3, MONOS, 'right')
  yTitle(ctx, 'height (km)', 11, (y0 + y1) / 2, c.ink2)
  label(ctx, 'rain rate (log, 0.1–200 mm/h) →', x0 + 4, y0 - 8, c.ka, MONOS, 'left')
}
