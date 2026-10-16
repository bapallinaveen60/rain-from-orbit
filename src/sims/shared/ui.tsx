import { useId, type CSSProperties, type ReactNode } from 'react'

/* Simulator controls, rendering the original widget classes (.ctrl, .seg, .read, .legend). */

export function Widget({
  id,
  title,
  hint,
  children,
}: {
  id: string
  title: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="wgt" id={`p-${id}`}>
      <div className="wgt-h">
        {title}
        {hint && <span>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export interface SliderProps {
  label: ReactNode
  value: number
  min: number
  max: number
  step: number
  /** Formatted value shown at the right of the label. */
  display: ReactNode
  onChange: (v: number) => void
}

export function Slider({ label, value, min, max, step, display, onChange }: SliderProps) {
  const id = useId()
  return (
    <div className="ctrl">
      <div className="ctrl-top">
        <label htmlFor={id}>{label}</label>
        <span className="val">{display}</span>
      </div>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  )
}

export function Toggle({
  pressed,
  onClick,
  disabled,
  style,
  children,
}: {
  pressed?: boolean
  onClick: () => void
  disabled?: boolean
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  )
}

export function Readout({
  k,
  children,
  tone,
  bad,
}: {
  k: ReactNode
  children: ReactNode
  tone?: 'ku' | 'ka'
  /** Highlight the value as a warning. */
  bad?: boolean
}) {
  return (
    <div className={'read' + (tone ? ' ' + tone : '')}>
      <span className="k">{k}</span>
      <span className="v" style={bad ? { color: 'var(--bad)' } : undefined}>
        {children}
      </span>
    </div>
  )
}

/** Value with a small unit, as in the original readouts. */
export const U = ({ v, u }: { v: ReactNode; u: string }) => (
  <>
    {v} <small>{u}</small>
  </>
)

export function Legend({
  items,
}: {
  items: { color?: string; opacity?: number; label: ReactNode; plain?: boolean }[]
}) {
  return (
    <div className="legend">
      {items.map((it, i) =>
        it.plain ? (
          <span key={i} style={{ color: 'var(--ink3)' }}>
            {it.label}
          </span>
        ) : (
          <span key={i}>
            <i style={{ background: it.color, opacity: it.opacity }} />
            {it.label}
          </span>
        ),
      )}
    </div>
  )
}
