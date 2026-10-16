import type { ReactNode } from 'react'

/** Props every simulator receives from the page's <Sim> tag. */
export interface SimProps {
  title: ReactNode
  hint?: ReactNode
}
