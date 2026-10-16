import { createElement, type ReactNode } from 'react'
import { parseCalc, type CalcNode } from './calcMarkup'

function render(nodes: CalcNode[]): ReactNode[] {
  return nodes.map((n, k) =>
    typeof n === 'string'
      ? n
      : n.tag === 'span'
        ? createElement('span', { key: k, className: n.cls }, ...render(n.kids))
        : createElement(n.tag, { key: k }, ...render(n.kids)),
  )
}

/** Worked arithmetic or code, in the book's monospace panel. Children: calc markup (see calcMarkup.ts). */
export function Calc({ code, children }: { code?: boolean; children: string }) {
  return <div className={'calc' + (code ? ' code' : '')}>{render(parseCalc(children))}</div>
}
