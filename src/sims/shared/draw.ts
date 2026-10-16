/*
 * Canvas drawing helpers shared by every simulator — the same primitives the original
 * book used, typed, with colours read from the live theme tokens.
 */

export interface Colors {
  ink: string
  ink2: string
  ink3: string
  rule: string
  ku: string
  ka: string
  accent: string
  surface: string
  surface2: string
  surface3: string
  good: string
  bad: string
  paper: string
}

/**
 * Current theme colours. (The original asked for `--ink-2`/`--ink-3`, which don't exist,
 * so its grey labels inherited whatever colour was drawn last; this reads the real tokens.)
 */
export function readColors(): Colors {
  const s = getComputedStyle(document.documentElement)
  const g = (n: string) => s.getPropertyValue('--' + n).trim()
  return {
    ink: g('ink'),
    ink2: g('ink2'),
    ink3: g('ink3'),
    rule: g('line-soft'),
    ku: g('ku'),
    ka: g('ka'),
    accent: g('flow'),
    surface: g('page'),
    surface2: g('tint-b'),
    surface3: g('tint-a'),
    good: g('good'),
    bad: g('bad'),
    paper: g('paper'),
  }
}

export const MONO = '12px "IBM Plex Mono",monospace'
export const MONOS = '10px "IBM Plex Mono",monospace'
export const MONOB = '600 10px "IBM Plex Mono",monospace'
export const DISP = '600 12px "Nunito Sans",sans-serif'

export interface Frame {
  ctx: CanvasRenderingContext2D
  /** CSS-pixel width and height. */
  w: number
  h: number
  c: Colors
}

/** Size the canvas backing store to its displayed width × aspect, at up to 2× DPR, and clear it. */
export function fit(cv: HTMLCanvasElement, aspect: number): Omit<Frame, 'c'> {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.max(260, cv.clientWidth || 600)
  const h = Math.round(w * aspect)
  cv.style.height = h + 'px'
  const pw = Math.round(w * dpr)
  const ph = Math.round(h * dpr)
  if (cv.width !== pw || cv.height !== ph) {
    cv.width = pw
    cv.height = ph
  }
  const ctx = cv.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  return { ctx, w, h }
}

export type Pt = [number, number]

export function axes(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: Colors) {
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0, y1)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

export function gridline(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, c: Colors) {
  ctx.strokeStyle = c.rule
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1, y)
  ctx.stroke()
}

/** Dashed straight line. */
export function dashed(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  color: string,
  dash: number[],
  width = 1.2,
  alpha = 1,
) {
  ctx.save()
  ctx.setLineDash(dash)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.stroke()
  ctx.restore()
}

export function poly(ctx: CanvasRenderingContext2D, pts: Pt[], color: string, width = 2, dash?: number[] | null) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.stroke()
  ctx.restore()
}

export function label(
  ctx: CanvasRenderingContext2D,
  t: string | number,
  x: number,
  y: number,
  color: string,
  font = MONOS,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'middle',
) {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = font
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(String(t), x, y)
  ctx.restore()
}

/** Vertical axis title, rotated. */
export function yTitle(ctx: CanvasRenderingContext2D, t: string, x: number, yMid: number, color: string) {
  ctx.save()
  ctx.translate(x, yMid)
  ctx.rotate(-Math.PI / 2)
  label(ctx, t, 0, 0, color, MONOS, 'center')
  ctx.restore()
}

export function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke?: string,
  sw = 1.6,
) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 7)
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = sw
    ctx.stroke()
  }
}

const SUP: Record<string, string> = { '-1': '⁻¹', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷' }
/** "10" with a superscript exponent, for log-axis labels. */
export const pow10 = (n: number) => '10' + (SUP[String(n)] ?? n)
