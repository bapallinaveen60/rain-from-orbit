import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

export interface LiveNumberProps {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  /** Decimal places shown. */
  digits?: number
  unit?: string
  /** Accessible name, e.g. "diameter of drop 1". */
  label: string
  /** Value change per pixel of horizontal drag (defaults to one step per 4 px). */
  perPixel?: number
}

/**
 * A number you can scrub: drag it left/right, or focus it and use the arrow keys.
 * Exposed to assistive tech as a slider.
 */
export function LiveNumber({ value, onChange, min, max, step, digits = 1, unit, label, perPixel }: LiveNumberProps) {
  const drag = useRef<{ x: number; v: number } | null>(null)
  const rate = perPixel ?? step / 4
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))

  const onPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    drag.current = { x: e.clientX, v: value }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLSpanElement>) => {
    if (!drag.current) return
    const v = snap(drag.current.v + (e.clientX - drag.current.x) * rate)
    if (v !== value) onChange(v)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    const big = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(snap(value + step * big))
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(snap(value - step * big))
    else if (e.key === 'Home') onChange(min)
    else if (e.key === 'End') onChange(max)
    else return
    e.preventDefault()
  }

  return (
    <span
      className="live-num"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value.toFixed(digits)}${unit ? ' ' + unit : ''}`}
      title="Drag left or right, or use the arrow keys"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={onKeyDown}
    >
      {value.toFixed(digits)}
      {unit && <small> {unit}</small>}
    </span>
  )
}
