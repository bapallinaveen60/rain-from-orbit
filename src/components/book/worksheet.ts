import type { CalcNode } from './calcMarkup'

/** A highlighted result in a calc block that the reader can work out themselves. */
export interface Blank {
  /** The printed number, e.g. "29.0". */
  text: string
  value: number
  /** Whatever followed the number in the same highlight (unit text and nodes). */
  rest: CalcNode[]
}

const NUM = /^(\s*)([−-]?\d+(?:\.\d+)?)(.*)$/s

/** If a highlight starts with a number, split it into the number and the rest. */
export function blankOf(kids: CalcNode[]): Blank | null {
  const first = kids[0]
  if (typeof first !== 'string') return null
  const m = NUM.exec(first)
  if (!m) return null
  const text = m[2]
  const rest: CalcNode[] = [m[3], ...kids.slice(1)].filter((k) => k !== '')
  return { text, value: Number(text.replace('−', '-')), rest }
}

/**
 * Is the reader's answer right? Accepts anything that rounds to the printed value at the
 * printed precision, plus 0.5 % for rounding along the way.
 */
export function checkAnswer(input: string, b: Blank): boolean {
  const v = Number(input.trim().replace('−', '-').replace(',', '.'))
  if (!input.trim() || !Number.isFinite(v)) return false
  const decimals = b.text.split('.')[1]?.length ?? 0
  const tol = Math.max(0.5 * 10 ** -decimals, Math.abs(b.value) * 0.005)
  return Math.abs(v - b.value) <= tol + 1e-12
}

/** Count the blanks a calc block would offer. */
export function countBlanks(nodes: CalcNode[]): number {
  let n = 0
  for (const node of nodes) {
    if (typeof node === 'string') continue
    if (node.tag === 'span' && node.cls === 'hl' && blankOf(node.kids)) n++
    else n += countBlanks(node.kids)
  }
  return n
}
