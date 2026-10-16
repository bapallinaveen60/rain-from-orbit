import type { ReactNode } from 'react'

/** Character sprites defined in assets/defs.svg. */
export type CharacterId = 'dot' | 'dot2' | 'core' | 'core2'

export interface TalkProps {
  /** Who is drawn. Core (the spacecraft) sprites are wide. */
  char: CharacterId
  /** Sprite size override; Core defaults to wide, Dot to normal. */
  size?: 'wide' | 'sm' | 'normal'
  /** Character on the right, bubble pointing right. Defaults to true for Core. */
  rev?: boolean
  children: ReactNode
}

/** One line of dialogue between Dot (the raindrop) and Core (the spacecraft). */
export function Talk({ char, size, rev, children }: TalkProps) {
  const core = char.startsWith('core')
  const sz = size ?? (core ? 'wide' : 'normal')
  return (
    <div className={'talk' + ((rev ?? core) ? ' rev' : '')}>
      <svg className={'ch' + (sz === 'normal' ? '' : ' ' + sz)} aria-hidden="true">
        <use href={`#c-${char}`} />
      </svg>
      <div className={'bub' + (core ? ' core' : '')}>{children}</div>
    </div>
  )
}
