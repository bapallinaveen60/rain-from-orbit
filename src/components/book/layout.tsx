import type { CSSProperties, ReactNode } from 'react'

/*
 * The book's page vocabulary. Each component renders the original markup classes,
 * so book.css (extracted verbatim from the single-file edition) styles it unchanged.
 */

const cls = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ')

export function Opener({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="opener">
      <span className="k">{kicker}</span>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

/** Header bar naming the page's one concept: green (details), blue (main ideas), purple (try it). */
export function Header({ kind, children }: { kind?: 'blue' | 'try'; children: ReactNode }) {
  return <h3 className={cls('ph', kind)}>{children}</h3>
}

export function Grid({ one, style, children }: { one?: boolean; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cls('pgrid', one && 'one')} style={style}>
      {children}
    </div>
  )
}

/** Numbered step marker. */
export function Step({ n, sm }: { n: number; sm?: boolean }) {
  return <span className={cls('stepn', sm && 'sm')}>{n}</span>
}

export interface BoxProps {
  /** Panel tint: a = amber, c = pink, d = green; omitted = grey; plain = page colour. */
  tone?: 'a' | 'c' | 'd' | 'plain'
  /** Span both grid columns. */
  span?: boolean
  /** Step number shown in the corner. */
  step?: number
  stepSm?: boolean
  style?: CSSProperties
  children?: ReactNode
}

export function Box({ tone, span, step, stepSm, style, children }: BoxProps) {
  return (
    <div className={cls('pbox', tone, span && 'span2')} style={style}>
      {step !== undefined && <Step n={step} sm={stepSm} />}
      {children}
    </div>
  )
}

export function Psst({ children }: { children: ReactNode }) {
  return <p className="psst">{children}</p>
}

export function Splat({ sm, children }: { sm?: boolean; children: ReactNode }) {
  return <span className={cls('splat', sm && 'sm')}>{children}</span>
}

export function Alert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="alert">
      <h4>{title}</h4>
      {children}
    </div>
  )
}

export function Note({ style, children }: { style?: CSSProperties; children: ReactNode }) {
  return (
    <div className="note" style={style}>
      {children}
    </div>
  )
}
