import { createElement, useMemo, useState, type ReactNode } from 'react'
import { parseCalc, type CalcNode } from './calcMarkup'
import { blankOf, checkAnswer, countBlanks, type Blank } from './worksheet'

interface Practice {
  answers: Record<number, string>
  checked: boolean
  revealed: boolean
  setAnswer: (i: number, v: string) => void
}

function BlankInput({ b, i, p }: { b: Blank; i: number; p: Practice }) {
  const value = p.revealed ? b.text : (p.answers[i] ?? '')
  const ok = p.checked && checkAnswer(value, b)
  const state = p.revealed ? ' shown' : p.checked && value ? (ok ? ' right' : ' wrong') : ''
  return (
    <input
      className={'calc-blank' + state}
      value={value}
      readOnly={p.revealed}
      inputMode="decimal"
      size={Math.max(3, b.text.length + 1)}
      aria-label={`Your answer${ok ? ' (correct)' : ''}`}
      onChange={(e) => p.setAnswer(i, e.target.value)}
    />
  )
}

function render(nodes: CalcNode[], p: Practice | null, slot: { n: number }): ReactNode[] {
  return nodes.map((n, k) => {
    if (typeof n === 'string') return n
    if (p && n.tag === 'span' && n.cls === 'hl') {
      const b = blankOf(n.kids)
      if (b) {
        const i = slot.n++
        return (
          <span key={k} className="hl">
            <BlankInput b={b} i={i} p={p} />
            {render(b.rest, null, slot)}
          </span>
        )
      }
    }
    const kids = render(n.kids, p, slot)
    return n.tag === 'span'
      ? createElement('span', { key: k, className: n.cls }, ...kids)
      : createElement(n.tag, { key: k }, ...kids)
  })
}

/**
 * Worked arithmetic or code, in the book's monospace panel. Children: calc markup
 * (see calcMarkup.ts). Blocks with highlighted numeric results offer an "I'll do it" mode
 * that turns each result into a box to fill in and check.
 */
export function Calc({ code, children }: { code?: boolean; children: string }) {
  const nodes = useMemo(() => parseCalc(children), [children])
  const blanks = useMemo(() => (code ? 0 : countBlanks(nodes)), [nodes, code])
  const [practising, setPractising] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const p: Practice | null = practising
    ? { answers, checked, revealed, setAnswer: (i, v) => (setAnswers((a) => ({ ...a, [i]: v })), setChecked(false)) }
    : null

  return (
    <div className={'calc' + (code ? ' code' : '') + (practising ? ' practising' : '')}>
      {render(nodes, p, { n: 0 })}
      {blanks > 0 && (
        <span className="calc-tools">
          {practising ? (
            <>
              <button type="button" onClick={() => setChecked(true)}>
                Check
              </button>
              <button type="button" onClick={() => setRevealed(true)}>
                Show
              </button>
              <button
                type="button"
                onClick={() => {
                  setPractising(false)
                  setAnswers({})
                  setChecked(false)
                  setRevealed(false)
                }}
                aria-label="Back to the worked answer"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setPractising(true)}
              title="Hide the results and work them out yourself"
            >
              ✎ I'll do it
            </button>
          )}
        </span>
      )}
    </div>
  )
}
